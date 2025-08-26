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

          // Populate strength dropdowns (using weights table values for strength options)
          populateSelectOptions('add_weight', medicineWeights, "weight_value", "weight_value", "Select Strength");
          populateSelectOptions('edit_weight', medicineWeights, "weight_value", "weight_value", "Select Strength");

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
          console.log("Loading medicines...");
          const response = await axios.get(`${medicineApiUrl}?operation=getAll`);
          console.log("Medicines response:", response.data);

          const medicines = response.data.medicines || [];
          console.log("Medicines array:", medicines);

          medicineTableBody.innerHTML = "";

          if (medicines.length === 0) {
            console.log("No medicines found, showing empty message");
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

          console.log("Populating table with", medicines.length, "medicines");
          medicines.forEach((med, index) => {
            console.log(`Processing medicine ${index + 1}:`, med);
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${med.medicine_name}</td>
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
          console.log("Table populated successfully");
        } catch (error) {
          console.error("Failed to load medicines", error);
          console.error("Error details:", error.response?.data);
          medicineTableBody.innerHTML = `
            <tr>
              <td colspan="7" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <p>Failed to load medicines: ${error.message}</p>
                <small>Check console for details</small>
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
          strength: formData.get("weight"),
          form_id: formData.get("form_id"),
          price: parseFloat(formData.get("price")),
          packaging: (() => {
            const unit = (formData.get("pkg_unit") || "").toString();
            const qppStr = (formData.get("pkg_qpp") || "").toString();
            const label = (formData.get("pkg_label") || "").toString();
            const qpp = qppStr ? parseInt(qppStr, 10) : null;
            if (!unit || !qpp) return null;
            return { packaging_unit: unit, quantity_per_package: qpp, unit_label: label || null };
          })(),
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
          // Load packaging configs
          const pkgResp = await axios.get(`${medicineApiUrl}?operation=getPackagingConfigs&medicine_id=${medicineId}`);
          const configs = pkgResp.data.configs || [];

          const pkgHtml = configs.length
            ? `<ul class="mb-0">${configs.map(c => `<li>${c.packaging_unit}: ${c.quantity_per_package}${c.unit_label ? ' ' + c.unit_label : ''}</li>`).join('')}</ul>`
            : '<em class="text-muted">No packaging configured</em>';

          const content = `
            <p><strong>Name:</strong> ${med.medicine_name}</p>
            <p><strong>Strength:</strong> ${med.strength || med.weight || med.weight_value || 'N/A'}</p>
            <p><strong>Form:</strong> ${med.form_name || 'N/A'}</p>
            <p><strong>Price:</strong> ₱${parseFloat(med.price).toFixed(2)}</p>
            <hr/>
            <p class="mb-1"><strong>Packaging:</strong></p>
            ${pkgHtml}
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
          document.getElementById("edit_name").value = med.medicine_name;
          document.getElementById("edit_price").value = med.price;

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

          // Load packaging configs
          const pkgResp = await axios.get(`${medicineApiUrl}?operation=getPackagingConfigs&medicine_id=${medicineId}`);
          const configs = pkgResp.data.configs || [];

          // Inject packaging config editor UI
          const modalBody = document.querySelector('#editMedicineModal .modal-body');
          const existing = document.getElementById('pkgConfigEditor');
          if (existing) existing.remove();
          const editor = document.createElement('div');
          editor.id = 'pkgConfigEditor';
          editor.innerHTML = `
            <hr/>
            <div class="mb-2 d-flex align-items-center justify-content-between">
              <h6 class="mb-0">Packaging Configuration</h6>
              <button type="button" class="btn btn-sm btn-outline-primary" id="addPkgRowBtn">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th style="width: 25%">Unit</th>
                    <th style="width: 25%">Qty per package</th>
                    <th style="width: 25%">Unit label</th>
                    <th style="width: 25%">Actions</th>
                  </tr>
                </thead>
                <tbody id="pkgRows"></tbody>
              </table>
            </div>
          `;
          modalBody.appendChild(editor);

          const pkgRows = editor.querySelector('#pkgRows');
          const renderRow = (c) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>
                <select class="form-select form-select-sm pkg-unit">
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="blister pack">Blister Pack</option>
                  <option value="strip">Strip</option>
                  <option value="box">Box</option>
                  <option value="bottle">Bottle</option>
                  <option value="tube">Tube</option>
                  <option value="vial">Vial</option>
                  <option value="sachet">Sachet</option>
                </select>
              </td>
              <td><input type="number" class="form-control form-control-sm pkg-qpp" min="1" value="${c?.quantity_per_package || ''}" placeholder="e.g., 10"/></td>
              <td><input type="text" class="form-control form-control-sm pkg-label" value="${c?.unit_label || ''}" placeholder="e.g., tablets, mL, g"/></td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-success save-pkg">Save</button>
                  ${c?.config_id ? `<button type="button" class="btn btn-outline-danger delete-pkg">Delete</button>` : ''}
                </div>
              </td>
            `;
            if (c?.packaging_unit) tr.querySelector('.pkg-unit').value = c.packaging_unit;
            tr.querySelector('.save-pkg').addEventListener('click', async () => {
              const payload = new FormData();
              payload.append('operation', 'upsertPackagingConfig');
              payload.append('json', JSON.stringify({
                medicine_id: medicineId,
                packaging_unit: tr.querySelector('.pkg-unit').value,
                quantity_per_package: parseInt(tr.querySelector('.pkg-qpp').value || '0', 10),
                unit_label: tr.querySelector('.pkg-label').value || null,
              }));
              try {
                const resp = await axios.post(medicineApiUrl, payload);
                if (resp.data.success) {
                  Swal.fire('Saved', 'Packaging saved', 'success');
                } else {
                  Swal.fire('Error', resp.data.message || 'Failed to save', 'error');
                }
              } catch (e) {
                Swal.fire('Error', 'Failed to save', 'error');
              }
            });
            const delBtn = tr.querySelector('.delete-pkg');
            if (delBtn) delBtn.addEventListener('click', async () => {
              const confirm = await Swal.fire({ icon: 'warning', title: 'Delete?', showCancelButton: true });
              if (!confirm.isConfirmed) return;
              const fd = new FormData();
              fd.append('operation', 'deletePackagingConfig');
              fd.append('medicine_id', c.config_id); // reuse param slot
              try {
                const resp = await axios.post(medicineApiUrl, fd);
                if (resp.data.success) {
                  tr.remove();
                  Swal.fire('Deleted', 'Packaging removed', 'success');
                } else {
                  Swal.fire('Error', resp.data.message || 'Failed to delete', 'error');
                }
              } catch (e) {
                Swal.fire('Error', 'Failed to delete', 'error');
              }
            });
            pkgRows.appendChild(tr);
          };

          configs.forEach(c => renderRow(c));
          editor.querySelector('#addPkgRowBtn').addEventListener('click', () => renderRow({}));

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
          strength: formData.get("weight"),
          form_id: formData.get("form_id"),
          price: parseFloat(formData.get("price")),
        });

        console.log("Edit form data:", {
          medicine_id: formData.get("medicine_id"),
          medicine_name: formData.get("medicine_name"),
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

      // Initial load
      loadFormsAndWeights().then(loadMedicines);
    });
