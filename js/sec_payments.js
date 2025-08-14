document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const paymentsApi = `${baseApiUrl}/payments.php`;
  const prescriptionApi = `${baseApiUrl}/prescriptions.php`;
  const labApi = `${baseApiUrl}/lab_requests.php`;

  const tbody = document.getElementById("paymentsTableBody");
  const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
  const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
  const paymentForm = document.getElementById('paymentForm');

  function statusClass(name) {
    const key = (name || '').toLowerCase();
    if (key === 'paid' || key === 'ready') return 'status--confirmed';
    if (key === 'unpaid' || key === 'processing') return 'status--unpaid';
    if (key === 'refunded') return 'status--cancelled';
    return '';
  }

  async function loadPayments() {
    const resp = await axios.get(`${paymentsApi}?operation=get_all`);
    const rows = resp.data.data || [];
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.payment_date || '-'}</td>
        <td>${r.patient_name}</td>
        <td>${r.doctor_name || '-'}</td>
        <td>${r.amount || '-'}</td>
        <td>${r.method || '-'}</td>
        <td><span class="status-badge ${statusClass(r.payment_status || 'Unpaid')}">${r.payment_status || 'Unpaid'}</span></td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary me-1" data-edit="${r.appointment_id}">Edit</button>
          <button class="btn btn-sm btn-outline-success" data-receipt="${r.appointment_id}" data-patient="${r.patient_name}">Receipt</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener('click', (e) => {
    const aid = e.target.getAttribute('data-edit');
    const receiptAid = e.target.getAttribute('data-receipt');
    const patientName = e.target.getAttribute('data-patient');
    
    if (aid) {
      document.getElementById('payment_appointment_id').value = aid;
      document.getElementById('payment_amount').value = '';
      document.getElementById('payment_method').value = '';
      document.getElementById('payment_status').value = 'Unpaid';
      paymentModal.show();
    }
    
    if (receiptAid) {
      generateReceipt(receiptAid, patientName);
    }
  });

  paymentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(paymentForm);
    const payload = new FormData();
    payload.append('operation', 'set_status');
    payload.append('json', JSON.stringify({
      appointment_id: fd.get('appointment_id'),
      amount: fd.get('amount') ? parseFloat(fd.get('amount')) : null,
      method: fd.get('method') || null,
      status_name: fd.get('status')
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
  async function generateReceipt(appointmentId, patientName) {
    try {
      // Get prescriptions for this appointment
      const prescriptionResp = await axios.get(`${prescriptionApi}?operation=get_by_appointment&appointment_id=${appointmentId}`);
      const prescriptions = prescriptionResp.data.success ? prescriptionResp.data.data : [];
      
      // Get lab requests for this appointment
      const labResp = await axios.get(`${labApi}?operation=get_by_appointment&appointment_id=${appointmentId}`);
      const labRequests = labResp.data.success ? labResp.data.data : [];
      
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
        row.innerHTML = `
          <td>${prescription.medicine_name}</td>
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
        // Assuming a fixed price for lab tests (you can modify this based on your needs)
        const price = 500; // Default lab test price
        labTotal += price;
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>Lab Test</td>
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
      document.getElementById('receipt_date').textContent = new Date().toLocaleDateString();
      document.getElementById('receipt_patient').textContent = patientName;
      document.getElementById('receipt_doctor').textContent = appointmentData ? appointmentData.doctor_name : 'N/A';
      document.getElementById('receipt_appointment').textContent = appointmentData ? appointmentData.appointment_date : 'N/A';
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
});


