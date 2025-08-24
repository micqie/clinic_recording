document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseApiUrl') || 'http://localhost/clinic_recording/api';
    const enhancedQueueApi = `${baseApiUrl}/enhanced_queue_management.php`;
    const userApi = `${baseApiUrl}/user.php`;

    // Check if user is logged in and is a patient
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id || user.role !== 'patient') {
        window.location.href = '../../index.html';
        return;
    }

    // Elements
    const queueDate = document.getElementById('queueDate');
    const queueStatusContainer = document.getElementById('queueStatusContainer');
    const queueInfoContainer = document.getElementById('queueInfoContainer');
    const queueStatsContainer = document.getElementById('queueStatsContainer');
    const currentConsultationInfo = document.getElementById('currentConsultationInfo');
    const nextInQueueInfo = document.getElementById('nextInQueueInfo');

    // Statistics elements
    const totalPatients = document.getElementById('totalPatients');
    const inConsultation = document.getElementById('inConsultation');
    const waiting = document.getElementById('waiting');
    const completed = document.getElementById('completed');

    let patientId = null;
    let patientAppointment = null;

    // Initialize
    init();

    async function init() {
        setDefaultDate();
        await getPatientId();
        await loadQueueStatus();
    }

    function setDefaultDate() {
        const today = new Date().toISOString().slice(0, 10);
        queueDate.value = today;
    }

    async function getPatientId() {
        try {
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            patientId = prof.data?.context?.patient_id;
            if (!patientId) {
                throw new Error('No patient profile found');
            }
        } catch (error) {
            console.error('Failed to get patient ID:', error);
            Swal.fire('Error', 'Failed to load patient profile', 'error');
        }
    }

    async function loadQueueStatus() {
        try {
            const date = queueDate.value || new Date().toISOString().slice(0, 10);

            // Get general queue status
            const queueRes = await axios.get(`${enhancedQueueApi}?operation=get_enhanced_queue_status&date=${date}`);

            if (queueRes.data.success) {
                const queueData = queueRes.data;

                // Get patient's specific appointment for this date
                const patientRes = await axios.get(`${userApi}?operation=get_patient_appointment&patient_id=${patientId}&date=${date}`);

                if (patientRes.data.success) {
                    patientAppointment = patientRes.data.appointment;
                    updateQueueDisplay(queueData, patientAppointment);
                } else {
                    // Patient has no appointment for this date
                    updateQueueDisplay(queueData, null);
                }
            } else {
                throw new Error(queueRes.data.message || 'Failed to load queue status');
            }
        } catch (error) {
            console.error('Failed to load queue status:', error);
            showErrorState();
        }
    }

    function updateQueueDisplay(queueData, patientAppointment) {
        const appointments = queueData.all_appointments || [];
        const currentConsultation = queueData.current_consultation;
        const nextInQueue = queueData.next_in_queue;

        // Update statistics
        totalPatients.textContent = appointments.length;
        inConsultation.textContent = currentConsultation ? 1 : 0;
        waiting.textContent = queueData.confirmed_count || 0;
        completed.textContent = queueData.completed_count || 0;

        // Update queue information panels
        updateCurrentConsultationInfo(currentConsultation);
        updateNextInQueueInfo(nextInQueue);

        // Update main queue status display
        updateMainQueueStatus(patientAppointment, currentConsultation, nextInQueue, appointments);

        // Show containers
        queueInfoContainer.style.display = 'block';
        queueStatsContainer.style.display = 'block';
    }

    function updateMainQueueStatus(patientAppointment, currentConsultation, nextInQueue, appointments) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (!patientAppointment) {
            // Patient has no appointment for this date
            queueStatusContainer.innerHTML = `
                <div class="col-12">
                    <div class="card queue-status-card">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                            <h4 class="text-muted">No Appointment Today</h4>
                            <p class="text-muted">You don't have any appointments scheduled for ${queueDate.value}</p>
                            <small class="text-muted">Date: ${currentDate}</small>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const patientStatus = patientAppointment.appointment_status;
        const patientQueueNumber = patientAppointment.queue_number;

        if (patientStatus === 'Completed') {
            // Patient's consultation is completed
            queueStatusContainer.innerHTML = `
                <div class="col-12">
                    <div class="card queue-status-card completed-status">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-check-circle status-icon"></i>
                            <h2 class="mb-3">Consultation Completed</h2>
                            <div class="queue-number">#${patientQueueNumber}</div>
                            <p class="mb-0">Your consultation has been completed. Thank you for visiting!</p>
                            <small class="text-muted">Date: ${currentDate}</small>
                        </div>
                    </div>
                </div>
            `;
        } else if (patientStatus === 'In Consultation') {
            // Patient is currently in consultation
            queueStatusContainer.innerHTML = `
                <div class="col-12">
                    <div class="card queue-status-card current-consultation">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-user-md status-icon pulse"></i>
                            <h2 class="mb-3">Currently in Consultation</h2>
                            <div class="queue-number">#${patientQueueNumber}</div>
                            <p class="mb-0">You are currently being consulted by the doctor.</p>
                            <small class="text-muted">Date: ${currentDate}</small>
                        </div>
                    </div>
                </div>
            `;
        } else if (patientStatus === 'Confirmed') {
            // Patient is waiting in queue
            const currentQueueNumber = currentConsultation ? currentConsultation.queue_number : 0;
            const patientsAhead = patientQueueNumber - currentQueueNumber;
            const estimatedTime = calculateEstimatedTime(patientsAhead);
            const progress = calculateProgress(patientQueueNumber, appointments);

            queueStatusContainer.innerHTML = `
                <div class="col-12">
                    <div class="card queue-status-card waiting-status">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-clock status-icon"></i>
                            <h2 class="mb-3">Waiting in Queue</h2>
                            <div class="queue-number">#${patientQueueNumber}</div>

                            <div class="progress-ring">
                                <svg width="120" height="120">
                                    <circle class="bg" cx="60" cy="60" r="45"></circle>
                                    <circle class="progress" cx="60" cy="60" r="45"
                                            style="stroke-dashoffset: ${283 - (283 * progress / 100)}"></circle>
                                </svg>
                            </div>

                            <div class="estimated-time">
                                <h5>Estimated Wait Time</h5>
                                <p class="mb-0">${estimatedTime}</p>
                                <small>${patientsAhead} patient(s) ahead of you</small>
                            </div>

                            <div class="queue-info">
                                <p class="mb-1"><strong>Current Queue:</strong> #${currentQueueNumber || 'None'}</p>
                                <p class="mb-1"><strong>Your Position:</strong> ${patientsAhead > 0 ? patientsAhead : 'Next'}</p>
                                <p class="mb-0"><strong>Date:</strong> ${currentDate}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Other status (Pending, etc.)
            queueStatusContainer.innerHTML = `
                <div class="col-12">
                    <div class="card queue-status-card">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-hourglass-half fa-3x text-muted mb-3"></i>
                            <h4 class="text-muted">Appointment Status: ${patientStatus}</h4>
                            <p class="text-muted">Your appointment is currently ${patientStatus.toLowerCase()}</p>
                            <small class="text-muted">Date: ${currentDate}</small>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    function updateCurrentConsultationInfo(currentConsultation) {
        if (currentConsultation) {
            currentConsultationInfo.innerHTML = `
                <div class="queue-number">#${currentConsultation.queue_number}</div>
                <h5>${currentConsultation.patient_name}</h5>
                <p class="mb-0">Dr. ${currentConsultation.doctor_name || 'Unassigned'}</p>
            `;
        } else {
            currentConsultationInfo.innerHTML = `
                <i class="fas fa-user-md fa-3x text-muted mb-3"></i>
                <p class="mb-0">No patient currently consulting</p>
            `;
        }
    }

    function updateNextInQueueInfo(nextInQueue) {
        if (nextInQueue) {
            nextInQueueInfo.innerHTML = `
                <div class="queue-number">#${nextInQueue.queue_number}</div>
                <h5>${nextInQueue.patient_name}</h5>
                <p class="mb-0">Dr. ${nextInQueue.doctor_name || 'Unassigned'}</p>
            `;
        } else {
            nextInQueueInfo.innerHTML = `
                <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                <p class="mb-0">No patients waiting</p>
            `;
        }
    }

    function calculateEstimatedTime(patientsAhead) {
        if (patientsAhead <= 0) {
            return "Your turn now";
        }

        const estimatedMinutes = patientsAhead * 15; // 15 minutes per patient
        if (estimatedMinutes < 60) {
            return `~${estimatedMinutes} minutes`;
        } else {
            const hours = Math.floor(estimatedMinutes / 60);
            const minutes = estimatedMinutes % 60;
            return `~${hours}h ${minutes}m`;
        }
    }

    function calculateProgress(patientQueueNumber, appointments) {
        if (appointments.length === 0) return 0;

        const confirmedAppointments = appointments.filter(apt =>
            apt.appointment_status === 'Confirmed' && apt.queue_number <= patientQueueNumber
        );

        return Math.round((confirmedAppointments.length / appointments.length) * 100);
    }

    function showErrorState() {
        queueStatusContainer.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                        <h4 class="text-danger">Failed to Load Queue Status</h4>
                        <p class="text-muted">Please try refreshing the page or contact support if the problem persists.</p>
                        <button class="btn btn-primary" onclick="loadQueueStatus()">
                            <i class="fas fa-sync-alt me-2"></i>Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Global function for refresh button
    window.loadQueueStatus = loadQueueStatus;

    // Event listeners
    queueDate?.addEventListener('change', loadQueueStatus);

    // Auto-refresh every 30 seconds
    setInterval(loadQueueStatus, 30000);
});
