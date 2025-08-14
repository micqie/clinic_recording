document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const userApi = `${baseApiUrl}/user.php`;
  const labApi = `${baseApiUrl}/lab_requests.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const doctorId = prof.data?.context?.doctor_id;
  if (!doctorId) { Swal.fire('Error', 'No doctor profile found.', 'error'); return; }

  const tbody = document.getElementById('docAppointmentsTableBody');
  const lrTbody = document.getElementById('docLabRequestsTableBody');
  const labModal = new bootstrap.Modal(document.getElementById('labRequestModal'));
  const statusModal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
  const labForm = document.getElementById('labRequestForm');
  const statusForm = document.getElementById('updateStatusForm');

  async function loadAppointments() {
    try {
      const resp = await axios.get(`${apptApi}?operation=get_by_doctor&doctor_id=${doctorId}`);
      const rows = resp.data.data || [];
      tbody.innerHTML = '';
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.appointment_date}</td>
          <td>${r.queue_number || '-'}</td>
          <td>${r.patient_name}</td>
          <td><span class="status-badge status--${r.appointment_status.toLowerCase().replace(/\s/g, '')}">${r.appointment_status}</span></td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-primary" data-lr="${r.patient_id}" data-appt="${r.appointment_id}" data-patient="${r.patient_name}" data-date="${r.appointment_date}">
              <i class="fas fa-flask me-1"></i>Lab Request
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error('Error loading appointments:', error);
      Swal.fire('Error', 'Failed to load appointments', 'error');
    }
  }

  async function loadLabRequests() {
    try {
      const resp = await axios.get(`${labApi}?operation=get_by_doctor&doctor_id=${doctorId}`);
      const rows = resp.data.data || [];
      lrTbody.innerHTML = '';
      document.getElementById('labRequestCount').textContent = rows.length;
      
      if (rows.length === 0) {
        lrTbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted py-4">
              <div class="py-3">
                <i class="fas fa-flask fa-2x text-muted mb-2"></i>
                <p class="text-muted mb-0">No lab requests created yet.</p>
                <small class="text-muted">Create lab requests from your appointments above.</small>
              </div>
            </td>
          </tr>
        `;
        return;
      }
      
      rows.forEach(r => {
        const tr = document.createElement('tr');
        const statusClass = r.status_name.toLowerCase().replace(/\s/g, '');
        tr.innerHTML = `
          <td>${new Date(r.created_at).toLocaleDateString()}</td>
          <td><strong>${r.patient_name}</strong></td>
          <td>${r.appointment_date ? `${r.appointment_date} (Q#${r.queue_number})` : 'No appointment'}</td>
          <td><span class="status-badge status--${statusClass}">${r.status_name}</span></td>
          <td class="text-truncate" style="max-width: 200px;" title="${r.request_text}">${r.request_text}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-success me-1" data-update="${r.lab_request_id}" data-status="${r.status_name}">
              <i class="fas fa-edit me-1"></i>Update
            </button>
            <button class="btn btn-sm btn-outline-info" data-view="${r.lab_request_id}">
              <i class="fas fa-eye me-1"></i>View
            </button>
          </td>
        `;
        lrTbody.appendChild(tr);
      });
    } catch (error) {
      console.error('Error loading lab requests:', error);
      Swal.fire('Error', 'Failed to load lab requests', 'error');
    }
  }

  // Handle lab request button clicks
  tbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const pid = target.getAttribute('data-lr');
    const aid = target.getAttribute('data-appt');
    const patientName = target.getAttribute('data-patient');
    const apptDate = target.getAttribute('data-date');
    
    if (pid) {
      document.getElementById('lr_patient_id').value = pid;
      document.getElementById('lr_appointment_id').value = aid || '';
      document.getElementById('lr_patient_name').value = patientName;
      document.getElementById('lr_appointment_date').value = apptDate;
      document.getElementById('lr_text').value = '';
      labForm.classList.remove('was-validated');
      labModal.show();
    }
  });

  // Handle lab request table actions
  lrTbody.addEventListener('click', (e) => {
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
      // View lab request details
      viewLabRequest(viewId);
    }
  });

  async function viewLabRequest(labRequestId) {
    try {
      const resp = await axios.get(`${labApi}?operation=get_by_id&lab_request_id=${labRequestId}`);
      if (resp.data.success) {
        const lr = resp.data.data;
        Swal.fire({
          title: `Lab Request #${lr.lab_request_id}`,
          html: `
            <div class="text-start">
              <p><strong>Patient:</strong> ${lr.patient_name}</p>
              <p><strong>Created:</strong> ${new Date(lr.created_at).toLocaleString()}</p>
              <p><strong>Status:</strong> <span class="badge bg-primary">${lr.status_name}</span></p>
              <p><strong>Appointment:</strong> ${lr.appointment_date ? `${lr.appointment_date} (Q#${lr.queue_number})` : 'No appointment'}</p>
              <hr>
              <p><strong>Request Details:</strong></p>
              <div class="border p-3 bg-light rounded">${lr.request_text.replace(/\n/g, '<br>')}</div>
            </div>
          `,
          width: '600px',
          confirmButtonText: 'Close'
        });
      }
    } catch (error) {
      console.error('Error viewing lab request:', error);
      Swal.fire('Error', 'Failed to load lab request details', 'error');
    }
  }

  // Handle lab request form submission
  labForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!labForm.checkValidity()) { 
      labForm.classList.add('was-validated'); 
      return; 
    }
    
    try {
      const fd = new FormData(labForm);
      const payload = new FormData();
      payload.append('operation', 'create');
      payload.append('json', JSON.stringify({
        doctor_id: doctorId,
        patient_id: fd.get('patient_id'),
        appointment_id: fd.get('appointment_id') || null,
        request_text: fd.get('request_text')
      }));
      
      const resp = await axios.post(labApi, payload);
      if (resp.data.success) {
        labModal.hide();
        await loadLabRequests();
        Swal.fire('Success', 'Lab request sent to patient', 'success');
      } else {
        Swal.fire('Error', resp.data.message || 'Failed to send lab request', 'error');
      }
    } catch (error) {
      console.error('Error creating lab request:', error);
      Swal.fire('Error', 'Failed to create lab request', 'error');
    }
  });

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
        Swal.fire('Success', 'Lab request status updated', 'success');
      } else {
        Swal.fire('Error', resp.data.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire('Error', 'Failed to update status', 'error');
    }
  });

  // Initial load
  await loadAppointments();
  await loadLabRequests();
});


