document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    if (!user.id) {
        window.location.href = '../../index.html';
        return;
    }

    // DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const nurseQueueTableBody = document.getElementById('nurseQueueTableBody');
    const doctorQueueTableBody = document.getElementById('doctorQueueTableBody');
    const completedTableBody = document.getElementById('completedTableBody');
    const assignNurseForm = document.getElementById('assignNurseForm');
    const confirmAssignBtn = document.getElementById('confirmAssignBtn');
    
    // Count elements
    const readyForNurseCount = document.getElementById('readyForNurseCount');
    const withNurseCount = document.getElementById('withNurseCount');
    const withDoctorCount = document.getElementById('withDoctorCount');
    const completedCount = document.getElementById('completedCount');

    // Initialize
    loadQueueStatus();
    loadNurses();

    // Event listeners
    refreshBtn?.addEventListener('click', loadQueueStatus);
    confirmAssignBtn?.addEventListener('click', assignToNurse);

    // Load queue status
    async function loadQueueStatus() {
        try {
            const response = await axios.get(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                params: {
                    operation: 'get_current_queue_status',
                    date: new Date().toISOString().split('T')[0]
                }
            });

            if (response.data?.success) {
                const data = response.data.data;
                displayNurseQueue(data.nurse_queue);
                displayDoctorQueue(data.doctor_queue);
                displayCompleted(data.completed);
                updateQueueCounts(data);
            } else {
                console.error('Failed to load queue status:', response.data?.message);
            }
        } catch (error) {
            console.error('Error loading queue status:', error);
        }
    }

    // Display nurse queue
    function displayNurseQueue(appointments) {
        if (!appointments || appointments.length === 0) {
            nurseQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in nurse queue</td></tr>';
            return;
        }

        nurseQueueTableBody.innerHTML = appointments.map(appointment => {
            const statusBadge = getStatusBadge(appointment.appointment_status);
            const actions = getNurseActionButtons(appointment);
            
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

    // Display doctor queue
    function displayDoctorQueue(appointments) {
        if (!appointments || appointments.length === 0) {
            doctorQueueTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No patients in doctor queue</td></tr>';
            return;
        }

        doctorQueueTableBody.innerHTML = appointments.map(appointment => {
            const statusBadge = getStatusBadge(appointment.appointment_status);
            const actions = getDoctorActionButtons(appointment);
            
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

    // Display completed appointments
    function displayCompleted(appointments) {
        if (!appointments || appointments.length === 0) {
            completedTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No completed appointments</td></tr>';
            return;
        }

        completedTableBody.innerHTML = appointments.map(appointment => {
            return `
                <tr>
                    <td>${appointment.queue_number || 'N/A'}</td>
                    <td>${appointment.patient_name}</td>
                    <td>${appointment.patient_contact || 'N/A'}</td>
                    <td>${appointment.appointment_reason || 'N/A'}</td>
                    <td>${formatDateTime(appointment.completed_at)}</td>
                </tr>
            `;
        }).join('');
    }

    // Get status badge
    function getStatusBadge(status) {
        const badges = {
            'Confirmed': '<span class="badge bg-secondary status-badge">Confirmed</span>',
            'Ready for Nurse': '<span class="badge bg-warning status-badge">Ready for Nurse</span>',
            'With Nurse': '<span class="badge bg-info status-badge">With Nurse</span>',
            'Ready for Doctor': '<span class="badge bg-success status-badge">Ready for Doctor</span>',
            'With Doctor': '<span class="badge bg-primary status-badge">With Doctor</span>',
            'Completed': '<span class="badge bg-success status-badge">Completed</span>'
        };
        return badges[status] || '<span class="badge bg-secondary status-badge">Unknown</span>';
    }

    // Get nurse action buttons
    function getNurseActionButtons(appointment) {
        const actions = [];
        
        if (appointment.appointment_status === 'Confirmed') {
            actions.push(`
                <button class="btn btn-sm btn-info me-1" onclick="openAssignNurseModal(${appointment.appointment_id}, '${appointment.patient_name}')">
                    <i class="fas fa-user-nurse"></i> Assign Nurse
                </button>
            `);
        }
        
        return actions.join('');
    }

    // Get doctor action buttons
    function getDoctorActionButtons(appointment) {
        const actions = [];
        
        if (appointment.appointment_status === 'Ready for Doctor') {
            actions.push(`
                <span class="text-muted">Waiting for doctor to start</span>
            `);
        } else if (appointment.appointment_status === 'With Doctor') {
            actions.push(`
                <span class="text-info">In consultation</span>
            `);
        }
        
        return actions.join('');
    }

    // Update queue counts
    function updateQueueCounts(data) {
        const counts = {
            readyForNurse: 0,
            withNurse: 0,
            withDoctor: 0,
            completed: 0
        };

        // Count nurse queue
        data.nurse_queue?.forEach(appointment => {
            switch (appointment.appointment_status) {
                case 'Confirmed':
                case 'Ready for Nurse':
                    counts.readyForNurse++;
                    break;
                case 'With Nurse':
                    counts.withNurse++;
                    break;
            }
        });

        // Count doctor queue
        data.doctor_queue?.forEach(appointment => {
            switch (appointment.appointment_status) {
                case 'Ready for Doctor':
                    counts.readyForNurse++; // These are ready for doctor but counted in nurse section
                    break;
                case 'With Doctor':
                    counts.withDoctor++;
                    break;
                case 'Completed':
                    counts.completed++;
                    break;
            }
        });

        // Count completed
        data.completed?.forEach(() => {
            counts.completed++;
        });

        readyForNurseCount.textContent = counts.readyForNurse;
        withNurseCount.textContent = counts.withNurse;
        withDoctorCount.textContent = counts.withDoctor;
        completedCount.textContent = counts.completed;
    }

    // Load nurses
    async function loadNurses() {
        try {
            const response = await axios.get(`${baseApiUrl}/nurses.php`, {
                params: { operation: 'get_all_nurses' }
            });

            if (response.data?.success) {
                const nurseSelect = document.getElementById('assign_nurse_id');
                nurseSelect.innerHTML = '<option value="">Select nurse...</option>' +
                    response.data.data.map(nurse => 
                        `<option value="${nurse.nurse_id}">${nurse.name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading nurses:', error);
        }
    }

    // Open assign nurse modal
    window.openAssignNurseModal = function(appointmentId, patientName) {
        document.getElementById('assign_appointment_id').value = appointmentId;
        document.getElementById('assign_patient_name').value = patientName;
        
        const modal = new bootstrap.Modal(document.getElementById('assignNurseModal'));
        modal.show();
    };

    // Assign to nurse
    async function assignToNurse() {
        const appointmentId = document.getElementById('assign_appointment_id').value;
        const nurseId = document.getElementById('assign_nurse_id').value;

        if (!nurseId) {
            Swal.fire('Error', 'Please select a nurse', 'error');
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/enhanced_queue_management_v2.php`, {
                operation: 'assign_to_nurse',
                json: JSON.stringify({
                    appointment_id: appointmentId,
                    nurse_id: nurseId
                })
            });

            if (response.data?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Patient Assigned',
                    text: 'Patient has been assigned to nurse successfully.',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                bootstrap.Modal.getInstance(document.getElementById('assignNurseModal'))?.hide();
                loadQueueStatus();
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to assign patient to nurse', 'error');
            }
        } catch (error) {
            console.error('Error assigning to nurse:', error);
            Swal.fire('Error', 'Failed to assign patient to nurse', 'error');
        }
    }

    // Format date time
    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString();
    }

    // Auto-refresh every 30 seconds
    setInterval(loadQueueStatus, 30000);
});
