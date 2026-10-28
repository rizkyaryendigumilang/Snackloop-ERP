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
    renderAgentPerformanceOverview();
}

function renderAgentPerformanceOverview() {
    const container = document.getElementById('agent-performance-container');
    if(!container) return;

    if(!agentData || agentData.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 text-center opacity-60 text-xs theme-card rounded-xl border">Belum ada agen/supplier yang terdaftar. Tambahkan agen baru di atas.</div>`;
        return;
    }

    // Hitung performa pasokan per agen dari seluruh data transaksi
    const statsMap = {};
    agentData.forEach(ag => {
        statsMap[ag.name] = {
            id: ag.id,
            name: ag.name,
            totalSoldQty: 0,
            totalRevenue: 0,
            totalModal: 0,
            transactionCount: 0,
            topItems: {}
        };
    });

    for(let mk in transactionData) {
        (transactionData[mk] || []).forEach(t => {
            if(t.source && statsMap[t.source]) {
                const ag = statsMap[t.source];
                ag.totalSoldQty += (t.qty || 0);
                ag.totalRevenue += (t.totalSell || 0);
                ag.totalModal += (t.totalModal || 0);
                ag.transactionCount += 1;
                ag.topItems[t.itemName] = (ag.topItems[t.itemName] || 0) + (t.qty || 0);
            }
        });
    }

    const cards = agentData.map(ag => {
        const stat = statsMap[ag.name];
        let bestItem = '-';
        let maxItemQty = 0;
        for(let itm in stat.topItems) {
            if(stat.topItems[itm] > maxItemQty) {
                maxItemQty = stat.topItems[itm];
                bestItem = `${itm} (${maxItemQty}x)`;
            }
        }

        const estProfit = stat.totalRevenue - stat.totalModal;
        const waMsg = encodeURIComponent(`Halo ${ag.name}, kami dari SnackLoop ingin menanyakan ketersediaan stok snack untuk repeat order. Terima kasih!`);

        return `
            <div class="theme-card rounded-xl border p-4 shadow-sm hover:shadow-md transition space-y-3">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            <i class="fa-solid fa-truck-ramp-box"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-xs">${ag.name}</h4>
                            <span class="text-[10px] opacity-60">ID Agen: #${ag.id}</span>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        ${stat.transactionCount} Penjualan
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-inherit">
                    <div>
                        <span class="opacity-60 block text-[10px]">Total Terjual</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${stat.totalSoldQty.toLocaleString()} pcs</span>
                    </div>
                    <div>
                        <span class="opacity-60 block text-[10px]">Omzet Pasokan</span>
                        <span class="font-bold text-emerald-600 dark:text-emerald-400">Rp ${stat.totalRevenue.toLocaleString()}</span>
                    </div>
                </div>
                <div class="text-[11px] opacity-75 truncate">
                    <span class="opacity-60 text-[10px] block">Snack Terlaris dari Agen:</span>
                    <span class="font-semibold text-indigo-500">${bestItem}</span>
                </div>
                <div class="pt-2 border-t border-inherit flex justify-between items-center gap-2">
                    <span class="text-[10px] text-slate-500 font-mono">Estimasi Margin: Rp ${estProfit.toLocaleString()}</span>
                    <button type="button" onclick="window.open('https://wa.me/?text=${waMsg}', '_blank')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <i class="fa-brands fa-whatsapp"></i> Chat Supplier
                    </button>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = cards;
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
