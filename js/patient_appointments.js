document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
  const apptApi = `${baseApiUrl}/appointments.php`;
  const userApi = `${baseApiUrl}/user.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
  const patientId = prof.data?.context?.patient_id;
  if (!patientId) { Swal.fire('Error', 'No patient profile found.', 'error'); return; }

  const requestDate = document.getElementById('requestDate');
  const requestReason = document.getElementById('requestReason');
  const otherReasonField = document.getElementById('otherReasonField');
  const otherReasonText = document.getElementById('otherReasonText');
  const requestNotes = document.getElementById('requestNotes');
  const requestBtn = document.getElementById('requestBtn');
  const list = document.getElementById('appt_list');

  // Load appointment reasons after DOM elements are initialized
  await loadAppointmentReasons();

  // Add event listener for reason dropdown to show/hide "Other" field
  requestReason?.addEventListener('change', () => {
    if (requestReason.value === '15') { // Assuming 'Other' has ID 15
      otherReasonField.style.display = 'block';
      otherReasonText.required = true;
    } else {
      otherReasonField.style.display = 'none';
      otherReasonText.required = false;
      otherReasonText.value = '';
    }
  });

  async function refreshList() {
    const resp = await axios.get(`${apptApi}?operation=get_by_patient&patient_id=${patientId}`);
    const appts = resp.data.data || [];
    list.innerHTML = '';
    appts.forEach(a => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      // Format the reason display
      let reasonDisplay = a.reason_name || '-';
      let notesDisplay = '';

      if (a.appointment_notes && a.appointment_notes.startsWith('Reason:')) {
        const lines = a.appointment_notes.split('\n\n');
        const customReason = lines[0].replace('Reason: ', '');
        reasonDisplay = `Other: ${customReason}`;
        if (lines.length > 1) {
          notesDisplay = lines.slice(1).join('\n\n');
        }
      } else if (a.appointment_notes) {
        notesDisplay = a.appointment_notes;
      }

      li.innerHTML = `<div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="fw-semibold">${a.appointment_date}</div>
          <div class="small text-muted mb-1">Status: ${a.appointment_status}</div>
          <div class="small text-primary">Reason: ${reasonDisplay}</div>
          ${notesDisplay ? `<div class="small text-muted">Notes: ${notesDisplay}</div>` : ''}
        </div>
        <div class="text-end ms-3">
          <div>${a.doctor_name || '-'}</div>
          <div class="small">Queue: ${a.queue_number || '-'}</div>
        </div>
      </div>`;
      list.appendChild(li);
    });
  }

  async function loadAppointmentReasons() {
    try {
      const resp = await axios.get(`${baseApiUrl}/appointment_reasons.php?operation=listReasons`);
      if (resp.data.success) {
        requestReason.innerHTML = '<option value="">Select a reason...</option>';
        resp.data.data.forEach(reason => {
          const opt = document.createElement('option');
          opt.value = reason.reason_id;
          opt.textContent = reason.reason_name;
          requestReason.appendChild(opt);
        });
      }
    } catch (error) {
      console.error('Failed to load appointment reasons:', error);
    }
  }

  async function checkDateCapacity(dateStr) {
    const r = await axios.get(`${apptApi}?operation=get_booked_count&date=${dateStr}`);
    return (r.data?.count ?? 0) < 15;
  }

  requestBtn?.addEventListener('click', async () => {
    const dateStr = requestDate.value;
    const reasonId = requestReason.value;
    const otherReason = otherReasonText.value.trim();
    const notes = requestNotes.value.trim();

    if (!dateStr) { Swal.fire('Error', 'Please select a date.', 'error'); return; }
    if (!reasonId) { Swal.fire('Error', 'Please select a reason for your appointment.', 'error'); return; }

    // Validate "Other" reason field if selected
    if (reasonId === '15' && !otherReason) {
      Swal.fire('Error', 'Please specify your reason when selecting "Other".', 'error');
      return;
    }

    const ok = await checkDateCapacity(dateStr);
    if (!ok) { Swal.fire('Info', 'Fully Booked', 'info'); return; }

    const payload = new FormData();
    payload.append('operation', 'request');
    payload.append('json', JSON.stringify({
      patient_id: patientId,
      appointment_date: dateStr,
      appointment_reason_id: reasonId,
      appointment_notes: notes || null,
      other_reason_text: reasonId === '15' ? otherReason : null
    }));

    const resp = await axios.post(apptApi, payload);
        if (resp.data.success) {
      // Clear form
      requestDate.value = '';
      requestReason.value = '';
      otherReasonText.value = '';
      otherReasonField.style.display = 'none';
      otherReasonText.required = false;
      requestNotes.value = '';

      await refreshList();
      Swal.fire('Requested', 'Appointment requested as Pending', 'success');
    } else {
      Swal.fire('Error', resp.data.message || 'Request failed', 'error');
    }
  });

  // Disable fully booked dates dynamically when changed
  requestDate?.addEventListener('change', async () => {
    if (!requestDate.value) return;

    // Check if date is in the past
    const selectedDate = new Date(requestDate.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Swal.fire('Error', 'Cannot book appointments for past dates. Please select a future date.', 'error');
      requestDate.value = '';
      return;
    }

    const ok = await checkDateCapacity(requestDate.value);
    if (!ok) {
      Swal.fire('Info', 'Date is fully booked (15/15). Please choose another date.', 'info');
      requestDate.value = '';
    }
  });

  refreshList();
});
