document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const patientApiUrl = `${baseApiUrl}/patients.php`;

  // Check if user is logged in and is a doctor
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.id || user.role !== "doctor") {
    window.location.href = "../../index.html";
    return;
  }

  const patientsTableBody = document.getElementById("patientsTableBody");
  const consultationForm = document.getElementById("consultationForm");
  const labRequestForm = document.getElementById("labRequestForm");
  const consultationModal = document.getElementById("consultationModal") ? new bootstrap.Modal(document.getElementById("consultationModal")) : null;
  const labRequestModal = document.getElementById("labRequestModal") ? new bootstrap.Modal(document.getElementById("labRequestModal")) : null;
  const consultationsApi = `${baseApiUrl}/consultations.php`;
  const appointmentsApi = `${baseApiUrl}/appointments.php`;
  const labRequestsApi = `${baseApiUrl}/lab_requests.php`;

  async function loadPatients() {
    try {
      const response = await axios.get(`${appointmentsApi}?operation=get_by_doctor&doctor_id=${user.id}`);
      if (response.data.success) {
        displayPatients(response.data.data);
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error loading patients:", error);
      Swal.fire("Error", "Failed to load patients", "error");
    }
  }

  function displayPatients(appointments) {
    patientsTableBody.innerHTML = "";

    appointments.forEach(appt => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${appt.patient_name}</td>
        <td>${appt.appointment_date}</td>
        <td>${appt.queue_number ?? '-'}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" onclick="startConsultation(${appt.patient_id}, ${appt.appointment_id}, '${appt.patient_name.replace(/'/g, "\'")}', '${appt.appointment_date}')">
            <i class="fas fa-stethoscope"></i>
          </button>
          <button class="btn btn-sm btn-warning me-1" onclick="startLabRequest(${appt.patient_id}, ${appt.appointment_id}, '${appt.patient_name.replace(/'/g, "\'")}', '${appt.appointment_date}')">
            <i class="fas fa-flask"></i>
          </button>
        </td>
      `;
      patientsTableBody.appendChild(row);
    });
  }
  // Start consultation
  window.startConsultation = (patientId, appointmentId, patientName, appointmentDate) => {
    if (!consultationModal) return;
    document.getElementById('c_patient_id').value = patientId;
    document.getElementById('c_appointment_id').value = appointmentId;
    consultationModal.show();
  };

  consultationForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(consultationForm);
    const payload = new FormData();
    payload.append('operation', 'add');
    payload.append('json', JSON.stringify({
      patient_id: fd.get('patient_id'),
      appointment_id: fd.get('appointment_id'),
      doctor_id: user.id,
      summary: fd.get('summary'),
      notes: fd.get('notes') || ''
    }));
    try {
      const res = await axios.post(consultationsApi, payload);
      if (res.data.success) {
        Swal.fire('Saved', 'Consultation added.', 'success');
        consultationForm.reset();
        consultationModal.hide();
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Could not save consultation.', 'error');
    }
  });

  // Start lab request
  window.startLabRequest = (patientId, appointmentId) => {
    if (!labRequestModal) return;
    document.getElementById('lr_patient_id').value = patientId;
    document.getElementById('lr_appointment_id').value = appointmentId;
    labRequestModal.show();
  };

  labRequestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(labRequestForm);
    const payload = new FormData();
    payload.append('operation', 'add');
    payload.append('json', JSON.stringify({
      patient_id: fd.get('patient_id'),
      appointment_id: fd.get('appointment_id'),
      request_text: fd.get('request_text'),
      doctor_id: user.id
    }));
    try {
      const res = await axios.post(labRequestsApi, payload);
      if (res.data.success) {
        Swal.fire('Sent', 'Lab request sent.', 'success');
        labRequestForm.reset();
        labRequestModal.hide();
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Could not send lab request.', 'error');
    }
  });

  // Load patients on page load
  loadPatients();
});
