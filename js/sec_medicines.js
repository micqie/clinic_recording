  document.addEventListener("DOMContentLoaded", () => {
      const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
      const medicineApiUrl = `${baseApiUrl}/medicines.php`;

      const medicineTableBody = document.getElementById("medicineTableBody");
      const addMedicineForm = document.getElementById("addMedicineForm");
      const editMedicineForm = document.getElementById("editMedicineForm");

      // Bootstrap modal instances
      const viewMedicineModal = new bootstrap.Modal(document.getElementById('viewMedicineModal'));
      const editMedicineModal = new bootstrap.Modal(document.getElementById('editMedicineModal'));
      const addMedicineModal = new bootstrap.Modal(document.getElementById('addMedicineModal'));

      // Cache form and weight options for dropdowns (used in add/edit forms)
      let medicineForms = [];
      let medicineWeights = [];

      // Load forms and weights for dropdowns
      async function loadFormsAndWeights() {
        try {
          console.log("Loading forms and weights...");

          const [formsResp, weightsResp] = await Promise.all([
            axios.get(`${medicineApiUrl}?operation=getMedicineForms`),
            axios.get(`${medicineApiUrl}?operation=getMedicineWeights`),
          ]);

          console.log("Forms response:", formsResp.data);
          console.log("Weights response:", weightsResp.data);

          medicineForms = formsResp.data.forms || [];
          medicineWeights = weightsResp.data.weights || [];

          console.log("Medicine forms:", medicineForms);
          console.log("Medicine weights:", medicineWeights);

          // Populate form dropdowns
          populateSelectOptions('add_form_id', medicineForms, "form_name", "form_id", "Select Form");
          populateSelectOptions('edit_form_id', medicineForms, "form_name", "form_id", "Select Form");

          // Populate weight dropdowns
          populateSelectOptions('add_weight', medicineWeights, "weight_value", "weight_id", "Select Weight");
          populateSelectOptions('edit_weight', medicineWeights, "weight_value", "weight_id", "Select Weight");

          console.log("Dropdowns populated successfully");
        } catch (error) {
          console.error("Failed to load forms or weights", error);
          // Show error to user
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load medicine forms and weights. Please refresh the page.'
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
          const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
          const medicines = response.data.medicines || [];
          medicineTableBody.innerHTML = "";

          if (medicines.length === 0) {
            medicineTableBody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center text-muted py-4">
                  <i class="fas fa-pills fa-3x mb-3"></i>
                  <p>No medicines found</p>
                </td>
              </tr>
            `;
            return;
          }

          medicines.forEach(med => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${med.medicine_name}</td>
              <td>${med.weight || med.weight_value || 'N/A'}</td>
              <td>${med.form_name || 'N/A'}</td>
              <td>₱${parseFloat(med.price).toFixed(2)}</td>
              <td>${formatDate(med.created_at)}</td>
              <td>${formatDate(med.updated_at)}</td>
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
        } catch (error) {
          console.error("Failed to load medicines", error);
          medicineTableBody.innerHTML = `
            <tr>
              <td colspan="7" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <p>Failed to load medicines</p>
              </td>
            </tr>
          `;
        }
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
          medicine_name: formData.get("medicine_name"),
          weight: formData.get("weight"),
          form_id: formData.get("form_id"),
          price: parseFloat(formData.get("price")),
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
            <p><strong>Name:</strong> ${med.medicine_name}</p>
            <p><strong>Weight:</strong> ${med.weight || med.weight_value || 'N/A'}</p>
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
          const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
          const med = response.data.medicines.find(m => m.medicine_id == medicineId);
          if (!med) {
            Swal.fire("Error", "Medicine not found", "error");
            return;
          }

          document.getElementById("edit_medicine_id").value = med.medicine_id;
          document.getElementById("edit_name").value = med.medicine_name;
          document.getElementById("edit_price").value = med.price;

          // Set form dropdown by matching form_name
          const formSelect = document.getElementById("edit_form_id");
          if (formSelect) {
            for (let i = 0; i < formSelect.options.length; i++) {
              if (formSelect.options[i].text === med.form_name) {
                formSelect.selectedIndex = i;
                break;
              }
            }
          }

          // Set weight dropdown by matching weight_value
          const weightSelect = document.getElementById("edit_weight");
          if (weightSelect) {
            for (let i = 0; i < weightSelect.options.length; i++) {
              if (weightSelect.options[i].text === med.weight || weightSelect.options[i].text === med.weight_value) {
                weightSelect.selectedIndex = i;
                break;
              }
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
          medicine_name: formData.get("medicine_name"),
          weight: formData.get("weight"),
          form_id: formData.get("form_id"),
          price: parseFloat(formData.get("price")),
        });

        const payload = new FormData();
        payload.append("operation", "update");
        payload.append("json", jsonPayload);

        try {
          const response = await axios.post(medicineApiUrl, payload);
          if (response.data.success) {
            Swal.fire("Success", response.data.message, "success");
            editMedicineModal.hide();
            loadMedicines();
          } else {
            Swal.fire("Error", response.data.message, "error");
          }
        } catch (error) {
          console.error("Error updating medicine", error);
          Swal.fire("Error", "Something went wrong", "error");
        }
      });

      // Initial load
      loadFormsAndWeights().then(loadMedicines);
    });
