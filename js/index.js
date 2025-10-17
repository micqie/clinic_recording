document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const registerBirthdate = document.getElementById("register-birthdate");
  const registerAge = document.getElementById("register-age");

  // Password validation functions
  function validatePassword(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    };
  }

  function updatePasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;

    const validation = validatePassword(password);
    let strength = 0;
    let message = '';

    if (validation.minLength) strength++;
    if (validation.hasUpperCase) strength++;
    if (validation.hasLowerCase) strength++;
    if (validation.hasNumbers) strength++;
    if (validation.hasSpecialChar) strength++;

    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['text-danger', 'text-danger', 'text-warning', 'text-info', 'text-success'];

    message = strengthLevels[strength - 1] || 'Very Weak';
    const colorClass = strengthColors[strength - 1] || 'text-danger';

    strengthDiv.innerHTML = `<span class="${colorClass}">Password Strength: ${message}</span>`;
  }

  function checkPasswordMatch() {
    const password = document.getElementById('register-password')?.value || '';
    const confirmPassword = document.getElementById('register-confirm-password')?.value || '';
    const matchDiv = document.getElementById('passwordMatch');

    if (!matchDiv) return;

    if (confirmPassword === '') {
      matchDiv.innerHTML = '';
      return;
    }

    if (password === confirmPassword) {
      matchDiv.innerHTML = '<span class="text-success">✓ Passwords match</span>';
    } else {
      matchDiv.innerHTML = '<span class="text-danger">✗ Passwords do not match</span>';
    }
  }

  // Add event listeners for password validation
  document.getElementById('register-password')?.addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
    checkPasswordMatch();
  });

  document.getElementById('register-confirm-password')?.addEventListener('input', checkPasswordMatch);

  // Age calculation function
  function calculateAge(birthdate) {
    if (!birthdate) return '';

    const today = new Date();
    const birth = new Date(birthdate);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : '';
  }

  // Add event listener for birthdate change
  document.getElementById('register-birthdate')?.addEventListener('change', (e) => {
    const ageField = document.getElementById('register-age');
    if (ageField && e.target.value) {
      const calculatedAge = calculateAge(e.target.value);
      ageField.value = calculatedAge;
    }
  });

  // Registration form handling
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(registerForm);
    const password = formData.get('password') || '';
    const confirmPassword = formData.get('confirm_password') || '';

    // Validate required fields
    const requiredFields = ['name', 'email', 'password', 'confirm_password', 'sex', 'contact_num', 'birthdate', 'age', 'address'];
    for (let field of requiredFields) {
      if (!formData.get(field)) {
        Swal.fire("Error", `Please fill in the ${field.replace('_', ' ')} field.`, "error");
        return;
      }
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Swal.fire("Error", "Password must be at least 12 characters long and include uppercase letters, lowercase letters, numbers, and special characters.", "error");
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      Swal.fire("Error", "Passwords do not match. Please check your password confirmation.", "error");
      return;
    }

    const jsonPayload = JSON.stringify({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      sex: formData.get("sex"),
      contact_num: formData.get("contact_num"),
      birthdate: formData.get("birthdate"),
      age: formData.get("age"),
      address: formData.get("address")
    });

    const payload = new FormData();
    payload.append("operation", "register");
    payload.append("json", jsonPayload);

    try {
      Swal.fire({
        title: "Registering...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await axios.post(`${baseApiUrl}/user.php`, payload);

      if (response.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Registration Successful",
          text: response.data.message,
          showConfirmButton: false,
          timer: 2000
        });

        // If API returns a user object (self-registration), log them in and redirect to role dashboard
        const registeredUser = response.data?.user;
        if (registeredUser) {
          registeredUser.role = (registeredUser.role || "").toLowerCase();
          sessionStorage.setItem("user", JSON.stringify(registeredUser));
          setTimeout(() => {
            const roleRoutes = {
              doctor: "html/doctor/doctor_appointments.html",
              secretary: "html/secretary/secretary_dashboard.html",
              patient: "html/patient/patient_dashboard.html"
            };
            const route = roleRoutes[registeredUser.role] || "index.html";
            window.location.href = route;
          }, 1000);
        } else {
          // Otherwise just reset and close the modal (e.g., admin/secretary-created account)
          registerForm.reset();
          const modal = bootstrap.Modal.getInstance(document.getElementById("registerModal"));
          modal?.hide();
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Registration Failed",
          text: response.data?.message || "Registration failed. Please try again."
        });
      }
    } catch (error) {
      console.error("Registration Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Registration failed. Please try again."
      });
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email")?.value.trim() || "";
    const password = document.getElementById("login-password")?.value || "";

    if (!email || !password) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please enter both email and password."
      });
      return;
    }

    // Clear old session data
    sessionStorage.removeItem("user");

    const payload = new FormData();
    payload.append("operation", "login");
    payload.append("json", JSON.stringify({ email, password }));

    try {
      Swal.fire({
        title: "Logging in...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await axios.post(`${baseApiUrl}/user.php`, payload);

      if (response.data?.success && response.data?.user) {
        const user = response.data.user;
        user.role = (user.role || "").toLowerCase(); // Normalize role

        // Save user to session
        sessionStorage.setItem("user", JSON.stringify(user));

        Swal.fire({
          icon: "success",
          title: "Login Successful",
          text: `Welcome, ${user.name}`,
          showConfirmButton: false,
          timer: 1500
        });

        // Redirect based on role or force password change
        setTimeout(() => {
          if (Number(user.must_change_password) === 1) {
            window.location.href = "html/change_password.html";
            return;
          }
          const roleRoutes = {
            admin: "html/admin/admin_dashboard.html",
            doctor: "html/doctor/doctor_dashboard.html",
            secretary: "html/secretary/secretary_dashboard.html",
            patient: "html/patient/patient_dashboard.html",
            nurse: "html/nurse/nurse_dashboard.html"
          };

          if (roleRoutes[user.role]) {
            window.location.href = roleRoutes[user.role];
          } else {
            Swal.fire({
              icon: "error",
              title: "Unknown Role",
              text: `User role "${user.role}" is not recognized.`
            });
          }
        }, 1500);
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: response.data?.message || "Invalid server response."
        });
      }
    } catch (error) {
      console.error("Login Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Login failed. Please try again."
      });
    }
  });
});
