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
        <td class="text-nowrap">
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" data-print="${r.lab_request_id}" title="Print">
              <i class="fas fa-print"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" data-download="${r.lab_request_id}" title="Download PDF">
              <i class="fas fa-file-pdf"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" data-image="${r.lab_request_id}" title="Save as Image">
              <i class="fas fa-image"></i>
            </button>
          </div>
        </td>
      `;
      lrTbody.appendChild(tr);
    });

    lrTbody.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      const id = target.getAttribute('data-print') || target.getAttribute('data-download') || target.getAttribute('data-image');
      if (id) {
        const row = rows.find(x => String(x.lab_request_id) === String(id));
        if (!row) return;
        
        if (target.getAttribute('data-download')) {
          downloadLabRequest(row);
        } else if (target.getAttribute('data-image')) {
          saveAsImage(row);
        } else {
          printLabRequest(row);
        }
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

  function downloadLabRequest(labRequest) {
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

  function saveAsImage(labRequest) {
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
        // Fallback: use the canvas method
        console.log('html2canvas not available, using fallback method');
        generateCanvasImage(labRequest);
        document.body.removeChild(tempDiv);
      }
    }, 100);
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
});


