document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const labRequestApiUrl = `${baseApiUrl}/lab_requests.php`;
  const patientApiUrl = `${baseApiUrl}/patients.php`;
  const appointmentApiUrl = `${baseApiUrl}/appointments.php`;
  
  // Check if user is logged in and is a doctor
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.id || user.role !== "doctor") {
    window.location.href = "../../index.html";
    return;
  }

  const labRequestsTableBody = document.getElementById("labRequestsTableBody");
  const addLabRequestForm = document.getElementById("addLabRequestForm");
  const updateStatusForm = document.getElementById("updateStatusForm");
  const addLabRequestModal = new bootstrap.Modal(document.getElementById("addLabRequestModal"));
  const updateStatusModal = new bootstrap.Modal(document.getElementById("updateStatusModal"));

  async function loadLabRequests() {
    try {
      const response = await axios.get(`${labRequestApiUrl}?operation=get_doctor_requests&doctor_id=${user.id}`);
      if (response.data.success) {
        displayLabRequests(response.data.data);
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error loading lab requests:", error);
      Swal.fire("Error", "Failed to load lab requests", "error");
    }
  }

  async function loadPatients() {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get_all`);
      if (response.data.success) {
        const patientSelect = document.querySelector('select[name="patient_id"]');
        patientSelect.innerHTML = '<option value="">Select patient</option>';
        response.data.data.forEach(patient => {
          patientSelect.innerHTML += `<option value="${patient.patient_id}">${patient.full_name}</option>`;
        });
      }
    } catch (error) {
      console.error("Error loading patients:", error);
    }
  }

  async function loadAppointments(patientId) {
    try {
      const response = await axios.get(`${appointmentApiUrl}?operation=get_patient_appointments&patient_id=${patientId}`);
      if (response.data.success) {
        const appointmentSelect = document.querySelector('select[name="appointment_id"]');
        appointmentSelect.innerHTML = '<option value="">Select appointment</option>';
        response.data.data.forEach(appointment => {
          appointmentSelect.innerHTML += `<option value="${appointment.appointment_id}">${appointment.appointment_date} - ${appointment.status}</option>`;
        });
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
    }
  }

  function displayLabRequests(labRequests) {
    labRequestsTableBody.innerHTML = "";
    
    labRequests.forEach(request => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${request.lab_request_id}</td>
        <td>${request.patient_name}</td>
        <td>${request.appointment_date}</td>
        <td>${request.request_text}</td>
        <td><span class="badge bg-${getStatusBadgeColor(request.status)}">${request.status}</span></td>
        <td>${new Date(request.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-outline-success me-1" onclick="updateStatus(${request.lab_request_id}, '${request.status}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteLabRequest(${request.lab_request_id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      labRequestsTableBody.appendChild(row);
    });
  }

  function getStatusBadgeColor(status) {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Processing': return 'info';
      case 'Ready': return 'success';
      case 'Delivered': return 'primary';
      default: return 'secondary';
    }
  }

  // Add new lab request
  addLabRequestForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addLabRequestForm);

    const jsonPayload = JSON.stringify({
      patient_id: formData.get("patient_id"),
      appointment_id: formData.get("appointment_id"),
      request_text: formData.get("request_text"),
      doctor_id: user.id
    });

    const payload = new FormData();
    payload.append("operation", "add");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(labRequestApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        addLabRequestForm.reset();
        addLabRequestModal.hide();
        loadLabRequests();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error adding lab request", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  });

  // Update status
  window.updateStatus = async (labRequestId, currentStatus) => {
    document.getElementById("us_lab_request_id").value = labRequestId;
    document.getElementById("us_current_status").value = currentStatus;
    updateStatusModal.show();
  };

  // Update status form
  updateStatusForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(updateStatusForm);

    const jsonPayload = JSON.stringify({
      lab_request_id: formData.get("lab_request_id"),
      status: formData.get("status")
    });

    const payload = new FormData();
    payload.append("operation", "update_status");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(labRequestApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        updateStatusModal.hide();
        loadLabRequests();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error updating status", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  });

  // Delete lab request
  window.deleteLabRequest = async (labRequestId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        const payload = new FormData();
        payload.append("operation", "delete");
        payload.append("id", labRequestId);

        const response = await axios.post(labRequestApiUrl, payload);
        if (response.data.success) {
          Swal.fire("Deleted!", response.data.message, "success");
          loadLabRequests();
        } else {
          Swal.fire("Error", response.data.message, "error");
        }
      } catch (error) {
        console.error("Error deleting lab request", error);
        Swal.fire("Error", "Something went wrong", "error");
      }
    }
  };

  // Load appointments when patient is selected
  document.querySelector('select[name="patient_id"]')?.addEventListener('change', (e) => {
    const patientId = e.target.value;
    if (patientId) {
      loadAppointments(patientId);
    } else {
      document.querySelector('select[name="appointment_id"]').innerHTML = '<option value="">Select appointment</option>';
    }
  });

  // Load data on page load
  loadLabRequests();
  loadPatients();
});
