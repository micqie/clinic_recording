document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    
    const labResultsTableBody = document.getElementById("labResultsTableBody");
    const addLabResultForm = document.getElementById("addLabResultForm");

    // Bootstrap modal instances
    const addLabResultModal = new bootstrap.Modal(document.getElementById('addLabResultModal'));

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

    // Load lab results and populate table
    async function loadLabResults() {
        try {
            // Note: This would need to be implemented in the API
            // For now, showing a placeholder message
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-file-medical fa-3x mb-3"></i>
                        <p>Lab Results functionality needs to be implemented</p>
                        <small class="text-muted">API endpoints for lab results management need to be created</small>
                    </td>
                </tr>
            `;
        } catch (error) {
            console.error("Failed to load lab results", error);
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load lab results</p>
                    </td>
                </tr>
            `;
        }
    }

    // Add lab result submit handler
    addLabResultForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addLabResultForm.checkValidity()) {
            e.stopPropagation();
            addLabResultForm.classList.add('was-validated');
            return;
        }
        addLabResultForm.classList.remove('was-validated');

        // Note: This would need to be implemented in the API
        Swal.fire("Info", "Lab Results functionality needs to be implemented in the API", "info");
        
        // Uncomment when API is ready:
        // const formData = new FormData(addLabResultForm);
        // const jsonPayload = JSON.stringify({
        //     patient_id: formData.get("patient_id"),
        //     test_type: formData.get("test_type"),
        //     result: formData.get("result")
        // });
        // const payload = new FormData();
        // payload.append("operation", "addLabResult");
        // payload.append("json", jsonPayload);
        // try {
        //     const response = await axios.post(`${baseApiUrl}/lab_results.php`, payload);
        //     if (response.data.success) {
        //         Swal.fire("Success", response.data.message, "success");
        //         addLabResultForm.reset();
        //         addLabResultModal.hide();
        //         loadLabResults();
        //     } else {
        //         Swal.fire("Error", response.data.message, "error");
        //     }
        // } catch (error) {
        //     console.error("Error adding lab result", error);
        //     Swal.fire("Error", "Something went wrong", "error");
        // }
    });

    // Initial load
    loadLabResults();
});
