// =========================================================================
// GENERATOR NOMOR INVOICE ANTI-TABRAKAN (HIGH-ENTROPY COLLISION-FREE)
// =========================================================================
function generateInvoiceNumber(dateStr) {
    const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const timestampPart = Date.now().toString().slice(-4);
    const entropyHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${cleanDate}-${timestampPart}${entropyHex}`;
}

// ======================= 8. KASIR & TRANSAKSI ======================= //
function renderDropdowns() {
    const tCust = document.getElementById('t-customer');
    if(tCust) {
        let opts = `<option value="" disabled selected>Pilih Pelanggan</option>`;
        opts += customerData.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
        tCust.innerHTML = opts;
    }
    updateAgentDropdowns();
}

function onSourceChange() {
    const src = document.getElementById('t-source').value;
    const prodSel = document.getElementById('t-product');
    document.getElementById('t-batch').value = ""; document.getElementById('t-buy').value = ''; document.getElementById('t-sell').value = ''; document.getElementById('t-qty').max = ""; document.getElementById('t-qty').value = "1";

    if(!src) {
        prodSel.innerHTML = `<option value="" disabled selected>Pilih Produk</option>`;
        return;
    }
    if(src === 'Repack') {
        const inStock = repackData.filter(r => r.remaining_qty > 0);
        if(inStock.length === 0) {
            prodSel.innerHTML = `<option value="" disabled selected>Gudang Repack Kosong</option>`;
        } else {
            let opts = `<option value="" disabled selected>Pilih Produk</option>`;
            opts += inStock.map(r => `<option value="REPACK|${escapeHtml(r.id)}">[Sisa: ${r.remaining_qty}] ${escapeHtml(r.name)}</option>`).join('');
            prodSel.innerHTML = opts;
        }
    } else {
        const filtered = masterData.filter(m => m.source === src);
        const isSuperAdmin = currentRole === 'super_admin';
        let opts = `<option value="" disabled selected>Pilih Produk</option>`;
        opts += filtered.map(m => {
            const modalLabel = isSuperAdmin ? ` (Modal: Rp${m.buy.toLocaleString()})` : '';
            return `<option value="MASTER|${m.id}">${escapeHtml(m.name)}${modalLabel}</option>`;
        }).join('');
        prodSel.innerHTML = opts;
    }
}

function fillProductData() {
    const val = document.getElementById('t-product').value;
    if(!val) return;
    const parts = val.split('|'); const type = parts[0]; const id = parts[1];
    const isSuperAdmin = currentRole === 'super_admin';

    if(type === 'REPACK') {
        const item = repackData.find(r => r.id === id);
        const buyInput = document.getElementById('t-buy');
        buyInput.dataset.realValue = item.modal_per_pcs;
        buyInput.value = isSuperAdmin ? item.modal_per_pcs.toLocaleString('id-ID') : '*** (Tersimpan)';
        document.getElementById('t-sell').value = item.sell_target.toLocaleString('id-ID');
        document.getElementById('t-batch').value = item.id;
        document.getElementById('t-qty').max = item.remaining_qty;
    } else {
        const item = masterData.find(m => m.id === parseInt(id));
        const buyInput = document.getElementById('t-buy');
        buyInput.dataset.realValue = item.buy;
        buyInput.value = isSuperAdmin ? item.buy.toLocaleString('id-ID') : '*** (Tersimpan)';
        document.getElementById('t-sell').value = item.sell.toLocaleString('id-ID');
        document.getElementById('t-batch').value = "Reguler";
        document.getElementById('t-qty').removeAttribute('max');
    }
}

let isSubmittingTrx = false;

document.getElementById('trx-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan mencatat transaksi.", "warning");
    if(isSubmittingTrx) return;
    
    const date = document.getElementById('t-date').value;
    const customer = document.getElementById('t-customer').value;
    const source = document.getElementById('t-source').value;
    const pVal = document.getElementById('t-product').value;
    let qty = parseInt(document.getElementById('t-qty').value) || 1;
    
    const buyInput = document.getElementById('t-buy');
    const buy = (buyInput && buyInput.dataset.realValue) ? parseFloat(buyInput.dataset.realValue) : getCleanNumber('t-buy');
    const extraCost = getCleanNumber('t-extracost');
    const extraCostNote = document.getElementById('t-extracostnote').value.trim() || '-';
    const sell = getCleanNumber('t-sell');
    const status = document.getElementById('t-status').value;
    
    let rawNotes = document.getElementById('t-notes').value.trim() || '-';
    if (currentRole === 'staff_rekap') {
        const kasirTag = `[Kasir: ${currentUser || 'Staf'}]`;
        rawNotes = (rawNotes !== '-' ? `${rawNotes} ${kasirTag}` : kasirTag);
    }
    const notes = rawNotes;
    
    let itemName = ""; let batchId = document.getElementById('t-batch').value || 'Reguler';
    let repackUpdateInfo = null;

    if(source === 'Repack') {
        const rItem = repackData.find(r => r.id === batchId);
        if(!rItem) return showNotification("Peringatan", "Pilih batch produk Repack dengan benar.", "warning");
        if(qty > rItem.remaining_qty) return showNotification("Peringatan", `Stok ${rItem.name} hanya sisa ${rItem.remaining_qty}.`, "warning");
        itemName = rItem.name;
        // Optimistic pengurangan stok repack di memori
        rItem.remaining_qty -= qty;
        repackUpdateInfo = { batchId: batchId, newRemainingQty: rItem.remaining_qty };
    } else {
        if(!pVal) return showNotification("Peringatan", "Pilih produk master terlebih dahulu.", "warning");
        const mId = parseInt(pVal.split('|')[1]);
        const mItem = masterData.find(m => m.id === mId);
        if(!mItem) return showNotification("Peringatan", "Produk master tidak ditemukan.", "warning");
        itemName = mItem.name;
    }

    // Lock submission & tampilkan feedback visual
    isSubmittingTrx = true;
    const submitBtn = this.querySelector('button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    }

    const unlockSubmit = () => {
        setTimeout(() => {
            isSubmittingTrx = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                submitBtn.innerHTML = origBtnHtml;
            }
        }, 500);
    };

    try {
        const totalModalComputed = (buy * qty) + extraCost;
        const totalSellComputed = sell * qty;
        const netProfitItem = (totalSellComputed - totalModalComputed) / qty;

        const monthKey = activeMonthSheet || getCurrentMonthKey(new Date(date));
        const tempTrxId = 'trx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        // Cek atau buat 1 invoice per pelanggan per tanggal
        let existingInv = invoiceData.find(i => i.customer_name === customer && i.date === date);
        let invNumber;
        let isNewInvoice = false;
        let targetInv = null;

        if (existingInv) {
            invNumber = existingInv.invoice_number;
            existingInv.total_amount = (Number(existingInv.total_amount) || 0) + totalSellComputed;
            if (status === 'Belum Lunas') existingInv.status = 'Belum Lunas';
            targetInv = existingInv;
        } else {
            invNumber = generateInvoiceNumber(date);
            isNewInvoice = true;
            targetInv = {
                id: 'inv_' + Date.now(),
                invoice_number: invNumber,
                date: date,
                customer_name: customer,
                total_amount: totalSellComputed,
                status: status,
                notes: notes
            };
            invoiceData.unshift(targetInv);
        }

        const newTrxData = {
            id: tempTrxId,
            monthKey: monthKey,
            date: date,
            customer: customer,
            itemName: itemName,
            source: source,
            qty: qty,
            batch: batchId,
            buy: buy,
            extraCost: extraCost,
            extraCostNote: extraCostNote,
            totalModal: totalModalComputed,
            sell: sell,
            totalSell: totalSellComputed,
            status: status,
            profitPerItem: netProfitItem,
            notes: notes ? `${notes} (Invoice: ${invNumber})` : `Invoice: ${invNumber}`
        };

        // 1. Optimistic in-memory update
        if(!transactionData[monthKey]) transactionData[monthKey] = [];
        transactionData[monthKey].push(newTrxData);
        saveCacheToLocal();

        // 2. Render UI instan
        activeMonthSheet = monthKey;
        renderMonthTabs(); 
        updateDashboard(); 
        renderRepackWarehouse();
        renderFinancialChart();
        renderInvoicesTable();
        renderTransactionsForActiveSheet();
        
        // 3. Reset form
        this.reset(); 
        const statusEl = document.getElementById('t-status');
        if (statusEl) statusEl.value = 'Belum Lunas';
        document.getElementById('t-date').valueAsDate = new Date();
        document.getElementById('t-product').innerHTML = `<option value="" disabled selected>Pilih Sumber Dulu</option>`;

        // 4. Background dispatch / Outbox queue
        const dbTrxPayload = {
            month_key: monthKey, date, customer, item_name: itemName, source, qty, batch: batchId,
            buy, extra_cost: extraCost, extra_cost_note: extraCostNote, total_modal: totalModalComputed, 
            sell, total_sell: totalSellComputed, status, profit_per_item: netProfitItem, notes
        };
        const dbInvPayload = {
            id: targetInv ? targetInv.id : undefined,
            invoice_number: invNumber,
            date: date,
            customer_name: customer,
            total_amount: targetInv ? targetInv.total_amount : totalSellComputed,
            status: targetInv ? targetInv.status : status,
            notes: notes,
            isNew: isNewInvoice
        };

        dispatchMutation({
            type: 'INSERT_TRANSACTION',
            payload: {
                transaction: dbTrxPayload,
                invoice: dbInvPayload,
                repackUpdate: repackUpdateInfo,
                tempTrxId: tempTrxId
            }
        }, async () => {
            let atomicSuccess = false;
            if (isNewInvoice) {
                try {
                    // Coba eksekusi Stored Procedure Atomik (ACID) jika tersedia di database Supabase
                    const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc('create_sale_transaction_atomic', {
                        p_trx: dbTrxPayload,
                        p_inv: dbInvPayload,
                        p_repack_batch_id: repackUpdateInfo ? repackUpdateInfo.batchId : null,
                        p_repack_deduct_qty: repackUpdateInfo ? qty : 0
                    });
                    if (!rpcErr && rpcRes && rpcRes.trx_id) {
                        newTrxData.id = rpcRes.trx_id;
                        atomicSuccess = true;
                    }
                } catch(e) {
                    atomicSuccess = false;
                }
            }

            if (!atomicSuccess) {
                if(repackUpdateInfo) {
                    await supabaseClient.from('repack').update({ remaining_qty: repackUpdateInfo.newRemainingQty }).eq('id', repackUpdateInfo.batchId);
                }
                const { data: trxRes, error: trxErr } = await supabaseClient.from('transactions').insert([dbTrxPayload]).select();
                if(trxErr) throw trxErr;
                if(trxRes && trxRes.length > 0) newTrxData.id = trxRes[0].id;
                
                if (isNewInvoice) {
                    await supabaseClient.from('invoices').insert([{
                        invoice_number: invNumber,
                        date: date,
                        customer_name: customer,
                        total_amount: dbInvPayload.total_amount,
                        status: dbInvPayload.status,
                        notes: notes
                    }]);
                } else if (targetInv && targetInv.id) {
                    await supabaseClient.from('invoices').update({
                        total_amount: targetInv.total_amount,
                        status: targetInv.status
                    }).eq('id', targetInv.id);
                }
            }
        });

        logAuditActivity('TRANSACTION_CREATE', invNumber, `Transaksi baru: ${qty}x ${itemName} ke ${customer} senilai Rp ${totalSellComputed.toLocaleString()} (${status})`);

        if(navigator.onLine) {
            showNotification("Sukses", "Data penjualan berhasil disimpan!", "success");
        } else {
            showNotification("Mode Offline", "Data tersimpan di perangkat. Otomatis disinkronkan saat online.", "warning");
        }
    } finally {
        unlockSubmit();
    }
});

// =========================================================================
// FITUR DISTRIBUSI AGEN & PENAGIHAN: AGING INVOICES & SMART WHATSAPP TAGIH
// =========================================================================
let currentInvoiceAgingFilter = 'all';

function setInvoiceAgingFilter(filterKey) {
    currentInvoiceAgingFilter = filterKey;
    currentInvoicePage = 1;
    
    // Update visual tombol filter
    const filterButtons = ['all', 'unpaid', '0-7', '8-14', '15-30', 'gt30', 'paid'];
    filterButtons.forEach(btnKey => {
        const btn = document.getElementById(`inv-filter-${btnKey}`);
        if(btn) {
            if(btnKey === filterKey) {
                btn.className = "px-3 py-1.5 rounded-lg border font-semibold transition bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm";
            } else {
                btn.className = "px-3 py-1.5 rounded-lg border font-semibold transition theme-input hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80";
            }
        }
    });

    renderInvoicesTable();
}

let _cachedTodayMidnightMs = 0;
let _cachedTodayMidnightExpiry = 0;

function _getTodayMidnightMs() {
    const now = Date.now();
    if (now > _cachedTodayMidnightExpiry) {
        const d = new Date(now);
        _cachedTodayMidnightMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        _cachedTodayMidnightExpiry = now + 60000;
    }
    return _cachedTodayMidnightMs;
}

function _parseIsoDateUtcMs(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    if (dateStr.length >= 10 && dateStr.charCodeAt(4) === 45 && dateStr.charCodeAt(7) === 45) {
        const y = (dateStr.charCodeAt(0) - 48) * 1000 + (dateStr.charCodeAt(1) - 48) * 100 + (dateStr.charCodeAt(2) - 48) * 10 + (dateStr.charCodeAt(3) - 48);
        const m = (dateStr.charCodeAt(5) - 48) * 10 + (dateStr.charCodeAt(6) - 48);
        const d = (dateStr.charCodeAt(8) - 48) * 10 + (dateStr.charCodeAt(9) - 48);
        return Date.UTC(y, m - 1, d);
    }
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? 0 : parsed;
}

function getInvoiceAgingInfo(inv) {
    if (!inv) return { days: 0, category: 'paid', label: 'Lunas', colorClass: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' };
    
    if (inv.status === 'Lunas') {
        return { days: 0, category: 'paid', label: 'Lunas', colorClass: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' };
    }

    const todayMs = _getTodayMidnightMs();
    const invDateMs = _parseIsoDateUtcMs(inv.date);
    const diffTime = invDateMs > 0 ? (todayMs - invDateMs) : 0;
    const days = Math.max(0, Math.floor(diffTime / 86400000));

    if (days <= 7) {
        return {
            days,
            category: '0-7',
            label: `${days} Hari (Lancar)`,
            badgeIcon: 'fa-regular fa-circle-check',
            colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
        };
    } else if (days <= 14) {
        return {
            days,
            category: '8-14',
            label: `${days} Hari (Perhatian)`,
            badgeIcon: 'fa-solid fa-clock',
            colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
        };
    } else if (days <= 30) {
        return {
            days,
            category: '15-30',
            label: `${days} Hari (Tempo)`,
            badgeIcon: 'fa-solid fa-triangle-exclamation',
            colorClass: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 font-semibold'
        };
    } else {
        return {
            days,
            category: 'gt30',
            label: `${days} Hari (Macet)`,
            badgeIcon: 'fa-solid fa-circle-exclamation',
            colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 font-bold'
        };
    }
}

function calculateInvoiceAgingStats() {
    let totalUnpaid = 0;
    let countUnpaid = 0;
    let counts = {
        'all': invoiceData.length,
        'unpaid': 0,
        '0-7': 0,
        '8-14': 0,
        '15-30': 0,
        'gt30': 0,
        'paid': 0
    };
    let amounts = {
        'total': 0,
        '0-7': 0,
        '8-14': 0,
        '15-30': 0,
        'gt30': 0,
        'paid': 0
    };

    invoiceData.forEach(inv => {
        const amt = Number(inv.total_amount) || 0;
        if (inv.status === 'Lunas') {
            counts['paid'] += 1;
            amounts['paid'] += amt;
        } else {
            countUnpaid += 1;
            totalUnpaid += amt;
            counts['unpaid'] += 1;
            amounts['total'] += amt;

            const info = getInvoiceAgingInfo(inv);
            if (counts[info.category] !== undefined) {
                counts[info.category] += 1;
                amounts[info.category] += amt;
            }
        }
    });

    return { totalUnpaid, countUnpaid, counts, amounts };
}

function renderInvoiceAgingCards() {
    const container = document.getElementById('invoice-aging-cards-container');
    const { totalUnpaid, countUnpaid, counts, amounts } = calculateInvoiceAgingStats();

    // Update filter badge numbers
    for (let key in counts) {
        const el = document.getElementById(`inv-count-${key}`);
        if (el) el.innerText = counts[key];
    }

    if (!container) return;

    container.innerHTML = `
        <div class="theme-card rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase opacity-70 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                Total Piutang Aktif
            </span>
            <h4 class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">Rp ${totalUnpaid.toLocaleString()}</h4>
            <span class="text-[10px] opacity-60 font-medium">${countUnpaid} Invoice Belum Lunas</span>
        </div>

        <div class="theme-card rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase opacity-70 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span class="w-2 h-2 rounded-full bg-emerald-600"></span> 0-7 Hari (Lancar)
            </span>
            <h4 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">Rp ${amounts['0-7'].toLocaleString()}</h4>
            <span class="text-[10px] opacity-60 font-medium">${counts['0-7']} Invoice</span>
        </div>

        <div class="theme-card rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase opacity-70 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span> 8-14 Hari (Perhatian)
            </span>
            <h4 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">Rp ${amounts['8-14'].toLocaleString()}</h4>
            <span class="text-[10px] opacity-60 font-medium">${counts['8-14']} Invoice</span>
        </div>

        <div class="theme-card rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase opacity-70 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span> 15-30 Hari (Tempo)
            </span>
            <h4 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">Rp ${amounts['15-30'].toLocaleString()}</h4>
            <span class="text-[10px] opacity-60 font-medium">${counts['15-30']} Invoice</span>
        </div>

        <div class="theme-card rounded-xl border border-rose-200 dark:border-rose-950 p-3.5 space-y-1 col-span-2 sm:col-span-1">
            <span class="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span class="w-2 h-2 rounded-full bg-rose-600"></span> > 30 Hari (Macet)
            </span>
            <h4 class="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">Rp ${amounts['gt30'].toLocaleString()}</h4>
            <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400">${counts['gt30']} Invoice Kritis</span>
        </div>
    `;
}

// =========================================================================
// MONTHLY GROUPING & PAGINASI INVOICE (DOM & RENDERING PERFORMANCE)
// =========================================================================
const INVOICE_MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function getInvoiceMonthKey(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 'Lainnya';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
            return `${INVOICE_MONTH_ORDER[mIdx]} ${parts[0]}`;
        }
    }
    return 'Lainnya';
}

function getInvoiceMonthSortVal(mk) {
    if (!mk || mk === 'all' || mk === 'Lainnya') return 0;
    return typeof parseMonthKey === 'function' ? parseMonthKey(mk) : 0;
}

function setInvoiceYear(yr, forceExpand = false) {
    const targetYr = String(yr);
    if (!forceExpand && targetYr === activeInvoiceYear && activeInvoiceMonthSheet !== 'all') {
        isInvoiceMonthsExpanded = !isInvoiceMonthsExpanded;
        shouldAnimateInvoiceMonths = isInvoiceMonthsExpanded;
        renderInvoicesTable();
        return;
    }

    activeInvoiceYear = targetYr;
    isInvoiceMonthsExpanded = true;
    shouldAnimateInvoiceMonths = true;

    const monthCounts = {};
    invoiceData.forEach(inv => {
        const mk = getInvoiceMonthKey(inv.date);
        monthCounts[mk] = (monthCounts[mk] || 0) + 1;
    });
    const distinctMonths = Object.keys(monthCounts).sort((a, b) => getInvoiceMonthSortVal(b) - getInvoiceMonthSortVal(a));
    const yearMonths = distinctMonths.filter(mk => {
        const p = mk.trim().split(/\s+/);
        return (p.length > 1 ? p[p.length - 1] : '') === activeInvoiceYear;
    });
    
    if (yearMonths.length > 0) {
        if (typeof lastActiveInvoiceMonthByYear === 'object' && lastActiveInvoiceMonthByYear[activeInvoiceYear] && yearMonths.includes(lastActiveInvoiceMonthByYear[activeInvoiceYear])) {
            activeInvoiceMonthSheet = lastActiveInvoiceMonthByYear[activeInvoiceYear];
        } else {
            activeInvoiceMonthSheet = yearMonths[0];
        }
    }
    currentInvoicePage = 1;
    renderInvoicesTable();
}

function selectInvoiceMonthSheet(mk) {
    activeInvoiceMonthSheet = mk;
    shouldAnimateInvoiceMonths = false;
    if (mk !== 'all') {
        const p = mk.trim().split(/\s+/);
        const yr = p.length > 1 ? p[p.length - 1] : '';
        if (yr) {
            activeInvoiceYear = yr;
            isInvoiceMonthsExpanded = true;
            if (typeof lastActiveInvoiceMonthByYear === 'object') {
                lastActiveInvoiceMonthByYear[yr] = mk;
            }
        }
    }
    currentInvoicePage = 1;
    renderInvoicesTable();
}

function renderInvoiceMonthTabs() {
    const container = document.getElementById('invoice-month-tabs-container');
    const summaryBadge = document.getElementById('invoice-month-summary-badge');
    if (!container) return;

    const monthCounts = {};
    invoiceData.forEach(inv => {
        const mk = getInvoiceMonthKey(inv.date);
        monthCounts[mk] = (monthCounts[mk] || 0) + 1;
    });

    const distinctMonths = Object.keys(monthCounts).sort((a, b) => getInvoiceMonthSortVal(b) - getInvoiceMonthSortVal(a));
    const currentMonthKeyStr = getCurrentMonthKey(new Date());

    if (!activeInvoiceMonthSheet) {
        if (distinctMonths.includes(currentMonthKeyStr)) {
            activeInvoiceMonthSheet = currentMonthKeyStr;
        } else if (distinctMonths.length > 0) {
            activeInvoiceMonthSheet = distinctMonths[0];
        } else {
            activeInvoiceMonthSheet = 'all';
        }
    }

    // Extract unique invoice years
    const invoiceYears = [...new Set(distinctMonths.map(mk => {
        const p = mk.trim().split(/\s+/);
        return p.length > 1 ? p[p.length - 1] : '';
    }).filter(Boolean))].sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

    // Sync activeInvoiceYear
    if (!activeInvoiceYear || !invoiceYears.includes(activeInvoiceYear)) {
        if (activeInvoiceMonthSheet !== 'all') {
            const p = activeInvoiceMonthSheet.trim().split(/\s+/);
            const y = p.length > 1 ? p[p.length - 1] : '';
            if (y && invoiceYears.includes(y)) activeInvoiceYear = y;
        }
        if (!activeInvoiceYear || !invoiceYears.includes(activeInvoiceYear)) {
            activeInvoiceYear = invoiceYears[0] || new Date().getFullYear().toString();
        }
    }

    // Filter distinct months belonging to activeInvoiceYear
    const yearDistinctMonths = distinctMonths.filter(mk => {
        const p = mk.trim().split(/\s+/);
        const y = p.length > 1 ? p[p.length - 1] : '';
        return y === activeInvoiceYear;
    });

    // 1. "Semua Invoice" Button
    const isAllActive = activeInvoiceMonthSheet === 'all';
    let tabsHtml = `
        <button type="button" onclick="selectInvoiceMonthSheet('all')" 
            class="month-pill-btn px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${isAllActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'theme-input opacity-80 hover:opacity-100'}"
            title="Tampilkan seluruh nota tanpa filter periode">
            <span>Semua Invoice</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${isAllActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'}">${invoiceData.length}</span>
        </button>
    `;

    if (invoiceYears.length > 0) {
        tabsHtml += `
            <div class="text-slate-300 dark:text-slate-600 text-xs font-light select-none px-0.5">
                <i class="fa-solid fa-chevron-right text-[11px]"></i>
            </div>
        `;

        if (invoiceYears.length === 1) {
            const isYrActive = !isAllActive && isInvoiceMonthsExpanded;
            tabsHtml += `
                <button type="button" onclick="setInvoiceYear('${activeInvoiceYear}')"
                    aria-expanded="${isInvoiceMonthsExpanded}"
                    class="year-selector-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 cursor-pointer select-none ${isYrActive ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-xs' : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 shadow-xs'}"
                    title="Klik untuk buka/tutup daftar bulan Tahun ${activeInvoiceYear}">
                    <i class="fa-solid fa-calendar-days text-indigo-500"></i>
                    <span>Tahun ${activeInvoiceYear}</span>
                </button>
            `;
        } else if (invoiceYears.length <= 4) {
            tabsHtml += `
                <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs shrink-0">
                    ${invoiceYears.map(yr => {
                        const isYrSelected = yr === activeInvoiceYear && !isAllActive;
                        return `
                            <button type="button" onclick="setInvoiceYear('${yr}')"
                                aria-expanded="${isYrSelected && isInvoiceMonthsExpanded}"
                                class="year-selector-btn px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isYrSelected ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'}"
                                title="Klik untuk melihat/melipat nota Tahun ${yr}">
                                <i class="fa-solid fa-calendar-days ${isYrSelected ? 'text-white' : 'text-indigo-500'} text-[11px]"></i>
                                <span>Tahun ${yr}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            tabsHtml += `
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs shrink-0">
                    <i class="fa-solid fa-calendar-days text-indigo-500 text-xs pl-1"></i>
                    <select onchange="setInvoiceYear(this.value, true)" class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1">
                        ${invoiceYears.map(yr => `<option value="${yr}" ${yr === activeInvoiceYear ? 'selected' : ''} class="text-slate-900 bg-white dark:bg-slate-800 dark:text-slate-100">Tahun ${yr}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        tabsHtml += `
            <button type="button" onclick="setInvoiceYear('${activeInvoiceYear}')"
                class="year-chevron-btn w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-500 cursor-pointer select-none shrink-0"
                title="${isInvoiceMonthsExpanded ? 'Lipat daftar bulan' : 'Buka daftar bulan'}">
                <i class="fa-solid fa-chevron-right text-[11px] year-chevron-icon ${isInvoiceMonthsExpanded ? 'is-expanded' : 'is-collapsed'}"></i>
            </button>
        `;

        if (isInvoiceMonthsExpanded) {
            tabsHtml += `
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${yearDistinctMonths.map((mk, idx) => {
                        const isActive = activeInvoiceMonthSheet === mk;
                        const count = monthCounts[mk] || 0;
                        const mName = mk.trim().split(/\s+/)[0];
                        const animClass = shouldAnimateInvoiceMonths ? 'month-pill-enter' : '';
                        return `
                            <button type="button" onclick="selectInvoiceMonthSheet('${mk}')" 
                                style="--pill-idx: ${idx};"
                                class="month-pill-btn ${animClass} px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'theme-input opacity-80 hover:opacity-100'}"
                                title="Filter nota ${mk}">
                                <span>${mName}</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'}">${count}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            const activeSummaryMonth = activeInvoiceMonthSheet !== 'all' ? activeInvoiceMonthSheet.trim().split(/\s+/)[0] : `${yearDistinctMonths.length} Bulan`;
            tabsHtml += `
                <button type="button" onclick="setInvoiceYear('${activeInvoiceYear}', true)"
                    style="--pill-idx: 0;"
                    class="month-pill-btn month-pill-enter px-3 py-1.5 rounded-xl text-xs font-bold border theme-input border-indigo-400/40 text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                    title="Klik untuk membuka semua bulan Tahun ${activeInvoiceYear}">
                    <span>${activeSummaryMonth}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">${yearDistinctMonths.length} bln</span>
                </button>
            `;
        }
    }

    shouldAnimateInvoiceMonths = false;
    container.innerHTML = tabsHtml;

    // Render Summary Badge
    if (summaryBadge) {
        const monthInvoices = activeInvoiceMonthSheet === 'all'
            ? invoiceData
            : invoiceData.filter(inv => getInvoiceMonthKey(inv.date) === activeInvoiceMonthSheet);

        const totalBilled = monthInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        const unpaidList = monthInvoices.filter(inv => inv.status !== 'Lunas');
        const totalUnpaid = unpaidList.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

        summaryBadge.innerHTML = `
            <span class="opacity-70"><i class="fa-solid fa-calculator text-indigo-500 mr-1"></i> Rekap ${activeInvoiceMonthSheet === 'all' ? 'Semua' : activeInvoiceMonthSheet}:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100 tabular-nums">Rp ${totalBilled.toLocaleString()}</span>
            ${totalUnpaid > 0 ? `<span class="text-rose-600 dark:text-rose-400 font-bold ml-1 tabular-nums">(${unpaidList.length} Nota: Rp ${totalUnpaid.toLocaleString()})</span>` : `<span class="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(Lunas Semua)</span>`}
        `;
    }
}

function renderInvoicePaginationControls(totalPages, totalItems, fromItem, toItem) {
    const container = document.getElementById('invoice-pagination-container');
    if (!container) return;

    if (totalItems === 0 || totalPages <= 1) {
        container.innerHTML = totalItems > 0 
            ? `<div class="flex justify-between items-center text-xs opacity-70 w-full py-1"><span>Menampilkan seluruh ${totalItems} invoice</span></div>`
            : '';
        return;
    }

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs w-full py-2">
            <span class="opacity-70">
                Menampilkan <b>${fromItem}</b> - <b>${toItem}</b> dari <b>${totalItems}</b> invoice (Hal. ${currentInvoicePage} dari ${totalPages})
            </span>
            <div class="flex items-center space-x-1.5">
                <button onclick="changeInvoicePage(${currentInvoicePage - 1})" ${currentInvoicePage === 1 ? 'disabled class="opacity-40 px-3 py-1.5 border rounded-lg cursor-not-allowed"' : 'class="px-3 py-1.5 theme-input border rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"'}><i class="fa-solid fa-chevron-left mr-1"></i> Prev</button>
                <span class="px-2 font-mono font-bold">${currentInvoicePage} / ${totalPages}</span>
                <button onclick="changeInvoicePage(${currentInvoicePage + 1})" ${currentInvoicePage === totalPages ? 'disabled class="opacity-40 px-3 py-1.5 border rounded-lg cursor-not-allowed"' : 'class="px-3 py-1.5 theme-input border rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"'}>Next <i class="fa-solid fa-chevron-right ml-1"></i></button>
            </div>
        </div>
    `;
}

let currentInvoiceSortColumn = 'date'; // 'date' | 'customer' | 'amount'
let currentInvoiceSortDirection = 'desc'; // 'asc' | 'desc'

function toggleInvoiceSort(column) {
    if (currentInvoiceSortColumn === column) {
        currentInvoiceSortDirection = currentInvoiceSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentInvoiceSortColumn = column;
        currentInvoiceSortDirection = (column === 'customer') ? 'asc' : 'desc';
    }
    updateInvoiceSortIcons();
    renderInvoicesTable();
}

function updateInvoiceSortIcons() {
    const cols = ['date', 'customer', 'amount'];
    cols.forEach(col => {
        const icon = document.getElementById(`inv-${col}-sort-icon`);
        if (!icon) return;
        if (currentInvoiceSortColumn === col) {
            icon.className = currentInvoiceSortDirection === 'asc' 
                ? 'fa-solid fa-arrow-up-short-wide text-[10px] text-indigo-500' 
                : 'fa-solid fa-arrow-down-wide-short text-[10px] text-indigo-500';
        } else {
            icon.className = 'fa-solid fa-sort text-[10px] opacity-40';
        }
    });
}

function changeInvoicePage(newPage) {
    currentInvoicePage = newPage;
    renderInvoicesTable();
}

function resetInvoiceFilters() {
    if (typeof selectInvoiceMonthSheet === 'function') {
        selectInvoiceMonthSheet('all');
    } else {
        activeInvoiceMonthSheet = 'all';
    }
    setInvoiceAgingFilter('all');
}

async function renderInvoicesTable() {
    renderInvoiceAgingCards();
    renderInvoiceMonthTabs();
    updateInvoiceSortIcons();

    // Deteksi Smart Alert: Konsolidasi Invoice Harian
    const groupCount = {};
    invoiceData.forEach(inv => {
        const k = `${inv.customer_name}__${inv.date}`;
        groupCount[k] = (groupCount[k] || 0) + 1;
    });
    const dupGroups = Object.entries(groupCount).filter(([k, count]) => count > 1);
    const totalDups = dupGroups.reduce((acc, [k, count]) => acc + count, 0);
    const alertBanner = document.getElementById('invoice-consolidation-alert');
    if (alertBanner) {
        if (dupGroups.length > 0) {
            alertBanner.className = "mb-3 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm";
            alertBanner.innerHTML = `
                <div class="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                    <i class="fa-solid fa-layer-group text-lg text-amber-600 shrink-0"></i>
                    <div>
                        <span class="font-bold block">Rapikan Invoice Terpisah (${totalDups} Nota)</span>
                        <span class="opacity-80 leading-relaxed">Ditemukan ${dupGroups.length} pelanggan memiliki beberapa nota terpisah pada tanggal yang sama. Anda dapat menggabungkannya menjadi 1 nota utuh agar rapi dan tidak membingungkan pelanggan saat penagihan.</span>
                    </div>
                </div>
                <button type="button" onclick="consolidateDailyInvoices()" class="shrink-0 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm text-xs">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Gabungkan Sekarang
                </button>
            `;
        } else {
            alertBanner.className = "hidden";
            alertBanner.innerHTML = "";
        }
    }

    const tbody = document.getElementById('invoices-table-body');
    if(!tbody) return;
    
    if(invoiceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center opacity-60">Belum ada data invoice tercatat.</td></tr>`;
        renderInvoicePaginationControls(0, 0, 0, 0);
        return;
    }

    const isSuperAdmin = currentRole === 'super_admin';

    // 1. Scoping berdasarkan Bulan (Buku Invoice Bulanan)
    let monthScopedInvoices = invoiceData;
    if (activeInvoiceMonthSheet && activeInvoiceMonthSheet !== 'all') {
        monthScopedInvoices = invoiceData.filter(inv => getInvoiceMonthKey(inv.date) === activeInvoiceMonthSheet);
    }

    // 2. Filter invoice berdasarkan Aging Piutang
    const filteredInvoices = monthScopedInvoices.filter(inv => {
        if (currentInvoiceAgingFilter === 'all') return true;
        if (currentInvoiceAgingFilter === 'unpaid') return inv.status !== 'Lunas';
        if (currentInvoiceAgingFilter === 'paid') return inv.status === 'Lunas';
        
        if (inv.status === 'Lunas') return false; // Filter aging hanya relevan untuk yang belum lunas
        const info = getInvoiceAgingInfo(inv);
        return info.category === currentInvoiceAgingFilter;
    });

    // 3. Dynamic Sorting berdasarkan kolom aktif
    filteredInvoices.sort((a, b) => {
        let cmp = 0;
        if (currentInvoiceSortColumn === 'customer') {
            const nameA = (a.customer_name || '').toLowerCase();
            const nameB = (b.customer_name || '').toLowerCase();
            cmp = nameA.localeCompare(nameB);
        } else if (currentInvoiceSortColumn === 'amount') {
            const amtA = Number(a.total_amount) || 0;
            const amtB = Number(b.total_amount) || 0;
            cmp = amtA - amtB;
        } else {
            // Default: Urutkan Tanggal
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
                cmp = dateA.localeCompare(dateB);
            } else {
                cmp = String(a.id || '').localeCompare(String(b.id || ''));
            }
        }
        return currentInvoiceSortDirection === 'asc' ? cmp : -cmp;
    });

    if (filteredInvoices.length === 0) {
        const hasAging = currentInvoiceAgingFilter !== 'all';
        const hasMonth = activeInvoiceMonthSheet && activeInvoiceMonthSheet !== 'all';
        const hasActiveFilter = hasAging || hasMonth;

        const switchHint = hasActiveFilter ? `
            <div class="mt-3 flex items-center justify-center gap-2">
                <button type="button" onclick="resetInvoiceFilters()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition">
                    <i class="fas fa-rotate-left text-[11px]"></i> Tampilkan Semua Invoice & Semua Bulan
                </button>
            </div>
        ` : '';

        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center">
            <div class="flex flex-col items-center justify-center gap-2">
                <i class="fas fa-file-invoice-dollar text-2xl opacity-30 mb-1"></i>
                <p class="text-xs font-semibold opacity-70">Tidak ada invoice pada kategori filter ini ${hasMonth ? `di bulan <b>${escapeHtml(activeInvoiceMonthSheet)}</b>` : ''}.</p>
                ${switchHint}
            </div>
        </td></tr>`;
        renderInvoicePaginationControls(0, 0, 0, 0);
        return;
    }

    // 4. Pagination (25 baris per halaman)
    const totalPages = Math.ceil(filteredInvoices.length / invoiceRowsPerPage);
    if (currentInvoicePage > totalPages) currentInvoicePage = totalPages || 1;
    if (currentInvoicePage < 1) currentInvoicePage = 1;
    const startIndex = (currentInvoicePage - 1) * invoiceRowsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + invoiceRowsPerPage);

    const rows = paginatedInvoices.map(inv => {
        const info = getInvoiceAgingInfo(inv);
        const safeInvNum = escapeHtml(inv.invoice_number);
        const safeCustName = escapeHtml(inv.customer_name);
        const safeDate = escapeHtml(inv.date);

        const badgeStatus = inv.status === 'Lunas' ? 
            `<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-full font-bold text-[11px] inline-flex items-center gap-1"><i class="fa-solid fa-check"></i> LUNAS</span>` : 
            `<div class="space-y-1">
                <span class="px-2 py-0.5 bg-rose-500/20 text-rose-500 rounded-full font-bold text-[10px] inline-flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> BELUM LUNAS</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] border font-bold ${info.colorClass} block w-fit"><i class="${info.badgeIcon || 'fa-regular fa-clock'} mr-1"></i>${info.label}</span>
             </div>`;
        
        const btnLunasi = inv.status !== 'Lunas' ? 
            `<button onclick="markInvoiceAsPaid('${inv.id}', '${safeCustName.replace(/'/g, "\\'")}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"><i class="fa-solid fa-check"></i> Lunasi</button>` : 
            `<span class="text-xs opacity-50 font-medium">Selesai</span>`;

        const btnDelete = isSuperAdmin ? 
            `<button onclick="confirmDeleteInvoice('${inv.id}', '${safeInvNum.replace(/'/g, "\\'")}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1.5 rounded-lg text-xs font-bold" title="Hapus Permanen"><i class="fa-solid fa-trash"></i></button>` : '';

        const waActionBtn = inv.status === 'Lunas' ?
            `<button onclick="openWaInvoiceTemplatesModal('${safeInvNum}')" class="bg-emerald-600/80 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1" title="Kirim Kwitansi Pelunasan via WhatsApp"><i class="fa-brands fa-whatsapp"></i> Kwitansi WA</button>` :
            `<button onclick="openWaInvoiceTemplatesModal('${safeInvNum}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1" title="Koleksi Template Tagih WhatsApp"><i class="fa-brands fa-whatsapp"></i> Tagih WA</button>`;

        return `
            <tr class="hover:bg-slate-50/50 transition">
                <td class="p-3 border border-inherit">
                    <span class="font-mono font-bold text-indigo-500 text-xs block">${safeInvNum}</span>
                    <span class="text-[10px] opacity-60">${safeDate}</span>
                </td>
                <td class="p-3 border border-inherit">
                    <span class="font-bold block text-slate-900 dark:text-slate-100">${safeCustName}</span>
                </td>
                <td class="p-3 border border-inherit font-bold text-emerald-600 dark:text-emerald-400">
                    Rp ${Number(inv.total_amount).toLocaleString()}
                </td>
                <td class="p-3 border border-inherit">
                    ${badgeStatus}
                </td>
                <td class="p-3 border border-inherit text-center">
                    <div class="flex items-center justify-center gap-1.5 flex-wrap">
                        <button onclick="downloadInvoicePDF('${safeInvNum}', '${inv.status}')" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium" title="Unduh Nota / Faktur PDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                        ${waActionBtn}
                        ${btnLunasi}
                        ${btnDelete}
                    </div>
                </td>
            </tr>`;
    }).join('');

    tbody.innerHTML = rows;
    renderInvoicePaginationControls(totalPages, filteredInvoices.length, startIndex + 1, Math.min(startIndex + invoiceRowsPerPage, filteredInvoices.length));
}

// =========================================================================
// KOLEKSI TEMPLATE PENAGIHAN WHATSAPP DENGAN CLIP-TO-COPY
// =========================================================================
let currentWaInvoiceContext = null;
let currentWaSelectedTemplate = 'soft';

function openWaInvoiceTemplatesModal(invNumber) {
    const inv = invoiceData.find(i => i.invoice_number === invNumber);
    if (!inv) return showNotification("Gagal", "Invoice tidak ditemukan.", "error");

    const custObj = customerData.find(c => c.name && c.name.toLowerCase() === (inv.customer_name || '').toLowerCase());
    const phone = typeof normalizeWaPhone === 'function'
        ? normalizeWaPhone(custObj?.phone, appSettings?.whatsappPhone)
        : String(custObj?.phone || appSettings?.whatsappPhone || '').replace(/\D/g, '').replace(/^0/, '62');

    const todayMs = _getTodayMidnightMs();
    const dMs = _parseIsoDateUtcMs(inv.date);
    const days = Math.max(0, Math.floor((dMs > 0 ? (todayMs - dMs) : 0) / 86400000));

    currentWaInvoiceContext = {
        invoiceNumber: inv.invoice_number,
        customerName: inv.customer_name || 'Pelanggan',
        amount: Number(inv.total_amount) || 0,
        date: inv.date,
        status: inv.status || 'Belum Lunas',
        days: days,
        phone: phone
    };

    // Prefill summary info
    const invEl = document.getElementById('wa-modal-inv-num');
    const custEl = document.getElementById('wa-modal-cust-name');
    const amtEl = document.getElementById('wa-modal-amount');
    const phoneEl = document.getElementById('wa-modal-phone');

    if (invEl) invEl.innerText = currentWaInvoiceContext.invoiceNumber;
    if (custEl) custEl.innerText = currentWaInvoiceContext.customerName;
    if (amtEl) amtEl.innerText = 'Rp ' + currentWaInvoiceContext.amount.toLocaleString('id-ID');
    if (phoneEl) phoneEl.value = currentWaInvoiceContext.phone;

    // Default template based on status & aging
    if (currentWaInvoiceContext.status === 'Lunas') {
        currentWaSelectedTemplate = 'paid';
    } else if (days > 14) {
        currentWaSelectedTemplate = 'overdue';
    } else if (days > 7) {
        currentWaSelectedTemplate = 'due';
    } else {
        currentWaSelectedTemplate = 'soft';
    }

    selectWaTemplate(currentWaSelectedTemplate);

    const modal = document.getElementById('modal-wa-invoice-templates');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeWaInvoiceTemplatesModal() {
    const modal = document.getElementById('modal-wa-invoice-templates');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function selectWaTemplate(tplKey) {
    currentWaSelectedTemplate = tplKey;
    const tplKeys = ['soft', 'due', 'overdue', 'paid'];
    tplKeys.forEach(k => {
        const btn = document.getElementById('btn-wa-tpl-' + k);
        if (btn) {
            if (k === tplKey) {
                btn.className = "px-2.5 py-1.5 rounded-lg border font-semibold text-center transition bg-indigo-600 text-white shadow-sm text-[11px]";
            } else {
                btn.className = "px-2.5 py-1.5 rounded-lg border font-semibold text-center transition theme-input hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] opacity-80";
            }
        }
    });

    generateWaTemplateMessage();
}

function generateWaTemplateMessage() {
    if (!currentWaInvoiceContext) return;
    const biz = (appSettings?.businessName || 'SnackLoop ERP').trim();
    const bank = (appSettings?.bankAccount || 'BCA 12345678 a/n SnackLoop').trim();
    const { customerName, invoiceNumber, date, amount, days } = currentWaInvoiceContext;
    const formattedAmount = amount.toLocaleString('id-ID');

    let msg = '';
    switch (currentWaSelectedTemplate) {
        case 'soft':
            msg = `Halo Kak *${customerName}*, salam hangat dari *${biz}* 🙏\n\n` +
                  `Berikut kami kirimkan rincian nota pesanan snack Anda:\n` +
                  `• No. Nota  : *${invoiceNumber}*\n` +
                  `• Tanggal   : *${date}*\n` +
                  `• Tagihan   : *Rp ${formattedAmount}*\n\n` +
                  `Pembayaran dapat ditransfer ke rekening resmi kami:\n` +
                  `🏦 *${bank}*\n\n` +
                  `Mohon konfirmasi bukti transfer jika sudah melakukan pembayaran ya Kak. Terima kasih banyak atas kerjasamanya! 😊`;
            break;
        case 'due':
            msg = `Halo Kak *${customerName}*, semoga usaha dan toko Anda semakin laris berkah.\n\n` +
                  `Kami mengonfirmasikan bahwa nota pesanan SnackLoop berikut hari ini telah jatuh tempo pembayaran:\n` +
                  `• No. Nota  : *${invoiceNumber}*\n` +
                  `• Tanggal   : *${date}* (${days} hari berjalan)\n` +
                  `• Tagihan   : *Rp ${formattedAmount}*\n\n` +
                  `Mohon kesediaannya untuk melakukan transfer pelunasan ke rekening resmi:\n` +
                  `🏦 *${bank}*\n\n` +
                  `Jika snack di toko sudah habis terjual atau ada retur yang perlu dicatat, silakan kabari kami. Terima kasih! 🙏`;
            break;
        case 'overdue':
            msg = `*PEMBERITAHUAN JATUH TEMPO & PENAGIHAN PIUTANG*\n` +
                  `*${biz}*\n` +
                  `-----------------------------------------\n` +
                  `Kepada Yth. Kak *${customerName}*,\n\n` +
                  `Sistem kami mencatat tagihan transaksi Anda telah melewati batas tempo pembayaran (*${days} hari tertunggak*):\n` +
                  `• No. Nota  : *${invoiceNumber}*\n` +
                  `• Tanggal   : *${date}*\n` +
                  `• Total     : *Rp ${formattedAmount}*\n\n` +
                  `Mohon segera melakukan pelunasan ke rekening resmi kami:\n` +
                  `🏦 *${bank}*\n\n` +
                  `Harap kirimkan foto bukti transfer agar pengiriman dan proses pesanan snack berikutnya dapat kami jadwalkan tanpa kendala. Terima kasih atas pengertian dan kerjasamanya.`;
            break;
        case 'paid':
            msg = `*KWITANSI PEMBAYARAN RESMI*\n` +
                  `*${biz}*\n` +
                  `-----------------------------------------\n` +
                  `Yth. Kak *${customerName}*,\n\n` +
                  `Alhamdulillah, pembayaran untuk nota pesanan berikut telah kami terima dengan baik:\n` +
                  `• No. Nota  : *${invoiceNumber}*\n` +
                  `• Tanggal   : *${date}*\n` +
                  `• Jumlah    : *Rp ${formattedAmount}*\n` +
                  `• Status    : *LUNAS (Lunas Penuh)* ✅\n\n` +
                  `Pembayaran sudah tercatat rapi di sistem kami. Terima kasih banyak telah bermitra dengan *${biz}*! 🙏`;
            break;
    }

    const textarea = document.getElementById('wa-modal-textarea');
    if (textarea) textarea.value = msg;
}

async function copyWaMessageToClipboard() {
    const textarea = document.getElementById('wa-modal-textarea');
    if (!textarea || !textarea.value) return;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textarea.value);
        } else {
            textarea.select();
            document.execCommand('copy');
        }

        const label = document.getElementById('btn-wa-clip-copy-label');
        const feedback = document.getElementById('wa-copy-feedback');
        if (label) label.innerText = "Tersalin ke Clipboard!";
        if (feedback) {
            feedback.classList.remove('hidden');
            feedback.classList.add('inline-flex');
        }

        showNotification("Tersalin", "Teks penagihan WhatsApp berhasil disalin!", "success");

        setTimeout(() => {
            if (label) label.innerText = "Salin Teks (Clip to Copy)";
            if (feedback) {
                feedback.classList.remove('inline-flex');
                feedback.classList.add('hidden');
            }
        }, 2000);
    } catch (err) {
        showNotification("Gagal", "Gagal menyalin teks secara otomatis.", "error");
    }
}

function openWaWithCurrentMessage() {
    const textarea = document.getElementById('wa-modal-textarea');
    const msg = textarea ? textarea.value : '';
    const phoneInput = document.getElementById('wa-modal-phone');
    const phone = (typeof normalizeWaPhone === 'function'
        ? normalizeWaPhone(phoneInput ? phoneInput.value : '', appSettings?.whatsappPhone)
        : String(phoneInput ? phoneInput.value : '').replace(/\D/g, '').replace(/^0/, '62')) || '628123456789';

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Fallback untuk kompatibilitas panggilan modul lain
function sendSmartInvoiceReminderWA(invNumber, custName, amount, invDate, statusInv) {
    openWaInvoiceTemplatesModal(invNumber);
}

// Alias untuk kompatibilitas mundur
function sendInvoiceWA(invNumber, custName, amount, statusInv) {
    openWaInvoiceTemplatesModal(invNumber);
}

// =========================================================================
// FITUR DISTRIBUSI AGEN: LEADERBOARD MITRA & RESELLER TERBAIK
// =========================================================================
let currentLeaderboardPeriod = 'all';

function setLeaderboardPeriod(period) {
    currentLeaderboardPeriod = period;
    const btnMonth = document.getElementById('btn-lb-month');
    const btnAll = document.getElementById('btn-lb-all');
    if (btnMonth && btnAll) {
        if (period === 'month') {
            btnMonth.className = "px-3 py-1.5 rounded-full transition bg-indigo-600 text-white shadow-sm";
            btnAll.className = "px-3 py-1.5 rounded-full transition opacity-70 hover:opacity-100";
        } else {
            btnAll.className = "px-3 py-1.5 rounded-full transition bg-indigo-600 text-white shadow-sm";
            btnMonth.className = "px-3 py-1.5 rounded-full transition opacity-70 hover:opacity-100";
        }
    }
    renderCustomerLeaderboard();
}

function calculateCustomerLeaderboard(period = 'all') {
    const custMap = {};
    for (let mk in transactionData) {
        if (period === 'month' && mk !== activeMonthSheet) continue;
        (transactionData[mk] || []).forEach(t => {
            const cName = (t.customer || 'Pelanggan Umum').trim();
            if (!custMap[cName]) {
                custMap[cName] = {
                    name: cName,
                    totalSpent: 0,
                    orderCount: 0,
                    totalQty: 0,
                    lastDate: t.date,
                    items: {}
                };
            }
            custMap[cName].totalSpent += (t.totalSell || 0);
            custMap[cName].orderCount += 1;
            custMap[cName].totalQty += (t.qty || 0);
            if (t.date > custMap[cName].lastDate) {
                custMap[cName].lastDate = t.date;
            }
            custMap[cName].items[t.itemName] = (custMap[cName].items[t.itemName] || 0) + (t.qty || 0);
        });
    }

    return Object.values(custMap).sort((a, b) => b.totalSpent - a.totalSpent);
}

function renderCustomerLeaderboard() {
    const container = document.getElementById('customer-leaderboard-container');
    if (!container) return;

    const ranked = calculateCustomerLeaderboard(currentLeaderboardPeriod).slice(0, 6);

    if (ranked.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 text-center opacity-60 text-xs theme-card rounded-xl border">Belum ada riwayat transaksi pelanggan pada periode ini.</div>`;
        return;
    }

    const cards = ranked.map((cust, idx) => {
        let rankBadge = '';
        let tierTitle = '';

        if (idx === 0) {
            rankBadge = `<span class="w-6 h-6 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">1</span>`;
            tierTitle = 'Mitra Utama';
        } else if (idx === 1) {
            rankBadge = `<span class="w-6 h-6 rounded-md bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs">2</span>`;
            tierTitle = 'Mitra Gold';
        } else if (idx === 2) {
            rankBadge = `<span class="w-6 h-6 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 flex items-center justify-center font-bold text-xs">3</span>`;
            tierTitle = 'Mitra Silver';
        } else {
            rankBadge = `<span class="w-6 h-6 rounded-md border border-inherit text-slate-500 flex items-center justify-center font-semibold text-xs">${idx + 1}</span>`;
            tierTitle = 'Mitra Reguler';
        }

        // Cari produk favorit pelanggan
        let favoriteItem = '-';
        let maxItemQty = 0;
        for (let item in cust.items) {
            if (cust.items[item] > maxItemQty) {
                maxItemQty = cust.items[item];
                favoriteItem = `${item} (${maxItemQty}x)`;
            }
        }

        const safeCustName = escapeHtml(cust.name);
        const safeFavItem = escapeHtml(favoriteItem);
        const safeLastDate = escapeHtml(cust.lastDate || '-');
        const encodedCustName = encodeURIComponent(cust.name).replace(/'/g, "%27");

        return `
            <div class="theme-card rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        ${rankBadge}
                        <div>
                            <h4 class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[150px]">${safeCustName}</h4>
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">${tierTitle}</span>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                        ${cust.orderCount} pesanan
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-inherit">
                    <div>
                        <span class="opacity-60 block text-[10px]">Total Belanja</span>
                        <span class="font-bold text-slate-900 dark:text-slate-100 tabular-nums">Rp ${cust.totalSpent.toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="opacity-60 block text-[10px]">Volume Produk</span>
                        <span class="font-bold text-slate-900 dark:text-slate-100 tabular-nums">${cust.totalQty.toLocaleString()} pcs</span>
                    </div>
                </div>

                <div class="text-[11px] opacity-75 truncate">
                    <span class="opacity-60 text-[10px] block">Snack Paling Sering:</span>
                    <span class="font-semibold text-slate-800 dark:text-slate-200 truncate block">${safeFavItem}</span>
                </div>

                <div class="pt-2 border-t border-inherit flex items-center justify-between">
                    <span class="text-[10px] opacity-50">Terakhir: ${safeLastDate}</span>
                    <button type="button" onclick="sendCustomerRewardWA(decodeURIComponent('${encodedCustName}'), ${cust.totalSpent}, ${cust.orderCount})" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-[10px] font-semibold flex items-center gap-1.5 transition-colors">
                        <i class="fa-brands fa-whatsapp text-emerald-500"></i> Hubungi
                    </button>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = cards;
}

function sendCustomerRewardWA(cName, totalSpent, orderCount) {
    const custObj = customerData.find(c => c.name && c.name.toLowerCase() === cName.toLowerCase());
    let phone = (custObj && custObj.phone) ? custObj.phone : '';
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (!phone) phone = (appSettings && appSettings.whatsappPhone) ? appSettings.whatsappPhone : '628123456789';

    const biz = (appSettings && appSettings.businessName) ? appSettings.businessName : 'SnackLoop ERP';
    const msg = `Halo Kak ${cName}, terima kasih atas kemitraannya dengan ${biz}.\n\n` +
          `Total pesanan Kakak telah mencapai Rp ${Number(totalSpent).toLocaleString()} dari ${orderCount} transaksi.\n\n` +
          `Kami siap memberikan penawaran harga terbaik dan prioritas alokasi stok untuk pengiriman berikutnya. Jika ada kebutuhan re-stock dalam waktu dekat, silakan hubungi kami. Terima kasih banyak.`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function confirmDeleteInvoice(invId, invNumber) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", `Apakah Anda yakin ingin menghapus invoice ${invNumber} secara permanen?`, async () => {
        const idx = invoiceData.findIndex(i => String(i.id) === String(invId));
        const invTarget = idx !== -1 ? invoiceData[idx] : null;
        if(idx !== -1) invoiceData.splice(idx, 1);
        saveCacheToLocal();
        renderInvoicesTable();
        updateDashboard();
        logAuditActivity('INVOICE_DELETE', invNumber, `Menghapus invoice ${invNumber} (${invTarget ? invTarget.customer_name : ''}) senilai Rp ${(invTarget?.total_amount || 0).toLocaleString()}`);
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_INVOICE',
            payload: { id: invId }
        }, async () => {
            const { error } = await supabaseClient.from('invoices').delete().eq('id', invId);
            if(error) throw error;
        });
    });
}

async function markInvoiceAsPaid(invId, custName) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    
    // Optimistic update status invoice dan transaksi terkait
    const inv = invoiceData.find(i => String(i.id) === String(invId));
    if(inv) inv.status = 'Lunas';

    for(let mk in transactionData) {
        transactionData[mk].forEach((t) => {
            const isMatch = inv 
                ? ((t.customer === custName && t.date === inv.date) || (inv.invoice_number && t.notes && t.notes.includes(inv.invoice_number)))
                : (t.customer === custName);
            if(isMatch && t.status === 'Belum Lunas') {
                t.status = 'Lunas';
            }
        });
    }

    saveCacheToLocal();
    renderInvoicesTable();
    renderTransactionsForActiveSheet();
    updateDashboard();
    renderFinancialChart();

    const invNo = inv ? inv.invoice_number : `INV #${invId}`;
    const amount = inv ? inv.total_amount : 0;
    logAuditActivity('INVOICE_PAID', invNo, `Pelunasan tagihan invoice ${invNo} (${custName}) senilai Rp ${amount.toLocaleString()}`);

    showNotification("Sukses", "Invoice berhasil ditandai Lunas!", "success");

    dispatchMutation({
        type: 'UPDATE_INVOICE_PAID',
        payload: { invId, customerName: custName, date: inv ? inv.date : undefined }
    }, async () => {
        await supabaseClient.from('invoices').update({ status: 'Lunas' }).eq('id', invId);
        if(custName && inv && inv.date) {
            await supabaseClient.from('transactions').update({ status: 'Lunas' }).eq('customer', custName).eq('date', inv.date);
        } else if (custName) {
            await supabaseClient.from('transactions').update({ status: 'Lunas' }).eq('customer', custName);
        }
    });
}

function updateInvoicePDFStatus(status) {
    const badgeEl = document.getElementById('pdf-status-badge');
    const metaStatusEl = document.getElementById('inv-meta-status');
    const metaStatusWrap = document.getElementById('pdf-meta-status-wrap');

    if (!status) {
        if (badgeEl) badgeEl.innerHTML = '';
        if (metaStatusWrap) metaStatusWrap.style.display = 'none';
        return;
    }

    if (metaStatusWrap) metaStatusWrap.style.display = 'block';

    const isPaid = status === 'Lunas';
    const statusText = isPaid ? 'Lunas' : 'Belum Lunas';
    const badgeClass = isPaid
        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
        : 'bg-rose-100 text-rose-800 border border-rose-300';
    const textClass = isPaid ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold';

    if (badgeEl) {
        badgeEl.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${badgeClass}">${statusText}</span>`;
    }
    if (metaStatusEl) {
        metaStatusEl.className = textClass;
        metaStatusEl.innerText = statusText;
    }
}

async function renderSinglePagePDF(printAreaEl, fileName) {
    if (!printAreaEl) return;

    // Simpan style inline sebelumnya
    const prevBg = printAreaEl.style.backgroundColor;
    const prevColor = printAreaEl.style.color;
    const prevMaxWidth = printAreaEl.style.maxWidth;
    const prevWidth = printAreaEl.style.width;

    // Tetapkan geometri container cetak A4 yang presisi
    printAreaEl.style.backgroundColor = '#ffffff';
    printAreaEl.style.color = '#0f172a';
    printAreaEl.style.maxWidth = '780px';
    printAreaEl.style.width = '100%';

    const opt = {
        margin: [6, 8, 6, 8], // top, left, bottom, right (mm)
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };

    try {
        await html2pdf()
            .set(opt)
            .from(printAreaEl)
            .toCanvas()
            .then(function() {
                // Jaminan matematis: Canvas di-fit agar TIDAK PERNAH melebihi rasio 1 halaman A4
                if (this.prop && this.prop.canvas && this.prop.pageSize && this.prop.pageSize.inner) {
                    const canvas = this.prop.canvas;
                    const maxCanvasHeight = Math.floor(canvas.width * this.prop.pageSize.inner.ratio);
                    
                    if (canvas.height > maxCanvasHeight) {
                        const scaledCanvas = document.createElement('canvas');
                        scaledCanvas.width = canvas.width;
                        scaledCanvas.height = maxCanvasHeight;
                        const ctx = scaledCanvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);

                        const scale = maxCanvasHeight / canvas.height;
                        const targetW = canvas.width * scale;
                        const offsetX = (scaledCanvas.width - targetW) / 2;

                        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, offsetX, 0, targetW, maxCanvasHeight);
                        this.prop.canvas = scaledCanvas;
                    }
                }
            })
            .toPdf()
            .then(function() {
                // Pengaman tambahan: Hapus lembar ke-2 jika ada margin spillover
                if (this.prop && this.prop.pdf) {
                    const pdf = this.prop.pdf;
                    const totalPages = pdf.internal.getNumberOfPages();
                    if (totalPages > 1) {
                        for (let p = totalPages; p > 1; p--) {
                            pdf.deletePage(p);
                        }
                    }
                }
            })
            .save();
    } finally {
        printAreaEl.style.backgroundColor = prevBg;
        printAreaEl.style.color = prevColor;
        printAreaEl.style.maxWidth = prevMaxWidth;
        printAreaEl.style.width = prevWidth;
    }
}

async function downloadInvoicePDF(invNumber, statusInv) {
    const inv = invoiceData.find(i => i.invoice_number === invNumber);
    if(!inv) return showNotification("Gagal", "Invoice tidak ditemukan.", "error");

    // Jika pengaturan nota adalah Thermal 58mm atau 80mm
    if (appSettings && (appSettings.printFormat === 'thermal58' || appSettings.printFormat === 'thermal80')) {
        return printThermalReceiptFromInvoice(inv, appSettings.printFormat);
    }

    const titleEl = document.getElementById('pdf-doc-title');
    titleEl.innerText = statusInv === 'Lunas' ? "FAKTUR PENJUALAN" : "NOTA TAGIHAN";
    updateInvoicePDFStatus(statusInv);

    document.getElementById('pdf-meta-subtitle').innerText = "Ditagihkan Kepada:";
    document.getElementById('pdf-meta-id-wrap').style.display = "block";
    document.getElementById('pdf-total-label').innerText = statusInv === 'Lunas' ? "Total Dibayar" : "Total Tagihan";
    document.getElementById('pdf-footer-note').innerText = statusInv === 'Lunas' ? "Terima kasih, pembayaran telah diterima lunas!" : "Silakan lakukan pembayaran jika produk sudah habis.";

    document.getElementById('inv-meta-customer').innerText = inv.customer_name;
    document.getElementById('inv-meta-date').innerText = inv.date;
    document.getElementById('inv-meta-no').innerText = inv.invoice_number;
    document.getElementById('inv-subtotal').innerText = 'Rp ' + inv.total_amount.toLocaleString();
    document.getElementById('inv-grand-total').innerText = 'Rp ' + inv.total_amount.toLocaleString();

    let matchingTrx = [];
    for (let mk in transactionData) {
        (transactionData[mk] || []).forEach(t => {
            if (t.customer === inv.customer_name && t.date === inv.date) {
                matchingTrx.push(t);
            }
        });
    }

    let tbody = document.getElementById('inv-cart-body');
    const itemCount = matchingTrx.length;

    // Dynamic density scaling untuk kenyamanan membaca & proporsi 1 lembar
    let tdPadding = "py-2 px-1.5";
    let fontSize = "text-xs";
    if (itemCount > 10 && itemCount <= 18) {
        tdPadding = "py-1 px-1.5";
        fontSize = "text-[11px]";
    } else if (itemCount > 18 && itemCount <= 30) {
        tdPadding = "py-0.5 px-1";
        fontSize = "text-[10px]";
    } else if (itemCount > 30) {
        tdPadding = "py-0 px-1 leading-tight";
        fontSize = "text-[9px]";
    }

    if (itemCount > 0) {
        tbody.innerHTML = matchingTrx.map(t => `
            <tr class="border-b border-slate-200 ${fontSize}">
                <td class="${tdPadding} pr-2 font-medium">${escapeHtml(t.itemName)}</td>
                <td class="${tdPadding} text-center font-mono">${t.qty}</td>
                <td class="${tdPadding} text-right font-mono">Rp ${(t.sell || 0).toLocaleString()}</td>
                <td class="${tdPadding} pl-2 text-right font-bold font-mono">Rp ${(t.totalSell || 0).toLocaleString()}</td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `
            <tr class="border-b border-slate-200 text-xs">
                <td class="py-2.5 pr-2 font-medium">Pembelian / Titipan Produk SnackLoop</td>
                <td class="py-2.5 px-2 text-center font-mono">1</td>
                <td class="py-2.5 px-2 text-right font-mono">Rp ${inv.total_amount.toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right font-bold font-mono">Rp ${inv.total_amount.toLocaleString()}</td>
            </tr>`;
    }

    const printArea = document.querySelector('.print-area');
    const fileName = `${inv.invoice_number}_${inv.customer_name}.pdf`;
    await renderSinglePagePDF(printArea, fileName);

    showNotification("Sukses", "PDF Invoice (1 Lembar) berhasil diunduh.", "success");
}

// ======================= RENDER MONTH TABS ======================= //
function selectTransactionMonth(mk) {
    activeMonthSheet = mk;
    shouldAnimateTransactionMonths = false;
    const parts = mk.trim().split(/\s+/);
    if (parts.length > 1) {
        const yr = parts[parts.length - 1];
        activeTransactionYear = yr;
        isTransactionMonthsExpanded = true;
        if (typeof lastActiveMonthByYear === 'object') {
            lastActiveMonthByYear[yr] = mk;
        }
    }
    currentTransactionPage = 1;
    renderMonthTabs();
}

function setTransactionYear(yr, forceExpand = false) {
    const targetYr = String(yr);
    if (!forceExpand && targetYr === activeTransactionYear) {
        isTransactionMonthsExpanded = !isTransactionMonthsExpanded;
        shouldAnimateTransactionMonths = isTransactionMonthsExpanded;
        renderMonthTabs();
        return;
    }

    activeTransactionYear = targetYr;
    isTransactionMonthsExpanded = true;
    shouldAnimateTransactionMonths = true;

    let keys = typeof sortMonthKeys === 'function' ? sortMonthKeys(Object.keys(transactionData)) : Object.keys(transactionData).sort();
    const yearKeys = keys.filter(k => {
        const parts = k.trim().split(/\s+/);
        return (parts.length > 1 ? parts[parts.length - 1] : '') === activeTransactionYear;
    });

    if (yearKeys.length > 0) {
        if (typeof lastActiveMonthByYear === 'object' && lastActiveMonthByYear[activeTransactionYear] && yearKeys.includes(lastActiveMonthByYear[activeTransactionYear])) {
            activeMonthSheet = lastActiveMonthByYear[activeTransactionYear];
        } else {
            activeMonthSheet = yearKeys[yearKeys.length - 1];
        }
    }
    currentTransactionPage = 1;
    renderMonthTabs();
}

function renderMonthTabs() {
    const container = document.getElementById('month-tabs-container');
    if(!container) return;
    let keys = typeof sortMonthKeys === 'function' ? sortMonthKeys(Object.keys(transactionData)) : Object.keys(transactionData).sort();
    if(keys.length === 0) { keys = [getCurrentMonthKey(new Date())]; transactionData[keys[0]] = []; }
    if(!activeMonthSheet || !transactionData[activeMonthSheet]) activeMonthSheet = keys[keys.length-1];

    // Extract all unique years from available sheets
    const years = [...new Set(keys.map(k => {
        const p = k.trim().split(/\s+/);
        return p.length > 1 ? p[p.length - 1] : new Date().getFullYear().toString();
    }))].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Ensure activeTransactionYear is valid and in sync
    const activeSheetYear = activeMonthSheet ? (activeMonthSheet.trim().split(/\s+/)[1] || '') : '';
    if (!activeTransactionYear || !years.includes(activeTransactionYear)) {
        activeTransactionYear = (activeSheetYear && years.includes(activeSheetYear)) 
            ? activeSheetYear 
            : years[years.length - 1];
    }

    // Filter sheets belonging to activeTransactionYear
    const yearKeys = keys.filter(k => {
        const p = k.trim().split(/\s+/);
        const y = p.length > 1 ? p[p.length - 1] : '';
        return y === activeTransactionYear;
    });

    // If activeMonthSheet is not in current year's keys, select appropriate month
    if (yearKeys.length > 0 && !yearKeys.includes(activeMonthSheet)) {
        if (typeof lastActiveMonthByYear === 'object' && lastActiveMonthByYear[activeTransactionYear] && yearKeys.includes(lastActiveMonthByYear[activeTransactionYear])) {
            activeMonthSheet = lastActiveMonthByYear[activeTransactionYear];
        } else {
            activeMonthSheet = yearKeys[yearKeys.length - 1];
        }
    }

    if (activeMonthSheet && typeof lastActiveMonthByYear === 'object') {
        lastActiveMonthByYear[activeTransactionYear] = activeMonthSheet;
    }

    const isSuperAdmin = currentRole === 'super_admin';
    const canDelete = isSuperAdmin && keys.length > 1;

    // 1. Build Interactive Year Switcher HTML
    let yearSelectorHtml = '';
    if (years.length <= 1) {
        yearSelectorHtml = `
            <button type="button" onclick="setTransactionYear('${activeTransactionYear}')"
                aria-expanded="${isTransactionMonthsExpanded}"
                class="year-selector-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 cursor-pointer select-none ${isTransactionMonthsExpanded ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-xs' : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 shadow-xs'}"
                title="Klik untuk buka/tutup daftar bulan Tahun ${activeTransactionYear}">
                <i class="fa-solid fa-calendar-days text-indigo-500"></i>
                <span>Tahun ${activeTransactionYear}</span>
            </button>
        `;
    } else if (years.length <= 4) {
        yearSelectorHtml = `
            <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs shrink-0">
                ${years.map(yr => {
                    const isYrActive = yr === activeTransactionYear;
                    return `
                        <button type="button" onclick="setTransactionYear('${yr}')"
                            aria-expanded="${isYrActive && isTransactionMonthsExpanded}"
                            class="year-selector-btn px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isYrActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'}"
                            title="Klik untuk tampilkan/lipat sheet transaksi Tahun ${yr}">
                            <i class="fa-solid fa-calendar-days ${isYrActive ? 'text-white' : 'text-indigo-500'} text-[11px]"></i>
                            <span>Tahun ${yr}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        yearSelectorHtml = `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs shrink-0">
                <i class="fa-solid fa-calendar-days text-indigo-500 text-xs pl-1"></i>
                <select onchange="setTransactionYear(this.value, true)" class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1">
                    ${years.map(yr => `<option value="${yr}" ${yr === activeTransactionYear ? 'selected' : ''} class="text-slate-900 bg-white dark:bg-slate-800 dark:text-slate-100">Tahun ${yr}</option>`).join('')}
                </select>
            </div>
        `;
    }

    // 2. Build Month Tabs HTML for selected year
    let monthTabsHtml = '';
    if (isTransactionMonthsExpanded) {
        monthTabsHtml = yearKeys.map((mk, idx) => {
            const isActive = mk === activeMonthSheet;
            const monthName = mk.trim().split(/\s+/)[0]; // e.g. 'Mar', 'Apr', 'Nov'
            const animClass = shouldAnimateTransactionMonths ? 'month-pill-enter' : '';
            const deleteBtnHtml = canDelete ? `<span onclick="event.stopPropagation(); confirmDeleteMonthSheet('${mk}')" class="ml-1.5 opacity-50 hover:opacity-100 ${isActive ? 'text-white hover:text-rose-200' : 'text-rose-400 hover:text-rose-600'} text-[10px] transition-colors" title="Hapus Sheet ${mk}"><i class="fa-solid fa-xmark"></i></span>` : '';

            return `
                <button type="button" onclick="selectTransactionMonth('${mk}')" 
                    style="--pill-idx: ${idx};"
                    class="month-pill-btn ${animClass} px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'theme-input hover:border-indigo-400 dark:hover:border-indigo-500 hover:opacity-90'}"
                    title="Buka data ${mk}">
                    <span>${monthName}</span>
                    ${deleteBtnHtml}
                </button>`;
        }).join('');
    } else {
        const activeMonthShort = activeMonthSheet ? activeMonthSheet.trim().split(/\s+/)[0] : '';
        monthTabsHtml = `
            <button type="button" onclick="setTransactionYear('${activeTransactionYear}', true)"
                style="--pill-idx: 0;"
                class="month-pill-btn month-pill-enter px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white border border-indigo-600 shadow-sm flex items-center gap-1.5"
                title="Bulan aktif: ${activeMonthSheet} — Klik untuk membuka semua ${yearKeys.length} bulan">
                <span>${activeMonthShort}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-normal">${yearKeys.length} bln</span>
            </button>
        `;
    }

    // 3. Plus / New Month button
    const addMonthBtnHtml = isSuperAdmin ? `
        <button type="button" onclick="createNewMonthSheet()" 
            style="--pill-idx: ${isTransactionMonthsExpanded ? yearKeys.length : 1};"
            class="month-pill-btn ${shouldAnimateTransactionMonths ? 'month-pill-enter' : ''} px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-xs flex items-center gap-1.5 shrink-0"
            title="Tambah atau buka bulan baru">
            <i class="fa-solid fa-calendar-plus text-xs"></i>
            <span>+ Pilih Bulan</span>
        </button>
    ` : '';

    shouldAnimateTransactionMonths = false;

    container.innerHTML = `
        <div class="flex items-center gap-1.5 flex-wrap">
            ${yearSelectorHtml}
            <button type="button" onclick="setTransactionYear('${activeTransactionYear}')"
                class="year-chevron-btn w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-500 cursor-pointer select-none shrink-0"
                title="${isTransactionMonthsExpanded ? 'Lipat daftar bulan' : 'Buka daftar bulan'}">
                <i class="fa-solid fa-chevron-right text-[11px] year-chevron-icon ${isTransactionMonthsExpanded ? 'is-expanded' : 'is-collapsed'}"></i>
            </button>
            <div class="flex items-center gap-1.5 flex-wrap">
                ${monthTabsHtml}
                ${addMonthBtnHtml}
            </div>
        </div>
    `;

    renderTransactionsForActiveSheet();
}

window.selectTransactionMonth = selectTransactionMonth;
window.setTransactionYear = setTransactionYear;
window.setInvoiceYear = setInvoiceYear;
window.selectInvoiceMonthSheet = selectInvoiceMonthSheet;

function filterTrxStatus(st) {
    currentTransactionFilter = st;
    currentTransactionPage = 1; 
    document.getElementById('filter-btn-all').className = st === 'all' ? 'px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white text-xs' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    document.getElementById('filter-btn-lunas').className = st === 'Lunas' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white text-xs' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    document.getElementById('filter-btn-belum').className = st === 'Belum Lunas' ? 'px-3 py-1.5 rounded-lg font-bold bg-rose-600 text-white text-xs' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    renderTransactionsForActiveSheet();
}

// ======================= INTERACTIVE COLUMN SORTING ======================= //
function toggleTrxSort(field) {
    if (transactionSortField === field) {
        transactionSortOrder = transactionSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        transactionSortField = field;
        transactionSortOrder = (field === 'date' || field === 'totalSell') ? 'desc' : 'asc';
    }
    updateTrxSortIcons();
    renderTransactionsForActiveSheet();
}

function updateTrxSortIcons() {
    const fields = ['date', 'customer', 'itemName', 'totalSell'];
    fields.forEach(f => {
        const icon = document.getElementById(`${f}-sort-icon`);
        if (!icon) return;
        if (transactionSortField === f) {
            if (f === 'date' || f === 'totalSell') {
                icon.className = transactionSortOrder === 'asc'
                    ? 'fa-solid fa-arrow-up-short-wide text-[10px] text-indigo-500 opacity-100'
                    : 'fa-solid fa-arrow-down-wide-short text-[10px] text-indigo-500 opacity-100';
            } else {
                icon.className = transactionSortOrder === 'asc'
                    ? 'fa-solid fa-arrow-down-a-z text-[10px] text-indigo-500 opacity-100'
                    : 'fa-solid fa-arrow-up-z-a text-[10px] text-indigo-500 opacity-100';
            }
        } else {
            icon.className = 'fa-solid fa-sort text-[10px] opacity-40';
        }
    });
}

// ======================= OPTIMIZED RENDER TRANSACTIONS WITH PAGINATION & IN-MEMORY SEARCH ======================= //
let searchDebounceTimer = null;
function debouncedFilterTable() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        filterTable();
    }, 150);
}

function filterTable() {
    const input = document.getElementById('quick-search');
    currentSearchKeyword = input ? input.value.toLowerCase() : '';
    currentTransactionPage = 1; 
    renderTransactionsForActiveSheet();
}

function resetTransactionFilters() {
    const input = document.getElementById('quick-search');
    if (input) input.value = '';
    currentSearchKeyword = '';
    filterTrxStatus('all');
}

function renderTransactionsForActiveSheet() {
    document.getElementById('table-sheet-heading').innerText = `Tabel Penjualan: ${activeMonthSheet}`;
    const tbody = document.getElementById('trx-table-body'); 
    if(!tbody) return;
    
    const list = transactionData[activeMonthSheet] || [];
    
    let filteredList = list.filter(t => {
        const matchStatus = (currentTransactionFilter === 'all' || t.status === currentTransactionFilter);
        if (!matchStatus) return false;
        
        if (currentSearchKeyword) {
            const searchableText = `${t.date} ${t.customer} ${t.itemName} ${t.source} ${t.batch} ${t.notes}`.toLowerCase();
            return searchableText.includes(currentSearchKeyword);
        }
        return true;
    });

    filteredList.sort((a, b) => {
        let cmp = 0;
        if (transactionSortField === 'customer') {
            cmp = (a.customer || '').localeCompare(b.customer || '', 'id', { sensitivity: 'base' });
        } else if (transactionSortField === 'itemName') {
            cmp = (a.itemName || '').localeCompare(b.itemName || '', 'id', { sensitivity: 'base' });
        } else if (transactionSortField === 'totalSell') {
            cmp = (a.totalSell || 0) - (b.totalSell || 0);
        } else {
            cmp = (a.date || '').localeCompare(b.date || '');
        }
        if (cmp !== 0) {
            return transactionSortOrder === 'asc' ? cmp : -cmp;
        }
        return (b.id || 0) - (a.id || 0);
    });

    if(filteredList.length === 0) {
        const hasActiveFilter = currentTransactionFilter !== 'all' || Boolean(currentSearchKeyword);
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center">
            <div class="flex flex-col items-center justify-center gap-2">
                <i class="fas fa-search text-2xl opacity-30 mb-1"></i>
                <p class="text-xs font-semibold opacity-70">Belum ada transaksi yang sesuai ${hasActiveFilter ? 'dengan filter atau kata kunci pencarian Anda' : 'pada periode ini'}.</p>
                ${hasActiveFilter ? `
                    <button type="button" onclick="resetTransactionFilters()" class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition">
                        <i class="fas fa-rotate-left text-[11px]"></i> Reset Filter & Pencarian
                    </button>
                ` : ''}
            </div>
        </td></tr>`;
        renderPaginationControls(0);
        return;
    }

    const totalPages = Math.ceil(filteredList.length / rowsPerPage);
    if(currentTransactionPage > totalPages) currentTransactionPage = totalPages || 1;
    const startIndex = (currentTransactionPage - 1) * rowsPerPage;
    const paginatedList = filteredList.slice(startIndex, startIndex + rowsPerPage);

    const isSuperAdmin = currentRole === 'super_admin';
    const canMarkPaid = currentRole === 'super_admin' || currentRole === 'staff_rekap';
    const rowsHtml = paginatedList.map((t) => {
        const itemProfit = t.profitPerItem * t.qty;
        const safeCustomer = escapeHtml(t.customer);
        const safeItemName = escapeHtml(t.itemName);
        const safeSource = escapeHtml(t.source);
        const safeBatch = escapeHtml(t.batch);
        const safeNotes = escapeHtml(t.notes);
        const safeExtraCostNote = escapeHtml(t.extraCostNote);
        const safeDate = escapeHtml(t.date);

        const statusDropdown = isSuperAdmin ? 
            `<select onchange="updateTrxStatus('${t.id}', this.value)" class="text-[11px] font-bold px-2 py-1 rounded border cursor-pointer outline-none ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}"><option value="Lunas" ${t.status === 'Lunas' ? 'selected' : ''}>Lunas</option><option value="Belum Lunas" ${t.status === 'Belum Lunas' ? 'selected' : ''}>Belum Lunas</option></select>` :
            (canMarkPaid && t.status !== 'Lunas' ?
                `<button onclick="updateTrxStatus('${t.id}', 'Lunas')" class="px-2 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-600 hover:bg-emerald-500/20 hover:text-emerald-600 transition" title="Klik untuk tandai Lunas">Belum Lunas (Lunasi)</button>` :
                `<span class="px-2 py-1 rounded text-xs font-bold ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}">${t.status}</span>`);

        const srcBadge = t.source === 'Repack' ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-500 px-1 rounded font-bold">${safeBatch}</span>` : `<span class="text-[9px] theme-input border px-1 rounded font-bold">${safeSource}</span>`;
        const notesDisplay = t.notes && t.notes !== '-' ? `<span class="block text-[10px] text-amber-500 italic">Notes: ${safeNotes}</span>` : '';
        const extraCostDisplay = t.extraCost > 0 ? `<span class="text-amber-500 font-bold">+Rp ${t.extraCost.toLocaleString()}</span><br><span class="text-[9px] opacity-70 italic">(${safeExtraCostNote})</span>` : `<span class="opacity-40">-</span>`;
        
        const isNegativeOrReturn = t.isReturn || (t.qty < 0);
        const returBadge = isNegativeOrReturn ? `<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 mr-1">RETUR</span>` : '';
        const returActionBtn = !isNegativeOrReturn ? `<button onclick="openReturnModalFromTrx('${t.id}')" title="Catat Retur Toko" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold"><i class="fa-solid fa-arrow-rotate-left"></i></button>` : '';

        const deleteBtn = isSuperAdmin ? `<button onclick="confirmDeleteTrx('${t.id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '';

        const actionBtn = `
            ${returActionBtn}
            <button onclick="downloadPDF('${t.id}')" title="Cetak / Download Nota" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-print"></i></button>
            <button onclick="sendWhatsAppOnly('${t.id}')" title="Kirim WA" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-brands fa-whatsapp"></i></button>
            ${deleteBtn}`;

        const modalDisplay = isSuperAdmin ? `Rp ${t.totalModal.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;
        const profitDisplay = isSuperAdmin ? `Rp ${itemProfit.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit">${safeDate}</td>
                <td class="p-3 border border-inherit font-bold text-indigo-500">${safeCustomer}</td>
                <td class="p-3 border border-inherit font-medium">${returBadge}${safeItemName} <br>${srcBadge} ${notesDisplay}</td>
                <td class="p-3 border border-inherit text-center font-bold">${t.qty}</td>
                <td class="p-3 border border-inherit text-center">${extraCostDisplay}</td>
                <td class="p-3 border border-inherit opacity-70">${modalDisplay}</td>
                <td class="p-3 border border-inherit font-bold">Rp ${t.totalSell.toLocaleString()}</td>
                <td class="p-3 border border-inherit">${statusDropdown}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">${profitDisplay}</td>
                <td class="p-3 border border-inherit text-center space-x-1">${actionBtn}</td>
            </tr>`;
    }).join('');

    tbody.innerHTML = rowsHtml;
    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    let paginationContainer = document.getElementById('table-pagination-container');
    if(!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'table-pagination-container';
        paginationContainer.className = 'flex justify-between items-center pt-4 text-xs no-print';
        const tableCard = document.querySelector('#main-table').closest('.theme-card');
        if(tableCard) tableCard.appendChild(paginationContainer);
    }

    if(totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = `
        <span class="opacity-70">Halaman ${currentTransactionPage} dari ${totalPages} (Menampilkan 25 baris/hal)</span>
        <div class="space-x-1">
            <button onclick="changeTrxPage(${currentTransactionPage - 1})" ${currentTransactionPage === 1 ? 'disabled class="opacity-40 px-3 py-1.5 border rounded-lg cursor-not-allowed"' : 'class="px-3 py-1.5 theme-input border rounded-lg font-bold hover:bg-slate-100 transition"'}>Prev</button>
            <button onclick="changeTrxPage(${currentTransactionPage + 1})" ${currentTransactionPage === totalPages ? 'disabled class="opacity-40 px-3 py-1.5 border rounded-lg cursor-not-allowed"' : 'class="px-3 py-1.5 theme-input border rounded-lg font-bold hover:bg-slate-100 transition"'}>Next</button>
        </div>
    `;
}

function changeTrxPage(targetPage) {
    currentTransactionPage = targetPage;
    renderTransactionsForActiveSheet();
}

function confirmDeleteTrx(id) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus transaksi ini?", async () => {
        const list = transactionData[activeMonthSheet] || [];
        const trxIdx = list.findIndex(t => String(t.id) === String(id));
        if(trxIdx === -1) return;
        const trx = list[trxIdx];

        // Optimistic pengembalian stok repack
        if(trx.source === 'Repack' && trx.batch) {
            const rItem = repackData.find(r => r.id === trx.batch);
            if(rItem) rItem.remaining_qty += trx.qty;
        }

        // Hapus dari memori lokal
        list.splice(trxIdx, 1);
        saveCacheToLocal();

        // Render UI instan
        renderTransactionsForActiveSheet(); 
        updateDashboard(); 
        renderFinancialChart();
        renderRepackWarehouse();

        logAuditActivity('TRANSACTION_DELETE', `TRX #${id}`, `Menghapus transaksi ${trx.qty}x ${trx.itemName} (${trx.customer}) senilai Rp ${(trx.totalSell || 0).toLocaleString()}`);
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_TRANSACTION',
            payload: { id, source: trx.source, batch: trx.batch, qty: trx.qty }
        }, async () => {
            if(trx.source === 'Repack' && trx.batch) {
                const rItem = repackData.find(r => r.id === trx.batch);
                if(rItem) await supabaseClient.from('repack').update({ remaining_qty: rItem.remaining_qty }).eq('id', trx.batch);
            }
            const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

async function updateTrxStatus(id, newStatus) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const list = transactionData[activeMonthSheet] || [];
    const trx = list.find(t => String(t.id) === String(id));
    let oldStatus = 'Belum Lunas';
    if(trx) {
        oldStatus = trx.status;
        trx.status = newStatus;
        saveCacheToLocal();
        renderTransactionsForActiveSheet();
        updateDashboard();
        renderFinancialChart();

        logAuditActivity('TRANSACTION_STATUS_CHANGE', `TRX #${id}`, `Mengubah status transaksi ${trx.customer} (${trx.itemName}) dari "${oldStatus}" menjadi "${newStatus}"`);
    }
    showNotification("Sukses", "Status transaksi diperbarui.", "success");

    dispatchMutation({
        type: 'UPDATE_TRANSACTION_STATUS',
        payload: { id, status: newStatus }
    }, async () => {
        const { error } = await supabaseClient.from('transactions').update({ status: newStatus }).eq('id', id);
        if(error) throw error;
    });
}

async function downloadPDF(trxId) {
    let targetTrx = null;
    for(let m in transactionData) {
        const found = transactionData[m].find(t => String(t.id) === String(trxId));
        if(found) { targetTrx = found; break; }
    }
    if (!targetTrx) return showNotification('Gagal', 'Data tidak valid!', 'error');

    // Jika pengaturan nota adalah Thermal 58mm atau 80mm
    if (appSettings && (appSettings.printFormat === 'thermal58' || appSettings.printFormat === 'thermal80')) {
        return printThermalReceiptFromTrx(targetTrx, appSettings.printFormat);
    }
    
    document.getElementById('pdf-doc-title').innerText = targetTrx.status === 'Lunas' ? "FAKTUR PENJUALAN" : "NOTA TAGIHAN";
    updateInvoicePDFStatus(targetTrx.status);
    document.getElementById('pdf-meta-subtitle').innerText = "Ditagihkan Kepada:";
    document.getElementById('pdf-meta-id-wrap').style.display = "block";
    document.getElementById('pdf-total-label').innerText = targetTrx.status === 'Lunas' ? "Total Dibayar" : "Total Tagihan";
    document.getElementById('pdf-footer-note').innerText = targetTrx.status === 'Lunas' ? "Terima kasih, pembayaran lunas!" : "Silakan bayar jika produk sudah habis.";
    
    await prepareInvoiceCartFromRow(targetTrx);

    const parts = targetTrx.date.split('-');
    const fileName = `${parts[2]}-${parts[1]}-${parts[0]}_${targetTrx.customer}_Receipt.pdf`;

    const printArea = document.querySelector('.print-area');
    await renderSinglePagePDF(printArea, fileName);
    showNotification("Sukses", "Nota PDF (1 Lembar) berhasil diunduh.", "success");
}

async function prepareInvoiceCartFromRow(targetTrx) {
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);
    let grandTotal = 0;
    let tbody = document.getElementById('inv-cart-body');
    if(!tbody) return;

    const itemCount = matchingTransactions.length;
    let tdPadding = "py-2 px-1.5";
    let fontSize = "text-xs";
    if (itemCount > 10 && itemCount <= 18) {
        tdPadding = "py-1 px-1.5";
        fontSize = "text-[11px]";
    } else if (itemCount > 18 && itemCount <= 30) {
        tdPadding = "py-0.5 px-1";
        fontSize = "text-[10px]";
    } else if (itemCount > 30) {
        tdPadding = "py-0 px-1 leading-tight";
        fontSize = "text-[9px]";
    }

    const rows = matchingTransactions.map(t => {
        grandTotal += t.totalSell;
        const safeItemName = escapeHtml(t.itemName || '');
        return `
            <tr class="border-b border-slate-200 ${fontSize}">
                <td class="${tdPadding} pr-2 font-medium">${safeItemName}</td>
                <td class="${tdPadding} text-center font-mono">${t.qty}</td>
                <td class="${tdPadding} text-right font-mono">Rp ${(t.totalSell / (t.qty || 1)).toLocaleString()}</td>
                <td class="${tdPadding} pl-2 text-right font-bold font-mono">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;

    document.getElementById('inv-meta-customer').innerText = targetTrx.customer;
    document.getElementById('inv-meta-date').innerText = targetTrx.date;
    document.getElementById('inv-meta-no').innerText = `INV-${targetTrx.date.replace(/-/g,'')}-${targetTrx.id}`;
    document.getElementById('inv-subtotal').innerText = 'Rp ' + grandTotal.toLocaleString();
    document.getElementById('inv-grand-total').innerText = 'Rp ' + grandTotal.toLocaleString();
}

async function printMonthlyRecapPDF() {
    const list = transactionData[activeMonthSheet] || [];
    if(list.length === 0) return showNotification("Peringatan", `Sheet ${activeMonthSheet} kosong.`, "warning");

    let totalPendapatan = 0; let totalModal = 0; let totalKeuntungan = 0;
    let tbody = document.getElementById('inv-cart-body');

    const rows = list.map((t, index) => {
        const itemProfit = (t.profitPerItem * t.qty);
        totalPendapatan += t.totalSell;
        totalModal += t.totalModal;
        if(t.status === 'Lunas') totalKeuntungan += itemProfit;

        const safeCustomer = escapeHtml(t.customer || '');
        const safeItemName = escapeHtml(t.itemName || '');
        const safeDate = escapeHtml(t.date || '');
        const safeStatus = escapeHtml(t.status || '');

        return `
            <tr class="border-b border-slate-200 text-xs">
                <td class="py-2.5 pr-2">${index + 1}. ${safeDate} - <b>${safeCustomer}</b><br><span class="opacity-70">${safeItemName} (${t.qty}x)</span></td>
                <td class="py-2.5 px-2 text-center">${safeStatus}</td>
                <td class="py-2.5 px-2 text-right">Rp ${t.totalModal.toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    }).join('');
    if(tbody) tbody.innerHTML = rows;

    document.getElementById('pdf-doc-title').innerText = "REKAP LAPORAN KEUANGAN";
    updateInvoicePDFStatus('');
    document.getElementById('pdf-meta-subtitle').innerText = "Periode Bulan:";
    document.getElementById('inv-meta-customer').innerText = activeMonthSheet;
    document.getElementById('inv-meta-date').innerText = new Date().toISOString().slice(0, 10);
    document.getElementById('pdf-meta-id-wrap').style.display = "none";
    document.getElementById('pdf-subtotal-row').innerHTML = `<span>Total Modal (HPP)</span><span class="font-medium">Rp ${totalModal.toLocaleString()}</span>`;
    document.getElementById('pdf-total-label').innerText = "Keuntungan Bersih (Lunas)";
    document.getElementById('inv-grand-total').innerText = 'Rp ' + totalKeuntungan.toLocaleString();
    document.getElementById('pdf-footer-note').innerText = `Total Pendapatan Periode Ini: Rp ${totalPendapatan.toLocaleString()}`;

    const fileName = `Rekap_Keuangan_${activeMonthSheet.replace(' ', '_')}.pdf`;

    html2pdf().from(document.querySelector('.print-area')).set({
        margin: 10, filename: fileName, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();

    showNotification("Sukses", `Rekap PDF bulan ${activeMonthSheet} berhasil diunduh.`, "success");
}

async function sendWhatsAppOnly(trxId) {
    let targetTrx = null;
    for(let m in transactionData) {
        const found = transactionData[m].find(t => String(t.id) === String(trxId));
        if(found) { targetTrx = found; break; }
    }
    if (!targetTrx) return showNotification('Gagal', 'Data tidak valid!', 'error');
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);

    let total = 0; let itemsText = "";
    matchingTransactions.forEach((t) => {
        itemsText += `- ${t.itemName} (${t.qty}x) - Rp ${t.totalSell.toLocaleString()}%0A`;
        total += t.totalSell;
    });

    const custObj = customerData.find(c => c.name === targetTrx.customer);
    const phone = custObj && custObj.phone ? custObj.phone : (appSettings?.whatsappPhone || '628123456789');

    const bizTitle = (appSettings?.businessName || 'SNACKLOOP').toUpperCase();
    let msg = `*NOTA ${bizTitle} (${targetTrx.monthKey})*%0A`;
    msg += `Kepada: *${targetTrx.customer}*%0ATanggal: ${targetTrx.date}%0A`;
    msg += `-----------------------------------%0A` + itemsText + `-----------------------------------%0A`;
    msg += `*TOTAL: Rp ${total.toLocaleString('id-ID')}*%0AStatus: *${targetTrx.status}*%0A`;
    if (appSettings?.bankAccount) {
        msg += `-----------------------------------%0A*Info Pembayaran Bank:*%0A${appSettings.bankAccount}%0A`;
    }
    msg += `Terima kasih atas pesanan Anda!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openExpenseModal() {
    document.getElementById('expense-modal').classList.remove('hidden');
    document.getElementById('expense-modal').classList.add('flex');
}
function closeExpenseModal() {
    document.getElementById('expense-modal').classList.remove('flex');
    document.getElementById('expense-modal').classList.add('hidden');
}

async function saveExpense() {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const date = document.getElementById('exp-date').value;
    const description = document.getElementById('exp-desc').value.trim();
    const amount = getCleanNumber('exp-amount');

    if(!description || !amount) return showNotification("Peringatan", "Isi keterangan dan nominal biaya!", "warning");

    const tempExp = { id: 'exp_' + Date.now(), date, description, amount };
    expenseData.unshift(tempExp);
    saveCacheToLocal();

    updateDashboard();
    renderFinancialChart();
    closeExpenseModal();
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
    showNotification("Sukses", "Biaya operasional berhasil dicatat!", "success");

    dispatchMutation({
        type: 'INSERT_EXPENSE',
        payload: { date, description, amount }
    }, async () => {
        const { data, error } = await supabaseClient.from('expenses').insert([{ date, description, amount }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempExp.id = data[0].id;
    });
}

function addMemo() {
    const input = document.getElementById('memo-input');
    const priority = document.getElementById('memo-priority').value;
    if(!input.value.trim()) return;

    const memos = JSON.parse(localStorage.getItem('snackloop_memos') || '[]');
    memos.unshift({ text: input.value, priority, date: new Date().toLocaleDateString() });
    localStorage.setItem('snackloop_memos', JSON.stringify(memos));
    input.value = '';
    loadMemos();
}

function loadMemos() {
    const list = document.getElementById('memo-list');
    if(!list) return;
    const memos = JSON.parse(localStorage.getItem('snackloop_memos') || '[]');
    if(memos.length === 0) {
        list.innerHTML = '<p class="text-slate-400 italic">Belum ada memo tersimpan.</p>';
        return;
    }
    list.innerHTML = memos.map((m, idx) => {
        const safeText = escapeHtml(m.text || '');
        const safeDate = escapeHtml(m.date || '');
        const safePriority = escapeHtml(m.priority || 'Normal');
        return `
        <div class="p-2.5 theme-input border rounded-xl flex justify-between items-center">
            <div>
                <span class="font-medium block">${safeText}</span>
                <span class="text-[10px] opacity-60">${safeDate} • <strong class="${m.priority === 'Urgent' ? 'text-red-500' : 'text-amber-500'}">${safePriority}</strong></span>
            </div>
            <button onclick="deleteMemo(${idx})" class="text-slate-400 hover:text-rose-500 text-xs px-1.5">✕</button>
        </div>
    `;}).join('');
}

function deleteMemo(idx) {
    const memos = JSON.parse(localStorage.getItem('snackloop_memos') || '[]');
    memos.splice(idx, 1);
    localStorage.setItem('snackloop_memos', JSON.stringify(memos));
    loadMemos();
}

function setDashboardTimeFilter(filterType) {
    currentDashboardTimeFilter = filterType;
    
    ['today', '7days', '30days', 'all'].forEach(f => {
        const btn = document.getElementById(`btn-filter-${f}`);
        if(btn) {
            if(f === filterType) {
                btn.className = "px-4 py-2 rounded-full transition bg-indigo-600 text-white shadow-md";
            } else {
                btn.className = "px-4 py-2 rounded-full transition opacity-70 hover:opacity-100";
            }
        }
    });

    const labels = { 'today': 'Hari Ini', '7days': '7 Hari Terakhir', '30days': '30 Hari Terakhir', 'all': 'Keseluruhan' };
    const labelEl = document.getElementById('stat-time-label');
    if(labelEl) labelEl.innerText = `Periode: ${labels[filterType]}`;

    updateDashboard();
}

function updateDashboard() {
    let Pendapatan = 0, modal = 0, KeuntunganKotor = 0, Hutang = 0, totalExpense = 0; 
    let unpaidList = [];
    let productSalesMap = {}; 

    const todayObj = new Date();
    todayObj.setHours(0,0,0,0);
    const todayTime = todayObj.getTime();
    const todayStr = todayObj.toISOString().split('T')[0];

    // Zero-Allocation Cutoff Strings untuk eliminasi ribuan instance new Date()
    let cutoff7Str = '';
    let cutoff30Str = '';
    if (currentDashboardTimeFilter === '7days') {
        const d7 = new Date(todayTime - 7 * 86400000);
        cutoff7Str = d7.toISOString().split('T')[0];
    } else if (currentDashboardTimeFilter === '30days') {
        const d30 = new Date(todayTime - 30 * 86400000);
        cutoff30Str = d30.toISOString().split('T')[0];
    }

    for(let mk in transactionData) {
        (transactionData[mk] || []).forEach((t) => {
            const tDateStr = t.date || '';
            if (currentDashboardTimeFilter === 'today' && tDateStr !== todayStr) return;
            if (currentDashboardTimeFilter === '7days' && (tDateStr < cutoff7Str || tDateStr > todayStr)) return;
            if (currentDashboardTimeFilter === '30days' && (tDateStr < cutoff30Str || tDateStr > todayStr)) return;

            modal += (t.totalModal || 0);

            if(t.status === 'Lunas') {
                Pendapatan += (t.totalSell || 0); 
                KeuntunganKotor += ((t.profitPerItem || 0) * (t.qty || 0));
            } else { 
                Hutang += (t.totalSell || 0); 
                unpaidList.push(t); 
            }

            if(!productSalesMap[t.itemName]) {
                productSalesMap[t.itemName] = { qty: 0, revenue: 0 };
            }
            productSalesMap[t.itemName].qty += (t.qty || 0);
            productSalesMap[t.itemName].revenue += (t.totalSell || 0);
        });
    }

    (expenseData || []).forEach(exp => {
        const expDateStr = exp.date || '';
        if (currentDashboardTimeFilter === 'today' && expDateStr !== todayStr) return;
        if (currentDashboardTimeFilter === '7days' && (expDateStr < cutoff7Str || expDateStr > todayStr)) return;
        if (currentDashboardTimeFilter === '30days' && (expDateStr < cutoff30Str || expDateStr > todayStr)) return;

        totalExpense += (exp.amount || 0);
    });

    const NetProfitFinal = KeuntunganKotor - totalExpense;
    const isSuperAdmin = currentRole === 'super_admin';
    const canMarkPaid = currentRole === 'super_admin' || currentRole === 'staff_rekap';

    document.getElementById('stat-Pendapatan').innerText = 'Rp ' + Pendapatan.toLocaleString();
    document.getElementById('stat-expense').innerText = isSuperAdmin ? ('Rp ' + totalExpense.toLocaleString()) : '*** (Rahasia)';
    document.getElementById('stat-Keuntungan').innerText = isSuperAdmin ? ('Rp ' + NetProfitFinal.toLocaleString()) : '*** (Rahasia)';
    document.getElementById('stat-Hutang').innerText = 'Rp ' + Hutang.toLocaleString();
    
    const labelsDesc = {
        'id': { 'today': 'Hari Ini', '7days': '7 Hari Terakhir', '30days': '30 Hari Terakhir', 'all': 'Keseluruhan' },
        'en': { 'today': 'Today', '7days': 'Last 7 Days', '30days': 'Last 30 Days', 'all': 'All Time' }
    };
    const activeDesc = labelsDesc[currentLanguage] || labelsDesc['id'];
    const pDesc = document.getElementById('stat-Pendapatan-desc');
    if (pDesc) pDesc.innerText = activeDesc[currentDashboardTimeFilter] || activeDesc['all'];

    renderTopProducts(productSalesMap);
    renderCustomerLeaderboard();
    renderDashboardHistory(); 

    const uBody = document.getElementById('dashboard-unpaid-body');
    const unpaidBadge = document.getElementById('unpaid-badge');
    if (unpaidBadge) unpaidBadge.innerText = `${unpaidList.length} Item`;
    if(uBody) {
        if(unpaidList.length === 0) {
            uBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center opacity-60">Tidak ada Piutang aktif. Mantap!</td></tr>`;
        } else {
            // O(1) Customer phone lookup dictionary
            const custMap = new Map((customerData || []).map(c => [c.name, c.phone || '']));
            const defaultPhone = (appSettings && appSettings.whatsappPhone) ? appSettings.whatsappPhone : '628123456789';
            const bank = (appSettings && appSettings.bankAccount) ? appSettings.bankAccount : 'BCA 12345678 a/n SnackLoop';

            const uRows = unpaidList.map(t => {
                const btnLunasi = canMarkPaid ? `<button onclick="updateTrxStatus('${t.id}', 'Lunas')" class="bg-indigo-500/25 text-indigo-500 px-2.5 py-1 rounded text-[11px] font-bold">Lunasi</button>` : '-';
                let rawPhone = custMap.get(t.customer) || defaultPhone;
                let phone = rawPhone.replace(/\D/g, '');
                if (phone.startsWith('0')) phone = '62' + phone.substring(1);

                // Hitung umur piutang via timestamp math tanpa overhead alokasi Date
                const tTime = Date.parse(t.date) || todayTime;
                const diffDays = Math.max(0, Math.floor((todayTime - tTime) / 86400000));
                
                let agingBadge = '';
                if (diffDays <= 7) {
                    agingBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">${diffDays}h (Lancar)</span>`;
                } else if (diffDays <= 14) {
                    agingBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 font-bold">${diffDays}h (Perhatian)</span>`;
                } else {
                    agingBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold animate-pulse">${diffDays}h (Jatuh Tempo)</span>`;
                }

                const waText = `Halo Kak ${t.customer}, salam dari SnackLoop. Mengonfirmasi tagihan pesanan ${t.itemName} sebesar Rp ${t.totalSell.toLocaleString()} (sudah berjalan ${diffDays} hari). Pembayaran dapat ditransfer ke ${bank}. Terima kasih banyak!`;
                const safeWaParam = encodeURIComponent(waText).replace(/'/g, "%27");
                const waBtn = `<button onclick="window.open('https://wa.me/${phone}?text=${safeWaParam}', '_blank')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1 mx-auto"><i class="fa-brands fa-whatsapp"></i> Tagih</button>`;
                
                const safeDate = escapeHtml(t.date || '');
                const safeMonthKey = escapeHtml(t.monthKey || '');
                const safeCustomer = escapeHtml(t.customer || '');
                const safeItemName = escapeHtml(t.itemName || '');

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="p-2.5 border border-inherit">${safeDate} <br><span class="text-[9px] opacity-60">${safeMonthKey}</span></td>
                        <td class="p-2.5 border border-inherit">
                            <span class="font-bold text-indigo-500 block">${safeCustomer}</span>
                            ${agingBadge}
                        </td>
                        <td class="p-2.5 border border-inherit font-medium">${safeItemName} (${t.qty}x)</td>
                        <td class="p-2.5 border border-inherit font-bold text-rose-500">Rp ${t.totalSell.toLocaleString()}</td>
                        <td class="p-2.5 border border-inherit text-center">${waBtn}</td>
                        <td class="p-2.5 border border-inherit text-center">${btnLunasi}</td>
                    </tr>`;
            }).join('');
            uBody.innerHTML = uRows;
        }
    }
}

function renderDashboardHistory() {
    const tbody = document.getElementById('dashboard-history-body');
    if(!tbody) return;

    const sortedHistory = [...priceHistoryData].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at)).slice(0, 5);

    if(sortedHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center opacity-60">Belum ada riwayat kenaikan harga modal tercatat.</td></tr>`;
        return;
    }

    const rows = sortedHistory.map(h => {
        const diff = h.new_buy - h.old_buy;
        const diffBadge = diff > 0 ? 
            `<span class="text-rose-500 font-bold">+Rp ${diff.toLocaleString()} (Naik)</span>` : 
            diff < 0 ? `<span class="text-emerald-500 font-bold">-Rp ${Math.abs(diff).toLocaleString()} (Turun)</span>` : `<span class="opacity-50">Tetap</span>`;

        const safeProdName = escapeHtml(h.product_name || '');
        const safeChangedBy = escapeHtml(h.changed_by || 'admin');
        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-2.5 border border-inherit opacity-70">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                <td class="p-2.5 border border-inherit font-bold text-indigo-500">${safeProdName}</td>
                <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                <td class="p-2.5 border border-inherit">${diffBadge}</td>
                <td class="p-2.5 border border-inherit font-medium">${safeChangedBy}</td>
            </tr>`;
    }).join('');

    tbody.innerHTML = rows;
}

function renderTopProducts(salesMap) {
    const container = document.getElementById('top-products-container');
    if(!container) return;

    const sortedProducts = Object.keys(salesMap).map(name => ({
        name,
        qty: salesMap[name].qty,
        revenue: salesMap[name].revenue
    })).sort((a, b) => b.qty - a.qty).slice(0, 4);

    if(sortedProducts.length === 0) {
        container.innerHTML = `<div class="col-span-full p-4 text-center opacity-60 text-xs">Belum ada data penjualan pada periode ini.</div>`;
        return;
    }

    const cards = sortedProducts.map((p, idx) => `
        <div class="p-4 theme-input border rounded-2xl flex flex-col justify-between space-y-2 shadow-sm">
            <div class="flex justify-between items-start">
                <span class="text-xs font-bold opacity-60">#${idx + 1}</span>
                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 font-bold rounded text-[10px]">${p.qty} Terjual</span>
            </div>
            <div>
                <h4 class="font-bold text-sm line-clamp-1">${escapeHtml(p.name)}</h4>
                <p class="text-xs font-semibold text-indigo-500 mt-0.5">Rp ${p.revenue.toLocaleString()}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = cards;
}

function renderFinancialChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('financialChart');
    if(!ctx) return;

    let months = typeof sortMonthKeys === 'function' ? sortMonthKeys(Object.keys(transactionData)) : Object.keys(transactionData).sort();
    let pendapatanData = [];
    let keuntunganData = [];

    months.forEach(mk => {
        let omz = 0; let lab = 0;
        (transactionData[mk] || []).forEach(t => {
            if(t.status === 'Lunas') {
                omz += t.totalSell;
                lab += (t.profitPerItem * t.qty);
            }
        });
        pendapatanData.push(omz);
        keuntunganData.push(lab);
    });

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? '#21262d' : '#e2e8f0';
    const chartLabels = months.length > 0 ? months : ['Belum Ada Data'];
    const pData = pendapatanData.length > 0 ? pendapatanData : [0];
    const kData = keuntunganData.length > 0 ? keuntunganData : [0];

    // In-place chart update untuk transisi data yang sangat halus tanpa redraw/flicker
    if(financialChartInstance) {
        financialChartInstance.data.labels = chartLabels;
        financialChartInstance.data.datasets[0].data = pData;
        financialChartInstance.data.datasets[1].data = kData;
        if(financialChartInstance.options && financialChartInstance.options.scales) {
            if(financialChartInstance.options.scales.x && financialChartInstance.options.scales.x.ticks) {
                financialChartInstance.options.scales.x.ticks.color = textColor;
            }
            if(financialChartInstance.options.scales.y) {
                if(financialChartInstance.options.scales.y.ticks) financialChartInstance.options.scales.y.ticks.color = textColor;
                if(financialChartInstance.options.scales.y.grid) financialChartInstance.options.scales.y.grid.color = gridColor;
            }
        }
        if(financialChartInstance.options && financialChartInstance.options.plugins && financialChartInstance.options.plugins.legend && financialChartInstance.options.plugins.legend.labels) {
            financialChartInstance.options.plugins.legend.labels.color = textColor;
        }
        financialChartInstance.update();
        return;
    }

    financialChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Total Pendapatan',
                    data: pData,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1,
                    borderRadius: 8
                },
                {
                    label: 'Keuntungan Bersih',
                    data: kData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: 'Poppins', size: 11 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: 'Poppins', size: 10 },
                        callback: function(value) { return 'Rp ' + value.toLocaleString(); }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Poppins', size: 10 } }
                }
            }
        }
    });
}

async function exportActiveSheetToExcelLocal() {
    const list = transactionData[activeMonthSheet] || [];
    if (list.length === 0) return showNotification("Peringatan", "Sheet kosong.", "warning");
    const rows = list.map((t, idx) => ({
        "No": idx + 1, "Tanggal": t.date, "Pelanggan": t.customer, "Nama Barang": t.itemName, "Sumber/Batch": t.source === 'Repack' ? `Repack: ${t.batch}` : t.source,
        "Qty": t.qty, "Biaya Ops (Ongkir)": t.extraCost, "Keterangan Biaya (Note)": t.extraCostNote, "Total Modal": t.totalModal, "Harga Jual /Pcs": t.sell, "Total Jual": t.totalSell, "Status": t.status, "Keuntungan": t.profitPerItem * t.qty, "Notes Transaksi": t.notes
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, activeMonthSheet);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Data_Penjualan_${activeMonthSheet.replace(' ', '_')}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    showNotification("Sukses", "Data Excel berhasil diexport.", "success");
}

// ======================= BULK CHECKLIST MASTER PRODUK TO TRANSACTIONS ======================= //
let bulkOrderMasterCache = [];

function openBulkOrderModal() {
    const modal = document.getElementById('modal-bulk-order');
    if (!modal) return;

    // Prefill date with today or active form date
    const tDateInput = document.getElementById('t-date');
    const bulkDate = document.getElementById('bulk-date');
    if (bulkDate) {
        bulkDate.value = (tDateInput && tDateInput.value) ? tDateInput.value : new Date().toISOString().split('T')[0];
    }

    // Populate Customers
    const custSelect = document.getElementById('bulk-customer');
    if (custSelect) {
        const tCustomer = document.getElementById('t-customer');
        const selectedCust = tCustomer ? tCustomer.value : '';
        custSelect.innerHTML = (customerData || []).map(c => `
            <option value="${escapeHtml(c.name)}" ${c.name === selectedCust ? 'selected' : ''}>${escapeHtml(c.name)}</option>
        `).join('');
    }

    // Populate Agents
    const agentSelect = document.getElementById('bulk-agent');
    if (agentSelect) {
        const tSource = document.getElementById('t-source');
        const selectedSource = tSource ? tSource.value : '';
        agentSelect.innerHTML = (agentData || []).map(a => `
            <option value="${a.id}" data-name="${escapeHtml(a.name)}" ${a.name === selectedSource ? 'selected' : ''}>${escapeHtml(a.name)}</option>
        `).join('');
    }

    // Reset search & default status
    const searchInput = document.getElementById('bulk-product-search');
    if (searchInput) searchInput.value = '';
    const bulkStatus = document.getElementById('bulk-status');
    if (bulkStatus) bulkStatus.value = 'Belum Lunas';

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    renderBulkProductChecklist();
}

function closeBulkOrderModal() {
    const modal = document.getElementById('modal-bulk-order');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function renderBulkProductChecklist() {
    const tbody = document.getElementById('bulk-products-tbody');
    const agentSelect = document.getElementById('bulk-agent');
    if (!tbody || !agentSelect) return;

    const selectedOption = agentSelect.options[agentSelect.selectedIndex];
    const selectedAgentName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text) : '';
    const selectedAgentId = agentSelect.value;

    // Filter masterData for this agent
    const items = (masterData || []).filter(m => {
        if (m.agent_id && selectedAgentId) {
            return String(m.agent_id) === String(selectedAgentId);
        }
        return m.source === selectedAgentName || m.agent === selectedAgentName;
    });

    bulkOrderMasterCache = items.map(m => ({
        id: m.id,
        name: m.name,
        buy: Number(m.buy) || 0,
        sell: Number(m.sell) || 0,
        qty: 1,
        checked: false
    }));

    renderBulkTableRows();
}

function renderBulkTableRows() {
    const tbody = document.getElementById('bulk-products-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('bulk-product-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = bulkOrderMasterCache.filter(item => {
        if (!query) return true;
        return item.name.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center opacity-60">Tidak ada produk ditemukan untuk agen ini.</td></tr>`;
        calculateBulkSummary();
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const subtotal = item.sell * item.qty;
        const rowBg = item.checked ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40';
        return `
            <tr id="bulk-row-${item.id}" class="border-b border-inherit transition ${rowBg}">
                <td class="p-2.5 text-center">
                    <input type="checkbox" onchange="toggleBulkItemCheck('${item.id}', this.checked)" ${item.checked ? 'checked' : ''} class="bulk-item-check w-4 h-4 rounded cursor-pointer accent-indigo-600">
                </td>
                <td class="p-2.5 font-semibold text-slate-800 dark:text-slate-100">
                    ${escapeHtml(item.name)}
                </td>
                <td class="p-2.5 text-right tabular-nums opacity-70">
                    Rp ${item.buy.toLocaleString('id-ID')}
                </td>
                <td class="p-2.5 text-right">
                    <input type="text" inputmode="numeric" onchange="updateBulkItemSellPrice('${item.id}', this.value)" value="${item.sell.toLocaleString('id-ID')}" class="bulk-item-sell w-24 text-right px-2 py-1 theme-input border rounded-lg text-xs tabular-nums outline-none focus:border-indigo-500">
                </td>
                <td class="p-2.5 text-center">
                    <div class="inline-flex items-center border border-inherit rounded-lg overflow-hidden theme-input">
                        <button type="button" onclick="updateBulkItemQty('${item.id}', -1)" class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition">-</button>
                        <input type="text" inputmode="numeric" onchange="setBulkItemQty('${item.id}', this.value)" value="${item.qty}" class="bulk-item-qty w-12 text-center bg-transparent border-none text-xs tabular-nums font-bold outline-none">
                        <button type="button" onclick="updateBulkItemQty('${item.id}', 1)" class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition">+</button>
                    </div>
                </td>
                <td class="p-2.5 text-right font-bold text-slate-900 dark:text-white tabular-nums bulk-item-subtotal">
                    Rp ${subtotal.toLocaleString('id-ID')}
                </td>
            </tr>
        `;
    }).join('');

    calculateBulkSummary();
}

let _bulkSearchTimer = null;
function debouncedFilterBulkProductChecklist() {
    clearTimeout(_bulkSearchTimer);
    _bulkSearchTimer = setTimeout(() => {
        filterBulkProductChecklist();
    }, 150);
}

function filterBulkProductChecklist() {
    renderBulkTableRows();
}

function syncBulkRowDOM(item) {
    const tr = document.getElementById(`bulk-row-${item.id}`);
    if (!tr) return;
    const chk = tr.querySelector('.bulk-item-check');
    const qtyInput = tr.querySelector('.bulk-item-qty');
    const subtotalEl = tr.querySelector('.bulk-item-subtotal');
    if (chk) chk.checked = item.checked;
    if (qtyInput) qtyInput.value = item.qty;
    if (subtotalEl) subtotalEl.innerText = 'Rp ' + (item.sell * item.qty).toLocaleString('id-ID');
    if (item.checked) {
        tr.classList.add('bg-indigo-50/70', 'dark:bg-indigo-950/30');
    } else {
        tr.classList.remove('bg-indigo-50/70', 'dark:bg-indigo-950/30');
    }
}

function toggleBulkItemCheck(id, checked) {
    const item = bulkOrderMasterCache.find(x => String(x.id) === String(id));
    if (item) {
        item.checked = checked;
        syncBulkRowDOM(item);
        calculateBulkSummary();
    }
}

function updateBulkItemQty(id, delta) {
    const item = bulkOrderMasterCache.find(x => String(x.id) === String(id));
    if (item) {
        item.qty = Math.max(1, item.qty + delta);
        item.checked = true;
        syncBulkRowDOM(item);
        calculateBulkSummary();
    }
}

function setBulkItemQty(id, val) {
    const item = bulkOrderMasterCache.find(x => String(x.id) === String(id));
    if (item) {
        const cleanVal = String(val).replace(/\./g, '').replace(/,/g, '');
        item.qty = Math.max(1, parseInt(cleanVal, 10) || 1);
        item.checked = true;
        syncBulkRowDOM(item);
        calculateBulkSummary();
    }
}

function updateBulkItemSellPrice(id, val) {
    const item = bulkOrderMasterCache.find(x => String(x.id) === String(id));
    if (item) {
        const cleanVal = String(val).replace(/\./g, '').replace(/,/g, '');
        item.sell = Math.max(0, parseInt(cleanVal, 10) || 0);
        syncBulkRowDOM(item);
        calculateBulkSummary();
    }
}

function toggleSelectAllBulk(checked) {
    const searchInput = document.getElementById('bulk-product-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    bulkOrderMasterCache.forEach(item => {
        if (!query || item.name.toLowerCase().includes(query)) {
            item.checked = checked;
        }
    });
    const masterCheck = document.getElementById('bulk-check-master');
    if (masterCheck) masterCheck.checked = checked;
    renderBulkTableRows();
}

function calculateBulkSummary() {
    const checkedItems = bulkOrderMasterCache.filter(x => x.checked);
    const totalPcs = checkedItems.reduce((acc, it) => acc + it.qty, 0);
    const totalModal = checkedItems.reduce((acc, it) => acc + (it.buy * it.qty), 0);
    const totalSell = checkedItems.reduce((acc, it) => acc + (it.sell * it.qty), 0);
    const totalProfit = totalSell - totalModal;

    const countEl = document.getElementById('bulk-summary-count');
    const totalEl = document.getElementById('bulk-summary-total');
    const profitEl = document.getElementById('bulk-summary-profit');
    const btnTextEl = document.getElementById('bulk-submit-btn-text');
    const submitBtn = document.getElementById('bulk-submit-btn');

    if (countEl) countEl.innerText = `${checkedItems.length} Produk (${totalPcs} pcs)`;
    if (totalEl) totalEl.innerText = 'Rp ' + totalSell.toLocaleString('id-ID');
    if (profitEl) profitEl.innerText = (totalProfit >= 0 ? '+' : '') + 'Rp ' + totalProfit.toLocaleString('id-ID');
    if (btnTextEl) btnTextEl.innerText = `Simpan ${checkedItems.length} Produk (Rp ${totalSell.toLocaleString('id-ID')})`;
    if (submitBtn) submitBtn.disabled = checkedItems.length === 0;

    const masterCheck = document.getElementById('bulk-check-master');
    if (masterCheck && bulkOrderMasterCache.length > 0) {
        masterCheck.checked = checkedItems.length === bulkOrderMasterCache.length;
        masterCheck.indeterminate = (checkedItems.length > 0 && checkedItems.length < bulkOrderMasterCache.length);
    }
}

async function saveBulkTransactions() {
    const checkedItems = bulkOrderMasterCache.filter(x => x.checked);
    if (checkedItems.length === 0) {
        return showNotification("Peringatan", "Pilih minimal 1 produk master terlebih dahulu.", "warning");
    }

    const date = document.getElementById('bulk-date').value;
    const customer = document.getElementById('bulk-customer').value;
    const agentSelect = document.getElementById('bulk-agent');
    const selectedOption = agentSelect ? agentSelect.options[agentSelect.selectedIndex] : null;
    const source = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text) : 'Master';
    const status = document.getElementById('bulk-status').value;

    if (!date || !customer || !source) {
        return showNotification("Validasi Gagal", "Mohon lengkapi tanggal, pelanggan, dan sumber agen.", "error");
    }

    const monthKey = activeMonthSheet || getCurrentMonthKey(new Date(date));
    if (!transactionData[monthKey]) transactionData[monthKey] = [];

    // 1. Cek atau Buat 1 Master Invoice Terpadu
    let existingInv = invoiceData.find(i => i.customer_name === customer && i.date === date);
    let invNumber;
    let isNewInvoice = false;
    const grandTotalSell = checkedItems.reduce((sum, it) => sum + (it.sell * it.qty), 0);

    if (existingInv) {
        invNumber = existingInv.invoice_number;
        existingInv.total_amount = (Number(existingInv.total_amount) || 0) + grandTotalSell;
        if (status === 'Belum Lunas') existingInv.status = 'Belum Lunas';
    } else {
        invNumber = generateInvoiceNumber(date);
        isNewInvoice = true;
        existingInv = {
            id: 'inv_' + Date.now(),
            invoice_number: invNumber,
            date: date,
            customer_name: customer,
            total_amount: grandTotalSell,
            status: status,
            notes: `Checklist ${checkedItems.length} item dari ${source}`
        };
        invoiceData.unshift(existingInv);
    }

    // 2. Simpan setiap item yang dicentang ke Buku Transaksi
    const newTrxList = [];
    const dbTrxRows = [];

    checkedItems.forEach(it => {
        const totalModalComputed = it.buy * it.qty;
        const totalSellComputed = it.sell * it.qty;
        const netProfitItem = (totalSellComputed - totalModalComputed) / it.qty;
        const tempTrxId = 'trx_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

        const trxData = {
            id: tempTrxId,
            monthKey: monthKey,
            date: date,
            customer: customer,
            itemName: it.name,
            source: source,
            qty: it.qty,
            batch: '-',
            buy: it.buy,
            extraCost: 0,
            extraCostNote: '',
            totalModal: totalModalComputed,
            sell: it.sell,
            totalSell: totalSellComputed,
            status: status,
            profitPerItem: netProfitItem,
            notes: `Invoice: ${invNumber}`
        };

        transactionData[monthKey].push(trxData);
        newTrxList.push(trxData);

        dbTrxRows.push({
            month_key: monthKey, date, customer, item_name: it.name, source, qty: it.qty, batch: '-',
            buy: it.buy, extra_cost: 0, extra_cost_note: '', total_modal: totalModalComputed,
            sell: it.sell, total_sell: totalSellComputed, status, profit_per_item: netProfitItem, notes: `Invoice: ${invNumber}`
        });
    });

    // 3. Simpan ke local cache & perbarui UI instan
    saveCacheToLocal();
    activeMonthSheet = monthKey;
    renderMonthTabs();
    updateDashboard();
    renderFinancialChart();
    renderInvoicesTable();
    renderTransactionsForActiveSheet();

    // 4. Sinkronisasi Outbox / Supabase
    dispatchMutation({
        type: 'INSERT_BULK_TRANSACTIONS',
        payload: {
            transactions: dbTrxRows,
            invoice: {
                id: existingInv.id,
                invoice_number: invNumber,
                date: date,
                customer_name: customer,
                total_amount: existingInv.total_amount,
                status: existingInv.status,
                notes: existingInv.notes,
                isNew: isNewInvoice
            }
        }
    }, async () => {
        if (dbTrxRows.length > 0) {
            const { error: trxErr } = await supabaseClient.from('transactions').insert(dbTrxRows);
            if (trxErr) throw trxErr;
        }
        if (isNewInvoice) {
            await supabaseClient.from('invoices').insert([{
                invoice_number: invNumber,
                date: date,
                customer_name: customer,
                total_amount: existingInv.total_amount,
                status: existingInv.status,
                notes: existingInv.notes
            }]);
        } else {
            await supabaseClient.from('invoices').update({
                total_amount: existingInv.total_amount,
                status: existingInv.status
            }).eq('id', existingInv.id);
        }
    });

    logAuditActivity('TRANSACTION_BULK_CREATE', invNumber, `Input kilat ${checkedItems.length} produk untuk ${customer} (${source}) total Rp ${grandTotalSell.toLocaleString('id-ID')}`);
    showNotification("Sukses!", `${checkedItems.length} produk berhasil ditambahkan ke Buku Transaksi dalam 1 Invoice (${invNumber}).`, "success");
    closeBulkOrderModal();
}

// ======================= KONSOLIDASI INVOICE HARIAN ======================= //
async function consolidateDailyInvoices() {
    const groupMap = {};
    invoiceData.forEach(inv => {
        const key = `${inv.customer_name}__${inv.date}`;
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(inv);
    });

    const duplicateGroups = Object.entries(groupMap).filter(([k, list]) => list.length > 1);

    if (duplicateGroups.length === 0) {
        return showNotification("Info", "Seluruh invoice harian sudah rapi (1 invoice per pelanggan per hari). Tidak ada invoice terpisah yang perlu digabung.", "info");
    }

    const totalInvoicesToMerge = duplicateGroups.reduce((acc, [k, list]) => acc + list.length, 0);

    showConfirmModal(
        "Konsolidasi Invoice Harian",
        `Ditemukan ${duplicateGroups.length} grup (${totalInvoicesToMerge} nota) yang memiliki pelanggan & tanggal yang sama. Apakah Anda ingin menggabungkannya menjadi 1 nota utuh per hari per pelanggan?`,
        async () => {
            let mergedCount = 0;
            const idsToDelete = [];

            const masterInvUpdates = [];

            duplicateGroups.forEach(([key, list]) => {
                const masterInv = list[0];
                let totalAmount = 0;
                let hasUnpaid = false;
                const secondaryInvNumbers = [];

                list.forEach((inv, idx) => {
                    totalAmount += (Number(inv.total_amount) || 0);
                    if (inv.status !== 'Lunas') hasUnpaid = true;
                    if (idx > 0) {
                        idsToDelete.push(inv.id);
                        if (inv.invoice_number) secondaryInvNumbers.push(inv.invoice_number);
                    }
                });

                masterInv.total_amount = totalAmount;
                masterInv.status = hasUnpaid ? 'Belum Lunas' : 'Lunas';
                mergedCount++;

                masterInvUpdates.push({
                    id: masterInv.id,
                    total_amount: masterInv.total_amount,
                    status: masterInv.status
                });

                // Update referensi nomor invoice di catatan transaksi
                for (let mk in transactionData) {
                    (transactionData[mk] || []).forEach(t => {
                        if (t.customer === masterInv.customer_name && t.date === masterInv.date) {
                            secondaryInvNumbers.forEach(oldNum => {
                                if (t.notes && t.notes.includes(oldNum)) {
                                    t.notes = t.notes.replace(oldNum, masterInv.invoice_number);
                                }
                            });
                        }
                    });
                }
            });

            invoiceData = invoiceData.filter(inv => !idsToDelete.includes(inv.id));

            saveCacheToLocal();
            renderInvoicesTable();
            updateDashboard();

            if (idsToDelete.length > 0 || masterInvUpdates.length > 0) {
                dispatchMutation({
                    type: 'CONSOLIDATE_DAILY_INVOICES',
                    payload: { idsToDelete, masterInvUpdates }
                }, async () => {
                    if (idsToDelete.length > 0) {
                        await supabaseClient.from('invoices').delete().in('id', idsToDelete);
                    }
                    for (const up of masterInvUpdates) {
                        await supabaseClient.from('invoices').update({
                            total_amount: up.total_amount,
                            status: up.status
                        }).eq('id', up.id);
                    }
                });
            }

            logAuditActivity('INVOICE_CONSOLIDATE', 'DAILY_MERGE', `Mengonsolidasikan ${totalInvoicesToMerge} nota menjadi ${duplicateGroups.length} invoice harian.`);
            showNotification("Berhasil", `Berhasil menggabungkan ${totalInvoicesToMerge} nota menjadi ${duplicateGroups.length} invoice harian terpadu!`, "success");
        }
    );
}
