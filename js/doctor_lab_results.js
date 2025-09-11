document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    const labResultsApiUrl = `${baseApiUrl}/lab_results.php`;
    const labRequestsApiUrl = `${baseApiUrl}/lab_requests.php`;
    const userApiUrl = `${baseApiUrl}/user.php`;

    // Check if user is logged in and is a doctor
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== "doctor") {
        window.location.href = "../../index.html";
        return;
    }

    const labResultsTableBody = document.getElementById("labResultsTableBody");
    const patientFilter = document.getElementById("patientFilter");
    const statusFilter = document.getElementById("statusFilter");
    const dateFromFilter = document.getElementById("dateFromFilter");
    const dateToFilter = document.getElementById("dateToFilter");
    const editLabResultModal = new bootstrap.Modal(document.getElementById('editLabResultModal'));
    const viewLabResultModal = new bootstrap.Modal(document.getElementById('viewLabResultModal'));
    const editLabResultForm = document.getElementById('editLabResultForm');

    let doctorId = null;
    let allLabRequests = [];

    // Initialize
    async function init() {
        try {
            // Get doctor ID
            const prof = await axios.get(`${userApiUrl}?operation=profile&user_id=${user.id}`);
            doctorId = prof.data?.context?.doctor_id || null;

            if (!doctorId) {
                Swal.fire('Error', 'Doctor profile not found', 'error');
                return;
            }

            await loadLabRequests();
            await loadPatients();
            setupEventListeners();
        } catch (error) {
            console.error("Error initializing:", error);
            Swal.fire('Error', 'Failed to initialize page', 'error');
        }
    }

    // Load lab requests for the doctor (appointments with lab requests)
    async function loadLabRequests() {
        try {
            const response = await axios.get(`${labRequestsApiUrl}?operation=getByDoctor&doctor_id=${doctorId}`);
            if (response.data.success) {
                allLabRequests = response.data.requests || response.data.data || [];
                displayLabRequests(allLabRequests);
            } else {
                Swal.fire("Error", response.data.message, "error");
            }
        } catch (error) {
            console.error("Error loading lab requests:", error);
            Swal.fire("Error", "Failed to load lab requests", "error");
        }
    }

    // Load patients for filter
    async function loadPatients() {
        try {
            const response = await axios.get(`${baseApiUrl}/patients.php?operation=get_all`);
            if (response.data.success) {
                patientFilter.innerHTML = '<option value="">All Patients</option>';
                response.data.data.forEach(patient => {
                    patientFilter.innerHTML += `<option value="${patient.patient_id}">${patient.full_name}</option>`;
                });
            }
        } catch (error) {
            console.error("Error loading patients:", error);
        }
    }

    // Display lab requests in table
    function displayLabRequests(requests) {
        labResultsTableBody.innerHTML = "";

        if (requests.length === 0) {
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-flask fa-3x mb-3"></i>
                        <p>No lab requests found</p>
                    </td>
                </tr>
            `;
            return;
        }

        requests.forEach(request => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${request.patient_name || '-'}</td>
                <td>${formatDate(request.appointment_date || request.created_at)}</td>
                <td>${request.lab_test_type_name || 'General Test'}</td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${(request.request_text || '').replace(/"/g,'&quot;')}">
                        ${(request.request_text || '-')}
                    </div>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${(request.result_text || '').replace(/"/g,'&quot;')}">
                        ${request.result_text || 'No result yet'}
                    </div>
                </td>
                <td><span class="badge bg-${getStatusBadgeColor(request.status_name)}">${request.status_name || 'Unknown'}</span></td>
                <td>
                    ${request.result_text ?
                        `<button class="btn btn-sm btn-outline-info me-1" onclick="viewLabResult(${request.lab_request_id})" title="View Result">
                            <i class="fas fa-eye"></i>
                        </button>` : ''
                    }
                    ${request.status_name === 'Processing' || !request.result_text ?
                        `<button class="btn btn-sm btn-outline-primary me-1" onclick="editLabResult(${request.lab_request_id})" title="Edit/Add Result">
                            <i class="fas fa-edit"></i>
                        </button>` :
                        `<button class="btn btn-sm btn-outline-success me-1" onclick="editLabResult(${request.lab_request_id})" title="Update Result">
                            <i class="fas fa-edit"></i>
                        </button>`
                    }
                </td>
            `;
            labResultsTableBody.appendChild(row);
        });
    }

    // Get status badge color
    function getStatusBadgeColor(status) {
        switch (status) {
            case 'Processing': return 'warning';
            case 'Ready': return 'success';
            case 'Delivered': return 'primary';
            default: return 'secondary';
        }
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // View lab result
    window.viewLabResult = async (labRequestId) => {
        try {
            // Get lab request details
            const requestResponse = await axios.get(`${labRequestsApiUrl}?operation=getById&lab_request_id=${labRequestId}`);
            if (!requestResponse.data.success) {
                Swal.fire('Error', requestResponse.data.message, 'error');
                return;
            }

            const request = requestResponse.data.request;

            // Get lab result if it exists
            let result = null;
            try {
                const resultResponse = await axios.get(`${labResultsApiUrl}?operation=getByLabRequest&lab_request_id=${labRequestId}`);
                if (resultResponse.data.success && resultResponse.data.result) {
                    result = resultResponse.data.result;
                }
            } catch (error) {
                // No existing result, that's fine
            }

            // Populate view modal
            document.getElementById('viewPatientName').textContent = request.patient_name || '-';
            document.getElementById('viewTestType').textContent = request.lab_test_type_name || 'General Test';
            document.getElementById('viewAppointmentDate').textContent = formatDate(request.appointment_date || request.created_at);
            document.getElementById('viewStatus').innerHTML = `<span class="badge bg-${getStatusBadgeColor(result?.status_name || request.status_name)}">${result?.status_name || request.status_name || 'Unknown'}</span>`;
            document.getElementById('viewRequestDetails').textContent = request.request_text || 'No details available';
            document.getElementById('viewResultDetails').textContent = result?.result_text || 'No results available yet';

            viewLabResultModal.show();
        } catch (error) {
            console.error("Error loading lab request:", error);
            Swal.fire('Error', 'Failed to load lab request details', 'error');
        }
    };

    // Edit lab result
    window.editLabResult = async (labRequestId) => {
        try {
            // Get lab request details
            const requestResponse = await axios.get(`${labRequestsApiUrl}?operation=getById&lab_request_id=${labRequestId}`);
            if (!requestResponse.data.success) {
                Swal.fire('Error', requestResponse.data.message, 'error');
                return;
            }

            const request = requestResponse.data.request;

            // Check if lab result already exists
            let existingResult = null;
            try {
                const resultResponse = await axios.get(`${labResultsApiUrl}?operation=getByLabRequest&lab_request_id=${labRequestId}`);
                if (resultResponse.data.success && resultResponse.data.result) {
                    existingResult = resultResponse.data.result;
                }
            } catch (error) {
                // No existing result, that's fine
            }

            // Populate modal
            document.getElementById('editLabRequestId').value = labRequestId;
            document.getElementById('editResultId').value = existingResult?.result_id || '';
            document.getElementById('editPatientName').textContent = request.patient_name || '-';
            document.getElementById('editTestType').textContent = request.lab_test_type_name || 'General Test';
            document.getElementById('editAppointmentDate').textContent = formatDate(request.appointment_date || request.created_at);
            document.getElementById('editCurrentStatus').innerHTML = `<span class="badge bg-${getStatusBadgeColor(request.status_name)}">${request.status_name || 'Unknown'}</span>`;
            document.getElementById('editRequestDetails').textContent = request.request_text || 'No details available';
            document.getElementById('editResultText').value = existingResult?.result_text || '';

            editLabResultModal.show();
        } catch (error) {
            console.error("Error loading lab request:", error);
            Swal.fire('Error', 'Failed to load lab request details', 'error');
        }
    };

    // Handle edit form submission
    editLabResultForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check form validity
        if (!editLabResultForm.checkValidity()) {
            e.stopPropagation();
            editLabResultForm.classList.add('was-validated');
            console.log('Form validation failed');
            return;
        }
        editLabResultForm.classList.remove('was-validated');

        const formData = new FormData(editLabResultForm);
        const labRequestId = formData.get('lab_request_id');
        const resultId = formData.get('result_id');
        const resultText = formData.get('result_text');

        // Additional validation
        if (!resultText || resultText.trim() === '') {
            Swal.fire("Error", "Please enter lab results", "error");
            return;
        }

        console.log('Form data:', {
            labRequestId,
            resultId,
            resultText: resultText.trim()
        });

        try {
            if (resultId) {
                // Update existing result
                const updateData = {
                    result_id: resultId,
                    result_text: resultText,
                    status_id: 16 // Delivered status
                };

                console.log('Updating lab result with data:', updateData);

                const updatePayload = new URLSearchParams();
                updatePayload.append('operation', 'update');
                updatePayload.append('json', JSON.stringify(updateData));

                const response = await axios.post(labResultsApiUrl, updatePayload);
                console.log('Update response:', response.data);

                if (response.data.success) {
                    Swal.fire("Success", "Lab result updated and marked as delivered!", "success");
                    editLabResultModal.hide();
                    loadLabRequests();
                } else {
                    Swal.fire("Error", response.data.message, "error");
                }
            } else {
                // Create new result - get patient_id from the request data
                const requestResponse = await axios.get(`${labRequestsApiUrl}?operation=getById&lab_request_id=${labRequestId}`);
                if (!requestResponse.data.success) {
                    Swal.fire('Error', 'Failed to get lab request details', 'error');
                    return;
                }

                const request = requestResponse.data.request;
                const createPayload = new URLSearchParams();
                createPayload.append('operation', 'add');
                createPayload.append('json', JSON.stringify({
                    lab_request_id: labRequestId,
                    patient_id: request.patient_id,
                    doctor_id: doctorId,
                    result_text: resultText,
                    uploaded_by: user.id,
                    status_id: 15 // Ready status
                }));

                const response = await axios.post(labResultsApiUrl, createPayload);
                if (response.data.success) {
                    Swal.fire("Success", "Lab result created successfully!", "success");
                    editLabResultModal.hide();
                    loadLabRequests();
                } else {
                    Swal.fire("Error", response.data.message, "error");
                }
            }
        } catch (error) {
            console.error("Error saving lab result:", error);
            console.error("Error response:", error.response?.data);
            Swal.fire("Error", error.response?.data?.message || "Failed to save lab result", "error");
        }
    });

    // Filter lab requests
    function filterLabRequests() {
        const patientId = patientFilter.value;
        const status = statusFilter.value;
        const dateFrom = dateFromFilter.value;
        const dateTo = dateToFilter.value;

        let filteredRequests = [...allLabRequests];

        if (patientId) {
            filteredRequests = filteredRequests.filter(request => request.patient_id == patientId);
        }

        if (status) {
            filteredRequests = filteredRequests.filter(request => request.status_name === status);
        }

        if (dateFrom) {
            filteredRequests = filteredRequests.filter(request => {
                const requestDate = new Date(request.appointment_date || request.created_at);
                const fromDate = new Date(dateFrom);
                return requestDate >= fromDate;
            });
        }

        if (dateTo) {
            filteredRequests = filteredRequests.filter(request => {
                const requestDate = new Date(request.appointment_date || request.created_at);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return requestDate <= toDate;
            });
        }

        displayLabRequests(filteredRequests);
    }

    // Setup event listeners
    function setupEventListeners() {
        patientFilter.addEventListener('change', filterLabRequests);
        statusFilter.addEventListener('change', filterLabRequests);
        dateFromFilter.addEventListener('change', filterLabRequests);
        dateToFilter.addEventListener('change', filterLabRequests);
    }

    // Initialize the page
    init();
});
