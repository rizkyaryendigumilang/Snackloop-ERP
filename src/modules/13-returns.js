// ========================================================================================= //
// ========================= MODUL RETUR BARANG & KLAIM AGEN =============================== //
// ========================================================================================= //

function setReturnStatusFilter(status) {
    currentReturnStatusFilter = status;
    const btnAll = document.getElementById('ret-filter-all');
    const btnMenunggu = document.getElementById('ret-filter-menunggu');
    const btnSelesai = document.getElementById('ret-filter-selesai');

    if (btnAll) btnAll.className = status === 'all' ? 'px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white text-xs shadow-sm' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    if (btnMenunggu) btnMenunggu.className = status === 'menunggu_agen' ? 'px-3 py-1.5 rounded-lg font-bold bg-amber-600 text-white text-xs shadow-sm' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    if (btnSelesai) btnSelesai.className = status === 'selesai' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white text-xs shadow-sm' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';

    renderReturns();
}

function renderReturns() {
    const tbody = document.getElementById('returns-table-body');
    if (!tbody) return;

    // 1. Hitung Nilai KPI
    let pendingQty = 0;
    let pendingCost = 0;
    let totalValRetur = 0;
    let resolvedQty = 0;

    const currentMonthKeyStr = getCurrentMonthKey(new Date());

    returnData.forEach(r => {
        if (r.claim_status === 'menunggu_agen') {
            pendingQty += (r.qty || 0);
            pendingCost += (r.total_modal || (r.qty * (r.buy || 0)));
        } else if (r.claim_status === 'selesai') {
            resolvedQty += (r.qty || 0);
        }
        totalValRetur += (r.total_sell || (r.qty * (r.sell || 0)));
    });

    const kpiPendingQtyEl = document.getElementById('ret-kpi-pending-qty');
    const kpiPendingCostEl = document.getElementById('ret-kpi-pending-cost');
    const kpiTotalValEl = document.getElementById('ret-kpi-total-val');
    const kpiResolvedQtyEl = document.getElementById('ret-kpi-resolved-qty');

    if (kpiPendingQtyEl) kpiPendingQtyEl.innerText = `${pendingQty.toLocaleString('id-ID')} pcs`;
    if (kpiPendingCostEl) kpiPendingCostEl.innerText = `Rp ${pendingCost.toLocaleString('id-ID')}`;
    if (kpiTotalValEl) kpiTotalValEl.innerText = `Rp ${totalValRetur.toLocaleString('id-ID')}`;
    if (kpiResolvedQtyEl) kpiResolvedQtyEl.innerText = `${resolvedQty.toLocaleString('id-ID')} pcs`;

    // 2. Update Dropdown Agen Filter
    const filterAgentEl = document.getElementById('ret-filter-agent');
    if (filterAgentEl) {
        const curVal = filterAgentEl.value || 'all';
        let opts = `<option value="all">Semua Agen</option>`;
        agentData.forEach(ag => {
            opts += `<option value="${ag.name}">${ag.name}</option>`;
        });
        filterAgentEl.innerHTML = opts;
        filterAgentEl.value = curVal;
    }

    // 3. Filter Data
    const searchVal = (document.getElementById('ret-search')?.value || '').toLowerCase();
    const selAgent = filterAgentEl ? filterAgentEl.value : 'all';

    let list = returnData.filter(r => {
        if (currentReturnStatusFilter !== 'all' && r.claim_status !== currentReturnStatusFilter) return false;
        if (selAgent !== 'all' && r.agent !== selAgent) return false;
        if (searchVal) {
            const qStr = `${r.return_code || ''} ${r.customer || ''} ${r.item_name || ''} ${r.agent || ''} ${r.reason || ''}`.toLowerCase();
            return qStr.includes(searchVal);
        }
        return true;
    });

    list.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB > dateA ? 1 : -1;
        return (b.id || 0) - (a.id || 0);
    });

    // 4. Render Tabel
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center opacity-60">Tidak ada catatan retur barang yang sesuai.</td></tr>`;
        return;
    }

    const isSuperAdmin = currentRole === 'super_admin';
    const rows = list.map(r => {
        const isMenunggu = r.claim_status === 'menunggu_agen';
        const statusBadge = isMenunggu ?
            `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">Menunggu Agen</span>` :
            `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">Selesai Klaim</span>`;

        let actionLabel = '';
        if (r.action_type === 'tukar_guling') {
            actionLabel = `<span class="font-medium text-slate-800 dark:text-slate-200">Tukar Guling</span><br><span class="text-[10px] opacity-60">Ganti Fisik Baru</span>`;
        } else if (r.action_type === 'potong_tagihan') {
            actionLabel = `<span class="font-medium text-slate-800 dark:text-slate-200">Potong Nota</span><br><span class="text-[10px] opacity-60">Kredit Saldo</span>`;
        } else {
            actionLabel = `<span class="font-medium text-slate-800 dark:text-slate-200">Beban Toko</span><br><span class="text-[10px] opacity-60">Write-Off Rugi</span>`;
        }

        const resolveBtn = isMenunggu ?
            `<button onclick="resolveReturnClaim(${r.id})" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm transition" title="Tandai Sudah Selesai Ditukar / Diklaim ke Agen"><i class="fa-solid fa-check"></i> <span>Selesai</span></button>` :
            `<span class="text-[10px] opacity-50 font-mono">${r.resolved_date ? 'Tuntas: ' + r.resolved_date : 'Tuntas'}</span>`;

        const deleteBtn = isSuperAdmin ?
            `<button onclick="confirmDeleteReturn(${r.id})" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition" title="Hapus"><i class="fa-solid fa-trash"></i></button>` : '';

        const codeDisplay = r.return_code ? `<span class="font-mono text-[10px] text-indigo-500 font-bold block">${r.return_code}</span>` : '';
        const notesDisplay = r.notes ? `<span class="text-[9px] opacity-60 block italic mt-0.5">${r.notes}</span>` : '';

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-inherit transition">
                <td class="p-3 border border-inherit">
                    ${codeDisplay}
                    <span>${r.date}</span>
                </td>
                <td class="p-3 border border-inherit font-bold text-slate-800 dark:text-slate-200">
                    ${r.customer}
                </td>
                <td class="p-3 border border-inherit">
                    <span class="font-medium">${r.item_name}</span><br>
                    <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-inherit font-semibold opacity-85">
                        <i class="fa-solid fa-truck text-[9px] mr-1 text-indigo-500"></i>${r.agent || '-'}
                    </span>
                    ${notesDisplay}
                </td>
                <td class="p-3 border border-inherit text-center">
                    <span class="font-bold text-rose-600 dark:text-rose-400 text-sm">${r.qty}</span> <span class="text-[10px] opacity-60">pcs</span>
                </td>
                <td class="p-3 border border-inherit text-xs">
                    <span class="opacity-70 text-[11px]">Modal: Rp ${(r.total_modal || (r.qty * (r.buy||0))).toLocaleString('id-ID')}</span><br>
                    <span class="font-semibold text-slate-700 dark:text-slate-300">Jual: Rp ${(r.total_sell || (r.qty * (r.sell||0))).toLocaleString('id-ID')}</span>
                </td>
                <td class="p-3 border border-inherit">
                    <span class="text-xs font-medium text-slate-700 dark:text-slate-300">${r.reason}</span>
                </td>
                <td class="p-3 border border-inherit text-xs">
                    ${actionLabel}
                </td>
                <td class="p-3 border border-inherit text-center">
                    ${statusBadge}
                </td>
                <td class="p-3 border border-inherit text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        ${resolveBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = rows;
}

function openReturnModal(prefill = null) {
    const modal = document.getElementById('modal-return');
    if (!modal) return;

    // Reset Form
    document.getElementById('return-form').reset();
    document.getElementById('ret-date').valueAsDate = new Date();
    document.getElementById('ret-ref-trx-id').value = '';

    // Populate Pelanggan Datalist
    const custListEl = document.getElementById('ret-cust-list');
    if (custListEl) {
        custListEl.innerHTML = customerData.map(c => `<option value="${c.name}">${c.name} (${c.phone || '-'})</option>`).join('');
    }

    // Populate Agen Select
    const agentSel = document.getElementById('ret-agent');
    if (agentSel) {
        let opts = `<option value="" disabled selected>Pilih Agen</option>`;
        opts += agentData.map(ag => `<option value="${ag.name}">${ag.name}</option>`).join('');
        agentSel.innerHTML = opts;
    }

    // Populate Master Products Datalist
    const masterListEl = document.getElementById('ret-master-list');
    if (masterListEl) {
        masterListEl.innerHTML = masterData.map(m => `<option value="${m.name}">${m.name} [${m.source || 'Gudang'}]</option>`).join('');
    }

    // Setup formatters
    setupCurrencyFormatter('ret-buy');
    setupCurrencyFormatter('ret-sell');

    // Apply Prefill jika dipanggil dari Buku Transaksi
    if (prefill) {
        if (prefill.date) document.getElementById('ret-date').value = prefill.date;
        if (prefill.customer) document.getElementById('ret-customer').value = prefill.customer;
        if (prefill.itemName) document.getElementById('ret-product').value = prefill.itemName;
        if (prefill.agent && agentSel) agentSel.value = prefill.agent;
        if (prefill.qty) document.getElementById('ret-qty').value = prefill.qty;
        if (prefill.buy) document.getElementById('ret-buy').value = parseInt(prefill.buy, 10).toLocaleString('id-ID');
        if (prefill.sell) document.getElementById('ret-sell').value = parseInt(prefill.sell, 10).toLocaleString('id-ID');
        if (prefill.refTrxId) document.getElementById('ret-ref-trx-id').value = prefill.refTrxId;
        if (prefill.notes) document.getElementById('ret-notes').value = prefill.notes;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeReturnModal() {
    const modal = document.getElementById('modal-return');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function onReturnProductSelect() {
    const pName = document.getElementById('ret-product').value.trim();
    if (!pName) return;

    const matched = masterData.find(m => m.name.toLowerCase() === pName.toLowerCase());
    if (matched) {
        if (matched.buy_price) {
            document.getElementById('ret-buy').value = parseInt(matched.buy_price, 10).toLocaleString('id-ID');
        }
        if (matched.sell_price) {
            document.getElementById('ret-sell').value = parseInt(matched.sell_price, 10).toLocaleString('id-ID');
        }
        if (matched.source) {
            const agentSel = document.getElementById('ret-agent');
            if (agentSel && Array.from(agentSel.options).some(o => o.value === matched.source)) {
                agentSel.value = matched.source;
            }
        }
    }
}

function openReturnModalFromTrx(trxId) {
    let foundTrx = null;
    for (let mk in transactionData) {
        const item = (transactionData[mk] || []).find(t => t.id === trxId);
        if (item) {
            foundTrx = item;
            break;
        }
    }

    if (!foundTrx) {
        return showNotification("Peringatan", "Data transaksi tidak ditemukan.", "warning");
    }

    openReturnModal({
        date: new Date().toISOString().split('T')[0],
        customer: foundTrx.customer,
        itemName: foundTrx.itemName,
        agent: foundTrx.source !== 'Repack' ? foundTrx.source : (agentData[0]?.name || ''),
        qty: 1,
        buy: foundTrx.buy,
        sell: foundTrx.sell,
        refTrxId: foundTrx.id,
        notes: `Retur dari transaksi: ${foundTrx.itemName} (${foundTrx.date})`
    });
}

function saveReturnRecord(e) {
    e.preventDefault();

    const date = document.getElementById('ret-date').value;
    const customer = document.getElementById('ret-customer').value.trim();
    const agent = document.getElementById('ret-agent').value;
    const itemName = document.getElementById('ret-product').value.trim();
    const qty = parseInt(document.getElementById('ret-qty').value, 10) || 1;
    const buy = getCleanNumber('ret-buy');
    const sell = getCleanNumber('ret-sell');
    const reason = document.getElementById('ret-reason').value;
    const actionType = document.querySelector('input[name="ret-action"]:checked')?.value || 'tukar_guling';
    const notes = document.getElementById('ret-notes').value.trim();
    const refTrxId = document.getElementById('ret-ref-trx-id').value;

    if (!date || !customer || !agent || !itemName || qty <= 0) {
        return showNotification("Peringatan", "Mohon lengkapi semua kolom wajib bertanda bintang!", "warning");
    }

    const totalModal = qty * buy;
    const totalSell = qty * sell;
    const returnId = Date.now();
    const returnCode = `RET-${date.replace(/-/g, '').slice(0, 6)}-${String(returnId).slice(-4)}`;

    const newReturn = {
        id: returnId,
        return_code: returnCode,
        date: date,
        customer: customer,
        agent: agent,
        item_name: itemName,
        qty: qty,
        buy: buy,
        sell: sell,
        total_modal: totalModal,
        total_sell: totalSell,
        reason: reason,
        action_type: actionType,
        claim_status: 'menunggu_agen',
        resolved_date: null,
        ref_trx_id: refTrxId || null,
        notes: notes
    };

    // 1. Integrasi ke Buku Transaksi (Jika Potong Tagihan atau Beban Toko)
    const monthKey = getCurrentMonthKey(new Date(date));
    if (!transactionData[monthKey]) transactionData[monthKey] = [];

    if (actionType === 'potong_tagihan') {
        const negativeTrx = {
            id: Date.now() + 1,
            date: date,
            customer: customer,
            itemName: itemName,
            source: agent,
            batch: '-',
            qty: -qty,
            buy: buy,
            extraCost: 0,
            extraCostNote: '-',
            totalModal: -totalModal,
            sell: sell,
            totalSell: -totalSell,
            status: 'Belum Lunas', // Status Belum Lunas dengan angka negatif akan otomatis memotong tagihan/hutang toko
            profitPerItem: (sell - buy),
            notes: `[RETUR] ${reason} - Ref: ${returnCode}`,
            isReturn: true,
            returnId: returnId
        };
        transactionData[monthKey].unshift(negativeTrx);

        // Background dispatch transaksi koreksi
        dispatchOutboxMutation('transactions', 'insert', {
            month_key: monthKey,
            date: date,
            customer: customer,
            item_name: itemName,
            source: agent,
            qty: -qty,
            buy: buy,
            extra_cost: 0,
            total_modal: -totalModal,
            sell: sell,
            total_sell: -totalSell,
            status: 'Belum Lunas',
            profit_per_item: (sell - buy),
            notes: `[RETUR] ${reason} - Ref: ${returnCode}`
        });

    } else if (actionType === 'beban_rusak') {
        // Toko tidak bayar (potong omzet)
        const negativeTrx = {
            id: Date.now() + 1,
            date: date,
            customer: customer,
            itemName: itemName,
            source: agent,
            batch: '-',
            qty: -qty,
            buy: buy,
            extraCost: 0,
            extraCostNote: '-',
            totalModal: -totalModal,
            sell: sell,
            totalSell: -totalSell,
            status: 'Belum Lunas',
            profitPerItem: (sell - buy),
            notes: `[RETUR WRITE-OFF] ${reason} - Ref: ${returnCode}`,
            isReturn: true,
            returnId: returnId
        };
        transactionData[monthKey].unshift(negativeTrx);

        // Masukkan modal barang ke Beban Operasional Usaha
        const newExpense = {
            id: 'exp_' + Date.now(),
            date: date,
            description: `Kerugian Retur Rusak: ${itemName} (${qty} pcs) - ${customer}`,
            amount: totalModal
        };
        expenseData.unshift(newExpense);

        // Background dispatch
        dispatchOutboxMutation('expenses', 'insert', {
            date: date,
            description: newExpense.description,
            amount: totalModal
        });
    }

    // 2. Simpan Catatan Retur
    returnData.unshift(newReturn);
    saveCacheToLocal();

    // 3. Background dispatch returns outbox
    dispatchOutboxMutation('returns', 'insert', {
        id: newReturn.id,
        return_code: newReturn.return_code,
        date: newReturn.date,
        customer: newReturn.customer,
        agent: newReturn.agent,
        item_name: newReturn.item_name,
        qty: newReturn.qty,
        buy: newReturn.buy,
        sell: newReturn.sell,
        total_modal: newReturn.total_modal,
        total_sell: newReturn.total_sell,
        reason: newReturn.reason,
        action_type: newReturn.action_type,
        claim_status: newReturn.claim_status,
        notes: newReturn.notes
    });

    // 4. Update UI di Semua Modul
    renderReturns();
    renderTransactionsForActiveSheet();
    updateDashboard();
    renderFinancialChart();
    renderInvoicesTable();

    logAuditActivity('RETURN_CREATE', newReturn.return_code, `Pencatatan klaim retur: ${newReturn.qty}x ${newReturn.item_name} dari ${newReturn.customer} (${newReturn.action_type})`);

    closeReturnModal();
    showNotification("Sukses", `Retur "${returnCode}" berhasil dicatat & disinkronkan!`, "success");
}

function resolveReturnClaim(returnId) {
    const item = returnData.find(r => r.id === returnId);
    if (!item) return;

    item.claim_status = 'selesai';
    item.resolved_date = new Date().toISOString().split('T')[0];

    saveCacheToLocal();
    dispatchOutboxMutation('returns', 'update', {
        id: item.id,
        claim_status: 'selesai',
        resolved_date: item.resolved_date
    });

    logAuditActivity('RETURN_RESOLVE', item.return_code || `RET #${item.id}`, `Penyelesaian klaim retur: ${item.item_name} (${item.qty} pcs) ke ${item.agent}`);

    renderReturns();
    showNotification("Klaim Selesai", `Barang ${item.item_name} (${item.qty} pcs) berhasil ditandai selesai ditukar ke ${item.agent}.`, "success");
}

function confirmDeleteReturn(returnId) {
    const item = returnData.find(r => r.id === returnId);
    if (!item) return;

    if (!confirm(`Hapus catatan retur "${item.return_code || item.item_name}"?`)) return;

    // Bersihkan transaksi koreksi jika ada
    for (let mk in transactionData) {
        const idx = (transactionData[mk] || []).findIndex(t => t.returnId === returnId);
        if (idx !== -1) {
            transactionData[mk].splice(idx, 1);
        }
    }

    const retIdx = returnData.findIndex(r => r.id === returnId);
    if (retIdx !== -1) returnData.splice(retIdx, 1);

    saveCacheToLocal();
    dispatchOutboxMutation('returns', 'delete', { id: returnId });

    logAuditActivity('RETURN_DELETE', item.return_code || item.item_name, `Menghapus catatan retur: ${item.item_name} (${item.qty} pcs)`);

    renderReturns();
    renderTransactionsForActiveSheet();
    updateDashboard();
    renderFinancialChart();
    renderInvoicesTable();

    showNotification("Sukses", "Catatan retur berhasil dihapus.", "success");
}

// ------------------- CETAK SURAT JALAN KLAIM AGEN ------------------- //
function openPrintAgentClaimModal() {
    const modal = document.getElementById('modal-print-agent-claim');
    if (!modal) return;

    const selAgent = document.getElementById('claim-print-agent');
    if (selAgent) {
        let opts = `<option value="" disabled selected>Pilih Agen</option>`;
        opts += agentData.map(ag => {
            const count = returnData.filter(r => r.agent === ag.name && r.claim_status === 'menunggu_agen').reduce((acc, r) => acc + (r.qty || 0), 0);
            return `<option value="${ag.name}">${ag.name} (${count} pcs antre klaim)</option>`;
        }).join('');
        selAgent.innerHTML = opts;
    }

    const driverInput = document.getElementById('claim-print-driver');
    if (driverInput) driverInput.value = currentUser || '';

    previewAgentClaimItems();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePrintAgentClaimModal() {
    const modal = document.getElementById('modal-print-agent-claim');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function previewAgentClaimItems() {
    const selAgent = document.getElementById('claim-print-agent')?.value;
    const previewList = document.getElementById('claim-preview-list');
    if (!previewList) return;

    if (!selAgent) {
        previewList.innerHTML = `<p class="italic opacity-60">Pilih agen terlebih dahulu untuk melihat daftar barang.</p>`;
        return;
    }

    const items = returnData.filter(r => r.agent === selAgent && r.claim_status === 'menunggu_agen');
    if (items.length === 0) {
        previewList.innerHTML = `<p class="text-emerald-500 font-semibold"><i class="fa-solid fa-circle-check mr-1"></i> Tidak ada antrean barang retur untuk ${selAgent}.</p>`;
        return;
    }

    let html = `<ul class="space-y-1">`;
    items.forEach(r => {
        html += `<li class="flex justify-between items-center border-b border-inherit pb-1">
            <span><strong>${r.qty} pcs</strong> ${r.item_name} <span class="opacity-60 text-[10px]">(${r.reason})</span></span>
            <span class="font-mono text-[10px] opacity-75">Toko: ${r.customer}</span>
        </li>`;
    });
    html += `</ul>`;
    previewList.innerHTML = html;
}

function generateAgentClaimPDF() {
    const selAgent = document.getElementById('claim-print-agent')?.value;
    const driverName = document.getElementById('claim-print-driver')?.value.trim() || (currentUser || 'Driver / Sales');

    if (!selAgent) {
        return showNotification("Peringatan", "Pilih agen terlebih dahulu!", "warning");
    }

    const items = returnData.filter(r => r.agent === selAgent && r.claim_status === 'menunggu_agen');
    if (items.length === 0) {
        return showNotification("Info", `Tidak ada barang retur yang menunggu klaim untuk ${selAgent}.`, "info");
    }

    const renderArea = document.getElementById('report-pdf-render-area');
    if (!renderArea) return;

    const todayFormatted = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const docNumber = `SJ-KLAIM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalQty = 0;
    let totalModal = 0;

    let rowsHtml = '';
    items.forEach((r, idx) => {
        totalQty += (r.qty || 0);
        totalModal += (r.total_modal || (r.qty * (r.buy || 0)));
        rowsHtml += `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
                <td style="padding: 6px 8px; font-weight: 600;">${r.item_name}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: #e11d48;">${r.qty} pcs</td>
                <td style="padding: 6px 8px;">${r.reason}</td>
                <td style="padding: 6px 8px; opacity: 75;">${r.customer}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace;">Rp ${(r.total_modal || (r.qty * (r.buy||0))).toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    renderArea.innerHTML = `
        <div style="font-family: 'Poppins', sans-serif; color: #0f172a; line-height: 1.4; padding: 10px;">
            <!-- Header Kop -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f59e0b; padding-bottom: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="Snackloop-logo.png" style="height: 40px; width: auto; object-fit: contain;">
                    <div>
                        <h1 style="font-size: 16px; font-weight: 800; margin: 0; color: #1e1b4b;">SnackLoop Distribution</h1>
                        <p style="font-size: 10px; color: #64748b; margin: 0;">Sistem Distribusi & Pengelolaan Stok Snack</p>
                    </div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #475569;">
                    <p style="margin: 0; font-weight: 800; color: #d97706; font-size: 13px;">SURAT JALAN KLAIM RETUR BARANG</p>
                    <p style="margin: 2px 0 0 0; font-family: monospace;">No: <strong>${docNumber}</strong></p>
                    <p style="margin: 2px 0 0 0;">Tanggal: ${todayFormatted}</p>
                </div>
            </div>

            <!-- Info Agen & Pembawa -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                    <span style="color: #64748b; display: block; font-size: 10px;">Kepada Supplier / Agen:</span>
                    <strong style="font-size: 13px; color: #1e293b;">${selAgent}</strong>
                </div>
                <div style="text-align: right;">
                    <span style="color: #64748b; display: block; font-size: 10px;">Petugas Pembawa Barang (Kurir/Sales):</span>
                    <strong style="font-size: 12px; color: #1e293b;">${driverName}</strong>
                </div>
            </div>

            <!-- Tabel Barang -->
            <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 16px;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                        <th style="padding: 6px 8px; text-align: center; width: 30px;">No</th>
                        <th style="padding: 6px 8px;">Nama Snack / Produk</th>
                        <th style="padding: 6px 8px; text-align: center; width: 75px;">Qty Rusak</th>
                        <th style="padding: 6px 8px;">Alasan Kerusakan</th>
                        <th style="padding: 6px 8px;">Toko Asal</th>
                        <th style="padding: 6px 8px; text-align: right; width: 110px;">Estimasi Modal</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr style="background: #fffbeb; font-weight: bold; border-top: 2px solid #f59e0b;">
                        <td colspan="2" style="padding: 8px; text-align: right;">TOTAL BARANG RETUR:</td>
                        <td style="padding: 8px; text-align: center; color: #e11d48; font-size: 12px;">${totalQty} pcs</td>
                        <td colspan="2" style="padding: 8px;"></td>
                        <td style="padding: 8px; text-align: right; color: #d97706; font-size: 11px;">Rp ${totalModal.toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>

            <p style="font-size: 10px; color: #64748b; margin-bottom: 28px;">
                * Catatan: Mohon diperiksa fisik barang yang diserahkan untuk proses tukar guling (barang baru) atau potongan tagihan belanja berikutnya.
            </p>

            <!-- Tanda Tangan -->
            <div style="display: flex; justify-content: space-between; font-size: 10.5px;">
                <div style="text-align: center; width: 170px;">
                    <p style="color: #64748b; margin-bottom: 50px;">Diserahkan Oleh (SnackLoop),</p>
                    <p style="font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; margin: 0;">${driverName}</p>
                    <span style="font-size: 9px; opacity: 60;">Driver / Petugas Lapangan</span>
                </div>
                <div style="text-align: center; width: 170px;">
                    <p style="color: #64748b; margin-bottom: 50px;">Diterima Oleh (Agen Supplier),</p>
                    <p style="font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; margin: 0;">( .................................... )</p>
                    <span style="font-size: 9px; opacity: 60;">Pihak ${selAgent}</span>
                </div>
            </div>
        </div>
    `;

    closePrintAgentClaimModal();

    if (typeof html2pdf !== 'undefined') {
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Surat_Jalan_Klaim_${selAgent.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        showNotification("Memproses Dokumen", "Sedang membuat Surat Jalan Klaim Agen...", "info");
        html2pdf().from(renderArea).set(opt).save().then(() => {
            showNotification("Sukses", "Surat Jalan Klaim Agen berhasil diunduh!", "success");
        }).catch(err => {
            console.warn("Fallback to print:", err);
            window.print();
        });
    } else {
        window.print();
    }
}

