document.addEventListener('DOMContentLoaded', () => {
    const storedBase = sessionStorage.getItem('baseAPIUrl') || sessionStorage.getItem('baseApiUrl') || '';
    const origin = window.location.origin;
    const candidates = [storedBase, `${origin}/clinic_recording/api`, `${origin}/api`, `${window.location.pathname.includes('/clinic_recording/') ? '/clinic_recording/api' : '/api'}`].filter(Boolean);
    const baseApiUrl = candidates[0];

    // Check if user is logged in
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id) {
        console.error('User not logged in');
        Swal.fire('Error', 'Please log in to continue', 'error');
        window.location.href = '../../index.html';
        return;
    }

    // Store current patient data
    let currentPatientData = null;

    // DOM elements
    const editProfileBtn = document.getElementById('editProfileBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const refreshProfileBtn = document.getElementById('refreshProfileBtn');
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
            console.log('Loading patient profile for user ID:', user.id);
            // Use the user profile API to get patient information
            const response = await axios.get(`${baseApiUrl}/user.php?operation=profile&user_id=${user.id}`);
            console.log('API response:', response.data);

            if (response.data.success && response.data.user && response.data.context && response.data.context.patient) {
                const userData = response.data.user;
                const patient = response.data.context.patient;

                // Combine user data with patient data
                const combinedData = {
                    ...userData,
                    ...patient,
                    full_name: userData.name,
                    email: userData.email,
                    patient_id: response.data.context.patient_id,
                    // Use user created_at for member since, patient created_at for last updated
                    created_at: userData.created_at, // Member since
                    updated_at: patient.created_at   // Last updated (patients table doesn't have updated_at)
                };

                currentPatientData = combinedData; // Store the combined data
                console.log('Patient data loaded:', combinedData);
                displayProfile(combinedData);
            } else {
                console.error('API returned success but no patient data:', response.data);
                throw new Error(response.data.message || 'No patient data found');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }

            // Show a more helpful error message
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            console.error('Full error details:', error);

            Swal.fire({
                title: 'Error Loading Profile',
                text: `Failed to load profile information: ${errorMessage}`,
                icon: 'error',
                confirmButtonText: 'Try Again'
            }).then(() => {
                // Try to reload the page
                window.location.reload();
            });
        }
    }

    // Display profile information
    function displayProfile(patient) {
        console.log('Displaying profile for patient:', patient);

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
        profileElements.memberSince.textContent = patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A';
        profileElements.lastUpdated.textContent = patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : 'N/A';

        // Populate edit form
        editFormElements.fullName.value = patient.full_name || '';
        editFormElements.email.value = patient.email || '';
        editFormElements.contact.value = patient.contact_num || '';
        editFormElements.gender.value = patient.sex || '';
        editFormElements.birthdate.value = patient.birthdate || '';
        editFormElements.address.value = patient.address || '';

        console.log('Profile display updated with values:', {
            fullName: profileElements.fullName.textContent,
            email: profileElements.email.textContent,
            contact: profileElements.contact.textContent,
            gender: profileElements.gender.textContent,
            birthdate: profileElements.birthdate.textContent,
            age: profileElements.age.textContent,
            address: profileElements.address.textContent
        });
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

    // Refresh profile button click
    refreshProfileBtn?.addEventListener('click', () => {
        loadPatientProfile();
    });

    // Edit profile form submission
    editProfileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!editProfileForm.checkValidity()) {
            e.stopPropagation();
            editProfileForm.classList.add('was-validated');
            return;
        }

        if (!currentPatientData) {
            Swal.fire('Error', 'Patient data not loaded. Please refresh the page.', 'error');
            return;
        }

        try {
            const formData = new FormData(editProfileForm);
            const payload = new URLSearchParams();
            payload.append('operation', 'update');
            payload.append('json', JSON.stringify({
                patient_id: currentPatientData.patient_id,
                user_id: user.id,
                full_name: formData.get('full_name'),
                email: formData.get('email'),
                contact_num: formData.get('contact_num'),
                sex: formData.get('sex'),
                birthdate: formData.get('birthdate'),
                address: formData.get('address')
            }));

            console.log('Sending update payload:', payload.toString());
            const response = await axios.post(`${baseApiUrl}/patients.php`, payload);
            console.log('Update response:', response.data);

            if (response.data.success) {
                Swal.fire('Success', 'Profile updated successfully!', 'success');
                editProfileModal.hide();

                // Update session storage with new user info
                const updatedUser = { ...user };
                updatedUser.name = formData.get('full_name');
                updatedUser.email = formData.get('email');
                sessionStorage.setItem('user', JSON.stringify(updatedUser));

                // Reload profile data from database to ensure we have the latest
                await loadPatientProfile();

                console.log('Profile updated and reloaded from database');
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
