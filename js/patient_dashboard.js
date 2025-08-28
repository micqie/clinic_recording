document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const prescriptionReceiptApi = `${baseApiUrl}/prescription_receipt.php`;
    const integratedConsultationApi = `${baseApiUrl}/integrated_consultation.php`;
    const appointmentsApi = `${baseApiUrl}/appointments.php`;
    const userApi = `${baseApiUrl}/user.php`;

    // Check if user is logged in and is a patient
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== 'patient') {
        window.location.href = '../../index.html';
        return;
    }

    let patientId = null;

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

    // Load dashboard statistics
    async function loadDashboardStats() {
        try {
            const patId = await getPatientId();
            if (!patId) return;

            // Load appointments count
            const appointmentsRes = await axios.get(`${appointmentsApi}?operation=get_by_patient&patient_id=${patId}`);
            if (appointmentsRes.data.success) {
                const appointments = appointmentsRes.data.data || [];
                document.getElementById('totalAppointments').textContent = appointments.length;

                // Load recent appointments
                loadRecentAppointments(appointments.slice(0, 5));
            }

            // Load prescription receipts for cost calculation
            const receiptsRes = await axios.get(`${prescriptionReceiptApi}?operation=get_patient_receipts&patient_id=${patId}`);
            if (receiptsRes.data.success) {
                const receipts = receiptsRes.data.receipts || [];
                document.getElementById('totalPrescriptions').textContent = receipts.length;

                // Calculate total cost
                const totalCost = receipts.reduce((sum, receipt) => sum + (receipt.estimated_total || 0), 0);
                document.getElementById('totalCost').textContent = `₱${totalCost.toFixed(2)}`;

                // Load recent receipts
                loadRecentReceipts(receipts.slice(0, 3));
            }

            // Load lab tests count (placeholder for now)
            document.getElementById('totalLabTests').textContent = '0';

        } catch (e) {
            console.error('Failed to load dashboard stats:', e);
        }
    }

    // Load recent appointments
    function loadRecentAppointments(appointments) {
        const recentAppointmentsBody = document.getElementById('recentAppointmentsBody');
        if (!recentAppointmentsBody) return;

        recentAppointmentsBody.innerHTML = '';

        if (appointments.length === 0) {
            recentAppointmentsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No recent appointments</td></tr>';
            return;
        }

        appointments.forEach(appointment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fw-semibold">${appointment.appointment_date}</div>
                    <small class="text-muted">${appointment.appointment_time || ''}</small>
                </td>
                <td>
                    <div class="fw-semibold">${appointment.doctor_name || 'N/A'}</div>
                    <small class="text-muted">${appointment.specialization_name || 'General'}</small>
                </td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(appointment.appointment_status)}">
                        ${appointment.appointment_status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <a href="patient_appointments.html" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-eye"></i>
                    </a>
                </td>
            `;
            recentAppointmentsBody.appendChild(tr);
        });
    }

    // Load recent receipts
    function loadRecentReceipts(receipts) {
        const recentReceiptsBody = document.getElementById('recentReceiptsBody');
        if (!recentReceiptsBody) return;

        recentReceiptsBody.innerHTML = '';

        if (receipts.length === 0) {
            recentReceiptsBody.innerHTML = '<div class="p-3 text-center text-muted">No recent receipts</div>';
            return;
        }

        receipts.forEach(receipt => {
            const receiptDiv = document.createElement('div');
            receiptDiv.className = 'p-3 border-bottom';
            receiptDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="mb-1 fw-semibold">${receipt.doctor_name}</h6>
                        <small class="text-muted">${receipt.appointment_date}</small>
                    </div>
                    <span class="badge bg-success">₱${(receipt.estimated_total || 0).toFixed(2)}</span>
                </div>
                <p class="mb-2 small text-truncate" title="${receipt.diagnosis}">
                    ${receipt.diagnosis}
                </p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${receipt.prescription_count || 0} medicines</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewReceiptFromDashboard(${receipt.consultation_id})">
                        <i class="fas fa-receipt me-1"></i>View
                    </button>
                </div>
            `;
            recentReceiptsBody.appendChild(receiptDiv);
        });
    }

    // Get status badge class
    function getStatusBadgeClass(status) {
        switch (status?.toLowerCase()) {
            case 'scheduled': return 'primary';
            case 'confirmed': return 'info';
            case 'in consultation': return 'warning';
            case 'completed': return 'success';
            case 'cancelled': return 'danger';
            default: return 'secondary';
        }
    }

    // View receipt from dashboard (global function)
    window.viewReceiptFromDashboard = async function(consultationId) {
        try {
            const patId = await getPatientId();
            if (!patId) {
                Swal.fire('Error', 'Patient profile not found', 'error');
                return;
            }

            const res = await axios.get(`${prescriptionReceiptApi}?operation=get_receipt&consultation_id=${consultationId}&patient_id=${patId}`);

            if (res.data.success) {
                const receipt = res.data.receipt;
                displayReceiptModal(receipt);
            } else {
                Swal.fire('Error', res.data.message || 'Failed to load receipt', 'error');
            }
        } catch (e) {
            console.error('Failed to load receipt:', e);
            Swal.fire('Error', 'Failed to load receipt', 'error');
        }
    };

    // Display receipt in modal
    function displayReceiptModal(receipt) {
        let prescriptionsHtml = '';
        if (receipt.prescriptions && receipt.prescriptions.length > 0) {
            prescriptionsHtml = '<div class="table-responsive"><table class="table table-sm table-bordered">';
            prescriptionsHtml += '<thead class="table-light"><tr><th>Medicine</th><th>Specifications</th><th>Dosage</th><th>Quantity</th><th>Unit Price</th><th>Total Cost</th></tr></thead><tbody>';
            receipt.prescriptions.forEach(p => {
                const specs = `${p.strength || p.weight || ''}${p.form ? ' (' + p.form + ')' : ''}`;
                prescriptionsHtml += `<tr>
                    <td><strong>${p.generic_name}</strong></td>
                    <td>${specs}</td>
                    <td>${p.dosage}<br><small class="text-muted">${p.frequency}</small></td>
                    <td>${p.quantity || 1} ${p.packaging_name || p.packaging_unit || 'unit'}</td>
                    <td>₱${p.unit_price} per unit</td>
                    <td class="fw-bold">₱${p.total_cost.toFixed(2)}</td>
                </tr>`;
            });
            prescriptionsHtml += '</tbody></table></div>';
        }

        let labRequestsHtml = '';
        if (receipt.lab_requests && receipt.lab_requests.length > 0) {
            labRequestsHtml = '<div class="table-responsive"><table class="table table-sm table-bordered">';
            labRequestsHtml += '<thead class="table-light"><tr><th>Lab Test</th><th>Description</th><th>Request Notes</th><th>Price</th></tr></thead><tbody>';
            receipt.lab_requests.forEach(l => {
                labRequestsHtml += `<tr>
                    <td><strong>${l.type_name}</strong></td>
                    <td>${l.description || 'N/A'}</td>
                    <td>${l.request_text || 'N/A'}</td>
                    <td class="fw-bold">₱${l.price.toFixed(2)}</td>
                </tr>`;
            });
            labRequestsHtml += '</tbody></table></div>';
        }

        Swal.fire({
            title: 'Prescription Receipt',
            html: `
                <div class="text-start">
                    <div class="text-center mb-3">
                        <h6 class="text-primary">${receipt.receipt_number}</h6>
                        <small class="text-muted">Generated on ${receipt.generated_date}</small>
                    </div>

                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Patient:</strong> ${receipt.patient_name}<br>
                            <strong>Date:</strong> ${receipt.consultation_date}
                        </div>
                        <div class="col-6">
                            <strong>Doctor:</strong> ${receipt.doctor_name}<br>
                            <strong>Specialization:</strong> ${receipt.specialization || 'General'}
                        </div>
                    </div>

                    <div class="mb-3">
                        <strong>Diagnosis:</strong> ${receipt.diagnosis}
                    </div>

                    ${receipt.prescriptions && receipt.prescriptions.length > 0 ? `
                    <div class="mb-3">
                        <h6 class="text-primary">Prescribed Medications</h6>
                        ${prescriptionsHtml}
                    </div>
                    ` : ''}

                    ${receipt.lab_requests && receipt.lab_requests.length > 0 ? `
                    <div class="mb-3">
                        <h6 class="text-info">Laboratory Tests</h6>
                        ${labRequestsHtml}
                    </div>
                    ` : ''}

                    <div class="text-end mt-3">
                        ${receipt.prescriptions && receipt.prescriptions.length > 0 ? `
                        <div><strong>Prescriptions Subtotal:</strong> ₱${receipt.prescription_subtotal.toFixed(2)}</div>
                        ` : ''}
                        ${receipt.lab_requests && receipt.lab_requests.length > 0 ? `
                        <div><strong>Lab Tests Subtotal:</strong> ₱${receipt.lab_subtotal.toFixed(2)}</div>
                        ` : ''}
                        <div class="h5 text-success"><strong>Total: ₱${receipt.total_amount.toFixed(2)}</strong></div>
                    </div>
                </div>
            `,
            width: '900px',
            confirmButtonText: 'Close',
            showCloseButton: true
        });
    }

    // Initial load
    loadDashboardStats();
});
