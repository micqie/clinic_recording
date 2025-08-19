document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const apptApi = `${baseApiUrl}/appointments.php`;

  const tbody = document.getElementById("appointmentsTableBody");
  const overviewBody = document.getElementById("doctorOverviewBody");
  const pendingBody = document.getElementById("pendingTableBody");
  const confirmedBody = document.getElementById("confirmedTableBody");
  const confirmedSearch = document.getElementById("confirmedSearchInput");
  const filterDate = document.getElementById("filterDate");
  const filterBtn = document.getElementById("filterBtn");

  const approveModal = new bootstrap.Modal(document.getElementById('approveModal'));
  const approveForm = document.getElementById('approveForm');

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
    select.innerHTML = '<option value="">Select doctor</option>';
    (resp.data.data || []).forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.doctor_id;
      opt.textContent = d.doctor_name;
      select.appendChild(opt);
    });
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
      approveModal.hide();
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
    await Promise.all([loadPending(), loadAppointments(), loadConfirmed()]);
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
});
