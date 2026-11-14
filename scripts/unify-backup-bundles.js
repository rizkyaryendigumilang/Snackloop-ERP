// =========================================================================
// SNACKLOOP ERP - UNIFIKASI & STANDARDISASI SKEMA CADANGAN LENGKAP
// =========================================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Data JSON 1 (Aktif November)
const json1Path = path.join(__dirname, '..', 'temp_json1_active.json');
// 2. Data JSON 2 (Migrasi Spreadsheet)
const json2Path = path.join(__dirname, '..', 'SnackLoop_Backup_Migrasi.json');

const raw1 = JSON.parse(fs.readFileSync(json1Path, 'utf8'));
const raw2 = JSON.parse(fs.readFileSync(json2Path, 'utf8'));

// A. MERGE APP SETTINGS
const appSettings = {
    ...raw1.appSettings,
    businessName: raw1.appSettings?.businessName || "SnackLoop",
    businessTagline: raw1.appSettings?.businessTagline || "Sistem Manajemen & Distribusi Snack",
    businessAddress: raw1.appSettings?.businessAddress || "Indonesia",
    businessCity: raw1.appSettings?.businessCity || "Jakarta",
    bankAccount: raw1.appSettings?.bankAccount || "BCA 12345678 a/n SnackLoop",
    whatsappPhone: raw1.appSettings?.whatsappPhone || "628123456789",
    printFormat: raw1.appSettings?.printFormat || "a4"
};

// B. MERGE AGENTS
const agentMap = new Map();
const addAgent = (a) => {
    if (!a || !a.name) return;
    const key = a.name.toLowerCase().trim();
    if (!agentMap.has(key)) {
        agentMap.set(key, {
            id: typeof a.id === 'number' ? a.id : Number(String(a.id).replace(/\D/g, '').slice(0, 8)) || agentMap.size + 1,
            name: a.name.trim(),
            phone: a.phone || '-'
        });
    }
};
(raw1.agentData || []).forEach(addAgent);
(raw2.agentData || []).forEach(addAgent);
const agentData = Array.from(agentMap.values());

// C. MERGE CUSTOMERS
const customerMap = new Map();
const addCust = (c) => {
    if (!c || !c.name) return;
    const key = c.name.toLowerCase().trim();
    if (!customerMap.has(key)) {
        customerMap.set(key, {
            id: typeof c.id === 'number' ? c.id : customerMap.size + 1,
            name: c.name.trim(),
            phone: c.phone || '-'
        });
    } else {
        const existing = customerMap.get(key);
        if (c.phone && c.phone !== '-' && existing.phone === '-') {
            existing.phone = c.phone;
        }
    }
};
(raw1.customerData || []).forEach(addCust);
(raw2.customerData || []).forEach(addCust);
const customerData = Array.from(customerMap.values());

// D. MERGE MASTER DATA
const masterMap = new Map();
(raw2.masterData || []).forEach(m => {
    if (!m || !m.name) return;
    const key = m.name.toLowerCase().trim();
    masterMap.set(key, {
        id: m.id,
        name: m.name.trim(),
        source: m.source || 'Toko Grosir Tegal Parang',
        buy: Number(m.buy) || 0,
        sell: Number(m.sell) || 0,
        agent_id: m.agent_id || null,
        stock_qty: m.stock_qty !== undefined ? m.stock_qty : 25,
        min_stock: m.min_stock !== undefined ? m.min_stock : 5
    });
});

(raw1.masterData || []).forEach(m => {
    if (!m || !m.name) return;
    const key = m.name.toLowerCase().trim();
    if (masterMap.has(key)) {
        const existing = masterMap.get(key);
        existing.buy = Number(m.buy) || existing.buy;
        existing.sell = Number(m.sell) || existing.sell;
        existing.source = m.source || existing.source;
    } else {
        let maxId = 0;
        masterMap.forEach(item => { if (item.id > maxId) maxId = item.id; });
        masterMap.set(key, {
            id: (typeof m.id === 'number' && m.id < 100000) ? m.id : (maxId + 1),
            name: m.name.trim(),
            source: m.source || 'Toko Agen Tegal Parang Diah',
            buy: Number(m.buy) || 0,
            sell: Number(m.sell) || 0,
            agent_id: m.agent_id || null,
            stock_qty: 25,
            min_stock: 5
        });
    }
});
const masterData = Array.from(masterMap.values());

// E. MERGE REPACK DATA
const repackMap = new Map();
(raw1.repackData || []).forEach(r => { if (r.id) repackMap.set(r.id, r); });
(raw2.repackData || []).forEach(r => { if (r.id) repackMap.set(r.id, r); });
const repackData = Array.from(repackMap.values());

// F. MERGE TRANSACTIONS (PER BULAN)
const transactionData = {};
const allMonths = [
    'Mar 2026', 'Apr 2026', 'Mei 2026', 'Jun 2026', 
    'Jul 2026', 'Agu 2026', 'Sep 2026', 'Okt 2026', 'Nov 2026'
];

allMonths.forEach(mKey => {
    const list1 = (raw1.transactionData && raw1.transactionData[mKey]) || [];
    const list2 = (raw2.transactionData && raw2.transactionData[mKey]) || [];
    const combined = [...list1, ...list2];
    
    // Deduplikasi transaksi jika ada ID yang sama
    const uniqueTrx = [];
    const seenTrx = new Set();
    combined.forEach(t => {
        const signature = `${t.date}_${t.customer}_${t.itemName}_${t.qty}_${t.sell}`;
        if (!seenTrx.has(signature)) {
            seenTrx.add(signature);
            uniqueTrx.push({
                id: t.id,
                monthKey: mKey,
                date: t.date,
                customer: t.customer || 'Pelanggan Retail (Kasir)',
                itemName: t.itemName || t.item_name,
                source: t.source || 'Toko Grosir Tegal Parang',
                batch: t.batch || 'Reguler',
                qty: Number(t.qty) || 1,
                buy: Number(t.buy) || 0,
                sell: Number(t.sell) || 0,
                totalModal: Number(t.totalModal || t.total_modal) || ((Number(t.qty) || 1) * (Number(t.buy) || 0)),
                totalSell: Number(t.totalSell || t.total_sell) || ((Number(t.qty) || 1) * (Number(t.sell) || 0)),
                profitPerItem: Number(t.profitPerItem || t.profit_per_item) || ((Number(t.sell) || 0) - (Number(t.buy) || 0)),
                status: t.status || 'Lunas',
                notes: t.notes || '-',
                extraCost: Number(t.extraCost || t.extra_cost) || 0,
                extraCostNote: t.extraCostNote || t.extra_cost_note || '-'
            });
        }
    });
    
    if (uniqueTrx.length > 0) {
        transactionData[mKey] = uniqueTrx;
    }
});

// G. MERGE INVOICES
const invoiceMap = new Map();
(raw1.invoiceData || []).forEach(inv => {
    if (inv && inv.invoice_number) invoiceMap.set(inv.invoice_number, inv);
});
(raw2.invoiceData || []).forEach(inv => {
    if (inv && inv.invoice_number) invoiceMap.set(inv.invoice_number, inv);
});
const invoiceData = Array.from(invoiceMap.values());

// H. MERGE PRICE HISTORY & JASTIP
const priceHistoryData = Array.isArray(raw1.priceHistoryData) ? raw1.priceHistoryData : [];
const jastipData = Array.isArray(raw1.jastipData) ? raw1.jastipData : [];
const returnData = [];
const expenseData = [];

// I. MERGE AUDIT LOGS
const auditLogMap = new Map();
(raw1.auditLogData || []).forEach(log => { if (log && log.id) auditLogMap.set(String(log.id), log); });
(raw2.auditLogData || []).forEach(log => { if (log && log.id) auditLogMap.set(String(log.id), log); });
const auditLogData = Array.from(auditLogMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// J. HITUNG RECORD COUNTS & CHECKSUM UNTUK IMPROVEMENT SKEMA
let totalTrxCount = 0;
for (let m in transactionData) {
    totalTrxCount += transactionData[m].length;
}

const payloadForHash = JSON.stringify({
    masterData,
    agentData,
    customerData,
    repackData,
    transactionData,
    invoiceData,
    jastipData
});
const checksum = 'sha256:' + crypto.createHash('sha256').update(payloadForHash).digest('hex');

// K. BUNDLE FINAL TERPADU (UNIFIED BUNDLE)
const unifiedBundle = {
    meta: {
        system: "SnackLoop ERP",
        version: "2.6.0-Enterprise",
        schemaVersion: 2,
        exportDate: new Date().toISOString(),
        exportedBy: "admin",
        description: "Cadangan Database Lengkap Terpadu (Data Historis Spreadsheet + Data Operasional Aktif)",
        checksum: checksum,
        recordCounts: {
            agents: agentData.length,
            customers: customerData.length,
            masterProducts: masterData.length,
            repackBatches: repackData.length,
            activeMonths: Object.keys(transactionData).length,
            transactionsTotal: totalTrxCount,
            invoices: invoiceData.length,
            jastipOrders: jastipData.length,
            priceHistoryLogs: priceHistoryData.length,
            auditLogs: auditLogData.length
        }
    },
    appSettings: appSettings,
    agentData: agentData,
    customerData: customerData,
    masterData: masterData,
    repackData: repackData,
    transactionData: transactionData,
    expenseData: expenseData,
    invoiceData: invoiceData,
    priceHistoryData: priceHistoryData,
    returnData: returnData,
    jastipData: jastipData,
    auditLogData: auditLogData
};

const finalPath = path.join(__dirname, '..', 'SnackLoop_Backup_Lengkap_Unified.json');
fs.writeFileSync(finalPath, JSON.stringify(unifiedBundle, null, 2), 'utf8');

// Update juga file SnackLoop_Backup_Migrasi.json agar selalu sinkron
const migrasiPath = path.join(__dirname, '..', 'SnackLoop_Backup_Migrasi.json');
fs.writeFileSync(migrasiPath, JSON.stringify(unifiedBundle, null, 2), 'utf8');

console.log('===========================================================');
console.log('SUKSES MENYATUKAN DATA KEDUA CADANGAN MENJADI 1 KESATUAN');
console.log('===========================================================');
console.log('File Hasil Terpadu  :', finalPath);
console.log('Checksum SHA-256    :', checksum);
console.log('\nRincian Data Terpadu:');
console.log('- Master Produk     :', masterData.length, 'item');
console.log('- Agen / Supplier   :', agentData.length, 'agen');
console.log('- Pelanggan         :', customerData.length, 'pelanggan');
console.log('- Repack Gudang     :', repackData.length, 'batch');
console.log('- Faktur / Invoices :', invoiceData.length, 'invoice');
console.log('- Jastip Orders     :', jastipData.length, 'order aktif');
console.log('- Riwayat Perubahan :', priceHistoryData.length, 'riwayat');
console.log('- Audit Logs        :', auditLogData.length, 'log aktivitas');
console.log('- Lembar Bulan      :', Object.keys(transactionData).join(', '));
for (let m in transactionData) {
    console.log(`   * ${m.padEnd(10)}: ${transactionData[m].length} transaksi`);
}
console.log('- Total Transaksi   :', totalTrxCount, 'transaksi');
console.log('===========================================================');
