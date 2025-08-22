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
    // Doctor select removed per requirement

    // Bootstrap modal instances
    const addLabResultModal = new bootstrap.Modal(document.getElementById('addLabResultModal'));

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

    // Load lab results and populate table
    async function loadLabResults() {
        try {
            const res = await axios.get(`${baseApiUrl}/lab_results.php?operation=getAllLabResults`);
            if (!res.data.success) throw new Error(res.data.message || 'Failed to load');
            const results = res.data.results || [];
            labResultsTableBody.innerHTML = '';
            if (results.length === 0) {
                labResultsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
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
                        <div class="text-truncate" style="max-width: 280px;" title="${(r.result_text || '').replace(/"/g,'&quot;')}">
                            ${(r.result_text || '-')}
                        </div>
                    </td>
                    <td>${formatDate(r.uploaded_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${r.result_id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${r.result_id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                labResultsTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error("Failed to load lab results", error);
            labResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Failed to load lab results</p>
                    </td>
                </tr>
            `;
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

    // Basic delegation for edit/delete buttons (edit modal not yet in DOM; implement next)
    labResultsTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'delete') {
            const confirm = await Swal.fire({icon: 'warning', title: 'Delete?', showCancelButton: true});
            if (!confirm.isConfirmed) return;
            try {
                const payload = new URLSearchParams();
                payload.append('operation', 'delete');
                payload.append('result_id', id);
                const res = await axios.post(`${baseApiUrl}/lab_results.php`, payload);
                if (res.data.success) { loadLabResults(); Swal.fire('Deleted','Lab result deleted','success'); }
                else Swal.fire('Error', res.data.message || 'Delete failed', 'error');
            } catch (err) {
                Swal.fire('Error', err?.response?.data?.message || 'Delete failed', 'error');
            }
        }
        if (action === 'edit') {
            // Future: open edit modal and submit update
            const res = await axios.get(`${baseApiUrl}/lab_results.php?operation=getById&result_id=${id}`);
            if (!res.data.success) { Swal.fire('Error', res.data.message || 'Failed to load', 'error'); return; }
            Swal.fire({
                title: 'Edit Result',
                input: 'textarea',
                inputValue: res.data.result?.result_text || '',
                inputLabel: 'Result text',
                showCancelButton: true
            }).then(async (r) => {
                if (!r.isConfirmed) return;
                try {
                    const up = new URLSearchParams();
                    up.append('operation','update');
                    up.append('json', JSON.stringify({ result_id: id, result_text: r.value, status_id: res.data.result?.status_id || 15 }));
                    const ur = await axios.post(`${baseApiUrl}/lab_results.php`, up);
                    if (ur.data.success) { loadLabResults(); Swal.fire('Saved','Lab result updated','success'); }
                    else Swal.fire('Error', ur.data.message || 'Update failed','error');
                } catch (err) {
                    Swal.fire('Error', err?.response?.data?.message || 'Update failed','error');
                }
            });
        }
    });

    // Initial load
    loadLabResults();
    preloadDeliveredRequests();

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
