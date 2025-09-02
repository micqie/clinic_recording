document.addEventListener('DOMContentLoaded', () => {
  const storedBase = sessionStorage.getItem('baseAPIUrl') || sessionStorage.getItem('baseApiUrl') || '';
  const origin = window.location.origin;
  const candidates = [storedBase, `${origin}/clinic_recording/api`, `${origin}/api`, `${window.location.pathname.includes('/clinic_recording/') ? '/clinic_recording/api' : '/api'}`].filter(Boolean);
  const baseApiUrl = candidates[0];
  const paymentsApi = `${baseApiUrl}/payments.php`;
  const prescriptionReceiptApi = `${baseApiUrl}/prescription_receipt.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '../../index.html'; return; }

  const tableBody = document.getElementById('paymentsTableBody');
  const countBadge = document.getElementById('paymentsCount');
  const totalPaidEl = document.getElementById('totalPaid');
  const totalPendingEl = document.getElementById('totalPending');
  const totalOverdueEl = document.getElementById('totalOverdue');
  const thisMonthEl = document.getElementById('thisMonth');

  function dueDateFor(appointmentDate) {
    // 1 day after appointment (clinic policy)
    const d = new Date(appointmentDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0,10);
  }

  function isOverdue(payment) {
    if ((payment.status_name || '').toLowerCase() !== 'unpaid') return false;
    const due = new Date(dueDateFor(payment.appointment_date));
    const today = new Date(); today.setHours(0,0,0,0);
    return due < today;
  }

  async function loadPayments() {
    try {
      const prof = await axios.get(`${baseApiUrl}/user.php?operation=profile&user_id=${user.id}`);
      const patientId = prof.data?.context?.patient_id;
      if (!patientId) throw new Error('No patient_id');

      // Ensure pending records exist based on prescriptions+labs
      try { await axios.get(`${paymentsApi}?operation=ensurePendingForPatient&patient_id=${patientId}`); } catch (_) {}

      const res = await axios.get(`${paymentsApi}?operation=getByPatient&patient_id=${patientId}`);
      const rows = res.data?.payments || [];
      countBadge.textContent = rows.length;

      // aggregates
      let paidTotal = 0, pendingTotal = 0, overdueTotal = 0, monthTotal = 0;
      const now = new Date(); const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

      tableBody.innerHTML = '';
      rows.forEach(p => {
        const status = (p.status_name || '').toLowerCase();
        const amount = Number(p.amount || 0);
        if (status === 'paid') paidTotal += amount;
        if (status === 'unpaid') pendingTotal += amount;
        if (isOverdue(p)) overdueTotal += amount;
        if ((p.payment_date || '').startsWith(ym)) monthTotal += amount;

        const overdueTag = isOverdue(p) ? '<span class="badge bg-danger ms-2">Overdue</span>' : '';
        const dueStr = status === 'unpaid' ? dueDateFor(p.appointment_date) : '-';
        const actions = status === 'unpaid'
          ? `<button class="btn btn-sm btn-primary" data-pay="${p.appointment_id}" data-payment-id="${p.payment_id}"><i class="fas fa-credit-card me-1"></i>Pay</button>`
          : `<button class="btn btn-sm btn-outline-secondary" data-receipt="${p.appointment_id}"><i class="fas fa-receipt me-1"></i>Receipt</button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.payment_date ? p.payment_date.slice(0,10) : p.appointment_date || '-'}</td>
          <td>Consultation${p.doctor_name ? ` with ${p.doctor_name}` : ''}</td>
          <td>Due: ${dueStr}</td>
          <td>₱${amount.toFixed(2)}</td>
          <td><span class="status-badge ${status==='paid'?'status--confirmed':(isOverdue(p)?'status--cancelled':'status--unpaid')}">${p.status_name || 'Unknown'}</span>${overdueTag}</td>
          <td>${actions}</td>`;
        tableBody.appendChild(tr);
      });

      totalPaidEl.textContent = `₱${paidTotal.toFixed(2)}`;
      totalPendingEl.textContent = `₱${pendingTotal.toFixed(2)}`;
      totalOverdueEl.textContent = `₱${overdueTotal.toFixed(2)}`;
      thisMonthEl.textContent = `₱${monthTotal.toFixed(2)}`;
    } catch (e) {
      console.error('Failed to load payments', e);
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load payments</td></tr>';
    }
  }

  async function downloadReceiptPng(appointmentId) {
    try {
      const res = await axios.get(`${prescriptionReceiptApi}?operation=get_receipt_by_appointment&appointment_id=${appointmentId}`);
      if (!res.data?.success) { Swal.fire('Error', res.data?.message || 'No receipt'); return; }
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.innerHTML = res.data.html || `<pre>${JSON.stringify(res.data.receipt, null, 2)}</pre>`;
      document.body.appendChild(container);
      const canvas = await html2canvas(container);
      const link = document.createElement('a');
      link.download = `receipt_${appointmentId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(container);
    } catch (e) {
      console.error('Failed to download receipt png', e);
      Swal.fire('Error', 'Failed to download receipt', 'error');
    }
  }

  document.getElementById('paymentsTableBody')?.addEventListener('click', async (e) => {
    const payBtn = e.target.closest('[data-pay]');
    if (payBtn) {
      // Same flow as prescriptions: choose method and account, then mark Paid
      try {
        const methodsResp = await axios.get(`${baseApiUrl}/payment_methods.php?operation=get_all`);
        const methods = (methodsResp.data.success ? methodsResp.data.data : []) || [];
        if (!methods.length) { Swal.fire('Error', 'No online payment methods available', 'error'); return; }
        const optionsHtml = methods.map(m => `<option value="${m.method_name}">${m.method_name}</option>`).join('');
        const { value: formValues } = await Swal.fire({
          title: 'Pay online',
          html: `<div class="mb-2 text-start">Select payment method</div>`+
                `<select id="swal-method" class="form-select mb-3">${optionsHtml}</select>`+
                `<div class="mb-2 text-start">Account / Reference (e.g., GCash number)</div>`+
                `<input id="swal-acct" class="form-control" placeholder="09xxxxxxxxx or account ref" />`,
          focusConfirm: false,
          showCancelButton: true,
          preConfirm: () => {
            const method = document.getElementById('swal-method').value;
            const acct = document.getElementById('swal-acct').value.trim();
            if (!method) { Swal.showValidationMessage('Please choose a payment method'); return false; }
            return { method, acct };
          }
        });
        if (!formValues) return;

        const prof = await axios.get(`${baseApiUrl}/user.php?operation=profile&user_id=${user.id}`);
        const patientId = prof.data?.context?.patient_id;
        if (!patientId) { Swal.fire('Error', 'Patient not found', 'error'); return; }
        const apptId = payBtn.getAttribute('data-pay');
        const paymentId = payBtn.getAttribute('data-payment-id');

        const payload = new URLSearchParams();
        payload.append('operation', 'markAppointmentPaid');
        payload.append('json', JSON.stringify({ appointment_id: apptId, payment_id: paymentId, patient_id: patientId, method_name: formValues.method, payer_account: formValues.acct }));
        const resp = await axios.post(paymentsApi, payload);
        if (resp.data?.success) {
          Swal.fire('Paid', 'Payment completed successfully.', 'success');
          await loadPayments();
        } else {
          Swal.fire('Error', resp.data?.message || 'Payment failed', 'error');
        }
      } catch (err) {
        console.error('Payment failed', err);
        Swal.fire('Error', 'Payment request failed', 'error');
      }
      return;
    }
    const receiptBtn = e.target.closest('[data-receipt]');
    if (receiptBtn) {
      const apptId = receiptBtn.getAttribute('data-receipt');
      viewReceipt(apptId);
    }
  });

  loadPayments();

  async function viewReceipt(appointmentId) {
    try {
      const res = await axios.get(`${prescriptionReceiptApi}?operation=get_receipt_by_appointment&appointment_id=${appointmentId}`);
      if (!res.data?.success) { Swal.fire('Error', res.data?.message || 'No receipt'); return; }
      const html = res.data.html || `<pre class="text-start">${JSON.stringify(res.data.receipt, null, 2)}</pre>`;
      Swal.fire({
        title: 'Prescription Receipt',
        html,
        width: 900,
        showCancelButton: true,
        confirmButtonText: 'Download PNG',
        cancelButtonText: 'Close'
      }).then(r => { if (r.isConfirmed) downloadReceiptPng(appointmentId); });
    } catch (e) {
      Swal.fire('Error', 'Failed to load receipt', 'error');
    }
  }
});
