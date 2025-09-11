document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const registerBirthdate = document.getElementById("register-birthdate");
  const registerAge = document.getElementById("register-age");

  // Registration form handling
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(registerForm);

    // Validate required fields
    const requiredFields = ['name', 'email', 'password', 'sex', 'contact_num', 'birthdate', 'age', 'address'];
    for (let field of requiredFields) {
      if (!formData.get(field)) {
        Swal.fire("Error", `Please fill in the ${field.replace('_', ' ')} field.`, "error");
        return;
      }
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

        // Reset form and close modal
        registerForm.reset();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("registerModal"));
        modal?.hide();
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

        // Redirect based on must_change_password or role
        setTimeout(() => {
          if (user.must_change_password === 1) {
            window.location.href = "html/change_password.html";
          } else {
            const roleRoutes = {
              admin: "html/admin/admin_dashboard.html",
              doctor: "html/doctor/doctor_appointments.html",
              secretary: "html/secretary/secretary_dashboard.html",
              patient: "html/patient/patient_dashboard.html"
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
