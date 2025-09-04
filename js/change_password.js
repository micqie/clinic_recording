document.addEventListener('DOMContentLoaded', () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const form = document.getElementById('forceChangeForm');
  const newPasswordInput = document.querySelector('input[name="new_password"]');
  const confirmPasswordInput = document.querySelector('input[name="confirm_password"]');
  const strengthEl = document.getElementById('passwordStrength');

  // Ensure user exists
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) {
    window.location.href = '/clinic_recording/index.html';
    return;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const current_password = (fd.get('current_password') || '').toString();
    const new_password = (fd.get('new_password') || '').toString();
    const confirm_password = (fd.get('confirm_password') || '').toString();

    if (!current_password || !new_password) {
      Swal.fire('Error', 'Please fill out all fields', 'error');
      return;
    }
    // Enforce strong password: 12+ chars, 1 uppercase, 1 number, 1 symbol
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
    if (!strongPasswordRegex.test(new_password)) {
      Swal.fire('Error', 'Password must be 12+ chars with uppercase, number, and symbol', 'error');
      return;
    }
    if (new_password !== confirm_password) {
      Swal.fire('Error', 'New passwords do not match', 'error');
      return;
    }

    try {
      const payload = new URLSearchParams();
      payload.append('operation', 'changePassword');
      payload.append('json', JSON.stringify({
        user_id: user.id,
        current_password,
        new_password
      }));

      const res = await axios.post(`${baseApiUrl}/user.php`, payload);
      if (res.data?.success) {
        // Clear flag and redirect to role dashboard
        user.must_change_password = 0;
        sessionStorage.setItem('user', JSON.stringify(user));
        Swal.fire('Success', 'Password updated. Redirecting...', 'success');
        setTimeout(() => {
          const roleRoutes = {
            doctor: '/clinic_recording/html/doctor/doctor_appointments.html',
            secretary: '/clinic_recording/html/secretary/secretary_dashboard.html',
            patient: '/clinic_recording/html/patient/patient_dashboard.html'
          };
          const route = roleRoutes[(user.role || '').toLowerCase()] || '/clinic_recording/index.html';
          window.location.href = route;
        }, 1200);
      } else {
        Swal.fire('Error', res.data?.message || 'Failed to change password', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'An error occurred while changing password', 'error');
    }
  });

  // Real-time strength validation UI
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
  const updateStrengthUI = () => {
    const value = newPasswordInput?.value || '';
    if (!newPasswordInput) return;

    const isStrong = strongPasswordRegex.test(value);

    newPasswordInput.classList.remove('is-valid', 'is-invalid');
    if (value.length === 0) {
      if (strengthEl) strengthEl.textContent = '';
      return;
    }
    if (isStrong) {
      newPasswordInput.classList.add('is-valid');
      if (strengthEl) {
        strengthEl.textContent = 'Strong password';
        strengthEl.classList.remove('text-danger');
        strengthEl.classList.add('text-success');
      }
    } else {
      newPasswordInput.classList.add('is-invalid');
      if (strengthEl) {
        strengthEl.textContent = 'Weak: Use 12+ chars, uppercase, number, symbol';
        strengthEl.classList.remove('text-success');
        strengthEl.classList.add('text-danger');
      }
    }

    // Also reflect match status for confirm field
    if (confirmPasswordInput) {
      confirmPasswordInput.classList.remove('is-valid', 'is-invalid');
      if (confirmPasswordInput.value.length > 0) {
        if (confirmPasswordInput.value === value && isStrong) {
          confirmPasswordInput.classList.add('is-valid');
        } else {
          confirmPasswordInput.classList.add('is-invalid');
        }
      }
    }
  };

  newPasswordInput?.addEventListener('input', updateStrengthUI);
  confirmPasswordInput?.addEventListener('input', updateStrengthUI);
});
