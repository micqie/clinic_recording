document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const apptApi = `${baseApiUrl}/appointments.php`;
  const payApi = `${baseApiUrl}/payments.php`;

  const tbody = document.getElementById("appointmentsTableBody");
  const filterDate = document.getElementById("filterDate");
  const filterBtn = document.getElementById("filterBtn");

  const approveModal = new bootstrap.Modal(document.getElementById('approveModal'));
  const approveForm = document.getElementById('approveForm');

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
    const resp = await axios.get(`${apptApi}?operation=get_all&limit=200`);
    const rows = resp.data.data || [];
    tbody.innerHTML = "";
    const selected = filterDate.value;
    rows
      .filter(r => !selected || r.appointment_date === selected)
      .forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.appointment_date}</td>
          <td>${r.patient_name}</td>
          <td>${r.doctor_name || '-'}</td>
          <td>${r.appointment_status}</td>
          <td>${r.queue_number || '-'}</td>
          <td>${r.payment_status || 'Unpaid'}</td>
          <td class="text-nowrap">
            ${r.appointment_status === 'Pending' ? `<button class="btn btn-sm btn-success me-1" data-approve="${r.appointment_id}">Approve</button>` : ''}
            <button class="btn btn-sm btn-outline-secondary me-1" data-status="Completed" data-id="${r.appointment_id}">Mark Completed</button>
            <button class="btn btn-sm btn-outline-danger" data-status="Cancelled" data-id="${r.appointment_id}">Cancel</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
  }

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
      doctor_id: fd.get('doctor_id'),
      queue_number: fd.get('queue_number')
    });
    const payload = new FormData();
    payload.append('operation', 'approve');
    payload.append('json', json);
    const resp = await axios.post(apptApi, payload);
    if (resp.data.success) {
      approveModal.hide();
      await loadAppointments();
      Swal.fire('Approved', 'Appointment approved', 'success');
    } else {
      Swal.fire('Error', resp.data.message || 'Approval failed', 'error');
    }
  });

  filterBtn?.addEventListener('click', loadAppointments);
  filterDate?.addEventListener('change', loadAppointments);

  loadAppointments();
});


