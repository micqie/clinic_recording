document.addEventListener('DOMContentLoaded', () => {
    console.log('Patient Prescriptions JS v3.0 - Clean layout loaded');
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const prescriptionReceiptApi = `${baseApiUrl}/prescription_receipt.php`;
    const integratedConsultationApi = `${baseApiUrl}/integrated_consultation.php`;
    const userApi = `${baseApiUrl}/user.php`;

    // Check if user is logged in and is a patient
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== 'patient') {
        window.location.href = '../../index.html';
        return;
    }

    let patientId = null;
    let patientProfile = null;
    let currentReceipt = null;

    // Get patient_id from user profile
    async function getPatientId() {
        if (patientId) return patientId;
        try {
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            patientProfile = prof.data?.context || null;
            patientId = patientProfile?.patient_id || null;
            return patientId;
        } catch (e) {
            console.error('Failed to get patient profile:', e);
            return null;
        }
    }

    async function getPatientProfile() {
        if (patientProfile) return patientProfile;
        const merged = {};
        try {
            // Try 1: user profile
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            const ctx = prof.data || {};
            try { console.log('[RX] user profile response:', JSON.stringify(ctx, null, 2)); } catch (_) { console.log('[RX] user profile response (raw object)', ctx); }
            const p1 = ctx?.context?.patient || ctx?.patient || null;
            if (p1) {
                merged.patient_id = ctx?.context?.patient_id || p1.id || p1.patient_id || merged.patient_id;
                merged.birthdate = p1.birthdate || p1.date_of_birth || p1.dob || p1.birth_date || merged.birthdate;
                merged.age = p1.age || merged.age;
                const parts = [p1.address, p1.address_line, p1.address1, p1.address2, p1.street, p1.barangay, p1.municipality, p1.city, p1.province, p1.zipcode, p1.postal_code].filter(Boolean);
                if (parts.length) merged.address = parts.join(', ');
            }
        } catch (_) {}

        try {
            // Try 2: patients by user_id
            const r2 = await axios.get(`${baseApiUrl}/patients.php?operation=get_patient&user_id=${user.id}`);
            try { console.log('[RX] patients by user_id response:', JSON.stringify(r2.data, null, 2)); } catch (_) { console.log('[RX] patients by user_id response (raw object)', r2.data); }
            const p2 = r2.data?.patient || r2.data?.context?.patient || (Array.isArray(r2.data?.data) ? r2.data.data[0] : null) || null;
            if (p2) {
                merged.patient_id = merged.patient_id || p2.id || p2.patient_id;
                merged.birthdate = merged.birthdate || p2.birthdate || p2.date_of_birth || p2.dob || p2.birth_date;
                merged.age = merged.age || p2.age;
                const parts2 = [p2.address, p2.address_line, p2.address1, p2.address2, p2.street, p2.barangay, p2.municipality, p2.city, p2.province, p2.zipcode, p2.postal_code].filter(Boolean);
                if (!merged.address && parts2.length) merged.address = parts2.join(', ');
            }
        } catch (_) {}

        // Save/cache
        patientProfile = merged.patient_id ? merged : (Object.keys(merged).length ? merged : null);
        patientId = patientProfile?.patient_id || patientId || null;
        return patientProfile;
    }

    function calculateAgeFromBirthdate(birthdateStr) {
        if (!birthdateStr) return '';
        const dob = new Date(birthdateStr);
        if (isNaN(dob)) return '';
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age.toString();
    }

    // Load prescriptions for the patient
    async function loadPrescriptions() {
        try {
            const patId = await getPatientId();
            if (!patId) {
                console.error('No patient_id found');
                return;
            }

            const res = await axios.get(`${integratedConsultationApi}?operation=get_by_patient&patient_id=${patId}`);
            const prescriptionsTableBody = document.getElementById('prescriptionsTableBody');

            if (!prescriptionsTableBody) return;

            prescriptionsTableBody.innerHTML = '';

            if (res.data.success && Array.isArray(res.data.data)) {
                console.log('Loading prescriptions:', res.data.data.length, 'items');
                res.data.data.forEach(consultation => {
                    console.log('Creating row for consultation ID:', consultation.consultation_id);
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="fw-semibold">${consultation.appointment_date}</div>
                            <small class="text-muted">Q#${consultation.queue_number || 'N/A'}</small>
                        </td>
                        <td>
                            <div class="fw-semibold">${consultation.doctor_name}</div>
                            <small class="text-muted">${consultation.specialization_name || 'General'}</small>
                        </td>
                        <td>
                            <span class="text-truncate d-inline-block" style="max-width: 200px;" title="${consultation.diagnosis}">
                                ${consultation.diagnosis}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary view-details-btn" data-consultation-id="${consultation.consultation_id}" title="View Prescription Details">
                                    <i class="fas fa-eye me-1"></i>View Details
                                </button>
                            </div>
                        </td>
                    `;
                    prescriptionsTableBody.appendChild(tr);
                });
            } else {
                prescriptionsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No prescriptions found</td></tr>';
            }
        } catch (e) {
            console.error('Failed to load prescriptions:', e);
            const prescriptionsTableBody = document.getElementById('prescriptionsTableBody');
            if (prescriptionsTableBody) {
                prescriptionsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Failed to load prescriptions</td></tr>';
            }
        }
    }

    // View prescription details
    async function viewPrescriptionDetails(consultationId) {
        console.log('viewPrescriptionDetails called with ID:', consultationId);
        console.log('Using NEW card-based layout for prescriptions');
        try {
            const res = await axios.get(`${integratedConsultationApi}?operation=get_details&consultation_id=${consultationId}`);
            if (res.data.success) {
                const data = res.data;
                let profile = await getPatientProfile();
                // If still missing, try fetching by patient_id from this consultation
                try {
                    if ((!profile?.address || !profile?.birthdate) && (data?.consultation?.patient_id || data?.consultation?.patient?.id)) {
                        const pid = data.consultation.patient_id || data.consultation.patient?.id;
                        if (pid) {
                            const pResp = await axios.get(`${baseApiUrl}/patients.php?operation=get_patient&patient_id=${pid}`);
                            try { console.log('[RX] patients by patient_id response:', JSON.stringify(pResp.data, null, 2)); } catch (_) { console.log('[RX] patients by patient_id response (raw object)', pResp.data); }
                            const p = pResp.data?.patient || pResp.data?.context?.patient || (Array.isArray(pResp.data?.data) ? pResp.data.data[0] : null) || null;
                            if (p) {
                                const addressParts3 = [p.address, p.address_line, p.address1, p.address2, p.street, p.barangay, p.municipality, p.city, p.province, p.zipcode, p.postal_code].filter(Boolean);
                                profile = {
                                    ...(profile || {}),
                                    address: addressParts3.join(', ') || profile?.address,
                                    birthdate: p.birthdate || p.date_of_birth || p.dob || p.birth_date || profile?.birthdate,
                                    age: p.age || profile?.age
                                };
                            }
                        }
                    }
                } catch (e3) {}
                try { console.log('[RX] merged patient profile used:', JSON.stringify(profile, null, 2)); } catch (_) { console.log('[RX] merged patient profile used (raw object):', profile); }
                const addressStr = profile?.address || profile?.patient?.address || 'N/A';
                const birth = profile?.birthdate || profile?.patient?.birthdate || profile?.patient?.date_of_birth || profile?.patient?.dob || null;
                const ageStr = profile?.age ? String(profile.age) : (calculateAgeFromBirthdate(birth) || 'N/A');
                console.log('[RX] derived address and age:', addressStr, ageStr);

                // Calculate total cost
                const prescriptionCost = calculatePrescriptionSubtotal(data.prescriptions || []);
                const labCost = calculateLabSubtotal(data.lab_requests || []);
                const totalCost = prescriptionCost + labCost;

                let prescriptionsHtml = '';
                if (data.prescriptions && data.prescriptions.length > 0) {
                    console.log('Generating text-only RX layout for', data.prescriptions.length, 'prescriptions');
                    prescriptionsHtml = `
                        <div class="mb-4">
                            <div class="d-flex align-items-center mb-2">
                                <div class="me-2 display-6" style="line-height:1">℞</div>
                                <h6 class="text-primary mb-0"><i class="fas fa-pills me-2"></i>Prescribed Medications</h6>
                            </div>
                    `;
                    data.prescriptions.forEach((p, index) => {
                        const unitPrice = parseFloat(p.price || 0);
                        const quantity = parseInt(p.quantity || 1);
                        const cost = unitPrice * quantity;
                        const strength = p.strength || p.dosage || '';
                        const form = p.form || '';
                        const packagingUnit = p.packaging_unit || p.packaging_name || 'unit';
                        const sig = p.sig || p.frequency || p.instructions || '';

                        prescriptionsHtml += `
                            <div class="mb-3">
                                <div class="fw-bold">${index + 1}. ${p.brand_name || p.generic_name}${strength ? ' ' + strength : ''}${form ? ' ' + form : ''}</div>
                                <div class="text-muted small">Generic: ${p.generic_name}${form ? ' • Form: ' + form : ''}${strength ? ' • Strength: ' + strength : ''}</div>
                                ${sig ? `<div><strong>Sig:</strong> ${sig}${p.duration ? `, for ${p.duration}` : ''}</div>` : ''}
                                <div><strong>Qty:</strong> ${quantity} ${packagingUnit} <span class="text-muted">|</span> <strong>Unit:</strong> ₱${unitPrice.toFixed(2)} <span class="text-muted">|</span> <strong>Total:</strong> ₱${cost.toFixed(2)}</div>
                                ${p.instructions && p.instructions !== sig ? `<div class="text-muted"><em>Instructions:</em> ${p.instructions}</div>` : ''}
                            </div>
                        `;
                    });
                    prescriptionsHtml += `
                        </div>
                    `;
                }

                let labRequestsHtml = '';
                if (data.lab_requests && data.lab_requests.length > 0) {
                    labRequestsHtml = `
                        <div class="mb-4">
                            <h6 class="text-info mb-3">
                                <i class="fas fa-flask me-2"></i>Laboratory Tests
                            </h6>
                    `;
                    data.lab_requests.forEach((l, index) => {
                        const price = parseFloat(l.price) || 0;
                        labRequestsHtml += `
                            <div class="card mb-3 border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-12 mb-3">
                                            <h6 class="fw-bold text-dark mb-2">Laboratory Test</h6>
                                            <div class="form-control-plaintext bg-light p-2 rounded">
                                                <strong>${l.type_name}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Test Name:</label>
                                            <div class="form-control-plaintext">${l.type_name}</div>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Description:</label>
                                            <div class="form-control-plaintext">${l.description || 'N/A'}</div>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Cost:</label>
                                            <div class="form-control-plaintext text-primary fw-bold">₱${price.toFixed(2)}</div>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label fw-bold">Request Notes:</label>
                                            <div class="form-control-plaintext">${l.request_text || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    labRequestsHtml += `
                        </div>
                    `;
                }

                // Update modal content
                const modalBody = document.getElementById('receiptModalBody');
                if (modalBody) {
                    console.log('Updating modal content with RX paper layout');
                    // Build handwritten-style medicine lines
                    const rxLines = (data.prescriptions || []).map(p => {
                        const strength = p.strength || p.dosage || '';
                        const form = p.form || '';
                        const sig = p.sig || p.frequency || p.instructions || '';
                        const dur = p.duration ? ` for ${p.duration}` : '';
                        const name = p.brand_name || p.generic_name || '';
                        return `${name}${strength ? ' ' + strength : ''}${form ? ' ' + form : ''} - ${sig}${dur}`;
                    }).join('\n');

                    modalBody.innerHTML = `
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Libre+Baskerville:wght@700&display=swap');
                            .rx-paper { background:#fff; padding:28px 28px 18px; border:1px solid #e0e0e0; border-radius:6px; box-shadow: 0 5px 18px rgba(0,0,0,0.06); position:relative; }
                            .rx-header { text-align:center; margin-bottom:14px; }
                            .rx-header .title { font-family:'Libre Baskerville', serif; font-weight:700; letter-spacing:0.5px; }
                            .rx-meta { font-size:13px; color:#6c757d; }
                            .rx-row { display:flex; justify-content:space-between; margin:8px 0 14px; font-size:15px; }
                            .rx-line { display:flex; gap:14px; }
                            .rx-underline { min-width:220px; border-bottom:1px solid #adb5bd; padding:0 6px; }
                            .rx-underline.small { min-width:80px; }
                            .rx-mark { font-size:48px; font-weight:700; font-family: Georgia, 'Times New Roman', Times, serif; line-height:1; margin:6px 0 10px; }
                            .rx-hand { white-space:pre-wrap; font-family:inherit; font-size:18px; line-height:1.6; color:#0d3a66; margin:6px 0 18px; }
                            .rx-notes { font-family:inherit; font-size:18px; color:#0d3a66; margin-top:6px; }
                            .rx-footer { margin-top:22px; display:flex; justify-content:flex-end; }
                            .rx-sign-wrap { width:260px; }
                            .rx-sign { height:38px; width:100%; border-bottom:1px solid #adb5bd; display:flex; align-items:flex-end; justify-content:center; }
                            .rx-sign-name { font-weight:600; color:#0d3a66; padding-bottom:2px; }
                            .rx-small { font-size:12px; color:#6c757d; text-align:center; }
                        </style>
                        <div class="rx-paper">
                            <div class="rx-header">
                                <div class="title">MCSTUFFIN's Clinic</div>
                                <div class="rx-meta">Prescription</div>
                            </div>
                            <div class="rx-row">
                                <div class="rx-line"><div>NAME</div><div class="rx-underline">${data.consultation.patient_name || ''}</div></div>
                                <div class="rx-line"><div>AGE</div><div class="rx-underline small">${ageStr || ''}</div></div>
                                <div class="rx-line"><div>DATE</div><div class="rx-underline small">${data.consultation.appointment_date || ''}</div></div>
                            </div>
                            <div class="rx-row" style="margin-top:-6px;">
                                <div class="rx-line"><div>ADDRESS</div><div class="rx-underline">${addressStr || ''}</div></div>
                            </div>
                            <div class="rx-mark">Rx</div>
                            <div class="rx-hand">${rxLines || ''}</div>
                            ${data.consultation.consultation_notes ? `<div class="rx-notes">Notes: ${data.consultation.consultation_notes}</div>` : ''}
                            <div class="rx-footer">
                                <div class="rx-sign-wrap">
                                    <div class="rx-sign"><span class="rx-sign-name">${data.consultation.doctor_name ? 'Dr. ' + data.consultation.doctor_name : ''}</span></div>
                                    <div class="rx-small">Doctor's signature</div>
                                </div>
                            </div>
                        </div>
                        ${labRequestsHtml}
                        <div class="mt-3 text-center small text-muted">Total Cost (for reference): ₱${totalCost.toFixed(2)}</div>
                    `;
                }

                // Show modal
                const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
                receiptModal.show();
            }
        } catch (e) {
            console.error('Failed to load prescription details:', e);
            Swal.fire('Error', 'Failed to load prescription details', 'error');
        }
    };

    // View prescription receipt
    window.viewReceipt = async function(consultationId) {
        try {
            console.log('Viewing receipt for consultation ID:', consultationId);

            const patId = await getPatientId();
            if (!patId) {
                Swal.fire('Error', 'Patient profile not found', 'error');
                return;
            }

            console.log('Patient ID:', patId);
            console.log('API URL:', `${prescriptionReceiptApi}?operation=get_receipt&consultation_id=${consultationId}&patient_id=${patId}`);

            const res = await axios.get(`${prescriptionReceiptApi}?operation=get_receipt&consultation_id=${consultationId}&patient_id=${patId}`);

            console.log('API Response:', res.data);

            if (res.data.success) {
                currentReceipt = res.data.receipt;
                displayReceipt(currentReceipt);
                const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
                receiptModal.show();
            } else {
                console.error('API returned error:', res.data);
                Swal.fire('Error', res.data.message || 'Failed to load receipt', 'error');
            }
        } catch (e) {
            console.error('Failed to load receipt:', e);
            console.error('Error response:', e.response?.data);
            console.error('Error status:', e.response?.status);
            Swal.fire('Error', 'Failed to load receipt: ' + (e.response?.data?.message || e.message), 'error');
        }
    };

    // Pay online for prescriptions (prescriptions subtotal only)
    window.payNow = async function(consultationId) {
        try {
            const patId = await getPatientId();
            if (!patId) {
                Swal.fire('Error', 'Patient profile not found', 'error');
                return;
            }

            // Load active payment methods
            const methodsResp = await axios.get(`${baseApiUrl}/payment_methods.php?operation=get_all`);
            const methods = (methodsResp.data.success ? methodsResp.data.data : []) || [];
            if (methods.length === 0) {
                Swal.fire('Error', 'No online payment methods available', 'error');
                return;
            }

            const optionsHtml = methods.map(m => `<option value="${m.method_name}">${m.method_name}</option>`).join('');
            const { value: formValues } = await Swal.fire({
                title: 'Pay online',
                html:
                  `<div class="mb-2 text-start">Select payment method</div>` +
                  `<select id="swal-method" class="form-select mb-3">${optionsHtml}</select>` +
                  `<div class="mb-2 text-start">Account / Reference (e.g., GCash number)</div>` +
                  `<input id="swal-acct" class="form-control" placeholder="09xxxxxxxxx or account ref" />`,
                focusConfirm: false,
                showCancelButton: true,
                preConfirm: () => {
                  const method = document.getElementById('swal-method').value;
                  const acct = document.getElementById('swal-acct').value.trim();
                  if (!method) {
                    Swal.showValidationMessage('Please choose a payment method');
                    return false;
                  }
                  return { method, acct };
                }
            });
            if (!formValues) return;

            const payload = new FormData();
            payload.append('operation', 'processOnlineConsultation');
            payload.append('json', JSON.stringify({ consultation_id: consultationId, patient_id: patId, method_name: formValues.method, payer_account: formValues.acct }));

            const resp = await axios.post(`${baseApiUrl}/payments.php`, payload);
            if (resp.data.success) {
                Swal.fire('Paid', `Payment successful. Amount: ₱${parseFloat(resp.data.amount || 0).toFixed(2)}`, 'success');
                refreshPrescriptions();
            } else {
                Swal.fire('Error', resp.data.message || 'Payment failed', 'error');
            }
        } catch (e) {
            console.error('Failed to process online payment:', e);
            Swal.fire('Error', 'Payment request failed', 'error');
        }
    };

    // Display receipt in modal
    function displayReceipt(receipt) {
        const receiptModalBody = document.getElementById('receiptModalBody');
        if (!receiptModalBody) return;

        let prescriptionsHtml = '';
        if (receipt.prescriptions && receipt.prescriptions.length > 0) {
            prescriptionsHtml = '<div class="table-responsive"><table class="table table-sm table-bordered align-middle">';
            prescriptionsHtml += '<thead class="table-light"><tr>' +
              '<th style="min-width:220px">Medicine</th>' +
              '<th>Strength</th>' +
              '<th>Form</th>' +
              '<th>Sig (Dosage & Frequency)</th>' +
              '<th>Duration</th>' +
              '<th>Qty</th>' +
              '<th>Unit Price</th>' +
              '<th>Total</th>' +
            '</tr></thead><tbody>';
            receipt.prescriptions.forEach(p => {
                const packagingName = p.packaging_name || p.packaging_unit || 'unit';
                const quantityDisplay = `${p.quantity || 1} ${packagingName}`;
                const strength = p.strength || p.dosage || '';
                const form = p.form || '';
                const sig = p.sig || p.frequency || p.instructions || '-';

                // Prefer backend-provided unit and total
                const unitPrice = parseFloat((p.unit_price !== undefined ? p.unit_price : p.price) || 0);
                const totalCost = parseFloat((p.total_cost !== undefined ? p.total_cost : 0) || 0) || (unitPrice * (parseInt(p.quantity || 1)));

                prescriptionsHtml += `<tr>
                    <td><strong>${p.brand_name || p.generic_name}</strong><div class="text-muted small">${p.generic_name || ''}</div></td>
                    <td>${strength || '-'}</td>
                    <td>${form || '-'}</td>
                    <td>${sig}</td>
                    <td>${p.duration || '-'}</td>
                    <td>${quantityDisplay}</td>
                    <td>₱${unitPrice.toFixed(2)}</td>
                    <td class="fw-bold">₱${totalCost.toFixed(2)}</td>
                </tr>`;
                if (p.instructions && p.instructions !== sig) {
                    prescriptionsHtml += `<tr>
                        <td colspan="8" class="text-muted"><em>Instructions:</em> ${p.instructions}</td>
                    </tr>`;
                }
            });
            prescriptionsHtml += '</tbody></table></div>';
        }

        let labRequestsHtml = '';
        if (receipt.lab_requests && receipt.lab_requests.length > 0) {
            labRequestsHtml = '<div class="table-responsive"><table class="table table-sm table-bordered">';
            labRequestsHtml += '<thead class="table-light"><tr><th>Lab Test</th><th>Description</th><th>Request Notes</th><th>Price</th></tr></thead><tbody>';
            receipt.lab_requests.forEach(l => {
                const price = parseFloat(l.price) || 0;
                labRequestsHtml += `<tr>
                    <td><strong>${l.type_name}</strong></td>
                    <td>${l.description || 'N/A'}</td>
                    <td>${l.request_text || 'N/A'}</td>
                    <td class="fw-bold">₱${price.toFixed(2)}</td>
                </tr>`;
            });
            labRequestsHtml += '</tbody></table></div>';
        }

        receiptModalBody.innerHTML = `
            <div class="receipt-container">
                <!-- Receipt Header -->
                <div class="text-center mb-4">
                    <h4 class="text-primary mb-1">
                        <i class="fas fa-stethoscope me-2"></i>MCSTUFFIN's Clinic
                    </h4>
                    <p class="text-muted mb-0">Prescription Receipt</p>
                    <div class="mt-2">
                        <span class="badge bg-secondary">${receipt.receipt_number}</span>
                    </div>
                </div>

                <!-- Patient & Doctor Info -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="text-primary">Patient Information</h6>
                        <p class="mb-1"><strong>Name:</strong> ${receipt.patient_name}</p>
                        <p class="mb-1"><strong>Email:</strong> ${receipt.patient_email}</p>
                        <p class="mb-1"><strong>Appointment Date:</strong> ${receipt.appointment_date || receipt.consultation_date}</p>
                        ${receipt.payment_method ? `<p class="mb-0"><strong>Payment Method:</strong> ${receipt.payment_method}${receipt.payer_account ? ` - ${receipt.payer_account}` : ''}</p>` : ''}
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-primary">Doctor Information</h6>
                        <p class="mb-1"><strong>Name:</strong> ${receipt.doctor_name}</p>
                        <p class="mb-1"><strong>Specialization:</strong> ${receipt.specialization || 'General'}</p>
                        <p class="mb-0"><strong>Diagnosis:</strong> ${receipt.diagnosis}</p>
                    </div>
                </div>

                <!-- Prescriptions -->
                ${receipt.prescriptions && receipt.prescriptions.length > 0 ? `
                <div class="mb-4">
                    <div class="d-flex align-items-center mb-2">
                        <div class="me-2 display-6" style="line-height:1">℞</div>
                        <h6 class="text-primary mb-0">Prescribed Medications</h6>
                    </div>
                    ${prescriptionsHtml}
                </div>
                ` : ''}

                <!-- Lab Requests -->
                ${receipt.lab_requests && receipt.lab_requests.length > 0 ? `
                <div class="mb-4">
                    <h6 class="text-info">Laboratory Tests</h6>
                    ${labRequestsHtml}
                </div>
                ` : ''}

                <!-- Cost Summary -->
                <div class="row justify-content-end">
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless">
                            <tr class="border-top">
                                <td class="text-end"><strong>${
                                  (receipt.prescriptions?.length && receipt.lab_requests?.length)
                                    ? 'Total Amount (Medicines + Lab Tests)'
                                    : (receipt.prescriptions?.length ? 'Total Amount (Medicines)' : 'Total Amount (Lab Tests)')
                                }:</strong></td>
                                <td class="text-end fw-bold text-success fs-5">₱${parseFloat(receipt.total_amount || 0).toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div class="mt-4 pt-3 border-top">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="small text-muted mb-1">Doctor's Signature</div>
                            <div style="height:42px;border-bottom:1px solid #dee2e6"></div>
                            <div class="small mt-1">${receipt.doctor_name}${receipt.specialization ? `, ${receipt.specialization}` : ''}</div>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <p class="text-muted mb-1">Generated on: ${receipt.generated_date}</p>
                            <p class="text-muted mb-0">Thank you for choosing MCSTUFFIN's Clinic</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Download receipt as PDF
    window.downloadReceipt = function() {
        if (!currentReceipt) return;

        const receiptElement = document.querySelector('.receipt-container');
        if (!receiptElement) return;

        html2canvas(receiptElement).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF();
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`prescription_receipt_${currentReceipt.receipt_number}.pdf`);
        });
    };

    // Print receipt
    window.printReceipt = function() {
        if (!currentReceipt) return;

        const receiptElement = document.querySelector('.receipt-container');
        if (!receiptElement) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Prescription Receipt - ${currentReceipt.receipt_number}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            .btn { display: none !important; }
                        }
                        body { padding: 20px; }
                    </style>
                </head>
                <body>
                    ${receiptElement.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Refresh prescriptions
    window.refreshPrescriptions = function() {
        loadPrescriptions();
    };

    // Apply filters
    function applyFilters() {
        // TODO: Implement filter functionality
        loadPrescriptions();
    }

    // Helper function to calculate consultation cost (for main table display)
    function calculateConsultationCost(consultation) {
        if (!consultation.prescriptions || consultation.prescriptions.length === 0) return 0;

        return consultation.prescriptions.reduce((total, p) => {
            const unitPrice = parseFloat(p.price || 0);
            const quantity = parseInt(p.quantity || 1);
            let cost = unitPrice * quantity;

            // Apply packaging unit multiplier if needed
            const packagingUnit = p.packaging_unit || 'tablet';
            switch (packagingUnit) {
                case 'box':
                    cost = cost * 1.2; // 20% markup
                    break;
                case 'bottle':
                    cost = cost * 1.15; // 15% markup
                    break;
                case 'blister pack':
                    cost = cost * 1.1; // 10% markup
                    break;
            }

            return total + cost;
        }, 0);
    }

    // Prefer backend-provided estimated_total; fallback to client calc
    function formatConsultationTotal(consultation) {
        const fromServer = consultation.estimated_total;
        if (fromServer !== undefined && fromServer !== null && !isNaN(parseFloat(fromServer))) {
            return parseFloat(fromServer).toFixed(2);
        }
        return calculateConsultationCost(consultation).toFixed(2);
    }

    // Helper function to calculate prescription subtotal
    function calculatePrescriptionSubtotal(prescriptions) {
        if (!prescriptions || prescriptions.length === 0) return 0;

        return prescriptions.reduce((total, p) => {
            const unitPrice = parseFloat(p.price || 0);
            const quantity = parseInt(p.quantity || 1);
            let cost = unitPrice * quantity;

            // Apply packaging unit multiplier if needed
            const packagingUnit = p.packaging_unit || 'tablet';
            switch (packagingUnit) {
                case 'box':
                    cost = cost * 1.2; // 20% markup
                    break;
                case 'bottle':
                    cost = cost * 1.15; // 15% markup
                    break;
                case 'blister pack':
                    cost = cost * 1.1; // 10% markup
                    break;
            }

            return total + cost;
        }, 0);
    }

    // Helper function to calculate lab subtotal
    function calculateLabSubtotal(labRequests) {
        if (!labRequests || labRequests.length === 0) return 0;

        return labRequests.reduce((total, l) => {
            return total + (parseFloat(l.price) || 0);
        }, 0);
    }

    // Event listeners for filters
    document.getElementById('dateFilter')?.addEventListener('change', applyFilters);
    document.getElementById('doctorFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);

    // Event delegation for view details buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-details-btn')) {
            console.log('View details button clicked');
            const button = e.target.closest('.view-details-btn');
            const consultationId = button.getAttribute('data-consultation-id');
            console.log('Consultation ID:', consultationId);
            if (consultationId) {
                viewPrescriptionDetails(parseInt(consultationId));
            }
        }
    });

    // Initial load
    loadPrescriptions();
});
