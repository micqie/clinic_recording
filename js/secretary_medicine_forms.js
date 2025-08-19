document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    const medicineApiUrl = `${baseApiUrl}/medicines.php`;

    const formsTableBody = document.getElementById("formsTableBody");
    const addFormModalForm = document.getElementById("addFormModalForm");

    // Bootstrap modal instances
    const addFormModal = new bootstrap.Modal(document.getElementById('addFormModal'));

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

    // Load medicine forms and populate table
    async function loadMedicineForms() {
        try {
            const response = await axios.get(`${medicineApiUrl}?operation=getMedicineForms`);
            const forms = response.data.forms || [];
            formsTableBody.innerHTML = "";

            if (forms.length === 0) {
                formsTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted py-4">
                            <i class="fas fa-tablets fa-3x mb-3"></i>
                            <p>No medicine forms found</p>
                        </td>
                    </tr>
                `;
                return;
            }

            forms.forEach(form => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${form.form_id}</td>
                    <td>${form.form_name}</td>
                    <td>${formatDate(form.created_at)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteForm(${form.form_id}, '${form.form_name}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                formsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Failed to load medicine forms", error);
            formsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load medicine forms</p>
                    </td>
                </tr>
            `;
        }
    }

    // Add medicine form submit handler
    addFormModalForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addFormModalForm.checkValidity()) {
            e.stopPropagation();
            addFormModalForm.classList.add('was-validated');
            return;
        }
        addFormModalForm.classList.remove('was-validated');

        const formData = new FormData(addFormModalForm);

        const jsonPayload = JSON.stringify({
            form_name: formData.get("form_name").trim()
        });

        const payload = new FormData();
        payload.append("operation", "addMedicineForm");
        payload.append("json", jsonPayload);

        try {
            const response = await axios.post(medicineApiUrl, payload);
            if (response.data.success) {
                Swal.fire("Success", response.data.message, "success");
                addFormModalForm.reset();
                addFormModal.hide();
                loadMedicineForms();
            } else {
                Swal.fire("Error", response.data.message, "error");
            }
        } catch (error) {
            console.error("Error adding medicine form", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    // Delete medicine form
    window.deleteForm = async (formId, formName) => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "Are you sure?",
            text: `This will permanently delete the medicine form "${formName}". This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel"
        });

        if (confirm.isConfirmed) {
            try {
                const payload = new FormData();
                payload.append("operation", "deleteMedicineForm");
                payload.append("form_id", formId);
                const response = await axios.post(medicineApiUrl, payload);
                if (response.data.success) {
                    Swal.fire("Deleted", response.data.message, "success");
                    loadMedicineForms();
                } else {
                    Swal.fire("Error", response.data.message, "error");
                }
            } catch (error) {
                console.error("Delete error", error);
                Swal.fire("Error", "Could not delete medicine form.", "error");
            }
        }
    };

    // Initial load
    loadMedicineForms();
});
