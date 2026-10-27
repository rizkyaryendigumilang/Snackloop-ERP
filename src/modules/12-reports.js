// ==========================================================
// 10. MODUL LAPORAN BISNIS & ANALITIK (CLEAN ERP REPORTS)
// ==========================================================
let currentReportRange = '30days';
let currentReportSubtab = 'pnl';
let customReportFrom = '';
let customReportTo = '';

function switchReportSubtab(subtabId) {
    currentReportSubtab = subtabId;
    document.querySelectorAll('.rep-subtab-panel').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.rep-sub-btn').forEach(btn => {
        btn.className = "rep-sub-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition opacity-70 hover:opacity-100 border border-transparent";
    });

    const targetPanel = document.getElementById('rep-subtab-' + subtabId);
    if (targetPanel) targetPanel.classList.remove('hidden');

    const activeBtn = document.getElementById('rep-sub-btn-' + subtabId);
    if (activeBtn) {
        activeBtn.className = "rep-sub-btn active px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800";
    }

    // Update active label in export dropdown
    const labelMap = {
        'pnl': 'Laba Rugi',
        'sales': 'Penjualan',
        'receivables': 'Rekap Piutang',
        'inventory': 'Valuasi Stok'
    };
    const dropLabel = document.getElementById('dropdown-active-tab-label');
    if (dropLabel) dropLabel.innerText = labelMap[subtabId] || 'Laba Rugi';
}

function setReportDateRange(rangeType) {
    currentReportRange = rangeType;
    document.querySelectorAll('.report-preset-btn').forEach(btn => {
        btn.className = "report-preset-btn px-3 py-1.5 rounded-lg border font-medium text-xs transition opacity-70 hover:opacity-100";
    });
    const activeBtn = document.getElementById('btn-rep-' + rangeType);
    if (activeBtn) {
        activeBtn.className = "report-preset-btn px-3 py-1.5 rounded-lg border font-medium text-xs transition bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
    }

    const fromInput = document.getElementById('rep-date-from');
    const toInput = document.getElementById('rep-date-to');
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    customReportFrom = '';
    customReportTo = '';

    renderReports();
}

function onReportCustomDateChange() {
    const fromVal = document.getElementById('rep-date-from').value;
    const toVal = document.getElementById('rep-date-to').value;
    if (fromVal && toVal) {
        currentReportRange = 'custom';
        customReportFrom = fromVal;
        customReportTo = toVal;
        document.querySelectorAll('.report-preset-btn').forEach(btn => {
            btn.className = "report-preset-btn px-3 py-1.5 rounded-lg border font-medium text-xs transition opacity-70 hover:opacity-100";
        });
        renderReports();
    }
}

function getFilteredReportData() {
    const now = new Date();
    let fromDate = null;
    let toDate = new Date();
    let periodLabel = "";

    if (currentReportRange === '30days') {
        fromDate = new Date();
        fromDate.setDate(now.getDate() - 30);
        periodLabel = "30 Hari Terakhir";
    } else if (currentReportRange === 'this_month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = "Bulan Ini (" + getCurrentMonthKey(now) + ")";
    } else if (currentReportRange === 'last_month') {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
        periodLabel = "Bulan Lalu (" + getCurrentMonthKey(fromDate) + ")";
    } else if (currentReportRange === 'this_year') {
        fromDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "Tahun " + now.getFullYear();
    } else if (currentReportRange === 'custom' && customReportFrom && customReportTo) {
        fromDate = new Date(customReportFrom);
        toDate = new Date(customReportTo);
        periodLabel = customReportFrom + " s/d " + customReportTo;
    } else {
        fromDate = new Date(2020, 0, 1);
        periodLabel = "Semua Data";
    }

    const fStr = fromDate ? fromDate.toISOString().split('T')[0] : '2020-01-01';
    const tStr = toDate ? toDate.toISOString().split('T')[0] : '2099-12-31';

    let allTrx = [];
    for (let mk in transactionData) {
        allTrx = allTrx.concat(transactionData[mk] || []);
    }

    const filteredTrx = allTrx.filter(t => {
        if (!t.date) return false;
        return t.date >= fStr && t.date <= tStr;
    });

    const filteredExpenses = (expenseData || []).filter(e => {
        if (!e.date) return false;
        return e.date >= fStr && e.date <= tStr;
    });

    return {
        transactions: filteredTrx,
        expenses: filteredExpenses,
        allTransactions: allTrx,
        fromDate: fStr,
        toDate: tStr,
        periodLabel: periodLabel
    };
}

function renderReports() {
    const data = getFilteredReportData();
    renderReportPnL(data);
    renderReportSales(data);
    renderReportReceivables(data);
    renderReportInventory();
}

function renderReportPnL(data) {
    const totalRev = data.transactions.reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const paidRev = data.transactions.filter(t => t.status === 'Lunas').reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const unpaidRev = totalRev - paidRev;
    const totalCOGS = data.transactions.reduce((acc, t) => acc + (t.totalModal || 0), 0);
    const grossProfit = totalRev - totalCOGS;
    const grossMargin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;

    const totalExp = data.expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExp;
    const netMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

    // Stat Cards
    document.getElementById('rep-pnl-revenue').innerText = "Rp " + totalRev.toLocaleString('id-ID');
    document.getElementById('rep-pnl-revenue-sub').innerText = `${data.transactions.length} transaksi (${paidRev > 0 ? Math.round((paidRev / totalRev) * 100) : 0}% lunas)`;
    document.getElementById('rep-pnl-cogs').innerText = "Rp " + totalCOGS.toLocaleString('id-ID');
    document.getElementById('rep-pnl-gross').innerText = "Rp " + grossProfit.toLocaleString('id-ID');
    document.getElementById('rep-pnl-gross-margin').innerText = `Margin Kotor: ${grossMargin.toFixed(1)}%`;

    const netEl = document.getElementById('rep-pnl-net');
    netEl.innerText = "Rp " + netProfit.toLocaleString('id-ID');
    netEl.className = "text-xl font-bold " + (netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400");
    document.getElementById('rep-pnl-net-margin').innerText = `Margin Bersih: ${netMargin.toFixed(1)}%`;

    document.getElementById('rep-pnl-period-label').innerText = "Periode: " + data.periodLabel;

    // Detailed Breakdown Table
    const tbody = document.getElementById('rep-pnl-statement-body');
    if (!tbody) return;

    let rows = `
        <tr class="font-semibold bg-slate-50/50 dark:bg-slate-900/30">
            <td class="p-3 font-bold text-slate-800 dark:text-slate-100" colspan="3">1. PENDAPATAN OPERASIONAL</td>
        </tr>
        <tr>
            <td class="p-3 pl-6">Penjualan Lunas</td>
            <td class="p-3 text-right font-medium text-emerald-600">Rp ${paidRev.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right opacity-60">${totalRev > 0 ? ((paidRev / totalRev) * 100).toFixed(1) : '0'}%</td>
        </tr>
        <tr>
            <td class="p-3 pl-6">Penjualan Tempo / Belum Lunas</td>
            <td class="p-3 text-right font-medium text-amber-600">Rp ${unpaidRev.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right opacity-60">${totalRev > 0 ? ((unpaidRev / totalRev) * 100).toFixed(1) : '0'}%</td>
        </tr>
        <tr class="font-bold border-t border-inherit">
            <td class="p-3 pl-6 text-indigo-600">Total Pendapatan Bersih</td>
            <td class="p-3 text-right font-bold text-indigo-600">Rp ${totalRev.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold text-indigo-600">100.0%</td>
        </tr>

        <tr class="font-semibold bg-slate-50/50 dark:bg-slate-900/30">
            <td class="p-3 font-bold text-slate-800 dark:text-slate-100" colspan="3">2. HARGA POKOK PENJUALAN (HPP)</td>
        </tr>
        <tr>
            <td class="p-3 pl-6">Modal Pembelian & Bahan Baku Repack</td>
            <td class="p-3 text-right font-medium text-rose-500">Rp ${totalCOGS.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right opacity-60">${totalRev > 0 ? ((totalCOGS / totalRev) * 100).toFixed(1) : '0'}%</td>
        </tr>
        <tr class="font-bold border-t border-inherit">
            <td class="p-3 pl-6 text-slate-800 dark:text-slate-200">Total HPP</td>
            <td class="p-3 text-right font-bold text-rose-500">Rp ${totalCOGS.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold opacity-70">${totalRev > 0 ? ((totalCOGS / totalRev) * 100).toFixed(1) : '0'}%</td>
        </tr>

        <tr class="font-bold bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white border-y border-indigo-200 dark:border-indigo-800">
            <td class="p-3 text-indigo-700 dark:text-indigo-300">LABA KOTOR (GROSS PROFIT)</td>
            <td class="p-3 text-right font-bold text-indigo-700 dark:text-indigo-300">Rp ${grossProfit.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold text-indigo-700 dark:text-indigo-300">${grossMargin.toFixed(1)}%</td>
        </tr>

        <tr class="font-semibold bg-slate-50/50 dark:bg-slate-900/30">
            <td class="p-3 font-bold text-slate-800 dark:text-slate-100" colspan="3">3. BEBAN OPERASIONAL (EXPENSES)</td>
        </tr>
    `;

    if (data.expenses.length === 0) {
        rows += `
            <tr>
                <td class="p-3 pl-6 opacity-60 italic" colspan="3">Tidak ada pengeluaran operasional tercatat pada periode ini.</td>
            </tr>
        `;
    } else {
        data.expenses.forEach(e => {
            const ratio = totalRev > 0 ? ((e.amount / totalRev) * 100).toFixed(1) : '0';
            rows += `
                <tr>
                    <td class="p-2.5 pl-6">${e.description} <span class="text-[10px] opacity-50">(${e.date})</span></td>
                    <td class="p-2.5 text-right font-mono opacity-80">Rp ${(e.amount || 0).toLocaleString('id-ID')}</td>
                    <td class="p-2.5 text-right opacity-60">${ratio}%</td>
                </tr>
            `;
        });
    }

    rows += `
        <tr class="font-bold border-t border-inherit">
            <td class="p-3 pl-6 text-slate-800 dark:text-slate-200">Total Beban Operasional</td>
            <td class="p-3 text-right font-bold text-rose-500">Rp ${totalExp.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold opacity-70">${totalRev > 0 ? ((totalExp / totalRev) * 100).toFixed(1) : '0'}%</td>
        </tr>

        <tr class="font-bold text-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-t-2 border-emerald-400">
            <td class="p-3.5">LABA BERSIH OPERASIONAL (NET PROFIT)</td>
            <td class="p-3.5 text-right font-bold text-base ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">Rp ${netProfit.toLocaleString('id-ID')}</td>
            <td class="p-3.5 text-right font-bold">${netMargin.toFixed(1)}%</td>
        </tr>
    `;

    tbody.innerHTML = rows;
}

function renderReportSales(data) {
    const totalVolume = data.transactions.reduce((acc, t) => acc + (t.qty || 0), 0);
    const totalRev = data.transactions.reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const aov = data.transactions.length > 0 ? Math.round(totalRev / data.transactions.length) : 0;

    document.getElementById('rep-sales-volume').innerText = totalVolume.toLocaleString('id-ID') + " pcs";
    document.getElementById('rep-sales-aov').innerText = "Rp " + aov.toLocaleString('id-ID');

    // Aggregate by Product
    const productMap = {};
    data.transactions.forEach(t => {
        const key = t.itemName || 'Lainnya';
        if (!productMap[key]) {
            productMap[key] = { name: key, qty: 0, omzet: 0, modal: 0 };
        }
        productMap[key].qty += (t.qty || 0);
        productMap[key].omzet += (t.totalSell || 0);
        productMap[key].modal += (t.totalModal || 0);
    });

    const products = Object.values(productMap).sort((a, b) => b.qty - a.qty);
    document.getElementById('rep-sales-top-product').innerText = products.length > 0 ? `${products[0].name} (${products[0].qty} pcs)` : '-';

    const prodBody = document.getElementById('rep-top-products-body');
    if (prodBody) {
        if (products.length === 0) {
            prodBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center opacity-50">Belum ada transaksi di periode ini.</td></tr>`;
        } else {
            prodBody.innerHTML = products.map((p, idx) => {
                const profit = p.omzet - p.modal;
                const margin = p.omzet > 0 ? ((profit / p.omzet) * 100).toFixed(1) : 0;
                return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td class="p-2.5 font-medium flex items-center gap-2">
                            <span class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${idx < 3 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">${idx + 1}</span>
                            <span>${p.name}</span>
                        </td>
                        <td class="p-2.5 text-center font-bold font-mono">${p.qty}</td>
                        <td class="p-2.5 text-right font-medium">Rp ${p.omzet.toLocaleString('id-ID')}</td>
                        <td class="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">${margin}%</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Aggregate by Customer
    const custMap = {};
    data.transactions.forEach(t => {
        const key = t.customer || 'Umum';
        if (!custMap[key]) {
            custMap[key] = { name: key, count: 0, omzet: 0, unpaid: 0 };
        }
        custMap[key].count++;
        custMap[key].omzet += (t.totalSell || 0);
        if (t.status !== 'Lunas') custMap[key].unpaid += (t.totalSell || 0);
    });

    const customers = Object.values(custMap).sort((a, b) => b.omzet - a.omzet);
    const custBody = document.getElementById('rep-top-customers-body');
    if (custBody) {
        if (customers.length === 0) {
            custBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center opacity-50">Belum ada transaksi di periode ini.</td></tr>`;
        } else {
            custBody.innerHTML = customers.map(c => {
                const statusBadge = c.unpaid > 0 ? 
                    `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Ada Piutang</span>` : 
                    `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Tertib</span>`;
                return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td class="p-2.5 font-medium">${c.name}</td>
                        <td class="p-2.5 text-center font-mono">${c.count} trx</td>
                        <td class="p-2.5 text-right font-medium">Rp ${c.omzet.toLocaleString('id-ID')}</td>
                        <td class="p-2.5 text-center">${statusBadge}</td>
                    </tr>
                `;
            }).join('');
        }
    }
}

function renderReportReceivables(data) {
    // Unpaid invoices / transactions across all data
    const custReceivables = {};
    let totalUnpaidAmount = 0;
    let totalUnpaidTrx = 0;

    data.allTransactions.forEach(t => {
        if (t.status !== 'Lunas') {
            const key = t.customer || 'Umum';
            if (!custReceivables[key]) {
                const foundCust = customerData.find(c => c.name.toLowerCase() === key.toLowerCase());
                custReceivables[key] = {
                    name: key,
                    phone: foundCust ? foundCust.phone : '-',
                    total: 0,
                    count: 0,
                    lastDate: t.date
                };
            }
            custReceivables[key].total += (t.totalSell || 0);
            custReceivables[key].count++;
            if (t.date > custReceivables[key].lastDate) {
                custReceivables[key].lastDate = t.date;
            }
            totalUnpaidAmount += (t.totalSell || 0);
            totalUnpaidTrx++;
        }
    });

    const list = Object.values(custReceivables).sort((a, b) => b.total - a.total);

    document.getElementById('rep-rec-total').innerText = "Rp " + totalUnpaidAmount.toLocaleString('id-ID');
    document.getElementById('rep-rec-cust-count').innerText = list.length + " Toko Mitra";
    document.getElementById('rep-rec-inv-count').innerText = totalUnpaidTrx + " Nota";

    const tbody = document.getElementById('rep-receivables-body');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-emerald-600 font-medium">Semua transaksi lunas. Tidak ada piutang tertunggak!</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const cleanPhone = (item.phone || '').replace(/[^0-9]/g, '');
        const waBtn = cleanPhone && cleanPhone !== '-' ? `
            <button onclick="sendReportWhatsApp('${cleanPhone}', '${item.name}', ${item.total}, ${item.count})" class="theme-input px-2.5 py-1 rounded-lg border text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition flex items-center gap-1 mx-auto">
                <i class="fa-brands fa-whatsapp text-emerald-600"></i> Reminder WA
            </button>
        ` : `<span class="opacity-40 text-[10px]">No WA kosong</span>`;

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td class="p-3 font-semibold text-slate-800 dark:text-slate-100">${item.name}</td>
                <td class="p-3 font-mono opacity-70">${item.phone || '-'}</td>
                <td class="p-3 text-center font-bold text-amber-600 font-mono">${item.count}</td>
                <td class="p-3 text-right font-bold text-rose-500 font-mono">Rp ${item.total.toLocaleString('id-ID')}</td>
                <td class="p-3 font-mono opacity-60 text-xs">${item.lastDate || '-'}</td>
                <td class="p-3 text-center">${waBtn}</td>
            </tr>
        `;
    }).join('');
}

function sendReportWhatsApp(phone, custName, amount, count) {
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.slice(1);
    }
    const message = encodeURIComponent(
        `Halo ${custName},\n\nKami dari SnackLoop ERP ingin mengonfirmasi bahwa terdapat ${count} nota transaksi yang belum lunas dengan total sebesar Rp ${amount.toLocaleString('id-ID')}.\n\nMohon informasi estimasi pembayarannya ya. Terima kasih banyak atas kerjasamanya!`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
}

function renderReportInventory() {
    let totalValuation = 0;
    let totalQty = 0;
    let potentialRev = 0;
    let lowCount = 0;

    repackData.forEach(r => {
        const rem = r.remaining_qty || 0;
        const modal = r.modal_per_pcs || 0;
        const sell = r.sell_target || 0;

        totalValuation += (rem * modal);
        totalQty += rem;
        potentialRev += (rem * sell);
        if (rem > 0 && rem < 10) lowCount++;
    });

    document.getElementById('rep-inv-valuation').innerText = "Rp " + totalValuation.toLocaleString('id-ID');
    document.getElementById('rep-inv-total-qty').innerText = totalQty.toLocaleString('id-ID') + " pcs";
    document.getElementById('rep-inv-potential-rev').innerText = "Rp " + potentialRev.toLocaleString('id-ID');
    document.getElementById('rep-inv-low-count').innerText = lowCount + " Batch";
    document.getElementById('rep-inv-batch-count').innerText = repackData.length + " batch terdaftar";

    const tbody = document.getElementById('rep-inventory-body');
    if (!tbody) return;

    if (repackData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center opacity-50">Belum ada batch repack di gudang.</td></tr>`;
        return;
    }

    tbody.innerHTML = repackData.map(r => {
        const rem = r.remaining_qty || 0;
        const modal = r.modal_per_pcs || 0;
        const sell = r.sell_target || 0;
        const assetValue = rem * modal;

        let statusBadge = "";
        if (rem <= 0) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Habis</span>`;
        } else if (rem < 10) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Menipis</span>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Aman</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td class="p-3 font-mono text-indigo-500 font-bold">${r.id} <br><span class="text-[10px] opacity-60 text-slate-500">${r.date || '-'}</span></td>
                <td class="p-3 font-medium">${r.name}</td>
                <td class="p-3 text-right font-mono opacity-80">Rp ${modal.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-mono font-medium text-emerald-600">Rp ${sell.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center font-bold font-mono">${rem} / ${r.initial_qty || rem}</td>
                <td class="p-3 text-right font-bold font-mono">Rp ${assetValue.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// ======================= SISTEM DROPDOWN EKSPOR (EXCEL & PDF) ======================= //
function toggleExportDropdown() {
    const menu = document.getElementById('export-dropdown-menu');
    const arrow = document.getElementById('export-dropdown-arrow');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        closeExportDropdown();
    }
}

function closeExportDropdown() {
    const menu = document.getElementById('export-dropdown-menu');
    const arrow = document.getElementById('export-dropdown-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
}

document.addEventListener('click', function(e) {
    const container = document.getElementById('export-dropdown-container');
    if (container && !container.contains(e.target)) {
        closeExportDropdown();
    }
});

function exportCurrentSubtab(format) {
    closeExportDropdown();
    exportReportOption(format, currentReportSubtab);
}

function exportReportOption(format, reportType) {
    closeExportDropdown();
    if (format === 'excel') {
        exportToExcel(reportType);
    } else if (format === 'pdf') {
        exportToPdf(reportType);
    }
}

// ------------------- EKSPOR EXCEL (.XLSX) ------------------- //
function exportToExcel(reportType) {
    if (typeof XLSX === 'undefined') {
        return showNotification("Gagal", "Library Excel (SheetJS) belum siap.", "error");
    }

    const data = getFilteredReportData();
    const wb = XLSX.utils.book_new();
    const todayStr = new Date().toISOString().split('T')[0];

    // Helper calculations
    const totalRev = data.transactions.reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const paidRev = data.transactions.filter(t => t.status === 'Lunas').reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const unpaidRev = totalRev - paidRev;
    const totalCOGS = data.transactions.reduce((acc, t) => acc + (t.totalModal || 0), 0);
    const grossProfit = totalRev - totalCOGS;
    const totalExp = data.expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExp;

    if (reportType === 'all' || reportType === 'pnl') {
        const pnlRows = [
            { "Kategori": "Periode Laporan", "Keterangan": data.periodLabel, "Nominal (Rp)": "" },
            { "Kategori": "", "Keterangan": "", "Nominal (Rp)": "" },
            { "Kategori": "1. PENDAPATAN OPERASIONAL", "Keterangan": "Penjualan Lunas", "Nominal (Rp)": paidRev },
            { "Kategori": "1. PENDAPATAN OPERASIONAL", "Keterangan": "Penjualan Tempo (Belum Lunas)", "Nominal (Rp)": unpaidRev },
            { "Kategori": "1. PENDAPATAN OPERASIONAL", "Keterangan": "TOTAL PENDAPATAN BERSIH", "Nominal (Rp)": totalRev },
            { "Kategori": "", "Keterangan": "", "Nominal (Rp)": "" },
            { "Kategori": "2. HARGA POKOK PENJUALAN", "Keterangan": "Modal Pembelian & Bahan Baku", "Nominal (Rp)": totalCOGS },
            { "Kategori": "2. HARGA POKOK PENJUALAN", "Keterangan": "TOTAL HPP", "Nominal (Rp)": totalCOGS },
            { "Kategori": "", "Keterangan": "", "Nominal (Rp)": "" },
            { "Kategori": "LABA KOTOR", "Keterangan": "LABA KOTOR (GROSS PROFIT)", "Nominal (Rp)": grossProfit },
            { "Kategori": "", "Keterangan": "", "Nominal (Rp)": "" },
            { "Kategori": "3. BEBAN OPERASIONAL", "Keterangan": "TOTAL BEBAN OPERASIONAL", "Nominal (Rp)": totalExp },
            { "Kategori": "", "Keterangan": "", "Nominal (Rp)": "" },
            { "Kategori": "LABA BERSIH", "Keterangan": "LABA BERSIH OPERASIONAL (NET PROFIT)", "Nominal (Rp)": netProfit }
        ];
        const wsPnl = XLSX.utils.json_to_sheet(pnlRows);
        XLSX.utils.book_append_sheet(wb, wsPnl, "Laba_Rugi");
    }

    if (reportType === 'all' || reportType === 'sales') {
        const trxRows = data.transactions.map(t => ({
            "Tanggal": t.date,
            "Pelanggan": t.customer,
            "Produk": t.itemName,
            "Sumber": t.source,
            "Qty": t.qty,
            "Harga Modal": t.buy,
            "Biaya Tambahan": t.extraCost,
            "Total Modal": t.totalModal,
            "Harga Jual": t.sell,
            "Total Jual": t.totalSell,
            "Laba Transaksi": (t.totalSell - t.totalModal),
            "Status": t.status,
            "Catatan": t.notes
        }));
        const wsTrx = XLSX.utils.json_to_sheet(trxRows);
        XLSX.utils.book_append_sheet(wb, wsTrx, "Penjualan_Produk");
    }

    if (reportType === 'all' || reportType === 'receivables') {
        const custReceivables = {};
        data.allTransactions.forEach(t => {
            if (t.status !== 'Lunas') {
                const key = t.customer || 'Umum';
                if (!custReceivables[key]) {
                    const foundCust = customerData.find(c => c.name.toLowerCase() === key.toLowerCase());
                    custReceivables[key] = {
                        "Nama Pelanggan": key,
                        "Kontak Telepon": foundCust ? foundCust.phone : '-',
                        "Jumlah Nota Belum Lunas": 0,
                        "Total Piutang (Rp)": 0,
                        "Transaksi Terakhir": t.date
                    };
                }
                custReceivables[key]["Total Piutang (Rp)"] += (t.totalSell || 0);
                custReceivables[key]["Jumlah Nota Belum Lunas"]++;
                if (t.date > custReceivables[key]["Transaksi Terakhir"]) {
                    custReceivables[key]["Transaksi Terakhir"] = t.date;
                }
            }
        });
        const recRows = Object.values(custReceivables);
        const wsRec = XLSX.utils.json_to_sheet(recRows.length > 0 ? recRows : [{ "Status": "Tidak ada piutang tertunggak" }]);
        XLSX.utils.book_append_sheet(wb, wsRec, "Rekap_Piutang");
    }

    if (reportType === 'all' || reportType === 'inventory') {
        const stockRows = repackData.map(r => ({
            "Batch ID": r.id,
            "Nama Snack": r.name,
            "Tanggal Masuk": r.date,
            "Modal / Pcs (Rp)": r.modal_per_pcs,
            "Target Jual / Pcs (Rp)": r.sell_target,
            "Sisa Stok (Qty)": r.remaining_qty,
            "Stok Awal": r.initial_qty || r.remaining_qty,
            "Total Nilai Aset Modal (Rp)": (r.remaining_qty * r.modal_per_pcs),
            "Estimasi Omzet Sisa (Rp)": (r.remaining_qty * r.sell_target),
            "Status": r.remaining_qty <= 0 ? "Habis" : (r.remaining_qty < 10 ? "Menipis" : "Aman")
        }));
        const wsStock = XLSX.utils.json_to_sheet(stockRows.length > 0 ? stockRows : [{ "Status": "Belum ada stok di gudang" }]);
        XLSX.utils.book_append_sheet(wb, wsStock, "Valuasi_Stok");
    }

    const typeLabel = reportType === 'all' ? 'Lengkap' : reportType.toUpperCase();
    const fileName = `SnackLoop_Laporan_${typeLabel}_${todayStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showNotification("Sukses", `File Excel "${fileName}" berhasil diunduh!`, "success");
}

// ------------------- EKSPOR PDF (.PDF) ------------------- //
function exportToPdf(reportType) {
    if (typeof html2pdf === 'undefined') {
        return showNotification("Gagal", "Library PDF (html2pdf) belum siap.", "error");
    }

    const data = getFilteredReportData();
    const renderArea = document.getElementById('report-pdf-render-area');
    if (!renderArea) return;

    const titles = {
        'all': 'LAPORAN BISNIS & KEUANGAN EKSEKUTIF',
        'pnl': 'LAPORAN LABA RUGI KOMPREHENSIF',
        'sales': 'LAPORAN ANALISIS PENJUALAN & PRODUK',
        'receivables': 'LAPORAN REKAPITULASI PIUTANG PELANGGAN',
        'inventory': 'LAPORAN VALUASI PERSEDIAAN GUDANG'
    };

    const docTitle = titles[reportType] || 'LAPORAN BISNIS SNACKLOOP';
    const todayFormatted = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    // Financial calculations
    const totalRev = data.transactions.reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const paidRev = data.transactions.filter(t => t.status === 'Lunas').reduce((acc, t) => acc + (t.totalSell || 0), 0);
    const unpaidRev = totalRev - paidRev;
    const totalCOGS = data.transactions.reduce((acc, t) => acc + (t.totalModal || 0), 0);
    const grossProfit = totalRev - totalCOGS;
    const grossMargin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;
    const totalExp = data.expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExp;
    const netMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

    let bodyHtml = '';

    // SECTION 1: PnL
    if (reportType === 'all' || reportType === 'pnl') {
        bodyHtml += `
            <div style="margin-bottom: 24px;">
                <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e1b4b; border-bottom: 1.5px solid #4f46e5; padding-bottom: 4px; margin-bottom: 12px;">1. Laporan Laba Rugi (Profit & Loss)</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
                            <th style="padding: 6px 8px;">Pos Keuangan</th>
                            <th style="padding: 6px 8px; text-align: right;">Nominal (Rp)</th>
                            <th style="padding: 6px 8px; text-align: right;">Rasio (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px 8px;">Penjualan Lunas</td><td style="padding: 6px 8px; text-align: right;">Rp ${paidRev.toLocaleString('id-ID')}</td><td style="padding: 6px 8px; text-align: right;">${totalRev > 0 ? ((paidRev/totalRev)*100).toFixed(1) : 0}%</td></tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px 8px;">Penjualan Tempo (Belum Lunas)</td><td style="padding: 6px 8px; text-align: right;">Rp ${unpaidRev.toLocaleString('id-ID')}</td><td style="padding: 6px 8px; text-align: right;">${totalRev > 0 ? ((unpaidRev/totalRev)*100).toFixed(1) : 0}%</td></tr>
                        <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1.5px solid #cbd5e1;"><td style="padding: 6px 8px;">Total Pendapatan Bersih</td><td style="padding: 6px 8px; text-align: right; color: #4338ca;">Rp ${totalRev.toLocaleString('id-ID')}</td><td style="padding: 6px 8px; text-align: right;">100.0%</td></tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px 8px;">Harga Pokok Penjualan (HPP)</td><td style="padding: 6px 8px; text-align: right; color: #e11d48;">Rp ${totalCOGS.toLocaleString('id-ID')}</td><td style="padding: 6px 8px; text-align: right;">${totalRev > 0 ? ((totalCOGS/totalRev)*100).toFixed(1) : 0}%</td></tr>
                        <tr style="background: #e0e7ff; font-weight: bold; border-bottom: 1.5px solid #cbd5e1;"><td style="padding: 6px 8px;">Laba Kotor (Gross Profit)</td><td style="padding: 6px 8px; text-align: right; color: #3730a3;">Rp ${grossProfit.toLocaleString('id-ID')}</td><td style="padding: 6px 8px; text-align: right;">${grossMargin.toFixed(1)}%</td></tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px 8px;">Total Beban Operasional</td><td style="padding: 6px 8px; text-align: right; color: #e11d48;">Rp ${totalExp.toLocaleString('id-ID')}</td><td style="padding: 6px 8px; text-align: right;">${totalRev > 0 ? ((totalExp/totalRev)*100).toFixed(1) : 0}%</td></tr>
                        <tr style="background: #dcfce7; font-weight: bold; font-size: 12px; border-top: 2px solid #16a34a;"><td style="padding: 8px;">LABA BERSIH OPERASIONAL (NET PROFIT)</td><td style="padding: 8px; text-align: right; color: #15803d;">Rp ${netProfit.toLocaleString('id-ID')}</td><td style="padding: 8px; text-align: right; color: #15803d;">${netMargin.toFixed(1)}%</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // SECTION 2: Sales & Top Products
    if (reportType === 'all' || reportType === 'sales') {
        const productMap = {};
        data.transactions.forEach(t => {
            const k = t.itemName || 'Lainnya';
            if (!productMap[k]) productMap[k] = { name: k, qty: 0, omzet: 0 };
            productMap[k].qty += (t.qty || 0);
            productMap[k].omzet += (t.totalSell || 0);
        });
        const topProds = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

        bodyHtml += `
            <div style="margin-bottom: 24px; ${reportType === 'all' ? 'page-break-before: always;' : ''}">
                <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e1b4b; border-bottom: 1.5px solid #4f46e5; padding-bottom: 4px; margin-bottom: 12px;">2. Peringkat Produk Terlaris (Top Selling)</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
                            <th style="padding: 5px 8px;">No</th>
                            <th style="padding: 5px 8px;">Nama Snack</th>
                            <th style="padding: 5px 8px; text-align: center;">Qty Terjual</th>
                            <th style="padding: 5px 8px; text-align: right;">Total Omzet (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topProds.map((p, i) => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 5px 8px; text-align: center;">${i+1}</td>
                                <td style="padding: 5px 8px; font-weight: 500;">${p.name}</td>
                                <td style="padding: 5px 8px; text-align: center; font-weight: bold;">${p.qty} pcs</td>
                                <td style="padding: 5px 8px; text-align: right;">Rp ${p.omzet.toLocaleString('id-ID')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // SECTION 3: Receivables
    if (reportType === 'all' || reportType === 'receivables') {
        const custReceivables = {};
        data.allTransactions.forEach(t => {
            if (t.status !== 'Lunas') {
                const k = t.customer || 'Umum';
                if (!custReceivables[k]) {
                    const fc = customerData.find(c => c.name.toLowerCase() === k.toLowerCase());
                    custReceivables[k] = { name: k, phone: fc ? fc.phone : '-', total: 0, count: 0 };
                }
                custReceivables[k].total += (t.totalSell || 0);
                custReceivables[k].count++;
            }
        });
        const recList = Object.values(custReceivables).sort((a, b) => b.total - a.total);

        bodyHtml += `
            <div style="margin-bottom: 24px; ${reportType === 'all' ? 'page-break-before: always;' : ''}">
                <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e1b4b; border-bottom: 1.5px solid #4f46e5; padding-bottom: 4px; margin-bottom: 12px;">3. Rekapitulasi Piutang Pelanggan</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
                            <th style="padding: 5px 8px;">Pelanggan / Toko</th>
                            <th style="padding: 5px 8px;">No. Kontak</th>
                            <th style="padding: 5px 8px; text-align: center;">Nota Belum Lunas</th>
                            <th style="padding: 5px 8px; text-align: right;">Total Tagihan (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recList.length === 0 ? '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #16a34a;">Semua transaksi lunas. Tidak ada piutang.</td></tr>' : 
                        recList.map(r => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 5px 8px; font-weight: 500;">${r.name}</td>
                                <td style="padding: 5px 8px;">${r.phone}</td>
                                <td style="padding: 5px 8px; text-align: center; font-weight: bold;">${r.count} nota</td>
                                <td style="padding: 5px 8px; text-align: right; font-weight: bold; color: #e11d48;">Rp ${r.total.toLocaleString('id-ID')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // SECTION 4: Inventory
    if (reportType === 'all' || reportType === 'inventory') {
        bodyHtml += `
            <div style="margin-bottom: 24px; ${reportType === 'all' ? 'page-break-before: always;' : ''}">
                <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e1b4b; border-bottom: 1.5px solid #4f46e5; padding-bottom: 4px; margin-bottom: 12px;">4. Valuasi Persediaan Gudang Repack</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; text-align: left;">
                            <th style="padding: 5px 6px;">Batch</th>
                            <th style="padding: 5px 6px;">Nama Snack</th>
                            <th style="padding: 5px 6px; text-align: right;">Modal/Pcs</th>
                            <th style="padding: 5px 6px; text-align: right;">Target Jual</th>
                            <th style="padding: 5px 6px; text-align: center;">Sisa</th>
                            <th style="padding: 5px 6px; text-align: right;">Nilai Aset Modal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${repackData.map(r => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 5px 6px; font-family: monospace;">${r.id}</td>
                                <td style="padding: 5px 6px; font-weight: 500;">${r.name}</td>
                                <td style="padding: 5px 6px; text-align: right;">Rp ${(r.modal_per_pcs||0).toLocaleString('id-ID')}</td>
                                <td style="padding: 5px 6px; text-align: right;">Rp ${(r.sell_target||0).toLocaleString('id-ID')}</td>
                                <td style="padding: 5px 6px; text-align: center; font-weight: bold;">${r.remaining_qty||0}</td>
                                <td style="padding: 5px 6px; text-align: right; font-weight: bold;">Rp ${((r.remaining_qty||0)*(r.modal_per_pcs||0)).toLocaleString('id-ID')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Assemble complete HTML
    renderArea.innerHTML = `
        <div style="font-family: 'Poppins', sans-serif; color: #1e293b; line-height: 1.4;">
            <!-- Kop Resmi -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="Snackloop-logo.png" style="height: 42px; width: auto; object-fit: contain;">
                    <div>
                        <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #1e1b4b; letter-spacing: -0.5px;">SnackLoop ERP</h1>
                        <p style="font-size: 10px; color: #64748b; margin: 1px 0 0 0;">Sistem Manajemen & Pembukuan Distribusi Snack</p>
                    </div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #64748b;">
                    <p style="margin: 0; font-weight: 700; color: #1e1b4b; font-size: 11px;">${docTitle}</p>
                    <p style="margin: 2px 0 0 0;">Periode: <strong>${data.periodLabel}</strong></p>
                    <p style="margin: 2px 0 0 0;">Dicetak: ${todayFormatted} | Operator: ${currentUser || 'admin'}</p>
                </div>
            </div>

            <!-- Content -->
            ${bodyHtml}

            <!-- Signature Footer -->
            <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 10.5px; page-break-inside: avoid;">
                <div style="text-align: center; width: 170px;">
                    <p style="color: #64748b; margin-bottom: 46px;">Dibuat Oleh,</p>
                    <p style="font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; margin: 0;">${currentUser || 'Admin / Staf'}</p>
                    <span style="font-size: 9px; opacity: 60;">Bagian Operasional</span>
                </div>
                <div style="text-align: center; width: 170px;">
                    <p style="color: #64748b; margin-bottom: 46px;">Disetujui Oleh,</p>
                    <p style="font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; margin: 0;">Owner / Manajemen</p>
                    <span style="font-size: 9px; opacity: 60;">Pimpinan Usaha</span>
                </div>
            </div>
        </div>
    `;

    const typeLabel = reportType === 'all' ? 'Eksekutif_Lengkap' : reportType.toUpperCase();
    const fileName = `SnackLoop_${typeLabel}_${new Date().toISOString().split('T')[0]}.pdf`;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    showNotification("Memproses PDF", "Sedang menyusun dokumen laporan resmi...", "info");
    html2pdf().from(renderArea).set(opt).save().then(() => {
        showNotification("Sukses", `Dokumen PDF "${fileName}" berhasil diunduh!`, "success");
    }).catch(err => {
        console.error("Gagal export PDF:", err);
        showNotification("Gagal", "Terjadi kesalahan saat memproses PDF.", "error");
    });
}

function printReportView() {
    window.print();
}

