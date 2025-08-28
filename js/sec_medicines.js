  document.addEventListener("DOMContentLoaded", () => {
      const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
      const medicineApiUrl = `${baseApiUrl}/medicines.php`;

      const medicineTableBody = document.getElementById("medicineTableBody");
      const addMedicineForm = document.getElementById("addMedicineForm");
      const editMedicineForm = document.getElementById("editMedicineForm");

      // Search functionality elements
      const medicineSearchInput = document.getElementById("medicineSearchInput");
      const searchFilter = document.getElementById("searchFilter");
      const searchBtn = document.getElementById("searchBtn");
      const clearSearchBtn = document.getElementById("clearSearchBtn");

      // Bootstrap modal instances
      const viewMedicineModal = new bootstrap.Modal(document.getElementById('viewMedicineModal'));
      const editMedicineModal = new bootstrap.Modal(document.getElementById('editMedicineModal'));
      const addMedicineModal = new bootstrap.Modal(document.getElementById('addMedicineModal'));

             // Cache form and weight options for dropdowns (used in add/edit forms)
       let medicineForms = [];
       let medicineWeights = [];
       let genericMedicineNames = [];

             // Load forms, weights, and generic names for dropdowns
       async function loadFormsAndWeights() {
         try {
           console.log("Loading forms, weights, and generic names...");

           const [formsResp, weightsResp, genericsResp] = await Promise.all([
             axios.get(`${medicineApiUrl}?operation=getMedicineForms`),
             axios.get(`${medicineApiUrl}?operation=getMedicineWeights`),
             axios.get(`${medicineApiUrl}?operation=getGenericMedicineNames`),
           ]);

           console.log("Forms response:", formsResp.data);
           console.log("Weights response:", weightsResp.data);
           console.log("Generics response:", genericsResp.data);

           medicineForms = formsResp.data.forms || [];
           medicineWeights = weightsResp.data.weights || [];
           genericMedicineNames = genericsResp.data.generics || [];

           console.log("Medicine forms:", medicineForms);
           console.log("Medicine weights:", medicineWeights);
           console.log("Generic medicine names:", genericMedicineNames);

           // Populate form dropdowns
           populateSelectOptions('add_form_id', medicineForms, "form_name", "form_id", "Select Form");
           populateSelectOptions('edit_form_id', medicineForms, "form_name", "form_id", "Select Form");

           // Populate strength dropdowns (using weights table values for strength options)
           populateSelectOptions('add_weight', medicineWeights, "weight_value", "weight_value", "Select Strength");
           populateSelectOptions('edit_weight', medicineWeights, "weight_value", "weight_value", "Select Strength");

           // Populate generic name dropdowns
           populateSelectOptions('generic_id', genericMedicineNames, "generic_name", "generic_id", "Select Generic Name");
           populateSelectOptions('edit_generic_id', genericMedicineNames, "generic_name", "generic_id", "Select Generic Name");

           console.log("Dropdowns populated successfully");
         } catch (error) {
           console.error("Failed to load forms, weights, or generics", error);
           // Show error to user
           Swal.fire({
             icon: 'error',
             title: 'Error',
             text: 'Failed to load medicine forms, weights, and generic names. Please refresh the page.'
           });
         }
       }

      // Helper: format date for display
      function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      // Helper: populate a select element with options from array of objects
      // labelKey, valueKey specify which keys to use in objects for display and value
      // defaultText for the first option label
      function populateSelectOptions(selectId, options, labelKey, valueKey, defaultText) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = `<option value="">${defaultText}</option>`;
        options.forEach(opt => {
          select.insertAdjacentHTML("beforeend", `<option value="${opt[valueKey]}">${opt[labelKey]}</option>`);
        });
      }

            // Load medicines and populate table
      async function loadMedicines() {
        try {
          console.log("Loading medicines...");
          const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
          console.log("Medicines response:", response.data);

          allMedicines = response.data.medicines || [];
          console.log("Medicines array:", allMedicines);

          populateMedicineTable(allMedicines);
          console.log("Table populated successfully");
        } catch (error) {
          console.error("Failed to load medicines", error);
          console.error("Error details:", error.response?.data);
          medicineTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <p>Failed to load medicines: ${error.message}</p>
                <small>Check console for details</small>
              </td>
            </tr>
          `;
        }
      }

      // Function to populate medicine table
      function populateMedicineTable(medicines) {
        medicineTableBody.innerHTML = "";

        if (medicines.length === 0) {
          console.log("No medicines found, showing empty message");
          medicineTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center text-muted py-4">
                <i class="fas fa-pills fa-3x mb-3"></i>
                <p>No medicines found</p>
              </td>
            </tr>
          `;
          return;
        }

        console.log("Populating table with", medicines.length, "medicines");
        medicines.forEach((med, index) => {
          console.log(`Processing medicine ${index + 1}:`, med);
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${med.generic_name || 'N/A'}</td>
            <td>${med.strength || med.weight || med.weight_value || 'N/A'}</td>
            <td>${med.form_name || 'N/A'}</td>
            <td>₱${parseFloat(med.price).toFixed(2)}</td>
            <td>
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="viewMedicine(${med.medicine_id})">
                  <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-warning" onclick="editMedicine(${med.medicine_id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteMedicine(${med.medicine_id})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          `;
          medicineTableBody.appendChild(row);
        });
      }

      // Add medicine submit handler
      addMedicineForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addMedicineForm.checkValidity()) {
          e.stopPropagation();
          addMedicineForm.classList.add('was-validated');
          return;
        }
        addMedicineForm.classList.remove('was-validated');

        const formData = new FormData(addMedicineForm);

                 const jsonPayload = JSON.stringify({
           generic_id: formData.get("generic_id"),
           strength: formData.get("weight"),
           form_id: formData.get("form_id"),
           price: parseFloat(formData.get("price")),
           packaging: null,
         });

        const payload = new FormData();
        payload.append("operation", "add");
        payload.append("json", jsonPayload);

        try {
          const response = await axios.post(medicineApiUrl, payload);
          if (response.data.success) {
            Swal.fire("Success", response.data.message, "success");
            addMedicineForm.reset();
            addMedicineModal.hide();
            loadMedicines();
          } else {
            Swal.fire("Error", response.data.message, "error");
          }
        } catch (error) {
          console.error("Error adding medicine", error);
          Swal.fire("Error", "Something went wrong", "error");
        }
      });

      // Delete medicine
      window.deleteMedicine = async (medicineId) => {
        const confirm = await Swal.fire({
          icon: "warning",
          title: "Are you sure?",
          text: "This will permanently delete the medicine.",
          showCancelButton: true,
          confirmButtonText: "Yes, delete it!",
        });

        if (confirm.isConfirmed) {
          const payload = new FormData();
          payload.append("operation", "delete");
          payload.append("medicine_id", medicineId);

          try {
            const response = await axios.post(medicineApiUrl, payload);
            if (response.data.success) {
              Swal.fire("Deleted", response.data.message, "success");
              loadMedicines();
            } else {
              Swal.fire("Error", response.data.message, "error");
            }
          } catch (error) {
            console.error("Delete error", error);
            Swal.fire("Error", "Could not delete medicine.", "error");
          }
        }
      };

      // View medicine modal
      window.viewMedicine = async (medicineId) => {
        try {
          // No backend get by id; fetch all and find locally
          const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
          const med = response.data.medicines.find(m => m.medicine_id == medicineId);
          if (!med) {
            Swal.fire("Error", "Medicine not found", "error");
            return;
          }
                     const content = `
             <p><strong>Generic Name:</strong> ${med.generic_name || 'N/A'}</p>
             <p><strong>Strength:</strong> ${med.strength || med.weight || med.weight_value || 'N/A'}</p>
             <p><strong>Form:</strong> ${med.form_name || 'N/A'}</p>
             <p><strong>Price:</strong> ₱${parseFloat(med.price).toFixed(2)}</p>
             <p><strong>Created At:</strong> ${formatDate(med.created_at)}</p>
             <p><strong>Updated At:</strong> ${formatDate(med.updated_at)}</p>
           `;

          document.getElementById("viewMedicineContent").innerHTML = content;
          viewMedicineModal.show();
        } catch (err) {
          console.error("View medicine error:", err);
          Swal.fire("Error", "Something went wrong.", "error");
        }
      };

      // Edit medicine modal show + populate fields
      window.editMedicine = async (medicineId) => {
        try {
          console.log("Loading medicine details for ID:", medicineId);
          const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
          const med = response.data.medicines.find(m => m.medicine_id == medicineId);
          if (!med) {
            Swal.fire("Error", "Medicine not found", "error");
            return;
          }

          console.log("Medicine data found:", med);

                     document.getElementById("edit_medicine_id").value = med.medicine_id;
           document.getElementById("edit_price").value = med.price;

                     // Set generic name dropdown by matching generic_id
           const genericSelect = document.getElementById("edit_generic_id");
           if (genericSelect) {
             // Find the generic by generic_id
             const generic = genericMedicineNames.find(g => g.generic_id == med.generic_id);
             if (generic) {
               genericSelect.value = generic.generic_id;
             } else {
               genericSelect.selectedIndex = 0; // Set to "Select Generic Name"
             }
           }

           // Set form dropdown by matching form_id
           const formSelect = document.getElementById("edit_form_id");
           if (formSelect) {
             // Find the form by form_id
             const form = medicineForms.find(f => f.form_id == med.form_id);
             if (form) {
               formSelect.value = form.form_id;
             } else {
               formSelect.selectedIndex = 0; // Set to "Select Form"
             }
           }

          // Set strength dropdown by matching value
          const weightSelect = document.getElementById("edit_weight");
          if (weightSelect) {
            console.log("Medicine strength data:", med.strength);
            console.log("Weight dropdown options:", Array.from(weightSelect.options).map(opt => ({text: opt.text, value: opt.value})));

            // Try to match by strength text
            if (med.strength) {
              weightSelect.value = med.strength;
              console.log("Strength matched with value:", med.strength);
            } else {
              console.log("No strength found, setting to empty");
              weightSelect.selectedIndex = 0; // Set to "Select Strength"
            }
          }



          editMedicineModal.show();
        } catch (err) {
          console.error("Edit medicine error:", err);
          Swal.fire("Error", "Something went wrong.", "error");
        }
      };

      // Save changes from edit modal
      editMedicineForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editMedicineForm.checkValidity()) {
          e.stopPropagation();
          editMedicineForm.classList.add('was-validated');
          return;
        }
        editMedicineForm.classList.remove('was-validated');

        const formData = new FormData(editMedicineForm);

                 const jsonPayload = JSON.stringify({
           medicine_id: formData.get("medicine_id"),
           generic_id: formData.get("generic_id"),
           strength: formData.get("weight"),
           form_id: formData.get("form_id"),
           price: parseFloat(formData.get("price")),
         });

                 console.log("Edit form data:", {
           medicine_id: formData.get("medicine_id"),
           generic_id: formData.get("generic_id"),
           strength: formData.get("weight"),
           form_id: formData.get("form_id"),
           price: formData.get("price"),
         });

        const payload = new FormData();
        payload.append("operation", "update");
        payload.append("json", jsonPayload);

        try {
          console.log("Sending update request with payload:", payload);
          const response = await axios.post(medicineApiUrl, payload);
          console.log("Update response:", response.data);

          if (response.data.success) {
            Swal.fire("Success", response.data.message, "success");
            editMedicineModal.hide();
            loadMedicines();
          } else {
            const msg = response.data.message || "Unable to update medicine. Make sure name+form+weight is unique.";
            Swal.fire("Error", msg, "error");
          }
        } catch (error) {
          console.error("Error updating medicine", error);
          console.error("Error response:", error.response?.data);
          const msg = error.response?.data?.message || error.message || "Request failed";
          Swal.fire("Error", msg, "error");
        }
      });

      // Search functionality
      let allMedicines = []; // Store all medicines for search filtering

      // Function to filter medicines based on search criteria
      function filterMedicines(searchTerm, filterType) {
        if (!searchTerm.trim()) {
          return allMedicines;
        }

        const term = searchTerm.toLowerCase().trim();

        return allMedicines.filter(medicine => {
          switch (filterType) {
            case 'generic_name':
              return medicine.generic_name.toLowerCase().includes(term);
            case 'strength':
              return medicine.strength.toLowerCase().includes(term);
            case 'form':
              return medicine.form_name.toLowerCase().includes(term);
            case 'all':
            default:
              return (
                medicine.generic_name.toLowerCase().includes(term) ||
                medicine.strength.toLowerCase().includes(term) ||
                medicine.form_name.toLowerCase().includes(term)
              );
          }
        });
      }

      // Function to perform search
      function performSearch() {
        const searchTerm = medicineSearchInput.value;
        const filterType = searchFilter.value;

        const filteredMedicines = filterMedicines(searchTerm, filterType);
        populateMedicineTable(filteredMedicines);
      }

      // Function to clear search
      function clearSearch() {
        medicineSearchInput.value = '';
        searchFilter.value = 'all';
        populateMedicineTable(allMedicines);
      }

      // Search event listeners
      searchBtn?.addEventListener('click', performSearch);
      clearSearchBtn?.addEventListener('click', clearSearch);

      // Real-time search on input (optional - can be removed if you prefer button-only search)
      medicineSearchInput?.addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
          clearSearch();
        }
      });

      // Search on Enter key
      medicineSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          performSearch();
        }
      });

      // Initial load
      loadFormsAndWeights().then(loadMedicines);
    });
