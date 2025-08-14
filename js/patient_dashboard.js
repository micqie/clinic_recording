document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const payApi = `${baseApiUrl}/payments.php`;
  const userApi = `${baseApiUrl}/user.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const patientId = prof.data?.context?.patient_id;
  if (!patientId) { Swal.fire('Error', 'No patient profile found.', 'error'); return; }

  const apptsResp = await axios.get(`${apptApi}?operation=get_by_patient&patient_id=${patientId}`);
  const appts = apptsResp.data.data || [];

  // Stats
  document.getElementById('stat_total').textContent = appts.length;
  document.getElementById('stat_completed').textContent = appts.filter(a => a.appointment_status === 'Completed').length;
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('stat_upcoming').textContent = appts.filter(a => a.appointment_date >= today && (a.appointment_status === 'Pending' || a.appointment_status === 'Confirmed')).length;

  const payResp = await axios.get(`${payApi}?operation=get_by_patient&patient_id=${patientId}`);
  const unpaid = (payResp.data.data || []).filter(p => p.payment_status === 'Unpaid').length;
  document.getElementById('stat_unpaid').textContent = unpaid;

  // Recent
  const recent = [...appts].sort((a,b) => (b.appointment_date > a.appointment_date ? 1 : -1)).slice(0,5);
  const ul = document.getElementById('recent_list');
  ul.innerHTML = '';
  recent.forEach(r => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${r.appointment_date} - ${r.appointment_status}</span><span>${r.doctor_name || '-'}</span>`;
    ul.appendChild(li);
  });
});


