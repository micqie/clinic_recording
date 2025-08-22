document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';

    // Check if user is logged in
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id) {
        console.error('User not logged in');
        Swal.fire('Error', 'Please log in to continue', 'error');
        window.location.href = '../../index.html';
        return;
    }

    // DOM elements
    const editProfileBtn = document.getElementById('editProfileBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    const editProfileForm = document.getElementById('editProfileForm');
    const changePasswordForm = document.getElementById('changePasswordForm');

    // Profile display elements
    const profileElements = {
        fullName: document.getElementById('profileFullName'),
        email: document.getElementById('profileEmail'),
        contact: document.getElementById('profileContact'),
        gender: document.getElementById('profileGender'),
        birthdate: document.getElementById('profileBirthdate'),
        age: document.getElementById('profileAge'),
        address: document.getElementById('profileAddress'),
        patientId: document.getElementById('profilePatientId'),
        memberSince: document.getElementById('profileMemberSince'),
        lastUpdated: document.getElementById('profileLastUpdated')
    };

    // Edit form elements
    const editFormElements = {
        fullName: document.getElementById('editFullName'),
        email: document.getElementById('editEmail'),
        contact: document.getElementById('editContact'),
        gender: document.getElementById('editGender'),
        birthdate: document.getElementById('editBirthdate'),
        address: document.getElementById('editAddress')
    };

    // Load patient profile
    async function loadPatientProfile() {
        try {
            const response = await axios.get(`${baseApiUrl}/patients.php?operation=get&id=${user.id}`);

            if (response.data.success) {
                const patient = response.data.data;
                displayProfile(patient);
            } else {
                throw new Error(response.data.message || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            Swal.fire('Error', 'Failed to load profile information', 'error');
        }
    }

    // Display profile information
    function displayProfile(patient) {
        // Calculate age
        const birthDate = new Date(patient.birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

        // Update profile display
        profileElements.fullName.textContent = patient.full_name || 'N/A';
        profileElements.email.textContent = patient.email || 'N/A';
        profileElements.contact.textContent = patient.contact_num || 'N/A';
        profileElements.gender.textContent = patient.sex || 'N/A';
        profileElements.birthdate.textContent = patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : 'N/A';
        profileElements.age.textContent = actualAge > 0 ? `${actualAge} years old` : 'N/A';
        profileElements.address.textContent = patient.address || 'N/A';
        profileElements.patientId.textContent = patient.patient_id || 'N/A';
        profileElements.memberSince.textContent = patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A';
        profileElements.lastUpdated.textContent = patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : 'N/A';

        // Populate edit form
        editFormElements.fullName.value = patient.full_name || '';
        editFormElements.email.value = patient.email || '';
        editFormElements.contact.value = patient.contact_num || '';
        editFormElements.gender.value = patient.sex || '';
        editFormElements.birthdate.value = patient.birthdate || '';
        editFormElements.address.value = patient.address || '';
    }

    // Edit profile button click
    editProfileBtn?.addEventListener('click', () => {
        editProfileModal.show();
    });

    // Change password button click
    changePasswordBtn?.addEventListener('click', () => {
        changePasswordForm.reset();
        changePasswordModal.show();
    });

    // Edit profile form submission
    editProfileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!editProfileForm.checkValidity()) {
            e.stopPropagation();
            editProfileForm.classList.add('was-validated');
            return;
        }

        try {
            const formData = new FormData(editProfileForm);
            const payload = new URLSearchParams();
            payload.append('operation', 'update');
            payload.append('json', JSON.stringify({
                patient_id: user.id,
                user_id: user.id,
                full_name: formData.get('full_name'),
                email: formData.get('email'),
                contact_num: formData.get('contact_num'),
                sex: formData.get('sex'),
                birthdate: formData.get('birthdate'),
                address: formData.get('address')
            }));

            const response = await axios.post(`${baseApiUrl}/patients.php`, payload);

            if (response.data.success) {
                Swal.fire('Success', 'Profile updated successfully!', 'success');
                editProfileModal.hide();

                // Reload profile data
                await loadPatientProfile();

                // Update session storage with new user info
                const updatedUser = { ...user };
                updatedUser.name = formData.get('full_name');
                updatedUser.email = formData.get('email');
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                Swal.fire('Error', response.data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire('Error', error?.response?.data?.message || 'Failed to update profile', 'error');
        }
    });

    // Change password form submission
    changePasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!changePasswordForm.checkValidity()) {
            e.stopPropagation();
            changePasswordForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(changePasswordForm);
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        // Validate password confirmation
        if (newPassword !== confirmPassword) {
            Swal.fire('Error', 'New passwords do not match', 'error');
            return;
        }

        // Validate password length
        if (newPassword.length < 6) {
            Swal.fire('Error', 'Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const payload = new URLSearchParams();
            payload.append('operation', 'changePassword');
            payload.append('json', JSON.stringify({
                user_id: user.id,
                current_password: currentPassword,
                new_password: newPassword
            }));

            const response = await axios.post(`${baseApiUrl}/user.php`, payload);

            if (response.data.success) {
                Swal.fire('Success', 'Password changed successfully!', 'success');
                changePasswordModal.hide();
                changePasswordForm.reset();
            } else {
                Swal.fire('Error', response.data.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            Swal.fire('Error', error?.response?.data?.message || 'Failed to change password', 'error');
        }
    });

    // Modal cleanup
    document.getElementById('editProfileModal')?.addEventListener('hidden.bs.modal', () => {
        editProfileForm.classList.remove('was-validated');
    });

    document.getElementById('changePasswordModal')?.addEventListener('hidden.bs.modal', () => {
        changePasswordForm.classList.remove('was-validated');
    });

    // Initial load
    loadPatientProfile();
});

