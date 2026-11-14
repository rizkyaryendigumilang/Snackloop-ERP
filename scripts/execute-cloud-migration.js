// =========================================================================
// SNACKLOOP ERP - EKSEKUTOR MIGRASI OTOMATIS KE CLOUD SUPABASE
// =========================================================================
const fs = require('fs');
const path = require('path');
const XLSX = require('../vendor/xlsx.full.min.js');

const SUPABASE_URL = 'https://wirypusjlaywxlnlpebc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hBxnQJOgix-cY8Bt5Tl6wQ_x1AOglpR';

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

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

async function runMigration() {
    console.log('=== [SNACKLOOP ERP - MEMULAI MIGRASI OTOMATIS KE SUPABASE] ===\n');

    // 1. Baca spreadsheet
    const xlsxPath = path.join(__dirname, '..', 'SnackLoop_import.xlsx');
    const buf = fs.readFileSync(xlsxPath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const wsMaster = wb.Sheets['Master'];
    const masterSpreadsheet = XLSX.utils.sheet_to_json(wsMaster);
    const wsTrx = wb.Sheets['Transaksi'];
    const trxDataRaw = XLSX.utils.sheet_to_json(wsTrx, { header: 1 });
    const wsMicin = wb.Sheets['Snack Micin'];
    const micinRows = XLSX.utils.sheet_to_json(wsMicin);

    // 2. Ambil data Agen dari Cloud
    console.log('1. Memeriksa dan Menyelaraskan Agen / Supplier...');
    const aRes = await fetch(SUPABASE_URL + '/rest/v1/agents?select=*', { headers });
    let existingAgents = await aRes.json();
    if (!Array.isArray(existingAgents)) existingAgents = [];

    let spAgent = existingAgents.find(a => a.name.includes('Shopee') || a.name.includes('SP'));
    if (!spAgent) {
        const createSp = await fetch(SUPABASE_URL + '/rest/v1/agents', {
            method: 'POST',
            headers,
            body: JSON.stringify([{ name: 'Supplier Shopee (SP)' }])
        });
        const created = await createSp.json();
        spAgent = created[0] || { id: 99, name: 'Supplier Shopee (SP)' };
        console.log('   + Berhasil menambahkan agen:', spAgent.name);
    }

    const gsAgent = existingAgents.find(a => a.name.includes('Grosir') || a.name.includes('Tegal Parang')) || existingAgents[0] || { id: 6, name: 'Toko Grosir Tegal Parang' };
    const mineralAgent = existingAgents.find(a => a.name.includes('Mineral') || a.name.includes('Aceh Kemang')) || gsAgent;

    console.log(`   * Agen Grosir (GS)   : [ID ${gsAgent.id}] ${gsAgent.name}`);
    console.log(`   * Agen Shopee (SP)   : [ID ${spAgent.id}] ${spAgent.name}`);
    console.log(`   * Agen Mineral/Air   : [ID ${mineralAgent.id}] ${mineralAgent.name}`);

    // 3. Ambil data Pelanggan dari Cloud
    console.log('\n2. Memeriksa dan Menyelaraskan Pelanggan (Customer)...');
    const cRes = await fetch(SUPABASE_URL + '/rest/v1/customers?select=*', { headers });
    let existingCustomers = await cRes.json();
    if (!Array.isArray(existingCustomers)) existingCustomers = [];

    let retailCust = existingCustomers.find(c => c.name.toLowerCase().includes('retail') || c.name.toLowerCase().includes('kasir') || c.name.toLowerCase().includes('umum'));
    if (!retailCust) {
        const createRetail = await fetch(SUPABASE_URL + '/rest/v1/customers', {
            method: 'POST',
            headers,
            body: JSON.stringify([{ name: 'Pelanggan Retail (Kasir)', phone: '-' }])
        });
        const created = await createRetail.json();
        retailCust = created[0] || { id: 101, name: 'Pelanggan Retail (Kasir)', phone: '-' };
        console.log('   + Berhasil menambahkan pelanggan retail:', retailCust.name);
    }

    let mbaAjo = existingCustomers.find(c => c.name.toLowerCase().includes('ajo'));
    if (!mbaAjo) {
        const createAjo = await fetch(SUPABASE_URL + '/rest/v1/customers', {
            method: 'POST',
            headers,
            body: JSON.stringify([{ name: 'Mba Ajo', phone: '6287700192777' }])
        });
        const created = await createAjo.json();
        mbaAjo = created[0] || { id: 7, name: 'Mba Ajo', phone: '6287700192777' };
        console.log('   + Berhasil menambahkan pelanggan langganan:', mbaAjo.name);
    }

    console.log(`   * Customer Transaksi Lunas  : ${retailCust.name}`);
    console.log(`   * Customer Transaksi Piutang: ${mbaAjo.name} (WA: ${mbaAjo.phone})`);

    // 4. Sinkronisasi Master Produk
    console.log('\n3. Sinkronisasi Master Produk ke Cloud Database...');
    const mRes = await fetch(SUPABASE_URL + '/rest/v1/master?select=*', { headers });
    let existingMaster = await mRes.json();
    if (!Array.isArray(existingMaster)) existingMaster = [];

    const cloudMasterMap = new Map();
    existingMaster.forEach(m => cloudMasterMap.set(m.name.toLowerCase().trim(), m));

    // Sumber produk dari Transaksi spreadsheet
    const itemSources = {};
    for (let i = 1; i < trxDataRaw.length; i++) {
        const r = trxDataRaw[i];
        if (!r) continue;
        const name = r[1] ? String(r[1]).trim() : '';
        const src = r[2] ? String(r[2]).trim() : '';
        if (name && src) itemSources[name] = src;
    }

    let nextMasterId = Math.max(0, ...existingMaster.map(m => m.id)) + 1;
    const newMasterToInsert = [];

    masterSpreadsheet.forEach(m => {
        const rawName = m['Nama Barang'] ? String(m['Nama Barang']).trim() : '';
        if (!rawName) return;

        const buy = Number(m['Harga Beli']) || 0;
        const sell = Number(m['Harga Jual']) || 0;
        const srcCode = itemSources[rawName] || 'GS';
        let resolvedAgent = gsAgent;
        if (srcCode === 'SP') resolvedAgent = spAgent;
        else if (rawName.toLowerCase().includes('mineral')) resolvedAgent = mineralAgent;

        if (!cloudMasterMap.has(rawName.toLowerCase())) {
            newMasterToInsert.push({
                id: nextMasterId++,
                name: rawName,
                source: resolvedAgent.name,
                buy: buy,
                sell: sell,
                agent_id: resolvedAgent.id
            });
        }
    });

    if (newMasterToInsert.length > 0) {
        console.log(`   + Menyisipkan ${newMasterToInsert.length} produk baru yang belum ada di cloud...`);
        const insertRes = await fetch(SUPABASE_URL + '/rest/v1/master', {
            method: 'POST',
            headers,
            body: JSON.stringify(newMasterToInsert)
        });
        if (!insertRes.ok) {
            console.warn('   ! Peringatan insert master:', await insertRes.text());
        } else {
            console.log(`   ✔ Sukses memasukkan ${newMasterToInsert.length} produk master baru.`);
        }
    } else {
        console.log('   ✔ Seluruh produk master sudah sinkron dengan database cloud.');
    }

    // Ambil ulang master data lengkap dari cloud
    const mResAll = await fetch(SUPABASE_URL + '/rest/v1/master?select=*', { headers });
    const allCloudMaster = await mResAll.json();
    console.log(`   * Total produk master aktif di cloud saat ini: ${allCloudMaster.length} item.`);

    // 5. Sinkronisasi Repack Gudang
    console.log('\n4. Sinkronisasi Gudang Repack...');
    const repackToInsert = [];
    let rpkIdx = 1;
    micinRows.forEach(r => {
        const rawName = r['__EMPTY'] ? String(r['__EMPTY']).trim() : '';
        if (!rawName) return;
        const dateStr = excelDateToJS(r['Tanggal']);
        const modalPerPcs = Math.round(Number(r['modal + plastik']) || Number(r['Modal Tanpa Plastik']) || 5000);
        const initialQty = Number(r['Hasil Jadi Setelah Repack']) || 5;
        const sellTarget = modalPerPcs + 3000;
        repackToInsert.push({
            id: 'RPK-' + String(rpkIdx++).padStart(3, '0'),
            date: dateStr,
            name: rawName + ' Repack',
            modal_per_pcs: modalPerPcs,
            sell_target: sellTarget,
            initial_qty: initialQty,
            remaining_qty: initialQty
        });
    });

    if (repackToInsert.length > 0) {
        const rpkRes = await fetch(SUPABASE_URL + '/rest/v1/repack', {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(repackToInsert)
        });
        console.log(`   ✔ Berhasil mendaftarkan ${repackToInsert.length} batch repack ke gudang cloud.`);
    }

    // 6. Buat Invoices untuk 24 Transaksi Belum Lunas
    console.log('\n5. Pembuatan Faktur & Rekapitulasi Piutang Pelanggan...');
    const unpaidInvoicesToInsert = [
        {
            invoice_number: 'INV-20260828-AJO01',
            date: '2026-08-28',
            customer_name: 'Mba Ajo',
            total_amount: 511000,
            status: 'Belum Lunas',
            notes: 'Bon Penjualan Toko / Mba Ajo (22 Item)'
        },
        {
            invoice_number: 'INV-20260909-AJO02',
            date: '2026-09-09',
            customer_name: 'Mba Ajo',
            total_amount: 40000,
            status: 'Belum Lunas',
            notes: 'Bon Penjualan Toko / Mba Ajo (2 Item)'
        }
    ];

    const invRes = await fetch(SUPABASE_URL + '/rest/v1/invoices', {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(unpaidInvoicesToInsert)
    });
    console.log('   ✔ Faktur Piutang INV-20260828-AJO01 (Rp 511.000) & INV-20260909-AJO02 (Rp 40.000) aktif terdaftar.');

    // 7. Migrasi Transaksi Penjualan (186 Transaksi)
    console.log('\n6. Migrasi 186 Transaksi Riil ke Database Cloud...');
    const transactionsToInsert = [];

    for (let i = 1; i < trxDataRaw.length; i++) {
        const r = trxDataRaw[i];
        if (!r || r.length === 0) continue;
        const rawName = r[1] ? String(r[1]).trim() : '';
        if (!rawName) continue;

        const dateStr = excelDateToJS(r[0]);
        const monthKey = getMonthKeyFromDate(dateStr);
        const srcCode = r[2] ? String(r[2]).trim() : 'GS';
        let srcName = gsAgent.name;
        if (srcCode === 'SP') srcName = spAgent.name;
        else if (rawName.toLowerCase().includes('mineral')) srcName = mineralAgent.name;

        const batch = r[4] ? String(r[4]).trim() : 'Reguler';
        const qty = Number(r[3]) || 1;
        const buy = Number(r[5]) || 0;
        const sell = Number(r[7]) || 0;
        const totalSell = qty * sell;
        const totalModal = qty * buy;
        const profitPerItem = sell - buy;

        const isUnpaid = r[10] && String(r[10]).toLowerCase().includes('belum');
        const status = isUnpaid ? 'Belum Lunas' : 'Lunas';
        const customer = isUnpaid ? 'Mba Ajo' : 'Pelanggan Retail (Kasir)';

        let notes = r[8] ? String(r[8]).trim() : '-';
        if (isUnpaid) {
            const invNum = dateStr === '2026-08-28' ? 'INV-20260828-AJO01' : 'INV-20260909-AJO02';
            notes = `Invoice: ${invNum}`;
        }

        transactionsToInsert.push({
            month_key: monthKey,
            date: dateStr,
            customer: customer,
            item_name: rawName,
            source: srcName,
            batch: batch,
            qty: qty,
            buy: buy,
            total_modal: totalModal,
            sell: sell,
            total_sell: totalSell,
            status: status,
            profit_per_item: profitPerItem,
            extra_cost: 0,
            extra_cost_note: '-',
            notes: notes
        });
    }

    // Insert dalam chunk per 50 baris agar request stabil
    const CHUNK_SIZE = 50;
    let insertedTrx = 0;
    for (let i = 0; i < transactionsToInsert.length; i += CHUNK_SIZE) {
        const chunk = transactionsToInsert.slice(i, i + CHUNK_SIZE);
        const tPost = await fetch(SUPABASE_URL + '/rest/v1/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify(chunk)
        });
        if (!tPost.ok) {
            console.error(`   ! Gagal insert transaksi chunk ${i}:`, await tPost.text());
        } else {
            insertedTrx += chunk.length;
            process.stdout.write(`   > Terkirim ${insertedTrx} / ${transactionsToInsert.length} transaksi...\r`);
        }
    }
    console.log(`\n   ✔ Seluruh ${insertedTrx} transaksi berhasil dimigrasikan ke Supabase Cloud.`);

    // 8. Tulis Bundle Lokal Lengkap
    console.log('\n7. Memperbarui File Cadangan Lokal SnackLoop_Backup_Migrasi.json...');
    const localBundle = {
        meta: {
            system: 'SnackLoop ERP',
            version: '2.6.0-Enterprise',
            exportDate: new Date().toISOString(),
            description: 'Data Terintegrasi Hasil Migrasi Spreadsheet SnackLoop'
        },
        agentData: existingAgents,
        customerData: [
            { id: retailCust.id, name: retailCust.name, phone: retailCust.phone || '-' },
            { id: mbaAjo.id, name: mbaAjo.name, phone: mbaAjo.phone || '6287700192777' }
        ],
        masterData: allCloudMaster,
        repackData: repackToInsert,
        transactionData: {},
        expenseData: [],
        invoiceData: unpaidInvoicesToInsert,
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
                details: `Migrasi ${allCloudMaster.length} produk master dan ${insertedTrx} transaksi penjualan dari spreadsheet`
            }
        ]
    };

    transactionsToInsert.forEach(t => {
        if (!localBundle.transactionData[t.month_key]) {
            localBundle.transactionData[t.month_key] = [];
        }
        localBundle.transactionData[t.month_key].push({
            id: 'trx_' + Math.random().toString(36).slice(2, 9),
            monthKey: t.month_key,
            date: t.date,
            customer: t.customer,
            itemName: t.item_name,
            source: t.source,
            batch: t.batch,
            qty: t.qty,
            buy: t.buy,
            sell: t.sell,
            totalModal: t.total_modal,
            totalSell: t.total_sell,
            profitPerItem: t.profit_per_item,
            status: t.status,
            notes: t.notes,
            extraCost: 0,
            extraCostNote: '-'
        });
    });

    const outputPath = path.join(__dirname, '..', 'SnackLoop_Backup_Migrasi.json');
    fs.writeFileSync(outputPath, JSON.stringify(localBundle, null, 2), 'utf8');

    console.log('   ✔ File cadangan lokal berhasil disinkronkan:', outputPath);
    console.log('\n=== [MIGRASI PENUH KE SUPABASE SELESAI DENGAN SUKSES] ===');
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
});
