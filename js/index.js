document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";

  const loginForm = document.getElementById("login-form");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email")?.value || "";
    const password = document.getElementById("login-password")?.value || "";

    const payload = new FormData();
    payload.append("operation", "login");
    payload.append("json", JSON.stringify({ email, password }));

    try {
      const response = await axios.post(`${baseApiUrl}/user.php`, payload);

      if (response.data.success) {
        const user = response.data.user; // Ensure your backend returns the logged-in user's data

        // Store user data if needed
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
          switch (user.role) {
            case "doctor":
              window.location.href = "html/doctor/doctor_appointments.html";
              break;
            case "secretary":
              window.location.href = "html/secretary/secretary_dashboard.html";
              break;
            case "patient":
              window.location.href = "html/patient/patient_dashboard.html";
              break;
            default:
              Swal.fire({
                icon: "error",
                title: "Unknown Role",
                text: "User role is not recognized."
              });
          }
        }, 1500);
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: response.data.message
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Login failed. Please try again."
      });
    }
  });
});
