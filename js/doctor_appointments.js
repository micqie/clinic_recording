document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const userApi = `${baseApiUrl}/user.php`;
  const labApi = `${baseApiUrl}/lab_requests.php`;
  const diagnosisApi = `${baseApiUrl}/diagnoses.php`;
  const prescriptionApi = `${baseApiUrl}/prescriptions.php`;
  const medicineApi = `${baseApiUrl}/medicines.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const doctorId = prof.data?.context?.doctor_id;
  if (!doctorId) { Swal.fire('Error', 'No doctor profile found.', 'error'); return; }

  const tbody = document.getElementById('docAppointmentsTableBody');
  const lrTbody = document.getElementById('docLabRequestsTableBody');
  const presTbody = document.getElementById('docPrescriptionsTableBody');
  const labModal = new bootstrap.Modal(document.getElementById('labRequestModal'));
  const statusModal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
  const diagnosisModal = new bootstrap.Modal(document.getElementById('diagnosisModal'));
  const prescriptionModal = new bootstrap.Modal(document.getElementById('prescriptionModal'));
  const labForm = document.getElementById('labRequestForm');
  const statusForm = document.getElementById('updateStatusForm');
  const diagnosisForm = document.getElementById('diagnosisForm');
  const prescriptionForm = document.getElementById('prescriptionForm');

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
            <button class="btn btn-sm btn-outline-primary me-1" data-lr="${r.patient_id}" data-appt="${r.appointment_id}" data-patient="${r.patient_name}" data-date="${r.appointment_date}">
              <i class="fas fa-flask me-1"></i>Lab Request
            </button>
            <button class="btn btn-sm btn-outline-success me-1" data-diagnosis="${r.patient_id}" data-appt="${r.appointment_id}" data-patient="${r.patient_name}" data-date="${r.appointment_date}">
              <i class="fas fa-stethoscope me-1"></i>Diagnosis
            </button>
            <button class="btn btn-sm btn-outline-info" data-prescription="${r.patient_id}" data-appt="${r.appointment_id}" data-patient="${r.patient_name}" data-date="${r.appointment_date}">
              <i class="fas fa-pills me-1"></i>Prescription
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

  async function loadPrescriptions() {
    try {
      const resp = await axios.get(`${prescriptionApi}?operation=get_all`);
      const rows = resp.data.data || [];
      presTbody.innerHTML = '';
      document.getElementById('prescriptionCount').textContent = rows.length;
      
      if (rows.length === 0) {
        presTbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center text-muted py-4">
              <div class="py-3">
                <i class="fas fa-pills fa-2x text-muted mb-2"></i>
                <p class="text-muted mb-0">No prescriptions created yet.</p>
                <small class="text-muted">Create prescriptions from your appointments above.</small>
              </div>
            </td>
          </tr>
        `;
        return;
      }
      
      rows.forEach(r => {
        const tr = document.createElement('tr');
        const statusClass = r.status.toLowerCase().replace(/\s/g, '');
        tr.innerHTML = `
          <td>${new Date(r.created_at).toLocaleDateString()}</td>
          <td><strong>${r.patient_name}</strong></td>
          <td>${r.condition_name}</td>
          <td>${r.medicine_name}</td>
          <td>${r.dosage}</td>
          <td>${r.frequency}</td>
          <td>${r.duration}</td>
          <td><span class="status-badge status--${statusClass}">${r.status}</span></td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-info" data-view-prescription="${r.prescription_id}">
              <i class="fas fa-eye me-1"></i>View
            </button>
          </td>
        `;
        presTbody.appendChild(tr);
      });
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      Swal.fire('Error', 'Failed to load prescriptions', 'error');
    }
  }

  // Handle appointment button clicks
  tbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const pid = target.getAttribute('data-lr') || target.getAttribute('data-diagnosis') || target.getAttribute('data-prescription');
    const aid = target.getAttribute('data-appt');
    const patientName = target.getAttribute('data-patient');
    const apptDate = target.getAttribute('data-date');
    
    // Lab Request
    if (target.getAttribute('data-lr')) {
      document.getElementById('lr_patient_id').value = pid;
      document.getElementById('lr_appointment_id').value = aid || '';
      document.getElementById('lr_patient_name').value = patientName;
      document.getElementById('lr_appointment_date').value = apptDate;
      document.getElementById('lr_text').value = '';
      labForm.classList.remove('was-validated');
      labModal.show();
    }
    
    // Diagnosis
    if (target.getAttribute('data-diagnosis')) {
      document.getElementById('diag_patient_id').value = pid;
      document.getElementById('diag_appointment_id').value = aid || '';
      document.getElementById('diag_doctor_id').value = doctorId;
      document.getElementById('diag_patient_name').value = patientName;
      document.getElementById('diag_appointment_date').value = apptDate;
      document.getElementById('diag_date_diagnosed').value = new Date().toISOString().split('T')[0];
      document.getElementById('diag_condition_name').value = '';
      document.getElementById('diag_severity').value = '';
      document.getElementById('diag_notes').value = '';
      diagnosisForm.classList.remove('was-validated');
      diagnosisModal.show();
    }
    
    // Prescription
    if (target.getAttribute('data-prescription')) {
      // First check if there's a diagnosis for this appointment
      checkDiagnosisForPrescription(aid, pid, patientName, apptDate);
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

  // Handle prescription table actions
  presTbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const viewPrescriptionId = target.getAttribute('data-view-prescription');
    
    if (viewPrescriptionId) {
      // View prescription details
      viewPrescription(viewPrescriptionId);
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

  async function viewPrescription(prescriptionId) {
    try {
      const resp = await axios.get(`${prescriptionApi}?operation=get&id=${prescriptionId}`);
      if (resp.data.success) {
        const prescription = resp.data.data;
        Swal.fire({
          title: `Prescription #${prescription.prescription_id}`,
          html: `
            <div class="text-start">
              <p><strong>Patient:</strong> ${prescription.patient_name}</p>
              <p><strong>Doctor:</strong> ${prescription.doctor_name}</p>
              <p><strong>Diagnosis:</strong> ${prescription.condition_name}</p>
              <p><strong>Created:</strong> ${new Date(prescription.created_at).toLocaleString()}</p>
              <p><strong>Status:</strong> <span class="badge bg-info">${prescription.status}</span></p>
              <hr>
              <p><strong>Medicine:</strong> ${prescription.medicine_name}</p>
              <p><strong>Dosage:</strong> ${prescription.dosage}</p>
              <p><strong>Frequency:</strong> ${prescription.frequency}</p>
              <p><strong>Duration:</strong> ${prescription.duration}</p>
              <p><strong>Price:</strong> ₱${prescription.medicine_price}</p>
              ${prescription.instructions ? `<p><strong>Instructions:</strong> ${prescription.instructions}</p>` : ''}
            </div>
          `,
          width: '600px',
          confirmButtonText: 'Close'
        });
      }
    } catch (error) {
      console.error('Error viewing prescription:', error);
      Swal.fire('Error', 'Failed to load prescription details', 'error');
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

  // Check if diagnosis exists for prescription
  async function checkDiagnosisForPrescription(appointmentId, patientId, patientName, appointmentDate) {
    try {
      const response = await axios.get(`${diagnosisApi}?operation=get_by_appointment&appointment_id=${appointmentId}`);
      if (response.data.success && response.data.data.length > 0) {
        // Diagnosis exists, show prescription modal
        const diagnosis = response.data.data[0];
        document.getElementById('pres_patient_id').value = patientId;
        document.getElementById('pres_appointment_id').value = appointmentId;
        document.getElementById('pres_doctor_id').value = doctorId;
        document.getElementById('pres_diagnosis_id').value = diagnosis.diagnosis_id;
        document.getElementById('pres_patient_name').value = patientName;
        document.getElementById('pres_diagnosis_name').value = diagnosis.condition_name;
        document.getElementById('pres_medicine_id').value = '';
        document.getElementById('pres_dosage').value = '';
        document.getElementById('pres_frequency').value = '';
        document.getElementById('pres_duration').value = '';
        document.getElementById('pres_instructions').value = '';
        prescriptionForm.classList.remove('was-validated');
        
        // Load medicines
        await loadMedicines();
        prescriptionModal.show();
      } else {
        Swal.fire('No Diagnosis Found', 'Please add a diagnosis first before creating a prescription.', 'warning');
      }
    } catch (error) {
      console.error('Error checking diagnosis:', error);
      Swal.fire('Error', 'Failed to check diagnosis status.', 'error');
    }
  }

  // Load medicines for prescription
  async function loadMedicines() {
    try {
      const response = await axios.get(`${medicineApi}?operation=get_all`);
      const medicineSelect = document.getElementById('pres_medicine_id');
      medicineSelect.innerHTML = '<option value="">Select Medicine</option>';
      
      if (response.data && response.data.length > 0) {
        response.data.forEach((medicine) => {
          const option = document.createElement('option');
          option.value = medicine.medicine_id;
          option.textContent = `${medicine.name} (${medicine.form}) - ₱${medicine.price} - Stock: ${medicine.stock}`;
          medicineSelect.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No medicines available";
        option.disabled = true;
        medicineSelect.appendChild(option);
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
      const medicineSelect = document.getElementById('pres_medicine_id');
      medicineSelect.innerHTML = '<option value="">Error loading medicines</option>';
    }
  }

  // Handle diagnosis form submission
  diagnosisForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!diagnosisForm.checkValidity()) { 
      diagnosisForm.classList.add('was-validated'); 
      return; 
    }
    
    try {
      const fd = new FormData(diagnosisForm);
      const payload = new FormData();
      payload.append('operation', 'add');
      payload.append('json', JSON.stringify({
        appointment_id: fd.get('appointment_id'),
        doctor_id: fd.get('doctor_id'),
        patient_id: fd.get('patient_id'),
        condition_name: fd.get('condition_name'),
        date_diagnosed: fd.get('date_diagnosed'),
        severity: fd.get('severity'),
        notes: fd.get('notes')
      }));
      
      const resp = await axios.post(diagnosisApi, payload);
      if (resp.data.success) {
        diagnosisModal.hide();
        Swal.fire('Success', 'Diagnosis added successfully.', 'success');
      } else {
        Swal.fire('Error', resp.data.message || 'Failed to add diagnosis', 'error');
      }
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      Swal.fire('Error', 'Failed to create diagnosis', 'error');
    }
  });

  // Handle prescription form submission
  prescriptionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!prescriptionForm.checkValidity()) { 
      prescriptionForm.classList.add('was-validated'); 
      return; 
    }
    
    try {
      const fd = new FormData(prescriptionForm);
      const payload = new FormData();
      payload.append('operation', 'add');
      payload.append('json', JSON.stringify({
        diagnosis_id: fd.get('diagnosis_id'),
        appointment_id: fd.get('appointment_id'),
        doctor_id: fd.get('doctor_id'),
        patient_id: fd.get('patient_id'),
        medicine_id: fd.get('medicine_id'),
        dosage: fd.get('dosage'),
        frequency: fd.get('frequency'),
        duration: fd.get('duration'),
        instructions: fd.get('instructions')
      }));
      
             const resp = await axios.post(prescriptionApi, payload);
       if (resp.data.success) {
         prescriptionModal.hide();
         
         // Reload prescriptions table
         await loadPrescriptions();
         
         // Show success message and stay on doctor page
         Swal.fire({
           title: 'Prescription Added Successfully!',
           text: 'Done prescribing a patient.',
           icon: 'success',
           timer: 2000,
           showConfirmButton: false
         });
       } else {
         Swal.fire('Error', resp.data.message || 'Failed to add prescription', 'error');
       }
    } catch (error) {
      console.error('Error creating prescription:', error);
      Swal.fire('Error', 'Failed to create prescription', 'error');
    }
  });

  // Initial load
  await loadAppointments();
  await loadLabRequests();
  await loadPrescriptions();
});


