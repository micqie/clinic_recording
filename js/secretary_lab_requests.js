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
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-info me-1" data-view="${r.lab_request_id}">
              <i class="fas fa-eye me-1"></i>View
            </button>
            <button class="btn btn-sm btn-outline-success me-1" data-update="${r.lab_request_id}" data-status="${r.status_name}">
              <i class="fas fa-edit me-1"></i>Update
            </button>
            <button class="btn btn-sm btn-outline-primary" data-download="${r.lab_request_id}" title="Download PDF">
              <i class="fas fa-file-pdf"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" data-image="${r.lab_request_id}" title="Save as Image">
              <i class="fas fa-image"></i>
            </button>
          </div>
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
    const downloadId = target.getAttribute('data-download');
    const imageId = target.getAttribute('data-image');
    const currentStatus = target.getAttribute('data-status');
    
    if (updateId) {
      document.getElementById('us_lab_request_id').value = updateId;
      document.getElementById('us_current_status').value = currentStatus;
      document.getElementById('us_new_status').value = '';
      statusForm.classList.remove('was-validated');
      statusModal.show();
    } else if (viewId) {
      viewLabRequestDetails(viewId);
    } else if (downloadId) {
      downloadLabRequest(downloadId);
    } else if (imageId) {
      saveLabRequestAsImage(imageId);
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

  // Download lab request as PDF
  async function downloadLabRequest(labRequestId) {
    try {
      const resp = await axios.get(`${labApi}?operation=get_by_id&lab_request_id=${labRequestId}`);
      if (resp.data.success) {
        const labRequest = resp.data.data;
        
        // Check if jsPDF is available
        if (typeof jsPDF === 'undefined') {
          Swal.fire('Error', 'PDF generation library not loaded. Please refresh the page.', 'error');
          return;
        }

        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          
          // Set document properties
          doc.setProperties({
            title: `Lab Request #${labRequest.lab_request_id}`,
            subject: 'Laboratory Request Form',
            author: 'MCSTUFFIN\'s Clinic',
            creator: 'MCSTUFFIN\'s Clinic System'
          });

          // Add clinic header
          doc.setFontSize(24);
          doc.setTextColor(13, 110, 253); // Primary blue color
          doc.text('MCSTUFFIN\'s CLINIC', 105, 20, { align: 'center' });
          
          doc.setFontSize(14);
          doc.setTextColor(108, 117, 125); // Gray color
          doc.text('Professional Medical Services', 105, 30, { align: 'center' });
          doc.text('Lab Request Form', 105, 40, { align: 'center' });

          // Request Information section
          doc.setFontSize(16);
          doc.setTextColor(13, 110, 253);
          doc.text('Request Information:', 20, 60);
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(`Request #: LR-${labRequest.lab_request_id.toString().padStart(4, '0')}`, 20, 75);
          doc.text(`Date Created: ${new Date(labRequest.created_at).toLocaleDateString()}`, 20, 85);
          doc.text(`Time: ${new Date(labRequest.created_at).toLocaleTimeString()}`, 20, 95);
          doc.text(`Status: ${labRequest.status_name}`, 20, 105);

          // Patient Information section
          doc.setFontSize(16);
          doc.setTextColor(13, 110, 253);
          doc.text('Patient Information:', 20, 130);
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(`Patient Name: ${labRequest.patient_name}`, 20, 145);
          doc.text(`Doctor: Dr. ${labRequest.doctor_name}`, 20, 155);
          doc.text(`License: ${labRequest.license_number}`, 20, 165);
          if (labRequest.appointment_date) {
            doc.text(`Appointment: ${labRequest.appointment_date} (Q#${labRequest.queue_number})`, 20, 175);
          }

          // Lab Request Details section
          doc.setFontSize(16);
          doc.setTextColor(13, 110, 253);
          doc.text('Laboratory Request Details:', 20, 200);
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          
          // Split text into lines for PDF
          const maxWidth = 170; // Maximum width for text
          const lines = doc.splitTextToSize(labRequest.request_text, maxWidth);
          doc.text(lines, 20, 215);

          // Signature sections
          doc.setFontSize(14);
          doc.setTextColor(13, 110, 253);
          doc.text('Doctor\'s Signature:', 20, 250);
          doc.text('Date & Time:', 120, 250);
          
          doc.setFontSize(10);
          doc.setTextColor(108, 117, 125);
          doc.text(`Dr. ${labRequest.doctor_name}`, 20, 270);
          doc.text(`${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 120, 270);

          // Footer
          doc.setFontSize(10);
          doc.setTextColor(108, 117, 125);
          doc.text('This is an official document from MCSTUFFIN\'s Clinic', 105, 280, { align: 'center' });
          doc.text('For inquiries, please contact our clinic', 105, 285, { align: 'center' });

          // Save the PDF
          const filename = `Lab_Request_${labRequest.lab_request_id}_${labRequest.patient_name.replace(/\s+/g, '_')}.pdf`;
          doc.save(filename);
          
          Swal.fire('Success', 'PDF downloaded successfully!', 'success');
        } catch (error) {
          console.error('Error generating PDF:', error);
          Swal.fire('Error', 'Failed to generate PDF. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error downloading lab request:', error);
      Swal.fire('Error', 'Failed to load lab request details', 'error');
    }
  }

  // Save lab request as image
  async function saveLabRequestAsImage(labRequestId) {
    try {
      const resp = await axios.get(`${labApi}?operation=get_by_id&lab_request_id=${labRequestId}`);
      if (resp.data.success) {
        const labRequest = resp.data.data;
        
        // Create a temporary div with the lab request content
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '800px';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.padding = '40px';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.style.color = 'black';
        tempDiv.style.border = '1px solid #ccc';
        
        tempDiv.innerHTML = `
          <div style="text-align: center; border-bottom: 3px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px;">
            <h2 style="color: #0d6efd; margin-bottom: 10px;">MCSTUFFIN's CLINIC</h2>
            <p style="color: #6c757d; margin: 5px 0;">Professional Medical Services</p>
            <p style="color: #6c757d; margin: 5px 0;">Lab Request Form</p>
          </div>
          
          <div style="display: flex; margin-bottom: 30px;">
            <div style="flex: 1;">
              <h5 style="color: #0d6efd;">Request Information</h5>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 0;"><strong>Request #:</strong></td><td style="padding: 5px 0;">LR-${labRequest.lab_request_id.toString().padStart(4, '0')}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Date Created:</strong></td><td style="padding: 5px 0;">${new Date(labRequest.created_at).toLocaleDateString()}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Time:</strong></td><td style="padding: 5px 0;">${new Date(labRequest.created_at).toLocaleTimeString()}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Status:</strong></td><td style="padding: 5px 0;"><span style="background-color: #0d6efd; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">${labRequest.status_name}</span></td></tr>
              </table>
            </div>
            <div style="flex: 1; margin-left: 20px;">
              <h5 style="color: #0d6efd;">Patient Information</h5>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 0;"><strong>Patient Name:</strong></td><td style="padding: 5px 0;">${labRequest.patient_name}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Doctor:</strong></td><td style="padding: 5px 0;">Dr. ${labRequest.doctor_name}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>License:</strong></td><td style="padding: 5px 0;">${labRequest.license_number}</td></tr>
                ${labRequest.appointment_date ? `<tr><td style="padding: 5px 0;"><strong>Appointment:</strong></td><td style="padding: 5px 0;">${labRequest.appointment_date} (Q#${labRequest.queue_number})</td></tr>` : ''}
              </table>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h5 style="color: #0d6efd; margin-bottom: 15px;">Laboratory Request Details</h5>
            <div style="border-left: 4px solid #0d6efd; padding-left: 15px;">
              ${labRequest.request_text.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="display: flex; margin-top: 40px;">
            <div style="flex: 1; border: 1px solid #000; padding: 15px; text-align: center; margin-right: 10px;">
              <p style="margin-bottom: 5px;"><strong>Doctor's Signature</strong></p>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
              <small style="color: #6c757d;">Dr. ${labRequest.doctor_name}</small>
            </div>
            <div style="flex: 1; border: 1px solid #000; padding: 15px; text-align: center; margin-left: 10px;">
              <p style="margin-bottom: 5px;"><strong>Date & Time</strong></p>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
              <small style="color: #6c757d;">${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</small>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; margin: 5px 0;">This is an official document from MCSTUFFIN's Clinic</p>
            <p style="color: #6c757d; margin: 5px 0;">For inquiries, please contact our clinic</p>
          </div>
        `;
        
        document.body.appendChild(tempDiv);
        
        // Wait a bit for the DOM to be ready
        setTimeout(() => {
          // Use html2canvas to convert the div to an image
          if (typeof html2canvas !== 'undefined') {
            html2canvas(tempDiv, {
              width: 800,
              height: 1200,
              backgroundColor: '#ffffff',
              scale: 2,
              useCORS: true,
              allowTaint: true,
              logging: false
            }).then(canvas => {
              try {
                // Convert canvas to blob and download
                canvas.toBlob((blob) => {
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Lab_Request_${labRequest.lab_request_id}_${labRequest.patient_name.replace(/\s+/g, '_')}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    Swal.fire('Success', 'Image saved successfully!', 'success');
                  } else {
                    throw new Error('Failed to create blob from canvas');
                  }
                }, 'image/png', 0.95);
              } catch (error) {
                console.error('Error creating blob:', error);
                Swal.fire('Error', 'Failed to generate image. Please try again.', 'error');
              }
              
              // Clean up
              document.body.removeChild(tempDiv);
            }).catch(error => {
              console.error('html2canvas error:', error);
              console.log('Falling back to canvas method...');
              // Fallback to canvas method
              generateCanvasImage(labRequest);
              document.body.removeChild(tempDiv);
            });
          } else {
            // Fallback: show error
            console.log('html2canvas not available, using fallback method');
            generateCanvasImage(labRequest);
            document.body.removeChild(tempDiv);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error saving lab request as image:', error);
      Swal.fire('Error', 'Failed to load lab request details', 'error');
    }
  }

  // Fallback canvas-based image generation
  function generateCanvasImage(labRequest) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 1200;
      
      // Set background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set text styles
      ctx.fillStyle = '#0d6efd';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MCSTUFFIN\'s CLINIC', canvas.width/2, 50);
      
      ctx.fillStyle = '#6c757d';
      ctx.font = '16px Arial';
      ctx.fillText('Professional Medical Services', canvas.width/2, 80);
      ctx.fillText('Lab Request Form', canvas.width/2, 100);
      
      // Request Information
      ctx.fillStyle = '#0d6efd';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Request Information:', 50, 150);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText(`Request #: LR-${labRequest.lab_request_id.toString().padStart(4, '0')}`, 50, 180);
      ctx.fillText(`Date Created: ${new Date(labRequest.created_at).toLocaleDateString()}`, 50, 200);
      ctx.fillText(`Time: ${new Date(labRequest.created_at).toLocaleTimeString()}`, 50, 220);
      ctx.fillText(`Status: ${labRequest.status_name}`, 50, 240);
      
      // Patient Information
      ctx.fillStyle = '#0d6efd';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Patient Information:', 50, 290);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText(`Patient Name: ${labRequest.patient_name}`, 50, 320);
      ctx.fillText(`Doctor: Dr. ${labRequest.doctor_name}`, 50, 340);
      ctx.fillText(`License: ${labRequest.license_number}`, 50, 360);
      if (labRequest.appointment_date) {
        ctx.fillText(`Appointment: ${labRequest.appointment_date} (Q#${labRequest.queue_number})`, 50, 380);
      }
      
      // Lab Request Details
      ctx.fillStyle = '#0d6efd';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Laboratory Request Details:', 50, 430);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      
      // Split text into lines for proper display
      const words = labRequest.request_text.split(' ');
      let line = '';
      let y = 460;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 700 && i > 0) {
          ctx.fillText(line, 50, y);
          line = words[i] + ' ';
          y += 20;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 50, y);
      
      // Footer
      ctx.fillStyle = '#6c757d';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('This is an official document from MCSTUFFIN\'s Clinic', canvas.width/2, 1100);
      ctx.fillText('For inquiries, please contact our clinic', canvas.width/2, 1120);
      
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Lab_Request_${labRequest.lab_request_id}_${labRequest.patient_name.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          Swal.fire('Success', 'Image saved successfully!', 'success');
        } else {
          Swal.fire('Error', 'Failed to generate image. Please try again.', 'error');
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('Canvas generation error:', error);
      Swal.fire('Error', 'Failed to generate image. Please try again.', 'error');
    }
  }

  // Initial load
  await loadLabRequests();
});
