document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    // Ensure user exists and is a nurse
    if (!user?.id || user.role?.toLowerCase() !== 'nurse') {
        window.location.href = '/clinic_recording/index.html';
        return;
    }

    // DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const currentPatientCard = document.getElementById('currentPatientCard');
    const completeTriageBtn = document.getElementById('completeTriageBtn');
    const walkInForm = document.getElementById('walkInForm');
    const triageForm = document.getElementById('triageForm');
    const createWalkInBtn = document.getElementById('createWalkInBtn');
    const saveTriageBtn = document.getElementById('saveTriageBtn');
    const addIllnessBtn = document.getElementById('addIllnessBtn');
    const saveIllnessBtn = document.getElementById('saveIllnessBtn');
    const illnessSelect = document.getElementById('illnessSelect');
    const selectedIllnesses = document.getElementById('selectedIllnesses');

    let currentAppointment = null;
    let selectedIllnessList = [];

    // Load initial data
    loadTodayAppointments();
    loadPatients();
    loadAppointmentReasons();
    loadIllnesses();

    // Event listeners
    refreshBtn?.addEventListener('click', loadTodayAppointments);
    createWalkInBtn?.addEventListener('click', createWalkIn);
    saveTriageBtn?.addEventListener('click', saveTriage);
    completeTriageBtn?.addEventListener('click', () => {
        if (currentAppointment) {
            startTriage(currentAppointment);
        }
    });
    addIllnessBtn?.addEventListener('click', addIllness);
    saveIllnessBtn?.addEventListener('click', saveNewIllness);

    // Load today's appointments for nurse triage
    async function loadTodayAppointments() {
        try {
            const response = await axios.get(`${baseApiUrl}/nurse.php?operation=get_triage_queue`);
            if (response.data?.success) {
                displayAppointments(response.data.data);
                updateCurrentPatient(response.data.current_patient);
            } else {
                console.error('Failed to load appointments:', response.data?.message);
                appointmentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load appointments</td></tr>';
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            appointmentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading appointments</td></tr>';
        }
    }

    // Display appointments in table
    function displayAppointments(appointments) {
        if (!appointments || appointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in triage queue</td></tr>';
            return;
        }

        appointmentsTableBody.innerHTML = appointments.map(appointment => {
            const triageStatus = getTriageStatusBadge(appointment.status_name);
            const actionButton = getActionButton(appointment);

            return `
                <tr>
                    <td><strong>#${appointment.queue_number}</strong></td>
                    <td>
                        <div>
                            <strong>${appointment.patient_name}</strong>
                            <br><small class="text-muted">${appointment.patient_email}</small>
                        </div>
                    </td>
                    <td>${appointment.contact_num || 'N/A'}</td>
                    <td>${appointment.reason_name || 'Walk-in'}</td>
                    <td>${triageStatus}</td>
                    <td>${actionButton}</td>
                </tr>
            `;
        }).join('');
    }

    // Get triage status badge
    function getTriageStatusBadge(status) {
        const statusMap = {
            'Waiting for Nurse': '<span class="badge bg-warning">Waiting for Nurse</span>',
            'With Nurse': '<span class="badge bg-info">With Nurse</span>',
            'Nurse Complete': '<span class="badge bg-success">Ready for Doctor</span>',
            'Waiting for Doctor': '<span class="badge bg-primary">Waiting for Doctor</span>'
        };
        return statusMap[status] || '<span class="badge bg-secondary">' + status + '</span>';
    }

    // Get action button based on status
    function getActionButton(appointment) {
        switch (appointment.status_name) {
            case 'Waiting for Nurse':
                return `<button class="btn btn-sm btn-primary" onclick="startTriage(${appointment.appointment_id})">
                    <i class="fas fa-stethoscope me-1"></i>Start Triage
                </button>`;
            case 'With Nurse':
                return `<button class="btn btn-sm btn-info" onclick="continueTriage(${appointment.appointment_id})">
                    <i class="fas fa-edit me-1"></i>Continue Triage
                </button>`;
            case 'Nurse Complete':
                return `<button class="btn btn-sm btn-outline-info" onclick="viewTriage(${appointment.appointment_id})">
                    <i class="fas fa-eye me-1"></i>View Triage
                </button>`;
            default:
                return '<span class="text-muted">-</span>';
        }
    }

    // Update current patient card
    function updateCurrentPatient(patient) {
        if (patient) {
            currentPatientCard.style.display = 'block';
            document.getElementById('currentPatientName').textContent = patient.patient_name;
            document.getElementById('currentPatientDetails').textContent =
                `Queue #${patient.queue_number} • Age: ${patient.age} • ${patient.sex}`;
            currentAppointment = patient;
        } else {
            currentPatientCard.style.display = 'none';
            currentAppointment = null;
        }
    }

    // Start triage (global function for onclick)
    window.startTriage = function(appointmentId) {
        // Find appointment data
        const appointment = findAppointmentById(appointmentId);
        if (appointment) {
            populateTriageForm(appointment);
            bootstrap.Modal.getInstance(document.getElementById('triageModal')) ||
            new bootstrap.Modal(document.getElementById('triageModal')).show();
        }
    };

    // Continue triage (global function for onclick)
    window.continueTriage = function(appointmentId) {
        startTriage(appointmentId);
    };

    // View triage (global function for onclick)
    window.viewTriage = function(appointmentId) {
        // Load existing triage data and show in read-only mode
        loadExistingTriage(appointmentId);
    };

    // Find appointment by ID
    function findAppointmentById(appointmentId) {
        // This would need to be implemented based on your data structure
        // For now, we'll use the current appointment
        return currentAppointment;
    }

    // Populate triage form
    function populateTriageForm(appointment) {
        document.getElementById('triage_appointment_id').value = appointment.appointment_id;
        document.getElementById('triage_patient_name').textContent = appointment.patient_name;
        document.getElementById('triage_patient_age').textContent = appointment.age;
        document.getElementById('triage_patient_gender').textContent = appointment.sex;
        document.getElementById('triage_patient_contact').textContent = appointment.contact_num || 'N/A';
        document.getElementById('triage_appointment_reason').textContent = appointment.reason_name || 'Walk-in';

        // Clear form
        triageForm.reset();
        selectedIllnessList = [];
        updateSelectedIllnesses();
    }

    // Load existing triage data
    async function loadExistingTriage(appointmentId) {
        try {
            const response = await axios.get(`${baseApiUrl}/nurse.php?operation=get_triage_data&appointment_id=${appointmentId}`);
            if (response.data?.success) {
                const data = response.data.data;
                populateTriageForm(data.appointment);

                // Populate form with existing data
                if (data.vitals) {
                    Object.keys(data.vitals).forEach(key => {
                        const field = triageForm.querySelector(`[name="${key}"]`);
                        if (field) field.value = data.vitals[key] || '';
                    });
                }

                if (data.history) {
                    Object.keys(data.history).forEach(key => {
                        const field = triageForm.querySelector(`[name="${key}"]`);
                        if (field) field.value = data.history[key] || '';
                    });
                }

                if (data.lifestyle) {
                    Object.keys(data.lifestyle).forEach(key => {
                        const field = triageForm.querySelector(`[name="${key}"]`);
                        if (field) {
                            if (field.type === 'radio') {
                                const radio = triageForm.querySelector(`[name="${key}"][value="${data.lifestyle[key]}"]`);
                                if (radio) radio.checked = true;
                            } else {
                                field.value = data.lifestyle[key] || '';
                            }
                        }
                    });
                }

                // Make form read-only
                triageForm.querySelectorAll('input, textarea, select').forEach(field => {
                    field.disabled = true;
                });

                bootstrap.Modal.getInstance(document.getElementById('triageModal')) ||
                new bootstrap.Modal(document.getElementById('triageModal')).show();
            }
        } catch (error) {
            console.error('Error loading triage data:', error);
            Swal.fire('Error', 'Failed to load triage data', 'error');
        }
    }

    // Save triage data
    async function saveTriage() {
        if (!triageForm.checkValidity()) {
            triageForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(triageForm);
        const data = {
            appointment_id: formData.get('appointment_id'),
            // Vitals
            height_cm: formData.get('height_cm'),
            weight_kg: formData.get('weight_kg'),
            blood_pressure_mmHg: formData.get('blood_pressure_mmHg'),
            heart_rate_bpm: formData.get('heart_rate_bpm'),
            temperature_celsius: formData.get('temperature_celsius'),
            spo2_percent: formData.get('spo2_percent'),
            // History
            past_medical_history: formData.get('past_medical_history'),
            past_surgical_history: formData.get('past_surgical_history'),
            family_history: formData.get('family_history'),
            social_history: formData.get('social_history'),
            current_medications: formData.get('current_medications'),
            // Lifestyle
            smoking_status: formData.get('smoking_status'),
            smoking_packs_per_day: formData.get('smoking_packs_per_day'),
            alcohol_use: formData.get('alcohol_use'),
            alcohol_frequency: formData.get('alcohol_frequency'),
            sexual_activity: formData.get('sexual_activity'),
            // Nurse assessment
            nurse_notes: formData.get('nurse_notes'),
            patient_ready_for_doctor: formData.get('patient_ready_for_doctor') === 'on',
            // Illnesses
            selected_illnesses: selectedIllnessList,
            recorded_by_nurse_id: user.id
        };

        try {
            const response = await axios.post(`${baseApiUrl}/nurse.php`, new URLSearchParams({
                operation: 'complete_triage',
                json: JSON.stringify(data)
            }));

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Triage Complete',
                    text: 'Patient is ready for doctor consultation',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Check for abnormal vitals alerts
                if (response.data.alerts && response.data.alerts.length > 0) {
                    showAbnormalVitalsAlert(response.data.alerts);
                }

                triageForm.reset();
                triageForm.classList.remove('was-validated');
                bootstrap.Modal.getInstance(document.getElementById('triageModal'))?.hide();
                loadTodayAppointments();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to complete triage', 'error');
            }
        } catch (error) {
            console.error('Error saving triage:', error);
            Swal.fire('Error', 'Failed to complete triage', 'error');
        }
    }

    // Show abnormal vitals alert
    function showAbnormalVitalsAlert(alerts) {
        const alertText = alerts.map(alert =>
            `${alert.vital_type}: ${alert.recorded_value} (Normal: ${alert.normal_range}) - ${alert.severity.toUpperCase()}`
        ).join('\n');

        Swal.fire({
            icon: 'warning',
            title: 'Abnormal Vital Signs Detected',
            text: alertText,
            confirmButtonText: 'Acknowledge'
        });
    }

    // Load patients for walk-in dropdown
    async function loadPatients() {
        try {
            const response = await axios.get(`${baseApiUrl}/patients.php?operation=get_all`);
            if (response.data?.success) {
                const patientSelect = walkInForm?.querySelector('select[name="patient_id"]');
                if (patientSelect) {
                    patientSelect.innerHTML = '<option value="">Select patient...</option>' +
                        response.data.data.map(patient =>
                            `<option value="${patient.patient_id}">${patient.name} (${patient.email})</option>`
                        ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    // Load appointment reasons for walk-in dropdown
    async function loadAppointmentReasons() {
        try {
            const response = await axios.get(`${baseApiUrl}/nurse.php?operation=get_appointment_reasons`);
            if (response.data?.success) {
                const reasonSelect = walkInForm?.querySelector('select[name="appointment_reason_id"]');
                if (reasonSelect) {
                    reasonSelect.innerHTML = '<option value="">Select reason...</option>' +
                        response.data.data.map(reason =>
                            `<option value="${reason.reason_id}">${reason.reason_name}</option>`
                        ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading appointment reasons:', error);
        }
    }

    // Load illnesses for selection
    async function loadIllnesses() {
        try {
            const response = await axios.get(`${baseApiUrl}/illnesses.php?operation=get_all`);
            if (response.data?.success) {
                illnessSelect.innerHTML = '<option value="">Select illness...</option>' +
                    response.data.data.map(illness =>
                        `<option value="${illness.illness_id}">${illness.illness_name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading illnesses:', error);
        }
    }

    // Add illness to selected list
    function addIllness() {
        const selectedOption = illnessSelect.options[illnessSelect.selectedIndex];
        if (selectedOption.value && !selectedIllnessList.find(i => i.id === selectedOption.value)) {
            selectedIllnessList.push({
                id: selectedOption.value,
                name: selectedOption.text
            });
            updateSelectedIllnesses();
            illnessSelect.selectedIndex = 0;
        }
    }

    // Update selected illnesses display
    function updateSelectedIllnesses() {
        selectedIllnesses.innerHTML = selectedIllnessList.map((illness, index) =>
            `<span class="badge bg-primary me-2 mb-1">
                ${illness.name}
                <button type="button" class="btn-close btn-close-white ms-1" onclick="removeIllness(${index})"></button>
            </span>`
        ).join('');
    }

    // Remove illness from selected list (global function)
    window.removeIllness = function(index) {
        selectedIllnessList.splice(index, 1);
        updateSelectedIllnesses();
    };

    // Create walk-in appointment
    async function createWalkIn() {
        if (!walkInForm.checkValidity()) {
            walkInForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(walkInForm);
        const data = {
            patient_id: formData.get('patient_id'),
            appointment_reason_id: formData.get('appointment_reason_id') || null,
            other_reason_text: formData.get('other_reason_text') || null,
            appointment_notes: formData.get('appointment_notes') || null
        };

        try {
            const response = await axios.post(`${baseApiUrl}/nurse.php`, new URLSearchParams({
                operation: 'walk_in',
                json: JSON.stringify(data)
            }));

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Walk-in Created',
                    text: `Patient queued as #${response.data.queue_number}`,
                    timer: 2000,
                    showConfirmButton: false
                });
                walkInForm.reset();
                walkInForm.classList.remove('was-validated');
                bootstrap.Modal.getInstance(document.getElementById('walkInModal'))?.hide();
                loadTodayAppointments();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to create walk-in', 'error');
            }
        } catch (error) {
            console.error('Error creating walk-in:', error);
            Swal.fire('Error', 'Failed to create walk-in appointment', 'error');
        }
    }

    // Save new illness
    async function saveNewIllness() {
        const formData = new FormData(document.getElementById('addIllnessForm'));
        const data = {
            illness_name: formData.get('illness_name'),
            illness_description: formData.get('illness_description')
        };

        try {
            const response = await axios.post(`${baseApiUrl}/illnesses.php`, new URLSearchParams({
                operation: 'add',
                json: JSON.stringify(data)
            }));

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Illness Added',
                    text: 'New illness has been added successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
                document.getElementById('addIllnessForm').reset();
                bootstrap.Modal.getInstance(document.getElementById('addIllnessModal'))?.hide();
                loadIllnesses();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to add illness', 'error');
            }
        } catch (error) {
            console.error('Error adding illness:', error);
            Swal.fire('Error', 'Failed to add illness', 'error');
        }
    }
});
