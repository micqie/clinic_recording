document.addEventListener('DOMContentLoaded', () => {
    // Wait for SweetAlert to be available
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 is not loaded. Please check the script tag.');
        // Create a fallback function
        window.Swal = {
            fire: (title, text, icon) => {
                alert(`${title}: ${text}`);
            }
        };
    }

    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const integratedConsultationApi = `${baseApiUrl}/integrated_consultation.php`;
    const patientsApi = `${baseApiUrl}/patients.php`;
    const appointmentsApi = `${baseApiUrl}/appointments.php`;
    const userApi = `${baseApiUrl}/user.php`;
    const queueApi = `${baseApiUrl}/queue_management.php`;
    const enhancedQueueApi = `${baseApiUrl}/enhanced_queue_management.php`;
    const medicinesApi = `${baseApiUrl}/medicines.php`;
    const labTestTypesApi = `${baseApiUrl}/lab_test_types.php`;
    const conditionsApi = `${baseApiUrl}/conditions.php`;

    // Form elements
    const form = document.getElementById('consultationForm');
    const patientIdInput = document.getElementById('patient_id');
    const appointmentIdInput = document.getElementById('appointment_id');
    const currentPatientDisplay = document.getElementById('currentPatientDisplay');
    const addPrescriptionBtn = document.getElementById('addPrescriptionBtn');
    const addLabRequestBtn = document.getElementById('addLabRequestBtn');
    const prescriptionsContainer = document.getElementById('prescriptionsContainer');
    const labRequestsContainer = document.getElementById('labRequestsContainer');
    const saveDraftBtn = document.getElementById('saveDraftBtn');

    // Queue management elements
    const refreshQueueBtn = document.getElementById('refreshQueueBtn');
    const currentQueueNumber = document.getElementById('currentQueueNumber');
    const nextQueueNumber = document.getElementById('nextQueueNumber');
    const completedCount = document.getElementById('completedCount');
    const currentPatientInfo = document.getElementById('currentPatientInfo');
    const consultationsTableBody = document.getElementById('consultationsTableBody');

    // Check if user is logged in and is a doctor
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== 'doctor') {
        window.location.href = '../../index.html';
        return;
    }

    let doctorId = null;
    let prescriptionCounter = 0;
    let labRequestCounter = 0;
    let labResultCounter = 0;

    // Get doctor_id from user profile
    async function getDoctorId() {
        if (doctorId) return doctorId;
        try {
            const prof = await axios.get(`${userApi}?operation=profile&user_id=${user.id}`);
            doctorId = prof.data?.context?.doctor_id || null;
            return doctorId;
        } catch (e) {
            console.error('Failed to get doctor profile:', e);
            return null;
        }
    }

    // Enable/disable consultation form based on availability
    function setFormEnabled(isEnabled) {
        // Enable/disable all form controls
        const controls = form.querySelectorAll('input, select, textarea, button[type="submit"], button[type="reset"]');

        controls.forEach(el => {
            // Keep the external Refresh Queue button unaffected
            if (el.id === 'refreshQueueBtn') return;
            el.disabled = !isEnabled;
        });

        // Enable/disable additional buttons
        if (addPrescriptionBtn) {
            addPrescriptionBtn.disabled = !isEnabled;
        }
        if (addLabRequestBtn) {
            addLabRequestBtn.disabled = !isEnabled;
        }
        if (saveDraftBtn) {
            saveDraftBtn.disabled = !isEnabled;
        }

        // Force enable the form if we have a current consultation
        if (isEnabled) {
            form.classList.remove('was-validated');
            // Ensure all required fields are enabled
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                field.disabled = false;
            });
        }
    }

    // Display current patient information (only for this doctor)
    function displayCurrentPatient(currentConsultation) {
        if (!currentConsultation) {
            currentPatientDisplay.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>No patient under you is currently in consultation</strong>
                    <br>
                    <small class="text-muted">Please wait until a patient assigned to you is placed In Consultation. Click "Refresh Queue" to check for updates.</small>
                </div>
            `;
            // Clear hidden fields and disable form
            patientIdInput.value = '';
            appointmentIdInput.value = '';
            setFormEnabled(false);
            return false;
        }

        // Set the hidden input values
        patientIdInput.value = currentConsultation.patient_id;
        appointmentIdInput.value = currentConsultation.appointment_id;

        // Display patient information
        currentPatientDisplay.innerHTML = `
            <div class="alert alert-success">
                <div class="d-flex align-items-center">
                    <i class="fas fa-user-md fa-2x me-3 text-success"></i>
                    <div>
                        <h6 class="mb-1">Currently Consulting</h6>
                        <p class="mb-1"><strong>${currentConsultation.patient_name}</strong></p>
                        <p class="mb-0"><small class="text-muted">Queue #${currentConsultation.queue_number} | Appointment Date: ${currentConsultation.appointment_date || 'Today'}</small></p>
                    </div>
                </div>
            </div>
        `;
        setFormEnabled(true);
        return true;
    }

    // Load current queue status strictly for the logged-in doctor
    async function loadCurrentQueueStatus() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }

            const today = new Date().toISOString().slice(0, 10);
            const res = await axios.get(`${enhancedQueueApi}?operation=get_doctor_queue_status&doctor_id=${docId}&date=${today}`);

            if (res.data.success) {
                const data = res.data;

                // Update queue display elements
                if (currentQueueNumber) {
                    currentQueueNumber.textContent = data.current_consultation ? data.current_consultation.queue_number : '-';
                }
                if (nextQueueNumber) {
                    nextQueueNumber.textContent = data.next_in_queue ? data.next_in_queue.queue_number : '-';
                }
                if (completedCount) {
                    completedCount.textContent = data.completed_count;
                }

                // Show current patient info
                if (currentPatientInfo) {
                    if (data.current_consultation) {
                        currentPatientInfo.innerHTML = `
                            <div class="alert alert-success mb-0">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-user-md fa-2x me-3 text-success"></i>
                                    <div>
                                        <h6 class="mb-1">Currently Consulting (Your Patient)</h6>
                                        <p class="mb-0"><strong>${data.current_consultation.patient_name}</strong> - Queue #${data.current_consultation.queue_number}</p>
                                        <small class="text-muted">Started by: ${data.queue_updated_by || 'Secretary'}</small>
                                    </div>
                                </div>
                            </div>
                        `;

                        // Display current patient and enable form
                        displayCurrentPatient(data.current_consultation);

                        // Force enable form as a fallback
                        setTimeout(() => {
                            setFormEnabled(true);
                        }, 100);

                    } else if (data.next_in_queue) {
                        currentPatientInfo.innerHTML = `
                            <div class="alert alert-warning mb-0">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-clock fa-2x me-3 text-warning"></i>
                                    <div>
                                        <h6 class="mb-1">Next Patient Ready (Yours)</h6>
                                        <p class="mb-0"><strong>${data.next_in_queue.patient_name}</strong> - Queue #${data.next_in_queue.queue_number}</p>
                                        <small class="text-muted">Waiting for secretary to start consultation</small>
                                    </div>
                                </div>
                            </div>
                        `;
                        // No active current patient yet for you; keep form disabled
                        displayCurrentPatient(null);
                    } else {
                        currentPatientInfo.innerHTML = `
                            <div class="alert alert-info mb-0">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                    <div>
                                        <h6 class="mb-1">Queue Status</h6>
                                        <p class="mb-0">No patients assigned to you are currently in consultation</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        // Display no patient in form
                        displayCurrentPatient(null);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load queue status:', error);
            if (currentPatientInfo) {
                currentPatientInfo.innerHTML = `
                    <div class="alert alert-danger mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load queue status
                    </div>
                `;
            }
            // On error, disable form as a precaution
            setFormEnabled(false);
        }
    }





    // Add prescription field
    function addPrescriptionField() {
        const prescriptionId = `prescription_${prescriptionCounter++}`;
        const prescriptionHtml = `
            <div class="card border mb-3" id="${prescriptionId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0 text-primary">Medicine ${prescriptionCounter}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removePrescription('${prescriptionId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                                         <div class="row g-2">
                         <div class="col-md-12">
                             <label class="form-label">Medicine</label>
                             <div class="position-relative">
                                 <input type="text" class="form-control" id="medicineSearch_${prescriptionId}" placeholder="Type to search medicines..." autocomplete="off" required>
                                 <input type="hidden" name="prescriptions[${prescriptionCounter-1}][medicine_id]" id="medicineId_${prescriptionId}" required>
                                 <div class="dropdown-menu w-100" id="medicineDropdown_${prescriptionId}" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                     <!-- Medicine options will be populated here -->
                                 </div>
                             </div>
                         </div>
                     </div>

                    <!-- Medicine Details Display -->
                    <div class="row g-2 mt-2" id="medicineDetails_${prescriptionId}" style="display: none;">
                        <div class="col-12">
                            <div class="card bg-light">
                                <div class="card-body py-2">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <strong>Generic Name:</strong><br>
                                            <span id="genericName_${prescriptionId}">-</span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Strength:</strong><br>
                                            <span id="strength_${prescriptionId}">-</span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Form:</strong><br>
                                            <span id="form_${prescriptionId}">-</span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Unit Price:</strong><br>
                                            <span id="price_${prescriptionId}" class="text-primary fw-bold">₱0.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label">Quantity</label>
                            <input type="number" class="form-control" name="prescriptions[${prescriptionCounter-1}][quantity]" id="quantity_${prescriptionId}" placeholder="e.g., 20" min="1" value="1" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Total Cost</label>
                            <input type="text" class="form-control" id="totalCost_${prescriptionId}" readonly>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Packaging Unit</label>
                            <select class="form-select" name="prescriptions[${prescriptionCounter-1}][packaging_unit]" id="packaging_${prescriptionId}" required>
                                <option value="tablet">Tablet</option>
                                <option value="capsule">Capsule</option>
                                <option value="ml">ml (Liquid)</option>
                                <option value="mg">mg (Powder)</option>
                                <option value="piece">Piece</option>
                                <option value="blister pack">Blister Pack</option>
                                <option value="box">Box</option>
                                <option value="bottle">Bottle</option>
                                <option value="tube">Tube</option>
                                <option value="vial">Vial</option>
                                <option value="sachet">Sachet</option>
                                <option value="strip">Strip</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Frequency</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][frequency]" id="frequency_${prescriptionId}" placeholder="e.g., Every 8 hours" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Duration</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][duration]" id="duration_${prescriptionId}" placeholder="e.g., 7 days" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Instructions</label>
                            <input type="text" class="form-control" name="prescriptions[${prescriptionCounter-1}][instructions]" id="instructions_${prescriptionId}" placeholder="e.g., Take with food">
                        </div>
                    </div>
                </div>
            </div>
        `;
        prescriptionsContainer.insertAdjacentHTML('beforeend', prescriptionHtml);

        // Load medicines for this prescription with search functionality
        loadMedicinesForPrescription(prescriptionId);

                // Setup quantity listener for cost calculation
        setupQuantityListener(prescriptionId);
    }

    // Add lab request field
    function addLabRequestField() {
        const labRequestId = `lab_request_${labRequestCounter++}`;
        const labRequestHtml = `
            <div class="card border mb-3" id="${labRequestId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0 text-info">Lab Test ${labRequestCounter}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeLabRequest('${labRequestId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label">Test Type</label>
                            <select class="form-select" name="lab_requests[${labRequestCounter-1}][lab_test_type_id]">
                                <option value="">Select test type</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Request Notes</label>
                            <input type="text" class="form-control" name="lab_requests[${labRequestCounter-1}][request_text]" placeholder="Reason for test">
                        </div>
                    </div>
                </div>
            </div>
        `;
        labRequestsContainer.insertAdjacentHTML('beforeend', labRequestHtml);

        // Load lab test types for this request
        loadLabTestTypesForRequest(labRequestId);
    }

            // Load medicines for prescription searchable input
    async function loadMedicinesForPrescription(prescriptionId) {
        try {
            const res = await axios.get(`${medicinesApi}?operation=getAll`);
            if (res.data && (res.data.success || Array.isArray(res.data.data) || Array.isArray(res.data.medicines))) {
                const list = res.data.medicines || res.data.data || [];

                // Store medicines globally for search functionality
                if (!window.availableMedicines) {
                    window.availableMedicines = list;
                }

                // Setup searchable medicine input
                setupSearchableMedicineInput(prescriptionId, list);
            }
        } catch (e) { console.error(e); }
    }

            // Function to setup searchable medicine input
    function setupSearchableMedicineInput(prescriptionId, medicines) {
        const searchInput = document.getElementById(`medicineSearch_${prescriptionId}`);
        const hiddenInput = document.getElementById(`medicineId_${prescriptionId}`);
        const dropdown = document.getElementById(`medicineDropdown_${prescriptionId}`);

        if (!searchInput || !hiddenInput || !dropdown) return;

        // Show dropdown on focus
        searchInput.addEventListener('focus', function() {
            if (this.value.length > 0) {
                showMedicineDropdown(prescriptionId, medicines, this.value);
            }
        });

        // Handle input changes
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            if (searchTerm.length > 0) {
                showMedicineDropdown(prescriptionId, medicines, searchTerm);
            } else {
                hideMedicineDropdown(prescriptionId);
                hiddenInput.value = '';
                hideMedicineDetails(prescriptionId);
                // Clear the search input if it's empty
                this.value = '';
            }
        });

        // Handle clicks outside to close dropdown
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                hideMedicineDropdown(prescriptionId);
            }
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideMedicineDropdown(prescriptionId);
                this.blur();
            }
        });
    }

    // Function to show medicine dropdown with filtered results
    function showMedicineDropdown(prescriptionId, medicines, searchTerm) {
        const dropdown = document.getElementById(`medicineDropdown_${prescriptionId}`);
        const searchInput = document.getElementById(`medicineSearch_${prescriptionId}`);

        if (!dropdown || !searchInput) return;

        // Filter medicines based on search term
        const filteredMedicines = medicines.filter(medicine =>
            medicine.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            medicine.strength.toLowerCase().includes(searchTerm.toLowerCase()) ||
            medicine.form_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Populate dropdown
        dropdown.innerHTML = '';

        if (filteredMedicines.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item text-muted';
            noResults.style.padding = '8px 12px';
            noResults.style.fontStyle = 'italic';
            noResults.textContent = 'No medicines found';
            dropdown.appendChild(noResults);
            return;
        }

        filteredMedicines.forEach(medicine => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.style.cursor = 'pointer';
            item.style.padding = '8px 12px';
            item.style.borderBottom = '1px solid #f0f0f0';
            item.innerHTML = `${medicine.generic_name} - ${medicine.strength} ${medicine.form_name}`;

            // Add hover effect
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8f9fa';
            });

            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });

            item.addEventListener('click', function() {
                selectMedicine(prescriptionId, medicine);
            });

            dropdown.appendChild(item);
        });

        // Show dropdown
        dropdown.style.display = 'block';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.zIndex = '1000';
    }

    // Function to hide medicine dropdown
    function hideMedicineDropdown(prescriptionId) {
        const dropdown = document.getElementById(`medicineDropdown_${prescriptionId}`);
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Function to select a medicine
    function selectMedicine(prescriptionId, medicine) {
        const searchInput = document.getElementById(`medicineSearch_${prescriptionId}`);
        const hiddenInput = document.getElementById(`medicineId_${prescriptionId}`);

        if (searchInput && hiddenInput) {
            searchInput.value = `${medicine.generic_name} - ${medicine.strength} ${medicine.form_name}`;
            hiddenInput.value = medicine.medicine_id;

            // Hide dropdown
            hideMedicineDropdown(prescriptionId);

            // Show medicine details
            showMedicineDetails(prescriptionId, medicine);

            // Use existing packaging options and apply unit multipliers client-side
        }
    }

    // Function to filter medicine options based on search term
    function filterMedicineOptions(selectElement, medicines, searchTerm) {
        if (!selectElement) return;

        const filteredMedicines = medicines.filter(medicine =>
            medicine.generic_name.toLowerCase().includes(searchTerm) ||
            medicine.strength.toLowerCase().includes(searchTerm) ||
            medicine.form_name.toLowerCase().includes(searchTerm)
        );

        populateMedicineOptions(selectElement, filteredMedicines);
    }

    // Function to show medicine details
    function showMedicineDetails(prescriptionId, medicine) {
        const detailsDiv = document.getElementById(`medicineDetails_${prescriptionId}`);
        const genericNameSpan = document.getElementById(`genericName_${prescriptionId}`);
        const strengthSpan = document.getElementById(`strength_${prescriptionId}`);
        const formSpan = document.getElementById(`form_${prescriptionId}`);
        const priceSpan = document.getElementById(`price_${prescriptionId}`);

        if (detailsDiv && genericNameSpan && strengthSpan && formSpan && priceSpan) {
            genericNameSpan.textContent = medicine.generic_name || '-';
            strengthSpan.textContent = medicine.strength || '-';
            formSpan.textContent = medicine.form_name || '-';
            priceSpan.textContent = `₱${parseFloat(medicine.price || 0).toFixed(2)}`;

            detailsDiv.style.display = 'block';

            // Update total cost calculation
            updateTotalCost(prescriptionId);
        }
    }

    // Function to hide medicine details
    function hideMedicineDetails(prescriptionId) {
        const detailsDiv = document.getElementById(`medicineDetails_${prescriptionId}`);
        if (detailsDiv) {
            detailsDiv.style.display = 'none';
        }
    }

            // Function to update total cost
    function updateTotalCost(prescriptionId) {
        const quantityInput = document.getElementById(`quantity_${prescriptionId}`);
        const totalCostDisplay = document.getElementById(`totalCost_${prescriptionId}`);
        const hiddenInput = document.getElementById(`medicineId_${prescriptionId}`);
        const packagingUnitSelect = document.getElementById(`packaging_${prescriptionId}`);

        if (quantityInput && totalCostDisplay && hiddenInput && hiddenInput.value) {
            const quantity = parseInt(quantityInput.value) || 1;

            // Find the selected medicine from available medicines
            const selectedMedicine = window.availableMedicines.find(m => m.medicine_id == hiddenInput.value);

            if (selectedMedicine) {
                const unitPrice = parseFloat(selectedMedicine.price || 0);

                // Apply packaging unit multiplier
                let multiplier = 1.0;
                if (packagingUnitSelect) {
                    const unit = packagingUnitSelect.value;
                    switch (unit) {
                        case 'box':
                            multiplier = 1.20; // 20% markup
                            break;
                        case 'bottle':
                            multiplier = 1.15; // 15% markup
                            break;
                        case 'blister pack':
                        case 'strip':
                            multiplier = 1.10; // 10% markup
                            break;
                        case 'sachet':
                            multiplier = 1.05; // 5% markup
                            break;
                        case 'vial':
                            multiplier = 1.15; // 15% markup
                            break;
                        case 'tube':
                            multiplier = 1.10; // 10% markup
                            break;
                        default:
                            multiplier = 1.0;
                    }
                }

                const totalCost = quantity * unitPrice * multiplier;
                totalCostDisplay.value = `₱${totalCost.toFixed(2)}`;
            } else {
                totalCostDisplay.value = '₱0.00';
            }
        } else {
            totalCostDisplay.value = '₱0.00';
        }
    }



    // Setup quantity and packaging unit listeners for cost calculation
    function setupQuantityListener(prescriptionId) {
        const quantityInput = document.getElementById(`quantity_${prescriptionId}`);
        const packagingUnitSelect = document.getElementById(`packaging_${prescriptionId}`);

        if (quantityInput) {
            quantityInput.addEventListener('input', function() {
                updateTotalCost(prescriptionId);
            });
        }

        if (packagingUnitSelect) {
            packagingUnitSelect.addEventListener('change', function() {
                updateTotalCost(prescriptionId);
            });
        }
    }

    // Note: No packaging config table available; using unit multipliers defined above

    // This function is no longer needed as dosage field has been removed
    // async function loadDosagesForPrescription(prescriptionId) {
    //     try {
    //         const res = await axios.get(`${medicinesApi}?operation=getMedicineWeights`);
    //         const list = res.data?.weights || [];
    //         const select = document.querySelector(`#${prescriptionId} select[name*="[dosage]"]`);
    //         if (!select) return;
    //         select.innerHTML = '<option value="">Select dosage</option>';
    //         list.forEach(w => {
    //         const opt = document.createElement('option');
    //         opt.value = w.weight_value;
    //         opt.textContent = w.weight_value;
    //         select.appendChild(opt);
    //         });
    //     } catch (e) { console.error(e); }
    // }

    // Load lab test types for lab request dropdown
    async function loadLabTestTypesForRequest(labRequestId) {
        try {
            const res = await axios.get(`${labTestTypesApi}?operation=getAll`);
            if (res.data && (res.data.success || Array.isArray(res.data.types) || Array.isArray(res.data.data))) {
                const select = document.querySelector(`#${labRequestId} select[name*="[lab_test_type_id]"]`);
                const list = res.data.types || res.data.data || [];
                list.forEach(testType => {
                    const opt = document.createElement('option');
                    opt.value = testType.lab_test_type_id;
                    opt.textContent = testType.type_name;
                    select.appendChild(opt);
                });
            }
        } catch (e) { console.error(e); }
    }

    // Remove prescription field
    window.removePrescription = function(prescriptionId) {
        document.getElementById(prescriptionId).remove();
    };

    // Remove lab request field
    window.removeLabRequest = function(labRequestId) {
        document.getElementById(labRequestId).remove();
    };

    // Add lab result field
    function addLabResultField() {
        const labResultId = `lab_result_${labResultCounter++}`;
        const labResultHtml = `
            <div class="card border mb-3" id="${labResultId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0 text-success">Lab Result ${labResultCounter}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeLabResult('${labResultId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label">Lab Request</label>
                            <select class="form-select" name="lab_results[${labResultCounter-1}][lab_request_id]" required>
                                <option value="">Select lab request</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Result Status</label>
                            <select class="form-select" name="lab_results[${labResultCounter-1}][status_id]" required>
                                <option value="15">Ready</option>
                                <option value="16">Delivered</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Result Text</label>
                            <textarea class="form-control" name="lab_results[${labResultCounter-1}][result_text]" rows="3" placeholder="Enter lab result details, findings, values, etc." required></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
        labResultsContainer.insertAdjacentHTML('beforeend', labResultHtml);

        // Load lab requests for this result
        loadLabRequestsForResult(labResultId);
    }

    // Load lab requests for lab result dropdown
    async function loadLabRequestsForResult(labResultId) {
        try {
            const docId = await getDoctorId();
            if (!docId) return;

            const res = await axios.get(`${baseApiUrl}/lab_requests.php?operation=get_by_doctor&doctor_id=${docId}`);
            const select = document.querySelector(`#${labResultId} select[name*="[lab_request_id]"]`);

            if (res.data.success && Array.isArray(res.data.requests)) {
                res.data.requests.forEach(request => {
                    const opt = document.createElement('option');
                    opt.value = request.lab_request_id;
                    opt.textContent = `${request.type_name} - ${request.patient_name} (${request.request_date})`;
                    opt.dataset.patientId = request.patient_id;
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.error('Error loading lab requests for result:', e);
        }
    }

    // Remove lab result field
    window.removeLabResult = function(labResultId) {
        document.getElementById(labResultId).remove();
    };

    // Load consultations for the doctor
    async function loadMyConsultations() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }

            const res = await axios.get(`${integratedConsultationApi}?operation=get_by_doctor&doctor_id=${docId}`);
            consultationsTableBody.innerHTML = '';

            if (res.data.success && Array.isArray(res.data.data)) {
                res.data.data.forEach(c => {
                    // Format diagnosis to show multiple conditions as badges
                    const diagnosisDisplay = c.diagnosis ?
                        c.diagnosis.split(', ').map(condition =>
                            `<span class="badge bg-primary me-1">${condition}</span>`
                        ).join('') : 'None';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${c.patient_name}</td>
                        <td>${c.appointment_date} (Q#${c.queue_number || 'N/A'})</td>
                        <td>${diagnosisDisplay}</td>
                        <td><span class="badge bg-${getStatusBadgeClass(c.consultation_status)}">${c.consultation_status}</span></td>
                        <td>${c.next_appointment_date || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewConsultationDetails(${c.consultation_id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="editConsultation(${c.consultation_id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    `;
                    consultationsTableBody.appendChild(tr);
                });
            } else {
                consultationsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No consultations yet</td></tr>';
            }
        } catch (e) {
            console.error(e);
            consultationsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load</td></tr>';
        }
    }

    // Get status badge class
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Active': return 'primary';
            case 'Completed': return 'success';
            case 'Follow-up Required': return 'warning';
            default: return 'secondary';
        }
    }

    // Load current queue status for the doctor (using enhanced queue management)
    async function loadQueueStatus() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }

            const res = await axios.get(`${enhancedQueueApi}?operation=get_doctor_queue_status&doctor_id=${docId}`);
            if (res.data.success) {
                const data = res.data;

                // Update queue numbers
                currentQueueNumber.textContent = data.current_consultation ? data.current_consultation.queue_number : '-';
                nextQueueNumber.textContent = data.next_in_queue ? data.next_in_queue.queue_number : '-';

                // Count completed appointments
                const completed = data.all_appointments.filter(apt => apt.appointment_status === 'Completed').length;
                completedCount.textContent = completed;

                // Display current patient info
                if (data.current_consultation) {
                    currentPatientInfo.innerHTML = `
                        <div class="alert alert-primary mb-0">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-user-md fa-2x me-3 text-primary"></i>
                                <div>
                                    <h6 class="mb-1">Currently in Consultation</h6>
                                    <p class="mb-0"><strong>${data.current_consultation.patient_name}</strong> - Queue #${data.current_consultation.queue_number}</p>
                                </div>
                                <div class="ms-auto">
                                    <button class="btn btn-success btn-sm" onclick="completeConsultation(${data.current_consultation.appointment_id})">
                                        <i class="fas fa-check me-2"></i>Complete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (data.next_in_queue) {
                    currentPatientInfo.innerHTML = `
                        <div class="alert alert-warning mb-0">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-clock fa-2x me-3 text-warning"></i>
                                <div>
                                    <h6 class="mb-1">Next Patient Ready</h6>
                                    <p class="mb-0"><strong>${data.next_in_queue.patient_name}</strong> - Queue #${data.next_in_queue.queue_number}</p>
                                </div>
                                <div class="ms-auto">
                                    <button class="btn btn-primary btn-sm" onclick="startConsultation(${data.next_in_queue.appointment_id})">
                                        <i class="fas fa-play me-2"></i>Start Consultation
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    currentPatientInfo.innerHTML = `
                        <div class="alert alert-info mb-0">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-info-circle fa-2x me-3 text-info"></i>
                                <div>
                                    <h6 class="mb-1">No Active Patients</h6>
                                    <p class="mb-0">All consultations completed for today</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error('Failed to load queue status:', e);
            currentPatientInfo.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load queue status
                </div>
            `;
        }
    }

    // Start consultation function (global scope for onclick)
    window.startConsultation = async function(appointmentId) {
        try {
            const docId = await getDoctorId();
            const res = await axios.post(enhancedQueueApi, {
                operation: 'set_current_consultation',
                json: JSON.stringify({ appointment_id: appointmentId, secretary_id: docId })
            });

            if (res.data.success) {
                Swal.fire('Success', 'Consultation started!', 'success');
                loadQueueStatus();
            } else {
                Swal.fire('Error', res.data.message || 'Failed to start consultation', 'error');
            }
        } catch (e) {
            console.error('Failed to start consultation:', e);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    // Complete consultation function (global scope for onclick)
    window.completeConsultation = async function(appointmentId) {
        try {
            const docId = await getDoctorId();
            const res = await axios.post(enhancedQueueApi, {
                operation: 'complete_and_next',
                json: JSON.stringify({ secretary_id: docId })
            });

            if (res.data.success) {
                Swal.fire('Success', 'Consultation completed!', 'success');
                loadQueueStatus();
            } else {
                Swal.fire('Error', res.data.message || 'Failed to complete consultation', 'error');
            }
        } catch (e) {
            console.error('Failed to complete consultation:', e);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    // View consultation details
    window.viewConsultationDetails = async function(consultationId) {
        try {
            const res = await axios.get(`${integratedConsultationApi}?operation=get_details&consultation_id=${consultationId}`);
            if (res.data.success) {
                const data = res.data;

                let prescriptionsHtml = '';
                if (data.prescriptions && data.prescriptions.length > 0) {
                    prescriptionsHtml = '<h6>Prescriptions:</h6><ul>';
                    data.prescriptions.forEach(p => {
                        // Calculate cost on-the-fly for display
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

                        const packagingDisplay = p.packaging_name || p.packaging_unit || 'units';
                        prescriptionsHtml += `<li><strong>${p.generic_name}</strong> - ${p.quantity || 'N/A'} ${packagingDisplay}, ${p.frequency}, ${p.duration} (Estimated Cost: ₱${totalCost.toFixed(2)})</li>`;
                    });
                    prescriptionsHtml += '</ul>';
                }

                let labRequestsHtml = '';
                if (data.lab_requests && data.lab_requests.length > 0) {
                    labRequestsHtml = '<h6>Lab Requests:</h6><ul>';
                    data.lab_requests.forEach(l => {
                        labRequestsHtml += `<li><strong>${l.type_name}</strong> - ${l.request_text}</li>`;
                    });
                    labRequestsHtml += '</ul>';
                }

                // Format diagnosis to show multiple conditions nicely
                const diagnosisDisplay = data.consultation.diagnosis ?
                    data.consultation.diagnosis.split(', ').map(condition =>
                        `<span class="badge bg-primary me-1">${condition}</span>`
                    ).join('') : 'None';

                Swal.fire({
                    title: 'Consultation Details',
                    html: `
                        <div class="container-fluid text-start">
                          <div class="row g-3">
                            <div class="col-md-6">
                              <p><strong>Patient:</strong> ${data.consultation.patient_name}</p>
                              <p><strong>Date:</strong> ${data.consultation.appointment_date}</p>
                              <p><strong>Conditions:</strong> ${diagnosisDisplay}</p>
                              <p><strong>Symptoms:</strong> ${data.consultation.symptoms_text || '—'}</p>
                              <p><strong>Final Diagnosis:</strong> ${data.consultation.final_diagnosis || '—'}</p>
                              <p><strong>Notes:</strong> ${data.consultation.consultation_notes || 'None'}</p>
                              <p><strong>Next Appointment:</strong> ${data.consultation.next_appointment_date || 'None'}</p>
                              <p><strong>Follow-up Notes:</strong> ${data.consultation.next_appointment_notes || 'None'}</p>
                              ${prescriptionsHtml}
                            </div>
                            <div class="col-md-6">
                              <p class="mb-1"><strong>History</strong></p>
                              <p class="mb-1"><strong>Present Illness:</strong> ${data.consultation.present_illness || '—'}</p>
                              <p class="mb-1"><strong>PMH:</strong> ${data.consultation.past_medical_history || '—'}</p>
                              <p class="mb-1"><strong>PSH:</strong> ${data.consultation.past_surgical_history || '—'}</p>
                              <p class="mb-1"><strong>Family:</strong> ${data.consultation.family_history || '—'}</p>
                              <p class="mb-3"><strong>Social:</strong> ${data.consultation.social_history || '—'}</p>
                              <p class="mb-1"><strong>Smoking:</strong> ${(data.consultation.smoking_status || 'No')} ${data.consultation.smoking_packs_per_day ? `(Packs/Day: ${data.consultation.smoking_packs_per_day})` : ''}</p>
                              <p class="mb-1"><strong>Alcohol:</strong> ${(data.consultation.alcohol_use || 'No')} ${data.consultation.alcohol_frequency ? `(Frequency: ${data.consultation.alcohol_frequency})` : ''}</p>
                              <p class="mb-3"><strong>Drugs:</strong> ${(data.consultation.drug_use || 'No')} ${data.consultation.drug_type ? `(Type: ${data.consultation.drug_type})` : ''}</p>
                              <p class="mb-1"><strong>Vitals</strong></p>
                              <p class="mb-1"><strong>BP:</strong> ${data.consultation.blood_pressure_mmHg || '—'}</p>
                              <p class="mb-1"><strong>HR:</strong> ${data.consultation.heart_rate_bpm ? data.consultation.heart_rate_bpm + ' bpm' : '—'}</p>
                              <p class="mb-1"><strong>SpO₂:</strong> ${data.consultation.spo2_percent ? data.consultation.spo2_percent + ' %' : '—'}</p>
                              <p class="mb-1"><strong>Height:</strong> ${data.consultation.height_cm ? data.consultation.height_cm + ' cm' : '—'}</p>
                              <p class="mb-3"><strong>Weight:</strong> ${data.consultation.weight_kg ? data.consultation.weight_kg + ' kg' : '—'}</p>
                              ${labRequestsHtml}
                            </div>
                          </div>
                        </div>
                    `,
                    width: '900px'
                });
            }
        } catch (e) {
            console.error('Failed to load consultation details:', e);
            Swal.fire('Error', 'Failed to load consultation details', 'error');
        }
    };

    // Edit consultation - open review modal populated with details
    window.editConsultation = async function(consultationId) {
        try {
            const res = await axios.get(`${integratedConsultationApi}?operation=get_details&consultation_id=${consultationId}`);
            if (!res.data?.success) {
                Swal.fire('Error', res.data?.message || 'Failed to load consultation', 'error');
                return;
            }

            const c = res.data.consultation;
            document.getElementById('review_consultation_id').value = consultationId;
            document.getElementById('review_symptoms_text').value = c.symptoms_text || '';
            document.getElementById('review_final_diagnosis').value = c.final_diagnosis || '';
            document.getElementById('review_consultation_notes').value = c.consultation_notes || '';

            const vh = document.getElementById('reviewVitalsHistory');
            if (vh) {
                vh.innerHTML = `
                    <div class="mt-3">
                        <strong>Vitals:</strong>
                        <div>BP: ${c.blood_pressure_mmHg || '—'}, HR: ${c.heart_rate_bpm || '—'} bpm, SpO₂: ${c.spo2_percent || '—'}%, H: ${c.height_cm || '—'} cm, W: ${c.weight_kg || '—'} kg</div>
                        <strong>History:</strong>
                        <div>Present Illness: ${c.present_illness || '—'}</div>
                        <div>PMH: ${c.past_medical_history || '—'}</div>
                        <div>PSH: ${c.past_surgical_history || '—'}</div>
                        <div>Family: ${c.family_history || '—'}</div>
                        <div>Social: ${c.social_history || '—'}</div>
                    </div>
                `;
            }

            const modal = new bootstrap.Modal(document.getElementById('reviewConsultationModal'));
            modal.show();
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to load consultation details', 'error');
        }
    };

    // Save review changes
    document.getElementById('saveReviewBtn').addEventListener('click', async () => {
        const consultationId = document.getElementById('review_consultation_id').value;
        if (!consultationId) return;

        const payload = {
            consultation_id: consultationId,
            consultation_notes: document.getElementById('review_consultation_notes').value || '',
            symptoms_text: document.getElementById('review_symptoms_text').value || null,
            final_diagnosis: document.getElementById('review_final_diagnosis').value || null,
        };

        // Keep existing mandatory fields to satisfy update API
        // Fetch the latest for diagnosis and status so we don't clear them
        try {
            const detail = await axios.get(`${integratedConsultationApi}?operation=get_details&consultation_id=${consultationId}`);
            if (detail.data?.success) {
                payload.diagnosis = detail.data.consultation.diagnosis || '';
                payload.next_appointment_date = detail.data.consultation.next_appointment_date || null;
                payload.next_appointment_notes = detail.data.consultation.next_appointment_notes || '';
                payload.consultation_status = detail.data.consultation.consultation_status || 'Completed';

                // Also include vitals/history to avoid clearing on upsert (API tolerates nulls, but safe to pass current)
                const c = detail.data.consultation;
                payload.present_illness = c.present_illness || null;
                payload.past_medical_history = c.past_medical_history || null;
                payload.past_surgical_history = c.past_surgical_history || null;
                payload.family_history = c.family_history || null;
                payload.social_history = c.social_history || null;
                payload.smoking_status = c.smoking_status || null;
                payload.smoking_packs_per_day = c.smoking_packs_per_day || null;
                payload.alcohol_use = c.alcohol_use || null;
                payload.alcohol_frequency = c.alcohol_frequency || null;
                payload.drug_use = c.drug_use || null;
                payload.drug_type = c.drug_type || null;
                payload.sexual_activity = c.sexual_activity || null;
                payload.current_medications = c.current_medications || null;
                payload.height_cm = c.height_cm || null;
                payload.weight_kg = c.weight_kg || null;
                payload.blood_pressure_mmHg = c.blood_pressure_mmHg || null;
                payload.heart_rate_bpm = c.heart_rate_bpm || null;
                payload.spo2_percent = c.spo2_percent || null;
            }
        } catch {}

        try {
            const form = new FormData();
            form.append('operation', 'update');
            form.append('json', JSON.stringify(payload));
            const res = await axios.post(integratedConsultationApi, form);
            if (res.data?.success) {
                Swal.fire('Saved', 'Consultation updated.', 'success');
                bootstrap.Modal.getInstance(document.getElementById('reviewConsultationModal'))?.hide();
                await loadMyConsultations();
            } else {
                Swal.fire('Error', res.data?.message || 'Failed to update', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to update', 'error');
        }
    });

    // Event listeners
    addPrescriptionBtn.addEventListener('click', addPrescriptionField);
    addLabRequestBtn.addEventListener('click', addLabRequestField);
    document.getElementById('addLabResultBtn').addEventListener('click', addLabResultField);
    refreshQueueBtn?.addEventListener('click', loadCurrentQueueStatus);

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Check if there's a current patient
        if (!patientIdInput.value || !appointmentIdInput.value) {
            Swal.fire('Error', 'No patient currently in consultation. Please wait for the secretary to start a consultation.', 'error');
            return;
        }

        const docId = await getDoctorId();
        if (!docId) {
            Swal.fire('Error', 'Doctor profile not found.', 'error');
            return;
        }

        // Validate conditions first
        const conditionValidation = validateConditions();
        if (!conditionValidation.valid) {
            Swal.fire('Error', conditionValidation.message, 'error');
            return;
        }

        const formData = new FormData(form);
        const data = {
            appointment_id: formData.get('appointment_id'),
            doctor_id: docId,
            patient_id: formData.get('patient_id'),
            diagnosis: selectedConditions.join(', '), // Join multiple conditions with comma
            conditions: selectedConditions, // Also send as array for backend processing
            consultation_notes: formData.get('consultation_notes') || '',
            symptoms_text: formData.get('symptoms_text') || null,
            final_diagnosis: (formData.get('final_diagnosis') || '').trim() || null,
            // History fields
            present_illness: formData.get('present_illness') || null,
            past_medical_history: formData.get('past_medical_history') || null,
            past_surgical_history: formData.get('past_surgical_history') || null,
            family_history: formData.get('family_history') || null,
            social_history: formData.get('social_history') || null,
            smoking_status: formData.get('smoking_status') || null,
            smoking_packs_per_day: formData.get('smoking_packs_per_day') || null,
            alcohol_use: formData.get('alcohol_use') || null,
            alcohol_frequency: formData.get('alcohol_frequency') || null,
            drug_use: formData.get('drug_use') || null,
            drug_type: formData.get('drug_type') || null,
            sexual_activity: formData.get('sexual_activity') || null,
            current_medications: formData.get('current_medications') || null,
            // Vitals
            height_cm: formData.get('height_cm') || null,
            weight_kg: formData.get('weight_kg') || null,
            blood_pressure_mmHg: formData.get('blood_pressure_mmHg') || null,
            heart_rate_bpm: formData.get('heart_rate_bpm') || null,
            spo2_percent: formData.get('spo2_percent') || null,
            next_appointment_date: formData.get('next_appointment_date') || null,
            next_appointment_notes: formData.get('next_appointment_notes') || '',
            consultation_status: 'Completed'
        };

        // Collect prescriptions
        const prescriptions = [];
        const prescriptionElements = prescriptionsContainer.querySelectorAll('.card');

        console.log('Found prescription elements:', prescriptionElements.length);

        for (let i = 0; i < prescriptionElements.length; i++) {
            const element = prescriptionElements[i];
            console.log(`Processing prescription element ${i}:`, element.id);

            // Get all required elements with null checks
            const medicineIdElement = element.querySelector('input[id*="medicineId"]');
            const quantityElement = element.querySelector('input[id*="quantity"]');
            const packagingUnitElement = element.querySelector('select[id*="packaging"]');
            const frequencyElement = element.querySelector('input[id*="frequency"]');
            const durationElement = element.querySelector('input[id*="duration"]');
            const instructionsElement = element.querySelector('input[id*="instructions"]');
            const searchInputElement = element.querySelector('input[id*="medicineSearch"]');
            const totalCostElement = element.querySelector('input[id*="totalCost"]');

            // Check if all required elements exist
            if (!medicineIdElement || !quantityElement || !packagingUnitElement ||
                !frequencyElement || !durationElement || !searchInputElement) {
                console.error('Missing required elements in prescription form', {
                    medicineIdElement: !!medicineIdElement,
                    quantityElement: !!quantityElement,
                    packagingUnitElement: !!packagingUnitElement,
                    frequencyElement: !!frequencyElement,
                    durationElement: !!durationElement,
                    searchInputElement: !!searchInputElement
                });
                continue;
            }

            // Get values
            const medicineId = medicineIdElement.value;
            const quantity = quantityElement.value;
            const packagingUnit = packagingUnitElement.value;
            const frequency = frequencyElement.value;
            const duration = durationElement.value;
            const instructions = instructionsElement ? instructionsElement.value : '';

            console.log(`Prescription ${i} values:`, {
                medicineId,
                quantity,
                packagingUnit,
                frequency,
                duration,
                instructions
            });

            // Validate that medicine is actually selected
            if (!searchInputElement.value || searchInputElement.value === 'Type to search medicines...') {
                Swal.fire('Error', 'Please select a valid medicine for all prescriptions.', 'error');
                return;
            }

                        // Check if all required fields have values
            if (medicineId && quantity && packagingUnit && frequency && duration) {
                prescriptions.push({
                    medicine_id: medicineId,
                    dosage: 'N/A', // Default value since database still requires this field
                    quantity: quantity,
                    packaging_unit: packagingUnit,
                    frequency: frequency,
                    duration: duration,
                    instructions: instructions
                });
            } else {
                Swal.fire('Error', 'Please fill in all required fields for all prescriptions.', 'error');
                return;
            }
        }

        // Require at least one prescription
        if (prescriptions.length === 0) {
            Swal.fire('Error', 'At least one prescription is required to complete the consultation.', 'error');
            return;
        }

        // Collect lab requests
        const labRequests = [];
        const labRequestElements = labRequestsContainer.querySelectorAll('.card');

        for (let i = 0; i < labRequestElements.length; i++) {
            const element = labRequestElements[i];

            // Get lab request elements with null checks
            const labTestTypeElement = element.querySelector('select[name*="[lab_test_type_id]"]');
            const requestTextElement = element.querySelector('input[name*="[request_text]"]');

            // Check if elements exist
            if (!labTestTypeElement || !requestTextElement) {
                console.error('Missing required elements in lab request form');
                continue;
            }

            const labTestTypeId = labTestTypeElement.value;
            const requestText = requestTextElement.value;

            if (labTestTypeId && requestText) {
                labRequests.push({
                    lab_test_type_id: labTestTypeId,
                    request_text: requestText
                });
            }
        }

        // Collect lab results
        const labResults = [];
        const labResultElements = document.getElementById('labResultsContainer').querySelectorAll('.card');

        for (let i = 0; i < labResultElements.length; i++) {
            const element = labResultElements[i];

            // Get lab result elements with null checks
            const labRequestIdElement = element.querySelector('select[name*="[lab_request_id]"]');
            const statusIdElement = element.querySelector('select[name*="[status_id]"]');
            const resultTextElement = element.querySelector('textarea[name*="[result_text]"]');

            // Check if elements exist
            if (!labRequestIdElement || !statusIdElement || !resultTextElement) {
                console.error('Missing required elements in lab result form');
                continue;
            }

            const labRequestId = labRequestIdElement.value;
            const statusId = statusIdElement.value;
            const resultText = resultTextElement.value;

            if (labRequestId && statusId && resultText) {
                labResults.push({
                    lab_request_id: labRequestId,
                    status_id: statusId,
                    result_text: resultText
                });
            }
        }

        // Always include prescriptions (required)
        data.prescriptions = prescriptions;

        if (labRequests.length > 0) {
            data.lab_requests = labRequests;
        }

        if (labResults.length > 0) {
            data.lab_results = labResults;
        }

        try {
            const payload = new FormData();
            payload.append('operation', 'create');
            payload.append('json', JSON.stringify(data));

            // Debug: Log the data being sent
            console.log('Sending consultation data:', data);
            console.log('FormData payload:', payload);

            const res = await axios.post(integratedConsultationApi, payload);

            // Debug: Log the API response
            console.log('API Response:', res.data);

            if (res.data.success) {
                try {
                    await Swal.fire({
                        title: 'Success',
                        text: 'Consultation completed successfully!',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });
                } catch (swalError) {
                    console.error('SweetAlert error:', swalError);
                    alert('Consultation completed successfully!');
                }

                form.reset();
                form.classList.remove('was-validated');
                prescriptionsContainer.innerHTML = '';
                labRequestsContainer.innerHTML = '';
                document.getElementById('labResultsContainer').innerHTML = '';
                prescriptionCounter = 0;
                labRequestCounter = 0;
                labResultCounter = 0;
                selectedConditions = []; // Clear selected conditions
                updateSelectedConditionsDisplay();
                loadMyConsultations();
                loadCurrentQueueStatus();
            } else {
                console.error('API Error Response:', res.data);
                const errorMessage = res.data.message || res.data.error || 'Unknown error occurred';
                Swal.fire('Error', errorMessage, 'error');
            }
        } catch (e) {
            console.error('Request failed:', e);
            console.error('Error response:', e.response?.data);
            console.error('Error status:', e.response?.status);
            console.error('Error headers:', e.response?.headers);

            let errorMessage = 'Something went wrong.';
            if (e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e.response?.data?.error) {
                errorMessage = e.response.data.error;
            } else if (e.message) {
                errorMessage = e.message;
            }

            Swal.fire('Error', errorMessage, 'error');
        }
    });

    // Set minimum date for next appointment
    const nextAppointmentDate = document.querySelector('input[name="next_appointment_date"]');
    if (nextAppointmentDate) {
        const today = new Date().toISOString().split('T')[0];
        nextAppointmentDate.min = today;
    }

    // Initial load - load queue status first to display current patient
    async function initialize() {
        // Add a small delay to ensure all scripts are loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        await loadCurrentQueueStatus();
        await loadMyConsultations();

        // Additional check to ensure form is enabled if there's a current consultation
        setTimeout(() => {
            const patientId = document.getElementById('patient_id').value;
            const appointmentId = document.getElementById('appointment_id').value;
            if (patientId && appointmentId) {
                setFormEnabled(true);
            }
        }, 500);
    }

    // Initialize after a short delay to ensure all scripts are loaded
    setTimeout(initialize, 200);

    // Set up refresh for queue status
    if (refreshQueueBtn) {
        refreshQueueBtn.addEventListener('click', async () => {
            await loadCurrentQueueStatus();
        });
    }

    // Function to load conditions from API
    async function loadConditions() {
        try {
            console.log('Loading conditions from API...');
            const response = await axios.get(`${conditionsApi}?operation=getAll`);
            console.log('Conditions API response:', response.data);

            if (response.data.success) {
                const conditionSelect = document.querySelector('select[name="diagnosis"]');
                if (conditionSelect) {
                    // Clear existing options except the first one
                    conditionSelect.innerHTML = '<option value="">Select condition</option>';

                    // Add conditions from API
                    response.data.conditions.forEach(condition => {
                        const option = document.createElement('option');
                        option.value = condition.condition_name;
                        option.textContent = condition.condition_name;
                        conditionSelect.appendChild(option);
                    });
                    console.log(`Loaded ${response.data.conditions.length} conditions`);
                }
            } else {
                console.error('API returned success=false:', response.data);
                loadFallbackConditions();
            }
        } catch (error) {
            console.error('Error loading conditions:', error);
            // Fallback to hardcoded options if API fails
            loadFallbackConditions();
        }
    }

    // Fallback function for hardcoded conditions
    function loadFallbackConditions() {
        console.log('Using fallback hardcoded conditions');
        const conditionSelect = document.querySelector('select[name="diagnosis"]');
        if (conditionSelect) {
            const fallbackConditions = [
                'Cough', 'Common Cold', 'Fever', 'Hypertension',
                'Type 2 Diabetes', 'Upper Respiratory Tract Infection',
                'Gastroenteritis', 'AGAY'
            ];

            conditionSelect.innerHTML = '<option value="">Select condition</option>';
            fallbackConditions.forEach(condition => {
                const option = document.createElement('option');
                option.value = condition;
                option.textContent = condition;
                conditionSelect.appendChild(option);
            });
        }
    }

    // Function to add new condition
    async function addNewCondition() {
        const conditionName = newConditionName.value.trim();

        if (!conditionName) {
            newConditionName.classList.add('is-invalid');
            return;
        }

        try {
            console.log('Adding condition:', conditionName);

            // Send data as URL-encoded form data instead of FormData
            const params = new URLSearchParams();
            params.append('operation', 'add');
            params.append('condition_name', conditionName);

            console.log('Sending params:', params.toString());

            const response = await axios.post(conditionsApi, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            console.log('API response:', response.data);

            if (response.data.success) {
                Swal.fire('Success', 'Condition added successfully!', 'success');

                // Clear the form
                newConditionName.value = '';
                newConditionName.classList.remove('is-invalid');

                // Hide the modal
                addConditionModal.hide();

                // Reload conditions in the dropdown
                await loadConditions();

                // Add the newly added condition to selected conditions
                if (selectedConditions.length < 5) {
                    selectedConditions.push(conditionName);
                    updateSelectedConditionsDisplay();
                } else {
                    Swal.fire('Info', 'Maximum 5 conditions reached. New condition added to dropdown but not selected.', 'info');
                }
            } else {
                throw new Error(response.data.message || 'Failed to add condition');
            }
        } catch (error) {
            console.error('Error adding condition:', error);
            console.error('Error response:', error.response?.data);
            Swal.fire('Error', error.response?.data?.message || 'Failed to add condition', 'error');
        }
    }

    // Array to store selected conditions
    let selectedConditions = [];

    // Function to update selected conditions display
    function updateSelectedConditionsDisplay() {
        const displayDiv = document.getElementById('selectedConditionsDisplay');

        if (!displayDiv) return;

        if (selectedConditions.length === 0) {
            displayDiv.innerHTML = '<small class="text-muted">No conditions selected</small>';
            return;
        }

        let html = '<div class="d-flex flex-wrap gap-2">';
        selectedConditions.forEach((condition, index) => {
            html += `
                <span class="badge bg-primary d-flex align-items-center gap-1">
                    ${condition}
                    <button type="button" class="btn-close btn-close-white" style="font-size: 0.7em;" onclick="removeCondition(${index})" title="Remove condition"></button>
                </span>
            `;
        });
        html += '</div>';

        displayDiv.innerHTML = html;
    }

    // Function to add selected condition from dropdown
    function addSelectedCondition() {
        const conditionSelect = document.getElementById('conditionSelect');
        const selectedValue = conditionSelect.value;

        if (!selectedValue) {
            Swal.fire('Warning', 'Please select a condition first', 'warning');
            return;
        }

        if (selectedConditions.length >= 5) {
            Swal.fire('Warning', 'Maximum of 5 conditions allowed', 'warning');
            return;
        }

        if (selectedConditions.includes(selectedValue)) {
            Swal.fire('Info', 'This condition is already added', 'info');
            return;
        }

        selectedConditions.push(selectedValue);
        updateSelectedConditionsDisplay();

        // Reset the dropdown selection
        conditionSelect.value = '';
    }

    // Function to remove a condition
    window.removeCondition = function(index) {
        selectedConditions.splice(index, 1);
        updateSelectedConditionsDisplay();
    };

    // Function to validate conditions
    function validateConditions() {
        if (selectedConditions.length === 0) {
            return { valid: false, message: 'Please add at least one condition.' };
        }

        if (selectedConditions.length > 5) {
            return { valid: false, message: 'Maximum of 5 conditions allowed.' };
        }

        return { valid: true };
    }

    // Load conditions for the dropdown
    loadConditions();

    // Sync quick select to free-text final diagnosis
    const finalDiagnosisSelect = document.getElementById('finalDiagnosisSelect');
    const finalDiagnosisInput = document.getElementById('finalDiagnosisInput');
    if (finalDiagnosisSelect && finalDiagnosisInput) {
        finalDiagnosisSelect.addEventListener('change', () => {
            if (finalDiagnosisSelect.value) {
                finalDiagnosisInput.value = finalDiagnosisSelect.value;
            }
        });
    }

    // Set up add condition button
    const addConditionBtn = document.getElementById('addConditionBtn');
    const addNewConditionBtn = document.getElementById('addNewConditionBtn');
    const addConditionModal = new bootstrap.Modal(document.getElementById('addConditionModal'));
    const saveConditionBtn = document.getElementById('saveConditionBtn');
    const newConditionName = document.getElementById('newConditionName');

    if (addConditionBtn) {
        addConditionBtn.addEventListener('click', () => {
            addSelectedCondition();
        });
    }

    if (addNewConditionBtn) {
        addNewConditionBtn.addEventListener('click', () => {
            addConditionModal.show();
        });
    }

    if (saveConditionBtn) {
        saveConditionBtn.addEventListener('click', async () => {
            await addNewCondition();
        });
    }
});
