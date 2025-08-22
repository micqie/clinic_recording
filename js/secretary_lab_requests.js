document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    loadLabRequests();
    loadPatients();
    loadDoctors();
    // Appointments are loaded per patient selection
    populateLabTestTypeSelects();
    prefillFromConsultationIfPresent();
    setupEventListeners();

    // Initialize doctor dropdowns with default state
    initializeDoctorDropdowns();
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
        // Reset doctor field when modal is closed
        document.getElementById('doctorSelect').innerHTML = '<option value="">Select Doctor (Optional)</option>';
    });

    editLabRequestModal.addEventListener('hidden.bs.modal', function() {
        document.getElementById('editLabRequestForm').reset();
        // Reset doctor field when modal is closed
        document.getElementById('editDoctorSelect').innerHTML = '<option value="">Select Doctor (Optional)</option>';
    });

    // Dynamic: when patient changes, auto-populate doctor and filter appointments for that patient
    const addPatientSelect = document.getElementById('patientSelect');
    addPatientSelect?.addEventListener('change', (e) => {
        const patientId = e.target.value;
        if (patientId) {
            autoPopulateDoctor('doctorSelect', patientId);
            loadAppointmentsForSelect('appointmentSelect', patientId);
        } else {
            // Reset doctor field when no patient is selected
            document.getElementById('doctorSelect').innerHTML = '<option value="">Select Doctor (Optional)</option>';
            document.getElementById('appointmentSelect').innerHTML = '<option value="">Select Appointment (Optional)</option>';
        }
    });

    const editPatientSelect = document.getElementById('editPatientSelect');
    editPatientSelect?.addEventListener('change', (e) => {
        const patientId = e.target.value;
        if (patientId) {
            autoPopulateDoctor('editDoctorSelect', patientId);
            loadAppointmentsForSelect('editAppointmentSelect', patientId);
        } else {
            // Reset doctor field when no patient is selected
            document.getElementById('editDoctorSelect').innerHTML = '<option value="">Select Doctor (Optional)</option>';
            document.getElementById('editAppointmentSelect').innerHTML = '<option value="">Select Appointment (Optional)</option>';
        }
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
                    </div>
                </div>
            </td>
            <td>${request.doctor_name || 'Not assigned'}</td>
            <td>${request.lab_test_type_name || '-'}</td>
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
        // Use the new API to get only patients with appointments
        const response = await axios.get('../../api/patients.php?operation=get_with_appointments');

        if (response.data.success) {
            populatePatientSelects(response.data.data);
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

async function loadDoctors() {
    try {
        // Don't populate doctor dropdowns here - they will be populated dynamically
        // based on the selected patient's assigned doctor
        const response = await axios.get('../../api/doctors.php?operation=getAll');
        // Store doctors data for reference if needed, but don't populate dropdowns
        window.availableDoctors = response.data.doctors || [];
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

async function loadAppointmentsForSelect(selectId, patientId, selectedId = '') {
    try {
        if (!patientId) {
            const s = document.getElementById(selectId);
            if (s) s.innerHTML = '<option value="">Select Appointment (Optional)</option>';
            return;
        }
        const response = await axios.get(`../../api/appointments.php?operation=get_by_patient&patient_id=${patientId}`);
        if (response.data.success) {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = '<option value="">Select Appointment (Optional)</option>';
            (response.data.data || []).forEach(appointment => {
                const option = document.createElement('option');
                option.value = appointment.appointment_id;
                option.textContent = `${appointment.appointment_date}`;
                if (String(appointment.appointment_id) === String(selectedId)) option.selected = true;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading appointments for patient:', error);
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
                option.textContent = `${patient.full_name}`;
                // Store doctor info as data attributes for auto-population
                option.setAttribute('data-doctor-id', patient.doctor_id || '');
                option.setAttribute('data-doctor-name', patient.doctor_name || '');
                option.setAttribute('data-specialization', patient.specialization_name || '');
                select.appendChild(option);
            });
        }
    });
}

// New function to auto-populate doctor field when patient is selected
function autoPopulateDoctor(doctorSelectId, patientId) {
    const patientSelect = document.getElementById(doctorSelectId === 'doctorSelect' ? 'patientSelect' : 'editPatientSelect');
    const doctorSelect = document.getElementById(doctorSelectId);

    if (!patientSelect || !doctorSelect) return;

    const selectedOption = patientSelect.querySelector(`option[value="${patientId}"]`);
    if (selectedOption && selectedOption.getAttribute('data-doctor-id')) {
        const doctorId = selectedOption.getAttribute('data-doctor-id');
        const doctorName = selectedOption.getAttribute('data-doctor-name');
        const specialization = selectedOption.getAttribute('data-specialization');

        if (doctorId && doctorName) {
            // Clear existing options and add only the assigned doctor
            doctorSelect.innerHTML = '<option value="">Select Doctor (Optional)</option>';
            const newOption = document.createElement('option');
            newOption.value = doctorId;
            newOption.textContent = `${doctorName} - ${specialization || 'General'}`;
            doctorSelect.appendChild(newOption);
            doctorSelect.value = doctorId;
        } else {
            // If no doctor assigned, show only the default option
            doctorSelect.innerHTML = '<option value="">No Doctor Assigned</option>';
            doctorSelect.value = '';
        }
    } else {
        // Reset to default state
        doctorSelect.innerHTML = '<option value="">Select Doctor (Optional)</option>';
        doctorSelect.value = '';
    }
}

// Appointments now populated per selected patient via loadAppointmentsForSelect

async function populateLabTestTypeSelects() {
    try {
        const response = await axios.get('../../api/lab_test_types.php?operation=getAll');
        const types = response.data.types || [];
        const selects = ['testTypeSelect', 'editTestTypeSelect'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Select Test Type</option>';
            types.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.lab_test_type_id;
                opt.textContent = t.type_name;
                sel.appendChild(opt);
            });
        });
    } catch (e) {
        console.error('Failed to load lab test types', e);
    }
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
        lab_test_type_id: formData.get('lab_test_type_id') || null,
        request_text: formData.get('request_text') || '',
        status_id: formData.get('status_id') || 14
    };

    try {
        const payload = new URLSearchParams();
        payload.append('operation', 'add');
        payload.append('json', JSON.stringify(labRequestData));
        const response = await axios.post('../../api/lab_requests.php', payload);

        if (response.data.success) {
            showAlert('success', 'Lab request added successfully!');
            bootstrap.Modal.getInstance(document.getElementById('addLabRequestModal')).hide();
            loadLabRequests();
        } else {
            showAlert('error', response.data.message || 'Failed to add lab request.');
        }
    } catch (error) {
        console.error('Error adding lab request:', error?.response?.data || error);
        const msg = error?.response?.data?.message || error?.message || 'Failed to add lab request. Please try again.';
        showAlert('error', msg);
    }
}

async function editLabRequest(labRequestId) {
    try {
        const response = await axios.get(`../../api/lab_requests.php?operation=getById&lab_request_id=${labRequestId}`);

        if (response.data.success) {
            const request = response.data.request;
            populateEditForm(request);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('editLabRequestModal')).show();
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

    // Auto-populate doctor based on patient selection
    if (request.patient_id) {
        autoPopulateDoctor('editDoctorSelect', request.patient_id);
        // If there's already a doctor assigned, select it
        if (request.doctor_id) {
            setTimeout(() => {
                document.getElementById('editDoctorSelect').value = request.doctor_id;
            }, 100);
        }
    }

    // Load appointments for this patient, then select the current appointment
    loadAppointmentsForSelect('editAppointmentSelect', request.patient_id, request.appointment_id || '');
    document.getElementById('editRequestStatus').value = request.status_id || 14;
    // Try to split test type from text if present
    const editSelect = document.getElementById('editTestTypeSelect');
    if (editSelect) {
        editSelect.value = request.lab_test_type_id || '';
    }
    document.getElementById('editRequestText').value = request.request_text || '';
}

async function updateLabRequest() {
    const form = document.getElementById('editLabRequestForm');
    const formData = new FormData(form);

    const labRequestData = {
        lab_request_id: formData.get('lab_request_id'),
        patient_id: formData.get('patient_id'),
        doctor_id: formData.get('doctor_id') || null,
        appointment_id: formData.get('appointment_id') || null,
        lab_test_type_id: formData.get('lab_test_type_id') || null,
        request_text: formData.get('request_text') || '',
        status_id: formData.get('status_id')
    };

    try {
        const payload = new URLSearchParams();
        payload.append('operation', 'update');
        payload.append('json', JSON.stringify(labRequestData));
        const response = await axios.post('../../api/lab_requests.php', payload);

        if (response.data.success) {
            showAlert('success', 'Lab request updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('editLabRequestModal')).hide();
            loadLabRequests();
        } else {
            showAlert('error', response.data.message || 'Failed to update lab request.');
        }
    } catch (error) {
        console.error('Error updating lab request:', error?.response?.data || error);
        const msg = error?.response?.data?.message || error?.message || 'Failed to update lab request. Please try again.';
        showAlert('error', msg);
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
            const payload = new URLSearchParams();
            payload.append('operation', 'delete');
            payload.append('lab_request_id', labRequestId);
            const response = await axios.post('../../api/lab_requests.php', payload);

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

// Prefill from consultation flow
async function prefillFromConsultationIfPresent() {
    const params = new URLSearchParams(window.location.search);
    const consultationId = params.get('consultation_id');
    if (!consultationId) return;
    try {
        const res = await axios.get(`../../api/consultations.php?operation=getById&id=${consultationId}`);
        if (!res.data.success) return;
        const c = res.data.consultation;
        // Open add modal and prefill
        const modalEl = document.getElementById('addLabRequestModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        document.getElementById('patientSelect').value = c.patient_id;

        // Auto-populate doctor based on patient selection
        if (c.patient_id) {
            autoPopulateDoctor('doctorSelect', c.patient_id);
            // If there's already a doctor assigned, select it
            if (c.doctor_id) {
                setTimeout(() => {
                    document.getElementById('doctorSelect').value = c.doctor_id;
                }, 100);
            }
        }

        await loadAppointmentsForSelect('appointmentSelect', c.patient_id, c.appointment_id || '');
        const requestText = `From Consultation on ${new Date(c.created_at).toLocaleString()}\n\nSummary: ${c.summary || ''}\nNotes: ${c.notes || ''}`;
        document.getElementById('requestText').value = requestText;
    } catch (e) {
        console.error('Failed to prefill from consultation', e);
    }
}

// Initialize doctor dropdowns with default state
function initializeDoctorDropdowns() {
    const doctorSelects = ['doctorSelect', 'editDoctorSelect'];
    doctorSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Doctor (Optional)</option>';
        }
    });
}
