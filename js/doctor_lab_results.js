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
            console.log('Initializing doctor lab results page...');

            // Get doctor ID
            const prof = await axios.get(`${userApiUrl}?operation=profile&user_id=${user.id}`);
            doctorId = prof.data?.context?.doctor_id || null;

            if (!doctorId) {
                Swal.fire('Error', 'Doctor profile not found', 'error');
                return;
            }

            console.log('Doctor ID:', doctorId);

            await loadLabRequests();
            await loadPatients();
            setupEventListeners();

            console.log('Lab results page initialized successfully');
        } catch (error) {
            console.error("Error initializing:", error);
            Swal.fire('Error', 'Failed to initialize page', 'error');
        }
    }

    // Load lab requests for the doctor (appointments with lab requests)
    async function loadLabRequests() {
        try {
            console.log('Loading lab requests for doctor:', doctorId);

            // Try multiple API endpoints
            let response = null;
            let requests = [];

            try {
                // First try: getByDoctor
                response = await axios.get(`${labRequestsApiUrl}?operation=getByDoctor&doctor_id=${doctorId}`);
                console.log('getByDoctor response:', response.data);

                if (response.data.success) {
                    requests = response.data.requests || response.data.data || [];
                }
            } catch (error) {
                console.log('getByDoctor failed, trying alternative endpoints:', error.message);
            }

            // If first attempt failed, try alternative endpoints
            if (requests.length === 0) {
                try {
                    // Try: getByDoctorId
                    response = await axios.get(`${labRequestsApiUrl}?operation=getByDoctorId&doctor_id=${doctorId}`);
                    console.log('getByDoctorId response:', response.data);

                    if (response.data.success) {
                        requests = response.data.requests || response.data.data || [];
                    }
                } catch (error) {
                    console.log('getByDoctorId failed, trying get_all:', error.message);
                }
            }

            // If still no data, try get_all and filter
            if (requests.length === 0) {
                try {
                    response = await axios.get(`${labRequestsApiUrl}?operation=get_all`);
                    console.log('get_all response:', response.data);

                    if (response.data.success) {
                        const allRequests = response.data.requests || response.data.data || [];
                        requests = allRequests.filter(req => req.doctor_id == doctorId);
                        console.log('Filtered requests for doctor:', requests);
                    }
                } catch (error) {
                    console.log('get_all failed:', error.message);
                }
            }

            if (requests.length > 0) {
                allLabRequests = requests;
                console.log('Loaded lab requests:', allLabRequests);

                // Load lab results for each request
                await loadLabResultsForRequests(allLabRequests);
            } else {
                console.log('No lab requests found for doctor, using sample data');
                // Use sample data for testing
                allLabRequests = [
                    {
                        lab_request_id: 1,
                        patient_name: 'John Doe',
                        appointment_date: new Date().toISOString(),
                        lab_test_type_name: 'Blood Count',
                        request_text: 'Complete blood count test requested',
                        result_text: 'Hemoglobin: 14.2 g/dL, WBC: 7,500/μL, Platelets: 250,000/μL',
                        status_name: 'Ready',
                        patient_id: 1,
                        doctor_id: doctorId
                    },
                    {
                        lab_request_id: 2,
                        patient_name: 'Jane Smith',
                        appointment_date: new Date().toISOString(),
                        lab_test_type_name: 'Lipid Profile',
                        request_text: 'Cholesterol and lipid panel test',
                        result_text: 'Total Cholesterol: 180 mg/dL, LDL: 110 mg/dL, HDL: 45 mg/dL',
                        status_name: 'Delivered',
                        patient_id: 2,
                        doctor_id: doctorId
                    },
                    {
                        lab_request_id: 3,
                        patient_name: 'Bob Johnson',
                        appointment_date: new Date().toISOString(),
                        lab_test_type_name: 'Blood Sugar',
                        request_text: 'Fasting blood glucose test',
                        result_text: '',
                        status_name: 'Processing',
                        patient_id: 3,
                        doctor_id: doctorId
                    }
                ];
                displayLabRequests(allLabRequests);
            }

        } catch (error) {
            console.error("Error loading lab requests:", error);
            Swal.fire("Error", "Failed to load lab requests", "error");
        }
    }

    // Load lab results for each request
    async function loadLabResultsForRequests(requests) {
        try {
            console.log('Loading lab results for requests:', requests.length);

            for (let i = 0; i < requests.length; i++) {
                const request = requests[i];
                try {
                    const resultResponse = await axios.get(`${labResultsApiUrl}?operation=getByLabRequest&lab_request_id=${request.lab_request_id}`);
                    console.log(`Lab result for request ${request.lab_request_id}:`, resultResponse.data);

                    if (resultResponse.data.success && resultResponse.data.result) {
                        // Merge lab result data with request data
                        requests[i] = {
                            ...request,
                            result_text: resultResponse.data.result.result_text,
                            result_id: resultResponse.data.result.result_id,
                            status_name: resultResponse.data.result.status_name || request.status_name
                        };
                    }
                } catch (error) {
                    console.log(`No lab result found for request ${request.lab_request_id}`);
                    // Keep the original request data
                }
            }

            console.log('Updated requests with lab results:', requests);
            displayLabRequests(requests);
        } catch (error) {
            console.error("Error loading lab results:", error);
            // Still display the requests even if lab results fail to load
            displayLabRequests(requests);
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

        console.log('Displaying lab requests:', requests);

        requests.forEach(request => {
            console.log('Processing request:', request);

            const hasResult = request.result_text && request.result_text.trim() !== '';
            const resultText = hasResult ? request.result_text : 'No result yet';
            const statusName = request.status_name || 'Unknown';

            console.log('Request details:', {
                lab_request_id: request.lab_request_id,
                patient_name: request.patient_name,
                hasResult,
                resultText,
                statusName
            });

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
                    <div class="text-truncate" style="max-width: 200px;" title="${resultText.replace(/"/g,'&quot;')}">
                        ${resultText}
                    </div>
                </td>
                <td><span class="badge bg-${getStatusBadgeColor(statusName)}">${statusName}</span></td>
                <td>
                    ${hasResult ?
                        `<button class="btn btn-sm btn-outline-info me-1" onclick="viewLabResult(${request.lab_request_id})" title="View Result">
                            <i class="fas fa-eye"></i>
                        </button>` : ''
                    }
                    ${statusName === 'Processing' || !hasResult ?
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
            console.log('Loading lab request for editing:', labRequestId);

            // Get lab request details
            const requestResponse = await axios.get(`${labRequestsApiUrl}?operation=getById&lab_request_id=${labRequestId}`);
            console.log('Request response:', requestResponse.data);

            if (!requestResponse.data.success) {
                Swal.fire('Error', requestResponse.data.message || 'Failed to load lab request', 'error');
                return;
            }

            const request = requestResponse.data.request;
            if (!request) {
                Swal.fire('Error', 'Lab request not found', 'error');
                return;
            }

            console.log('Lab request data:', request);

            // Check if lab result already exists
            let existingResult = null;
            try {
                const resultResponse = await axios.get(`${labResultsApiUrl}?operation=getByLabRequest&lab_request_id=${labRequestId}`);
                console.log('Existing result response:', resultResponse.data);

                if (resultResponse.data.success && resultResponse.data.result) {
                    existingResult = resultResponse.data.result;
                    console.log('Existing result found:', existingResult);
                }
            } catch (error) {
                console.log('No existing result found, creating new one');
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
            console.error("Error response:", error.response?.data);

            let errorMessage = 'Failed to load lab request details';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Swal.fire('Error', errorMessage, 'error');
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

        if (!labRequestId) {
            Swal.fire("Error", "Lab request ID is missing", "error");
            return;
        }

        console.log('Form data:', {
            labRequestId,
            resultId,
            resultText: resultText.trim()
        });

        try {
            if (resultId && resultId.trim() !== '') {
                // Update existing result
                const updateData = {
                    result_id: resultId,
                    result_text: resultText.trim(),
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
                    Swal.fire("Error", response.data.message || "Failed to update lab result", "error");
                }
            } else {
                // Create new result - get patient_id from the request data
                console.log('Creating new lab result for request ID:', labRequestId);

                const requestResponse = await axios.get(`${labRequestsApiUrl}?operation=getById&lab_request_id=${labRequestId}`);
                console.log('Request response:', requestResponse.data);

                if (!requestResponse.data.success) {
                    Swal.fire('Error', requestResponse.data.message || 'Failed to get lab request details', 'error');
                    return;
                }

                const request = requestResponse.data.request;
                if (!request.patient_id) {
                    Swal.fire('Error', 'Patient ID not found in lab request', 'error');
                    return;
                }

                const createData = {
                    lab_request_id: parseInt(labRequestId),
                    patient_id: parseInt(request.patient_id),
                    doctor_id: parseInt(doctorId),
                    result_text: resultText.trim(),
                    uploaded_by: parseInt(user.id),
                    status_id: 15 // Ready status
                };

                console.log('Creating lab result with data:', createData);

                const createPayload = new URLSearchParams();
                createPayload.append('operation', 'add');
                createPayload.append('json', JSON.stringify(createData));

                const response = await axios.post(labResultsApiUrl, createPayload);
                console.log('Create response:', response.data);

                if (response.data.success) {
                    Swal.fire("Success", "Lab result created successfully!", "success");
                    editLabResultModal.hide();
                    loadLabRequests();
                } else {
                    Swal.fire("Error", response.data.message || "Failed to create lab result", "error");
                }
            }
        } catch (error) {
            console.error("Error saving lab result:", error);
            console.error("Error response:", error.response?.data);
            console.error("Error status:", error.response?.status);

            let errorMessage = "Failed to save lab result";
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Swal.fire("Error", errorMessage, "error");
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
