document.addEventListener('DOMContentLoaded', () => {
    const baseApiUrl = sessionStorage.getItem('baseAPIUrl') || 'http://localhost/clinic_recording/api';
    const apiUrl = `${baseApiUrl}/lab_test_types.php`;

    const tbody = document.getElementById('labTestTypesTableBody');
    const form = document.getElementById('addTypeForm');
    const addModal = new bootstrap.Modal(document.getElementById('addTypeModal'));

    // No date display per requirement

    async function loadTypes() {
        try {
            const res = await axios.get(`${apiUrl}?operation=getAll`);
            tbody.innerHTML = '';
            const types = res.data.types || [];
            if (types.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No test types found</td></tr>';
                return;
            }
            types.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${t.type_name}</td>
                    <td>${t.description || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteType(${t.lab_test_type_id}, '${t.type_name.replace(/'/g, "&#39;")}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Failed to load</td></tr>';
        }
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        const fd = new FormData(form);
        const payload = new FormData();
        payload.append('operation', 'add');
        payload.append('json', JSON.stringify({ type_name: fd.get('type_name').trim(), description: (fd.get('description') || '').trim() }));
        try {
            const res = await axios.post(apiUrl, payload);
            if (res.data.success) {
                Swal.fire('Saved', res.data.message, 'success');
                form.reset();
                form.classList.remove('was-validated');
                addModal.hide();
                loadTypes();
            } else {
                Swal.fire('Error', res.data.message, 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    });

    window.deleteType = async (id, name) => {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Delete this test type?',
            text: name,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it'
        });
        if (!confirm.isConfirmed) return;
        try {
            const payload = new FormData();
            payload.append('operation', 'delete');
            payload.append('lab_test_type_id', id);
            const res = await axios.post(apiUrl, payload);
            if (res.data.success) {
                Swal.fire('Deleted', res.data.message, 'success');
                loadTypes();
            } else {
                Swal.fire('Error', res.data.message, 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    loadTypes();
});
