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

      // Cache form and unit options for dropdowns (used in add/edit forms)
      let medicineForms = [];
      let medicineUnits = [];

      // Load forms and units for dropdowns
      async function loadFormsAndUnits() {
        try {
          const [formsResp, unitsResp] = await Promise.all([
            axios.get(`${medicineApiUrl}?operation=get_forms`),
            axios.get(`${medicineApiUrl}?operation=get_units`),
          ]);
          medicineForms = formsResp.data.forms || [];
          medicineUnits = unitsResp.data.units || [];
          populateSelectOptions('add_form_id', medicineForms, "form_name", "form_id", "Select Form");
          populateSelectOptions('add_unit_id', medicineUnits, "unit_name", "unit_id", "Select Unit");
          populateSelectOptions('edit_form_id', medicineForms, "form_name", "form_id", "Select Form");
          populateSelectOptions('edit_unit_id', medicineUnits, "unit_name", "unit_id", "Select Unit");
        } catch (error) {
          console.error("Failed to load forms or units", error);
        }
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
          const response = await axios.get(`${medicineApiUrl}?operation=get_all`);
          const medicines = response.data || [];
          medicineTableBody.innerHTML = "";

          medicines.forEach(med => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${med.name}</td>
              <td>${med.price}</td>
              <td>${med.quantity}</td>
              <td>${med.unit}</td>
              <td>${med.stock}</td>
              <td>${med.form}</td>
              <td>${med.created_at}</td>
              <td>${med.updated_at}</td>
              <td>
                <button type="button" class="btn btn-sm btn-info me-1" onclick="viewMedicine(${med.medicine_id})">View</button>
                <button type="button" class="btn btn-sm btn-warning me-1" onclick="editMedicine(${med.medicine_id})">Edit</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteMedicine(${med.medicine_id})">Delete</button>
              </td>
            `;
            medicineTableBody.appendChild(row);
          });
        } catch (error) {
          console.error("Failed to load medicines", error);
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
          name: formData.get("name"),
          price: parseFloat(formData.get("price")),
          quantity: parseInt(formData.get("quantity")),
          unit_id: formData.get("unit_id"),
          stock: parseInt(formData.get("stock")),
          form_id: formData.get("form_id"),
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
          const response = await axios.get(`${medicineApiUrl}?operation=get_all`);
          const med = response.data.find(m => m.medicine_id == medicineId);
          if (!med) {
            Swal.fire("Error", "Medicine not found", "error");
            return;
          }

          const content = `
            <p><strong>Name:</strong> ${med.name}</p>
            <p><strong>Price:</strong> ${med.price}</p>
            <p><strong>Quantity:</strong> ${med.quantity}</p>
            <p><strong>Unit:</strong> ${med.unit}</p>
            <p><strong>Stock:</strong> ${med.stock}</p>
            <p><strong>Form:</strong> ${med.form}</p>
            <p><strong>Created At:</strong> ${med.created_at}</p>
            <p><strong>Updated At:</strong> ${med.updated_at}</p>
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
          const response = await axios.get(`${medicineApiUrl}?operation=get_all`);
          const med = response.data.find(m => m.medicine_id == medicineId);
          if (!med) {
            Swal.fire("Error", "Medicine not found", "error");
            return;
          }

          document.getElementById("edit_medicine_id").value = med.medicine_id;
          document.getElementById("edit_name").value = med.name;
          document.getElementById("edit_price").value = med.price;
          document.getElementById("edit_quantity").value = med.quantity;
          document.getElementById("edit_stock").value = med.stock;

          // Select unit and form dropdowns by matching id
          const unitObj = medicineUnits.find(u => u.unit_name === med.unit);
          const formObj = medicineForms.find(f => f.form_name === med.form);

          document.getElementById("edit_unit_id").value = unitObj ? unitObj.unit_id : "";
          document.getElementById("edit_form_id").value = formObj ? formObj.form_id : "";

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
          name: formData.get("name"),
          price: parseFloat(formData.get("price")),
          quantity: parseInt(formData.get("quantity")),
          unit_id: formData.get("unit_id"),
          stock: parseInt(formData.get("stock")),
          form_id: formData.get("form_id"),
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
      loadFormsAndUnits().then(loadMedicines);
    });
