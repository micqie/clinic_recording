document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    loadLabRequests();
    loadPatients();
    loadDoctors();
    loadAppointments();
    setupEventListeners();
});

function setupEventListeners() {
    // Add Lab Request Form
    document.getElementById('saveLabRequestBtn').addEventListener('click', addLabRequest);

    // Edit Lab Request Form
    document.getElementById('updateLabRequestBtn').addEventListener('click', updateLabRequest);

    // Modal cleanup
    const addLabRequestModal = document.getElementById('addLabRequestModal');
    const editLabRequestModal = document.getElementById('editLabRequestModal');

    addLabRequestModal.addEventListener('hidden.bs.modal', function() {
        document.getElementById('addLabRequestForm').reset();
    });

    editLabRequestModal.addEventListener('hidden.bs.modal', function() {
        document.getElementById('editLabRequestForm').reset();
    });
}

async function loadLabRequests() {
    try {
        const response = await axios.get('../../api/lab_requests.php?operation=getAll');

        if (response.data.success) {
            displayLabRequests(response.data.requests);
        } else {
            showAlert('error', 'Failed to load lab requests: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading lab requests:', error);
        showAlert('error', 'Failed to load lab requests. Please try again.');
    }
}

function displayLabRequests(requests) {
    const tbody = document.getElementById('labRequestsTableBody');
    tbody.innerHTML = '';

    if (requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-flask fa-3x mb-3"></i>
                    <p>No lab requests found</p>
                </td>
            </tr>
        `;
        return;
    }

    requests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <div class="fw-semibold">${request.patient_name}</div>
                        <small class="text-muted">ID: ${request.patient_id}</small>
                    </div>
                </div>
            </td>
            <td>${request.doctor_name || 'Not assigned'}</td>
            <td>
                <div class="text-truncate" style="max-width: 200px;" title="${request.request_text}">
                    ${request.request_text}
                </div>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(request.status_name)}">${request.status_name || 'Processing'}</span>
            </td>
            <td>${formatDate(request.created_at)}</td>
            <td>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="editLabRequest(${request.lab_request_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteLabRequest(${request.lab_request_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Processing':
            return 'bg-warning';
        case 'Ready':
            return 'bg-success';
        case 'Delivered':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

async function loadPatients() {
    try {
        const response = await axios.get('../../api/patients.php?operation=getAll');

        if (response.data.success) {
            populatePatientSelects(response.data.patients);
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

async function loadDoctors() {
    try {
        const response = await axios.get('../../api/doctors.php?operation=getAll');

        if (response.data.success) {
            populateDoctorSelects(response.data.doctors);
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

async function loadAppointments() {
    try {
        const response = await axios.get('../../api/appointments.php?operation=getAll');

        if (response.data.success) {
            populateAppointmentSelects(response.data.appointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function populatePatientSelects(patients) {
    const patientSelects = ['patientSelect', 'editPatientSelect'];

    patientSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Patient</option>';
            patients.forEach(patient => {
                const option = document.createElement('option');
                option.value = patient.patient_id;
                option.textContent = `${patient.name} (ID: ${patient.patient_id})`;
                select.appendChild(option);
            });
        }
    });
}

function populateDoctorSelects(doctors) {
    const doctorSelects = ['doctorSelect', 'editDoctorSelect'];

    doctorSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Doctor (Optional)</option>';
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.doctor_id;
                option.textContent = `${doctor.name} - ${doctor.specialization || 'General'}`;
                select.appendChild(option);
            });
        }
    });
}

function populateAppointmentSelects(appointments) {
    const appointmentSelects = ['appointmentSelect', 'editAppointmentSelect'];

    appointmentSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Appointment (Optional)</option>';
            appointments.forEach(appointment => {
                const option = document.createElement('option');
                option.value = appointment.appointment_id;
                option.textContent = `Appointment #${appointment.appointment_id} - ${appointment.appointment_date}`;
                select.appendChild(option);
            });
        }
    });
}

async function addLabRequest() {
    const form = document.getElementById('addLabRequestForm');
    const formData = new FormData(form);

    // Validate required fields
    if (!formData.get('patient_id') || !formData.get('request_text')) {
        showAlert('error', 'Please fill in all required fields.');
        return;
    }

    const labRequestData = {
        patient_id: formData.get('patient_id'),
        doctor_id: formData.get('doctor_id') || null,
        appointment_id: formData.get('appointment_id') || null,
        request_text: formData.get('request_text'),
        status_id: formData.get('status_id') || 14
    };

    try {
        const response = await axios.post('../../api/lab_requests.php', {
            operation: 'add',
            json: JSON.stringify(labRequestData)
        });

        if (response.data.success) {
            showAlert('success', 'Lab request added successfully!');
            bootstrap.Modal.getInstance(document.getElementById('addLabRequestModal')).hide();
            loadLabRequests();
        } else {
            showAlert('error', response.data.message);
        }
    } catch (error) {
        console.error('Error adding lab request:', error);
        showAlert('error', 'Failed to add lab request. Please try again.');
    }
}

async function editLabRequest(labRequestId) {
    try {
        const response = await axios.get(`../../api/lab_requests.php?operation=getById&lab_request_id=${labRequestId}`);

        if (response.data.success) {
            const request = response.data.request;
            populateEditForm(request);
            bootstrap.Modal.getInstance(document.getElementById('editLabRequestModal')).show();
        } else {
            showAlert('error', response.data.message);
        }
    } catch (error) {
        console.error('Error loading lab request details:', error);
        showAlert('error', 'Failed to load lab request details.');
    }
}

function populateEditForm(request) {
    document.getElementById('editLabRequestId').value = request.lab_request_id;
    document.getElementById('editPatientSelect').value = request.patient_id;
    document.getElementById('editDoctorSelect').value = request.doctor_id || '';
    document.getElementById('editAppointmentSelect').value = request.appointment_id || '';
    document.getElementById('editRequestStatus').value = request.status_id || 14;
    document.getElementById('editRequestText').value = request.request_text;
}

async function updateLabRequest() {
    const form = document.getElementById('editLabRequestForm');
    const formData = new FormData(form);

    const labRequestData = {
        lab_request_id: formData.get('lab_request_id'),
        patient_id: formData.get('patient_id'),
        doctor_id: formData.get('doctor_id') || null,
        appointment_id: formData.get('appointment_id') || null,
        request_text: formData.get('request_text'),
        status_id: formData.get('status_id')
    };

    try {
        const response = await axios.post('../../api/lab_requests.php', {
            operation: 'update',
            json: JSON.stringify(labRequestData)
        });

        if (response.data.success) {
            showAlert('success', 'Lab request updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('editLabRequestModal')).hide();
            loadLabRequests();
        } else {
            showAlert('error', response.data.message);
        }
    } catch (error) {
        console.error('Error updating lab request:', error);
        showAlert('error', 'Failed to update lab request. Please try again.');
    }
}

async function deleteLabRequest(labRequestId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await axios.post('../../api/lab_requests.php', {
                operation: 'delete',
                lab_request_id: labRequestId
            });

            if (response.data.success) {
                showAlert('success', 'Lab request deleted successfully!');
                loadLabRequests();
            } else {
                showAlert('error', response.data.message);
            }
        } catch (error) {
            console.error('Error deleting lab request:', error);
            showAlert('error', 'Failed to delete lab request. Please try again.');
        }
    }
}

function showAlert(type, message) {
    Swal.fire({
        icon: type,
        title: type === 'success' ? 'Success!' : 'Error!',
        text: message,
        timer: type === 'success' ? 2000 : undefined,
        timerProgressBar: type === 'success'
    });
}

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar-wrapper');
    const toggleBtn = document.querySelector('.offcanvas-toggle-btn');

    toggleBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    // Close sidebar on clicking outside on small screens
    document.addEventListener('click', (e) => {
        if (
            window.innerWidth <= 991.98 &&
            sidebar.classList.contains('show') &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)
        ) {
            sidebar.classList.remove('show');
        }
    });
});
