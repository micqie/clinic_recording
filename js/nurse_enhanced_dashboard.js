document.addEventListener('DOMContentLoaded', () => {
    console.log('nurse_enhanced_dashboard.js version 20251030-1 loaded');
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    if (!user.id) {
        window.location.href = '../../index.html';
        return;
    }

    // Get nurse ID from user context
    let nurseId = null;

    // DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const nurseQueueTableBody = document.getElementById('nurseQueueTableBody');
    const walkInForm = document.getElementById('walkInForm');
    const createWalkInBtn = document.getElementById('createWalkInBtn');
    const nurseAssessmentForm = document.getElementById('nurseAssessmentForm');
    const saveAssessmentBtn = document.getElementById('saveAssessmentBtn');

    // Count elements
    const waitingCount = document.getElementById('waitingCount');
    const withNurseCount = document.getElementById('withNurseCount');
    const readyForDoctorCount = document.getElementById('readyForDoctorCount');
    const completedCount = document.getElementById('completedCount');

    // Initialize
    initializeNurse().then(() => {
        loadNurseQueue();
        loadPatients();
        loadAppointmentReasons();
    });

    // Event listeners
    refreshBtn?.addEventListener('click', () => {
        console.log('Manual refresh clicked');
        loadNurseQueue();
    });
    createWalkInBtn?.addEventListener('click', createWalkIn);
    saveAssessmentBtn?.addEventListener('click', saveNurseAssessment);

    // Initialize nurse context
    async function initializeNurse() {
        try {
            console.log('Initializing nurse with user ID:', user.id);
            const userParams = new URLSearchParams();
            userParams.append('operation', 'get_user_context');
            userParams.append('json', JSON.stringify({ user_id: user.id }));

            const response = await axios.post(`${baseApiUrl}/user.php`, userParams, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            console.log('User context response:', response.data);

            if (response.data?.success && response.data?.context?.nurse_id) {
                nurseId = response.data.context.nurse_id;
                console.log('Nurse ID found:', nurseId);
                document.getElementById('assessment_nurse_id').value = nurseId;

                // Reload the queue now that nurse ID is available
                loadNurseQueue();
            } else {
                console.log('No nurse ID found. User role:', response.data?.context?.role_name);
                // Try to create nurse profile for any user
                try {
                    const createParams = new URLSearchParams();
                    createParams.append('operation', 'create_if_missing');
                    createParams.append('json', JSON.stringify({ user_id: user.id }));

                    const createResp = await axios.post(`${baseApiUrl}/nurses.php`, createParams, {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });

                    console.log('Create nurse profile response:', createResp.data);

                    if (createResp.data?.success && createResp.data?.nurse_id) {
                        nurseId = createResp.data.nurse_id;
                        console.log('Nurse profile created with ID:', nurseId);
                        document.getElementById('assessment_nurse_id').value = nurseId;

                        // Show success message
                        Swal.fire({
                            icon: 'success',
                            title: 'Nurse Profile Created',
                            text: 'Your nurse profile has been created successfully!',
                            timer: 3000,
                            showConfirmButton: false
                        });

                        // Reload the queue now that nurse ID is available
                        loadNurseQueue();
                    } else {
                        console.error('Failed to create nurse profile:', createResp.data);
                        Swal.fire({
                            icon: 'error',
                            title: 'Nurse Profile Not Found',
                            text: createResp.data?.message || 'Please contact administrator to set up your nurse profile.'
                        });
                    }
                } catch (e) {
                    console.error('Error creating nurse profile:', e);
                    Swal.fire({
                        icon: 'error',
                        title: 'Nurse Profile Not Found',
                        text: 'Please contact administrator to set up your nurse profile.'
                    });
                }
            }
        } catch (error) {
            console.error('Error initializing nurse:', error);
        }
    }

    // Load nurse queue
    async function loadNurseQueue() {
        console.log('Loading nurse queue with nurse ID:', nurseId);

        if (!nurseId) {
            console.log('Nurse ID not available yet, skipping queue load');
            nurseQueueTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Loading nurse profile...</td></tr>';
            return;
        }

        try {
            const response = await axios.get(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                params: {
                    operation: 'get_nurse_queue_status',
                    nurse_id: nurseId,
                    date: new Date().toISOString().split('T')[0]
                }
            });

            console.log('Nurse queue API response:', response.data);

            if (response.data?.success) {
                displayNurseQueue(response.data.data);
                updateQueueCounts(response.data.data);
            } else {
                console.error('Failed to load nurse queue:', response.data?.message);
                nurseQueueTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No patients in queue</td></tr>';
            }
        } catch (error) {
            console.error('Error loading nurse queue:', error);
            nurseQueueTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading queue</td></tr>';
        }
    }

    // Display nurse queue
    function displayNurseQueue(appointments) {
        if (!appointments || appointments.length === 0) {
            nurseQueueTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No patients in queue</td></tr>';
            return;
        }

        nurseQueueTableBody.innerHTML = appointments.map(appointment => {
            const statusBadge = getStatusBadge(appointment.appointment_status);
            const actions = getActionButtons(appointment);
            const assignedDoctor = appointment.doctor_name ? `Dr. ${appointment.doctor_name}` : '<span class="text-muted">Unassigned</span>';

            return `
                <tr>
                    <td>${appointment.queue_number || 'N/A'}</td>
                    <td>${appointment.patient_name}</td>
                    <td>${appointment.patient_contact || 'N/A'}</td>
                    <td>${appointment.appointment_reason || 'N/A'}</td>
                    <td>${assignedDoctor}</td>
                    <td>${statusBadge}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    }

    // Get status badge
    function getStatusBadge(status) {
        const badges = {
            'Ready for Nurse': '<span class="badge bg-warning status-badge">Ready for Nurse</span>',
            'With Nurse': '<span class="badge bg-info status-badge">With Nurse</span>',
            'Ready for Doctor': '<span class="badge bg-success status-badge">Ready for Doctor</span>',
            'Completed': '<span class="badge bg-primary status-badge">Completed</span>'
        };
        return badges[status] || '<span class="badge bg-secondary status-badge">Unknown</span>';
    }

    // Get action buttons
    function getActionButtons(appointment) {
        const actions = [];

        if (appointment.appointment_status === 'Ready for Nurse') {
            actions.push(`
                <button class="btn btn-sm btn-success me-1" onclick="startNurseConsultation(${appointment.appointment_id})" title="Start patient assessment">
                    <i class="fas fa-user-nurse"></i> Start Assessment
                </button>
            `);
        } else if (appointment.appointment_status === 'With Nurse') {
            actions.push(`
                <button class="btn btn-sm btn-primary me-1" onclick="openNurseAssessment(${appointment.appointment_id}, '${appointment.patient_name}', '${appointment.patient_contact || ''}', '${encodeURIComponent(appointment.appointment_reason || '')}')" title="Record vitals and medical history">
                    <i class="fas fa-heartbeat"></i> Record Vitals & History
                </button>
            `);
        } else if (appointment.appointment_status === 'Ready for Doctor') {
            actions.push(`
                <span class="badge bg-success">Ready for Doctor</span>
            `);
        }

        return actions.join('');
    }

    // Update queue counts
    function updateQueueCounts(appointments) {
        const counts = {
            waiting: 0,
            withNurse: 0,
            readyForDoctor: 0,
            completed: 0
        };

        appointments.forEach(appointment => {
            switch (appointment.appointment_status) {
                case 'Ready for Nurse':
                    counts.waiting++;
                    break;
                case 'With Nurse':
                    counts.withNurse++;
                    break;
                case 'Ready for Doctor':
                    counts.readyForDoctor++;
                    break;
                case 'Completed':
                    counts.completed++;
                    break;
            }
        });

        waitingCount.textContent = counts.waiting;
        withNurseCount.textContent = counts.withNurse;
        readyForDoctorCount.textContent = counts.readyForDoctor;
        completedCount.textContent = counts.completed;
    }

    // Start nurse consultation
    window.startNurseConsultation = async function(appointmentId) {
        console.log('Starting nurse consultation for appointment:', appointmentId, 'with nurse ID:', nurseId);

        // Check if nurse ID is available
        if (!nurseId) {
            console.error('Nurse ID not available');
            Swal.fire({
                icon: 'error',
                title: 'Nurse Profile Not Found',
                text: 'Please refresh the page or contact administrator to set up your nurse profile.'
            });
            return;
        }

        try {
            const params = new URLSearchParams();
            params.append('operation', 'start_nurse_consultation');
            params.append('json', JSON.stringify({
                appointment_id: appointmentId,
                nurse_id: nurseId
            }));

            const response = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            console.log('Start consultation response:', response.data);

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Assessment Started',
                    text: 'Patient assessment has been started. Please record vitals and medical history.',
                    timer: 2000,
                    showConfirmButton: false
                });
                loadNurseQueue();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to start consultation', 'error');
            }
        } catch (error) {
            console.error('Error starting nurse consultation:', error);
            Swal.fire('Error', 'Failed to start nurse consultation', 'error');
        }
    };

    // Open nurse assessment modal
    window.openNurseAssessment = function(appointmentId, patientName, patientContact, encodedReasonText) {
        console.log('Opening nurse assessment for appointment:', appointmentId, 'with nurse ID:', nurseId, 'encodedReason:', encodedReasonText);

        // Clear form first
        nurseAssessmentForm.reset();

        // Set the required values after reset
        document.getElementById('assessment_appointment_id').value = appointmentId;
        document.getElementById('assessment_nurse_id').value = nurseId;
        document.getElementById('patient_name').value = patientName;
        document.getElementById('patient_contact').value = patientContact;

        const modal = new bootstrap.Modal(document.getElementById('nurseAssessmentModal'));
        modal.show();

        // Immediate prefill from queue data if provided
        const ccElInitial = document.getElementById('chief_complaint');
        if (ccElInitial) {
            const decodedReason = encodedReasonText ? decodeURIComponent(encodedReasonText) : '';
            console.log('Prefill decoded reason:', decodedReason);
            if (decodedReason) {
                ccElInitial.value = `Reason: ${decodedReason}`;
            } else {
                ccElInitial.value = '';
            }
            ccElInitial.setAttribute('readonly', 'readonly');
        }

        // Auto-fill Chief Complaint (reason) and Additional Notes (notes)
        // and keep them read-only so nurse doesn't need to retype
        (async () => {
            try {
                const resp = await axios.get(`${baseApiUrl}/appointments.php`, {
                    params: {
                        operation: 'get_appointment_details',
                        appointment_id: appointmentId
                    }
                });
                console.log('Appointment details for chief complaint:', resp?.data);
                const appt = resp?.data?.data || null;
                const ccEl = document.getElementById('chief_complaint');
                const notesEl = document.getElementById('appointment_additional_notes');
                if (ccEl) {
                    let reason = appt?.reason_name || appt?.reason_description || '';
                    let notes = appt?.appointment_notes || '';
                    // Keep chief complaint strictly as reason; preserve prefill if API has no reason
                    ccEl.value = reason ? `Reason: ${reason}` : (ccEl.value || '');
                    // Ensure read-only remains enforced
                    ccEl.setAttribute('readonly', 'readonly');
                    // Set additional notes separately
                    if (notesEl) {
                        notesEl.value = notes || '';
                        notesEl.setAttribute('readonly', 'readonly');
                    }
                }
            } catch (e) {
                console.error('Failed to load appointment details for chief complaint:', e);
            }
        })();

        // Ensure form is properly initialized
        setTimeout(() => {
            console.log('Form values after modal show:', {
                appointment_id: document.getElementById('assessment_appointment_id').value,
                nurse_id: document.getElementById('assessment_nurse_id').value,
                patient_name: document.getElementById('patient_name').value
            });
        }, 100);
    };

    // Save nurse assessment
    async function saveNurseAssessment() {
        if (!nurseAssessmentForm.checkValidity()) {
            nurseAssessmentForm.classList.add('was-validated');
            return;
        }

        // Check if nurse ID is available
        if (!nurseId) {
            Swal.fire({
                icon: 'error',
                title: 'Nurse Profile Not Found',
                text: 'Please refresh the page or contact administrator to set up your nurse profile.'
            });
            return;
        }

        // Check if appointment ID is available
        const appointmentId = document.getElementById('assessment_appointment_id').value;
        if (!appointmentId) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Information',
                text: 'Appointment ID is missing. Please close and reopen the assessment form.'
            });
            return;
        }

        const formData = new FormData(nurseAssessmentForm);
        const data = {
            appointment_id: appointmentId, // Use the validated appointment ID
            nurse_id: nurseId, // Use the global nurseId instead of form data
            chief_complaint: formData.get('chief_complaint'),
            height_cm: formData.get('height_cm') || null,
            weight_kg: formData.get('weight_kg') || null,
            temperature_celsius: formData.get('temperature_celsius') || null,
            blood_pressure_mmHg: formData.get('blood_pressure_mmHg') || null,
            heart_rate_bpm: formData.get('heart_rate_bpm') || null,
            spo2_percent: formData.get('spo2_percent') || null,
            past_medical_history: formData.get('past_medical_history') || null,
            current_medications: formData.get('current_medications') || null,
            family_history: formData.get('family_history') || null,
            social_history: formData.get('social_history') || null,
            nurse_assessment: formData.get('nurse_assessment'),
            patient_ready_for_doctor: formData.get('patient_ready_for_doctor') === '1' ? true : false
        };

        console.log('Saving nurse assessment with data:', data);

        try {
            // Save nurse assessment
            const params = new URLSearchParams();
            params.append('operation', 'save_nurse_assessment');
            params.append('json', JSON.stringify(data));

            const assessmentResponse = await axios.post(`${baseApiUrl}/nurse_enhanced_v2.php`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            console.log('Nurse assessment API response:', assessmentResponse.data);

            if (assessmentResponse.data?.success) {
                // Complete nurse consultation
                const completeParams = new URLSearchParams();
                completeParams.append('operation', 'complete_nurse_consultation');
                completeParams.append('json', JSON.stringify({
                    appointment_id: data.appointment_id,
                    nurse_id: data.nurse_id
                }));

                const completeResponse = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, completeParams, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });

                if (completeResponse.data?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Assessment Complete!',
                        text: 'Patient vitals and history recorded. Patient has been forwarded to their assigned doctor.',
                        timer: 3000,
                        showConfirmButton: false
                    });

                    bootstrap.Modal.getInstance(document.getElementById('nurseAssessmentModal'))?.hide();
                    loadNurseQueue();
                } else {
                    Swal.fire('Error', completeResponse.data?.message || 'Failed to complete consultation', 'error');
                }
            } else {
                Swal.fire('Error', assessmentResponse.data?.message || 'Failed to save assessment', 'error');
            }
        } catch (error) {
            console.error('Error saving nurse assessment:', error);
            Swal.fire('Error', 'Failed to save nurse assessment', 'error');
        }
    }

    // Load patients for walk-in
    async function loadPatients() {
        try {
            const response = await axios.get(`${baseApiUrl}/patients.php`, {
                params: { operation: 'get_all_patients' }
            });

            if (response.data?.success) {
                const patientSelect = walkInForm.querySelector('select[name="patient_id"]');
                patientSelect.innerHTML = '<option value="">Select patient...</option>' +
                    response.data.data.map(patient =>
                        `<option value="${patient.patient_id}">${patient.name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    // Load appointment reasons
    async function loadAppointmentReasons() {
        try {
            const response = await axios.get(`${baseApiUrl}/appointment_reasons.php`, {
                params: { operation: 'get_all_reasons' }
            });

            if (response.data?.success) {
                const reasonSelect = walkInForm.querySelector('select[name="appointment_reason_id"]');
                reasonSelect.innerHTML = '<option value="">Select reason...</option>' +
                    response.data.data.map(reason =>
                        `<option value="${reason.reason_id}">${reason.reason_name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading appointment reasons:', error);
        }
    }

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
            appointment_notes: formData.get('appointment_notes') || null,
            appointment_date: new Date().toISOString().split('T')[0],
            is_walk_in: true
        };

        try {
            const params = new URLSearchParams();
            params.append('operation', 'create_appointment');
            params.append('json', JSON.stringify(data));

            const response = await axios.post(`${baseApiUrl}/appointments.php`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Walk-in Created',
                    text: 'Walk-in appointment has been created successfully.',
                    timer: 2000,
                    showConfirmButton: false
                });

                bootstrap.Modal.getInstance(document.getElementById('walkInModal'))?.hide();
                walkInForm.reset();
                walkInForm.classList.remove('was-validated');
                loadNurseQueue();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to create walk-in', 'error');
            }
        } catch (error) {
            console.error('Error creating walk-in:', error);
            Swal.fire('Error', 'Failed to create walk-in appointment', 'error');
        }
    }

    // Auto-refresh every 30 seconds
    setInterval(loadNurseQueue, 30000);

    // Debug function to check all appointments
    window.debugCheckAllAppointments = async function() {
        try {
            const response = await axios.get(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                params: {
                    operation: 'get_current_queue_status',
                    date: new Date().toISOString().split('T')[0]
                }
            });
            console.log('All appointments (debug):', response.data);
        } catch (error) {
            console.error('Debug check failed:', error);
        }
    };
});
