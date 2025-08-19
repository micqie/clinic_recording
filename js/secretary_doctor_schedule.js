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
        await loadToday();
    }

    async function loadToday() {
        try {
            const res = await axios.get(`${baseApiUrl}/doctors.php?operation=getTodayDoctorAppointments`);
            const { success, today, message } = res.data || {};
            if (!success) throw new Error(message || 'Failed to load today data');
            renderToday(today || []);
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    }

    function renderToday(rows) {
        tableBody.innerHTML = '';
        if (!rows.length) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No appointments today</td></tr>';
            return;
        }
        rows.forEach(doc => {
            const patients = doc.patients || [];
            const patientList = patients.map(p => `<li>${p.patient_name}</li>`).join('');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div>${doc.doctor_name}</div>
                    <small class="text-muted">${doc.specialization_name || ''}</small>
                </td>
                <td colspan="2">Today</td>
                <td><span class="badge bg-primary">${doc.patient_count}</span></td>
                <td>
                    ${patientList ? `<ul class="mb-0 ps-3">${patientList}</ul>` : '<span class="text-muted">No patients</span>'}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    refreshBtn?.addEventListener('click', () => loadToday());
});
