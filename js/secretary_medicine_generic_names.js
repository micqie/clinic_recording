document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    const medicineApiUrl = `${baseApiUrl}/medicines.php`;

    const genericTableBody = document.getElementById("genericTableBody");
    const addGenericForm = document.getElementById("addGenericForm");
    const editGenericForm = document.getElementById("editGenericForm");

    // Bootstrap modal instances
    const addGenericModal = new bootstrap.Modal(document.getElementById('addGenericModal'));
    const editGenericModal = new bootstrap.Modal(document.getElementById('editGenericModal'));

    // Load generic medicine names and populate table
    async function loadGenericNames() {
        try {
            console.log("Loading generic medicine names...");
            const response = await axios.get(`${medicineApiUrl}?operation=getGenericMedicineNames`);
            console.log("Generic names response:", response.data);

            const generics = response.data.generics || [];
            console.log("Generic names array:", generics);

            genericTableBody.innerHTML = "";

            if (generics.length === 0) {
                console.log("No generic names found, showing empty message");
                genericTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted py-4">
                            <i class="fas fa-pills fa-3x mb-3"></i>
                            <p>No generic medicine names found</p>
                        </td>
                    </tr>
                `;
                return;
            }

            console.log("Populating table with", generics.length, "generic names");
            generics.forEach((generic, index) => {
                console.log(`Processing generic ${index + 1}:`, generic);
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${generic.generic_name}</td>
                    <td>${generic.description || 'N/A'}</td>
                    <td>${formatDate(generic.created_at)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-warning" onclick="editGenericName(${generic.generic_id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteGenericName(${generic.generic_id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                genericTableBody.appendChild(row);
            });
            console.log("Table populated successfully");
        } catch (error) {
            console.error("Failed to load generic names", error);
            console.error("Error details:", error.response?.data);
            genericTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load generic names: ${error.message}</p>
                        <small>Check console for details</small>
                    </td>
                </tr>
            `;
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

    // Add generic name submit handler
    addGenericForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addGenericForm.checkValidity()) {
            e.stopPropagation();
            addGenericForm.classList.add('was-validated');
            return;
        }
        addGenericForm.classList.remove('was-validated');

        const formData = new FormData(addGenericForm);

        const jsonPayload = JSON.stringify({
            generic_name: formData.get("generic_name"),
            description: formData.get("description") || null,
        });

        const payload = new FormData();
        payload.append("operation", "addGenericMedicineName");
        payload.append("json", jsonPayload);

        try {
            const response = await axios.post(medicineApiUrl, payload);
            if (response.data.success) {
                Swal.fire("Success", response.data.message, "success");
                addGenericForm.reset();
                addGenericModal.hide();
                loadGenericNames();
            } else {
                Swal.fire("Error", response.data.message, "error");
            }
        } catch (error) {
            console.error("Error adding generic name", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    // Delete generic name
    window.deleteGenericName = async (genericId) => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "Are you sure?",
            text: "This will permanently delete the generic medicine name.",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        });

        if (confirm.isConfirmed) {
            const payload = new FormData();
            payload.append("operation", "deleteGenericMedicineName");
            payload.append("medicine_id", genericId);

            try {
                const response = await axios.post(medicineApiUrl, payload);
                if (response.data.success) {
                    Swal.fire("Deleted", response.data.message, "success");
                    loadGenericNames();
                } else {
                    Swal.fire("Error", response.data.message, "error");
                }
            } catch (error) {
                console.error("Delete error", error);
                Swal.fire("Error", "Could not delete generic name.", "error");
            }
        }
    };

    // Edit generic name modal show + populate fields
    window.editGenericName = async (genericId) => {
        try {
            console.log("Loading generic name details for ID:", genericId);
            const response = await axios.get(`${medicineApiUrl}?operation=getGenericMedicineNames`);
            const generic = response.data.generics.find(g => g.generic_id == genericId);
            if (!generic) {
                Swal.fire("Error", "Generic name not found", "error");
                return;
            }

            console.log("Generic name data found:", generic);

            document.getElementById("edit_generic_id").value = generic.generic_id;
            document.getElementById("edit_generic_name").value = generic.generic_name;
            document.getElementById("edit_description").value = generic.description || '';

            editGenericModal.show();
        } catch (err) {
            console.error("Edit generic name error:", err);
            Swal.fire("Error", "Something went wrong.", "error");
        }
    };

    // Save changes from edit modal
    editGenericForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editGenericForm.checkValidity()) {
            e.stopPropagation();
            editGenericForm.classList.add('was-validated');
            return;
        }
        editGenericForm.classList.remove('was-validated');

        const formData = new FormData(editGenericForm);

        const jsonPayload = JSON.stringify({
            generic_id: formData.get("generic_id"),
            generic_name: formData.get("generic_name"),
            description: formData.get("description") || null,
        });

        console.log("Edit form data:", {
            generic_id: formData.get("generic_id"),
            generic_name: formData.get("generic_name"),
            description: formData.get("description"),
        });

        const payload = new FormData();
        payload.append("operation", "updateGenericMedicineName");
        payload.append("json", jsonPayload);

        try {
            console.log("Sending update request with payload:", payload);
            const response = await axios.post(medicineApiUrl, payload);
            console.log("Update response:", response.data);

            if (response.data.success) {
                Swal.fire("Success", response.data.message, "success");
                editGenericModal.hide();
                loadGenericNames();
            } else {
                const msg = response.data.message || "Unable to update generic name.";
                Swal.fire("Error", msg, "error");
            }
        } catch (error) {
            console.error("Error updating generic name", error);
            console.error("Error response:", error.response?.data);
            const msg = error.response?.data?.message || error.message || "Request failed";
            Swal.fire("Error", msg, "error");
        }
    });

    // Initial load
    loadGenericNames();
});
