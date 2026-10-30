// ======================= 8. KASIR & TRANSAKSI ======================= //
function renderDropdowns() {
    const tCust = document.getElementById('t-customer');
    if(tCust) {
        let opts = `<option value="" disabled selected>Pilih Pelanggan</option>`;
        opts += customerData.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
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
            opts += inStock.map(r => `<option value="REPACK|${r.id}">[Sisa: ${r.remaining_qty}] ${r.name}</option>`).join('');
            prodSel.innerHTML = opts;
        }
    } else {
        const filtered = masterData.filter(m => m.source === src);
        const isSuperAdmin = currentRole === 'super_admin';
        let opts = `<option value="" disabled selected>Pilih Produk</option>`;
        opts += filtered.map(m => {
            const modalLabel = isSuperAdmin ? ` (Modal: Rp${m.buy.toLocaleString()})` : '';
            return `<option value="MASTER|${m.id}">${m.name}${modalLabel}</option>`;
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

document.getElementById('trx-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan mencatat transaksi.", "warning");
    
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

    const totalModalComputed = (buy * qty) + extraCost;
    const totalSellComputed = sell * qty;
    const netProfitItem = (totalSellComputed - totalModalComputed) / qty;

    const monthKey = activeMonthSheet || getCurrentMonthKey(new Date(date));
    const tempTrxId = 'trx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const invNumber = `INV-${date.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;

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
        notes: notes
    };

    const newInvData = {
        id: 'inv_' + Date.now(),
        invoice_number: invNumber,
        date: date,
        customer_name: customer,
        total_amount: totalSellComputed,
        status: status,
        notes: notes
    };

    // 1. Optimistic in-memory update
    if(!transactionData[monthKey]) transactionData[monthKey] = [];
    transactionData[monthKey].push(newTrxData);
    invoiceData.unshift(newInvData);
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
    document.getElementById('t-date').valueAsDate = new Date();
    document.getElementById('t-product').innerHTML = `<option value="" disabled selected>Pilih Sumber Dulu</option>`;

    // 4. Background dispatch / Outbox queue
    const dbTrxPayload = {
        month_key: monthKey, date, customer, item_name: itemName, source, qty, batch: batchId,
        buy, extra_cost: extraCost, extra_cost_note: extraCostNote, total_modal: totalModalComputed, 
        sell, total_sell: totalSellComputed, status, profit_per_item: netProfitItem, notes
    };
    const dbInvPayload = {
        invoice_number: invNumber,
        date: date,
        customer_name: customer,
        total_amount: totalSellComputed,
        status: status,
        notes: notes
    };

    dispatchMutation({
        type: 'INSERT_TRANSACTION',
        payload: {
            transaction: dbTrxPayload,
            invoice: dbInvPayload,
            repackUpdate: repackUpdateInfo
        }
    }, async () => {
        if(repackUpdateInfo) {
            await supabaseClient.from('repack').update({ remaining_qty: repackUpdateInfo.newRemainingQty }).eq('id', repackUpdateInfo.batchId);
        }
        const { data: trxRes, error: trxErr } = await supabaseClient.from('transactions').insert([dbTrxPayload]).select();
        if(trxErr) throw trxErr;
        if(trxRes && trxRes.length > 0) newTrxData.id = trxRes[0].id;
        await supabaseClient.from('invoices').insert([dbInvPayload]);
    });

    logAuditActivity('TRANSACTION_CREATE', invNumber, `Transaksi baru: ${qty}x ${itemName} ke ${customer} senilai Rp ${totalSellComputed.toLocaleString()} (${status})`);

    if(navigator.onLine) {
        showNotification("Sukses", "Data penjualan berhasil disimpan!", "success");
    } else {
        showNotification("Mode Offline", "Data tersimpan di perangkat. Otomatis disinkronkan saat online.", "warning");
    }
});

// =========================================================================
// FITUR DISTRIBUSI AGEN & PENAGIHAN: AGING INVOICES & SMART WHATSAPP TAGIH
// =========================================================================
let currentInvoiceAgingFilter = 'all';

function setInvoiceAgingFilter(filterKey) {
    currentInvoiceAgingFilter = filterKey;
    
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

function getInvoiceAgingInfo(inv) {
    if (!inv) return { days: 0, category: 'paid', label: 'Lunas', colorClass: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' };
    
    if (inv.status === 'Lunas') {
        return { days: 0, category: 'paid', label: 'Lunas', colorClass: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' };
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const invDate = new Date(inv.date);
    invDate.setHours(0,0,0,0);
    const diffTime = today - invDate;
    const days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

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

async function renderInvoicesTable() {
    renderInvoiceAgingCards();

    const tbody = document.getElementById('invoices-table-body');
    if(!tbody) return;
    
    if(invoiceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center opacity-60">Belum ada data invoice tercatat.</td></tr>`;
        return;
    }

    const isSuperAdmin = currentRole === 'super_admin';

    // Filter invoice berdasarkan currentInvoiceAgingFilter
    const filteredInvoices = invoiceData.filter(inv => {
        if (currentInvoiceAgingFilter === 'all') return true;
        if (currentInvoiceAgingFilter === 'unpaid') return inv.status !== 'Lunas';
        if (currentInvoiceAgingFilter === 'paid') return inv.status === 'Lunas';
        
        if (inv.status === 'Lunas') return false; // Filter aging hanya relevan untuk yang belum lunas
        const info = getInvoiceAgingInfo(inv);
        return info.category === currentInvoiceAgingFilter;
    });

    if (filteredInvoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center opacity-60">Tidak ada invoice pada kategori filter ini.</td></tr>`;
        return;
    }

    const rows = filteredInvoices.map(inv => {
        const info = getInvoiceAgingInfo(inv);
        const badgeStatus = inv.status === 'Lunas' ? 
            `<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-full font-bold text-[11px] inline-flex items-center gap-1"><i class="fa-solid fa-check"></i> LUNAS</span>` : 
            `<div class="space-y-1">
                <span class="px-2 py-0.5 bg-rose-500/20 text-rose-500 rounded-full font-bold text-[10px] inline-flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> BELUM LUNAS</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] border font-bold ${info.colorClass} block w-fit"><i class="${info.badgeIcon || 'fa-regular fa-clock'} mr-1"></i>${info.label}</span>
             </div>`;
        
        const btnLunasi = inv.status !== 'Lunas' ? 
            `<button onclick="markInvoiceAsPaid(${inv.id}, '${inv.customer_name}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"><i class="fa-solid fa-check"></i> Lunasi</button>` : 
            `<span class="text-xs opacity-50 font-medium">Selesai</span>`;

        const btnDelete = isSuperAdmin ? 
            `<button onclick="confirmDeleteInvoice(${inv.id}, '${inv.invoice_number}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1.5 rounded-lg text-xs font-bold" title="Hapus Permanen"><i class="fa-solid fa-trash"></i></button>` : '';

        return `
            <tr class="hover:bg-slate-50/50 transition">
                <td class="p-3 border border-inherit">
                    <span class="font-mono font-bold text-indigo-500 text-xs block">${inv.invoice_number}</span>
                    <span class="text-[10px] opacity-60">${inv.date}</span>
                </td>
                <td class="p-3 border border-inherit">
                    <span class="font-bold block text-slate-900 dark:text-slate-100">${inv.customer_name}</span>
                </td>
                <td class="p-3 border border-inherit font-bold text-emerald-600 dark:text-emerald-400">
                    Rp ${Number(inv.total_amount).toLocaleString()}
                </td>
                <td class="p-3 border border-inherit">
                    ${badgeStatus}
                </td>
                <td class="p-3 border border-inherit text-center">
                    <div class="flex items-center justify-center gap-1.5 flex-wrap">
                        <button onclick="downloadInvoicePDF('${inv.invoice_number}', '${inv.status}')" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium" title="Unduh Nota / Faktur PDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                        <button onclick="sendSmartInvoiceReminderWA('${inv.invoice_number}', '${inv.customer_name}', ${inv.total_amount}, '${inv.date}', '${inv.status}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm" title="Tagih via WhatsApp"><i class="fa-brands fa-whatsapp"></i> Tagih WA</button>
                        ${btnLunasi}
                        ${btnDelete}
                    </div>
                </td>
            </tr>`;
    }).join('');

    tbody.innerHTML = rows;
}

function sendSmartInvoiceReminderWA(invNumber, custName, amount, invDate, statusInv) {
    const custObj = customerData.find(c => c.name && c.name.toLowerCase() === custName.toLowerCase());
    let phone = (custObj && custObj.phone) ? custObj.phone : '';
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (!phone) phone = (appSettings && appSettings.whatsappPhone) ? appSettings.whatsappPhone : '628123456789';

    const bank = (appSettings && appSettings.bankAccount) ? appSettings.bankAccount : 'BCA 12345678 a/n SnackLoop';
    const biz = (appSettings && appSettings.businessName) ? appSettings.businessName : 'SnackLoop ERP';
    
    let msg = '';
    if (statusInv === 'Lunas') {
        msg = `*FAKTUR LUNAS (KWITANSI RESMI)* - ${biz}\n` +
              `-----------------------------------------\n` +
              `Yth. Kak *${custName}*,\n\n` +
              `Terima kasih. Pembayaran untuk transaksi berikut telah kami terima:\n` +
              `• No. Faktur : *${invNumber}*\n` +
              `• Tanggal    : *${invDate}*\n` +
              `• Jumlah     : *Rp ${Number(amount).toLocaleString()}*\n` +
              `• Status     : *LUNAS*\n\n` +
              `Pembayaran telah tercatat di sistem kami. Terima kasih atas kerjasamanya.`;
    } else {
        const today = new Date();
        today.setHours(0,0,0,0);
        const d = new Date(invDate);
        d.setHours(0,0,0,0);
        const days = Math.max(0, Math.floor((today - d) / (1000 * 60 * 60 * 24)));

        if (days <= 7) {
            msg = `Halo Kak *${custName}*, salam dari *${biz}*.\n\n` +
                  `Berikut adalah rincian nota pesanan snack Anda:\n` +
                  `• No. Nota : *${invNumber}*\n` +
                  `• Tanggal  : *${invDate}*\n` +
                  `• Tagihan  : *Rp ${Number(amount).toLocaleString()}*\n\n` +
                  `Pembayaran dapat ditransfer ke rekening resmi kami:\n` +
                  `*${bank}*\n\n` +
                  `Mohon konfirmasi jika pembayaran telah dilakukan. Terima kasih.`;
        } else if (days <= 14) {
            msg = `Halo Kak *${custName}*, semoga usaha Anda berjalan lancar.\n\n` +
                  `Kami mengonfirmasi bahwa nota pesanan SnackLoop berikut:\n` +
                  `• No. Nota : *${invNumber}*\n` +
                  `• Tanggal  : *${invDate}* (${days} hari berjalan)\n` +
                  `• Tagihan  : *Rp ${Number(amount).toLocaleString()}*\n\n` +
                  `Jika snack di toko/warung sudah terjual, mohon kesediaannya untuk melakukan transfer pelunasan ke:\n` +
                  `*${bank}*\n\n` +
                  `Mohon kirimkan bukti transfer ke nomor ini. Terima kasih atas kerjasamanya.`;
        } else {
            msg = `*PEMBERITAHUAN JATUH TEMPO* - ${biz}\n` +
                  `Kepada Yth. Kak *${custName}*,\n\n` +
                  `Tagihan transaksi Anda di *${biz}* telah melewati batas tempo pembayaran (${days} hari tertunggak):\n` +
                  `• No. Nota : *${invNumber}*\n` +
                  `• Tanggal  : *${invDate}*\n` +
                  `• Total    : *Rp ${Number(amount).toLocaleString()}*\n\n` +
                  `Mohon segera melakukan pelunasan ke rekening resmi kami:\n` +
                  `*${bank}*\n\n` +
                  `Harap konfirmasikan bukti transfer hari ini agar pencatatan administrasi dan pengiriman order berikutnya berjalan lancar. Terima kasih atas perhatiannya.`;
        }
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Alias untuk kompatibilitas mundur
function sendInvoiceWA(invNumber, custName, amount, statusInv) {
    const inv = invoiceData.find(i => i.invoice_number === invNumber);
    const date = inv ? inv.date : new Date().toISOString().split('T')[0];
    sendSmartInvoiceReminderWA(invNumber, custName, amount, date, statusInv);
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
            if (new Date(t.date) > new Date(custMap[cName].lastDate)) {
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

        return `
            <div class="theme-card rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        ${rankBadge}
                        <div>
                            <h4 class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[150px]">${cust.name}</h4>
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
                    <span class="font-semibold text-slate-800 dark:text-slate-200 truncate block">${favoriteItem}</span>
                </div>

                <div class="pt-2 border-t border-inherit flex items-center justify-between">
                    <span class="text-[10px] opacity-50">Terakhir: ${cust.lastDate || '-'}</span>
                    <button type="button" onclick="sendCustomerRewardWA('${cust.name}', ${cust.totalSpent}, ${cust.orderCount})" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-[10px] font-semibold flex items-center gap-1.5 transition-colors">
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
        const idx = invoiceData.findIndex(i => i.id === invId);
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
    const inv = invoiceData.find(i => i.id === invId);
    if(inv) inv.status = 'Lunas';

    for(let mk in transactionData) {
        transactionData[mk].forEach((t) => {
            if(t.customer === custName && t.status === 'Belum Lunas') {
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
        payload: { invId, customerName: custName }
    }, async () => {
        await supabaseClient.from('invoices').update({ status: 'Lunas' }).eq('id', invId);
        if(custName) {
            await supabaseClient.from('transactions').update({ status: 'Lunas' }).eq('customer', custName);
        }
    });
}

async function downloadInvoicePDF(invNumber, statusInv) {
    const inv = invoiceData.find(i => i.invoice_number === invNumber);
    if(!inv) return showNotification("Gagal", "Invoice tidak ditemukan.", "error");

    // Jika pengaturan nota adalah Thermal 58mm atau 80mm
    if (appSettings && (appSettings.printFormat === 'thermal58' || appSettings.printFormat === 'thermal80')) {
        return printThermalReceiptFromInvoice(inv, appSettings.printFormat);
    }

    const titleEl = document.getElementById('pdf-doc-title');
    titleEl.innerText = statusInv === 'Lunas' ? "FAKTUR LUNAS (KWITANSI)" : "NOTA TAGIHAN (BELUM LUNAS)";

    document.getElementById('pdf-meta-subtitle').innerText = "Ditagihkan Kepada:";
    document.getElementById('pdf-meta-id-wrap').style.display = "block";
    document.getElementById('pdf-total-label').innerText = statusInv === 'Lunas' ? "Total Dibayar" : "Total Tagihan";
    document.getElementById('pdf-footer-note').innerText = statusInv === 'Lunas' ? "Terima kasih, pembayaran telah diterima lunas!" : "Silakan lakukan pembayaran jika produk sudah habis.";

    document.getElementById('inv-meta-customer').innerText = inv.customer_name;
    document.getElementById('inv-meta-date').innerText = inv.date;
    document.getElementById('inv-meta-no').innerText = inv.invoice_number;
    document.getElementById('inv-subtotal').innerText = 'Rp ' + inv.total_amount.toLocaleString();
    document.getElementById('inv-grand-total').innerText = 'Rp ' + inv.total_amount.toLocaleString();

    let tbody = document.getElementById('inv-cart-body');
    tbody.innerHTML = `
        <tr class="border-b border-slate-200">
            <td class="py-3 pr-2 font-medium">Pembelian / Titipan Produk SnackLoop</td>
            <td class="py-3 px-2 text-center">1</td>
            <td class="py-3 px-2 text-right">Rp ${inv.total_amount.toLocaleString()}</td>
            <td class="py-3 pl-2 text-right font-bold">Rp ${inv.total_amount.toLocaleString()}</td>
        </tr>`;

    html2pdf().from(document.querySelector('.print-area')).set({
        margin: 10, filename: `${inv.invoice_number}_${inv.customer_name}.pdf`, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();

    showNotification("Sukses", "PDF Invoice berhasil diunduh.", "success");
}

function sendInvoiceWA(invNumber, custName, amount, statusInv) {
    const custObj = customerData.find(c => c.name === custName);
    const phone = custObj ? custObj.phone : '628123456789';

    const headerText = statusInv === 'Lunas' ? "*FAKTUR LUNAS / KWITANSI*" : "*NOTA TAGIHAN SEMENTARA*";
    let msg = `${headerText}%0ANo. Invoice: *${invNumber}*%0AKepada: *${custName}*%0ATotal: *Rp ${amount.toLocaleString()}*%0AStatus: *${statusInv}*%0A%0ATerima kasih telah berbisnis dengan SnackLoop!`;

    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// ======================= RENDER MONTH TABS ======================= //
function renderMonthTabs() {
    const container = document.getElementById('month-tabs-container');
    if(!container) return;
    let keys = Object.keys(transactionData).sort();
    if(keys.length === 0) { keys = [getCurrentMonthKey(new Date())]; transactionData[keys[0]] = []; }
    if(!activeMonthSheet || !transactionData[activeMonthSheet]) activeMonthSheet = keys[keys.length-1];

    const isSuperAdmin = currentRole === 'super_admin';
    const canDelete = isSuperAdmin && keys.length > 1;

    let tabsHtml = keys.map(mk => {
        const isActive = mk === activeMonthSheet;
        const deleteBtnHtml = canDelete ? `<span onclick="event.stopPropagation(); confirmDeleteMonthSheet('${mk}')" class="ml-1.5 opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 text-[10px]" title="Hapus Sheet"><i class="fa-solid fa-xmark"></i></span>` : '';

        return `
            <button onclick="activeMonthSheet='${mk}'; currentTransactionPage=1; renderMonthTabs();" class="px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'theme-input hover:opacity-80'}">
                <span>${mk}</span>
                ${deleteBtnHtml}
            </button>`;
    }).join('');
    
    if(isSuperAdmin) {
        tabsHtml += `<button onclick="createNewMonthSheet()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/25 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/35 transition shadow-sm ml-1 flex items-center gap-1.5"><i class="fa-solid fa-calendar-plus"></i> <span>+ Pilih Bulan</span></button>`;
    }

    container.innerHTML = tabsHtml;
    renderTransactionsForActiveSheet();
}

function filterTrxStatus(st) {
    currentTransactionFilter = st;
    currentTransactionPage = 1; 
    document.getElementById('filter-btn-all').className = st === 'all' ? 'px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white text-xs' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    document.getElementById('filter-btn-lunas').className = st === 'Lunas' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white text-xs' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    document.getElementById('filter-btn-belum').className = st === 'Belum Lunas' ? 'px-3 py-1.5 rounded-lg font-bold bg-rose-600 text-white text-xs' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    renderTransactionsForActiveSheet();
}

// ======================= INTERACTIVE DATE SORTING ======================= //
function toggleDateSorting() {
    transactionDateSortAsc = !transactionDateSortAsc;
    const sortIcon = document.getElementById('date-sort-icon');
    if(sortIcon) {
        sortIcon.className = transactionDateSortAsc ? 'fa-solid fa-arrow-up-short-wide text-[10px] text-indigo-500' : 'fa-solid fa-arrow-down-wide-short text-[10px] text-indigo-500';
    }
    renderTransactionsForActiveSheet();
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
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return transactionDateSortAsc ? dateA - dateB : dateB - dateA;
    });

    if(filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center opacity-60">Belum ada transaksi yang sesuai.</td></tr>`;
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
        const statusDropdown = isSuperAdmin ? 
            `<select onchange="updateTrxStatus(${t.id}, this.value)" class="text-[11px] font-bold px-2 py-1 rounded border cursor-pointer outline-none ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}"><option value="Lunas" ${t.status === 'Lunas' ? 'selected' : ''}>Lunas</option><option value="Belum Lunas" ${t.status === 'Belum Lunas' ? 'selected' : ''}>Belum Lunas</option></select>` :
            (canMarkPaid && t.status !== 'Lunas' ?
                `<button onclick="updateTrxStatus(${t.id}, 'Lunas')" class="px-2 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-600 hover:bg-emerald-500/20 hover:text-emerald-600 transition" title="Klik untuk tandai Lunas">Belum Lunas (Lunasi)</button>` :
                `<span class="px-2 py-1 rounded text-xs font-bold ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}">${t.status}</span>`);

        const srcBadge = t.source === 'Repack' ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-500 px-1 rounded font-bold">${t.batch}</span>` : `<span class="text-[9px] theme-input border px-1 rounded font-bold">${t.source}</span>`;
        const notesDisplay = t.notes && t.notes !== '-' ? `<span class="block text-[10px] text-amber-500 italic">Notes: ${t.notes}</span>` : '';
        const extraCostDisplay = t.extraCost > 0 ? `<span class="text-amber-500 font-bold">+Rp ${t.extraCost.toLocaleString()}</span><br><span class="text-[9px] opacity-70 italic">(${t.extraCostNote})</span>` : `<span class="opacity-40">-</span>`;
        
        const isNegativeOrReturn = t.isReturn || (t.qty < 0);
        const returBadge = isNegativeOrReturn ? `<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 mr-1">RETUR</span>` : '';
        const returActionBtn = !isNegativeOrReturn ? `<button onclick="openReturnModalFromTrx(${t.id})" title="Catat Retur Toko" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold"><i class="fa-solid fa-arrow-rotate-left"></i></button>` : '';

        const deleteBtn = isSuperAdmin ? `<button onclick="confirmDeleteTrx(${t.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '';

        const actionBtn = `
            ${returActionBtn}
            <button onclick="downloadPDF(${t.id})" title="Cetak / Download Nota" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-print"></i></button>
            <button onclick="sendWhatsAppOnly(${t.id})" title="Kirim WA" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-brands fa-whatsapp"></i></button>
            ${deleteBtn}`;

        const modalDisplay = isSuperAdmin ? `Rp ${t.totalModal.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;
        const profitDisplay = isSuperAdmin ? `Rp ${itemProfit.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit">${t.date}</td>
                <td class="p-3 border border-inherit font-bold text-indigo-500">${t.customer}</td>
                <td class="p-3 border border-inherit font-medium">${returBadge}${t.itemName} <br>${srcBadge} ${notesDisplay}</td>
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
        const trxIdx = list.findIndex(t => t.id === id);
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
    const trx = list.find(t => t.id === id);
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
        const found = transactionData[m].find(t => t.id === trxId);
        if(found) { targetTrx = found; break; }
    }
    if (!targetTrx) return showNotification('Gagal', 'Data tidak valid!', 'error');

    // Jika pengaturan nota adalah Thermal 58mm atau 80mm
    if (appSettings && (appSettings.printFormat === 'thermal58' || appSettings.printFormat === 'thermal80')) {
        return printThermalReceiptFromTrx(targetTrx, appSettings.printFormat);
    }
    
    document.getElementById('pdf-doc-title').innerText = targetTrx.status === 'Lunas' ? "FAKTUR LUNAS (KWITANSI)" : "NOTA TAGIHAN (BELUM LUNAS)";
    document.getElementById('pdf-meta-subtitle').innerText = "Ditagihkan Kepada:";
    document.getElementById('pdf-meta-id-wrap').style.display = "block";
    document.getElementById('pdf-total-label').innerText = targetTrx.status === 'Lunas' ? "Total Dibayar" : "Total Tagihan";
    document.getElementById('pdf-footer-note').innerText = targetTrx.status === 'Lunas' ? "Terima kasih, pembayaran lunas!" : "Silakan bayar jika produk sudah habis.";
    
    await prepareInvoiceCartFromRow(targetTrx);

    const parts = targetTrx.date.split('-');
    const fileName = `${parts[2]}-${parts[1]}-${parts[0]}_${targetTrx.customer}_Receipt.pdf`;

    html2pdf().from(document.querySelector('.print-area')).set({
        margin: 10, filename: fileName, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
    showNotification("Sukses", "Nota PDF berhasil diunduh.", "success");
}

async function prepareInvoiceCartFromRow(targetTrx) {
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);
    let grandTotal = 0;
    let tbody = document.getElementById('inv-cart-body');
    if(!tbody) return;

    const rows = matchingTransactions.map(t => {
        grandTotal += t.totalSell;
        return `
            <tr class="border-b border-slate-200">
                <td class="py-3 pr-2 font-medium">${t.itemName} <span class="text-xs opacity-60">(${t.source})</span></td>
                <td class="py-3 px-2 text-center">${t.qty}</td>
                <td class="py-3 px-2 text-right">Rp ${(t.totalSell / t.qty).toLocaleString()}</td>
                <td class="py-3 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
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

        return `
            <tr class="border-b border-slate-200 text-xs">
                <td class="py-2.5 pr-2">${index + 1}. ${t.date} - <b>${t.customer}</b><br><span class="opacity-70">${t.itemName} (${t.qty}x)</span></td>
                <td class="py-2.5 px-2 text-center">${t.status}</td>
                <td class="py-2.5 px-2 text-right">Rp ${t.totalModal.toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    }).join('');
    if(tbody) tbody.innerHTML = rows;

    document.getElementById('pdf-doc-title').innerText = "REKAP LAPORAN KEUANGAN";
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
        const found = transactionData[m].find(t => t.id === trxId);
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

    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
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
    list.innerHTML = memos.map((m, idx) => `
        <div class="p-2.5 theme-input border rounded-xl flex justify-between items-center">
            <div>
                <span class="font-medium block">${m.text}</span>
                <span class="text-[10px] opacity-60">${m.date} • <strong class="${m.priority === 'Urgent' ? 'text-red-500' : 'text-amber-500'}">${m.priority}</strong></span>
            </div>
            <button onclick="deleteMemo(${idx})" class="text-slate-400 hover:text-rose-500 text-xs px-1.5">✕</button>
        </div>
    `).join('');
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

    for(let mk in transactionData) {
        transactionData[mk].forEach((t) => {
            const tDate = new Date(t.date);
            tDate.setHours(0,0,0,0);
            
            const diffTime = todayObj - tDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (currentDashboardTimeFilter === 'today' && diffDays !== 0) return;
            if (currentDashboardTimeFilter === '7days' && (diffDays < 0 || diffDays > 7)) return;
            if (currentDashboardTimeFilter === '30days' && (diffDays < 0 || diffDays > 30)) return;

            modal += t.totalModal;

            if(t.status === 'Lunas') {
                Pendapatan += t.totalSell; 
                KeuntunganKotor += (t.profitPerItem * t.qty);
            } else { 
                Hutang += t.totalSell; 
                unpaidList.push(t); 
            }

            if(!productSalesMap[t.itemName]) {
                productSalesMap[t.itemName] = { qty: 0, revenue: 0 };
            }
            productSalesMap[t.itemName].qty += t.qty;
            productSalesMap[t.itemName].revenue += t.totalSell;
        });
    }

    expenseData.forEach(exp => {
        const expDate = new Date(exp.date);
        expDate.setHours(0,0,0,0);
        const diffDaysExp = Math.floor((todayObj - expDate) / (1000 * 60 * 60 * 24));

        if (currentDashboardTimeFilter === 'today' && diffDaysExp !== 0) return;
        if (currentDashboardTimeFilter === '7days' && (diffDaysExp < 0 || diffDaysExp > 7)) return;
        if (currentDashboardTimeFilter === '30days' && (diffDaysExp < 0 || diffDaysExp > 30)) return;

        totalExpense += exp.amount;
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
            const uRows = unpaidList.map(t => {
                const btnLunasi = canMarkPaid ? `<button onclick="updateTrxStatus(${t.id}, 'Lunas')" class="bg-indigo-500/25 text-indigo-500 px-2.5 py-1 rounded text-[11px] font-bold">Lunasi</button>` : '-';
                const custObj = customerData.find(c => c.name === t.customer);
                let phone = custObj && custObj.phone ? custObj.phone.replace(/\D/g, '') : '';
                if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                if (!phone) phone = (appSettings && appSettings.whatsappPhone) ? appSettings.whatsappPhone : '628123456789';

                // Hitung umur piutang
                const today = new Date();
                today.setHours(0,0,0,0);
                const tDate = new Date(t.date);
                tDate.setHours(0,0,0,0);
                const diffDays = Math.max(0, Math.floor((today - tDate) / (1000 * 60 * 60 * 24)));
                
                let agingBadge = '';
                if (diffDays <= 7) {
                    agingBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">${diffDays}h (Lancar)</span>`;
                } else if (diffDays <= 14) {
                    agingBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 font-bold">${diffDays}h (Perhatian)</span>`;
                } else {
                    agingBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold animate-pulse">${diffDays}h (Jatuh Tempo)</span>`;
                }

                const bank = (appSettings && appSettings.bankAccount) ? appSettings.bankAccount : 'BCA 12345678 a/n SnackLoop';
                const waText = `Halo Kak ${t.customer}, salam dari SnackLoop. Mengonfirmasi tagihan pesanan ${t.itemName} sebesar Rp ${t.totalSell.toLocaleString()} (sudah berjalan ${diffDays} hari). Pembayaran dapat ditransfer ke ${bank}. Terima kasih banyak!`;
                const waBtn = `<button onclick="window.open('https://wa.me/${phone}?text=${encodeURIComponent(waText)}', '_blank')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1 mx-auto"><i class="fa-brands fa-whatsapp"></i> Tagih</button>`;
                
                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="p-2.5 border border-inherit">${t.date} <br><span class="text-[9px] opacity-60">${t.monthKey}</span></td>
                        <td class="p-2.5 border border-inherit">
                            <span class="font-bold text-indigo-500 block">${t.customer}</span>
                            ${agingBadge}
                        </td>
                        <td class="p-2.5 border border-inherit font-medium">${t.itemName} (${t.qty}x)</td>
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

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-2.5 border border-inherit opacity-70">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                <td class="p-2.5 border border-inherit font-bold text-indigo-500">${h.product_name}</td>
                <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                <td class="p-2.5 border border-inherit">${diffBadge}</td>
                <td class="p-2.5 border border-inherit font-medium">${h.changed_by || 'admin'}</td>
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
                <h4 class="font-bold text-sm line-clamp-1">${p.name}</h4>
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

    let months = Object.keys(transactionData).sort();
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
