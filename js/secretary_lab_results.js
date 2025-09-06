document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";

    // Check if user is logged in
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id) {
        console.error('User not logged in');
        Swal.fire('Error', 'Please log in to continue', 'error');
        return;
    }

    const labResultsTableBody = document.getElementById("labResultsTableBody");
    const addLabResultForm = document.getElementById("addLabResultForm");
    const labRequestSelect = document.getElementById('lab_request_id');
    const patientFilter = document.getElementById("patientFilter");
    const statusFilter = document.getElementById("statusFilter");
    const dateFromFilter = document.getElementById("dateFromFilter");
    const dateToFilter = document.getElementById("dateToFilter");
    // Doctor select removed per requirement

    // Bootstrap modal instances
    const addLabResultModal = new bootstrap.Modal(document.getElementById('addLabResultModal'));
    const viewLabResultModal = new bootstrap.Modal(document.getElementById('viewLabResultModal'));

    let allLabResults = [];

    // Reset form when modal is closed
    document.getElementById('addLabResultModal').addEventListener('hidden.bs.modal', function() {
        addLabResultForm.reset();
        // labTestTypeSelect.value = ''; // This line is removed
    });

    // Helper: format date for display
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

    // Load lab results and populate table (only doctor-completed results)
    async function loadLabResults() {
        try {
            const res = await axios.get(`${baseApiUrl}/lab_results.php?operation=getAllLabResults`);
            if (!res.data.success) throw new Error(res.data.message || 'Failed to load');
            // Filter to only show doctor-completed results that are ready for delivery (status = Ready)
            allLabResults = (res.data.results || []).filter(result =>
                result.status_name === 'Ready'
            );
            displayLabResults(allLabResults);
        } catch (error) {
            console.error("Failed to load lab results", error);
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load lab results</p>
                    </td>
                </tr>
            `;
        }
    }

    // Display lab results in table
    function displayLabResults(results) {
        labResultsTableBody.innerHTML = '';
        if (results.length === 0) {
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-file-medical fa-3x mb-3"></i>
                        <p>No lab results found</p>
                    </td>
                </tr>
            `;
            return;
        }
        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.patient_name || ''}</td>
                <td>${r.lab_test_type_name || '-'}</td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${(r.request_text || '').replace(/"/g,'&quot;')}">
                        ${(r.request_text || '-')}
                    </div>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${(r.result_text || '').replace(/"/g,'&quot;')}">
                        ${(r.result_text || 'No result yet')}
                    </div>
                </td>
                <td><span class="badge bg-${getStatusBadgeColor(r.status_name)}">${r.status_name || 'Unknown'}</span></td>
                <td>${formatDate(r.uploaded_at)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-info me-1" data-action="view" data-id="${r.result_id}" title="View Result">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${r.status_name === 'Ready' ? `<button class="btn btn-sm btn-outline-success me-1" data-action="deliver" data-id="${r.result_id}" title="Mark as Delivered">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                </td>
            `;
            labResultsTableBody.appendChild(tr);
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

    // Add lab result submit handler
    addLabResultForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addLabResultForm.checkValidity()) {
            e.stopPropagation();
            addLabResultForm.classList.add('was-validated');
            return;
        }
        addLabResultForm.classList.remove('was-validated');

        const formData = new FormData(addLabResultForm);
        const selected = labRequestSelect.selectedOptions[0];

        // Debug logging
        console.log('Selected lab request:', selected);
        console.log('User from session:', sessionStorage.getItem('user'));

        // Validate required data
        if (!selected || !selected.dataset.patientId) {
            Swal.fire('Error', 'Please select a valid lab request', 'error');
            return;
        }

        const payloadData = {
            lab_request_id: formData.get('lab_request_id'),
            patient_id: selected.dataset.patientId,
            doctor_id: selected.dataset.doctorId || null,
            result_text: formData.get('result'),
            uploaded_by: user.id,
            status_id: 15
        };

        // Debug logging
        console.log('Payload data:', payloadData);

        const payload = new URLSearchParams();
        payload.append('operation', 'add');
        payload.append('json', JSON.stringify(payloadData));

        try {
            console.log('Sending request to:', `${baseApiUrl}/lab_results.php`);
            const response = await axios.post(`${baseApiUrl}/lab_results.php`, payload);
            console.log('Response:', response.data);

            if (response.data.success) {
                Swal.fire("Success", response.data.message, "success");
                addLabResultForm.reset();
                addLabResultModal.hide();
                loadLabResults();
                // reload delivered list
                preloadDeliveredRequests();
            } else {
                Swal.fire("Error", response.data.message || 'Failed to add lab result', "error");
            }
        } catch (error) {
            console.error("Error adding lab result", error);
            console.error("Error response:", error.response?.data);
            Swal.fire("Error", error?.response?.data?.message || 'Something went wrong', "error");
        }
    });

    // Basic delegation for view/deliver buttons (view-only for secretary)
    labResultsTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');

        if (action === 'view') {
            try {
                const response = await axios.get(`${baseApiUrl}/lab_results.php?operation=getById&result_id=${id}`);
                if (response.data.success) {
                    const result = response.data.result;

                    document.getElementById('viewPatientName').textContent = result.patient_name || '-';
                    document.getElementById('viewTestType').textContent = result.lab_test_type_name || '-';
                    document.getElementById('viewResultDate').textContent = formatDate(result.uploaded_at);
                    document.getElementById('viewStatus').innerHTML = `<span class="badge bg-${getStatusBadgeColor(result.status_name)}">${result.status_name || 'Unknown'}</span>`;
                    document.getElementById('viewRequestDetails').textContent = result.request_text || 'No details available';
                    document.getElementById('viewResultDetails').textContent = result.result_text || 'No results available yet';

                    viewLabResultModal.show();
                } else {
                    Swal.fire('Error', response.data.message, 'error');
                }
            } catch (error) {
                console.error("Error viewing lab result:", error);
                Swal.fire('Error', 'Failed to load lab result details', 'error');
            }
        }

        if (action === 'deliver') {
            const confirm = await Swal.fire({
                icon: 'question',
                title: 'Mark as Delivered?',
                text: 'This will mark the lab result as delivered to the patient. Please ensure the patient has paid their consultation fee.',
                showCancelButton: true,
                confirmButtonText: 'Yes, mark as delivered',
                cancelButtonText: 'Cancel'
            });
            if (!confirm.isConfirmed) return;
            try {
                const payload = new URLSearchParams();
                payload.append('operation', 'markAsDelivered');
                payload.append('json', JSON.stringify({ result_id: id }));
                const res = await axios.post(`${baseApiUrl}/lab_results.php`, payload);
                if (res.data.success) {
                    loadLabResults();
                    Swal.fire('Success','Lab result marked as delivered','success');
                }
                else Swal.fire('Error', res.data.message || 'Failed to mark as delivered', 'error');
            } catch (err) {
                Swal.fire('Error', err?.response?.data?.message || 'Failed to mark as delivered', 'error');
            }
        }
    });

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

    // Filter lab results
    function filterLabResults() {
        const patientId = patientFilter.value;
        const status = statusFilter.value;
        const dateFrom = dateFromFilter.value;
        const dateTo = dateToFilter.value;

        let filteredResults = [...allLabResults];

        if (patientId) {
            filteredResults = filteredResults.filter(result => result.patient_id == patientId);
        }

        if (status) {
            filteredResults = filteredResults.filter(result => result.status_name === status);
        }

        if (dateFrom) {
            filteredResults = filteredResults.filter(result => {
                const resultDate = new Date(result.uploaded_at || result.created_at);
                const fromDate = new Date(dateFrom);
                return resultDate >= fromDate;
            });
        }

        if (dateTo) {
            filteredResults = filteredResults.filter(result => {
                const resultDate = new Date(result.uploaded_at || result.created_at);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999); // Include the entire day
                return resultDate <= toDate;
            });
        }

        displayLabResults(filteredResults);
    }

    // Setup event listeners
    function setupEventListeners() {
        patientFilter.addEventListener('change', filterLabResults);
        statusFilter.addEventListener('change', filterLabResults);
        dateFromFilter.addEventListener('change', filterLabResults);
        dateToFilter.addEventListener('change', filterLabResults);
    }

    // Initial load
    loadLabResults();
    loadPatients();
    preloadDeliveredRequests();
    setupEventListeners();

    // Auto-populate lab test type when lab request is selected
    labRequestSelect?.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        // This block is no longer needed as labTestTypeSelect is removed
        // if (selectedOption && selectedOption.dataset.testTypeId) {
        //     labTestTypeSelect.value = selectedOption.dataset.testTypeId;
        // } else {
        //     labTestTypeSelect.value = '';
        // }
    });

    async function preloadDeliveredRequests() {
        try {
            labRequestSelect.innerHTML = '<option value="">Select Lab Request</option>';
            const res = await axios.get(`${baseApiUrl}/lab_requests.php?operation=getDelivered`);
            const items = res.data.requests || [];

            console.log('Delivered lab requests:', items);

            if (items.length === 0) {
                const empty = document.createElement('option');
                empty.value = '';
                empty.textContent = 'No delivered lab requests';
                empty.disabled = true;
                labRequestSelect.appendChild(empty);
                return;
            }
            items.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.lab_request_id;
                const doctor = r.doctor_name ? ` • ${r.doctor_name}` : '';
                opt.textContent = `${r.patient_name} — ${r.lab_test_type_name || 'Request'} — ${new Date(r.created_at).toLocaleDateString()}${doctor}`;
                opt.dataset.patientId = r.patient_id;
                opt.dataset.doctorId = r.doctor_id || '';
                opt.dataset.testTypeId = r.lab_test_type_id || '';

                console.log('Option created:', opt.value, opt.dataset);

                labRequestSelect.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load delivered requests', e);
        }
    }
});
