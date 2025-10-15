document.addEventListener('DOMContentLoaded', () => {
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
    initializeNurse();
    loadNurseQueue();
    loadPatients();
    loadAppointmentReasons();

    // Event listeners
    refreshBtn?.addEventListener('click', loadNurseQueue);
    createWalkInBtn?.addEventListener('click', createWalkIn);
    saveAssessmentBtn?.addEventListener('click', saveNurseAssessment);

    // Initialize nurse context
    async function initializeNurse() {
        try {
            const response = await axios.post(`${baseApiUrl}/user.php`, {
                operation: 'get_user_context',
                json: JSON.stringify({ user_id: user.id })
            });

            if (response.data?.success && response.data?.context?.nurse_id) {
                nurseId = response.data.context.nurse_id;
                document.getElementById('assessment_nurse_id').value = nurseId;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Nurse Profile Not Found',
                    text: 'Please contact administrator to set up your nurse profile.'
                });
            }
        } catch (error) {
            console.error('Error initializing nurse:', error);
        }
    }

    // Load nurse queue
    async function loadNurseQueue() {
        try {
            const response = await axios.get(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                params: {
                    operation: 'get_nurse_queue_status',
                    nurse_id: nurseId,
                    date: new Date().toISOString().split('T')[0]
                }
            });

            if (response.data?.success) {
                displayNurseQueue(response.data.data);
                updateQueueCounts(response.data.data);
            } else {
                console.error('Failed to load nurse queue:', response.data?.message);
                nurseQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in queue</td></tr>';
            }
        } catch (error) {
            console.error('Error loading nurse queue:', error);
            nurseQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading queue</td></tr>';
        }
    }

    // Display nurse queue
    function displayNurseQueue(appointments) {
        if (!appointments || appointments.length === 0) {
            nurseQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in queue</td></tr>';
            return;
        }

        nurseQueueTableBody.innerHTML = appointments.map(appointment => {
            const statusBadge = getStatusBadge(appointment.appointment_status);
            const actions = getActionButtons(appointment);
            
            return `
                <tr>
                    <td>${appointment.queue_number || 'N/A'}</td>
                    <td>${appointment.patient_name}</td>
                    <td>${appointment.patient_contact || 'N/A'}</td>
                    <td>${appointment.appointment_reason || 'N/A'}</td>
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
                <button class="btn btn-sm btn-info me-1" onclick="startNurseConsultation(${appointment.appointment_id})">
                    <i class="fas fa-play"></i> Start
                </button>
            `);
        } else if (appointment.appointment_status === 'With Nurse') {
            actions.push(`
                <button class="btn btn-sm btn-primary me-1" onclick="openNurseAssessment(${appointment.appointment_id}, '${appointment.patient_name}', '${appointment.patient_contact || ''}')">
                    <i class="fas fa-stethoscope"></i> Assess
                </button>
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
        try {
            const response = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                operation: 'start_nurse_consultation',
                json: JSON.stringify({
                    appointment_id: appointmentId,
                    nurse_id: nurseId
                })
            });

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Consultation Started',
                    text: 'Nurse consultation has been started successfully.',
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
    window.openNurseAssessment = function(appointmentId, patientName, patientContact) {
        document.getElementById('assessment_appointment_id').value = appointmentId;
        document.getElementById('patient_name').value = patientName;
        document.getElementById('patient_contact').value = patientContact;
        
        // Clear form
        nurseAssessmentForm.reset();
        document.getElementById('assessment_appointment_id').value = appointmentId;
        document.getElementById('assessment_nurse_id').value = nurseId;
        document.getElementById('patient_name').value = patientName;
        document.getElementById('patient_contact').value = patientContact;
        
        const modal = new bootstrap.Modal(document.getElementById('nurseAssessmentModal'));
        modal.show();
    };

    // Save nurse assessment
    async function saveNurseAssessment() {
        if (!nurseAssessmentForm.checkValidity()) {
            nurseAssessmentForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(nurseAssessmentForm);
        const data = {
            appointment_id: formData.get('appointment_id'),
            nurse_id: formData.get('nurse_id'),
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
            patient_ready_for_doctor: formData.get('patient_ready_for_doctor')
        };

        try {
            // Save nurse assessment
            const assessmentResponse = await axios.post(`${baseApiUrl}/nurse_enhanced.php`, {
                operation: 'save_nurse_assessment',
                json: JSON.stringify(data)
            });

            if (assessmentResponse.data?.success) {
                // Complete nurse consultation
                const completeResponse = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                    operation: 'complete_nurse_consultation',
                    json: JSON.stringify({
                        appointment_id: data.appointment_id,
                        nurse_id: data.nurse_id
                    })
                });

                if (completeResponse.data?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Assessment Complete',
                        text: 'Patient has been moved to doctor queue.',
                        timer: 2000,
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
            const response = await axios.post(`${baseApiUrl}/appointments.php`, {
                operation: 'create_appointment',
                json: JSON.stringify(data)
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
});