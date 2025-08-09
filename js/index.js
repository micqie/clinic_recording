document.addEventListener("DOMContentLoaded", () => {
  // Use sessionStorage baseAPIUrl if it exists, otherwise default to localhost
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";

  // Elements
  const registerForm = document.getElementById('register-form');
  const roleSelect = document.getElementById('register-role');
  const licenseField = document.getElementById('license-field');
  const employeeIdField = document.getElementById('employee-id-field');
  const patientFields = document.getElementById('patient-fields');

  // Show/hide extra fields depending on role
  roleSelect?.addEventListener('change', () => {
    const role = roleSelect.value;
    if (licenseField) licenseField.style.display = role === 'doctor' ? 'block' : 'none';
    if (employeeIdField) employeeIdField.style.display = role === 'secretary' ? 'block' : 'none';
    if (patientFields) patientFields.style.display = role === 'patient' ? 'block' : 'none';
  });

  // Register submit
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById("register-name")?.value || "";
    const email = document.getElementById("register-email")?.value || "";
    const password = document.getElementById("register-password")?.value || "";
    const role = document.getElementById("register-role")?.value || "";
    const licenseNumber = document.getElementById("license-number")?.value || "";
    const employeeId = document.getElementById("employee-id")?.value || "";

    // Patient-specific fields
    const sex = document.getElementById("patient-sex")?.value || "";
    const contactNum = document.getElementById("patient-contact")?.value || "";
    const birthdate = document.getElementById("patient-birthdate")?.value || "";
    const address = document.getElementById("patient-address")?.value || "";

    const data = { name, email, password, role };

    if (role === "doctor") {
      data.license_number = licenseNumber;
    } else if (role === "secretary") {
      data.employee_id = employeeId;
    } else if (role === "patient") {
      data.sex = sex;
      data.contact_num = contactNum;
      data.birthdate = birthdate;
      data.address = address;
    }

    const payload = new FormData();
    payload.append("operation", "register");
    payload.append("json", JSON.stringify(data));

    try {
      const response = await axios.post(`${baseApiUrl}/user.php`, payload);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Registered Successfully',
          text: response.data.message,
          showConfirmButton: false,
          timer: 2000
        });

        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        setTimeout(() => {
          registerModal?.hide();
          registerForm?.reset();
          if (licenseField) licenseField.style.display = "none";
          if (employeeIdField) employeeIdField.style.display = "none";
          if (patientFields) patientFields.style.display = "none";
        }, 2000);

      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: response.data.message
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Registration failed. Please try again.'
      });
    }
  });
});
