document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseApiUrl') || 'http://localhost/clinic_recording/api';
    const enhancedQueueApi = `${baseApiUrl}/enhanced_queue_management.php`;
    const enhancedQueueV2Api = `${baseApiUrl}/enhanced_queue_management_v2.php`;
    const appointmentsApi = `${baseApiUrl}/appointments.php`;
    const doctorsApi = `${baseApiUrl}/doctors.php`;
    const nursesApi = `${baseApiUrl}/nurses.php`;

    // Debug API URLs
    console.log('Base API URL:', baseApiUrl);
    console.log('Enhanced Queue API URL:', enhancedQueueApi);
    console.log('Appointments API URL:', appointmentsApi);
    console.log('Doctors API URL:', doctorsApi);

    // Check if user is logged in and is a secretary
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id || user.role !== 'secretary') {
        window.location.href = '../../index.html';
        return;
    }

    // Elements
    const queueDate = document.getElementById('queueDate');
    const queueDoctor = document.getElementById('queueDoctor');
    const showCompleted = document.getElementById('showCompleted');
    const currentPatientInfo = document.getElementById('currentPatientInfo');
    const nextPatientInfo = document.getElementById('nextPatientInfo');
    const completeBtn = document.getElementById('completeBtn');
    const startNextBtn = document.getElementById('startNextBtn');
    const queueList = document.getElementById('queueList');
    const availablePatients = document.getElementById('availablePatients');

    // Nurse assignment elements
    const nursePatientSelect = document.getElementById('nursePatientSelect');
    const sendToNurseBtn = document.getElementById('sendToNurseBtn');

    // Statistics elements
    const totalPatients = document.getElementById('totalPatients');
    const currentConsultation = document.getElementById('currentConsultation');
    const waitingPatients = document.getElementById('waitingPatients');
    const completedPatients = document.getElementById('completedPatients');

    // Initialize
    init();

    async function init() {
        setDefaultDate();
        await loadDoctors();
        await loadQueueStatus();
        loadAvailablePatients();
        loadNursePatients();
        setupNurseEventListeners();
    }

    function setDefaultDate() {
        // Get today's date in local timezone to avoid timezone issues
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        console.log('Setting default date to:', todayString);
        queueDate.value = todayString;
    }

    async function loadDoctors() {
        try {
            const resp = await axios.get(`${doctorsApi}?operation=getAll`);
            const doctors = resp.data.data || [];

            queueDoctor.innerHTML = '<option value="">All Doctors</option>';
            doctors.forEach(doctor => {
                const opt = document.createElement('option');
                opt.value = doctor.doctor_id;
                opt.textContent = doctor.doctor_name;
                queueDoctor.appendChild(opt);
            });
        } catch (error) {
            console.error('Failed to load doctors:', error);
        }
    }

    async function loadNursePatients() {
        try {
            const date = queueDate.value || new Date().toISOString().slice(0, 10);
            
            // Get confirmed appointments for the selected date
            const resp = await axios.get(`${appointmentsApi}?operation=get_confirmed_appointments&date=${date}`);
            const appointments = resp.data.data || [];

            nursePatientSelect.innerHTML = '<option value="">Choose patient to send to nurse</option>';
            appointments.forEach(apt => {
                // Only show patients with queue numbers (confirmed appointments)
                if (apt.queue_number && apt.appointment_status === 'Confirmed') {
                    const opt = document.createElement('option');
                    opt.value = apt.appointment_id;
                    opt.textContent = `Queue #${apt.queue_number}`;
                    nursePatientSelect.appendChild(opt);
                }
            });
        } catch (error) {
            console.error('Failed to load nurse patients:', error);
            // Fallback: show a simple message
            nursePatientSelect.innerHTML = '<option value="">Error loading patients</option>';
        }
    }

    function setupNurseEventListeners() {
        if (sendToNurseBtn) {
            sendToNurseBtn.addEventListener('click', sendToNurseQueue);
        }
    }

    async function sendToNurseQueue(appointmentIdOverride) {
        const appointmentId = appointmentIdOverride || nursePatientSelect.value;

        if (!appointmentId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a patient to send to nurse.'
            });
            return;
        }

        try {
            // Assign to nurse via Enhanced Queue v2 (backend will auto-pick if nurse_id not provided)
            const resp = await axios.post(enhancedQueueV2Api, {
                operation: 'assign_to_nurse',
                json: JSON.stringify({
                    appointment_id: appointmentId
                })
            });

            if (resp.data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: `Patient sent to nurse queue successfully!`
                });
                
                // Refresh data
                await loadQueueStatus();
                await loadNursePatients();
                
                // Keep selection but disable (read-only behavior)
                nursePatientSelect.setAttribute('disabled', 'disabled');
            } else {
                throw new Error(resp.data.message || 'Failed to send to nurse queue');
            }
        } catch (error) {
            console.error('Failed to send to nurse queue:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to send patient to nurse queue'
            });
        }
    }

    // Expose to global for inline onclick handlers in generated HTML
    window.sendToNurseQueue = sendToNurseQueue;

    async function loadQueueStatus() {
        try {
            const date = queueDate.value || new Date().toISOString().slice(0, 10);
            const doctorId = queueDoctor.value || '';

            console.log('Loading queue status for date:', date);

            let url = `${enhancedQueueApi}?operation=get_enhanced_queue_status&date=${date}`;
            if (doctorId) {
                url = `${enhancedQueueApi}?operation=get_doctor_queue_status&doctor_id=${doctorId}&date=${date}`;
            }

            const res = await axios.get(url);
            if (res.data.success) {
                updateQueueDisplay(res.data);

                // Show message if no appointments found for the date
                if (!res.data.all_appointments || res.data.all_appointments.length === 0) {
                    console.log('No appointments found for date:', date);
                }
            } else {
                throw new Error(res.data.message || 'Failed to load queue status');
            }
        } catch (error) {
            console.error('Failed to load queue status:', error);

            // Show user-friendly error message
            let errorMessage = 'Failed to load queue status';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Swal.fire('Error', errorMessage, 'error');

            // Clear the display when there's an error
            updateQueueDisplay({
                all_appointments: [],
                current_consultation: null,
                next_in_queue: null,
                confirmed_count: 0,
                completed_count: 0
            });
        }
    }

    function updateQueueDisplay(data) {
        const appointments = data.all_appointments || [];
        const currentConsultationData = data.current_consultation;
        const nextInQueueData = data.next_in_queue;

        // Update statistics
        totalPatients.textContent = appointments.length;
        currentConsultation.textContent = currentConsultationData ? 1 : 0;
        waitingPatients.textContent = data.confirmed_count || 0;
        completedPatients.textContent = data.completed_count || 0;

        // Update current consultation panel
        if (currentConsultationData) {
            currentPatientInfo.innerHTML = `
                <p class="mb-1"><strong>Queue #${currentConsultationData.queue_number}</strong></p>
                <p class="mb-1">${currentConsultationData.patient_name}</p>
                <p class="mb-0">Dr. ${currentConsultationData.doctor_name || 'Unassigned'}</p>
            `;
            completeBtn.style.display = 'block';
        } else {
            currentPatientInfo.innerHTML = '<p class="mb-1">No patient currently consulting</p>';
            completeBtn.style.display = 'none';
        }

        // Update next patient panel
        if (nextInQueueData) {
            nextPatientInfo.innerHTML = `
                <p class="mb-1"><strong>Queue #${nextInQueueData.queue_number}</strong></p>
                <p class="mb-1">${nextInQueueData.patient_name}</p>
                <p class="mb-0">Dr. ${nextInQueueData.doctor_name || 'Unassigned'}</p>
            `;
            startNextBtn.style.display = 'block';

            // Auto-select next in queue in nurse dropdown and make it read-only
            if (nursePatientSelect) {
                // Ensure the option exists; if not, add it
                let opt = Array.from(nursePatientSelect.options).find(o => o.value == nextInQueueData.appointment_id);
                if (!opt) {
                    opt = document.createElement('option');
                    opt.value = nextInQueueData.appointment_id;
                    opt.textContent = `Queue #${nextInQueueData.queue_number}`;
                    nursePatientSelect.appendChild(opt);
                }
                nursePatientSelect.value = String(nextInQueueData.appointment_id);
                nursePatientSelect.setAttribute('disabled', 'disabled');
            }
        } else {
            nextPatientInfo.innerHTML = '<p class="mb-1">No patients waiting</p>';
            startNextBtn.style.display = 'none';

            // No next patient; allow manual selection from queue list
            nursePatientSelect?.removeAttribute('disabled');
        }

        // Update queue list
        renderQueueList(appointments, currentConsultationData, nextInQueueData);
    }

    function renderQueueList(appointments, currentConsultation, nextInQueue) {
        if (!queueList) {
            console.error('queueList element not found');
            return;
        }
        
        queueList.innerHTML = '';

        if (appointments.length === 0) {
            queueList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No appointments found for this date</h5>
                </div>
            `;
            return;
        }

        appointments.forEach(appointment => {
            const isCurrent = currentConsultation && currentConsultation.appointment_id === appointment.appointment_id;
            const isNext = nextInQueue && nextInQueue.appointment_id === appointment.appointment_id;
            const isCompleted = appointment.appointment_status === 'Completed';
            const showCompletedCheck = showCompleted.checked;

            if (isCompleted && !showCompletedCheck) {
                return; // Skip completed appointments if not showing them
            }

            const cardClass = isCurrent ? 'current' : isNext ? 'next' : isCompleted ? 'completed' : '';
            const queueNumberClass = isCurrent ? 'current' : isNext ? 'next' : '';

            const card = document.createElement('div');
            card.className = `col-md-6 col-lg-4 mb-3`;
            card.innerHTML = `
                <div class="card queue-card ${cardClass} h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="queue-number ${queueNumberClass}">#${appointment.queue_number}</div>
                            <span class="badge status-badge ${getStatusClass(appointment.appointment_status)}">
                                ${appointment.appointment_status}
                            </span>
                        </div>
                        <div class="patient-info">
                            <h6 class="mb-2">${appointment.patient_name}</h6>
                            <p class="mb-1"><small class="text-muted">Doctor: ${appointment.doctor_name || 'Unassigned'}</small></p>
                            <p class="mb-1"><small class="text-muted">Specialization: ${appointment.specialization_name || 'N/A'}</small></p>
                        </div>
                        <div class="action-buttons mt-3">
                            ${!isCompleted ? `
                                ${appointment.appointment_status === 'Confirmed' ? `
                                    <button class=\"btn btn-sm btn-info me-2\" onclick=\"window.sendToNurseQueue(${appointment.appointment_id})\">
                                        <i class=\"fas fa-user-nurse me-1\"></i>Send to Nurse
                                    </button>
                                ` : appointment.appointment_status === 'Queued to Doctor' ? `
                                    <button class=\"btn btn-sm btn-primary me-2\" onclick=\"window.startConsultation(${appointment.appointment_id})\">
                                        <i class=\"fas fa-play me-1\"></i>Start
                                    </button>
                                ` : isCurrent ? `
                                    <button class=\"btn btn-sm btn-success me-2\" onclick=\"window.completeConsultation(${appointment.appointment_id})\">
                                        <i class=\"fas fa-check me-1\"></i>Complete
                                    </button>
                                ` : `
                                    <span class=\"text-muted small\">${appointment.appointment_status}</span>
                                `}
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            queueList.appendChild(card);
        });
    }

    function getStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower === 'confirmed') return 'bg-warning';
        if (statusLower === 'in consultation') return 'bg-primary';
        if (statusLower === 'completed') return 'bg-success';
        return 'bg-secondary';
    }

    async function loadAvailablePatients() {
        try {
            const date = queueDate.value || new Date().toISOString().slice(0, 10);
            const resp = await axios.get(`${appointmentsApi}?operation=get_confirmed_appointments&date=${date}`);

            if (resp.data.success) {
                const patients = resp.data.data || [];
                renderAvailablePatients(patients);
            }
        } catch (error) {
            console.error('Failed to load available patients:', error);
        }
    }

    function renderAvailablePatients(patients) {
        availablePatients.innerHTML = '';

        if (patients.length === 0) {
            availablePatients.innerHTML = '<p class="text-muted">No confirmed appointments found for this date.</p>';
            return;
        }

        patients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'card mb-2';
            patientCard.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${patient.patient_name}</h6>
                            <small class="text-muted">Queue #${patient.queue_number} - Dr. ${patient.doctor_name || 'Unassigned'}</small>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="window.startConsultation(${patient.appointment_id})">
                            <i class="fas fa-play me-1"></i>Start
                        </button>
                    </div>
                </div>
            `;
            availablePatients.appendChild(patientCard);
        });
    }

    // Global functions - make sure they're accessible
    window.startConsultation = async function(appointmentId) {
        console.log('startConsultation called with appointment ID:', appointmentId);
        console.log('Function is accessible:', typeof window.startConsultation);

        try {
            const result = await Swal.fire({
                title: 'Start Consultation?',
                text: 'This will mark the patient as currently in consultation.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, start consultation'
            });

            if (result.isConfirmed) {
                console.log('Starting consultation for appointment ID:', appointmentId);
                console.log('Secretary ID:', user.id);
                console.log('API URL:', enhancedQueueApi);

                const requestData = {
                    operation: 'set_current_consultation',
                    json: JSON.stringify({
                        appointment_id: appointmentId,
                        secretary_id: user.id
                    })
                };

                console.log('Request data:', requestData);

                // Use URLSearchParams for simpler POST data
                const params = new URLSearchParams();
                params.append('operation', 'set_current_consultation');
                params.append('json', JSON.stringify({
                    appointment_id: appointmentId,
                    secretary_id: user.id
                }));

                console.log('URLSearchParams entries:');
                for (let [key, value] of params.entries()) {
                    console.log(key, value);
                }

                const res = await axios.post(enhancedQueueApi, params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                console.log('API Response:', res.data);

                if (res.data.success) {
                    Swal.fire('Success', 'Consultation started!', 'success');
                    await loadQueueStatus();
                    loadAvailablePatients();
                } else {
                    Swal.fire('Error', res.data.message || 'Failed to start consultation', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to start consultation:', error);
            console.error('Error details:', error.response?.data || error.message);
            console.error('Error status:', error.response?.status);
            console.error('Error headers:', error.response?.headers);

            let errorMessage = 'Something went wrong';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Swal.fire('Error', errorMessage, 'error');
        }
    };

    window.completeConsultation = async function(appointmentId) {
        console.log('completeConsultation called with appointment ID:', appointmentId);
        console.log('Function is accessible:', typeof window.completeConsultation);

        try {
            const result = await Swal.fire({
                title: 'Complete Consultation?',
                text: 'This will mark the consultation as completed and move to the next patient.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, complete'
            });

            if (result.isConfirmed) {
                const params = new URLSearchParams();
                params.append('operation', 'complete_and_next');
                params.append('json', JSON.stringify({
                    secretary_id: user.id,
                    date: queueDate.value || new Date().toISOString().slice(0, 10)
                }));

                const res = await axios.post(enhancedQueueApi, params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (res.data.success) {
                    Swal.fire('Success', res.data.message, 'success');
                    await loadQueueStatus();
                    loadAvailablePatients();
                } else {
                    Swal.fire('Error', res.data.message || 'Failed to complete consultation', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to complete consultation:', error);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    window.completeCurrentConsultation = function() {
        // Find current consultation appointment ID
        const currentPatientElement = currentPatientInfo.querySelector('p strong');
        if (currentPatientElement) {
            const queueNumber = currentPatientElement.textContent.replace('Queue #', '');
            // Find appointment with this queue number
            const appointment = findAppointmentByQueueNumber(queueNumber);
            if (appointment) {
                completeConsultation(appointment.appointment_id);
            }
        }
    };

    window.startNextConsultation = function() {
        // Find next patient appointment ID
        const nextPatientElement = nextPatientInfo.querySelector('p strong');
        if (nextPatientElement) {
            const queueNumber = nextPatientElement.textContent.replace('Queue #', '');
            // Find appointment with this queue number
            const appointment = findAppointmentByQueueNumber(queueNumber);
            if (appointment) {
                startConsultation(appointment.appointment_id);
            }
        }
    };

    function findAppointmentByQueueNumber(queueNumber) {
        // This would need to be implemented based on the current queue data
        // For now, we'll reload the queue status to get fresh data
        loadQueueStatus();
    }

    // Event listeners
    queueDate?.addEventListener('change', () => {
        loadQueueStatus();
        loadAvailablePatients();
    });

    queueDoctor?.addEventListener('change', loadQueueStatus);
    showCompleted?.addEventListener('change', loadQueueStatus);

    // Auto-refresh every 30 seconds
    setInterval(loadQueueStatus, 30000);

    // Make loadQueueStatus globally accessible
    window.loadQueueStatus = loadQueueStatus;
});
