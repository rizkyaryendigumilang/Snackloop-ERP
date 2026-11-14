// =========================================================================
// SNACKLOOP ERP - GENERATOR MIGRASI DATA SPREADSHEET
// =========================================================================
const fs = require('fs');
const path = require('path');
const XLSX = require('../vendor/xlsx.full.min.js');

const xlsxPath = path.join(__dirname, '..', 'SnackLoop_import.xlsx');
if (!fs.existsSync(xlsxPath)) {
    console.error('File SnackLoop_import.xlsx tidak ditemukan di root.');
    process.exit(1);
}

const buf = fs.readFileSync(xlsxPath);
const wb = XLSX.read(buf, { type: 'buffer' });

function excelDateToJS(serial) {
    if (!serial) return '2026-04-01';
    if (typeof serial === 'string' && serial.includes('-')) return serial;
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().slice(0, 10);
    }
    return '2026-04-01';
}

function getMonthKeyFromDate(dateStr) {
    if (!dateStr || dateStr.length < 7) return 'Apr 2026';
    const y = dateStr.slice(0, 4);
    const m = parseInt(dateStr.slice(5, 7), 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return (monthNames[m - 1] || 'Apr') + ' ' + y;
}

function escapeSql(str) {
    if (str === null || str === undefined) return "''";
    return "'" + String(str).replace(/'/g, "''") + "'";
}

// 1. Data Agen / Supplier
const agentData = [
    { id: 1, name: 'GS (Grosir Supplier)', phone: '-' },
    { id: 2, name: 'SP (Shopee Supplier)', phone: '-' }
];

// 2. Data Pelanggan Default
const customerData = [
    { id: 1, name: 'Pelanggan Umum', phone: '-', address: 'Penjualan Kasir Retail Langsung' }
];

// 3. Baca Master Produk
const wsMaster = wb.Sheets['Master'];
const masterRows = XLSX.utils.sheet_to_json(wsMaster);

const wsTrx = wb.Sheets['Transaksi'];
const trxDataRaw = XLSX.utils.sheet_to_json(wsTrx, { header: 1 });

const itemSources = {};
for (let i = 1; i < trxDataRaw.length; i++) {
    const r = trxDataRaw[i];
    if (!r) continue;
    const name = r[1] ? String(r[1]).trim() : '';
    const src = r[2] ? String(r[2]).trim() : '';
    if (name && src) itemSources[name] = src;
}

const masterData = [];
let mId = 1;
masterRows.forEach(m => {
    const rawName = m['Nama Barang'] ? String(m['Nama Barang']).trim() : '';
    if (!rawName) return;
    const buy = Number(m['Harga Beli']) || 0;
    const sell = Number(m['Harga Jual']) || 0;
    const src = itemSources[rawName] || 'GS';
    const agent_id = src === 'SP' ? 2 : 1;
    masterData.push({
        id: mId++,
        name: rawName,
        source: src,
        buy: buy,
        sell: sell,
        agent_id: agent_id,
        stock_qty: 25,
        min_stock: 5
    });
});

// 4. Data Repack dari Sheet "Snack Micin"
const wsMicin = wb.Sheets['Snack Micin'];
const micinRows = XLSX.utils.sheet_to_json(wsMicin);
const repackData = [];
let rpkId = 1;
micinRows.forEach(r => {
    const rawName = r['__EMPTY'] ? String(r['__EMPTY']).trim() : '';
    if (!rawName) return;
    const dateStr = excelDateToJS(r['Tanggal']);
    const modalPerPcs = Math.round(Number(r['modal + plastik']) || Number(r['Modal Tanpa Plastik']) || 5000);
    const initialQty = Number(r['Hasil Jadi Setelah Repack']) || 5;
    const sellTarget = modalPerPcs + 3000;
    repackData.push({
        id: 'RPK-' + String(rpkId++).padStart(3, '0'),
        date: dateStr,
        name: rawName + ' Repack',
        modal_per_pcs: modalPerPcs,
        sell_target: sellTarget,
        initial_qty: initialQty,
        remaining_qty: initialQty
    });
});

// 5. Data Transaksi Penjualan
const transactionData = {};
const allTransactionsList = [];
let trxId = 10001;

for (let i = 1; i < trxDataRaw.length; i++) {
    const r = trxDataRaw[i];
    if (!r || r.length === 0) continue;
    const rawName = r[1] ? String(r[1]).trim() : '';
    if (!rawName) continue;

    const dateStr = excelDateToJS(r[0]);
    const monthKey = getMonthKeyFromDate(dateStr);
    const source = r[2] ? String(r[2]).trim() : 'GS';
    const batch = r[4] ? String(r[4]).trim() : 'Reguler';
    const qty = Number(r[3]) || 1;
    const buy = Number(r[5]) || 0;
    const sell = Number(r[7]) || 0;
    const totalSell = qty * sell;
    const totalModal = qty * buy;
    const profit = totalSell - totalModal;
    const profitPerItem = sell - buy;
    const status = (r[10] && String(r[10]).toLowerCase().includes('belum')) ? 'Belum Lunas' : 'Lunas';
    const notes = r[8] ? String(r[8]).trim() : '';

    if (!transactionData[monthKey]) {
        transactionData[monthKey] = [];
    }

    const trxObj = {
        id: trxId++,
        date: dateStr,
        monthKey: monthKey,
        customer: 'Pelanggan Umum',
        itemName: rawName,
        source: source,
        batch: batch,
        qty: qty,
        buy: buy,
        sell: sell,
        totalModal: totalModal,
        totalSell: totalSell,
        profit: profit,
        profitPerItem: profitPerItem,
        status: status,
        notes: notes,
        extraCost: 0,
        extraCostNote: ''
    };

    transactionData[monthKey].push(trxObj);
    allTransactionsList.push(trxObj);
}

// 6. Buat Bundle Lengkap Standar SnackLoop Backup JSON
const bundle = {
    meta: {
        system: 'SnackLoop ERP',
        version: '2.6.0-Enterprise',
        exportDate: new Date().toISOString(),
        description: 'Migrasi Penuh Data dari Google Spreadsheet SnackLoop'
    },
    agentData: agentData,
    customerData: customerData,
    masterData: masterData,
    repackData: repackData,
    transactionData: transactionData,
    expenseData: [],
    invoiceData: [],
    priceHistoryData: [],
    returnData: [],
    auditLogData: [
        {
            id: 1,
            timestamp: new Date().toISOString(),
            user: 'admin',
            role: 'super_admin',
            action: 'DATA_MIGRATION',
            target: 'Google Spreadsheet',
            details: `Migrasi ${masterData.length} produk master, ${repackData.length} batch repack, dan ${allTransactionsList.length} transaksi penjualan`
        }
    ]
};

const outputPath = path.join(__dirname, '..', 'SnackLoop_Backup_Migrasi.json');
fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2), 'utf8');

// 7. Buat SQL Upsert Script untuk Supabase
let sql = `-- =========================================================================\n`;
sql += `-- SNACKLOOP ERP - MIGRATION SQL SCRIPT DARI GOOGLE SPREADSHEET\n`;
sql += `-- =========================================================================\n\n`;

sql += `-- 1. INSERT AGENTS\n`;
agentData.forEach(a => {
    sql += `INSERT INTO agents (id, name, phone) VALUES (${a.id}, ${escapeSql(a.name)}, ${escapeSql(a.phone)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
});
sql += `SELECT setval('agents_id_seq', (SELECT COALESCE(MAX(id), 1) FROM agents));\n\n`;

sql += `-- 2. INSERT CUSTOMERS\n`;
customerData.forEach(c => {
    sql += `INSERT INTO customers (id, name, phone, address) VALUES (${c.id}, ${escapeSql(c.name)}, ${escapeSql(c.phone)}, ${escapeSql(c.address)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
});
sql += `SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));\n\n`;

sql += `-- 3. INSERT MASTER PRODUK (${masterData.length} item)\n`;
masterData.forEach(m => {
    sql += `INSERT INTO master (id, name, source, buy, sell, agent_id, stock_qty, min_stock) VALUES (${m.id}, ${escapeSql(m.name)}, ${escapeSql(m.source)}, ${m.buy}, ${m.sell}, ${m.agent_id}, ${m.stock_qty}, ${m.min_stock}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, buy = EXCLUDED.buy, sell = EXCLUDED.sell, source = EXCLUDED.source;\n`;
});
sql += `SELECT setval('master_id_seq', (SELECT COALESCE(MAX(id), 1) FROM master));\n\n`;

sql += `-- 4. INSERT REPACK GUDANG (${repackData.length} batch)\n`;
repackData.forEach(r => {
    sql += `INSERT INTO repack (id, date, name, modal_per_pcs, sell_target, initial_qty, remaining_qty) VALUES (${escapeSql(r.id)}, ${escapeSql(r.date)}, ${escapeSql(r.name)}, ${r.modal_per_pcs}, ${r.sell_target}, ${r.initial_qty}, ${r.remaining_qty}) ON CONFLICT (id) DO UPDATE SET remaining_qty = EXCLUDED.remaining_qty;\n`;
});
sql += `\n`;

sql += `-- 5. INSERT TRANSAKSI PENJUALAN (${allTransactionsList.length} transaksi)\n`;
allTransactionsList.forEach(t => {
    sql += `INSERT INTO transactions (date, customer, item_name, source, batch, qty, buy_price, sell_price, total_sell, total_modal, profit, status, month_key, notes, extra_cost, extra_cost_note) VALUES (${escapeSql(t.date)}, ${escapeSql(t.customer)}, ${escapeSql(t.itemName)}, ${escapeSql(t.source)}, ${escapeSql(t.batch)}, ${t.qty}, ${t.buy}, ${t.sell}, ${t.totalSell}, ${t.totalModal}, ${t.profit}, ${escapeSql(t.status)}, ${escapeSql(t.monthKey)}, ${escapeSql(t.notes)}, 0, '');\n`;
});

const sqlPath = path.join(__dirname, '..', 'database', 'migration_from_spreadsheet.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');

console.log('==================================================');
console.log('HASIL GENERATE BUNDLE MIGRASI SNACKLOOP ERP');
console.log('==================================================');
console.log('JSON File : ', outputPath);
console.log('SQL File  : ', sqlPath);
console.log('Master Produk    :', masterData.length, 'item');
console.log('Batch Repack     :', repackData.length, 'batch');
console.log('Lembar Bulan     :', Object.keys(transactionData).join(', '));

let totalTrx = 0;
for (let k in transactionData) {
    totalTrx += transactionData[k].length;
    console.log(` - ${k.padEnd(10)}: ${transactionData[k].length} transaksi`);
}
console.log('Total Transaksi  :', totalTrx, 'transaksi');
console.log('==================================================');
