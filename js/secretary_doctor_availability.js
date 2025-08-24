document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseApiUrl') || 'http://localhost/clinic_recording/api';
    const enhancedQueueApi = `${baseApiUrl}/enhanced_queue_management.php`;
    const doctorsApi = `${baseApiUrl}/doctors.php`;

    // Check if user is logged in and is a secretary
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id || user.role !== 'secretary') {
        window.location.href = '../../index.html';
        return;
    }

    // Elements
    const doctorFilter = document.getElementById('doctorFilter');
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const availabilityTableBody = document.getElementById('availabilityTableBody');
    const availabilityDoctor = document.getElementById('availabilityDoctor');
    const availabilityDate = document.getElementById('availabilityDate');
    const availabilityStatus = document.getElementById('availabilityStatus');
    const availabilityReason = document.getElementById('availabilityReason');

    // Initialize
    init();

    async function init() {
        await loadDoctors();
        await loadAvailability();
        setDefaultDate();
    }

    function setDefaultDate() {
        const today = new Date().toISOString().slice(0, 10);
        availabilityDate.value = today;
        dateFilter.value = today;
    }

    async function loadDoctors() {
        try {
            const resp = await axios.get(`${doctorsApi}?operation=getAll`);
            const doctors = resp.data.data || [];

            // Populate filter dropdown
            doctorFilter.innerHTML = '<option value="">All Doctors</option>';
            availabilityDoctor.innerHTML = '<option value="">Select Doctor</option>';

            doctors.forEach(doctor => {
                const filterOpt = document.createElement('option');
                filterOpt.value = doctor.doctor_id;
                filterOpt.textContent = doctor.doctor_name;
                doctorFilter.appendChild(filterOpt);

                const modalOpt = document.createElement('option');
                modalOpt.value = doctor.doctor_id;
                modalOpt.textContent = doctor.doctor_name;
                availabilityDoctor.appendChild(modalOpt);
            });
        } catch (error) {
            console.error('Failed to load doctors:', error);
            Swal.fire('Error', 'Failed to load doctors', 'error');
        }
    }

    async function loadAvailability() {
        try {
            availabilityTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-spinner fa-spin me-2"></i>
                        Loading availability data...
                    </td>
                </tr>
            `;

            // Get filter values
            const doctorId = doctorFilter.value;
            const date = dateFilter.value;
            const status = statusFilter.value;

            // Build query parameters
            const params = new URLSearchParams();
            if (doctorId) params.append('doctor_id', doctorId);
            if (date) params.append('date', date);
            if (status !== '') params.append('is_available', status);

            const resp = await axios.get(`${enhancedQueueApi}?operation=get_availability_list&${params.toString()}`);

            if (resp.data.success) {
                renderAvailabilityTable(resp.data.data || []);
            } else {
                throw new Error(resp.data.message || 'Failed to load availability data');
            }
        } catch (error) {
            console.error('Failed to load availability:', error);
            availabilityTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load availability data
                    </td>
                </tr>
            `;
        }
    }

    function renderAvailabilityTable(availabilityData) {
        if (availabilityData.length === 0) {
            availabilityTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-inbox me-2"></i>
                        No availability data found
                    </td>
                </tr>
            `;
            return;
        }

        availabilityTableBody.innerHTML = '';
        availabilityData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fw-semibold">${item.doctor_name}</div>
                    <small class="text-muted">ID: ${item.doctor_id}</small>
                </td>
                <td>${item.specialization_name || '-'}</td>
                <td>
                    <span class="badge bg-secondary">${item.date}</span>
                </td>
                <td>
                    ${item.is_available == 1 ?
                        '<span class="badge bg-success">Available</span>' :
                        '<span class="badge bg-danger">Not Available</span>'
                    }
                </td>
                <td>${item.reason || '-'}</td>
                <td>
                    <div>${item.created_by_name || '-'}</div>
                    <small class="text-muted">${formatDate(item.created_at)}</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editAvailability(${item.availability_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAvailability(${item.availability_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            availabilityTableBody.appendChild(tr);
        });
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Global functions
    window.saveAvailability = async function() {
        try {
            const doctorId = availabilityDoctor.value;
            const date = availabilityDate.value;
            const status = availabilityStatus.value;
            const reason = availabilityReason.value;

            if (!doctorId || !date || status === '') {
                Swal.fire('Error', 'Please fill in all required fields', 'error');
                return;
            }

            const payload = {
                doctor_id: parseInt(doctorId),
                date: date,
                is_available: parseInt(status),
                reason: reason || null,
                created_by: user.id
            };

            const resp = await axios.post(enhancedQueueApi, {
                operation: 'set_doctor_availability',
                json: JSON.stringify(payload)
            });

            if (resp.data.success) {
                Swal.fire('Success', resp.data.message, 'success');

                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('availabilityModal'));
                modal.hide();
                document.getElementById('availabilityForm').reset();
                setDefaultDate();

                // Reload data
                await loadAvailability();
            } else {
                Swal.fire('Error', resp.data.message || 'Failed to save availability', 'error');
            }
        } catch (error) {
            console.error('Failed to save availability:', error);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    window.editAvailability = async function(availabilityId) {
        try {
            // For now, we'll just show a message that editing is not implemented
            // In a full implementation, you would load the data into the modal
            Swal.fire('Info', 'Edit functionality will be implemented in the next version', 'info');
        } catch (error) {
            console.error('Failed to edit availability:', error);
            Swal.fire('Error', 'Failed to edit availability', 'error');
        }
    };

    window.deleteAvailability = async function(availabilityId) {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: "This will remove the availability setting for this doctor and date.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            });

            if (result.isConfirmed) {
                const resp = await axios.post(enhancedQueueApi, {
                    operation: 'delete_doctor_availability',
                    json: JSON.stringify({ availability_id: availabilityId })
                });

                if (resp.data.success) {
                    Swal.fire('Deleted!', 'Availability setting has been removed.', 'success');
                    await loadAvailability();
                } else {
                    Swal.fire('Error', resp.data.message || 'Failed to delete availability', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to delete availability:', error);
            Swal.fire('Error', 'Failed to delete availability', 'error');
        }
    };

    // Event listeners
    doctorFilter?.addEventListener('change', loadAvailability);
    dateFilter?.addEventListener('change', loadAvailability);
    statusFilter?.addEventListener('change', loadAvailability);

    // Modal event listeners
    document.getElementById('availabilityModal')?.addEventListener('show.bs.modal', () => {
        setDefaultDate();
    });
});
