document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const appointmentsApi = `${baseApiUrl}/appointments.php`;

  // Check if user is logged in and is a doctor
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.id || user.role !== "doctor") {
    window.location.href = "../../index.html";
    return;
  }

  const patientsTableBody = document.getElementById("patientsTableBody");

  // Search and filter elements
  const searchInput = document.getElementById('searchPatient');
  const statusFilter = document.getElementById('filterStatus');
  const clearFiltersBtn = document.getElementById('clearFilters');

  // Store all patients for filtering
  let allPatients = [];

  async function loadPatients() {
    try {
      const response = await axios.get(`${appointmentsApi}?operation=get_by_doctor&doctor_id=${user.id}`);
      if (response.data.success) {
        allPatients = response.data.data || [];
        displayPatients(allPatients);
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error loading patients:", error);
      Swal.fire("Error", "Failed to load patients", "error");
    }
  }

  function displayPatients(patients) {
    patientsTableBody.innerHTML = "";

    if (patients.length === 0) {
      patientsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="fas fa-users fa-3x mb-3"></i>
            <p>No patients found</p>
          </td>
        </tr>
      `;
      return;
    }

    patients.forEach(appt => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${appt.patient_name}</td>
        <td>${appt.appointment_date}</td>
        <td>${appt.queue_number ?? '-'}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" onclick="navigateToConsultations(${appt.patient_id}, ${appt.appointment_id})" title="Go to Consultations">
            <i class="fas fa-stethoscope"></i>
          </button>
          <button class="btn btn-sm btn-warning me-1" onclick="navigateToLabRequests(${appt.patient_id}, ${appt.appointment_id})" title="Go to Lab Requests">
            <i class="fas fa-flask"></i>
          </button>
        </td>
      `;
      patientsTableBody.appendChild(row);
    });
  }

  // Search and filter functionality
  function filterPatients() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusFilterValue = statusFilter.value;

    let filtered = allPatients.filter(patient => {
      const matchesSearch = patient.patient_name.toLowerCase().includes(searchTerm);
      const matchesStatus = !statusFilterValue || patient.appointment_status === statusFilterValue;

      return matchesSearch && matchesStatus;
    });

    displayPatients(filtered);
  }

  // Event listeners for search and filter
  searchInput?.addEventListener('input', filterPatients);
  statusFilter?.addEventListener('change', filterPatients);
  clearFiltersBtn?.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    displayPatients(allPatients);
  });

  // Navigate to consultations page with patient context
  window.navigateToConsultations = (patientId, appointmentId) => {
    // Store patient context in session storage for the consultations page
    sessionStorage.setItem('selectedPatientId', patientId);
    sessionStorage.setItem('selectedAppointmentId', appointmentId);
    sessionStorage.setItem('fromPatientsPage', 'true');

    // Navigate to consultations page
    window.location.href = 'doctor_consultations.html';
  };

  // Navigate to lab requests page with patient context
  window.navigateToLabRequests = (patientId, appointmentId) => {
    // Store patient context in session storage for the lab requests page
    sessionStorage.setItem('selectedPatientId', patientId);
    sessionStorage.setItem('selectedAppointmentId', appointmentId);
    sessionStorage.setItem('fromPatientsPage', 'true');

    // Navigate to lab requests page
    window.location.href = 'doctor_lab_requests.html';
  };

  // Load patients on page load
  loadPatients();
});
