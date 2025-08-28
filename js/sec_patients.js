document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const patientApiUrl = `${baseApiUrl}/patients.php`;

  const patientTableBody = document.getElementById("patientTableBody");
  const addPatientForm = document.getElementById("addPatientForm");
  const editPatientForm = document.getElementById("editPatientForm");
  const addBirthdateInput = document.getElementById("add_birthdate");
  const addAgeInput = document.getElementById("add_age");
  const editBirthdateInput = document.getElementById("edit_birthdate");
  const editAgeInput = document.getElementById("edit_age");

  // Bootstrap modal instances
  const viewPatientModal = new bootstrap.Modal(document.getElementById('viewPatientModal'));
  const editPatientModal = new bootstrap.Modal(document.getElementById('editPatientModal'));
  const addPatientModal = new bootstrap.Modal(document.getElementById('addPatientModal'));
  // No auto age calculation; age will be entered manually

  // Load patients list and populate table
  async function loadPatients() {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get_all`);
      if (response.data.success) {
        patientTableBody.innerHTML = "";

        response.data.data.forEach((patient) => {
          const isActive = patient.is_active === undefined ? true : (Number(patient.is_active) === 1);
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
  <td class="text-nowrap">
    <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span>
    <button class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'} action-btn ms-2" onclick="togglePatient(${patient.patient_id}, ${isActive ? 1 : 0})" title="${isActive ? 'Deactivate' : 'Activate'}" aria-label="${isActive ? 'Deactivate' : 'Activate'}">
      <i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
    </button>
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

  // Add new patient
  addPatientForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Enforce HTML5 validation for fields (e.g., email) since form uses novalidate
    if (!addPatientForm.checkValidity()) {
      addPatientForm.classList.add("was-validated");
      return;
    }
    const formData = new FormData(addPatientForm);

    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (password !== confirmPassword) {
      Swal.fire("Error", "Passwords do not match.", "error");
      return;
    }

    const jsonPayload = JSON.stringify({
      full_name: formData.get("full_name"),
      email: String(formData.get("email") || '').trim(),
      sex: formData.get("sex"),
      contact_num: formData.get("contact_num"),
      birthdate: formData.get("birthdate"),
      age: formData.get("age"),
      address: formData.get("address"),
      password: password
    });

    const payload = new FormData();
    payload.append("operation", "add");
    payload.append("json", jsonPayload);

    try {
      const response = await axios.post(patientApiUrl, payload);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        addPatientForm.classList.remove("was-validated");
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

  // Toggle patient active
  window.togglePatient = async (patientId, currentlyActive) => {
    const action = currentlyActive ? 'Deactivate' : 'Activate';
    const confirm = await Swal.fire({
      title: `${action} account?`,
      text: `This will ${action.toLowerCase()} the patient's account.`,
      icon: currentlyActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: action,
      cancelButtonText: 'Cancel'
    });
    if (!confirm.isConfirmed) return;
    const payload = new FormData();
    payload.append("operation", "toggle_active");
    payload.append("json", JSON.stringify({ patient_id: patientId }));
    try {
      const response = await axios.post(patientApiUrl, payload);
      if (response.data.success) {
        await Swal.fire({ icon: 'success', title: `Account ${currentlyActive ? 'deactivated' : 'activated'}` });
        loadPatients();
      } else {
        Swal.fire("Error", response.data.message, "error");
      }
    } catch (error) {
      console.error("Toggle active error", error);
      Swal.fire("Error", "Could not update status.", "error");
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

  // Edit patient modal show + populate fields
  window.editPatient = async (patientId) => {
    try {
      const response = await axios.get(`${patientApiUrl}?operation=get&id=${patientId}`);
      if (response.data.success) {
        const p = response.data.data;
        document.getElementById('edit_patient_id').value = p.patient_id;
        document.getElementById('edit_user_id').value = p.user_id;

        document.getElementById('edit_full_name').value = p.full_name || '';
        document.getElementById('edit_email').value = p.email || '';
        document.getElementById('edit_sex').value = p.sex || '';
        document.getElementById('edit_contact_num').value = p.contact_num || '';
        document.getElementById('edit_birthdate').value = p.birthdate || '';
        if (editAgeInput) editAgeInput.value = (p.age ?? '')
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

  // Submit edited patient
  editPatientForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Enforce HTML5 validation for fields (e.g., email) since form uses novalidate
    if (!editPatientForm.checkValidity()) {
      editPatientForm.classList.add('was-validated');
      return;
    }

    const formData = new FormData(editPatientForm);
    const jsonPayload = JSON.stringify({
      patient_id: formData.get('patient_id'),
      user_id: formData.get('user_id'),
      full_name: formData.get('full_name'),
      email: String(formData.get('email') || '').trim(),
      sex: formData.get('sex'),
      contact_num: formData.get('contact_num'),
      birthdate: formData.get('birthdate'),
      age: formData.get('age'),
      address: formData.get('address'),
    });

    const payload = new FormData();
    payload.append('operation', 'update');
    payload.append('json', jsonPayload);

    try {
      const response = await axios.post(patientApiUrl, payload);
      if (response.data.success) {
        Swal.fire('Success', response.data.message, 'success');
        editPatientForm.classList.remove('was-validated');
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
