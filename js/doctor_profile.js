document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id || user.role !== 'doctor') {
        Swal.fire('Error', 'Please log in as a doctor', 'error');
        window.location.href = '../../index.html';
        return;
    }

    let currentDoctorData = null;

    const editProfileBtn = document.getElementById('editProfileBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const refreshProfileBtn = document.getElementById('refreshProfileBtn');
    const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    const editProfileForm = document.getElementById('editProfileForm');
    const changePasswordForm = document.getElementById('changePasswordForm');

    const profileElements = {
        fullName: document.getElementById('profileFullName'),
        email: document.getElementById('profileEmail'),
        license: document.getElementById('profileLicense'),
        specialization: document.getElementById('profileSpecialization'),
        experience: document.getElementById('profileExperience'),
        doctorId: document.getElementById('profileDoctorId'),
        memberSince: document.getElementById('profileMemberSince'),
        lastUpdated: document.getElementById('profileLastUpdated')
    };

    const editFormElements = {
        fullName: document.getElementById('editFullName'),
        email: document.getElementById('editEmail'),
        license: document.getElementById('editLicense'),
        specialization: document.getElementById('editSpecialization'),
        experience: document.getElementById('editExperience')
    };

    async function loadSpecializations() {
        try {
            const res = await axios.get(`${baseApiUrl}/doctors.php?operation=getSpecializations`);
            if (res.data.success) {
                const options = ['<option value="">Select specialization</option>']
                    .concat(res.data.specializations.map(s => `<option value="${s.specialization_id}">${s.name}</option>`));
                editFormElements.specialization.innerHTML = options.join('');
            }
        } catch (e) {
            console.error('Failed to load specializations', e);
        }
    }

    async function loadDoctorProfile() {
        try {
            const response = await axios.get(`${baseApiUrl}/doctors.php?operation=getByUserId&user_id=${user.id}`);
            if (response.data.success && response.data.doctor) {
                const doctor = response.data.doctor;
                currentDoctorData = doctor;
                displayProfile(doctor);
            } else {
                throw new Error(response.data.message || 'No doctor data found');
            }
        } catch (error) {
            console.error('Error loading doctor profile:', error);
            Swal.fire('Error', 'Failed to load profile information. Please refresh.', 'error');
        }
    }

    function displayProfile(doctor) {
        profileElements.fullName.textContent = doctor.name || 'N/A';
        profileElements.email.textContent = doctor.email || 'N/A';
        profileElements.license.textContent = doctor.license_number || 'N/A';
        profileElements.specialization.textContent = doctor.specialization_name || 'N/A';
        profileElements.experience.textContent = (doctor.years_experience ?? '') !== '' ? `${doctor.years_experience} years` : 'N/A';
        profileElements.doctorId.textContent = doctor.doctor_id || 'N/A';
        profileElements.memberSince.textContent = doctor.created_at ? new Date(doctor.created_at).toLocaleDateString() : 'N/A';
        profileElements.lastUpdated.textContent = doctor.updated_at ? new Date(doctor.updated_at).toLocaleDateString() : 'N/A';

        editFormElements.fullName.value = doctor.name || '';
        editFormElements.email.value = doctor.email || '';
        editFormElements.license.value = doctor.license_number || '';
        editFormElements.specialization.value = doctor.specialization_id || '';
        editFormElements.experience.value = (doctor.years_experience ?? '') !== '' ? doctor.years_experience : '';
    }

    editProfileBtn?.addEventListener('click', () => {
        editProfileModal.show();
    });

    changePasswordBtn?.addEventListener('click', () => {
        changePasswordForm.reset();
        changePasswordModal.show();
    });

    refreshProfileBtn?.addEventListener('click', () => {
        loadDoctorProfile();
    });

    editProfileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!editProfileForm.checkValidity()) {
            e.stopPropagation();
            editProfileForm.classList.add('was-validated');
            return;
        }
        if (!currentDoctorData) {
            Swal.fire('Error', 'Doctor data not loaded. Please refresh.', 'error');
            return;
        }
        try {
            const formData = new FormData(editProfileForm);
            const payload = new URLSearchParams();
            payload.append('operation', 'update');
            payload.append('json', JSON.stringify({
                doctor_id: currentDoctorData.doctor_id,
                name: formData.get('name'),
                email: formData.get('email'),
                license_number: formData.get('license_number'),
                specialization_id: formData.get('specialization_id'),
                years_experience: formData.get('years_experience')
            }));

            const response = await axios.post(`${baseApiUrl}/doctors.php`, payload);
            if (response.data.success) {
                Swal.fire('Success', 'Profile updated successfully!', 'success');
                editProfileModal.hide();

                const updatedUser = { ...user };
                updatedUser.name = formData.get('name');
                updatedUser.email = formData.get('email');
                sessionStorage.setItem('user', JSON.stringify(updatedUser));

                await loadDoctorProfile();
            } else {
                Swal.fire('Error', response.data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire('Error', error?.response?.data?.message || 'Failed to update profile', 'error');
        }
    });

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

        if (newPassword !== confirmPassword) {
            Swal.fire('Error', 'New passwords do not match', 'error');
            return;
        }
        if (String(newPassword).length < 6) {
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

    document.getElementById('editProfileModal')?.addEventListener('hidden.bs.modal', () => {
        editProfileForm.classList.remove('was-validated');
    });
    document.getElementById('changePasswordModal')?.addEventListener('hidden.bs.modal', () => {
        changePasswordForm.classList.remove('was-validated');
    });

    // init
    loadSpecializations().then(loadDoctorProfile);
});
