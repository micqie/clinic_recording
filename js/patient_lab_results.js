document.addEventListener("DOMContentLoaded", () => {
    const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
    const labResultsApiUrl = `${baseApiUrl}/lab_results.php`;
    const paymentsApiUrl = `${baseApiUrl}/payments.php`;
    const userApiUrl = `${baseApiUrl}/user.php`;

    // Check if user is logged in and is a patient
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== "patient") {
        window.location.href = "../../index.html";
        return;
    }

    const labResultsTableBody = document.getElementById("labResultsTableBody");
    const labResultsCount = document.getElementById("labResultsCount");
    const testTypeFilter = document.getElementById("testTypeFilter");
    const statusFilter = document.getElementById("statusFilter");
    const dateFilter = document.getElementById("dateFilter");
    const viewLabResultModal = new bootstrap.Modal(document.getElementById('viewLabResultModal'));

    let patientId = null;
    let allLabResults = [];

    // Initialize
    async function init() {
        try {
            // Get patient ID
            const prof = await axios.get(`${userApiUrl}?operation=profile&user_id=${user.id}`);
            patientId = prof.data?.context?.patient_id || null;

            if (!patientId) {
                Swal.fire('Error', 'Patient profile not found', 'error');
                return;
            }

            await loadLabResults();
            setupEventListeners();
        } catch (error) {
            console.error("Error initializing:", error);
            Swal.fire('Error', 'Failed to initialize page', 'error');
        }
    }

    // Check payment status before loading lab results
    async function checkPaymentStatus() {
        try {
            const response = await axios.get(`${paymentsApiUrl}?operation=checkPatientPaymentStatus&patient_id=${patientId}`);
            if (response.data.success) {
                return response.data.has_paid_consultation;
            }
            return false;
        } catch (error) {
            console.error("Error checking payment status:", error);
            return false;
        }
    }

    // Load lab results for the patient (only delivered results after payment verification)
    async function loadLabResults() {
        try {
            // First check if patient has paid consultations
            const hasPaidConsultation = await checkPaymentStatus();
            console.log('Payment status check result:', hasPaidConsultation);

            if (!hasPaidConsultation) {
                // Show payment required message
                labResultsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-warning py-5">
                            <i class="fas fa-credit-card fa-3x mb-3"></i>
                            <h5 class="fw-bold">Payment Required</h5>
                            <p class="mb-3">You need to complete payment for your consultation before viewing lab results.</p>
                            <a href="patient_payments.html" class="btn btn-primary">
                                <i class="fas fa-credit-card me-2"></i>Go to Payments
                            </a>
                        </td>
                    </tr>
                `;
                updateResultsCount(0);
                return;
            }

            const response = await axios.get(`${labResultsApiUrl}?operation=getByPatient&patient_id=${patientId}`);
            if (response.data.success) {
                console.log('All lab results for patient:', response.data.results);
                // Filter to only show delivered results
                allLabResults = (response.data.results || []).filter(result =>
                    result.status_name === 'Delivered'
                );
                console.log('Filtered delivered results:', allLabResults);
                displayLabResults(allLabResults);
                updateResultsCount(allLabResults.length);
            } else {
                Swal.fire("Error", response.data.message, "error");
            }
        } catch (error) {
            console.error("Error loading lab results:", error);
            Swal.fire("Error", "Failed to load lab results", "error");
        }
    }

    // Display lab results in table
    function displayLabResults(results) {
        labResultsTableBody.innerHTML = "";

        if (results.length === 0) {
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-file-medical fa-3x mb-3"></i>
                        <p>No lab results found</p>
                    </td>
                </tr>
            `;
            return;
        }

        results.forEach(result => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${formatDate(result.uploaded_at || result.created_at)}</td>
                <td>${result.lab_test_type_name || 'General Test'}</td>
                <td>${result.doctor_name || '-'}</td>
                <td><span class="badge bg-${getStatusBadgeColor(result.status_name)}">${result.status_name || 'Unknown'}</span></td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${(result.result_text || '').replace(/"/g,'&quot;')}">
                        ${result.result_text || 'No results available yet'}
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="viewLabResult(${result.result_id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
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

    // Update results count
    function updateResultsCount(count) {
        if (labResultsCount) {
            labResultsCount.textContent = count;
        }
    }

    // View lab result details
    window.viewLabResult = async (resultId) => {
        try {
            const response = await axios.get(`${labResultsApiUrl}?operation=getById&result_id=${resultId}`);
            if (response.data.success) {
                const result = response.data.result;

                // Populate view modal
                document.getElementById('viewTestType').textContent = result.lab_test_type_name || 'General Test';
                document.getElementById('viewDoctorName').textContent = result.doctor_name || '-';
                document.getElementById('viewResultDate').textContent = formatDate(result.uploaded_at || result.created_at);
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
    };

    // Filter lab results
    function filterLabResults() {
        const testType = testTypeFilter.value;
        const status = statusFilter.value;
        const date = dateFilter.value;

        let filteredResults = [...allLabResults];

        if (testType) {
            filteredResults = filteredResults.filter(result =>
                (result.lab_test_type_name || '').toLowerCase().includes(testType.toLowerCase())
            );
        }

        if (status) {
            filteredResults = filteredResults.filter(result => result.status_name === status);
        }

        if (date) {
            filteredResults = filteredResults.filter(result => {
                const resultDate = new Date(result.uploaded_at || result.created_at);
                const filterDate = new Date(date);
                return resultDate.toDateString() === filterDate.toDateString();
            });
        }

        displayLabResults(filteredResults);
        updateResultsCount(filteredResults.length);
    }

    // Setup event listeners
    function setupEventListeners() {
        testTypeFilter.addEventListener('change', filterLabResults);
        statusFilter.addEventListener('change', filterLabResults);
        dateFilter.addEventListener('change', filterLabResults);
    }

    // Initialize the page
    init();
});
