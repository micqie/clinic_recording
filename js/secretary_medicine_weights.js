document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    const medicineApiUrl = `${baseApiUrl}/medicines.php`;

    const weightsTableBody = document.getElementById("weightsTableBody");
    const addWeightModalForm = document.getElementById("addWeightModalForm");
    const editWeightModalForm = document.getElementById("editWeightModalForm");

    // Bootstrap modal instances
    const addWeightModal = new bootstrap.Modal(document.getElementById('addWeightModal'));
    const editWeightModal = new bootstrap.Modal(document.getElementById('editWeightModal'));

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

    // Load medicine weights and populate table
    async function loadMedicineWeights() {
        try {
            const response = await axios.get(`${medicineApiUrl}?operation=getMedicineWeights`);
            const weights = response.data.weights || [];
            weightsTableBody.innerHTML = "";

            if (weights.length === 0) {
                weightsTableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted py-4">
                            <i class="fas fa-weight-scale fa-3x mb-3"></i>
                            <p>No medicine strengths found</p>
                        </td>
                    </tr>
                `;
                return;
            }

            weights.forEach(weight => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${weight.weight_value}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-warning" onclick="editWeight(${weight.weight_id}, '${weight.weight_value}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteWeight(${weight.weight_id}, '${weight.weight_value}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                weightsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Failed to load medicine strengths", error);
            weightsTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load medicine strengths</p>
                    </td>
                </tr>
            `;
        }
    }

    // Add medicine weight submit handler
    addWeightModalForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addWeightModalForm.checkValidity()) {
            e.stopPropagation();
            addWeightModalForm.classList.add('was-validated');
            return;
        }
        addWeightModalForm.classList.remove('was-validated');

        const formData = new FormData(addWeightModalForm);

        const jsonPayload = JSON.stringify({
            weight_value: formData.get("weight_value").trim()
        });

        const payload = new FormData();
        payload.append("operation", "addMedicineWeight");
        payload.append("json", jsonPayload);

        try {
            const response = await axios.post(medicineApiUrl, payload);
            if (response.data.success) {
                Swal.fire("Success", response.data.message, "success");
                addWeightModalForm.reset();
                addWeightModal.hide();
                loadMedicineWeights();
            } else {
                Swal.fire("Error", response.data.message, "error");
            }
        } catch (error) {
            console.error("Error adding medicine strength", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    // Edit medicine weight
    window.editWeight = async (weightId, weightValue) => {
        try {
            document.getElementById("edit_weight_id").value = weightId;
            document.getElementById("edit_weight_value").value = weightValue;
            editWeightModal.show();
        } catch (error) {
            console.error("Error editing strength", error);
            Swal.fire("Error", "Failed to load strength details", "error");
        }
    };

    // Update medicine weight submit handler
    editWeightModalForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editWeightModalForm.checkValidity()) {
            e.stopPropagation();
            editWeightModalForm.classList.add('was-validated');
            return;
        }
        editWeightModalForm.classList.remove('was-validated');

        const formData = new FormData(editWeightModalForm);

        const jsonPayload = JSON.stringify({
            weight_id: formData.get("weight_id"),
            weight_value: formData.get("weight_value").trim()
        });

        const payload = new FormData();
        payload.append("operation", "updateMedicineWeight");
        payload.append("json", jsonPayload);

        try {
            const response = await axios.post(medicineApiUrl, payload);
            if (response.data.success) {
                Swal.fire("Success", response.data.message, "success");
                editWeightModal.hide();
                loadMedicineWeights();
            } else {
                Swal.fire("Error", response.data.message, "error");
            }
        } catch (error) {
            console.error("Error updating medicine strength", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    // Delete medicine weight
    window.deleteWeight = async (weightId, weightValue) => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "Are you sure?",
            text: `This will permanently delete the medicine strength "${weightValue}". This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel"
        });

        if (confirm.isConfirmed) {
            try {
                const payload = new FormData();
                payload.append("operation", "deleteMedicineWeight");
                payload.append("weight_id", weightId);
                const response = await axios.post(medicineApiUrl, payload);
                if (response.data.success) {
                    Swal.fire("Deleted", response.data.message, "success");
                    loadMedicineWeights();
                } else {
                    Swal.fire("Error", response.data.message, "error");
                }
            } catch (error) {
                console.error("Delete error", error);
                Swal.fire("Error", "Could not delete medicine strength.", "error");
            }
        }
    };

    // Initial load
    loadMedicineWeights();
});
