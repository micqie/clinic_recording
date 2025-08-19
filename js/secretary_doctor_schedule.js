document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const doctorSelect = document.getElementById('scheduleDoctorSelect');
    const doctorSelectInModal = document.getElementById('scheduleDoctor');
    const tableBody = document.getElementById('doctorSchedulesTableBody');
    const refreshBtn = document.getElementById('refreshSchedulesBtn');
    const saveBtn = document.getElementById('saveScheduleBtn');

    init();

    async function init() {
        await loadDoctors();
        if (doctorSelect.value) {
            loadSchedules(doctorSelect.value);
        }
    }

    async function loadDoctors() {
        try {
            const res = await axios.get(`${baseApiUrl}/doctors.php?operation=getDoctorsWithAppointments`);
            const { success, doctors } = res.data || {};
            if (!success) throw new Error('Failed to load doctors');
            [doctorSelect, doctorSelectInModal].forEach(sel => {
                if (!sel) return;
                sel.innerHTML = '<option value="">-- Select Doctor --</option>';
                doctors.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.doctor_id;
                    opt.textContent = `${d.name} (${d.specialization_name || 'N/A'})`;
                    sel.appendChild(opt);
                });
            });
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Unable to load doctors' });
        }
    }

    async function loadSchedules(doctorId) {
        if (!doctorId) {
            tableBody.innerHTML = '';
            return;
        }
        try {
            const res = await axios.get(`${baseApiUrl}/doctors.php?operation=getSchedulesByDoctor&doctor_id=${doctorId}`);
            const { success, schedules, message } = res.data || {};
            if (!success) throw new Error(message || 'Failed to load schedules');
            renderSchedules(schedules || []);
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    }

    function renderSchedules(schedules) {
        tableBody.innerHTML = '';
        if (!schedules.length) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No schedules</td></tr>';
            return;
        }
        schedules.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dayNames[s.day_of_week]}</td>
                <td>${s.start_time.substring(0,5)}</td>
                <td>${s.end_time.substring(0,5)}</td>
                <td>${s.is_available == 1 ? '<span class="badge bg-success">Available</span>' : '<span class="badge bg-secondary">Not Available</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" data-sid="${s.schedule_id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tr.querySelector('button').addEventListener('click', () => deleteSchedule(s.schedule_id));
            tableBody.appendChild(tr);
        });
    }

    async function deleteSchedule(scheduleId) {
        if (!scheduleId) return;
        const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Delete schedule?',
            showCancelButton: true
        });
        if (!confirm.isConfirmed) return;
        try {
            const form = new FormData();
            form.append('operation', 'deleteSchedule');
            form.append('schedule_id', scheduleId);
            const res = await axios.post(`${baseApiUrl}/doctors.php`, form);
            if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
            Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
            loadSchedules(doctorSelect.value);
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    }

    refreshBtn?.addEventListener('click', () => loadSchedules(doctorSelect.value));
    doctorSelect?.addEventListener('change', () => loadSchedules(doctorSelect.value));

    saveBtn?.addEventListener('click', async () => {
        const formEl = document.getElementById('scheduleForm');
        const fd = new FormData(formEl);
        const payload = {
            doctor_id: fd.get('doctor_id'),
            day_of_week: parseInt(fd.get('day_of_week'), 10),
            start_time: fd.get('start_time'),
            end_time: fd.get('end_time'),
            is_available: parseInt(fd.get('is_available') || '1', 10)
        };
        if (!payload.doctor_id || isNaN(payload.day_of_week) || !payload.start_time || !payload.end_time) {
            Swal.fire({ icon: 'error', title: 'Please complete the form' });
            return;
        }
        try {
            const form = new FormData();
            form.append('operation', 'upsertSchedule');
            form.append('json', JSON.stringify(payload));
            const res = await axios.post(`${baseApiUrl}/doctors.php`, form);
            if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
            Swal.fire({ icon: 'success', title: 'Saved', timer: 1200, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('addScheduleModal'))?.hide();
            // keep selected doctor in both selects
            if (doctorSelect && payload.doctor_id) doctorSelect.value = payload.doctor_id;
            if (doctorSelectInModal && payload.doctor_id) doctorSelectInModal.value = payload.doctor_id;
            loadSchedules(payload.doctor_id);
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    });
});
