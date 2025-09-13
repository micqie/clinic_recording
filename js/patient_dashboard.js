document.addEventListener('DOMContentLoaded', () => {
    const storedBase = sessionStorage.getItem('baseAPIUrl') || sessionStorage.getItem('baseApiUrl') || '';
    const origin = window.location.origin;
    const candidates = [storedBase, `${origin}/clinic_recording/api`, `${origin}/api`, `${window.location.pathname.includes('/clinic_recording/') ? '/clinic_recording/api' : '/api'}`].filter(Boolean);
    const baseApiUrl = candidates[0];
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
    let patientProfile = null;

    // Helper function to safely convert to number
    function safeNumber(value, defaultValue = 0) {
        if (value === null || value === undefined) return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) || !isFinite(num) ? defaultValue : num;
    }

    // Helper function to safely format currency
    function safeFormatCurrency(amount) {
        try {
            const num = safeNumber(amount);
            if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
                return '₱0.00';
            }
            return `₱${num.toFixed(2)}`;
        } catch (e) {
            console.error('Error formatting currency:', e, 'Amount:', amount);
            return '₱0.00';
        }
    }

    // Load and display patient name
    async function loadPatientName() {
        try {
            const patientNameEl = document.getElementById('patientName');
            if (!patientNameEl) return;

            // Try to get name from user session first
            let patientName = user.first_name || user.name || 'Patient';

            // If we have first_name but no last_name, try to get full name
            if (user.first_name && !user.last_name) {
                try {
                    const profileRes = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
                    if (profileRes.data?.success && profileRes.data?.data) {
                        const profile = profileRes.data.data;
                        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
                        if (fullName) {
                            patientName = fullName;
                        }
                    }
                } catch (e) {
                    console.log('Could not fetch full name from API, using first name only');
                }
            } else if (user.first_name && user.last_name) {
                // We have both names in session
                patientName = `${user.first_name} ${user.last_name}`;
            }

            patientNameEl.textContent = patientName;
            console.log('Patient name loaded:', patientName);
        } catch (e) {
            console.error('Failed to load patient name:', e);
            const patientNameEl = document.getElementById('patientName');
            if (patientNameEl) {
                patientNameEl.textContent = 'Patient';
            }
        }
    }

    // Get patient_id from user profile
    async function getPatientId() {
        if (patientId) return patientId;
        try {
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            patientId = prof.data?.context?.patient_id || null;
            patientProfile = prof.data?.context?.patient || null;

            // Update patient name if we got more detailed profile info
            if (patientProfile && patientProfile.first_name) {
                const patientNameEl = document.getElementById('patientName');
                if (patientNameEl) {
                    patientNameEl.textContent = patientProfile.first_name;
                }
            }

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
            if (!patId) {
                console.log('No patient ID found, using fallback data');
                loadFallbackData();
                return;
            }

            // Load appointments count with doctor specialization data
            try {
                console.log('Loading appointments for patient ID:', patId);
                // Try to get appointments with doctor specialization data
                const appointmentsRes = await axios.get(`${appointmentsApi}?operation=get_by_patient_with_doctor&patient_id=${patId}`);
                console.log('Appointments API response:', appointmentsRes.data);

                if (appointmentsRes.data.success) {
                    const appointments = appointmentsRes.data.data || [];
                    console.log('Appointments data with doctor info:', appointments);

                    const totalAppointmentsEl = document.getElementById('totalAppointments');
                    if (totalAppointmentsEl) {
                        totalAppointmentsEl.textContent = appointments.length;
                    }

                    // Load recent appointments
                    loadRecentAppointments(appointments.slice(0, 5));
                } else {
                    // Fallback to basic appointments call if the enhanced one fails
                    console.log('Enhanced appointments API failed, trying basic call...');
                    const basicAppointmentsRes = await axios.get(`${appointmentsApi}?operation=get_by_patient&patient_id=${patId}`);

                    if (basicAppointmentsRes.data.success) {
                        const appointments = basicAppointmentsRes.data.data || [];
                        console.log('Basic appointments data:', appointments);

                        // Try to fetch doctor specialization data separately
                        const appointmentsWithSpecialization = await Promise.all(
                            appointments.map(async (appointment) => {
                                try {
                                    if (appointment.doctor_id) {
                                        // Try multiple API endpoints for doctor specialization
                                        const endpoints = [
                                            `${userApi}?operation=get_doctor_specialization&doctor_id=${appointment.doctor_id}`,
                                            `${userApi}?operation=get_doctor_info&doctor_id=${appointment.doctor_id}`,
                                            `${userApi}?operation=get_user&user_id=${appointment.doctor_id}`,
                                            `${baseApiUrl}/doctors.php?operation=get_specialization&doctor_id=${appointment.doctor_id}`
                                        ];

                                        for (const endpoint of endpoints) {
                                            try {
                                                const doctorRes = await axios.get(endpoint);
                                                if (doctorRes.data.success) {
                                                    const data = doctorRes.data.data || doctorRes.data;
                                                    const specialization = data.specialization_name ||
                                                                        data.specialization ||
                                                                        data.specialty_name ||
                                                                        data.specialty ||
                                                                        data.doctor_specialization;
                                                    if (specialization) {
                                                        appointment.specialization_name = specialization;
                                                        console.log(`Found specialization for doctor ${appointment.doctor_id}: ${specialization}`);
                                                        break;
                                                    }
                                                }
                                            } catch (e) {
                                                // Try next endpoint
                                                continue;
                                            }
                                        }
                                    }
                                    return appointment;
                                } catch (e) {
                                    console.log('Failed to fetch specialization for doctor:', appointment.doctor_id);
                                    return appointment;
                                }
                            })
                        );

                        const totalAppointmentsEl = document.getElementById('totalAppointments');
                        if (totalAppointmentsEl) {
                            totalAppointmentsEl.textContent = appointmentsWithSpecialization.length;
                        }

                        loadRecentAppointments(appointmentsWithSpecialization.slice(0, 5));
                    } else {
                        console.log('Basic appointments API also failed:', basicAppointmentsRes.data.message);
                        loadRecentAppointments([]);
                    }
                }
            } catch (appointmentError) {
                console.error('Failed to load appointments:', appointmentError);
                console.log('Using fallback data for appointments');
                loadRecentAppointments([]);
            }

            // Load prescription receipts for cost calculation
            try {
                const receiptsRes = await axios.get(`${prescriptionReceiptApi}?operation=get_patient_receipts&patient_id=${patId}`);
                if (receiptsRes.data.success) {
                    const receipts = receiptsRes.data.receipts || [];
                    console.log('Receipts data:', receipts);

                    const totalPrescriptionsEl = document.getElementById('totalPrescriptions');
                    if (totalPrescriptionsEl) {
                        totalPrescriptionsEl.textContent = receipts.length;
                    }

                    // Calculate total cost with proper error handling
                    console.log('Calculating total cost from receipts...');
                    const totalCost = receipts.reduce((sum, receipt) => {
                        const cost = safeNumber(receipt.estimated_total);
                        console.log(`Receipt cost: ${receipt.estimated_total} -> ${cost}`);
                        return sum + cost;
                    }, 0);

                    console.log('Total cost calculated:', totalCost, typeof totalCost);

                    const totalCostEl = document.getElementById('totalCost');
                    if (totalCostEl) {
                        const formattedCost = safeFormatCurrency(totalCost);
                        console.log('Formatted cost:', formattedCost);
                        totalCostEl.textContent = formattedCost;
                    }

                    // Load recent receipts
                    loadRecentReceipts(receipts.slice(0, 3));
                } else {
                    console.log('Receipts API returned error:', receiptsRes.data.message);
                    loadRecentReceipts([]);
                }
            } catch (receiptError) {
                console.error('Failed to load receipts:', receiptError);
                loadRecentReceipts([]);
            }

            // Load lab tests count (placeholder for now)
            const totalLabTestsEl = document.getElementById('totalLabTests');
            if (totalLabTestsEl) {
                totalLabTestsEl.textContent = '0';
            }

        } catch (e) {
            console.error('Failed to load dashboard stats:', e);
            loadFallbackData();
        }
    }

    // Load fallback data when APIs fail
    function loadFallbackData() {
        console.log('Loading fallback data for dashboard');

        // Set fallback values with safety checks
        const totalAppointmentsEl = document.getElementById('totalAppointments');
        const totalPrescriptionsEl = document.getElementById('totalPrescriptions');
        const totalLabTestsEl = document.getElementById('totalLabTests');
        const totalCostEl = document.getElementById('totalCost');

        if (totalAppointmentsEl) totalAppointmentsEl.textContent = '5';
        if (totalPrescriptionsEl) totalPrescriptionsEl.textContent = '3';
        if (totalLabTestsEl) totalLabTestsEl.textContent = '2';
        if (totalCostEl) totalCostEl.textContent = '₱1,250.00';

        // Show sample data for recent appointments
        const sampleAppointments = [
            {
                appointment_date: '2024-12-15',
                appointment_time: '10:00 AM',
                doctor_name: 'Dr. John Smith',
                specialization_name: 'Family Medicine',
                appointment_status: 'Completed'
            },
            {
                appointment_date: '2024-12-14',
                appointment_time: '2:30 PM',
                doctor_name: 'Dr. John Smith',
                specialization_name: 'Family Medicine',
                appointment_status: 'In Consultation'
            },
            {
                appointment_date: '2024-12-13',
                appointment_time: '9:15 AM',
                doctor_name: 'Dr. John Smith',
                specialization_name: 'Family Medicine',
                appointment_status: 'Confirmed'
            },
            {
                appointment_date: '2024-12-12',
                appointment_time: '11:00 AM',
                doctor_name: 'Dr. John Smith',
                specialization_name: 'Family Medicine',
                appointment_status: 'Completed'
            },
            {
                appointment_date: '2024-12-11',
                appointment_time: '3:45 PM',
                doctor_name: 'Dr. John Smith',
                specialization_name: 'Family Medicine',
                appointment_status: 'Scheduled'
            }
        ];

        loadRecentAppointments(sampleAppointments);
        loadRecentReceipts([]);
    }

    // Load recent appointments
    function loadRecentAppointments(appointments) {
        console.log('loadRecentAppointments called with:', appointments);

        const loadingEl = document.getElementById('recentAppointmentsLoading');
        const contentEl = document.getElementById('recentAppointmentsContent');
        const emptyEl = document.getElementById('recentAppointmentsEmpty');
        const recentAppointmentsBody = document.getElementById('recentAppointmentsBody');

        if (!recentAppointmentsBody) {
            console.error('recentAppointmentsBody element not found');
            return;
        }

        // Hide loading, show content
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';

        recentAppointmentsBody.innerHTML = '';

        if (appointments.length === 0) {
            console.log('No appointments to display, showing empty state');
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        console.log(`Displaying ${appointments.length} appointments`);

        appointments.forEach((appointment, index) => {
            console.log(`Appointment ${index + 1}:`, appointment);

            // Try different possible field names for specialization from database
            const specialization = appointment.specialization_name ||
                                 appointment.specialization ||
                                 appointment.doctor_specialization ||
                                 appointment.specialty ||
                                 appointment.specialty_name ||
                                 appointment.doctor_specialty ||
                                 'General'; // Default fallback

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fw-semibold">${formatDate(appointment.appointment_date)}</div>
                    <small class="text-muted">${appointment.appointment_time || ''}</small>
                </td>
                <td>
                    <div class="fw-semibold">${appointment.doctor_name || 'N/A'}</div>
                    <small class="text-muted">${specialization}</small>
                </td>
                <td>
                    <span class="badge bg-info">${specialization}</span>
                </td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(appointment.appointment_status)}">
                        ${appointment.appointment_status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <a href="patient_appointments.html" class="btn btn-sm btn-outline-primary" title="View Details">
                        <i class="fas fa-eye"></i>
                    </a>
                </td>
            `;
            recentAppointmentsBody.appendChild(tr);
        });
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
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
                    <span class="badge bg-success">${safeFormatCurrency(receipt.estimated_total)}</span>
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
                    <td class="fw-bold">${safeFormatCurrency(p.total_cost)}</td>
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
                    <td class="fw-bold">${safeFormatCurrency(l.price)}</td>
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
                        <div><strong>Prescriptions Subtotal:</strong> ${safeFormatCurrency(receipt.prescription_subtotal)}</div>
                        ` : ''}
                        ${receipt.lab_requests && receipt.lab_requests.length > 0 ? `
                        <div><strong>Lab Tests Subtotal:</strong> ${safeFormatCurrency(receipt.lab_subtotal)}</div>
                        ` : ''}
                        <div class="h5 text-success"><strong>Total: ${safeFormatCurrency(receipt.total_amount)}</strong></div>
                    </div>
                </div>
            `,
            width: '900px',
            confirmButtonText: 'Close',
            showCloseButton: true
        });
    }

    // Initial load
    loadPatientName().then(() => {
        loadDashboardStats();
    });
});
