document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const patientApiUrl = `${baseApiUrl}/patients.php`;

  const patientTableBody = document.getElementById("patientTableBody");
  const addPatientForm = document.getElementById("addPatientForm");
  const editPatientForm = document.getElementById("editPatientForm");

  // Bootstrap modal instances
  const viewPatientModal = new bootstrap.Modal(document.getElementById('viewPatientModal'));
  const editPatientModal = new bootstrap.Modal(document.getElementById('editPatientModal'));
  const addPatientModal = new bootstrap.Modal(document.getElementById('addPatientModal'));

  // Load patients list and populate table
  async function loadPatients() {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get_all`);
      if (response.data.success) {
        patientTableBody.innerHTML = "";

        response.data.data.forEach((patient) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${patient.full_name}</td>
            <td>${patient.email}</td>
            <td>${patient.sex || ""}</td>
            <td>${patient.contact_num || ""}</td>
            <td>${patient.birthdate || ""}</td>
            <td>${patient.address || ""}</td>
            <td>${patient.created_at}</td>
            <td>${patient.updated_at}</td>
            <td>
              <button class="btn btn-sm btn-info me-1" onclick="viewPatient(${patient.patient_id})">View</button>
              <button class="btn btn-sm btn-warning me-1" onclick="editPatient(${patient.patient_id})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deletePatient(${patient.patient_id})">Delete</button>
            </td>
          `;
          patientTableBody.appendChild(row);
        });
      } else {
        console.error("Failed to load patients:", response.data.message);
      }
    } catch (error) {
      console.error("Failed to load patients", error);
    }
  }

  // Add new patient submit handler
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

  // Delete patient handler
  window.deletePatient = async (patientId) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This will permanently delete the patient record.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      const payload = new FormData();
      payload.append("operation", "delete");
      payload.append("json", JSON.stringify({ patient_id: patientId }));

      try {
        const response = await axios.post(patientApiUrl, payload);
        if (response.data.success) {
          Swal.fire("Deleted", response.data.message, "success");
          loadPatients();
        } else {
          Swal.fire("Error", response.data.message, "error");
        }
      } catch (error) {
        console.error("Delete error", error);
        Swal.fire("Error", "Could not delete patient.", "error");
      }
    }
  };

  // View patient modal
  window.viewPatient = async (patientId) => {
  try {
    const response = await axios.get(`${patientApiUrl}?operation=get&id=${patientId}`);
    if (response.data && response.data.success && response.data.data) {
      const p = response.data.data;
      const content = `
        <p><strong>Name:</strong> ${p.full_name}</p>
        <p><strong>Email:</strong> ${p.email}</p>
        <p><strong>Sex:</strong> ${p.sex || ''}</p>
        <p><strong>Contact Number:</strong> ${p.contact_num || ''}</p>
        <p><strong>Birthdate:</strong> ${p.birthdate || ''}</p>
        <p><strong>Address:</strong> ${p.address || ''}</p>
      `;
      document.getElementById('viewPatientContent').innerHTML = content;
      viewPatientModal.show();
    } else {
      console.error('View patient failed:', response.data);
      Swal.fire('Error', response.data?.message || 'Failed to fetch patient details.', 'error');
    }
  } catch (err) {
    console.error('View patient error:', err);
    Swal.fire('Error', 'Something went wrong.', 'error');
  }
};

  // Edit patient modal show + populate fields (no editing full_name or email as per backend)
window.editPatient = async (patientId) => {
  try {
    const response = await axios.get(`${patientApiUrl}?operation=get&id=${patientId}`);
    if (response.data.success) {
      const p = response.data.data;
      document.getElementById('edit_patient_id').value = p.patient_id; // hidden input
      document.getElementById('edit_user_id').value = p.user_id;       // hidden input

      document.getElementById('edit_sex').value = p.sex || '';
      document.getElementById('edit_contact_num').value = p.contact_num || '';
      document.getElementById('edit_birthdate').value = p.birthdate || '';
      document.getElementById('edit_address').value = p.address || '';
      editPatientModal.show();
    } else {
      Swal.fire('Error', 'Failed to fetch patient details.', 'error');
    }
  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'Something went wrong.', 'error');
  }
};

  // Save changes from edit modal
 editPatientForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(editPatientForm);
  const jsonPayload = JSON.stringify({
    patient_id: formData.get('patient_id'), // hidden
    user_id: formData.get('user_id'),       // hidden
    sex: formData.get('sex'),
    contact_num: formData.get('contact_num'),
    birthdate: formData.get('birthdate'),
    address: formData.get('address'),
  });

  const payload = new FormData();
  payload.append('operation', 'update');
  payload.append('json', jsonPayload);

  try {
    const response = await axios.post(patientApiUrl, payload);
    if (response.data.success) {
      Swal.fire('Success', response.data.message, 'success');
      editPatientModal.hide();
      loadPatients();
    } else {
      Swal.fire('Error', response.data.message, 'error');
    }
  } catch (error) {
    console.error('Error updating patient', error);
    Swal.fire('Error', 'Something went wrong', 'error');
  }
});

  // Initial load
  loadPatients();
});
