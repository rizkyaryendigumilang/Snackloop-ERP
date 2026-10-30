// ======================= 5. MANAJEMEN USER & BACKUP/RESTORE ======================= //
async function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    if(!tbody) return;
    const rows = userData.map((u) => {
        const deleteBtn = (u.username === 'admin' || u.username === 'admin_kiky') ? `<span class="text-xs opacity-40 font-semibold text-indigo-500">Utama</span>` : `<button onclick="confirmDeleteUser(${u.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>`;
        
        let roleBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium border theme-input text-slate-600 dark:text-slate-400">Viewer</span>`;
        if (u.role === 'super_admin') {
            roleBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">Owner (Super Admin)</span>`;
        } else if (u.role === 'staff_rekap') {
            roleBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Staff Rekap / Kasir</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${u.username}</td>
                <td class="p-3 border border-inherit">${roleBadge}</td>
                <td class="p-3 border border-inherit text-center">${deleteBtn}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;

    if (typeof renderAuditLogsTable === 'function') {
        renderAuditLogsTable();
    }
}

function confirmDeleteUser(id) {
    if(currentRole !== 'super_admin') return;
    const targetUser = userData.find(u => u.id === id);
    const username = targetUser ? targetUser.username : `User #${id}`;

    showConfirmModal("Konfirmasi Hapus", `Apakah Anda yakin ingin menghapus akun pengguna "${username}"?`, async () => {
        const { error } = await supabaseClient.from('users').delete().eq('id', id);
        if(error) return showNotification("Gagal", error.message, "error");

        logAuditActivity('USER_DELETE', username, `Menghapus akun pengguna: ${username} (ID: ${id})`);
        await loadDataFromCloud(); 
        renderUsers();
        showNotification("Sukses", "Akun berhasil dihapus", "success");
    });
}

document.getElementById('user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    
    const username = document.getElementById('u-name').value.trim();
    const password = document.getElementById('u-pass').value.trim();
    const role = document.getElementById('u-role')?.value || 'staff_rekap';
    
    if(!username || !password) return showNotification("Perhatian", "Username dan Password wajib diisi.", "warning");

    const { error } = await supabaseClient.from('users').insert([{ username, password, role }]);
    if(error) return showNotification("Gagal", error.message, "error");
    
    const roleLabel = role === 'staff_rekap' ? 'Staff Rekap / Kasir' : (role === 'super_admin' ? 'Owner / Super Admin' : 'Viewer');
    logAuditActivity('USER_CREATE', username, `Mendaftarkan pengguna baru: ${username} (${roleLabel})`);

    await loadDataFromCloud(); 
    renderUsers(); 
    this.reset(); 
    showNotification("Sukses", `Akun ${username} (${roleLabel}) berhasil didaftarkan!`, "success");
});

function backupDataJSON() {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const jData = typeof jastipData !== 'undefined' ? jastipData : [];
    const backupObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData, returnData, jastipData: jData, auditLogData };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `SnackLoop_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    logAuditActivity('DATA_BACKUP', `Backup-${new Date().toISOString().slice(0, 10)}`, "Mengunduh file cadangan database JSON lengkap");
    showNotification("Sukses", "File backup lokal berhasil diunduh.", "success");
}

function restoreDataJSON(event) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.transactionData) transactionData = data.transactionData;
            if (data.masterData) masterData = data.masterData;
            if (data.customerData) customerData = data.customerData;
            if (data.agentData) agentData = data.agentData;
            if (data.repackData) repackData = data.repackData;
            if (data.expenseData) expenseData = data.expenseData;
            if (data.invoiceData) invoiceData = data.invoiceData;
            if (data.priceHistoryData) priceHistoryData = data.priceHistoryData;
            if (data.returnData) returnData = data.returnData;
            if (data.jastipData && typeof jastipData !== 'undefined') jastipData = data.jastipData;
            if (data.auditLogData && Array.isArray(data.auditLogData)) auditLogData = data.auditLogData;

            saveCacheToLocal();
            renderMonthTabs();
            renderMaster();
            renderCustomer();
            renderAgents();
            renderRepackWarehouse();
            renderInvoicesTable();
            renderReturns();
            updateDashboard();
            if (typeof renderAuditLogsTable === 'function') renderAuditLogsTable();

            logAuditActivity('DATA_RESTORE', file.name, `Memulihkan database sistem dari file cadangan JSON: ${file.name}`);
            showNotification("Sukses", "Data backup berhasil dipulihkan secara penuh ke sistem!", "success");
        } catch(err) {
            console.error("Gagal restore:", err);
            showNotification("Gagal", "Format file backup JSON tidak valid.", "error");
        }
    };
    reader.readAsText(file);
}
