document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const payApi = `${baseApiUrl}/payments.php`;
  const userApi = `${baseApiUrl}/user.php`;
  const labApi = `${baseApiUrl}/lab_requests.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const patientId = prof.data?.context?.patient_id;
  if (!patientId) { Swal.fire('Error', 'No patient profile found.', 'error'); return; }

  const apptsResp = await axios.get(`${apptApi}?operation=get_by_patient&patient_id=${patientId}`);
  const appts = apptsResp.data.data || [];

  // Stats
  document.getElementById('stat_total').textContent = appts.length;
  document.getElementById('stat_completed').textContent = appts.filter(a => a.appointment_status === 'Completed').length;
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('stat_upcoming').textContent = appts.filter(a => a.appointment_date >= today && (a.appointment_status === 'Pending' || a.appointment_status === 'Confirmed')).length;

  const payResp = await axios.get(`${payApi}?operation=get_by_patient&patient_id=${patientId}`);
  const unpaid = (payResp.data.data || []).filter(p => p.payment_status === 'Unpaid').length;
  document.getElementById('stat_unpaid').textContent = unpaid;

  // Recent
  const recent = [...appts].sort((a,b) => (b.appointment_date > a.appointment_date ? 1 : -1)).slice(0,5);
  const ul = document.getElementById('recent_list');
  ul.innerHTML = '';
  recent.forEach(r => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${r.appointment_date} - ${r.appointment_status}</span><span>${r.doctor_name || '-'}</span>`;
    ul.appendChild(li);
  });

  // Lab requests table
  const lrTbody = document.getElementById('patientLabRequestsTbody');
  try {
    const lr = await axios.get(`${labApi}?operation=get_by_patient&patient_id=${patientId}`);
    const rows = lr.data.data || [];
    lrTbody.innerHTML = '';
    
    if (rows.length === 0) {
      lrTbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            <div class="py-3">
              <i class="fas fa-flask fa-2x text-muted mb-2"></i>
              <p class="text-muted mb-0">No lab requests found</p>
              <small class="text-muted">Your doctor will create lab requests when needed.</small>
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
        <td><strong>${r.doctor_name}</strong><br><small class="text-muted">License: ${r.license_number}</small></td>
        <td><span class="status-badge status--${statusClass}">${r.status_name}</span></td>
        <td class="text-truncate" style="max-width: 200px;" title="${r.request_text}">${r.request_text}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" data-print="${r.lab_request_id}">
            <i class="fas fa-print me-1"></i>Print
          </button>
        </td>
      `;
      lrTbody.appendChild(tr);
    });

    lrTbody.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      const id = target.getAttribute('data-print');
      if (id) {
        const row = rows.find(x => String(x.lab_request_id) === String(id));
        if (!row) return;
        printLabRequest(row);
      }
    });
  } catch (e) {
    console.error('Failed to load lab requests', e);
    lrTbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          <div class="py-3">
            <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
            <p class="text-muted mb-0">Failed to load lab requests</p>
            <small class="text-muted">Please try refreshing the page.</small>
          </div>
        </td>
      </tr>
    `;
  }

  function printLabRequest(labRequest) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Request #${labRequest.lab_request_id} - MCSTUFFIN's Clinic</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 20px; }
          }
          .clinic-header { border-bottom: 3px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px; }
          .request-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .status-badge { background-color: #0d6efd; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        </style>
      </head>
      <body class="p-4">
        <div class="clinic-header text-center">
          <h2 class="text-primary mb-1">MCSTUFFIN's CLINIC</h2>
          <p class="text-muted mb-0">Professional Medical Services</p>
          <p class="text-muted mb-0">Lab Request Form</p>
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <h5 class="text-primary">Request Information</h5>
            <table class="table table-borderless">
              <tr><td><strong>Request #:</strong></td><td>LR-${labRequest.lab_request_id.toString().padStart(4, '0')}</td></tr>
              <tr><td><strong>Date Created:</strong></td><td>${new Date(labRequest.created_at).toLocaleDateString()}</td></tr>
              <tr><td><strong>Time:</strong></td><td>${new Date(labRequest.created_at).toLocaleTimeString()}</td></tr>
              <tr><td><strong>Status:</strong></td><td><span class="status-badge">${labRequest.status_name}</span></td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <h5 class="text-primary">Patient Information</h5>
            <table class="table table-borderless">
              <tr><td><strong>Patient Name:</strong></td><td>${labRequest.patient_name}</td></tr>
              <tr><td><strong>Doctor:</strong></td><td>Dr. ${labRequest.doctor_name}</td></tr>
              <tr><td><strong>License:</strong></td><td>${labRequest.license_number}</td></tr>
              ${labRequest.appointment_date ? `<tr><td><strong>Appointment:</strong></td><td>${labRequest.appointment_date} (Q#${labRequest.queue_number})</td></tr>` : ''}
            </table>
          </div>
        </div>
        
        <div class="request-details">
          <h5 class="text-primary mb-3">Laboratory Request Details</h5>
          <div class="border-start border-primary border-4 ps-3">
            ${labRequest.request_text.replace(/\n/g, '<br>')}
          </div>
        </div>
        
        <div class="row mt-4">
          <div class="col-md-6">
            <div class="border p-3 text-center">
              <p class="mb-1"><strong>Doctor's Signature</strong></p>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
              <small class="text-muted">Dr. ${labRequest.doctor_name}</small>
            </div>
          </div>
          <div class="col-md-6">
            <div class="border p-3 text-center">
              <p class="mb-1"><strong>Date & Time</strong></p>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
              <small class="text-muted">${currentDate} at ${currentTime}</small>
            </div>
          </div>
        </div>
        
        <div class="footer text-center">
          <p class="text-muted mb-1">This is an official document from MCSTUFFIN's Clinic</p>
          <p class="text-muted mb-0">For inquiries, please contact our clinic</p>
        </div>
        
        <div class="text-center mt-4 no-print">
          <button class="btn btn-primary me-2" onclick="window.print()">
            <i class="fas fa-print me-2"></i>Print
          </button>
          <button class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  }
});


