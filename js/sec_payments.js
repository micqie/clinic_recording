document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const paymentsApi = `${baseApiUrl}/payments.php`;
  const prescriptionApi = `${baseApiUrl}/prescriptions.php`;
  const labApi = `${baseApiUrl}/lab_requests.php`;

  const tbody = document.getElementById("paymentsTableBody");
  const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
  const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
  const paymentForm = document.getElementById('paymentForm');
  const paymentMethodSelect = document.getElementById('payment_method');

  // Load payment methods from lookup table
  async function loadPaymentMethods() {
    try {
      const response = await axios.get(`${baseApiUrl}/payment_methods.php?operation=get_all`);
      if (response.data.success) {
        const methods = response.data.data || [];
        paymentMethodSelect.innerHTML = '<option value="">Select Method</option>';
        methods.forEach(method => {
          if (method.is_active == 1) {
            const option = document.createElement('option');
            option.value = method.method_name;
            option.textContent = method.method_name;
            paymentMethodSelect.appendChild(option);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  }

  function statusClass(name) {
    const key = (name || '').toLowerCase();
    if (key === 'paid' || key === 'ready') return 'status--confirmed';
    if (key === 'unpaid' || key === 'processing') return 'status--unpaid';
    if (key === 'refunded') return 'status--cancelled';
    return '';
  }

  async function loadPayments() {
    const resp = await axios.get(`${paymentsApi}?operation=getAll`);
    const rows = resp.data.payments || [];
    tbody.innerHTML = '';

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="fas fa-credit-card fa-3x mb-3"></i>
            <p>No payments found</p>
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.payment_date || '-'}</td>
         <td>${r.patient_name || '-'}</td>
        <td>${r.doctor_name || '-'}</td>
        <td>₱${parseFloat(r.amount || 0).toFixed(2)}</td>
        <td>${r.payment_method || '-'}</td>
        <td><span class="status-badge ${statusClass(r.status_name || 'Unpaid')}">${r.status_name || 'Unpaid'}</span></td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary me-1" data-edit="${r.appointment_id}" data-patient-id="${r.patient_id}" data-due="${parseFloat(r.amount || 0).toFixed(2)}">Payment</button>
          <button class="btn btn-sm btn-outline-success" data-receipt="${r.appointment_id}" data-patient="${r.patient_name}" data-doctor="${r.doctor_name || ''}" data-date="${r.payment_date || ''}" data-status="${(r.status_name || 'Unpaid')}">Receipt</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener('click', (e) => {
    const aid = e.target.getAttribute('data-edit');
    const receiptAid = e.target.getAttribute('data-receipt');
    const patientName = e.target.getAttribute('data-patient');
    const patientId = e.target.getAttribute('data-patient-id');
    const due = e.target.getAttribute('data-due');

    if (aid) {
      document.getElementById('payment_appointment_id').value = aid;
      const dueEl = document.getElementById('payment_due');
      const recvEl = document.getElementById('payment_amount_received');
      const changeEl = document.getElementById('payment_change');
      const statusHidden = document.getElementById('payment_status');
      const statusBadge = document.getElementById('payment_status_badge');

      if (dueEl) dueEl.value = due || '0.00';
      const patientHidden = document.getElementById('payment_patient_id');
      if (patientHidden) patientHidden.value = patientId || '';
      if (recvEl) recvEl.value = '';
      if (changeEl) changeEl.value = '0.00';
      if (statusHidden) statusHidden.value = 'Unpaid';
      if (statusBadge) { statusBadge.textContent = 'Unpaid'; statusBadge.className = 'badge bg-warning'; }
      document.getElementById('payment_method').value = '';
      paymentModal.show();
    }

    if (receiptAid) {
      generateReceipt(receiptAid, patientName, {
        doctor: e.target.getAttribute('data-doctor') || '',
        date: e.target.getAttribute('data-date') || '',
        status: e.target.getAttribute('data-status') || ''
      });
    }
  });

  paymentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(paymentForm);
    const due = parseFloat(fd.get('due') || '0');
    const received = parseFloat(fd.get('amount_received') || '0');

    // Guard: insufficient cash
    if (received < due) {
      Swal.fire('Insufficient', 'Amount received is less than amount due.', 'error');
      return;
    }

    // Force status to Paid when sufficient
    fd.set('status', 'Paid');
    const payload = new FormData();
    // Use backend operation that marks appointment payment as Paid
    payload.append('operation', 'markAppointmentPaid');
    payload.append('json', JSON.stringify({
      appointment_id: fd.get('appointment_id'),
      patient_id: fd.get('patient_id'),
      method_name: fd.get('method') || 'Walk-in'
    }));
    const resp = await axios.post(paymentsApi, payload);
    if (resp.data.success) {
      paymentModal.hide();
      await loadPayments();
      Swal.fire('Saved', 'Payment updated', 'success');
    } else {
      Swal.fire('Error', resp.data.message || 'Update failed', 'error');
    }
  });

  // Generate receipt for an appointment
  async function generateReceipt(appointmentId, patientName, rowMeta) {
    try {
      // Get prescriptions for this appointment
      const prescriptionResp = await axios.get(`${prescriptionApi}?operation=get_by_appointment&appointment_id=${appointmentId}`);
             const prescriptions = prescriptionResp.data.success ? prescriptionResp.data.prescriptions : [];

             // Get lab requests for this appointment
       const labResp = await axios.get(`${labApi}?operation=getByAppointment&appointment_id=${appointmentId}`);
             const labRequests = labResp.data.success ? labResp.data.requests : [];

      // Get appointment details for doctor and date
      const appointmentResp = await axios.get(`${baseApiUrl}/appointments.php?operation=get&appointment_id=${appointmentId}`);
      const appointmentData = appointmentResp.data.success ? appointmentResp.data.data : null;

      // Calculate totals
      let medicineTotal = 0;
      let labTotal = 0;

      // Populate medicines table
      const medicinesTbody = document.getElementById('receipt_medicines');
      medicinesTbody.innerHTML = '';

      prescriptions.forEach(prescription => {
        const price = parseFloat(prescription.medicine_price) || 0;
        medicineTotal += price;

        const row = document.createElement('tr');
        const packagingDisplay = prescription.packaging_name || prescription.packaging_unit || 'unit';
        row.innerHTML = `
          <td>${prescription.generic_name}</td>
          <td>${prescription.dosage}</td>
          <td>${prescription.frequency}</td>
          <td>${prescription.duration}</td>
          <td class="text-end">₱${price.toFixed(2)}</td>
        `;
        medicinesTbody.appendChild(row);
      });

      // Populate lab tests table
      const labTbody = document.getElementById('receipt_lab_tests');
      labTbody.innerHTML = '';

      labRequests.forEach(lab => {
        // Use actual price from lab test type
        const price = parseFloat(lab.price) || 400; // Default to 400 if no price set
        labTotal += price;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${lab.type_name || 'Lab Test'}</td>
          <td>${lab.request_text}</td>
          <td class="text-end">₱${price.toFixed(2)}</td>
        `;
        labTbody.appendChild(row);
      });

      // Show/hide lab section based on whether there are lab tests
      const labSection = document.getElementById('receipt_lab_section');
      const labTotalRow = document.getElementById('receipt_lab_total_row');
      if (labRequests.length > 0) {
        labSection.style.display = 'block';
        labTotalRow.style.display = 'block';
      } else {
        labSection.style.display = 'none';
        labTotalRow.style.display = 'none';
      }

      // Update totals
      document.getElementById('receipt_medicine_total').textContent = `₱${medicineTotal.toFixed(2)}`;
      document.getElementById('receipt_lab_total').textContent = `₱${labTotal.toFixed(2)}`;
      document.getElementById('receipt_grand_total').textContent = `₱${(medicineTotal + labTotal).toFixed(2)}`;

      // Update receipt header information
      const statusBadge = document.getElementById('receipt_status');
      const statusName = (rowMeta?.status || '').toLowerCase() === 'paid' ? 'Paid' : 'Unpaid';
      statusBadge.textContent = statusName.toUpperCase();
      statusBadge.className = 'badge ' + (statusName === 'Paid' ? 'bg-success' : 'bg-warning');

      // Prefer row meta (from the list), fall back to API
      document.getElementById('receipt_date').textContent = rowMeta?.date || new Date().toLocaleDateString();
      document.getElementById('receipt_patient').textContent = patientName || 'N/A';
      document.getElementById('receipt_doctor').textContent = rowMeta?.doctor || (appointmentData ? appointmentData.doctor_name : 'N/A');
      document.getElementById('receipt_appointment').textContent = appointmentData ? appointmentData.appointment_date : (rowMeta?.date || 'N/A');
      document.getElementById('receipt_number').textContent = `RCP-${appointmentId}-${Date.now().toString().slice(-6)}`;

      // Update instructions
      const instructions = prescriptions.map(p => p.instructions).filter(i => i).join('; ');
      document.getElementById('receipt_instructions').textContent = instructions || 'Please follow the prescribed dosage and frequency. Contact your doctor if you experience any side effects.';

      // Show the receipt modal
      receiptModal.show();

    } catch (error) {
      console.error('Error generating receipt:', error);
      Swal.fire('Error', 'Failed to generate receipt', 'error');
    }
  }

  // Print receipt function
  window.printReceipt = function() {
    const printContent = document.querySelector('#receiptModal .modal-content').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Medical Receipt</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            @media print {
              .modal-footer { display: none; }
              .btn-close { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container-fluid p-4">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  loadPayments();
  loadPaymentMethods(); // Call loadPaymentMethods here
});
