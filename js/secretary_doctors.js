document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";

    const specializationApiUrl = `${baseApiUrl}/doctors.php?operation=getSpecializations`;

    // ======================== Load Specializations ========================
    async function loadSpecializations() {
        try {
            const res = await fetch(specializationApiUrl);
            const data = await res.json();

            if (!data.success || !Array.isArray(data.specializations)) {
                console.error("Invalid specialization data:", data);
                return;
            }

            // Populate Add Doctor form dropdown
            const specializationSelect = document.getElementById("doctorSpecialization");
            if (specializationSelect) {
                specializationSelect.innerHTML = `<option value="">-- Select Specialization --</option>`;
                data.specializations.forEach(spec => {
                    const option = document.createElement("option");
                    option.value = spec.id;
                    option.textContent = spec.name;
                    specializationSelect.appendChild(option);
                });
            }

            // Populate Edit Doctor form dropdown
            const editSpecializationSelect = document.getElementById("editDoctorSpecialization");
            if (editSpecializationSelect) {
                editSpecializationSelect.innerHTML = `<option value="">-- Select Specialization --</option>`;
                data.specializations.forEach(spec => {
                    const option = document.createElement("option");
                    option.value = spec.id;
                    option.textContent = spec.name;
                    editSpecializationSelect.appendChild(option);
                });
            }
        } catch (err) {
            console.error("Error loading specializations:", err);
        }
    }

    loadSpecializations();

    // ======================== Add Doctor ========================
    async function registerDoctor(form) {
        const formData = new FormData(form);

        const requiredFields = ["name", "email", "password", "license_number", "specialization"];
        for (let field of requiredFields) {
            if (!formData.get(field)) {
                showAlert("error", `Please fill in the ${field.replace("_", " ")} field.`);
                return;
            }
        }

        const doctorData = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            license_number: formData.get("license_number"),
            specialization: formData.get("specialization"),
            years_experience: formData.get("years_experience") || null
        };

        try {
            const payload = new FormData();
            payload.append("operation", "registerDoctor");
            payload.append("json", JSON.stringify(doctorData));

            const response = await axios.post(`${baseApiUrl}/user.php`, payload);

            if (response.data.success) {
                showAlert("success", "Doctor registered successfully!");
                bootstrap.Modal.getInstance(document.getElementById("addDoctorModal"))?.hide();
                form.reset();
                loadDoctors();
            } else {
                showAlert("error", response.data.message);
            }
        } catch (error) {
            console.error("Error registering doctor:", error);
            showAlert("error", "Failed to register doctor. Please try again.");
        }
    }

    // Hook Save Doctor Button (instead of form submit)
    const addDoctorForm = document.getElementById("addDoctorForm");
    const saveDoctorBtn = document.getElementById("saveDoctorBtn");

    saveDoctorBtn?.addEventListener("click", () => {
        if (addDoctorForm) {
            registerDoctor(addDoctorForm);
        }
    });

    // Hook standalone registration form (if exists)
    const doctorRegisterForm = document.getElementById("doctor-register-form");
    doctorRegisterForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        registerDoctor(doctorRegisterForm);
    });

    // ======================== Sidebar Toggle ========================
    const sidebar = document.getElementById("sidebar-wrapper");
    const toggleBtn = document.querySelector(".offcanvas-toggle-btn");

    toggleBtn?.addEventListener("click", () => {
        sidebar.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        if (
            window.innerWidth <= 991.98 &&
            sidebar.classList.contains("show") &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)
        ) {
            sidebar.classList.remove("show");
        }
    });

    // ======================== Load Doctors ========================
    loadDoctors();

    async function loadDoctors() {
        try {
            const response = await axios.get(`${baseApiUrl}/doctors.php?operation=getAll`);

            if (response.data.success) {
                displayDoctors(response.data.doctors);
            } else {
                showAlert("error", "Failed to load doctors: " + response.data.message);
            }
        } catch (error) {
            console.error("Error loading doctors:", error);
            showAlert("error", "Failed to load doctors. Please try again.");
        }
    }

    function displayDoctors(doctors) {
        const tbody = document.getElementById("doctorsTableBody");
        tbody.innerHTML = "";

        if (doctors.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-user-doctor fa-3x mb-3"></i>
                        <p>No doctors found</p>
                    </td>
                </tr>
            `;
            return;
        }

        doctors.forEach((doctor) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                            <i class="fas fa-user-doctor"></i>
                        </div>
                        <div>
                            <div class="fw-semibold">${doctor.name}</div>
                            <small class="text-muted">ID: ${doctor.doctor_id}</small>
                        </div>
                    </div>
                </td>
                <td>${doctor.email}</td>
                <td><span class="badge bg-info">${doctor.license_number || "N/A"}</span></td>
                <td>${doctor.specialization_name || "Not specified"}</td>
                <td>${doctor.years_experience ? doctor.years_experience + " years" : "Not specified"}</td>
                <td><span class="badge bg-success">Active</span></td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="editDoctor(${doctor.doctor_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteDoctor(${doctor.doctor_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // ======================== Edit Doctor ========================
    window.editDoctor = async function (doctorId) {
        try {
            const response = await axios.get(`${baseApiUrl}/doctors.php?operation=getById&doctor_id=${doctorId}`);

            if (response.data.success) {
                populateEditForm(response.data.doctor);
                bootstrap.Modal.getOrCreateInstance(document.getElementById("editDoctorModal")).show();
            } else {
                showAlert("error", response.data.message);
            }
        } catch (error) {
            console.error("Error loading doctor details:", error);
            showAlert("error", "Failed to load doctor details.");
        }
    };

    function populateEditForm(doctor) {
        document.getElementById("editDoctorId").value = doctor.doctor_id;
        document.getElementById("editDoctorName").value = doctor.name;
        document.getElementById("editDoctorEmail").value = doctor.email;
        document.getElementById("editDoctorLicense").value = doctor.license_number;
        document.getElementById("editDoctorSpecialization").value = doctor.specialization || "";
        document.getElementById("editDoctorExperience").value = doctor.years_experience || "";
    }

    window.updateDoctor = async function () {
        const form = document.getElementById("editDoctorForm");
        const formData = new FormData(form);

        const doctorData = {
            doctor_id: formData.get("doctor_id"),
            name: formData.get("name"),
            email: formData.get("email"),
            license_number: formData.get("license_number"),
            specialization: formData.get("specialization"),
            years_experience: formData.get("years_experience") || null
        };

        try {
            const response = await axios.post(`${baseApiUrl}/doctors.php`, {
                operation: "update",
                json: JSON.stringify(doctorData)
            });

            if (response.data.success) {
                showAlert("success", "Doctor updated successfully!");
                bootstrap.Modal.getInstance(document.getElementById("editDoctorModal")).hide();
                loadDoctors();
            } else {
                showAlert("error", response.data.message);
            }
        } catch (error) {
            console.error("Error updating doctor:", error);
            showAlert("error", "Failed to update doctor. Please try again.");
        }
    };

    // ======================== Delete Doctor ========================
    window.deleteDoctor = async function (doctorId) {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This action cannot be undone!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.post(`${baseApiUrl}/doctors.php`, {
                    operation: "delete",
                    doctor_id: doctorId
                });

                if (response.data.success) {
                    showAlert("success", "Doctor deleted successfully!");
                    loadDoctors();
                } else {
                    showAlert("error", response.data.message);
                }
            } catch (error) {
                console.error("Error deleting doctor:", error);
                showAlert("error", "Failed to delete doctor. Please try again.");
            }
        }
    };

    // ======================== Helper Alert ========================
    function showAlert(type, message) {
        Swal.fire({
            icon: type,
            title: type === "success" ? "Success!" : "Error!",
            text: message,
            timer: type === "success" ? 2000 : undefined,
            timerProgressBar: type === "success"
        });
    }
});
