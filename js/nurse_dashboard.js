document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const enhancedQueueV2Api = `${baseApiUrl}/enhanced_queue_management_v2.php`;
    const userApi = `${baseApiUrl}/user.php`;
    let nurseId = null;

    // Ensure user exists and is a nurse
    if (!user?.id || user.role?.toLowerCase() !== 'nurse') {
        window.location.href = '/clinic_recording/index.html';
        return;
    }

    // DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const walkInForm = document.getElementById('walkInForm');
    const vitalsForm = document.getElementById('vitalsForm');
    const createWalkInBtn = document.getElementById('createWalkInBtn');
    const saveVitalsBtn = document.getElementById('saveVitalsBtn');

    // Load initial data (wait for nurseId before enabling actions)
    initializeNurse().finally(() => {
        loadTodayAppointments();
        loadPatients();
        loadAppointmentReasons();
    });

    // Event listeners
    refreshBtn?.addEventListener('click', loadTodayAppointments);
    createWalkInBtn?.addEventListener('click', createWalkIn);
    saveVitalsBtn?.addEventListener('click', saveVitals);

    // Initialize nurse context (fetch nurse_id)
    async function initializeNurse() {
        try {
            const resp = await axios.post(userApi, {
                operation: 'get_user_context',
                json: JSON.stringify({ user_id: user.id })
            });
            if (resp.data?.success && resp.data?.context?.nurse_id) {
                nurseId = resp.data.context.nurse_id;
            }
        } catch (e) {
            console.error('Failed to load nurse context', e);
        }
    }

    // Load today's appointments
    async function loadTodayAppointments() {
        try {
            const response = await axios.get(`${baseApiUrl}/nurse.php?operation=get_today_appointments`);
            if (response.data?.success) {
                displayAppointments(response.data.data);
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
            appointmentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No appointments for today</td></tr>';
            return;
        }

        appointmentsTableBody.innerHTML = appointments.map(appointment => {
            const vitalsStatus = appointment.vitals_recorded_at ?
                `<span class="badge bg-success">Recorded</span>` :
                `<span class="badge bg-warning">Pending</span>`;

            const vitalsButton = appointment.vitals_recorded_at ?
                `<button class="btn btn-sm btn-outline-info" onclick="editVitals(${appointment.appointment_id})">
                    <i class="fas fa-edit me-1"></i>Edit Vitals
                </button>` :
                `<button class="btn btn-sm btn-primary" onclick="recordVitals(${appointment.appointment_id})">
                    <i class="fas fa-heartbeat me-1"></i>Record Vitals
                </button>`;

            const forwardButton = `
                <button class="btn btn-sm btn-success ms-2" onclick="forwardToDoctor(${appointment.appointment_id})" title="Forward to assigned doctor">
                    <i class="fas fa-share-square me-1"></i>Forward to Doctor
                </button>`;

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
                    <td>${appointment.doctor_name ? 'Dr. ' + appointment.doctor_name : '<span class="text-muted">Unassigned</span>'}</td>
                    <td>${vitalsStatus}</td>
                    <td>${vitalsButton} ${forwardButton}</td>
                </tr>
            `;
        }).join('');
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

    // Create walk-in appointment
    async function createWalkIn() {
        if (!walkInForm?.checkValidity()) {
            walkInForm?.classList.add('was-validated');
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

    // Record vitals (global function for onclick)
    window.recordVitals = function(appointmentId) {
        document.getElementById('vitals_appointment_id').value = appointmentId;
        vitalsForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('vitalsModal')) ||
        new bootstrap.Modal(document.getElementById('vitalsModal')).show();
    };

    // Edit vitals (global function for onclick)
    window.editVitals = function(appointmentId) {
        // Find appointment data and populate form
        // This would require loading the specific appointment's vitals data
        document.getElementById('vitals_appointment_id').value = appointmentId;
        vitalsForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('vitalsModal')) ||
        new bootstrap.Modal(document.getElementById('vitalsModal')).show();
    };

    // Save vitals & history
    async function saveVitals() {
        const formData = new FormData(vitalsForm);
        const data = {
            appointment_id: formData.get('appointment_id'),
            height_cm: formData.get('height_cm'),
            weight_kg: formData.get('weight_kg'),
            blood_pressure_mmHg: formData.get('blood_pressure_mmHg'),
            heart_rate_bpm: formData.get('heart_rate_bpm'),
            spo2_percent: formData.get('spo2_percent'),
            chief_complaint: formData.get('chief_complaint'),
            past_medical_history: formData.get('past_medical_history'),
            current_medications: formData.get('current_medications'),
            family_history: formData.get('family_history'),
            social_history: formData.get('social_history'),
            recorded_by_user_id: user.id
        };

        try {
            const response = await axios.post(`${baseApiUrl}/nurse.php`, new URLSearchParams({
                operation: 'upsert_vitals',
                json: JSON.stringify(data)
            }));

            if (response.data?.success) {
                // Optionally keep automatic forward, but allow manual via button too
                try {
                    await forwardToDoctor(data.appointment_id, /*silent*/ true);
                } catch (forwardErr) {
                    console.error('Forwarding to doctor failed:', forwardErr);
                    Swal.fire('Warning', 'Saved, but forwarding to doctor failed. You may retry via the button.', 'warning');
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Saved',
                    text: 'Vitals and history saved. Patient moved to doctor queue.',
                    timer: 2000,
                    showConfirmButton: false
                });
                vitalsForm.reset();
                bootstrap.Modal.getInstance(document.getElementById('vitalsModal'))?.hide();
                loadTodayAppointments();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to record vitals', 'error');
            }
        } catch (error) {
            console.error('Error saving vitals:', error);
            Swal.fire('Error', 'Failed to record vital signs', 'error');
        }
    }

    // Expose a manual forward button for nurses
    window.forwardToDoctor = async function(appointmentId, silent = false) {
        try {
            // Ensure nurseId is available
            if (!nurseId) {
                await initializeNurse();
            }
            if (!nurseId) {
                throw new Error('Nurse context not loaded. Please refresh and try again.');
            }

            const params = new URLSearchParams();
            params.append('operation', 'complete_nurse_consultation');
            params.append('json', JSON.stringify({ appointment_id: appointmentId, nurse_id: nurseId }));

            const resp = await axios.post(enhancedQueueV2Api, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (!resp.data?.success) {
                throw new Error(resp.data?.message || 'Failed to forward to doctor');
            }

            if (!silent) {
                Swal.fire('Success', 'Patient forwarded to doctor.', 'success');
            }
            // Refresh
            loadTodayAppointments();
        } catch (e) {
            if (!silent) {
                Swal.fire('Error', e.message || 'Failed to forward to doctor', 'error');
            }
            throw e;
        }
    };
});
