document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const userApi = `${baseApiUrl}/user.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const patientId = prof.data?.context?.patient_id;
  if (!patientId) { Swal.fire('Error', 'No patient profile found.', 'error'); return; }

  const requestDate = document.getElementById('requestDate');
  const requestBtn = document.getElementById('requestBtn');
  const list = document.getElementById('appt_list');

  async function refreshList() {
    const resp = await axios.get(`${apptApi}?operation=get_by_patient&patient_id=${patientId}`);
    const appts = resp.data.data || [];
    list.innerHTML = '';
    appts.forEach(a => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerHTML = `<div class="d-flex justify-content-between align-items-center">
        <div><div class="fw-semibold">${a.appointment_date}</div><div class="small text-muted">Status: ${a.appointment_status}</div></div>
        <div class="text-end">
          <div>${a.doctor_name || '-'}</div>
          <div class="small">Queue: ${a.queue_number || '-'}</div>
        </div>
      </div>`;
      list.appendChild(li);
    });
  }

  async function checkDateCapacity(dateStr) {
    const r = await axios.get(`${apptApi}?operation=get_booked_count&date=${dateStr}`);
    return (r.data?.count ?? 0) < 15;
  }

  requestBtn?.addEventListener('click', async () => {
    const dateStr = requestDate.value;
    if (!dateStr) { Swal.fire('Error', 'Please select a date.', 'error'); return; }
    const ok = await checkDateCapacity(dateStr);
    if (!ok) { Swal.fire('Info', 'Fully Booked', 'info'); return; }

    const payload = new FormData();
    payload.append('operation', 'request');
    payload.append('json', JSON.stringify({ patient_id: patientId, appointment_date: dateStr }));
    const resp = await axios.post(apptApi, payload);
    if (resp.data.success) {
      await refreshList();
      Swal.fire('Requested', 'Appointment requested as Pending', 'success');
    } else {
      Swal.fire('Error', resp.data.message || 'Request failed', 'error');
    }
  });

  // Disable fully booked dates dynamically when changed
  requestDate?.addEventListener('change', async () => {
    if (!requestDate.value) return;
    const ok = await checkDateCapacity(requestDate.value);
    if (!ok) {
      Swal.fire('Info', 'Date is fully booked (15/15). Please choose another date.', 'info');
      requestDate.value = '';
    }
  });

  refreshList();
});


