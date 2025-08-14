document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const patientsApi = `${baseApiUrl}/patients.php`;
  const apptApi = `${baseApiUrl}/appointments.php`;
  const paymentsApi = `${baseApiUrl}/payments.php`;
  const medsApi = `${baseApiUrl}/medicines.php`;

  const elTotalPatients = document.getElementById('totalPatientsCount');
  const elAppointments = document.getElementById('appointmentsCount');
  const elPendingPayments = document.getElementById('pendingPaymentsAmount');
  const elLowStock = document.getElementById('lowStockCount');

  try {
    const [pRes, aRes, payRes, mRes] = await Promise.all([
      axios.get(`${patientsApi}?operation=get_all`),
      axios.get(`${apptApi}?operation=get_all&limit=500`),
      axios.get(`${paymentsApi}?operation=get_all`),
      axios.get(`${medsApi}?operation=get_all`),
    ]);

    // Total Patients
    const patients = (pRes.data && pRes.data.data) || [];
    elTotalPatients && (elTotalPatients.textContent = patients.length.toString());

    // Appointments today (exclude Cancelled)
    const today = new Date().toISOString().slice(0, 10);
    const appointments = (aRes.data && aRes.data.data) || [];
    const todaysAppointments = appointments.filter(r => r.appointment_date === today && (r.appointment_status || '').toLowerCase() !== 'cancelled');
    elAppointments && (elAppointments.textContent = todaysAppointments.length.toString());

    // Pending payments amount (sum known unpaid amounts)
    const paymentsRows = (payRes.data && payRes.data.data) || [];
    let unpaidSum = 0;
    let unpaidCount = 0;
    paymentsRows.forEach(r => {
      const status = (r.payment_status || 'Unpaid').toLowerCase();
      if (status === 'unpaid') {
        unpaidCount += 1;
        const amt = parseFloat(r.amount);
        if (!isNaN(amt)) unpaidSum += amt;
      }
    });
    if (elPendingPayments) {
      // Show as currency-like if any amount available; fallback to count
      if (unpaidSum > 0) {
        elPendingPayments.textContent = `₱${unpaidSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      } else {
        elPendingPayments.textContent = unpaidCount.toString();
      }
    }

    // Low stock medicines (stock <= 10)
    const medicines = mRes.data || [];
    const lowStock = medicines.filter(m => parseInt(m.stock, 10) <= 10).length;
    elLowStock && (elLowStock.textContent = lowStock.toString());
  } catch (err) {
    console.error('Dashboard load failed', err);
  }
});


