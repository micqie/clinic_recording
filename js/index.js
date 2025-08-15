document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const registerRole = document.getElementById("register-role");
  const licenseField = document.getElementById("license-field");
  const employeeIdField = document.getElementById("employee-id-field");

  // Show/hide role-specific fields based on selection
  registerRole?.addEventListener("change", () => {
    const role = registerRole.value;
    licenseField.style.display = role === "doctor" ? "block" : "none";
    employeeIdField.style.display = role === "secretary" ? "block" : "none";
    
    // Clear fields when role changes
    if (role !== "doctor") {
      document.getElementById("license-number").value = "";
    }
    if (role !== "secretary") {
      document.getElementById("employee-id").value = "";
    }
  });

  // Registration form handling
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const role = formData.get("role");
    
    // Validate role-specific fields
    if (role === "doctor" && !formData.get("license_number")) {
      Swal.fire("Error", "License number is required for doctors.", "error");
      return;
    }
    if (role === "secretary" && !formData.get("employee_id")) {
      Swal.fire("Error", "Employee ID is required for secretaries.", "error");
      return;
    }

    const jsonPayload = JSON.stringify({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: role,
      license_number: formData.get("license_number"),
      employee_id: formData.get("employee_id")
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
        licenseField.style.display = "none";
        employeeIdField.style.display = "none";
        
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

        // Redirect based on role
        setTimeout(() => {
          const roleRoutes = {
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
