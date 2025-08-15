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
  const addPatientForm = document.getElementById("addPatientForm");
  const editPatientForm = document.getElementById("editPatientForm");
  const addPatientModal = new bootstrap.Modal(document.getElementById("addPatientModal"));
  const editPatientModal = new bootstrap.Modal(document.getElementById("editPatientModal"));

  async function loadPatients() {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get_all`);
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

  function displayPatients(patients) {
    patientsTableBody.innerHTML = "";
    
    patients.forEach(patient => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${patient.patient_id}</td>
        <td>${patient.full_name}</td>
        <td>${patient.email}</td>
        <td>${patient.contact_num || "N/A"}</td>
        <td>${patient.sex || "N/A"}</td>
        <td>${patient.birthdate || "N/A"}</td>
        <td>${patient.address || "N/A"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editPatient(${patient.patient_id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePatient(${patient.patient_id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      patientsTableBody.appendChild(row);
    });
  }

  // Add new patient
  addPatientForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addPatientForm);

    const jsonPayload = JSON.stringify({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      sex: formData.get("sex"),
      contact_num: formData.get("contact_num"),
      birthdate: formData.get("birthdate"),
      address: formData.get("address"),
      password: formData.get("password")
    });

    const payload = new FormData();
    payload.append("operation", "add");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(patientApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        addPatientForm.reset();
        addPatientModal.hide();
        loadPatients();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error adding patient", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  });

  // Edit patient
  window.editPatient = async (patientId) => {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get&id=${patientId}`);
      if (response.data.success) {
        const patient = response.data.data;
        
        document.getElementById("edit_patient_id").value = patient.patient_id;
        document.getElementById("edit_full_name").value = patient.full_name;
        document.getElementById("edit_email").value = patient.email;
        document.getElementById("edit_contact_num").value = patient.contact_num || "";
        document.getElementById("edit_sex").value = patient.sex || "";
        document.getElementById("edit_birthdate").value = patient.birthdate || "";
        document.getElementById("edit_address").value = patient.address || "";
        
        editPatientModal.show();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error loading patient details:", error);
      Swal.fire("Error", "Failed to load patient details", "error");
    }
  };

  // Update patient
  editPatientForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(editPatientForm);

    const jsonPayload = JSON.stringify({
      patient_id: formData.get("patient_id"),
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      sex: formData.get("sex"),
      contact_num: formData.get("contact_num"),
      birthdate: formData.get("birthdate"),
      address: formData.get("address")
    });

    const payload = new FormData();
    payload.append("operation", "update");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(patientApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        editPatientModal.hide();
        loadPatients();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error updating patient", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  });

  // Delete patient
  window.deletePatient = async (patientId) => {
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
        payload.append("id", patientId);

        const response = await axios.post(patientApiUrl, payload);
        if (response.data.success) {
          Swal.fire("Deleted!", response.data.message, "success");
          loadPatients();
        } else {
          Swal.fire("Error", response.data.message, "error");
        }
      } catch (error) {
        console.error("Error deleting patient", error);
        Swal.fire("Error", "Something went wrong", "error");
      }
    }
  };

  // Load patients on page load
  loadPatients();
});
