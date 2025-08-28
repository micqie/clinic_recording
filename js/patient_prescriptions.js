document.addEventListener('DOMContentLoaded', () => {
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
    let currentReceipt = null;

    // Get patient_id from user profile
    async function getPatientId() {
        if (patientId) return patientId;
        try {
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            patientId = prof.data?.context?.patient_id || null;
            return patientId;
        } catch (e) {
            console.error('Failed to get patient profile:', e);
            return null;
        }
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
                res.data.data.forEach(consultation => {
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
                            <span class="badge bg-info">${consultation.prescription_count || 0} medicines</span>
                        </td>
                        <td>
                            <span class="fw-bold text-success">₱${calculateConsultationCost(consultation).toFixed(2)}</span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary" onclick="viewPrescriptionDetails(${consultation.consultation_id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="viewReceipt(${consultation.consultation_id})" title="View Receipt">
                                    <i class="fas fa-receipt"></i>
                                </button>
                                <button class="btn btn-primary" onclick="payNow(${consultation.consultation_id})" title="Pay Online">
                                    <i class="fas fa-credit-card"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    prescriptionsTableBody.appendChild(tr);
                });
            } else {
                prescriptionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No prescriptions found</td></tr>';
            }
        } catch (e) {
            console.error('Failed to load prescriptions:', e);
            const prescriptionsTableBody = document.getElementById('prescriptionsTableBody');
            if (prescriptionsTableBody) {
                prescriptionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Failed to load prescriptions</td></tr>';
            }
        }
    }

    // View prescription details
    window.viewPrescriptionDetails = async function(consultationId) {
        try {
            const res = await axios.get(`${integratedConsultationApi}?operation=get_details&consultation_id=${consultationId}`);
            if (res.data.success) {
                const data = res.data;

                let prescriptionsHtml = '';
                if (data.prescriptions && data.prescriptions.length > 0) {
                    prescriptionsHtml = '<h6 class="text-primary">Prescriptions:</h6><div class="table-responsive"><table class="table table-sm">';
                    prescriptionsHtml += '<thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>';
                    data.prescriptions.forEach(p => {
                        prescriptionsHtml += `<tr><td><strong>${p.generic_name}</strong></td><td>${p.dosage}</td><td>${p.frequency}</td><td>${p.duration}</td><td>${p.instructions || 'None'}</td></tr>`;
                    });
                    prescriptionsHtml += '</tbody></table></div>';
                }

                let labRequestsHtml = '';
                if (data.lab_requests && data.lab_requests.length > 0) {
                    labRequestsHtml = '<h6 class="text-info">Lab Requests:</h6><ul>';
                    data.lab_requests.forEach(l => {
                        labRequestsHtml += `<li><strong>${l.type_name}</strong> - ${l.request_text}</li>`;
                    });
                    labRequestsHtml += '</ul>';
                }

                Swal.fire({
                    title: 'Prescription Details',
                    html: `
                        <div class="text-start">
                            <p><strong>Patient:</strong> ${data.consultation.patient_name}</p>
                            <p><strong>Date:</strong> ${data.consultation.appointment_date}</p>
                            <p><strong>Diagnosis:</strong> ${data.consultation.diagnosis}</p>
                            <p><strong>Notes:</strong> ${data.consultation.consultation_notes || 'None'}</p>
                            <p><strong>Next Appointment:</strong> ${data.consultation.next_appointment_date || 'None'}</p>
                            <p><strong>Follow-up Notes:</strong> ${data.consultation.next_appointment_notes || 'None'}</p>
                            ${prescriptionsHtml}
                            ${labRequestsHtml}
                        </div>
                    `,
                    width: '700px',
                    confirmButtonText: 'Close'
                });
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
            prescriptionsHtml = '<div class="table-responsive"><table class="table table-sm table-bordered">';
            prescriptionsHtml += '<thead class="table-light"><tr><th>Medicine</th><th>Specifications</th><th>Dosage</th><th>Quantity</th><th>Unit Price</th><th>Total Cost</th></tr></thead><tbody>';
            receipt.prescriptions.forEach(p => {
                const specs = `${p.strength || p.weight || 'N/A'}${p.form ? ' (' + p.form + ')' : ''}`;
                const quantityDisplay = `${p.quantity || 1} ${p.packaging_unit || 'unit'}`;

                // Calculate total cost on-the-fly
                const unitPrice = parseFloat(p.price || 0);
                const quantity = parseInt(p.quantity || 1);
                let totalCost = unitPrice * quantity;

                // Apply packaging unit multiplier if needed
                const packagingUnit = p.packaging_unit || 'tablet';
                switch (packagingUnit) {
                    case 'box':
                        totalCost = totalCost * 1.2; // 20% markup
                        break;
                    case 'bottle':
                        totalCost = totalCost * 1.15; // 15% markup
                        break;
                    case 'blister pack':
                        totalCost = totalCost * 1.1; // 10% markup
                        break;
                }

                prescriptionsHtml += `<tr>
                    <td><strong>${p.generic_name}</strong></td>
                    <td>${specs}</td>
                    <td>${p.dosage}<br><small class="text-muted">${p.frequency}</small></td>
                    <td>${quantityDisplay}</td>
                    <td>₱${unitPrice.toFixed(2)} per unit</td>
                    <td class="fw-bold">₱${totalCost.toFixed(2)}</td>
                </tr>`;
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
                    <h6 class="text-primary">Prescribed Medications</h6>
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
                            ${receipt.prescriptions && receipt.prescriptions.length > 0 ? `
                            <tr>
                                <td class="text-end"><strong>Prescriptions Subtotal:</strong></td>
                                <td class="text-end">₱${calculatePrescriptionSubtotal(receipt.prescriptions).toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            ${receipt.lab_requests && receipt.lab_requests.length > 0 ? `
                            <tr>
                                <td class="text-end"><strong>Lab Tests Subtotal:</strong></td>
                                <td class="text-end">₱${calculateLabSubtotal(receipt.lab_requests).toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr class="border-top">
                                <td class="text-end"><strong>Total Amount:</strong></td>
                                <td class="text-end fw-bold text-success fs-5">₱${(calculatePrescriptionSubtotal(receipt.prescriptions) + calculateLabSubtotal(receipt.lab_requests)).toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div class="text-center mt-4 pt-3 border-top">
                    <p class="text-muted mb-1">Generated on: ${receipt.generated_date}</p>
                    <p class="text-muted mb-0">Thank you for choosing MCSTUFFIN's Clinic</p>
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

    // Initial load
    loadPrescriptions();
});
