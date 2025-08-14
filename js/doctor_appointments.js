document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const userApi = `${baseApiUrl}/user.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const doctorId = prof.data?.context?.doctor_id;
  if (!doctorId) { Swal.fire('Error', 'No doctor profile found.', 'error'); return; }

  const tbody = document.getElementById('docAppointmentsTableBody');
  const resp = await axios.get(`${apptApi}?operation=get_by_doctor&doctor_id=${doctorId}`);
  const rows = resp.data.data || [];
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.appointment_date}</td>
      <td>${r.queue_number || '-'}</td>
      <td>${r.patient_name}</td>
      <td>${r.appointment_status}</td>
    `;
    tbody.appendChild(tr);
  });
});


