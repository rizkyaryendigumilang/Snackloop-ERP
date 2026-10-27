// ======================= 4. MANAJEMEN AGENT POOL ======================= //
function renderAgents() {
    const tbody = document.getElementById('agent-table-body');
    if(!tbody) return;
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = agentData.map((ag) => {
        const action = isSuperAdmin ? `<button onclick="confirmDeleteAgent(${ag.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-mono opacity-60">#${ag.id}</td>
                <td class="p-3 border border-inherit font-semibold">${ag.name}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
    updateAgentDropdowns();
}

function confirmDeleteAgent(id) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus agen ini dari pool?", async () => {
        const idx = agentData.findIndex(a => a.id === id);
        if(idx !== -1) agentData.splice(idx, 1);
        saveCacheToLocal();
        renderAgents();
        updateAgentDropdowns();
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_AGENT',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('agents').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

function updateAgentDropdowns() {
    const selects = ['m-source', 't-source', 'edit-m-source'];
    selects.forEach(selId => {
        const el = document.getElementById(selId);
        if(el) {
            const currentVal = el.value;
            let options = `<option value="" disabled selected> Pilih Agen </option>`;
            if(selId === 't-source') {
                options += `<option value="Repack">Gudang Repack</option>`;
            }
            options += agentData.map(ag => `<option value="${ag.name}">${ag.name}</option>`).join('');
            el.innerHTML = options;
            el.value = currentVal;
        }
    });
}

document.getElementById('agent-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const name = document.getElementById('ag-name').value.trim();
    if(!name) return;

    const tempAgent = { id: Date.now(), name };
    agentData.push(tempAgent);
    saveCacheToLocal();
    renderAgents();
    updateAgentDropdowns();
    this.reset();
    showNotification("Sukses", "Agen baru berhasil ditambahkan!", "success");

    dispatchMutation({
        type: 'INSERT_AGENT',
        payload: { name }
    }, async () => {
        const { data, error } = await supabaseClient.from('agents').insert([{ name }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempAgent.id = data[0].id;
    });
});
