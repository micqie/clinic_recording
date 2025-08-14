document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const paymentsApi = `${baseApiUrl}/payments.php`;

  const tbody = document.getElementById("paymentsTableBody");
  const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
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
          <button class="btn btn-sm btn-outline-primary" data-edit="${r.appointment_id}">Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener('click', (e) => {
    const aid = e.target.getAttribute('data-edit');
    if (aid) {
      document.getElementById('payment_appointment_id').value = aid;
      document.getElementById('payment_amount').value = '';
      document.getElementById('payment_method').value = '';
      document.getElementById('payment_status').value = 'Unpaid';
      paymentModal.show();
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

  loadPayments();
});


