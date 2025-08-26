document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const integratedConsultationApi = `${baseApiUrl}/integrated_consultation.php`;
    const patientsApi = `${baseApiUrl}/patients.php`;
    const appointmentsApi = `${baseApiUrl}/appointments.php`;
    const userApi = `${baseApiUrl}/user.php`;
    const queueApi = `${baseApiUrl}/queue_management.php`;
    const enhancedQueueApi = `${baseApiUrl}/enhanced_queue_management.php`;
    const medicinesApi = `${baseApiUrl}/medicines.php`;
    const labTestTypesApi = `${baseApiUrl}/lab_test_types.php`;

    // Form elements
    const form = document.getElementById('consultationForm');
    const patientIdInput = document.getElementById('patient_id');
    const appointmentIdInput = document.getElementById('appointment_id');
    const currentPatientDisplay = document.getElementById('currentPatientDisplay');
    const addPrescriptionBtn = document.getElementById('addPrescriptionBtn');
    const addLabRequestBtn = document.getElementById('addLabRequestBtn');
    const prescriptionsContainer = document.getElementById('prescriptionsContainer');
    const labRequestsContainer = document.getElementById('labRequestsContainer');
    const saveDraftBtn = document.getElementById('saveDraftBtn');

    // Queue management elements
    const refreshQueueBtn = document.getElementById('refreshQueueBtn');
    const currentQueueNumber = document.getElementById('currentQueueNumber');
    const nextQueueNumber = document.getElementById('nextQueueNumber');
    const completedCount = document.getElementById('completedCount');
    const currentPatientInfo = document.getElementById('currentPatientInfo');
    const consultationsTableBody = document.getElementById('consultationsTableBody');

    // Check if user is logged in and is a doctor
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== 'doctor') {
        window.location.href = '../../index.html';
        return;
    }

    let doctorId = null;
    let prescriptionCounter = 0;
    let labRequestCounter = 0;

    // Get doctor_id from user profile
    async function getDoctorId() {
        if (doctorId) return doctorId;
        try {
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            doctorId = prof.data?.context?.doctor_id || null;
            return doctorId;
        } catch (e) {
            console.error('Failed to get doctor profile:', e);
            return null;
        }
    }

    // Enable/disable consultation form based on availability
    function setFormEnabled(isEnabled) {
        const controls = form.querySelectorAll('input, select, textarea, button[type="submit"], button[type="reset"]');
        controls.forEach(el => {
            // Keep the external Refresh Queue button unaffected
            if (el.id === 'refreshQueueBtn') return;
            el.disabled = !isEnabled;
        });
        addPrescriptionBtn && (addPrescriptionBtn.disabled = !isEnabled);
        addLabRequestBtn && (addLabRequestBtn.disabled = !isEnabled);
        saveDraftBtn && (saveDraftBtn.disabled = !isEnabled);
    }

    // Display current patient information (only for this doctor)
    function displayCurrentPatient(currentConsultation) {
        if (!currentConsultation) {
            currentPatientDisplay.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>No patient under you is currently in consultation</strong>
                    <br>
                    <small class="text-muted">Please wait until a patient assigned to you is placed In Consultation. Click "Refresh Queue" to check for updates.</small>
                </div>
            `;
            // Clear hidden fields and disable form
            patientIdInput.value = '';
            appointmentIdInput.value = '';
            setFormEnabled(false);
            return false;
        }

        // Set the hidden input values
        patientIdInput.value = currentConsultation.patient_id;
        appointmentIdInput.value = currentConsultation.appointment_id;

        // Display patient information
        currentPatientDisplay.innerHTML = `
            <div class="alert alert-success">
                <div class="d-flex align-items-center">
                    <i class="fas fa-user-md fa-2x me-3 text-success"></i>
                    <div>
                        <h6 class="mb-1">Currently Consulting</h6>
                        <p class="mb-1"><strong>${currentConsultation.patient_name}</strong></p>
                        <p class="mb-0"><small class="text-muted">Queue #${currentConsultation.queue_number} | Appointment Date: ${currentConsultation.appointment_date || 'Today'}</small></p>
                    </div>
                </div>
            </div>
        `;
        setFormEnabled(true);
        return true;
    }

    // Load current queue status strictly for the logged-in doctor
    async function loadCurrentQueueStatus() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }

            const today = new Date().toISOString().slice(0, 10);
            const res = await axios.get(`${enhancedQueueApi}?operation=get_doctor_queue_status&doctor_id=${docId}&date=${today}`);

            if (res.data.success) {
                const data = res.data;

                // Update queue display elements
                if (currentQueueNumber) {
                    currentQueueNumber.textContent = data.current_consultation ? data.current_consultation.queue_number : '-';
                }
                if (nextQueueNumber) {
                    nextQueueNumber.textContent = data.next_in_queue ? data.next_in_queue.queue_number : '-';
                }
                if (completedCount) {
                    completedCount.textContent = data.completed_count;
                }

                // Show current patient info
                if (currentPatientInfo) {
                    if (data.current_consultation) {
                        currentPatientInfo.innerHTML = `
                            <div class="alert alert-success mb-0">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-user-md fa-2x me-3 text-success"></i>
                                    <div>
                                        <h6 class="mb-1">Currently Consulting (Your Patient)</h6>
                                        <p class="mb-0"><strong>${data.current_consultation.patient_name}</strong> - Queue #${data.current_consultation.queue_number}</p>
                                        <small class="text-muted">Started by: ${data.queue_updated_by || 'Secretary'}</small>
                                    </div>
                                </div>
                            </div>
                                                `;

                        // Display current patient and enable form
                        displayCurrentPatient(data.current_consultation);

                    } else if (data.next_in_queue) {
                        currentPatientInfo.innerHTML = `
                            <div class="alert alert-warning mb-0">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-clock fa-2x me-3 text-warning"></i>
                                    <div>
                                        <h6 class="mb-1">Next Patient Ready (Yours)</h6>
                                        <p class="mb-0"><strong>${data.next_in_queue.patient_name}</strong> - Queue #${data.next_in_queue.queue_number}</p>
                                        <small class="text-muted">Waiting for secretary to start consultation</small>
                                    </div>
                                </div>
                            </div>
                        `;
                        // No active current patient yet for you; keep form disabled
                        displayCurrentPatient(null);
                    } else {
                        currentPatientInfo.innerHTML = `
                            <div class="alert alert-info mb-0">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                    <div>
                                        <h6 class="mb-1">Queue Status</h6>
                                        <p class="mb-0">No patients assigned to you are currently in consultation</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        // Display no patient in form
                        displayCurrentPatient(null);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load queue status:', error);
            if (currentPatientInfo) {
                currentPatientInfo.innerHTML = `
                    <div class="alert alert-danger mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load queue status
                    </div>
                `;
            }
            // On error, disable form as a precaution
            setFormEnabled(false);
        }
    }





    // Add prescription field
    function addPrescriptionField() {
        const prescriptionId = `prescription_${prescriptionCounter++}`;
        const prescriptionHtml = `
            <div class="card border mb-3" id="${prescriptionId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0 text-primary">Medicine ${prescriptionCounter}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removePrescription('${prescriptionId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label">Medicine</label>
                            <select class="form-select" name="prescriptions[${prescriptionCounter-1}][medicine_id]" required>
                                <option value="">Select medicine</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Dosage</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][dosage]" placeholder="e.g., 500mg" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Frequency</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][frequency]" placeholder="e.g., Every 8 hours" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Duration</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][duration]" placeholder="e.g., 7 days" required>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Quantity</label>
                            <input type="number" class="form-control" name="prescriptions[${prescriptionCounter-1}][quantity]" placeholder="e.g., 20" min="1" required>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Unit</label>
                            <select class="form-select" name="prescriptions[${prescriptionCounter-1}][packaging_unit]" required>
                                <option value="tablet">Tablet</option>
                                <option value="capsule">Capsule</option>
                                <option value="blister pack">Blister Pack</option>
                                <option value="box">Box</option>
                                <option value="bottle">Bottle</option>
                                <option value="tube">Tube</option>
                                <option value="vial">Vial</option>
                                <option value="sachet">Sachet</option>
                                <option value="strip">Strip</option>
                            </select>
                        </div>
                        <div class="col-md-12">
                            <label class="form-label">Instructions</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][instructions]" placeholder="e.g., Take with food">
                        </div>
                    </div>
                </div>
            </div>
        `;
        prescriptionsContainer.insertAdjacentHTML('beforeend', prescriptionHtml);

        // Load medicines for this prescription
        loadMedicinesForPrescription(prescriptionId);
    }

    // Add lab request field
    function addLabRequestField() {
        const labRequestId = `lab_request_${labRequestCounter++}`;
        const labRequestHtml = `
            <div class="card border mb-3" id="${labRequestId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0 text-info">Lab Test ${labRequestCounter}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeLabRequest('${labRequestId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label">Test Type</label>
                            <select class="form-select" name="lab_requests[${labRequestCounter-1}][lab_test_type_id]">
                                <option value="">Select test type</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Request Notes</label>
                            <input type="text" class="form-control" name="lab_requests[${labRequestCounter-1}][request_text]" placeholder="Reason for test">
                        </div>
                    </div>
                </div>
            </div>
        `;
        labRequestsContainer.insertAdjacentHTML('beforeend', labRequestHtml);

        // Load lab test types for this request
        loadLabTestTypesForRequest(labRequestId);
    }

    // Load medicines for prescription dropdown
    async function loadMedicinesForPrescription(prescriptionId) {
        try {
            const res = await axios.get(`${medicinesApi}?operation=getAll`);
            if (res.data && (res.data.success || Array.isArray(res.data.data) || Array.isArray(res.data.medicines))) {
                const select = document.querySelector(`#${prescriptionId} select[name*="[medicine_id]"]`);
                const list = res.data.medicines || res.data.data || [];
                list.forEach(medicine => {
                    const opt = document.createElement('option');
                    opt.value = medicine.medicine_id;
                    const strength = medicine.strength || medicine.weight_value || medicine.weight || '';
                    const form = medicine.form_name || '';
                    opt.textContent = `${medicine.medicine_name}${strength ? ` ${strength}` : ''}${form ? ` (${form})` : ''}`;
                    select.appendChild(opt);
                });
            }
        } catch (e) { console.error(e); }
    }

    // Load lab test types for lab request dropdown
    async function loadLabTestTypesForRequest(labRequestId) {
        try {
            const res = await axios.get(`${labTestTypesApi}?operation=getAll`);
            if (res.data && (res.data.success || Array.isArray(res.data.types) || Array.isArray(res.data.data))) {
                const select = document.querySelector(`#${labRequestId} select[name*="[lab_test_type_id]"]`);
                const list = res.data.types || res.data.data || [];
                list.forEach(testType => {
                    const opt = document.createElement('option');
                    opt.value = testType.lab_test_type_id;
                    opt.textContent = testType.type_name;
                    select.appendChild(opt);
                });
            }
        } catch (e) { console.error(e); }
    }

    // Remove prescription field
    window.removePrescription = function(prescriptionId) {
        document.getElementById(prescriptionId).remove();
    };

    // Remove lab request field
    window.removeLabRequest = function(labRequestId) {
        document.getElementById(labRequestId).remove();
    };

    // Load consultations for the doctor
    async function loadMyConsultations() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }

            const res = await axios.get(`${integratedConsultationApi}?operation=get_by_doctor&doctor_id=${docId}`);
            consultationsTableBody.innerHTML = '';

            if (res.data.success && Array.isArray(res.data.data)) {
                res.data.data.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${c.patient_name}</td>
                        <td>${c.appointment_date} (Q#${c.queue_number || 'N/A'})</td>
                        <td>${c.diagnosis}</td>
                        <td><span class="badge bg-${getStatusBadgeClass(c.consultation_status)}">${c.consultation_status}</span></td>
                        <td>${c.next_appointment_date || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewConsultationDetails(${c.consultation_id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="editConsultation(${c.consultation_id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    `;
                    consultationsTableBody.appendChild(tr);
                });
            } else {
                consultationsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No consultations yet</td></tr>';
            }
        } catch (e) {
            console.error(e);
            consultationsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load</td></tr>';
        }
    }

    // Get status badge class
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Active': return 'primary';
            case 'Completed': return 'success';
            case 'Follow-up Required': return 'warning';
            default: return 'secondary';
        }
    }

    // Load current queue status for the doctor
    async function loadQueueStatus() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }

            const res = await axios.get(`${queueApi}?operation=get_doctor_queue_status&doctor_id=${docId}`);
            if (res.data.success) {
                const data = res.data;

                // Update queue numbers
                currentQueueNumber.textContent = data.current_consultation ? data.current_consultation.queue_number : '-';
                nextQueueNumber.textContent = data.next_in_queue ? data.next_in_queue.queue_number : '-';

                // Count completed appointments
                const completed = data.all_appointments.filter(apt => apt.appointment_status === 'Completed').length;
                completedCount.textContent = completed;

                // Display current patient info
                if (data.current_consultation) {
                    currentPatientInfo.innerHTML = `
                        <div class="alert alert-primary mb-0">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-user-md fa-2x me-3 text-primary"></i>
                                <div>
                                    <h6 class="mb-1">Currently in Consultation</h6>
                                    <p class="mb-0"><strong>${data.current_consultation.patient_name}</strong> - Queue #${data.current_consultation.queue_number}</p>
                                </div>
                                <div class="ms-auto">
                                    <button class="btn btn-success btn-sm" onclick="completeConsultation(${data.current_consultation.appointment_id})">
                                        <i class="fas fa-check me-2"></i>Complete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (data.next_in_queue) {
                    currentPatientInfo.innerHTML = `
                        <div class="alert alert-warning mb-0">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-clock fa-2x me-3 text-warning"></i>
                                <div>
                                    <h6 class="mb-1">Next Patient Ready</h6>
                                    <p class="mb-0"><strong>${data.next_in_queue.patient_name}</strong> - Queue #${data.next_in_queue.queue_number}</p>
                                </div>
                                <div class="ms-auto">
                                    <button class="btn btn-primary btn-sm" onclick="startConsultation(${data.next_in_queue.appointment_id})">
                                        <i class="fas fa-play me-2"></i>Start Consultation
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    currentPatientInfo.innerHTML = `
                        <div class="alert alert-info mb-0">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                <div>
                                    <h6 class="mb-1">No Active Patients</h6>
                                    <p class="mb-0">All consultations completed for today</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error('Failed to load queue status:', e);
            currentPatientInfo.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load queue status
                </div>
            `;
        }
    }

    // Start consultation function (global scope for onclick)
    window.startConsultation = async function(appointmentId) {
        try {
            const docId = await getDoctorId();
            const res = await axios.post(queueApi, {
                operation: 'start_consultation',
                json: JSON.stringify({ appointment_id: appointmentId, doctor_id: docId })
            });

            if (res.data.success) {
                Swal.fire('Success', 'Consultation started!', 'success');
                loadQueueStatus();
            } else {
                Swal.fire('Error', res.data.message || 'Failed to start consultation', 'error');
            }
        } catch (e) {
            console.error('Failed to start consultation:', e);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    // Complete consultation function (global scope for onclick)
    window.completeConsultation = async function(appointmentId) {
        try {
            const docId = await getDoctorId();
            const res = await axios.post(queueApi, {
                operation: 'complete_consultation',
                json: JSON.stringify({ appointment_id: appointmentId, doctor_id: docId })
            });

            if (res.data.success) {
                Swal.fire('Success', 'Consultation completed!', 'success');
                loadQueueStatus();
            } else {
                Swal.fire('Error', res.data.message || 'Failed to complete consultation', 'error');
            }
        } catch (e) {
            console.error('Failed to complete consultation:', e);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    // View consultation details
    window.viewConsultationDetails = async function(consultationId) {
        try {
            const res = await axios.get(`${integratedConsultationApi}?operation=get_details&consultation_id=${consultationId}`);
            if (res.data.success) {
                const data = res.data;

                let prescriptionsHtml = '';
                if (data.prescriptions && data.prescriptions.length > 0) {
                    prescriptionsHtml = '<h6>Prescriptions:</h6><ul>';
                    data.prescriptions.forEach(p => {
                        prescriptionsHtml += `<li><strong>${p.medicine_name}</strong> - ${p.dosage}, ${p.frequency}, ${p.duration}</li>`;
                    });
                    prescriptionsHtml += '</ul>';
                }

                let labRequestsHtml = '';
                if (data.lab_requests && data.lab_requests.length > 0) {
                    labRequestsHtml = '<h6>Lab Requests:</h6><ul>';
                    data.lab_requests.forEach(l => {
                        labRequestsHtml += `<li><strong>${l.type_name}</strong> - ${l.request_text}</li>`;
                    });
                    labRequestsHtml += '</ul>';
                }

                Swal.fire({
                    title: 'Consultation Details',
                    html: `
                        <div class="text-start">
                            <p><strong>Patient:</strong> ${data.consultation.patient_name}</p>
                            <p><strong>Date:</strong> ${data.consultation.appointment_date}</p>
                            <p><strong>Diagnosis:</strong> ${data.consultation.diagnosis}</p>
                            <p><strong>Notes:</strong> ${data.consultation.consultation_notes || 'None'}</p>
                            <p><strong>Next Appointment:</strong> ${data.consultation.next_appointment_date || 'None'}</p>
                            <p><strong>Follow-up Notes:</strong> ${data.consultation.next_appointment_notes || 'None'}</p>
                            ${prescriptionsHtml}
                            ${labRequestsHtml}
                        </div>
                    `,
                    width: '600px'
                });
            }
        } catch (e) {
            console.error('Failed to load consultation details:', e);
            Swal.fire('Error', 'Failed to load consultation details', 'error');
        }
    };

    // Edit consultation
    window.editConsultation = function(consultationId) {
        // TODO: Implement edit functionality
        Swal.fire('Info', 'Edit functionality coming soon!', 'info');
    };

    // Event listeners
    addPrescriptionBtn.addEventListener('click', addPrescriptionField);
    addLabRequestBtn.addEventListener('click', addLabRequestField);
    refreshQueueBtn?.addEventListener('click', loadCurrentQueueStatus);

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Check if there's a current patient
        if (!patientIdInput.value || !appointmentIdInput.value) {
            Swal.fire('Error', 'No patient currently in consultation. Please wait for the secretary to start a consultation.', 'error');
            return;
        }

        const docId = await getDoctorId();
        if (!docId) {
            Swal.fire('Error', 'Doctor profile not found.', 'error');
            return;
        }

        const formData = new FormData(form);
        const data = {
            appointment_id: formData.get('appointment_id'),
            doctor_id: docId,
            patient_id: formData.get('patient_id'),
            diagnosis: formData.get('diagnosis'),
            consultation_notes: formData.get('consultation_notes') || '',
            next_appointment_date: formData.get('next_appointment_date') || null,
            next_appointment_notes: formData.get('next_appointment_notes') || '',
            consultation_status: 'Completed'
        };

        // Collect prescriptions
        const prescriptions = [];
        const prescriptionElements = prescriptionsContainer.querySelectorAll('.card');
        prescriptionElements.forEach((element, index) => {
            const medicineId = element.querySelector('select[name*="[medicine_id]"]').value;
            const dosage = element.querySelector('input[name*="[dosage]"]').value;
            const frequency = element.querySelector('input[name*="[frequency]"]').value;
            const duration = element.querySelector('input[name*="[duration]"]').value;
            const instructions = element.querySelector('input[name*="[instructions]"]').value;

            if (medicineId && dosage && frequency && duration) {
                prescriptions.push({
                    medicine_id: medicineId,
                    dosage: dosage,
                    frequency: frequency,
                    duration: duration,
                    instructions: instructions
                });
            }
        });

        // Require at least one prescription
        if (prescriptions.length === 0) {
            Swal.fire('Error', 'At least one prescription is required to complete the consultation.', 'error');
            return;
        }

        // Collect lab requests
        const labRequests = [];
        const labRequestElements = labRequestsContainer.querySelectorAll('.card');
        labRequestElements.forEach((element, index) => {
            const labTestTypeId = element.querySelector('select[name*="[lab_test_type_id]"]').value;
            const requestText = element.querySelector('input[name*="[request_text]"]').value;

            if (labTestTypeId && requestText) {
                labRequests.push({
                    lab_test_type_id: labTestTypeId,
                    request_text: requestText
                });
            }
        });

        // Always include prescriptions (required)
        data.prescriptions = prescriptions;

        if (labRequests.length > 0) {
            data.lab_requests = labRequests;
        }

        try {
            const payload = new FormData();
            payload.append('operation', 'create');
            payload.append('json', JSON.stringify(data));

            // Debug: Log the data being sent
            console.log('Sending consultation data:', data);
            console.log('FormData payload:', payload);

            const res = await axios.post(integratedConsultationApi, payload);

            // Debug: Log the API response
            console.log('API Response:', res.data);

            if (res.data.success) {
                Swal.fire('Success', 'Consultation completed successfully!', 'success');
                form.reset();
                form.classList.remove('was-validated');
                prescriptionsContainer.innerHTML = '';
                labRequestsContainer.innerHTML = '';
                prescriptionCounter = 0;
                labRequestCounter = 0;
                loadMyConsultations();
                loadCurrentQueueStatus();
            } else {
                console.error('API Error Response:', res.data);
                const errorMessage = res.data.message || res.data.error || 'Unknown error occurred';
                Swal.fire('Error', errorMessage, 'error');
            }
        } catch (e) {
            console.error('Request failed:', e);
            console.error('Error response:', e.response?.data);
            console.error('Error status:', e.response?.status);
            console.error('Error headers:', e.response?.headers);

            let errorMessage = 'Something went wrong.';
            if (e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e.response?.data?.error) {
                errorMessage = e.response.data.error;
            } else if (e.message) {
                errorMessage = e.message;
            }

            Swal.fire('Error', errorMessage, 'error');
        }
    });

    // Set minimum date for next appointment
    const nextAppointmentDate = document.querySelector('input[name="next_appointment_date"]');
    if (nextAppointmentDate) {
        const today = new Date().toISOString().split('T')[0];
        nextAppointmentDate.min = today;
    }

    // Initial load - load queue status first to display current patient
    async function initialize() {
        await loadCurrentQueueStatus();
        await loadMyConsultations();
    }

    initialize();

    // Set up refresh for queue status
    if (refreshQueueBtn) {
        refreshQueueBtn.addEventListener('click', async () => {
            await loadCurrentQueueStatus();
        });
    }
});
