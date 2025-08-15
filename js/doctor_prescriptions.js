document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const prescriptionApiUrl = `${baseApiUrl}/prescriptions.php`;
  const patientApiUrl = `${baseApiUrl}/patients.php`;
  const medicineApiUrl = `${baseApiUrl}/medicines.php`;
  
  // Check if user is logged in and is a doctor
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.id || user.role !== "doctor") {
    window.location.href = "../../index.html";
    return;
  }

  const prescriptionsTableBody = document.getElementById("prescriptionsTableBody");
  const addPrescriptionForm = document.getElementById("addPrescriptionForm");
  const editPrescriptionForm = document.getElementById("editPrescriptionForm");
  const addPrescriptionModal = new bootstrap.Modal(document.getElementById("addPrescriptionModal"));
  const editPrescriptionModal = new bootstrap.Modal(document.getElementById("editPrescriptionModal"));

  async function loadPrescriptions() {
    try {
      const response = await axios.get(`${prescriptionApiUrl}?operation=get_doctor_prescriptions&doctor_id=${user.id}`);
      if (response.data.success) {
        displayPrescriptions(response.data.data);
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error loading prescriptions:", error);
      Swal.fire("Error", "Failed to load prescriptions", "error");
    }
  }

  async function loadPatients() {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get_all`);
      if (response.data.success) {
        const patientSelects = document.querySelectorAll('select[name="patient_id"]');
        patientSelects.forEach(select => {
          select.innerHTML = '<option value="">Select patient</option>';
          response.data.data.forEach(patient => {
            select.innerHTML += `<option value="${patient.patient_id}">${patient.full_name}</option>`;
          });
        });
      }
    } catch (error) {
      console.error("Error loading patients:", error);
    }
  }

  async function loadMedicines() {
    try {
      const response = await axios.get(`${medicineApiUrl}?operation=get_all`);
      if (response.data.success) {
        const medicineSelects = document.querySelectorAll('select[name="medicine_id"]');
        medicineSelects.forEach(select => {
          select.innerHTML = '<option value="">Select medicine</option>';
          response.data.data.forEach(medicine => {
            select.innerHTML += `<option value="${medicine.medicine_id}">${medicine.medicine_name} - ${medicine.dosage_form}</option>`;
          });
        });
      }
    } catch (error) {
      console.error("Error loading medicines:", error);
    }
  }

  function displayPrescriptions(prescriptions) {
    prescriptionsTableBody.innerHTML = "";
    
    prescriptions.forEach(prescription => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${prescription.prescription_id}</td>
        <td>${prescription.patient_name}</td>
        <td>${prescription.medicine_name}</td>
        <td>${prescription.dosage}</td>
        <td>${prescription.frequency}</td>
        <td>${prescription.duration}</td>
        <td><span class="badge bg-${getStatusBadgeColor(prescription.status)}">${prescription.status}</span></td>
        <td>${new Date(prescription.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editPrescription(${prescription.prescription_id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePrescription(${prescription.prescription_id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      prescriptionsTableBody.appendChild(row);
    });
  }

  function getStatusBadgeColor(status) {
    switch (status) {
      case 'Active': return 'success';
      case 'Completed': return 'info';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  }

  // Add new prescription
  addPrescriptionForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addPrescriptionForm);

    const jsonPayload = JSON.stringify({
      patient_id: formData.get("patient_id"),
      medicine_id: formData.get("medicine_id"),
      dosage: formData.get("dosage"),
      frequency: formData.get("frequency"),
      duration: formData.get("duration"),
      instructions: formData.get("instructions"),
      doctor_id: user.id
    });

    const payload = new FormData();
    payload.append("operation", "add");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(prescriptionApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        addPrescriptionForm.reset();
        addPrescriptionModal.hide();
        loadPrescriptions();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error adding prescription", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  });

  // Edit prescription
  window.editPrescription = async (prescriptionId) => {
    try {
      const response = await axios.get(`${prescriptionApiUrl}?operation=get&id=${prescriptionId}`);
      if (response.data.success) {
        const prescription = response.data.data;
        
        document.getElementById("edit_prescription_id").value = prescription.prescription_id;
        document.getElementById("edit_patient_id").value = prescription.patient_id;
        document.getElementById("edit_medicine_id").value = prescription.medicine_id;
        document.getElementById("edit_dosage").value = prescription.dosage;
        document.getElementById("edit_frequency").value = prescription.frequency;
        document.getElementById("edit_duration").value = prescription.duration;
        document.getElementById("edit_status").value = prescription.status;
        document.getElementById("edit_instructions").value = prescription.instructions || "";
        
        editPrescriptionModal.show();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error loading prescription details:", error);
      Swal.fire("Error", "Failed to load prescription details", "error");
    }
  };

  // Update prescription
  editPrescriptionForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(editPrescriptionForm);

    const jsonPayload = JSON.stringify({
      prescription_id: formData.get("prescription_id"),
      patient_id: formData.get("patient_id"),
      medicine_id: formData.get("medicine_id"),
      dosage: formData.get("dosage"),
      frequency: formData.get("frequency"),
      duration: formData.get("duration"),
      status: formData.get("status"),
      instructions: formData.get("instructions")
    });

    const payload = new FormData();
    payload.append("operation", "update");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(prescriptionApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        editPrescriptionModal.hide();
        loadPrescriptions();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Error updating prescription", error);
      Swal.fire("Error", "Something went wrong", "error");
    }
  });

  // Delete prescription
  window.deletePrescription = async (prescriptionId) => {
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
        payload.append("id", prescriptionId);

        const response = await axios.post(prescriptionApiUrl, payload);
        if (response.data.success) {
          Swal.fire("Deleted!", response.data.message, "success");
          loadPrescriptions();
        } else {
          Swal.fire("Error", response.data.message, "error");
        }
      } catch (error) {
        console.error("Error deleting prescription", error);
        Swal.fire("Error", "Something went wrong", "error");
      }
    }
  };

  // Load data on page load
  loadPrescriptions();
  loadPatients();
  loadMedicines();
});
