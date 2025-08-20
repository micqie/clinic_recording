document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const consultationsApi = `${baseApiUrl}/consultations.php`;

    const tbody = document.getElementById('consultationsTableBody');

    async function loadConsultations() {
        try {
            const res = await axios.get(`${consultationsApi}?operation=getAll`);
            tbody.innerHTML = '';
            if (res.data.success && Array.isArray(res.data.data)) {
                res.data.data.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${c.consultation_id}</td>
                        <td>${c.patient_name}</td>
                        <td>${c.doctor_name}</td>
                        <td>${c.appointment_date}</td>
                        <td>${c.summary}</td>
                        <td>${new Date(c.created_at).toLocaleString()}</td>
                        <td>
                            <a href="secretary_lab_requests.html?consultation_id=${c.consultation_id}" class="btn btn-sm btn-primary">
                                <i class="fa-solid fa-flask me-1"></i> Proceed to Lab Request
                            </a>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No consultations found</td></tr>';
            }
        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load consultations</td></tr>';
        }
    }

    loadConsultations();
});
