document.addEventListener('DOMContentLoaded', async () => {
  const storedBase = sessionStorage.getItem('baseAPIUrl') || sessionStorage.getItem('baseApiUrl') || '';
  const origin = window.location.origin;
  const candidates = [
    storedBase,
    `${origin}/clinic_recording/api`,
    `${origin}/api`,
    `${window.location.pathname.includes('/clinic_recording/') ? '/clinic_recording/api' : '/api'}`
  ].filter(Boolean);

  async function pickAliveBaseUrl(urls) {
    for (const u of urls) {
      try {
        const testUrl = `${u}/appointment_reasons.php?operation=listReasons`;
        const res = await axios.get(testUrl, { timeout: 5000 });
        if (res?.data) return u;
      } catch (_) {}
    }
    return urls[0];
  }

  const baseApiUrl = await pickAliveBaseUrl(candidates);
  try { if (baseApiUrl) sessionStorage.setItem('baseAPIUrl', baseApiUrl); } catch (_) {}
  const apptApi = `${baseApiUrl}/appointments.php`;
  const userApi = `${baseApiUrl}/user.php`;

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!user?.id) { window.location.href = '/clinic_recording/index.html'; return; }

  let patientId = null;
  try {
    const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`, { timeout: 8000 });
    patientId = prof.data?.context?.patient_id;
  } catch (e) {
    console.error('Failed to load profile', e?.response?.data || e);
  }
  if (!patientId) { Swal.fire('Error', 'No patient profile found or API unreachable.', 'error'); return; }

  const requestDate = document.getElementById('requestDate');
  const requestReason = document.getElementById('requestReason');
  const otherReasonField = document.getElementById('otherReasonField');
  const otherReasonText = document.getElementById('otherReasonText');
  const requestNotes = document.getElementById('requestNotes');
  const requestBtn = document.getElementById('requestBtn');
  const list = document.getElementById('appt_list');

  // Track dynamic id for "Other" reason (if present)
  let otherReasonId = null;

  // Load appointment reasons after DOM elements are initialized
  let reasonsLoaded = false;
  try {
    await loadAppointmentReasons();
    reasonsLoaded = true;
  } catch (_) {}

  // Add event listener for reason dropdown to show/hide "Other" field
  requestReason?.addEventListener('change', () => {
    const isOther = otherReasonId
      ? requestReason.value === otherReasonId
      : (requestReason.options[requestReason.selectedIndex]?.text || '').trim().toLowerCase() === 'other';
    if (isOther) {
      otherReasonField.style.display = 'block';
      otherReasonText.required = true;
    } else {
      otherReasonField.style.display = 'none';
      otherReasonText.required = false;
      otherReasonText.value = '';
    }
  });

  async function refreshList() {
    try {
      const resp = await axios.get(`${apptApi}?operation=get_by_patient&patient_id=${patientId}`);
      const appts = resp.data.data || [];
      list.innerHTML = '';

      if (appts.length === 0) {
        document.getElementById('noAppointments').style.display = 'block';
        return;
      }

      document.getElementById('noAppointments').style.display = 'none';

      appts.forEach(a => {
        const card = document.createElement('div');
        card.className = 'appointment-card card';

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

        // Get status class for styling
        const statusClass = getStatusClass(a.appointment_status);
        const statusIcon = getStatusIcon(a.appointment_status);

        card.innerHTML = `
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div class="flex-grow-1">
                <h6 class="card-title mb-1">
                  <i class="fas fa-calendar-alt me-2 text-primary"></i>
                  ${formatDate(a.appointment_date)}
                </h6>
                <span class="status-badge ${statusClass}">
                  <i class="${statusIcon} me-1"></i>${a.appointment_status}
                </span>
              </div>
              <div class="text-end">
                <div class="fw-semibold text-secondary">${a.doctor_name || 'TBD'}</div>
                <small class="text-muted">Queue: ${a.queue_number || '-'}</small>
              </div>
            </div>

            <div class="row g-2">
              <div class="col-12">
                <div class="d-flex align-items-center mb-2">
                  <i class="fas fa-stethoscope me-2 text-info"></i>
                  <span class="text-muted">Reason:</span>
                  <span class="ms-2 fw-semibold text-primary">${reasonDisplay}</span>
                </div>
                ${notesDisplay ? `
                <div class="d-flex align-items-start">
                  <i class="fas fa-sticky-note me-2 text-warning mt-1"></i>
                  <div>
                    <span class="text-muted">Notes:</span>
                    <div class="ms-2 text-dark">${notesDisplay}</div>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
        list.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to load appointments list', err?.response?.data || err);
      if (list) {
        list.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load appointments. Please try again.</div>';
      }
    }
  }

  // Helper function to get status class
  function getStatusClass(status) {
    const statusMap = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled',
      'in consultation': 'status-in-consultation',
      'in_consultation': 'status-in-consultation'
    };
    return statusMap[status?.toLowerCase()] || 'status-pending';
  }

  // Helper function to get status icon
  function getStatusIcon(status) {
    const iconMap = {
      'pending': 'fas fa-clock',
      'confirmed': 'fas fa-check-circle',
      'completed': 'fas fa-check-double',
      'cancelled': 'fas fa-times-circle',
      'in consultation': 'fas fa-user-md',
      'in_consultation': 'fas fa-user-md'
    };
    return iconMap[status?.toLowerCase()] || 'fas fa-clock';
  }

  // Helper function to format date
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
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
          if ((reason.reason_name || '').trim().toLowerCase() === 'other') {
            otherReasonId = String(reason.reason_id);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load appointment reasons:', error);
    }
  }

  async function checkDateCapacity(dateStr) {
    try {
      const r = await axios.get(`${apptApi}?operation=get_booked_count&date=${dateStr}`);
      return (r.data?.count ?? 0) < 15;
    } catch (err) {
      console.error('Failed to check date capacity', err?.response?.data || err);
      return true; // fail-open so user can attempt; server will enforce limits
    }
  }

  requestBtn?.addEventListener('click', async () => {
    if (!reasonsLoaded) { Swal.fire('Error', 'Please wait for reasons to load.', 'error'); return; }
    const dateStr = requestDate.value;
    const reasonId = requestReason.value;
    const otherReason = otherReasonText.value.trim();
    const notes = requestNotes.value.trim();

    if (!dateStr) { Swal.fire('Error', 'Please select a date.', 'error'); return; }
    // Reason optional to support legacy DBs; warn if missing
    if (!reasonId && !otherReason) {
      // allow submit but inform user
      console.warn('Submitting without appointment reason (legacy mode)');
    }

    // Validate "Other" reason field if selected
    const isOtherSelected = otherReasonId
      ? reasonId === otherReasonId
      : (requestReason.options[requestReason.selectedIndex]?.text || '').trim().toLowerCase() === 'other';
    if (isOtherSelected && !otherReason) {
      Swal.fire('Error', 'Please specify your reason when selecting "Other".', 'error');
      return;
    }

    const ok = await checkDateCapacity(dateStr);
    if (!ok) { Swal.fire('Info', 'Fully Booked', 'info'); return; }

    const payload = new URLSearchParams();
    payload.append('operation', 'request');
    payload.append('json', JSON.stringify({
      patient_id: patientId,
      appointment_date: dateStr,
      appointment_reason_id: reasonId,
      appointment_notes: notes || null,
      other_reason_text: (
        otherReasonId ? reasonId === otherReasonId
        : (requestReason.options[requestReason.selectedIndex]?.text || '').trim().toLowerCase() === 'other'
      ) ? otherReason : null
    }));

    try {
      console.debug('Submitting appointment to:', apptApi);
      const resp = await axios.post(apptApi, payload, { timeout: 10000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (resp.data?.success) {
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
        const msg = resp.data?.message || 'Request failed';
        Swal.fire('Error', msg, 'error');
      }
    } catch (error) {
      console.error('Appointment request failed (POST)', error?.response?.data || error);
      // Fallback: try GET if POST failed with no server response
      if (!error?.response) {
        try {
          const url = `${apptApi}?operation=request&json=${encodeURIComponent(payload.get('json'))}`;
          console.debug('Retrying appointment via GET:', url);
          const resp2 = await axios.get(url, { timeout: 10000 });
          if (resp2.data?.success) {
            requestDate.value = '';
            requestReason.value = '';
            otherReasonText.value = '';
            otherReasonField.style.display = 'none';
            otherReasonText.required = false;
            requestNotes.value = '';

            await refreshList();
            Swal.fire('Requested', 'Appointment requested as Pending', 'success');
            return;
          }
          const msg2 = resp2.data?.message || 'Request failed';
          Swal.fire('Error', msg2, 'error');
          return;
        } catch (e2) {
          console.error('Appointment request failed (GET fallback)', e2?.response?.data || e2);
        }
      }
      const msg = error?.response?.data?.message || error?.message || 'Request failed';
      Swal.fire('Error', msg, 'error');
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

  try { await refreshList(); } catch (e) { console.error('Initial list load failed', e?.response?.data || e); }
});
