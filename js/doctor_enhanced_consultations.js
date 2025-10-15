document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    if (!user.id) {
        window.location.href = '../../index.html';
        return;
    }

    // Get doctor ID from user context
    let doctorId = null;
    
    // DOM elements
    const refreshQueueBtn = document.getElementById('refreshQueueBtn');
    const doctorQueueTableBody = document.getElementById('doctorQueueTableBody');
    const consultationForm = document.getElementById('consultationForm');
    const saveConsultationBtn = document.getElementById('saveConsultationBtn');
    const conditionSearch = document.getElementById('conditionSearch');
    const addConditionBtn = document.getElementById('addConditionBtn');
    const selectedConditionsDisplay = document.getElementById('selectedConditionsDisplay');
    const selectedConditions = document.getElementById('selectedConditions');
    const addPrescriptionBtn = document.getElementById('addPrescriptionBtn');
    const prescriptionsContainer = document.getElementById('prescriptionsContainer');

    // State
    let selectedConditionsList = [];
    let conditionsData = [];
    let medicinesData = [];

    // Initialize
    initializeDoctor();
    loadDoctorQueue();
    loadConditions();
    loadMedicines();

    // Event listeners
    refreshQueueBtn?.addEventListener('click', loadDoctorQueue);
    saveConsultationBtn?.addEventListener('click', saveConsultation);
    addConditionBtn?.addEventListener('click', addCondition);
    addPrescriptionBtn?.addEventListener('click', addPrescription);

    // Initialize doctor context
    async function initializeDoctor() {
        try {
            const response = await axios.post(`${baseApiUrl}/user.php`, {
                operation: 'get_user_context',
                json: JSON.stringify({ user_id: user.id })
            });

            if (response.data?.success && response.data?.context?.doctor_id) {
                doctorId = response.data.context.doctor_id;
                document.getElementById('consultation_doctor_id').value = doctorId;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Doctor Profile Not Found',
                    text: 'Please contact administrator to set up your doctor profile.'
                });
            }
        } catch (error) {
            console.error('Error initializing doctor:', error);
        }
    }

    // Load doctor queue
    async function loadDoctorQueue() {
        try {
            const response = await axios.get(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                params: {
                    operation: 'get_doctor_queue_status',
                    doctor_id: doctorId,
                    date: new Date().toISOString().split('T')[0]
                }
            });

            if (response.data?.success) {
                displayDoctorQueue(response.data.data);
            } else {
                console.error('Failed to load doctor queue:', response.data?.message);
                doctorQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in queue</td></tr>';
            }
        } catch (error) {
            console.error('Error loading doctor queue:', error);
            doctorQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading queue</td></tr>';
        }
    }

    // Display doctor queue
    function displayDoctorQueue(appointments) {
        if (!appointments || appointments.length === 0) {
            doctorQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in queue</td></tr>';
            return;
        }

        doctorQueueTableBody.innerHTML = appointments.map(appointment => {
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
            'Ready for Doctor': '<span class="badge bg-warning">Ready for Doctor</span>',
            'With Doctor': '<span class="badge bg-info">With Doctor</span>',
            'Completed': '<span class="badge bg-success">Completed</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
    }

    // Get action buttons
    function getActionButtons(appointment) {
        const actions = [];
        
        if (appointment.appointment_status === 'Ready for Doctor') {
            actions.push(`
                <button class="btn btn-sm btn-info me-1" onclick="startDoctorConsultation(${appointment.appointment_id})">
                    <i class="fas fa-play"></i> Start
                </button>
            `);
        } else if (appointment.appointment_status === 'With Doctor') {
            actions.push(`
                <button class="btn btn-sm btn-primary me-1" onclick="openDoctorConsultation(${appointment.appointment_id}, '${appointment.patient_name}', '${appointment.patient_contact || ''}')">
                    <i class="fas fa-stethoscope"></i> Consult
                </button>
            `);
        }
        
        return actions.join('');
    }

    // Start doctor consultation
    window.startDoctorConsultation = async function(appointmentId) {
        try {
            const response = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                operation: 'start_doctor_consultation',
                json: JSON.stringify({
                    appointment_id: appointmentId,
                    doctor_id: doctorId
                })
            });

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Consultation Started',
                    text: 'Doctor consultation has been started successfully.',
                    timer: 2000,
                    showConfirmButton: false
                });
                loadDoctorQueue();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to start consultation', 'error');
            }
        } catch (error) {
            console.error('Error starting doctor consultation:', error);
            Swal.fire('Error', 'Failed to start doctor consultation', 'error');
        }
    };

    // Open doctor consultation modal
    window.openDoctorConsultation = async function(appointmentId, patientName, patientContact) {
        document.getElementById('consultation_appointment_id').value = appointmentId;
        document.getElementById('consultation_patient_name').value = patientName;
        document.getElementById('consultation_patient_contact').value = patientContact;
        
        // Clear form
        consultationForm.reset();
        document.getElementById('consultation_appointment_id').value = appointmentId;
        document.getElementById('consultation_doctor_id').value = doctorId;
        document.getElementById('consultation_patient_name').value = patientName;
        document.getElementById('consultation_patient_contact').value = patientContact;
        
        // Load patient data
        await loadPatientData(appointmentId);
        
        const modal = new bootstrap.Modal(document.getElementById('consultationModal'));
        modal.show();
    };

    // Load patient data including nurse assessment
    async function loadPatientData(appointmentId) {
        try {
            // Get appointment details
            const appointmentResponse = await axios.get(`${baseApiUrl}/appointments.php`, {
                params: {
                    operation: 'get_appointment_details',
                    appointment_id: appointmentId
                }
            });

            if (appointmentResponse.data?.success) {
                const appointment = appointmentResponse.data.data;
                document.getElementById('consultation_patient_id').value = appointment.patient_id;
            }

            // Get nurse assessment data
            const assessmentResponse = await axios.get(`${baseApiUrl}/nurse_enhanced.php`, {
                params: {
                    operation: 'get_nurse_assessment',
                    appointment_id: appointmentId
                }
            });

            if (assessmentResponse.data?.success) {
                const assessment = assessmentResponse.data.data;
                
                // Fill nurse assessment data
                document.getElementById('nurse_chief_complaint').value = assessment.chief_complaint || '';
                document.getElementById('nurse_assessment_notes').value = assessment.nurse_assessment || '';
                
                // Fill vital signs
                document.getElementById('vital_height').value = assessment.height_cm || '';
                document.getElementById('vital_weight').value = assessment.weight_kg || '';
                document.getElementById('vital_temperature').value = assessment.temperature_celsius || '';
                document.getElementById('vital_bp').value = assessment.blood_pressure_mmHg || '';
                document.getElementById('vital_hr').value = assessment.heart_rate_bpm || '';
                document.getElementById('vital_spo2').value = assessment.spo2_percent || '';
                
                // Fill medical history
                document.getElementById('history_past_medical').value = assessment.past_medical_history || '';
                document.getElementById('history_current_meds').value = assessment.current_medications || '';
                document.getElementById('history_family').value = assessment.family_history || '';
                document.getElementById('history_social').value = assessment.social_history || '';
            }
        } catch (error) {
            console.error('Error loading patient data:', error);
        }
    }

    // Load conditions
    async function loadConditions() {
        try {
            const response = await axios.get(`${baseApiUrl}/conditions.php`, {
                params: { operation: 'get_all_conditions' }
            });

            if (response.data?.success) {
                conditionsData = response.data.data;
            }
        } catch (error) {
            console.error('Error loading conditions:', error);
        }
    }

    // Load medicines
    async function loadMedicines() {
        try {
            const response = await axios.get(`${baseApiUrl}/medicines.php`, {
                params: { operation: 'get_all_medicines' }
            });

            if (response.data?.success) {
                medicinesData = response.data.data;
            }
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    }

    // Add condition
    function addCondition() {
        const searchTerm = conditionSearch.value.trim();
        if (!searchTerm) return;

        const condition = conditionsData.find(c => 
            c.condition_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (condition && !selectedConditionsList.find(c => c.condition_id === condition.condition_id)) {
            selectedConditionsList.push(condition);
            updateSelectedConditionsDisplay();
            conditionSearch.value = '';
        }
    }

    // Update selected conditions display
    function updateSelectedConditionsDisplay() {
        selectedConditionsDisplay.innerHTML = selectedConditionsList.map(condition => 
            `<span class="badge bg-primary me-1 mb-1">${condition.condition_name} 
                <button type="button" class="btn-close" onclick="removeCondition(${condition.condition_id})"></button>
            </span>`
        ).join('');
        
        selectedConditions.value = selectedConditionsList.map(c => c.condition_name).join(', ');
    }

    // Remove condition
    window.removeCondition = function(conditionId) {
        selectedConditionsList = selectedConditionsList.filter(c => c.condition_id !== conditionId);
        updateSelectedConditionsDisplay();
    };

    // Add prescription
    function addPrescription() {
        const prescriptionHtml = `
            <div class="card mb-3 prescription-card">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Medicine</label>
                            <select class="form-select medicine-select" required>
                                <option value="">Select medicine...</option>
                                ${medicinesData.map(medicine => 
                                    `<option value="${medicine.medicine_id}">${medicine.generic_name} ${medicine.strength}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Dosage</label>
                            <input type="text" class="form-control dosage-input" placeholder="e.g., 500mg" required>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Frequency</label>
                            <input type="text" class="form-control frequency-input" placeholder="e.g., 3x daily" required>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Duration</label>
                            <input type="text" class="form-control duration-input" placeholder="e.g., 7 days" required>
                        </div>
                        <div class="col-md-1">
                            <label class="form-label">Qty</label>
                            <input type="number" class="form-control quantity-input" value="1" min="1" required>
                        </div>
                        <div class="col-md-1">
                            <label class="form-label">&nbsp;</label>
                            <button type="button" class="btn btn-outline-danger d-block" onclick="removePrescription(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Instructions</label>
                            <textarea class="form-control instructions-input" rows="2" placeholder="Special instructions for the patient..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        prescriptionsContainer.insertAdjacentHTML('beforeend', prescriptionHtml);
    }

    // Remove prescription
    window.removePrescription = function(button) {
        button.closest('.prescription-card').remove();
    };

    // Save consultation
    async function saveConsultation() {
        if (!consultationForm.checkValidity()) {
            consultationForm.classList.add('was-validated');
            return;
        }

        const formData = new FormData(consultationForm);
        const data = {
            appointment_id: formData.get('appointment_id'),
            doctor_id: formData.get('doctor_id'),
            patient_id: formData.get('patient_id'),
            diagnosis: selectedConditionsList.map(c => c.condition_name).join(', '),
            conditions: selectedConditionsList.map(c => c.condition_id),
            consultation_notes: formData.get('consultation_notes'),
            final_diagnosis: formData.get('final_diagnosis') || null,
            next_appointment_date: formData.get('next_appointment_date') || null,
            next_appointment_notes: formData.get('next_appointment_notes') || '',
            consultation_status: 'Completed'
        };

        // Collect prescriptions
        const prescriptions = [];
        const prescriptionElements = prescriptionsContainer.querySelectorAll('.prescription-card');
        
        for (let i = 0; i < prescriptionElements.length; i++) {
            const element = prescriptionElements[i];
            const medicineId = element.querySelector('.medicine-select').value;
            const dosage = element.querySelector('.dosage-input').value;
            const frequency = element.querySelector('.frequency-input').value;
            const duration = element.querySelector('.duration-input').value;
            const quantity = element.querySelector('.quantity-input').value;
            const instructions = element.querySelector('.instructions-input').value;

            if (medicineId && dosage && frequency && duration) {
                prescriptions.push({
                    medicine_id: medicineId,
                    dosage: dosage,
                    frequency: frequency,
                    duration: duration,
                    quantity: quantity,
                    instructions: instructions
                });
            }
        }

        data.prescriptions = prescriptions;

        try {
            // Save consultation
            const consultationResponse = await axios.post(`${baseApiUrl}/integrated_consultation.php`, {
                operation: 'save_consultation',
                json: JSON.stringify(data)
            });

            if (consultationResponse.data?.success) {
                // Complete doctor consultation
                const completeResponse = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                    operation: 'complete_doctor_consultation',
                    json: JSON.stringify({
                        appointment_id: data.appointment_id,
                        doctor_id: data.doctor_id
                    })
                });

                if (completeResponse.data?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Consultation Complete',
                        text: 'Patient consultation has been completed successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    bootstrap.Modal.getInstance(document.getElementById('consultationModal'))?.hide();
                    loadDoctorQueue();
                } else {
                    Swal.fire('Error', completeResponse.data?.message || 'Failed to complete consultation', 'error');
                }
            } else {
                Swal.fire('Error', consultationResponse.data?.message || 'Failed to save consultation', 'error');
            }
        } catch (error) {
            console.error('Error saving consultation:', error);
            Swal.fire('Error', 'Failed to save consultation', 'error');
        }
    }

    // Auto-refresh every 30 seconds
    setInterval(loadDoctorQueue, 30000);
});
