// Enhanced Doctor Consultations JavaScript
class DoctorEnhancedConsultations {
    constructor() {
        this.currentDoctorId = 1; // This should be set from session/auth
        this.currentPatient = null;
        this.selectedConditions = [];
        this.selectedIllnesses = [];
        this.prescriptions = [];
        this.labRequests = [];
        this.init();
    }

    init() {
        this.loadQueueStatus();
        this.loadPatientsReadyForDoctor();
        this.setupEventListeners();
        this.loadConditions();
        this.loadIllnesses();
        this.loadMedicines();
        this.loadLabTestTypes();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshQueueBtn').addEventListener('click', () => {
            this.loadQueueStatus();
            this.loadPatientsReadyForDoctor();
        });

        // Form submission
        document.getElementById('consultationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitConsultation();
        });

        // Condition management
        document.getElementById('addConditionBtn').addEventListener('click', () => {
            this.addCondition();
        });

        document.getElementById('addNewConditionBtn').addEventListener('click', () => {
            this.showAddConditionModal();
        });

        document.getElementById('saveConditionBtn').addEventListener('click', () => {
            this.saveNewCondition();
        });

        // Illness management
        document.getElementById('addIllnessBtn').addEventListener('click', () => {
            this.addIllness();
        });

        document.getElementById('addNewIllnessBtn').addEventListener('click', () => {
            this.showAddIllnessModal();
        });

        document.getElementById('saveIllnessBtn').addEventListener('click', () => {
            this.saveNewIllness();
        });

        // Prescription management
        document.getElementById('addPrescriptionBtn').addEventListener('click', () => {
            this.addPrescription();
        });

        // Lab request management
        document.getElementById('addLabRequestBtn').addEventListener('click', () => {
            this.addLabRequest();
        });

        // Draft saving
        document.getElementById('saveDraftBtn').addEventListener('click', () => {
            this.saveDraft();
        });
    }

    async loadQueueStatus() {
        try {
            const response = await axios.get('../../api/queue_management.php', {
                params: { operation: 'get_current_queue_status' }
            });

            if (response.data.success) {
                const data = response.data;
                document.getElementById('waitingForNurseCount').textContent = data.waiting_for_nurse?.length || 0;
                document.getElementById('nurseAssessmentCount').textContent = data.nurse_assessment?.length || 0;
                document.getElementById('readyForDoctorCount').textContent = data.waiting_for_doctor?.length || 0;
                document.getElementById('completedCount').textContent = data.completed_count || 0;
            }
        } catch (error) {
            console.error('Error loading queue status:', error);
        }
    }

    async loadPatientsReadyForDoctor() {
        try {
            const response = await axios.get('../../api/nurse_enhanced.php', {
                params: { operation: 'get_patients_waiting_for_doctor' }
            });

            if (response.data.success) {
                this.displayPatientsReadyForDoctor(response.data.data);
            }
        } catch (error) {
            console.error('Error loading patients ready for doctor:', error);
        }
    }

    displayPatientsReadyForDoctor(patients) {
        const tbody = document.getElementById('readyForDoctorTableBody');
        
        if (patients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No patients ready for doctor consultation</td></tr>';
            return;
        }

        tbody.innerHTML = patients.map(patient => `
            <tr>
                <td>${patient.queue_number}</td>
                <td>${patient.patient_name}</td>
                <td><span class="badge bg-success">Complete</span></td>
                <td>${patient.forwarded_at ? new Date(patient.forwarded_at).toLocaleString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="doctorConsultations.startConsultation(${patient.appointment_id})">
                        <i class="fas fa-stethoscope me-1"></i>Start Consultation
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async startConsultation(appointmentId) {
        try {
            const response = await axios.get('../../api/nurse_enhanced.php', {
                params: { 
                    operation: 'get_patient_assessment',
                    appointment_id: appointmentId
                }
            });

            if (response.data.success) {
                this.currentPatient = response.data.data;
                this.populateConsultationForm();
                this.showSuccess('Patient data loaded successfully');
            } else {
                this.showError('Failed to load patient data');
            }
        } catch (error) {
            console.error('Error starting consultation:', error);
            this.showError('Failed to load patient data');
        }
    }

    populateConsultationForm() {
        const patient = this.currentPatient;
        
        // Set hidden fields
        document.getElementById('patient_id').value = patient.patient_id;
        document.getElementById('appointment_id').value = patient.appointment_id;

        // Update patient display
        document.getElementById('currentPatientDisplay').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <strong>Patient:</strong> ${patient.patient_name}<br>
                    <strong>Queue #:</strong> ${patient.queue_number}<br>
                    <strong>Contact:</strong> ${patient.contact_num || 'N/A'}
                </div>
                <div class="col-md-6">
                    <strong>Age:</strong> ${patient.age || 'N/A'}<br>
                    <strong>Sex:</strong> ${patient.sex || 'N/A'}<br>
                    <strong>Reason:</strong> ${patient.reason_name || 'N/A'}
                </div>
            </div>
        `;

        // Populate nurse assessment data (read-only)
        this.populateNurseAssessmentData(patient);
    }

    populateNurseAssessmentData(patient) {
        // Vital Signs
        const vitalsDisplay = document.getElementById('vitalsDisplay');
        vitalsDisplay.innerHTML = `
            <div class="vital-item">
                <div class="vital-label">Height</div>
                <div class="vital-value">${patient.height_cm ? patient.height_cm + ' cm' : 'N/A'}</div>
            </div>
            <div class="vital-item">
                <div class="vital-label">Weight</div>
                <div class="vital-value">${patient.weight_kg ? patient.weight_kg + ' kg' : 'N/A'}</div>
            </div>
            <div class="vital-item">
                <div class="vital-label">Blood Pressure</div>
                <div class="vital-value">${patient.blood_pressure_mmHg || 'N/A'}</div>
            </div>
            <div class="vital-item">
                <div class="vital-label">Heart Rate</div>
                <div class="vital-value">${patient.heart_rate_bpm ? patient.heart_rate_bpm + ' bpm' : 'N/A'}</div>
            </div>
            <div class="vital-item">
                <div class="vital-label">SpO₂</div>
                <div class="vital-value">${patient.spo2_percent ? patient.spo2_percent + '%' : 'N/A'}</div>
            </div>
        `;

        // Medical History
        document.getElementById('presentIllnessDisplay').textContent = patient.present_illness || 'N/A';
        document.getElementById('pastMedicalHistoryDisplay').textContent = patient.past_medical_history || 'N/A';
        document.getElementById('pastSurgicalHistoryDisplay').textContent = patient.past_surgical_history || 'N/A';
        document.getElementById('familyHistoryDisplay').textContent = patient.family_history || 'N/A';
        document.getElementById('socialHistoryDisplay').textContent = patient.social_history || 'N/A';
        document.getElementById('currentMedicationsDisplay').textContent = patient.current_medications || 'N/A';
        document.getElementById('assessmentNotesDisplay').textContent = patient.assessment_notes || 'N/A';
    }

    async loadConditions() {
        try {
            const response = await axios.get('../../api/conditions.php', {
                params: { operation: 'get_all' }
            });

            if (response.data.success) {
                const select = document.getElementById('conditionSelect');
                select.innerHTML = '<option value="">Select condition</option>' +
                    response.data.data.map(condition => 
                        `<option value="${condition.condition_id}">${condition.condition_name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading conditions:', error);
        }
    }

    async loadIllnesses() {
        try {
            const response = await axios.get('../../api/illnesses.php', {
                params: { operation: 'get_all' }
            });

            if (response.data.success) {
                const select = document.getElementById('illnessSelect');
                select.innerHTML = '<option value="">Select illness</option>' +
                    response.data.data.map(illness => 
                        `<option value="${illness.illness_id}">${illness.illness_name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading illnesses:', error);
        }
    }

    async loadMedicines() {
        // This would load medicines for prescriptions
        // Implementation depends on your medicines API
    }

    async loadLabTestTypes() {
        // This would load lab test types for lab requests
        // Implementation depends on your lab test types API
    }

    addCondition() {
        const select = document.getElementById('conditionSelect');
        const conditionId = select.value;
        const conditionName = select.options[select.selectedIndex].text;

        if (!conditionId) {
            this.showError('Please select a condition');
            return;
        }

        if (this.selectedConditions.length >= 5) {
            this.showError('Maximum 5 conditions allowed');
            return;
        }

        if (this.selectedConditions.find(c => c.id === conditionId)) {
            this.showError('Condition already selected');
            return;
        }

        this.selectedConditions.push({ id: conditionId, name: conditionName });
        this.updateConditionsDisplay();
        select.value = '';
    }

    updateConditionsDisplay() {
        const display = document.getElementById('selectedConditionsDisplay');
        display.innerHTML = this.selectedConditions.map(condition => `
            <span class="badge bg-primary me-2 mb-2">
                ${condition.name}
                <button type="button" class="btn-close btn-close-white" onclick="doctorConsultations.removeCondition('${condition.id}')"></button>
            </span>
        `).join('');
    }

    removeCondition(conditionId) {
        this.selectedConditions = this.selectedConditions.filter(c => c.id !== conditionId);
        this.updateConditionsDisplay();
    }

    addIllness() {
        const select = document.getElementById('illnessSelect');
        const illnessId = select.value;
        const illnessName = select.options[select.selectedIndex].text;

        if (!illnessId) {
            this.showError('Please select an illness');
            return;
        }

        if (this.selectedIllnesses.length >= 5) {
            this.showError('Maximum 5 illnesses allowed');
            return;
        }

        if (this.selectedIllnesses.find(i => i.id === illnessId)) {
            this.showError('Illness already selected');
            return;
        }

        this.selectedIllnesses.push({ id: illnessId, name: illnessName });
        this.updateIllnessesDisplay();
        select.value = '';
    }

    updateIllnessesDisplay() {
        const display = document.getElementById('selectedIllnessesDisplay');
        display.innerHTML = this.selectedIllnesses.map(illness => `
            <span class="badge bg-info me-2 mb-2">
                ${illness.name}
                <button type="button" class="btn-close btn-close-white" onclick="doctorConsultations.removeIllness('${illness.id}')"></button>
            </span>
        `).join('');
    }

    removeIllness(illnessId) {
        this.selectedIllnesses = this.selectedIllnesses.filter(i => i.id !== illnessId);
        this.updateIllnessesDisplay();
    }

    addPrescription() {
        // Implementation for adding prescriptions
        // This would open a modal or add a form row
    }

    addLabRequest() {
        // Implementation for adding lab requests
        // This would open a modal or add a form row
    }

    async submitConsultation() {
        if (this.selectedConditions.length === 0) {
            this.showError('Please add at least one condition');
            return;
        }

        const formData = new FormData(document.getElementById('consultationForm'));
        const data = Object.fromEntries(formData.entries());

        // Add selected conditions and illnesses
        data.conditions = this.selectedConditions.map(c => c.id);
        data.illnesses = this.selectedIllnesses.map(i => i.id);

        try {
            const response = await axios.post('../../api/consultations.php', {
                operation: 'create_consultation',
                json: JSON.stringify(data)
            });

            if (response.data.success) {
                this.showSuccess('Consultation completed successfully');
                this.resetForm();
                this.loadPatientsReadyForDoctor();
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error submitting consultation:', error);
            this.showError('Failed to complete consultation');
        }
    }

    resetForm() {
        document.getElementById('consultationForm').reset();
        this.selectedConditions = [];
        this.selectedIllnesses = [];
        this.prescriptions = [];
        this.labRequests = [];
        this.updateConditionsDisplay();
        this.updateIllnessesDisplay();
        this.currentPatient = null;
    }

    saveDraft() {
        // Implementation for saving draft
        this.showSuccess('Draft saved successfully');
    }

    showAddConditionModal() {
        const modal = new bootstrap.Modal(document.getElementById('addConditionModal'));
        modal.show();
    }

    async saveNewCondition() {
        const form = document.getElementById('addConditionForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await axios.post('../../api/conditions.php', {
                operation: 'create',
                json: JSON.stringify(data)
            });

            if (response.data.success) {
                this.showSuccess('Condition added successfully');
                bootstrap.Modal.getInstance(document.getElementById('addConditionModal')).hide();
                form.reset();
                this.loadConditions();
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error adding condition:', error);
            this.showError('Failed to add condition');
        }
    }

    showAddIllnessModal() {
        const modal = new bootstrap.Modal(document.getElementById('addIllnessModal'));
        modal.show();
    }

    async saveNewIllness() {
        const form = document.getElementById('addIllnessForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await axios.post('../../api/illnesses.php', {
                operation: 'create',
                json: JSON.stringify(data)
            });

            if (response.data.success) {
                this.showSuccess('Illness added successfully');
                bootstrap.Modal.getInstance(document.getElementById('addIllnessModal')).hide();
                form.reset();
                this.loadIllnesses();
            } else {
                this.showError(response.data.message);
            }
        } catch (error) {
            console.error('Error adding illness:', error);
            this.showError('Failed to add illness');
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

// Initialize consultations when DOM is loaded
let doctorConsultations;
document.addEventListener('DOMContentLoaded', () => {
    doctorConsultations = new DoctorEnhancedConsultations();
});
