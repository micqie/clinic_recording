document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    // Ensure user exists and is secretary or admin
    if (!user?.id || !['secretary', 'admin'].includes(user.role?.toLowerCase())) {
        window.location.href = '/clinic_recording/index.html';
        return;
    }

    // DOM elements
    const nurseTableBody = document.getElementById('nurseTableBody');
    const addNurseForm = document.getElementById('addNurseForm');
    const editNurseForm = document.getElementById('editNurseForm');

    // Load initial data
    loadNurses();

    // Event listeners
    addNurseForm?.addEventListener('submit', addNurse);
    editNurseForm?.addEventListener('submit', updateNurse);

    // Load nurses
    async function loadNurses() {
        try {
            const response = await axios.get(`${baseApiUrl}/nurses.php?operation=get_all`);
            if (response.data?.success) {
                displayNurses(response.data.data);
            } else {
                console.error('Failed to load nurses:', response.data?.message);
                nurseTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load nurses</td></tr>';
            }
        } catch (error) {
            console.error('Error loading nurses:', error);
            nurseTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading nurses</td></tr>';
        }
    }

    // Display nurses in table
    function displayNurses(nurses) {
        if (!nurses || nurses.length === 0) {
            nurseTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No nurses found</td></tr>';
            return;
        }

        nurseTableBody.innerHTML = nurses.map(nurse => {
            const statusBadge = nurse.is_active == 1 ?
                '<span class="badge bg-success">Active</span>' :
                '<span class="badge bg-danger">Inactive</span>';

            const createdDate = new Date(nurse.created_at).toLocaleDateString();

            return `
                <tr>
                    <td><strong>${nurse.name}</strong></td>
                    <td>${nurse.email}</td>
                    <td><code>${nurse.license_number}</code></td>
                    <td>${nurse.shift_schedule || 'Not set'}</td>
                    <td>${statusBadge}</td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editNurse(${nurse.nurse_id}, '${nurse.name}', '${nurse.email}', '${nurse.license_number}', '${nurse.shift_schedule || ''}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-${nurse.is_active == 1 ? 'warning' : 'success'}" onclick="toggleNurseStatus(${nurse.nurse_id})" title="${nurse.is_active == 1 ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${nurse.is_active == 1 ? 'ban' : 'check'}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteNurse(${nurse.nurse_id}, '${nurse.name}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Add nurse
    async function addNurse(e) {
        e.preventDefault();

        if (!addNurseForm.checkValidity()) {
            addNurseForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(addNurseForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            license_number: formData.get('license_number'),
            shift_schedule: formData.get('shift_schedule') || null
        };

        try {
            const response = await axios.post(`${baseApiUrl}/nurses.php`, new URLSearchParams({
                operation: 'add',
                json: JSON.stringify(data)
            }));

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Nurse added successfully',
                    timer: 2000,
                    showConfirmButton: false
                });
                addNurseForm.reset();
                addNurseForm.classList.remove('was-validated');
                bootstrap.Modal.getInstance(document.getElementById('addNurseModal'))?.hide();
                loadNurses();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to add nurse', 'error');
            }
        } catch (error) {
            console.error('Error adding nurse:', error);
            Swal.fire('Error', 'Failed to add nurse', 'error');
        }
    }

    // Edit nurse (global function for onclick)
    window.editNurse = function(nurseId, name, email, licenseNumber, shiftSchedule) {
        document.getElementById('edit_nurse_id').value = nurseId;
        document.getElementById('edit_name').value = name;
        document.getElementById('edit_email').value = email;
        document.getElementById('edit_license_number').value = licenseNumber;
        document.getElementById('edit_shift_schedule').value = shiftSchedule;
        document.getElementById('edit_password').value = '';

        bootstrap.Modal.getInstance(document.getElementById('editNurseModal')) ||
        new bootstrap.Modal(document.getElementById('editNurseModal')).show();
    };

    // Update nurse
    async function updateNurse(e) {
        e.preventDefault();

        if (!editNurseForm.checkValidity()) {
            editNurseForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(editNurseForm);
        const data = {
            nurse_id: formData.get('nurse_id'),
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password') || null,
            license_number: formData.get('license_number'),
            shift_schedule: formData.get('shift_schedule') || null
        };

        try {
            const response = await axios.post(`${baseApiUrl}/nurses.php`, new URLSearchParams({
                operation: 'update',
                json: JSON.stringify(data)
            }));

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Nurse updated successfully',
                    timer: 2000,
                    showConfirmButton: false
                });
                editNurseForm.reset();
                editNurseForm.classList.remove('was-validated');
                bootstrap.Modal.getInstance(document.getElementById('editNurseModal'))?.hide();
                loadNurses();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to update nurse', 'error');
            }
        } catch (error) {
            console.error('Error updating nurse:', error);
            Swal.fire('Error', 'Failed to update nurse', 'error');
        }
    }

    // Toggle nurse status (global function for onclick)
    window.toggleNurseStatus = async function(nurseId) {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'This will change the nurse\'s active status',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, change it!'
            });

            if (result.isConfirmed) {
                const response = await axios.post(`${baseApiUrl}/nurses.php`, new URLSearchParams({
                    operation: 'toggle_status',
                    nurse_id: nurseId
                }));

                if (response.data?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Nurse status updated',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    loadNurses();
                } else {
                    Swal.fire('Error', response.data?.message || 'Failed to update nurse status', 'error');
                }
            }
        } catch (error) {
            console.error('Error toggling nurse status:', error);
            Swal.fire('Error', 'Failed to update nurse status', 'error');
        }
    };

    // Delete nurse (global function for onclick)
    window.deleteNurse = async function(nurseId, nurseName) {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: `This will permanently delete nurse "${nurseName}". This action cannot be undone!`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            });

            if (result.isConfirmed) {
                const response = await axios.post(`${baseApiUrl}/nurses.php`, new URLSearchParams({
                    operation: 'delete',
                    nurse_id: nurseId
                }));

                if (response.data?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Nurse has been deleted',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    loadNurses();
                } else {
                    Swal.fire('Error', response.data?.message || 'Failed to delete nurse', 'error');
                }
            }
        } catch (error) {
            console.error('Error deleting nurse:', error);
            Swal.fire('Error', 'Failed to delete nurse', 'error');
        }
    };
});


