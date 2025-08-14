document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const labApi = `${baseApiUrl}/lab_requests.php`;

  const tbody = document.getElementById('labRequestsTableBody');
  const statusFilter = document.getElementById('statusFilter');
  const statusModal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
  const viewModal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
  const statusForm = document.getElementById('updateStatusForm');
  const viewDetailsModal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));

  let allLabRequests = [];

  async function loadLabRequests() {
    try {
      const resp = await axios.get(`${labApi}?operation=get_all`);
      allLabRequests = resp.data.data || [];
      console.log('Lab requests loaded:', allLabRequests); // Debug log
      displayLabRequests();
    } catch (error) {
      console.error('Error loading lab requests:', error);
      Swal.fire('Error', 'Failed to load lab requests', 'error');
    }
  }

  function displayLabRequests() {
    const filteredRequests = filterLabRequests();
    tbody.innerHTML = '';
    
    if (filteredRequests.length === 0) {
      if (allLabRequests.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted py-5">
              <div class="py-4">
                <i class="fas fa-flask fa-3x text-muted mb-3"></i>
                <h6 class="text-muted">No Lab Requests Found</h6>
                <p class="text-muted mb-0">There are currently no lab requests in the system.</p>
                <small class="text-muted">Doctors can create lab requests from their appointments page.</small>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted py-4">
              <i class="fas fa-filter fa-2x text-muted mb-2"></i>
              <p class="text-muted mb-0">No lab requests match the selected status filter.</p>
            </td>
          </tr>
        `;
      }
      return;
    }

    filteredRequests.forEach(r => {
      const tr = document.createElement('tr');
      const statusClass = r.status_name.toLowerCase().replace(/\s/g, '');
      tr.innerHTML = `
        <td><strong>LR-${r.lab_request_id.toString().padStart(4, '0')}</strong></td>
        <td>${new Date(r.created_at).toLocaleDateString()}<br><small class="text-muted">${new Date(r.created_at).toLocaleTimeString()}</small></td>
        <td><strong>${r.patient_name}</strong></td>
        <td><strong>Dr. ${r.doctor_name}</strong><br><small class="text-muted">License: ${r.license_number}</small></td>
        <td>${r.appointment_date ? `${r.appointment_date}<br><small class="text-muted">Q#${r.queue_number}</small>` : '<span class="text-muted">No appointment</span>'}</td>
        <td><span class="status-badge status--${statusClass}">${r.status_name}</span></td>
        <td class="text-truncate" style="max-width: 200px;" title="${r.request_text}">${r.request_text}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-info me-1" data-view="${r.lab_request_id}">
            <i class="fas fa-eye me-1"></i>View
          </button>
          <button class="btn btn-sm btn-outline-success" data-update="${r.lab_request_id}" data-status="${r.status_name}">
            <i class="fas fa-edit me-1"></i>Update
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function filterLabRequests() {
    const selectedStatus = statusFilter.value;
    if (!selectedStatus) return allLabRequests;
    return allLabRequests.filter(r => r.status_name === selectedStatus);
  }

  // Handle table actions
  tbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const updateId = target.getAttribute('data-update');
    const viewId = target.getAttribute('data-view');
    const currentStatus = target.getAttribute('data-status');
    
    if (updateId) {
      document.getElementById('us_lab_request_id').value = updateId;
      document.getElementById('us_current_status').value = currentStatus;
      document.getElementById('us_new_status').value = '';
      statusForm.classList.remove('was-validated');
      statusModal.show();
    } else if (viewId) {
      viewLabRequestDetails(viewId);
    }
  });

  async function viewLabRequestDetails(labRequestId) {
    try {
      const resp = await axios.get(`${labApi}?operation=get_by_id&lab_request_id=${labRequestId}`);
      if (resp.data.success) {
        const lr = resp.data.data;
        const content = document.getElementById('viewDetailsContent');
        content.innerHTML = `
          <div class="row">
            <div class="col-md-6">
              <h6 class="text-primary">Request Information</h6>
              <table class="table table-borderless">
                <tr><td><strong>Request #:</strong></td><td>LR-${lr.lab_request_id.toString().padStart(4, '0')}</td></tr>
                <tr><td><strong>Created:</strong></td><td>${new Date(lr.created_at).toLocaleString()}</td></tr>
                <tr><td><strong>Status:</strong></td><td><span class="badge bg-primary">${lr.status_name}</span></td></tr>
                ${lr.updated_at ? `<tr><td><strong>Last Updated:</strong></td><td>${new Date(lr.updated_at).toLocaleString()}</td></tr>` : ''}
              </table>
            </div>
            <div class="col-md-6">
              <h6 class="text-primary">Patient & Doctor</h6>
              <table class="table table-borderless">
                <tr><td><strong>Patient:</strong></td><td>${lr.patient_name}</td></tr>
                <tr><td><strong>Doctor:</strong></td><td>Dr. ${lr.doctor_name}</td></tr>
                <tr><td><strong>License:</strong></td><td>${lr.license_number}</td></tr>
                <tr><td><strong>Appointment:</strong></td><td>${lr.appointment_date ? `${lr.appointment_date} (Q#${lr.queue_number})` : 'No appointment'}</td></tr>
              </table>
            </div>
          </div>
          <hr>
          <h6 class="text-primary">Laboratory Request Details</h6>
          <div class="border p-3 bg-light rounded">
            ${lr.request_text.replace(/\n/g, '<br>')}
          </div>
        `;
        viewDetailsModal.show();
      }
    } catch (error) {
      console.error('Error viewing lab request details:', error);
      Swal.fire('Error', 'Failed to load lab request details', 'error');
    }
  }

  // Handle status update form submission
  statusForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!statusForm.checkValidity()) { 
      statusForm.classList.add('was-validated'); 
      return; 
    }
    
    try {
      const fd = new FormData(statusForm);
      const payload = new FormData();
      payload.append('operation', 'update_status');
      payload.append('json', JSON.stringify({
        lab_request_id: fd.get('lab_request_id'),
        status: fd.get('status')
      }));
      
      const resp = await axios.post(labApi, payload);
      if (resp.data.success) {
        statusModal.hide();
        await loadLabRequests();
        Swal.fire('Success', 'Lab request status updated successfully', 'success');
      } else {
        Swal.fire('Error', resp.data.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire('Error', 'Failed to update status', 'error');
    }
  });

  // Handle status filter change
  statusFilter?.addEventListener('change', () => {
    displayLabRequests();
  });

  // Global refresh function
  window.refreshData = async () => {
    await loadLabRequests();
    Swal.fire('Success', 'Data refreshed successfully', 'success');
  };

  // Initial load
  await loadLabRequests();
});
