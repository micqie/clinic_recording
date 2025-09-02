document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseApiUrl') || 'http://localhost/clinic_recording/api';
    const reasonsApi = `${baseApiUrl}/appointment_reasons.php';

    const reasonsTableBody = document.getElementById('reasonsTableBody');
    const searchInput = document.getElementById('searchInput');
    const reasonForm = document.getElementById('reasonForm');
    const reasonModalTitle = document.getElementById('reasonModalTitle');
    const reasonIdInput = document.getElementById('reason_id');
    const reasonNameInput = document.getElementById('reason_name');
    const reasonDescriptionInput = document.getElementById('reason_description');
    const saveReasonBtn = document.getElementById('saveReasonBtn');

    let reasons = [];
    let isEditMode = false;

    // Initialize
    loadReasons();

    // Event Listeners
    searchInput?.addEventListener('input', filterReasons);
    reasonForm?.addEventListener('submit', handleSaveReason);

    // Load all appointment reasons
    async function loadReasons() {
        try {
            const resp = await axios.get(`${reasonsApi}?operation=listReasons`);
            if (resp.data.success) {
                reasons = resp.data.data || [];
                displayReasons(reasons);
            } else {
                console.error('Failed to load reasons:', resp.data.message);
                Swal.fire('Error', 'Failed to load appointment reasons', 'error');
            }
        } catch (error) {
            console.error('Error loading reasons:', error);
            Swal.fire('Error', 'Failed to load appointment reasons', 'error');
        }
    }

    // Display reasons in table
    function displayReasons(reasonsToShow) {
        if (!reasonsTableBody) return;

        if (reasonsToShow.length === 0) {
            reasonsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-3"></i>
                        <p class="mb-0">No appointment reasons found</p>
                    </td>
                </tr>
            `;
            return;
        }

        reasonsTableBody.innerHTML = reasonsToShow.map(reason => `
            <tr>
                <td>
                    <div class="fw-semibold">${reason.reason_name}</div>
                </td>
                <td>
                    <div class="text-muted">${reason.description || 'No description'}</div>
                </td>
                <td>
                    <small class="text-muted">
                        ${new Date(reason.created_at).toLocaleDateString()}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" onclick="editReason(${reason.reason_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteReason(${reason.reason_id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Filter reasons based on search input
    function filterReasons() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            displayReasons(reasons);
            return;
        }

        const filteredReasons = reasons.filter(reason =>
            reason.reason_name.toLowerCase().includes(searchTerm) ||
            (reason.description && reason.description.toLowerCase().includes(searchTerm))
        );

        displayReasons(filteredReasons);
    }

    // Handle form submission (add/edit)
    async function handleSaveReason(e) {
        e.preventDefault();

        if (!reasonForm.checkValidity()) {
            reasonForm.classList.add('was-validated');
            return;
        }

        reasonForm.classList.remove('was-validated');

        const formData = new FormData(reasonForm);
        const reasonData = {
            reason_name: formData.get('reason_name').trim(),
            description: formData.get('description').trim() || null
        };

        try {
            saveReasonBtn.disabled = true;
            saveReasonBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

            let response;
            if (isEditMode) {
                // Update existing reason
                reasonData.reason_id = parseInt(formData.get('reason_id'));
                response = await axios.post(reasonsApi, {
                    operation: 'updateReason',
                    ...reasonData
                });
            } else {
                // Add new reason
                response = await axios.post(reasonsApi, {
                    operation: 'addReason',
                    ...reasonData
                });
            }

            if (response.data.success) {
                Swal.fire({
                    icon: 'success',
                    title: isEditMode ? 'Updated!' : 'Added!',
                    text: response.data.message || 'Appointment reason saved successfully',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Reset form and close modal
                resetForm();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addReasonModal'));
                modal?.hide();

                // Reload reasons
                await loadReasons();
            } else {
                Swal.fire('Error', response.data.message || 'Failed to save reason', 'error');
            }
        } catch (error) {
            console.error('Error saving reason:', error);
            Swal.fire('Error', 'Failed to save appointment reason', 'error');
        } finally {
            saveReasonBtn.disabled = false;
            saveReasonBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Reason';
        }
    }

    // Reset form to add mode
    function resetForm() {
        isEditMode = false;
        reasonModalTitle.textContent = 'Add New Reason';
        reasonIdInput.value = '';
        reasonNameInput.value = '';
        reasonDescriptionInput.value = '';
        reasonForm.classList.remove('was-validated');
    }

    // Edit reason
    window.editReason = function(reasonId) {
        const reason = reasons.find(r => r.reason_id === reasonId);
        if (!reason) return;

        isEditMode = true;
        reasonModalTitle.textContent = 'Edit Reason';
        reasonIdInput.value = reason.reason_id;
        reasonNameInput.value = reason.reason_name;
        reasonDescriptionInput.value = reason.description || '';

        const modal = new bootstrap.Modal(document.getElementById('addReasonModal'));
        modal.show();
    };

    // Delete reason
    window.deleteReason = function(reasonId) {
        const reason = reasons.find(r => r.reason_id === reasonId);
        if (!reason) return;

        Swal.fire({
            title: 'Delete Reason?',
            html: `
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                    <p>Are you sure you want to delete <strong>${reason.reason_name}</strong>?</p>
                    <p class="text-muted small">This action cannot be undone.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await axios.post(reasonsApi, {
                        operation: 'deleteReason',
                        reason_id: reasonId
                    });

                    if (response.data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Appointment reason has been deleted.',
                            timer: 2000,
                            showConfirmButton: false
                        });

                        // Reload reasons
                        await loadReasons();
                    } else {
                        Swal.fire('Error', response.data.message || 'Failed to delete reason', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting reason:', error);
                    Swal.fire('Error', 'Failed to delete appointment reason', 'error');
                }
            }
        });
    };

    // Reset form when modal is hidden
    document.getElementById('addReasonModal')?.addEventListener('hidden.bs.modal', resetForm);

    // Sidebar toggle functionality
    const sidebar = document.getElementById('sidebar-wrapper');
    const toggleBtn = document.querySelector('.offcanvas-toggle-btn');

    toggleBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 991.98 &&
            sidebar.classList.contains('show') &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('show');
        }
    });
});
