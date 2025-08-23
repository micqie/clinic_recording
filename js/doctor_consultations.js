document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const consultationsApi = `${baseApiUrl}/consultations.php`;
    const patientsApi = `${baseApiUrl}/patients.php`;
    const appointmentsApi = `${baseApiUrl}/appointments.php`;
    const userApi = `${baseApiUrl}/user.php`;

    const form = document.getElementById('consultationForm');
    const patientSelect = document.getElementById('patient_id');
    const appointmentSelect = document.getElementById('appointment_id');
    const consultationsTableBody = document.getElementById('consultationsTableBody');

    // Check if user is logged in and is a doctor
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== 'doctor') {
        window.location.href = '../../index.html';
        return;
    }

    let doctorId = null;

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

    async function loadPatients() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }
            // Load only patients assigned to this doctor (from appointments)
            const res = await axios.get(`${appointmentsApi}?operation=get_by_doctor&doctor_id=${docId}`);
            if (res.data.success) {
                const seen = new Set();
                patientSelect.innerHTML = '<option value="">Select patient</option>';
                res.data.data.forEach(a => {
                    if (!seen.has(a.patient_id)) {
                        seen.add(a.patient_id);
                        const opt = document.createElement('option');
                        opt.value = a.patient_id;
                        opt.textContent = a.patient_name;
                        patientSelect.appendChild(opt);
                    }
                });
            }
        } catch (e) { console.error(e); }
    }

    async function loadAppointments(patientId) {
        try {
            const res = await axios.get(`${appointmentsApi}?operation=get_by_patient&patient_id=${patientId}`);
            if (res.data.success) {
                appointmentSelect.innerHTML = '<option value="">Select appointment</option>';
                res.data.data
                    .filter(a => (a.doctor_name ? true : true))
                    .forEach(a => {
                        const opt = document.createElement('option');
                        opt.value = a.appointment_id;
                        opt.textContent = `${a.appointment_date} (#${a.appointment_id})`;
                        appointmentSelect.appendChild(opt);
                    });
            }
        } catch (e) { console.error(e); }
    }

    async function loadMyConsultations() {
        try {
            const docId = await getDoctorId();
            if (!docId) {
                console.error('No doctor_id found');
                return;
            }
            const res = await axios.get(`${consultationsApi}?operation=getByDoctor&doctor_id=${docId}`);
            consultationsTableBody.innerHTML = '';
            if (res.data.success && Array.isArray(res.data.data)) {
                res.data.data.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${c.patient_name}</td>
                        <td>${c.appointment_date}</td>
                        <td>${c.summary}</td>
                        <td>${new Date(c.created_at).toLocaleString()}</td>
                    `;
                    consultationsTableBody.appendChild(tr);
                });
            } else {
                consultationsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No consultations yet</td></tr>';
            }
        } catch (e) {
            console.error(e);
            consultationsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load</td></tr>';
        }
    }

    patientSelect.addEventListener('change', (e) => {
        const pid = e.target.value;
        if (pid) loadAppointments(pid);
        else appointmentSelect.innerHTML = '<option value="">Select appointment</option>';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const docId = await getDoctorId();
        if (!docId) {
            Swal.fire('Error', 'Doctor profile not found.', 'error');
            return;
        }

        const fd = new FormData(form);
        const payload = new FormData();
        payload.append('operation', 'add');
        payload.append('json', JSON.stringify({
            patient_id: fd.get('patient_id'),
            doctor_id: docId,
            appointment_id: fd.get('appointment_id'),
            summary: fd.get('summary'),
            notes: fd.get('notes') || ''
        }));

        try {
            const res = await axios.post(consultationsApi, payload);
            if (res.data.success) {
                Swal.fire('Saved', 'Consultation saved successfully.', 'success');
                form.reset();
                form.classList.remove('was-validated');
                loadMyConsultations();
            } else {
                Swal.fire('Error', res.data.message || 'Failed to save.', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Something went wrong.', 'error');
        }
    });

    loadPatients();
    loadMyConsultations();
});
