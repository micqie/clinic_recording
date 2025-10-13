// Enhanced Nurse Dashboard JavaScript
class NurseEnhancedDashboard {
    constructor() {
        this.currentNurseId = 1; // This should be set from session/auth
        this.currentAssessment = null;
        this.init();
    }

    init() {
        this.loadPatients();
        this.setupEventListeners();
        this.loadAppointmentReasons();
        this.loadPatientsForWalkIn();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadPatients();
        });

        // Walk-in form
        document.getElementById('createWalkInBtn').addEventListener('click', () => {
            this.createWalkIn();
        });

        // Assessment forms
        document.getElementById('saveVitalsBtn').addEventListener('click', () => {
            this.saveVitals();
        });

        document.getElementById('saveHistoryBtn').addEventListener('click', () => {
            this.saveHistory();
        });

        document.getElementById('forwardToDoctorBtn').addEventListener('click', () => {
            this.forwardToDoctor();
        });

        // Assessment notes
        document.getElementById('assessmentNotes').addEventListener('input', () => {
            this.updateAssessmentNotes();
        });
    }

    async loadPatients() {
        try {
            // Load patients waiting for nurse
            const waitingResponse = await axios.get('../../api/nurse_enhanced.php', {
                params: { operation: 'get_patients_waiting_for_nurse' }
            });

            if (waitingResponse.data.success) {
                this.displayWaitingNursePatients(waitingResponse.data.data);
                document.getElementById('waitingNurseCount').textContent = waitingResponse.data.data.length;
            }

            // Load patients waiting for doctor
            const readyResponse = await axios.get('../../api/nurse_enhanced.php', {
                params: { operation: 'get_patients_waiting_for_doctor' }
            });

            if (readyResponse.data.success) {
                this.displayReadyForDoctorPatients(readyResponse.data.data);
                document.getElementById('readyForDoctorCount').textContent = readyResponse.data.data.length;
            }

            // Update assessment count (patients currently being assessed)
            document.getElementById('assessmentCount').textContent = this.currentAssessment ? 1 : 0;

        } catch (error) {
            console.error('Error loading patients:', error);
            this.showError('Failed to load patients');
        }
    }

    displayWaitingNursePatients(patients) {
        const tbody = document.getElementById('waitingNurseTableBody');
        
        if (patients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No patients waiting for nurse assessment</td></tr>';
            return;
        }

        tbody.innerHTML = patients.map(patient => `
            <tr>
                <td>${patient.queue_number}</td>
                <td>${patient.patient_name}</td>
                <td>${patient.contact_num || 'N/A'}</td>
                <td>${patient.reason_name || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="nurseDashboard.startAssessment(${patient.appointment_id})">
                        <i class="fas fa-stethoscope me-1"></i>Start Assessment
                    </button>
                </td>
            </tr>
        `).join('');
    }

    displayReadyForDoctorPatients(patients) {
        const tbody = document.getElementById('readyForDoctorTableBody');
        
        if (patients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No patients ready for doctor</td></tr>';
            return;
        }

        tbody.innerHTML = patients.map(patient => `
            <tr>
                <td>${patient.queue_number}</td>
                <td>${patient.patient_name}</td>
                <td><span class="badge bg-success">Complete</span></td>
                <td>${patient.forwarded_at ? new Date(patient.forwarded_at).toLocaleString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="nurseDashboard.viewAssessment(${patient.appointment_id})">
                        <i class="fas fa-eye me-1"></i>View Assessment
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async startAssessment(appointmentId) {
        try {
            const response = await axios.post('../../api/nurse_enhanced.php', {
                operation: 'start_nurse_assessment',
                json: JSON.stringify({
                    appointment_id: appointmentId,
                    nurse_id: this.currentNurseId
                })
            });

            if (response.data.success) {
                this.currentAssessment = appointmentId;
                this.showSuccess('Assessment started');
                this.loadPatients();
                this.openAssessmentModal(appointmentId);
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error starting assessment:', error);
            this.showError('Failed to start assessment');
        }
    }

    async openAssessmentModal(appointmentId) {
        try {
            const response = await axios.get('../../api/nurse_enhanced.php', {
                params: { 
                    operation: 'get_patient_assessment',
                    appointment_id: appointmentId
                }
            });

            if (response.data.success) {
                const patient = response.data.data;
                this.populateAssessmentModal(patient);
                const modal = new bootstrap.Modal(document.getElementById('assessmentModal'));
                modal.show();
            } else {
                this.showError('Failed to load patient assessment');
            }
        } catch (error) {
            console.error('Error loading assessment:', error);
            this.showError('Failed to load patient assessment');
        }
    }

    populateAssessmentModal(patient) {
        // Populate patient info
        document.getElementById('patientInfo').innerHTML = `
            <p><strong>Name:</strong> ${patient.patient_name}</p>
            <p><strong>Contact:</strong> ${patient.contact_num || 'N/A'}</p>
            <p><strong>Age:</strong> ${patient.age || 'N/A'}</p>
            <p><strong>Sex:</strong> ${patient.sex || 'N/A'}</p>
            <p><strong>Reason:</strong> ${patient.reason_name || 'N/A'}</p>
        `;

        // Set appointment IDs
        document.getElementById('vitals_appointment_id').value = patient.appointment_id;
        document.getElementById('history_appointment_id').value = patient.appointment_id;

        // Populate existing data if available
        if (patient.height_cm) document.querySelector('input[name="height_cm"]').value = patient.height_cm;
        if (patient.weight_kg) document.querySelector('input[name="weight_kg"]').value = patient.weight_kg;
        if (patient.blood_pressure_mmHg) document.querySelector('input[name="blood_pressure_mmHg"]').value = patient.blood_pressure_mmHg;
        if (patient.heart_rate_bpm) document.querySelector('input[name="heart_rate_bpm"]').value = patient.heart_rate_bpm;
        if (patient.spo2_percent) document.querySelector('input[name="spo2_percent"]').value = patient.spo2_percent;

        if (patient.present_illness) document.querySelector('textarea[name="present_illness"]').value = patient.present_illness;
        if (patient.past_medical_history) document.querySelector('textarea[name="past_medical_history"]').value = patient.past_medical_history;
        if (patient.past_surgical_history) document.querySelector('textarea[name="past_surgical_history"]').value = patient.past_surgical_history;
        if (patient.family_history) document.querySelector('textarea[name="family_history"]').value = patient.family_history;
        if (patient.social_history) document.querySelector('textarea[name="social_history"]').value = patient.social_history;
        if (patient.current_medications) document.querySelector('textarea[name="current_medications"]').value = patient.current_medications;

        if (patient.assessment_notes) document.getElementById('assessmentNotes').value = patient.assessment_notes;

        // Update status badges
        this.updateStatusBadges(patient);
    }

    updateStatusBadges(patient) {
        const vitalsStatus = document.getElementById('vitalsStatus');
        const historyStatus = document.getElementById('historyStatus');
        const forwardBtn = document.getElementById('forwardToDoctorBtn');

        // Update vitals status
        if (patient.vitals_completed) {
            vitalsStatus.textContent = 'Complete';
            vitalsStatus.className = 'badge bg-success ms-2';
        } else {
            vitalsStatus.textContent = 'Required';
            vitalsStatus.className = 'badge bg-warning ms-2';
        }

        // Update history status
        if (patient.history_completed) {
            historyStatus.textContent = 'Complete';
            historyStatus.className = 'badge bg-success ms-2';
        } else {
            historyStatus.textContent = 'Required';
            historyStatus.className = 'badge bg-warning ms-2';
        }

        // Enable/disable forward button
        if (patient.vitals_completed && patient.history_completed) {
            forwardBtn.disabled = false;
            forwardBtn.innerHTML = '<i class="fas fa-user-md me-2"></i>Forward to Doctor';
        } else {
            forwardBtn.disabled = true;
            forwardBtn.innerHTML = '<i class="fas fa-lock me-2"></i>Complete Vitals & History First';
        }
    }

    async saveVitals() {
        const form = document.getElementById('vitalsForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await axios.post('../../api/nurse_enhanced.php', {
                operation: 'record_vitals',
                json: JSON.stringify(data)
            });

            if (response.data.success) {
                this.showSuccess('Vital signs saved successfully');
                this.updateStatusBadges({ vitals_completed: true });
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error saving vitals:', error);
            this.showError('Failed to save vital signs');
        }
    }

    async saveHistory() {
        const form = document.getElementById('historyForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await axios.post('../../api/nurse_enhanced.php', {
                operation: 'record_medical_history',
                json: JSON.stringify(data)
            });

            if (response.data.success) {
                this.showSuccess('Medical history saved successfully');
                this.updateStatusBadges({ history_completed: true });
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error saving history:', error);
            this.showError('Failed to save medical history');
        }
    }

    async forwardToDoctor() {
        const appointmentId = document.getElementById('vitals_appointment_id').value;
        const assessmentNotes = document.getElementById('assessmentNotes').value;

        try {
            const response = await axios.post('../../api/nurse_enhanced.php', {
                operation: 'forward_to_doctor',
                json: JSON.stringify({
                    appointment_id: appointmentId,
                    assessment_notes: assessmentNotes
                })
            });

            if (response.data.success) {
                this.showSuccess('Patient forwarded to doctor successfully');
                this.currentAssessment = null;
                this.loadPatients();
                bootstrap.Modal.getInstance(document.getElementById('assessmentModal')).hide();
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error forwarding patient:', error);
            this.showError('Failed to forward patient to doctor');
        }
    }

    async updateAssessmentNotes() {
        // This could be implemented to auto-save notes
        // For now, notes are saved when forwarding to doctor
    }

    async viewAssessment(appointmentId) {
        this.openAssessmentModal(appointmentId);
    }

    async createWalkIn() {
        const form = document.getElementById('walkInForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (!data.patient_id) {
            this.showError('Please select a patient');
            return;
        }

        try {
            const response = await axios.post('../../api/nurse.php', {
                operation: 'walk_in',
                json: JSON.stringify(data)
            });

            if (response.data.success) {
                this.showSuccess('Walk-in appointment created successfully');
                bootstrap.Modal.getInstance(document.getElementById('walkInModal')).hide();
                form.reset();
                this.loadPatients();
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error creating walk-in:', error);
            this.showError('Failed to create walk-in appointment');
        }
    }

    async loadAppointmentReasons() {
        try {
            const response = await axios.get('../../api/nurse.php', {
                params: { operation: 'get_appointment_reasons' }
            });

            if (response.data.success) {
                const select = document.querySelector('select[name="appointment_reason_id"]');
                select.innerHTML = '<option value="">Select reason...</option>' +
                    response.data.data.map(reason => 
                        `<option value="${reason.reason_id}">${reason.reason_name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading appointment reasons:', error);
        }
    }

    async loadPatientsForWalkIn() {
        try {
            const response = await axios.get('../../api/patients.php', {
                params: { operation: 'get_all' }
            });

            if (response.data.success) {
                const select = document.querySelector('select[name="patient_id"]');
                select.innerHTML = '<option value="">Select patient...</option>' +
                    response.data.data.map(patient => 
                        `<option value="${patient.patient_id}">${patient.name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 3000,
            showConfirmButton: false
        });
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }
}

// Initialize dashboard when DOM is loaded
let nurseDashboard;
document.addEventListener('DOMContentLoaded', () => {
    nurseDashboard = new NurseEnhancedDashboard();
});