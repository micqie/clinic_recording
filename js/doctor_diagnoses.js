document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const userApi = `${baseApiUrl}/user.php`;
  const apptApi = `${baseApiUrl}/appointments.php`;
  const diagApi = `${baseApiUrl}/diagnoses.php`;
  const lookupApi = `${baseApiUrl}/diagnosis_lookup.php`;

  // Auth check
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id || user.role !== 'doctor') { window.location.href = '../../index.html'; return; }

  // Elements
  const form = document.getElementById('addDiagnosisForm');
  const patientSelect = document.getElementById('patient_id');
  const apptSelect = document.getElementById('appointment_id');
  const conditionSelect = document.getElementById('condition_id');
  const severitySelect = document.getElementById('severity');
  const notesInput = document.getElementById('notes');
  const quickAddBtn = document.getElementById('quickAddCondition');
  const tableBody = document.getElementById('diagnosesTableBody');

  let doctorId = null;
  async function getDoctorId() {
    if (doctorId) return doctorId;
    try {
      const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
      doctorId = prof.data?.context?.doctor_id;
      return doctorId;
    } catch {
      return null;
    }
  }

  async function loadPatientsAndAppointments() {
    const docId = await getDoctorId();
    if (!docId) { Swal.fire('Error', 'No doctor profile found.', 'error'); return; }
    // Load appointments by doctor to derive patient + appointment options
    const resp = await axios.get(`${apptApi}?operation=get_by_doctor&doctor_id=${docId}`);
    const appts = resp.data?.data || [];

    // Build patient map
    const patientIdToName = new Map();
    appts.forEach(a => patientIdToName.set(a.patient_id, a.patient_name));

    patientSelect.innerHTML = '<option value="">Select patient</option>';
    for (const [pid, name] of patientIdToName.entries()) {
      patientSelect.insertAdjacentHTML('beforeend', `<option value="${pid}">${name}</option>`);
    }

    // If preselected from patients page
    const selPid = sessionStorage.getItem('selectedPatientId');
    const selAppt = sessionStorage.getItem('selectedAppointmentId');
    if (selPid) patientSelect.value = selPid;
    if (selPid || selAppt) refreshAppointmentsForPatient(appts);
    if (selAppt) apptSelect.value = selAppt;
  }

  function refreshAppointmentsForPatient(allAppts) {
    const pid = patientSelect.value;
    const list = (allAppts || []).filter(a => String(a.patient_id) === String(pid));
    apptSelect.innerHTML = '<option value="">Select appointment</option>';
    list.forEach(a => {
      apptSelect.insertAdjacentHTML('beforeend', `<option value="${a.appointment_id}">${a.appointment_date} (Queue #${a.queue_number ?? '-'})</option>`);
    });
  }

  async function loadLookup() {
    const res = await axios.get(`${lookupApi}?operation=getAll`);
    const items = res.data?.conditions || [];
    conditionSelect.innerHTML = '<option value="">Select condition</option>';
    items.forEach(i => conditionSelect.insertAdjacentHTML('beforeend', `<option value="${i.condition_name}">${i.condition_name}</option>`));
  }

  async function loadRecentDiagnoses() {
    const docId = await getDoctorId();
    const res = await axios.get(`${diagApi}?operation=getByDoctor&doctor_id=${docId}`);
    const list = res.data?.diagnoses || res.data?.data || [];
    tableBody.innerHTML = '';
    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No diagnoses</td></tr>';
      return;
    }
    list.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.patient_name || ''}</td>
        <td>${d.condition_name || ''}</td>
        <td>${d.severity || ''}</td>
        <td>${d.date_diagnosed || ''}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  patientSelect?.addEventListener('change', async () => {
    // reload appts for selected patient
    const docId = await getDoctorId();
    const resp = await axios.get(`${apptApi}?operation=get_by_doctor&doctor_id=${docId}`);
    refreshAppointmentsForPatient(resp.data?.data || []);
  });

  quickAddBtn?.addEventListener('click', async () => {
    const { value: name } = await Swal.fire({
      title: 'Add Condition',
      input: 'text',
      inputLabel: 'Condition name',
      inputPlaceholder: 'e.g., Cough',
      showCancelButton: true
    });
    if (!name) return;
    const payload = new FormData();
    payload.append('operation', 'add');
    payload.append('json', JSON.stringify({ condition_name: name }));
    const res = await axios.post(lookupApi, payload);
    if (res.data.success) {
      await loadLookup();
      conditionSelect.value = name;
      Swal.fire('Added', 'Condition added.', 'success');
    } else {
      Swal.fire('Error', res.data.message || 'Failed to add condition', 'error');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    form.classList.remove('was-validated');

    const json = JSON.stringify({
      appointment_id: apptSelect.value,
      doctor_id: await getDoctorId(),
      patient_id: patientSelect.value,
      condition_name: conditionSelect.value,
      date_diagnosed: new Date().toISOString().slice(0,10),
      severity: severitySelect.value,
      notes: notesInput.value || null
    });

    const fd = new FormData();
    fd.append('operation', 'add');
    fd.append('json', json);
    try {
      const res = await axios.post(diagApi, fd);
      if (res.data.success) {
        Swal.fire('Success', res.data.message, 'success');
        form.reset();
        await loadRecentDiagnoses();
      } else {
        Swal.fire('Error', res.data.message || 'Failed to add diagnosis', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Request failed', 'error');
    }
  });

  // init
  await Promise.all([loadPatientsAndAppointments(), loadLookup()]);
  await loadRecentDiagnoses();
});
