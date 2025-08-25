document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseApiUrl") || "http://localhost/clinic_recording/api";
  const apptApi = `${baseApiUrl}/appointments.php`;
  const queueApi = `${baseApiUrl}/queue_management.php`;
  const enhancedQueueApi = `${baseApiUrl}/enhanced_queue_management.php`;

  const tbody = document.getElementById("appointmentsTableBody");
  const overviewBody = document.getElementById("doctorOverviewBody");
  const pendingBody = document.getElementById("pendingTableBody");
  const confirmedBody = document.getElementById("confirmedTableBody");
  const confirmedSearch = document.getElementById("confirmedSearchInput");
  const filterDate = document.getElementById("filterDate");
  const filterBtn = document.getElementById("filterBtn");

  const approveModalEl = document.getElementById('approveModal');
  const approveModal = approveModalEl ? new bootstrap.Modal(approveModalEl) : null;
  const approveForm = document.getElementById('approveForm');

  // Queue management elements
  const refreshQueueBtn = document.getElementById('refreshQueueBtn');
  const currentQueueNumber = document.getElementById('currentQueueNumber');
  const nextQueueNumber = document.getElementById('nextQueueNumber');
  const completedCount = document.getElementById('completedCount');
  const pendingCount = document.getElementById('pendingCount');
  const queueStatusInfo = document.getElementById('queueStatusInfo');
  const queueModalEl = document.getElementById('queueModal');
  const queueModal = queueModalEl ? new bootstrap.Modal(queueModalEl) : null;
  const queueDate = document.getElementById('queueDate');
  const queueDoctor = document.getElementById('queueDoctor');
  const queueTableBody = document.getElementById('queueTableBody');

  function statusClass(name) {
    const key = (name || '').toLowerCase();
    if (key === 'pending') return 'status--pending';
    if (key === 'confirmed' || key === 'paid' || key === 'ready') return 'status--confirmed';
    if (key === 'completed') return 'status--completed';
    if (key === 'cancelled' || key === 'no show' || key === 'refunded') return 'status--cancelled';
    if (key === 'unpaid' || key === 'processing') return 'status--unpaid';
    return '';
  }

  async function loadDoctors() {
    const resp = await axios.get(`${apptApi}?operation=list_doctors`);
    const select = document.getElementById('approve_doctor_id');
    const queueSelect = document.getElementById('queueDoctor');

    select.innerHTML = '<option value="">Select doctor</option>';
    queueSelect.innerHTML = '<option value="">All Doctors</option>';

    (resp.data.data || []).forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.doctor_id;
      opt.textContent = d.doctor_name;
      select.appendChild(opt);

      const queueOpt = document.createElement('option');
      queueOpt.value = d.doctor_id;
      queueOpt.textContent = d.doctor_name;
      queueSelect.appendChild(queueOpt);
    });
  }

  // Load available doctors for a specific date
  async function loadAvailableDoctors(date) {
    try {
      const resp = await axios.get(`${apptApi}?operation=get_available_doctors&date=${date}`);
      const select = document.getElementById('approve_doctor_id');

      select.innerHTML = '<option value="">Select doctor</option>';

      (resp.data.data || []).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.doctor_id;
        opt.textContent = `${d.doctor_name}${d.specialization_name ? ` (${d.specialization_name})` : ''}`;
        select.appendChild(opt);
      });
    } catch (error) {
      console.error('Failed to load available doctors:', error);
      // Fallback to all doctors if API fails
      loadDoctors();
    }
  }

  async function loadAppointments() {
    const date = filterDate.value || '';
    const resp = await axios.get(`${apptApi}?operation=get_doctor_day_overview&date=${encodeURIComponent(date)}`);
    const rows = resp.data.data || [];
    const effectiveDate = resp.data.date || date;
    overviewBody.innerHTML = "";
    if (!rows.length) {
      overviewBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No appointments found</td></tr>';
    } else {
      rows.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${effectiveDate}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-view-patients="${doc.doctor_id}" data-date="${effectiveDate}">
              View patients (${doc.patient_count})
            </button>
          </td>
          <td>
            <div class="fw-semibold">${doc.doctor_name}</div>
            <small class="text-muted">${doc.specialization_name || ''}</small>
          </td>
          <td><span class="status-badge status--confirmed">Confirmed</span></td>
          <td>${doc.patient_count ? `<span class=\"queue-chip\">${doc.patient_count}</span>` : '-'}</td>
          <td class="text-nowrap">-</td>
        `;
        overviewBody.appendChild(tr);
      });
    }

    // Also render the full transactions list (all appointments, not grouped), so multiple doctors are shown simultaneously
    const allResp = await axios.get(`${apptApi}?operation=get_all&limit=500`);
    const allRows = allResp.data.data || [];
    const selected = filterDate.value;
    tbody.innerHTML = '';
    allRows
      .filter(r => !selected || r.appointment_date === selected)
      .forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.appointment_date}</td>
          <td>${r.patient_name}</td>
          <td>${r.doctor_name || '-'}</td>
          <td><span class="status-badge ${statusClass(r.appointment_status)}">${r.appointment_status}</span></td>
          <td>${r.queue_number ? `<span class=\"queue-chip\">${r.queue_number}</span>` : '-'}</td>
          <td class="text-nowrap">
            ${r.appointment_status === 'Pending' ? `<button class="btn btn-sm btn-success me-1" data-approve="${r.appointment_id}">Approve</button>` : ''}
            <button class="btn btn-sm btn-outline-secondary me-1" data-status="Completed" data-id="${r.appointment_id}">Mark Completed</button>
            <button class="btn btn-sm btn-outline-danger" data-status="Cancelled" data-id="${r.appointment_id}">Cancel</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
  }

  // Modal to view patients per doctor/date
  let patientsModal;
  function ensurePatientsModal() {
    let el = document.getElementById('patientsModal');
    if (!el) {
      el = document.createElement('div');
      el.className = 'modal fade';
      el.id = 'patientsModal';
      el.tabIndex = -1;
      el.innerHTML = `
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Patients</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="patientsList"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(el);
    }
    patientsModal = new bootstrap.Modal(el);
    return el;
  }

  // Handle clicks on "View patients" in the doctor overview table
  overviewBody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-view-patients]');
    if (!btn) return;
    const doctorId = btn.getAttribute('data-view-patients');
    const date = btn.getAttribute('data-date');
    const el = ensurePatientsModal();
    const listEl = el.querySelector('#patientsList');
    listEl.innerHTML = '<div class="text-muted">Loading...</div>';
    try {
      const resp = await axios.get(`${apptApi}?operation=get_doctor_patients_on_date&doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`);
      const rows = resp.data.data || [];
      if (!rows.length) {
        listEl.innerHTML = '<div class="text-muted">No patients</div>';
      } else {
        const items = rows.map(p => {
          const extra = p.confirmed_count > 1 ? ` <small class=\"text-muted\">(All confirmed: ${p.confirmed_dates})</small>` : '';
          return `<li>${p.patient_name} - ${p.appointment_date} ${p.queue_number ? `(Q#${p.queue_number})` : ''}${extra}</li>`;
        }).join('');
        listEl.innerHTML = `<ul class=\"mb-0 ps-3\">${items}</ul>`;
      }
      patientsModal.show();
    } catch (err) {
      listEl.innerHTML = '<div class="text-danger">Failed to load patients</div>';
      patientsModal.show();
    }
  });

  // Backward compatibility: in case any "View patients" buttons end up in the transactions table
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-view-patients]');
    if (!btn) return;
    const doctorId = btn.getAttribute('data-view-patients');
    const date = btn.getAttribute('data-date');
    const el = ensurePatientsModal();
    const listEl = el.querySelector('#patientsList');
    listEl.innerHTML = '<div class="text-muted">Loading...</div>';
    try {
      const resp = await axios.get(`${apptApi}?operation=get_doctor_patients_on_date&doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`);
      const rows = resp.data.data || [];
      if (!rows.length) {
        listEl.innerHTML = '<div class="text-muted">No patients</div>';
      } else {
        const items = rows.map(p => {
          const extra = p.confirmed_count > 1 ? ` <small class=\"text-muted\">(All confirmed: ${p.confirmed_dates})</small>` : '';
          return `<li>${p.patient_name} - ${p.appointment_date} ${p.queue_number ? `(Q#${p.queue_number})` : ''}${extra}</li>`;
        }).join('');
        listEl.innerHTML = `<ul class=\"mb-0 ps-3\">${items}</ul>`;
      }
      patientsModal.show();
    } catch (err) {
      listEl.innerHTML = '<div class="text-danger">Failed to load patients</div>';
      patientsModal.show();
    }
  });

  tbody.addEventListener('click', (e) => {
    const approveId = e.target.getAttribute('data-approve');
    const statusName = e.target.getAttribute('data-status');
    const appointmentId = e.target.getAttribute('data-id');

    if (approveId) {
      document.getElementById('approve_appointment_id').value = approveId;
      document.getElementById('approve_queue_number').value = '';
      loadDoctors().then(() => approveModal.show());
      return;
    }
    if (statusName && appointmentId) {
      setAppointmentStatus(appointmentId, statusName);
      return;
    }
  });

  // Handle clicks in Pending table
  pendingBody?.addEventListener('click', (e) => {
    const approveId = e.target.getAttribute('data-approve');
    if (approveId) {
      document.getElementById('approve_appointment_id').value = approveId;
      document.getElementById('approve_queue_number').value = '';
      loadDoctors().then(() => approveModal.show());
    }
  });

  async function setAppointmentStatus(id, statusName) {
    const payload = new FormData();
    payload.append('operation', 'set_status');
    payload.append('json', JSON.stringify({ appointment_id: id, status_name: statusName }));
    const resp = await axios.post(apptApi, payload);
    if (resp.data.success) {
      await loadAppointments();
      Swal.fire('Updated', 'Appointment status updated', 'success');
    } else {
      Swal.fire('Error', resp.data.message || 'Failed to update', 'error');
    }
  }

  approveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!approveForm.checkValidity()) { approveForm.classList.add('was-validated'); return; }
    approveForm.classList.remove('was-validated');
    const fd = new FormData(approveForm);
    const json = JSON.stringify({
      appointment_id: fd.get('appointment_id'),
      doctor_id: fd.get('doctor_id')
    });
    const payload = new FormData();
    payload.append('operation', 'approve');
    payload.append('json', json);
    const resp = await axios.post(apptApi, payload);
    if (resp.data.success) {
      approveModal?.hide();
      await loadAll();
      Swal.fire('Approved', 'Appointment approved', 'success');
    } else {
      Swal.fire('Error', resp.data.message || 'Approval failed', 'error');
    }
  });

  filterBtn?.addEventListener('click', loadAppointments);
  filterDate?.addEventListener('change', loadAppointments);

  // Load both sections
  async function loadPending() {
    const resp = await axios.get(`${apptApi}?operation=get_all&limit=200`);
    const rows = resp.data.data || [];
    const pending = rows.filter(r => (r.appointment_status || '').toLowerCase() === 'pending');
    pendingBody.innerHTML = '';
    if (!pending.length) {
      pendingBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No pending appointments</td></tr>';
      return;
    }
    pending.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.appointment_date}</td>
        <td>${r.patient_name}</td>
        <td><span class="status-badge ${statusClass(r.appointment_status)}">${r.appointment_status}</span></td>
        <td>
          <button class="btn btn-sm btn-success" data-approve="${r.appointment_id}"><i class="fas fa-check me-1"></i>Approve</button>
        </td>
      `;
      pendingBody.appendChild(tr);
    });
  }

  async function loadAll() {
    const tasks = [];
    if (pendingBody) tasks.push(loadPending());
    if (overviewBody || tbody) tasks.push(loadAppointments());
    if (confirmedBody) tasks.push(loadConfirmed());
    await Promise.all(tasks);
  }

  loadAll();

  // Confirmed table (all confirmed for selected date)
  async function loadConfirmed() {
    const date = filterDate.value || '';
    // reuse get_all and filter in JS for simplicity
    const resp = await axios.get(`${apptApi}?operation=get_all&limit=500`);
    const doctorFilter = (confirmedSearch?.value || '').trim().toLowerCase();
    const rows = (resp.data.data || []).filter(r => {
      return (!date || r.appointment_date === date) && (r.appointment_status || '').toLowerCase() === 'confirmed';
    });
    const filtered = doctorFilter ? rows.filter(r => (r.doctor_name || '').toLowerCase().includes(doctorFilter)) : rows;
    confirmedBody.innerHTML = '';
    if (!filtered.length) {
      confirmedBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No confirmed appointments</td></tr>';
      return;
    }
    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.appointment_date}</td>
        <td>${r.patient_name}</td>
        <td>${r.doctor_name || '-'}</td>
        <td><span class="status-badge ${statusClass(r.appointment_status)}">${r.appointment_status}</span></td>
        <td>${r.queue_number ? `<span class="queue-chip">${r.queue_number}</span>` : '-'}</td>
      `;
      confirmedBody.appendChild(tr);
    });
  }

  confirmedSearch?.addEventListener('input', loadConfirmed);

  // Queue Management Functions
  async function loadQueueStatus() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await axios.get(`${enhancedQueueApi}?operation=get_enhanced_queue_status&date=${today}`);

      if (res.data.success) {
        const data = res.data;

        // Update queue numbers
        currentQueueNumber.textContent = data.current_consultation ? data.current_consultation.queue_number : '-';
        nextQueueNumber.textContent = data.next_in_queue ? data.next_in_queue.queue_number : '-';

        // Count appointments by status
        completedCount.textContent = data.completed_count;
        pendingCount.textContent = data.confirmed_count;

        // Display queue status info
        if (data.current_consultation) {
          queueStatusInfo.innerHTML = `
            <div class="alert alert-primary mb-0">
              <div class="d-flex align-items-center">
                <i class="fas fa-user-md fa-2x me-3 text-primary"></i>
                <div>
                  <h6 class="mb-1">Currently in Consultation</h6>
                  <p class="mb-0"><strong>${data.current_consultation.patient_name}</strong> with <strong>Dr. ${data.current_consultation.doctor_name}</strong> - Queue #${data.current_consultation.queue_number}</p>
                </div>
                <div class="ms-auto">
                  <button class="btn btn-success btn-sm" onclick="completeConsultation(${data.current_consultation.appointment_id})">
                    <i class="fas fa-check me-2"></i>Complete
                  </button>
                </div>
              </div>
            </div>
          `;
        } else if (data.next_in_queue) {
          queueStatusInfo.innerHTML = `
            <div class="alert alert-warning mb-0">
              <div class="d-flex align-items-center">
                <i class="fas fa-clock fa-2x me-3 text-warning"></i>
                <div>
                  <h6 class="mb-1">Next Patient Ready</h6>
                  <p class="mb-0"><strong>${data.next_in_queue.patient_name}</strong> - Queue #${data.next_in_queue.queue_number}</p>
                </div>
                <div class="ms-auto">
                  <button class="btn btn-primary btn-sm" onclick="startConsultation(${data.next_in_queue.appointment_id})">
                    <i class="fas fa-play me-2"></i>Start Consultation
                  </button>
                </div>
              </div>
            </div>
          `;
        } else {
          queueStatusInfo.innerHTML = `
            <div class="alert alert-info mb-0">
              <div class="d-flex align-items-center">
                <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                <div>
                  <h6 class="mb-1">Queue Status</h6>
                  <p class="mb-0">All consultations completed for today</p>
                </div>
              </div>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Failed to load queue status:', error);
      queueStatusInfo.innerHTML = `
        <div class="alert alert-danger mb-0">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Failed to load queue status
        </div>
      `;
    }
  }

  async function loadQueueTable() {
    try {
      const date = queueDate.value || new Date().toISOString().slice(0, 10);
      const doctorId = queueDoctor.value || '';

      let url = `${queueApi}?operation=get_current_queue_status&date=${date}`;
      if (doctorId) {
        url = `${queueApi}?operation=get_doctor_queue_status&doctor_id=${doctorId}&date=${date}`;
      }

      const res = await axios.get(url);
      if (res.data.success) {
        const appointments = res.data.all_appointments || [];

        queueTableBody.innerHTML = '';
        if (appointments.length === 0) {
          queueTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No appointments found</td></tr>';
          return;
        }

        appointments.forEach(apt => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><span class="queue-chip">${apt.queue_number}</span></td>
            <td>${apt.patient_name}</td>
            <td>${apt.doctor_name || '-'}</td>
            <td><span class="status-badge ${statusClass(apt.appointment_status)}">${apt.appointment_status}</span></td>
            <td>
              ${apt.appointment_status === 'Confirmed' ?
                `<button class="btn btn-sm btn-primary me-1" onclick="startConsultation(${apt.appointment_id})">
                  <i class="fas fa-play me-1"></i>Start
                </button>` : ''
              }
              ${apt.appointment_status === 'In Consultation' ?
                `<button class="btn btn-sm btn-success" onclick="completeConsultation(${apt.appointment_id})">
                  <i class="fas fa-check me-1"></i>Complete
                </button>` : ''
              }
            </td>
          `;
          queueTableBody.appendChild(tr);
        });
      }
    } catch (error) {
      console.error('Failed to load queue table:', error);
      queueTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load queue data</td></tr>';
    }
  }

  // Global functions for queue management (accessible from onclick)
  window.startConsultation = async function(appointmentId) {
    try {
      // Get current user (secretary) ID
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const secretaryId = user.id;

      const res = await axios.post(enhancedQueueApi, {
        operation: 'set_current_consultation',
        json: JSON.stringify({
          appointment_id: appointmentId,
          secretary_id: secretaryId
        })
      });

      if (res.data.success) {
        Swal.fire('Success', 'Consultation started!', 'success');
        loadQueueStatus();
        loadQueueTable();
      } else {
        Swal.fire('Error', res.data.message || 'Failed to start consultation', 'error');
      }
    } catch (e) {
      console.error('Failed to start consultation:', e);
      Swal.fire('Error', 'Something went wrong', 'error');
    }
  };

  window.completeConsultation = async function(appointmentId) {
    try {
      const res = await axios.post(queueApi, {
        operation: 'complete_consultation',
        json: JSON.stringify({ appointment_id: appointmentId })
      });

      if (res.data.success) {
        Swal.fire('Success', 'Consultation completed!', 'success');
        loadQueueStatus();
        loadQueueTable();
      } else {
        Swal.fire('Error', res.data.message || 'Failed to complete consultation', 'error');
      }
    } catch (e) {
      console.error('Failed to complete consultation:', e);
      Swal.fire('Error', 'Something went wrong', 'error');
    }
  };

  // New function for complete and next
  window.completeAndNext = async function() {
    try {
      // Get current user (secretary) ID
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const secretaryId = user.id;
      const today = new Date().toISOString().slice(0, 10);

      const res = await axios.post(enhancedQueueApi, {
        operation: 'complete_and_next',
        json: JSON.stringify({
          secretary_id: secretaryId,
          date: today
        })
      });

      if (res.data.success) {
        Swal.fire('Success', res.data.message, 'success');
        loadQueueStatus();
        loadQueueTable();
      } else {
        Swal.fire('Error', res.data.message || 'Failed to complete and move to next', 'error');
      }
    } catch (e) {
      console.error('Failed to complete and next:', e);
      Swal.fire('Error', 'Something went wrong', 'error');
    }
  };

  // Event listeners for queue management
  refreshQueueBtn?.addEventListener('click', loadQueueStatus);
  queueDate?.addEventListener('change', loadQueueTable);
  queueDoctor?.addEventListener('change', loadQueueTable);
  queueModalEl?.addEventListener('show.bs.modal', () => {
    queueDate.value = new Date().toISOString().slice(0, 10);
    loadQueueTable();
  });

  // Load queue status on page load
  if (queueStatusInfo) {
    loadQueueStatus();
  }
});
