// ======================= 7. REPACK WAREHOUSE ======================= //
function calculateRepack() {
    const name = document.getElementById('c-name').value || 'Produk Repack';
    const price = getCleanNumber('c-price');
    const disc = getCleanNumber('c-disc');
    const fee = getCleanNumber('c-fee');
    const qty = parseInt(document.getElementById('c-qty').value) || 1;
    const plastic = getCleanNumber('c-plastic');
    const sellTarget = getCleanNumber('c-sell');

    const buyPerItem = (price - disc + fee) / qty;
    const finalModal = Math.ceil(buyPerItem + plastic);
    const estProfit = (sellTarget - finalModal) * qty;

    document.getElementById('calc-res').classList.remove('hidden');
    const isSuperAdmin = currentRole === 'super_admin';
    if (isSuperAdmin) {
        document.getElementById('res-final').innerHTML = `HPP / Modal: <b>Rp ${finalModal.toLocaleString()}</b> /pcs`;
        document.getElementById('res-profit').innerHTML = `Potensi Keuntungan Batch: <b>Rp ${estProfit.toLocaleString()}</b>`;
        document.getElementById('res-profit').style.display = 'block';
    } else {
        document.getElementById('res-final').innerHTML = `Target Output Kemasan: <b>${qty} Pcs</b>`;
        document.getElementById('res-profit').style.display = 'none';
    }

    currentRepackCalcResult = {
        id: `BATCH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().slice(0, 10),
        name, modal_per_pcs: finalModal, sell_target: sellTarget, initial_qty: qty, remaining_qty: qty
    };
    if (currentRole === 'super_admin' || currentRole === 'staff_rekap') {
        document.getElementById('btn-save-repack').classList.remove('hidden');
    }
    showNotification("Sukses", "Perhitungan batch repack berhasil!", "success");
}

async function saveToRepackWarehouse() {
    if(!currentRepackCalcResult || currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const itemToSave = { ...currentRepackCalcResult };
    repackData.push(itemToSave);
    saveCacheToLocal();
    renderRepackWarehouse();
    onSourceChange();
    logAuditActivity('REPACK_CREATE', itemToSave.id, `Membuat batch repack ${itemToSave.id}: ${itemToSave.name} (${itemToSave.initial_qty} pcs)`);
    showNotification("Sukses", "Batch masuk ke Gudang Repack", "success");

    currentRepackCalcResult = null;
    document.getElementById('btn-save-repack').classList.add('hidden');
    document.getElementById('calc-res').classList.add('hidden');
    ['c-name', 'c-price', 'c-disc', 'c-fee', 'c-qty', 'c-plastic', 'c-sell'].forEach(id => document.getElementById(id).value = '');

    dispatchMutation({
        type: 'INSERT_REPACK',
        payload: itemToSave
    }, async () => {
        const { error } = await supabaseClient.from('repack').insert([itemToSave]);
        if(error) throw error;
    });
}

function renderRepackWarehouse() {
    const tbody = document.getElementById('repack-table-body');
    if(!tbody) return;
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = repackData.map((r) => {
        const outOfStock = r.remaining_qty <= 0;
        const bgClass = outOfStock ? 'opacity-50' : 'hover:bg-slate-50/50';
        const badge = outOfStock ? `<span class="bg-rose-500/20 text-rose-500 px-2 rounded font-bold">HABIS</span>` : `<span class="font-bold text-lg text-emerald-500">${r.remaining_qty}</span>`;
        const action = isSuperAdmin ? `<button onclick="confirmDeleteRepackBatch('${r.id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        const modalDisplay = isSuperAdmin ? `Rp ${r.modal_per_pcs.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="${bgClass}">
                <td class="p-3 border border-inherit font-mono text-indigo-500 font-bold">${r.id} <br><span class="text-[9px] opacity-60">${r.date}</span></td>
                <td class="p-3 border border-inherit font-semibold">${r.name}</td>
                <td class="p-3 border border-inherit opacity-70">${modalDisplay}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${r.sell_target.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${r.initial_qty}</td>
                <td class="p-3 border border-inherit text-center">${badge}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function confirmDeleteRepackBatch(batchId) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Owner / Super Admin yang diizinkan menghapus batch.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus Batch Repack ini secara permanen?", async () => {
        const idx = repackData.findIndex(r => r.id === batchId);
        const item = idx !== -1 ? repackData[idx] : null;
        if(idx !== -1) repackData.splice(idx, 1);
        saveCacheToLocal();
        renderRepackWarehouse();
        onSourceChange();
        logAuditActivity('REPACK_DELETE', batchId, `Menghapus batch repack ${batchId} (${item?.name || ''})`);
        showNotification("Sukses", "Batch Repack berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_REPACK',
            payload: { id: batchId }
        }, async () => {
            const { error } = await supabaseClient.from('repack').delete().eq('id', batchId);
            if(error) throw error;
        });
    });
}
