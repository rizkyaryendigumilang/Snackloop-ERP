// ======================= 6. MASTER & CUSTOMER (DENGAN PRICE HISTORY) ======================= //
async function renderMaster() {
    const tbody = document.getElementById('master-table-body');
    if(!tbody) return;
    const canEdit = currentRole === 'super_admin';
    const rows = masterData.map((m) => {
        const actionBtns = canEdit ? `
            <button onclick="openEditMasterModal(${m.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
            <button onclick="confirmDeleteMaster(${m.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>
        ` : `
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
        `;

        const buyPriceDisplay = canEdit ? `Rp ${m.buy.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${m.name}</td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 theme-input border rounded text-[10px] font-bold">${m.source}</span></td>
                <td class="p-3 border border-inherit">${buyPriceDisplay}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${m.sell.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${actionBtns}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function openEditMasterModal(id) {
    const item = masterData.find(m => m.id === id);
    if(!item) return;

    document.getElementById('edit-m-id').value = item.id;
    document.getElementById('edit-m-name').value = item.name;
    document.getElementById('edit-m-buy').value = item.buy.toLocaleString('id-ID');
    document.getElementById('edit-m-sell').value = item.sell.toLocaleString('id-ID');

    updateAgentDropdowns();
    document.getElementById('edit-m-source').value = item.source;

    const modal = document.getElementById('edit-master-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeEditMasterModal() {
    const modal = document.getElementById('edit-master-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

document.getElementById('edit-master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");

    const id = parseInt(document.getElementById('edit-m-id').value);
    const newName = document.getElementById('edit-m-name').value.trim();
    const newSource = document.getElementById('edit-m-source').value;
    const newBuy = getCleanNumber('edit-m-buy');
    const newSell = getCleanNumber('edit-m-sell');

    const oldItem = masterData.find(m => m.id === id);
    if(!oldItem) return;

    let priceHistoryPayload = null;
    if(oldItem.buy !== newBuy || oldItem.sell !== newSell) {
        priceHistoryPayload = {
            master_id: id,
            product_name: newName,
            old_buy: oldItem.buy,
            new_buy: newBuy,
            old_sell: oldItem.sell,
            new_sell: newSell,
            changed_by: currentUser,
            changed_at: new Date().toISOString()
        };
        priceHistoryData.unshift(priceHistoryPayload);
    }

    oldItem.name = newName;
    oldItem.source = newSource;
    oldItem.buy = newBuy;
    oldItem.sell = newSell;
    saveCacheToLocal();

    logAuditActivity('PRICE_CHANGE', newName, `Ubah master ${newName}: Beli Rp ${newBuy.toLocaleString()}, Jual Rp ${newSell.toLocaleString()}`);

    renderMaster();
    renderDropdowns();
    closeEditMasterModal();
    showNotification("Sukses", "Master produk dan riwayat harga berhasil diperbarui!", "success");

    dispatchMutation({
        type: 'UPDATE_MASTER',
        payload: {
            id,
            updates: { name: newName, source: newSource, buy: newBuy, sell: newSell },
            history: priceHistoryPayload
        }
    }, async () => {
        const { error } = await supabaseClient.from('master').update({
            name: newName, source: newSource, buy: newBuy, sell: newSell
        }).eq('id', id);
        if(error) throw error;
        if(priceHistoryPayload) {
            await supabaseClient.from('price_history').insert([priceHistoryPayload]);
        }
    });
});

function openHistoryModal(masterId) {
    const item = masterData.find(m => m.id === masterId);
    if(!item) return;

    document.getElementById('history-product-title').innerText = item.name;
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    const histories = priceHistoryData.filter(h => h.master_id === masterId).sort((a,b) => new Date(b.changed_at) - new Date(a.changed_at));

    if(histories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center opacity-60">Belum ada riwayat perubahan harga untuk produk ini.</td></tr>`;
    } else {
        const rows = histories.map(h => {
            const diff = h.new_buy - h.old_buy;
            const diffBadge = diff > 0 ? 
                `<span class="text-rose-500 font-bold">+Rp ${diff.toLocaleString()} (Naik)</span>` : 
                diff < 0 ? `<span class="text-emerald-500 font-bold">-Rp ${Math.abs(diff).toLocaleString()} (Turun)</span>` : `<span class="opacity-50">Tetap</span>`;

            return `
                <tr class="hover:bg-slate-50/50">
                    <td class="p-2.5 border border-inherit">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                    <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit">${diffBadge}</td>
                </tr>`;
        }).join('');
        tbody.innerHTML = rows;
    }

    const modal = document.getElementById('history-master-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeHistoryModal() {
    const modal = document.getElementById('history-master-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function confirmDeleteMaster(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus produk master ini?", async () => {
        const idx = masterData.findIndex(m => m.id === id);
        const item = idx !== -1 ? masterData[idx] : null;
        if(idx !== -1) masterData.splice(idx, 1);
        saveCacheToLocal();
        renderMaster();
        renderDropdowns();
        if (item) logAuditActivity('MASTER_DELETE', item.name, `Menghapus produk master: ${item.name} (${item.source})`);
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_MASTER',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('master').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

document.getElementById('master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan.", "warning");
    
    let rawName = document.getElementById('m-name').value.trim();
    let normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const source = document.getElementById('m-source').value;
    const buy = getCleanNumber('m-buy');
    const sell = getCleanNumber('m-sell');

    const tempMaster = { id: Date.now(), name: normalizedName, source, buy, sell };
    masterData.push(tempMaster);
    saveCacheToLocal();
    renderMaster();
    renderDropdowns();
    this.reset();
    showNotification("Sukses", "Master produk tersimpan", "success");

    dispatchMutation({
        type: 'INSERT_MASTER',
        payload: { name: normalizedName, source, buy, sell }
    }, async () => {
        const { data, error } = await supabaseClient.from('master').insert([{
            name: normalizedName, source, buy, sell
        }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempMaster.id = data[0].id;
    });
});

async function renderCustomer() {
    const tbody = document.getElementById('cust-table-body');
    if(!tbody) return;
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = customerData.map((c) => {
        const action = isSuperAdmin ? `<button onclick="confirmDeleteCustomer(${c.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${c.name}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">+${c.phone}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function confirmDeleteCustomer(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus pelanggan ini?", async () => {
        const idx = customerData.findIndex(c => c.id === id);
        if(idx !== -1) customerData.splice(idx, 1);
        saveCacheToLocal();
        renderCustomer();
        renderDropdowns();
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_CUSTOMER',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('customers').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

document.getElementById('cust-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    
    let rawCust = document.getElementById('cu-name').value.trim();
    let normCust = rawCust.charAt(0).toUpperCase() + rawCust.slice(1);
    let rawPhone = document.getElementById('cu-phone').value.trim().replace(/^0/, '62');

    const tempCust = { id: Date.now(), name: normCust, phone: rawPhone };
    customerData.push(tempCust);
    saveCacheToLocal();
    renderCustomer();
    renderDropdowns();
    this.reset();
    showNotification("Sukses", "Pelanggan tersimpan", "success");

    dispatchMutation({
        type: 'INSERT_CUSTOMER',
        payload: { name: normCust, phone: rawPhone }
    }, async () => {
        const { data, error } = await supabaseClient.from('customers').insert([{ name: normCust, phone: rawPhone }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempCust.id = data[0].id;
    });
});
