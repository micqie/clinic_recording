document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  const medicineApiUrl = `${baseApiUrl}/medicines.php`;

  const tbody = document.getElementById("packagingTableBody");
  const addForm = document.getElementById("addPackagingModalForm");
  const editForm = document.getElementById("editPackagingModalForm");

  const editModal = new bootstrap.Modal(document.getElementById('editPackagingModal'));
  const addModal = new bootstrap.Modal(document.getElementById('addPackagingModal'));

  async function loadUnits() {
    try {
      const resp = await axios.get(`${medicineApiUrl}?operation=getPackagingUnits`);
      const units = resp.data.units || [];
      tbody.innerHTML = "";
      if (units.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No packaging units found</td></tr>`;
        return;
      }
      units.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.packaging_id}</td>
          <td>${u.packaging_name}</td>
          <td>${u.description || ''}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-outline-warning" data-id="${u.packaging_id}" data-name="${u.packaging_name}" data-desc="${u.description || ''}">Edit</button>
              <button type="button" class="btn btn-outline-danger" data-del="${u.packaging_id}" data-name="${u.packaging_name}">Delete</button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Failed to load packaging units</td></tr>`;
    }
  }

  tbody.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.matches('[data-id]')) {
      document.getElementById('edit_packaging_id').value = t.getAttribute('data-id');
      document.getElementById('edit_packaging_name').value = t.getAttribute('data-name');
      document.getElementById('edit_packaging_desc').value = t.getAttribute('data-desc') || '';
      editModal.show();
    }
    if (t.matches('[data-del]')) {
      const id = t.getAttribute('data-del');
      const name = t.getAttribute('data-name');
      const confirm = await Swal.fire({ icon: 'warning', title: 'Delete?', text: `Delete "${name}"?`, showCancelButton: true });
      if (!confirm.isConfirmed) return;
      try {
        const fd = new FormData();
        fd.append('operation', 'deletePackagingUnit');
        fd.append('medicine_id', id); // reuse param slot
        const resp = await axios.post(medicineApiUrl, fd);
        if (resp.data.success) {
          await loadUnits();
          Swal.fire('Deleted', 'Packaging deleted', 'success');
        } else {
          Swal.fire('Error', resp.data.message || 'Failed to delete', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Request failed', 'error');
      }
    }
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) {
      e.stopPropagation();
      addForm.classList.add('was-validated');
      return;
    }
    addForm.classList.remove('was-validated');
    const fd = new FormData(addForm);
    const json = JSON.stringify({ packaging_name: fd.get('packaging_name').toString().trim(), description: (fd.get('description')||'').toString().trim() });
    const payload = new FormData();
    payload.append('operation', 'addPackagingUnit');
    payload.append('json', json);
    try {
      const resp = await axios.post(medicineApiUrl, payload);
      if (resp.data.success) {
        addModal.hide();
        addForm.reset();
        await loadUnits();
        Swal.fire('Saved', 'Packaging added', 'success');
      } else {
        Swal.fire('Error', resp.data.message || 'Failed to add', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Request failed', 'error');
    }
  });

  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editForm.checkValidity()) {
      e.stopPropagation();
      editForm.classList.add('was-validated');
      return;
    }
    editForm.classList.remove('was-validated');
    const fd = new FormData(editForm);
    const json = JSON.stringify({ packaging_id: fd.get('packaging_id'), packaging_name: fd.get('packaging_name').toString().trim(), description: (fd.get('description')||'').toString().trim() });
    const payload = new FormData();
    payload.append('operation', 'updatePackagingUnit');
    payload.append('json', json);
    try {
      const resp = await axios.post(medicineApiUrl, payload);
      if (resp.data.success) {
        editModal.hide();
        await loadUnits();
        Swal.fire('Saved', 'Packaging updated', 'success');
      } else {
        Swal.fire('Error', resp.data.message || 'Failed to update', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Request failed', 'error');
    }
  });

  loadUnits();
});
