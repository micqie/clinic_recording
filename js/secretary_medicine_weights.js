document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    const medicineApiUrl = `${baseApiUrl}/medicines.php`;

    const weightsTableBody = document.getElementById("weightsTableBody");
    const addWeightModalForm = document.getElementById("addWeightModalForm");

    // Bootstrap modal instances
    const addWeightModal = new bootstrap.Modal(document.getElementById('addWeightModal'));

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
                        <td colspan="4" class="text-center text-muted py-4">
                            <i class="fas fa-weight-scale fa-3x mb-3"></i>
                            <p>No medicine weights found</p>
                        </td>
                    </tr>
                `;
                return;
            }

            weights.forEach(weight => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${weight.weight_id}</td>
                    <td>${weight.weight_value}</td>
                    <td>${formatDate(weight.created_at)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteWeight(${weight.weight_id}, '${weight.weight_value}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                weightsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Failed to load medicine weights", error);
            weightsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load medicine weights</p>
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
            console.error("Error adding medicine weight", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    });

    // Delete medicine weight
    window.deleteWeight = async (weightId, weightValue) => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "Are you sure?",
            text: `This will permanently delete the medicine weight "${weightValue}". This action cannot be undone.`,
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
                Swal.fire("Error", "Could not delete medicine weight.", "error");
            }
        }
    };

    // Initial load
    loadMedicineWeights();
});
