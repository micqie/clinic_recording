document.addEventListener("DOMContentLoaded", async () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const prescriptionApiUrl = `${baseApiUrl}/prescriptions.php`;
  const patientApiUrl = `${baseApiUrl}/patients.php`;
  const medicineApiUrl = `${baseApiUrl}/medicines.php`;
  const userApiUrl = `${baseApiUrl}/user.php`;

  // Check if user is logged in and is a doctor
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.id || user.role !== "doctor") {
    window.location.href = "../../index.html";
    return;
  }

  let doctorId = null;
  try {
    const prof = await axios.get(`${userApiUrl}?operation=profile&user_id=${user.id}`);
    doctorId = prof.data?.context?.doctor_id || null;
  } catch (e) { console.error(e); }

  const prescriptionsTableBody = document.getElementById("prescriptionsTableBody");
  const addPrescriptionForm = document.getElementById("addPrescriptionForm");
  const editPrescriptionForm = document.getElementById("editPrescriptionForm");
  const addPrescriptionModal = new bootstrap.Modal(document.getElementById("addPrescriptionModal"));
  const editPrescriptionModal = new bootstrap.Modal(document.getElementById("editPrescriptionModal"));

  async function loadPrescriptions() {
    try {
      const response = await axios.get(`${prescriptionApiUrl}?operation=getByDoctor&doctor_id=${doctorId || ''}`);
      if (response.data.success) {
        displayPrescriptions(response.data.prescriptions || response.data.data);
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
      const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
      if (response.data.success) {
        const medicines = response.data.medicines || response.data.data || [];

        // Store medicines globally for search functionality
        window.availableMedicines = medicines;

        // Setup search functionality for add form
        const addSearchInput = document.getElementById('medicineSearchInput');
        const addMedicineSelect = document.getElementById('medicineSelect');

        if (addSearchInput && addMedicineSelect) {
          addSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterMedicineOptions(addMedicineSelect, medicines, searchTerm);
          });

          // Add change event to show medicine details
          addMedicineSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value && selectedOption.dataset.medicine) {
              const medicine = JSON.parse(selectedOption.dataset.medicine);
              showMedicineDetails(medicine, 'add');
            } else {
              hideMedicineDetails('add');
            }
          });
        }

        // Setup search functionality for edit form
        const editSearchInput = document.getElementById('editMedicineSearchInput');
        const editMedicineSelect = document.getElementById('edit_medicine_id');

        if (editSearchInput && editMedicineSelect) {
          editSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterMedicineOptions(editMedicineSelect, medicines, searchTerm);
          });

          // Add change event to show medicine details
          editMedicineSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value && selectedOption.dataset.medicine) {
              const medicine = JSON.parse(selectedOption.dataset.medicine);
              showMedicineDetails(medicine, 'edit');
            } else {
              hideMedicineDetails('edit');
            }
          });
        }

        // Populate initial options
        populateMedicineOptions(addMedicineSelect, medicines);
        populateMedicineOptions(editMedicineSelect, medicines);
      }
    } catch (error) {
      console.error("Error loading medicines:", error);
    }
  }

  // Function to populate medicine options
  function populateMedicineOptions(selectElement, medicines) {
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">Search and select medicine...</option>';
    medicines.forEach(medicine => {
      const text = `${medicine.generic_name} - ${medicine.strength} ${medicine.form_name}`;
      selectElement.innerHTML += `<option value="${medicine.medicine_id}" data-medicine='${JSON.stringify(medicine)}'>${text}</option>`;
    });
  }

  // Function to filter medicine options based on search term
  function filterMedicineOptions(selectElement, medicines, searchTerm) {
    if (!selectElement) return;

    const filteredMedicines = medicines.filter(medicine =>
      medicine.generic_name.toLowerCase().includes(searchTerm) ||
      medicine.strength.toLowerCase().includes(searchTerm) ||
      medicine.form_name.toLowerCase().includes(searchTerm)
    );

    populateMedicineOptions(selectElement, filteredMedicines);
  }

  // Function to show medicine details
  function showMedicineDetails(medicine, mode = 'add') {
    const prefix = mode === 'edit' ? 'edit' : '';
    const detailsDiv = document.getElementById(prefix ? 'editMedicineDetails' : 'medicineDetails');
    const genericNameSpan = document.getElementById(prefix ? 'editSelectedGenericName' : 'selectedGenericName');
    const strengthSpan = document.getElementById(prefix ? 'editSelectedStrength' : 'selectedStrength');
    const formSpan = document.getElementById(prefix ? 'editSelectedForm' : 'selectedForm');
    const priceSpan = document.getElementById(prefix ? 'editSelectedPrice' : 'selectedPrice');

    if (detailsDiv && genericNameSpan && strengthSpan && formSpan && priceSpan) {
      genericNameSpan.textContent = medicine.generic_name || '-';
      strengthSpan.textContent = medicine.strength || '-';
      formSpan.textContent = medicine.form_name || '-';
      priceSpan.textContent = `₱${parseFloat(medicine.price || 0).toFixed(2)}`;

      detailsDiv.style.display = 'block';

      // Update total cost calculation
      updateTotalCost(mode);
    }
  }

  // Function to hide medicine details
  function hideMedicineDetails(mode = 'add') {
    const prefix = mode === 'edit' ? 'edit' : '';
    const detailsDiv = document.getElementById(prefix ? 'editMedicineDetails' : 'medicineDetails');
    if (detailsDiv) {
      detailsDiv.style.display = 'none';
    }
  }

  // Function to update total cost
  function updateTotalCost(mode = 'add') {
    const prefix = mode === 'edit' ? 'edit' : '';
    const quantityInput = document.getElementById(prefix ? 'edit_quantity' : 'quantityInput');
    const totalCostDisplay = document.getElementById(prefix ? 'editTotalCostDisplay' : 'totalCostDisplay');
    const medicineSelect = document.getElementById(prefix ? 'edit_medicine_id' : 'medicineSelect');

    if (quantityInput && totalCostDisplay && medicineSelect) {
      const quantity = parseInt(quantityInput.value) || 1;
      const selectedOption = medicineSelect.options[medicineSelect.selectedIndex];

      if (selectedOption.value && selectedOption.dataset.medicine) {
        const medicine = JSON.parse(selectedOption.dataset.medicine);
        const unitPrice = parseFloat(medicine.price || 0);
        const totalCost = quantity * unitPrice;
        totalCostDisplay.value = `₱${totalCost.toFixed(2)}`;
      } else {
        totalCostDisplay.value = '₱0.00';
      }
    }
  }

  // Add event listeners for quantity changes
  function setupQuantityListeners() {
    const quantityInputs = document.querySelectorAll('#quantityInput, #edit_quantity');
    quantityInputs.forEach(input => {
      input.addEventListener('input', function() {
        const mode = this.id === 'edit_quantity' ? 'edit' : 'add';
        updateTotalCost(mode);
      });
    });
  }

  async function loadDosages() {
    try {
      const response = await axios.get(`${medicineApiUrl}?operation=getMedicineWeights`);
      const weights = response.data?.weights || [];
      const dosageSelects = document.querySelectorAll('select[name="dosage"]');
      dosageSelects.forEach(select => {
        const current = select.getAttribute('data-current') || '';
        select.innerHTML = '<option value="">Select dosage</option>';
        weights.forEach(w => {
          const value = w.weight_value;
          const selected = String(value) === String(current) ? ' selected' : '';
          select.insertAdjacentHTML('beforeend', `<option value="${value}"${selected}>${value}</option>`);
        });
      });
    } catch (error) {
      console.error('Error loading dosages:', error);
    }
  }

  function displayPrescriptions(prescriptions) {
    prescriptionsTableBody.innerHTML = "";

    prescriptions.forEach(prescription => {
      const row = document.createElement("tr");
             // Calculate cost on-the-fly for display
       const unitPrice = parseFloat(prescription.price || 0);
       const quantity = parseInt(prescription.quantity || 1);
       let totalCost = unitPrice * quantity;

       // Apply packaging unit multiplier if needed
       const packagingUnit = prescription.packaging_unit || 'tablet';
       switch (packagingUnit) {
           case 'box':
               totalCost = totalCost * 1.2; // 20% markup
               break;
           case 'bottle':
               totalCost = totalCost * 1.15; // 15% markup
               break;
           case 'blister pack':
               totalCost = totalCost * 1.1; // 10% markup
               break;
       }

                const packagingDisplay = prescription.packaging_name || prescription.packaging_unit || 'units';
         row.innerHTML = `
           <td>${prescription.prescription_id}</td>
           <td>${prescription.patient_name}</td>
           <td>${prescription.generic_name}</td>
           <td>${prescription.quantity} ${packagingDisplay}</td>
           <td>${prescription.frequency}</td>
           <td>${prescription.duration}</td>
           <td><span class="badge bg-${getStatusBadgeColor(prescription.status)}">${prescription.status}</span></td>
           <td>₱${totalCost.toFixed(2)}</td>
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
      quantity: formData.get("quantity"),
      packaging_unit: formData.get("packaging_unit"),
      frequency: formData.get("frequency"),
      duration: formData.get("duration"),
      instructions: formData.get("instructions"),
      doctor_id: doctorId
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
      const response = await axios.get(`${prescriptionApiUrl}?operation=getById&prescription_id=${prescriptionId}`);
      if (response.data.success) {
        const prescription = response.data.prescription || response.data.data;

        document.getElementById("edit_prescription_id").value = prescription.prescription_id;
        document.getElementById("edit_patient_id").value = prescription.patient_id;
        document.getElementById("edit_medicine_id").value = prescription.medicine_id;
        document.getElementById("edit_quantity").value = prescription.quantity || 1;
        document.getElementById("edit_packaging_unit").value = prescription.packaging_unit || 'tablet';
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
      quantity: formData.get("quantity"),
      packaging_unit: formData.get("packaging_unit"),
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
  await loadPrescriptions();
  await loadPatients();
  await loadMedicines();
  setupQuantityListeners();
});
