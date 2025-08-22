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

  // Search and filter elements
  const searchInput = document.getElementById('searchPatient');
  const statusFilter = document.getElementById('filterStatus');
  const clearFiltersBtn = document.getElementById('clearFilters');

  // Store all appointments for filtering
  let allAppointments = [];

  async function loadAppointments() {
    try {
      const resp = await axios.get(`${apptApi}?operation=get_by_doctor&doctor_id=${doctorId}`);
      allAppointments = resp.data.data || [];
      displayAppointments(allAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Swal.fire('Error', 'Failed to load appointments', 'error');
    }
  }

  function displayAppointments(appointments) {
    tbody.innerHTML = '';

    if (appointments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted py-4">
            <i class="fas fa-calendar-times fa-3x mb-3"></i>
            <p>No appointments found</p>
            </td>
          </tr>
        `;
        return;
      }

    appointments.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${r.appointment_date}</td>
        <td>${r.patient_name}</td>
        <td><span class="status-badge status--${r.appointment_status.toLowerCase().replace(/\s/g, '')}">${r.appointment_status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Search and filter functionality
  function filterAppointments() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusFilterValue = statusFilter.value;

    let filtered = allAppointments.filter(appointment => {
      const matchesSearch = appointment.patient_name.toLowerCase().includes(searchTerm);
      const matchesStatus = !statusFilterValue || appointment.appointment_status === statusFilterValue;

      return matchesSearch && matchesStatus;
    });

    displayAppointments(filtered);
  }

  // Event listeners for search and filter
  searchInput?.addEventListener('input', filterAppointments);
  statusFilter?.addEventListener('change', filterAppointments);
  clearFiltersBtn?.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    displayAppointments(allAppointments);
  });

  // Initial load
  await loadAppointments();
});
