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
                    option.value = spec.specialization_id;
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
                    option.value = spec.specialization_id;
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

        const requiredFields = ["name", "email", "password", "license_number"];
        for (let field of requiredFields) {
            const value = formData.get(field);
            if (!value || value === "") {
                showAlert("error", `Please fill in the ${field.replace("_", " ")} field.`);
                return;
            }
        }

        // Check specialization separately since it can be optional
        const specialization_id = formData.get("specialization_id");
        if (!specialization_id || specialization_id === "") {
            showAlert("error", "Please select a specialization.");
            return;
        }

        const doctorData = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            license_number: formData.get("license_number"),
            specialization_id: formData.get("specialization_id"),
            years_experience: formData.get("years_experience") || null
        };

        try {
            const payload = new FormData();
            payload.append("operation", "add");
            payload.append("json", JSON.stringify(doctorData));

            const response = await axios.post(`${baseApiUrl}/doctors.php`, payload);

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
            const isActive = doctor.is_active === undefined ? true : (Number(doctor.is_active) === 1);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                            <i class="fas fa-user-doctor"></i>
                        </div>
                        <div>
                            <div class="fw-semibold">${doctor.name}</div>
                        </div>
                    </div>
                </td>
                <td>${doctor.email}</td>
                <td><span class="badge bg-info">${doctor.license_number || "N/A"}</span></td>
                <td>${doctor.specialization_name || "Not specified"}</td>
                <td>${doctor.years_experience ? doctor.years_experience + " years" : "Not specified"}</td>
                <td><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleDoctor(${doctor.doctor_id}, ${isActive ? 1 : 0})">
                            <i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
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
            // Ensure specializations are loaded before populating form
            await loadSpecializations();
            const response = await axios.get(`${baseApiUrl}/doctors.php?operation=getById&doctor_id=${doctorId}`);
            if (response.data.success) {
                populateEditForm(response.data.doctor);
                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("editDoctorModal"));
                modal.show();
            } else {
                showAlert("error", response.data.message);
            }
        } catch (error) {
            console.error("Error loading doctor details:", error);
            showAlert("error", "Failed to load doctor details.");
        }
    };

    function populateEditForm(doctor) {
        console.log("Populating edit form with doctor data:", doctor);

        document.getElementById("editDoctorId").value = doctor.doctor_id;
        document.getElementById("editDoctorName").value = doctor.name;
        document.getElementById("editDoctorEmail").value = doctor.email;
        document.getElementById("editDoctorLicense").value = doctor.license_number;
        document.getElementById("editDoctorExperience").value = doctor.years_experience || "";

        // Set specialization by id value directly
        const specializationSelect = document.getElementById("editDoctorSpecialization");
        if (specializationSelect) {
            specializationSelect.value = doctor.specialization_id ?? "";
        }
    }

    window.updateDoctor = async function () {
        const form = document.getElementById("editDoctorForm");
        const formData = new FormData(form);

        // Validate required fields
        const specialization_id = formData.get("specialization_id");
        if (!specialization_id || specialization_id === "") {
            showAlert("error", "Please select a specialization.");
            return;
        }

        const doctorData = {
            doctor_id: formData.get("doctor_id"),
            name: formData.get("name"),
            email: formData.get("email"),
            license_number: formData.get("license_number"),
            specialization_id: specialization_id,
            years_experience: formData.get("years_experience") || null
        };

        console.log("Doctor update data:", doctorData);

        try {
            console.log("Sending doctor update request:", doctorData);
            const payload = new FormData();
            payload.append("operation", "update");
            payload.append("json", JSON.stringify(doctorData));
            const response = await axios.post(`${baseApiUrl}/doctors.php`, payload);
            console.log("Doctor update response:", response.data);

            if (response.data.success) {
                showAlert("success", "Doctor updated successfully!");
                bootstrap.Modal.getInstance(document.getElementById("editDoctorModal")).hide();
                loadDoctors();
            } else {
                showAlert("error", response.data.message);
            }
        } catch (error) {
            console.error("Error updating doctor:", error);
            console.error("Error response:", error.response?.data);
            showAlert("error", "Failed to update doctor: " + (error.response?.data?.message || error.message));
        }
    };

    // Connect update button to the updateDoctor function
    const updateDoctorBtn = document.getElementById("updateDoctorBtn");
    updateDoctorBtn?.addEventListener("click", updateDoctor);

    // ======================== Toggle Active Doctor ========================
    window.toggleDoctor = async function (doctorId, currentlyActive) {
        const action = currentlyActive ? 'Deactivate' : 'Activate';
        const confirm = await Swal.fire({
            title: `${action} account?`,
            text: `This will ${action.toLowerCase()} the doctor's account.`,
            icon: currentlyActive ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: action,
            cancelButtonText: 'Cancel'
        });
        if (!confirm.isConfirmed) return;
        try {
            const payload = new FormData();
            payload.append("operation", "toggle_active");
            payload.append("doctor_id", doctorId);
            const response = await axios.post(`${baseApiUrl}/doctors.php`, payload);
            if (response.data.success) {
                await Swal.fire({ icon: 'success', title: `Account ${currentlyActive ? 'deactivated' : 'activated'}` });
                loadDoctors();
            } else {
                showAlert("error", response.data.message);
            }
        } catch (error) {
            console.error("Error toggling doctor:", error);
            showAlert("error", "Failed to update status. Please try again.");
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
