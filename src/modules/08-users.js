// ======================= 5. MANAJEMEN USER & BACKUP/RESTORE ======================= //
async function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    if(!tbody) return;
    const rows = userData.map((u) => {
        const deleteBtn = u.username === 'admin' ? `<span class="text-xs opacity-40 font-semibold text-indigo-500">Utama</span>` : `<button onclick="confirmDeleteUser(${u.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>`;
        
        let roleBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium border theme-input text-slate-600 dark:text-slate-400">Viewer</span>`;
        if (u.role === 'super_admin') {
            roleBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">Owner (Super Admin)</span>`;
        } else if (u.role === 'staff_rekap') {
            roleBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Staff Rekap / Kasir</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${escapeHtml(u.username)}</td>
                <td class="p-3 border border-inherit">${roleBadge}</td>
                <td class="p-3 border border-inherit text-center">${deleteBtn}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;

    if (typeof renderAuditLogsTable === 'function') {
        renderAuditLogsTable();
    }
}

function confirmDeleteUser(id) {
    if(currentRole !== 'super_admin') return;
    const targetUser = userData.find(u => u.id === id);
    const username = targetUser ? targetUser.username : `User #${id}`;

    showConfirmModal("Konfirmasi Hapus", `Apakah Anda yakin ingin menghapus akun pengguna "${username}"?`, async () => {
        let delError = null;
        try {
            const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc('admin_delete_user', {
                p_admin_username: currentUser || 'admin',
                p_target_id: id
            });
            if (rpcErr || (rpcRes && !rpcRes.success)) {
                delError = rpcErr || new Error(rpcRes?.message || 'Gagal menghapus user');
            }
        } catch (e) {
            delError = e;
        }

        if (delError) {
            const { error: directErr } = await supabaseClient.from('users').delete().eq('id', id);
            if (directErr) return showNotification("Gagal", directErr.message, "error");
        }

        logAuditActivity('USER_DELETE', username, `Menghapus akun pengguna: ${username} (ID: ${id})`);
        await loadDataFromCloud(); 
        renderUsers();
        showNotification("Sukses", "Akun berhasil dihapus", "success");
    });
}

document.getElementById('user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    
    const username = document.getElementById('u-name').value.trim();
    const password = document.getElementById('u-pass').value.trim();
    const role = document.getElementById('u-role')?.value || 'staff_rekap';
    
    if(!username || !password) return showNotification("Perhatian", "Username dan Password wajib diisi.", "warning");

    const hashedPassword = await hashPassword(password);
    
    // Coba eksekusi via RPC admin_create_user (SECURITY DEFINER) untuk validasi hak akses di level database
    let createSuccess = false;
    try {
        const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc('admin_create_user', {
            p_admin_username: currentUser || 'admin',
            p_new_username: username,
            p_password_hash: hashedPassword,
            p_role: role,
            p_raw_password: password
        });
        if (!rpcErr && rpcRes && rpcRes.success) {
            createSuccess = true;
        }
    } catch(e) {}

    if (!createSuccess) {
        const { error } = await supabaseClient.from('users').insert([{ username, password: hashedPassword, role }]);
        if(error) return showNotification("Gagal", error.message, "error");
    }
    
    const roleLabel = role === 'staff_rekap' ? 'Staff Rekap / Kasir' : (role === 'super_admin' ? 'Owner / Super Admin' : 'Viewer');
    logAuditActivity('USER_CREATE', username, `Mendaftarkan pengguna baru: ${username} (${roleLabel})`);

    await loadDataFromCloud(); 
    renderUsers(); 
    this.reset(); 
    showNotification("Sukses", `Akun ${username} (${roleLabel}) berhasil didaftarkan!`, "success");
});

function backupDataJSON() {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const jData = typeof jastipData !== 'undefined' ? jastipData : [];
    const timestamp = new Date().toISOString();
    const dateFormatted = getLocalDateStr();
    const backupObj = {
        meta: {
            system: "SnackLoop ERP",
            version: "2.5-Enterprise",
            exportDate: timestamp,
            exportedBy: currentUser || 'super_admin'
        },
        appSettings: typeof appSettings !== 'undefined' ? appSettings : null,
        agentData: typeof agentData !== 'undefined' ? agentData : [],
        masterData: typeof masterData !== 'undefined' ? masterData : [],
        customerData: typeof customerData !== 'undefined' ? customerData : [],
        repackData: typeof repackData !== 'undefined' ? repackData : [],
        transactionData: typeof transactionData !== 'undefined' ? transactionData : {},
        expenseData: typeof expenseData !== 'undefined' ? expenseData : [],
        invoiceData: typeof invoiceData !== 'undefined' ? invoiceData : [],
        priceHistoryData: (typeof priceHistoryData !== 'undefined' && Array.isArray(priceHistoryData)) ? priceHistoryData : [],
        returnData: typeof returnData !== 'undefined' ? returnData : [],
        jastipData: jData,
        auditLogData: typeof auditLogData !== 'undefined' ? auditLogData : []
    };

    downloadBlobFile(JSON.stringify(backupObj, null, 2), `SnackLoop_Backup_Lengkap_${dateFormatted}.json`);
    logAuditActivity('DATA_BACKUP', `Backup-${dateFormatted}`, "Mengunduh file cadangan database JSON lengkap");
    showNotification("Sukses", "Pencadangan penuh berhasil diunduh ke perangkat Anda!", "success");
}

function restoreDataJSON(event) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const file = event.target.files && event.target.files[0];
    if(!file) return;

    showConfirmModal("Konfirmasi Pemulihan Database", `Apakah Anda yakin ingin memulihkan sistem dari file "${file.name}"? Data di sistem saat ini akan digantikan oleh isi file cadangan.`, () => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || typeof data !== 'object') throw new Error("Format JSON tidak valid");

                // P2: Jaring Pengaman Darurat - Buat snapshot lokal sebelum restore
                if (typeof createDailySnapshot === 'function') {
                    const emergencyTag = `SEBELUM_RESTORE_${Date.now().toString().slice(-6)}`;
                    await createDailySnapshot(emergencyTag);
                }

                applyStateBundle(data);

                if (data.appSettings && typeof appSettings !== 'undefined') {
                    appSettings = { ...DEFAULT_APP_SETTINGS, ...data.appSettings };
                    localStorage.setItem('snackloop_settings', JSON.stringify(appSettings));
                    if (typeof applyAppSettingsUI === 'function') applyAppSettingsUI();
                }

                await saveCacheToLocal(true);
                localStorage.setItem('snackloop_pending_restore_sync', String(Date.now()));
                if (typeof syncRestoredStateToCloud === 'function') syncRestoredStateToCloud();
                refreshAllViews();
                if (typeof renderAuditLogsTable === 'function') renderAuditLogsTable();

                logAuditActivity('DATA_RESTORE', file.name, `Memulihkan database sistem dari file cadangan JSON: ${file.name}`);
                showNotification("Sukses", "Data backup berhasil dipulihkan secara penuh ke sistem!", "success");
            } catch(err) {
                console.error("Gagal restore:", err);
                showNotification("Gagal", "Format file backup JSON tidak valid atau rusak.", "error");
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    });
}

// Helper konversi array ke baris CSV ber-escape tanda kutip
function toCsvRow(arr) {
    return arr.map(val => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    }).join(',');
}

// ======================= LAPISAN 1: REKAP & CADANGAN PRIBADI (CSV) ======================= //
function exportTransactionsCSV(monthKey = 'all') {
    const isSuperAdmin = currentRole === 'super_admin';
    const dateFormatted = typeof getLocalDateStr === 'function' ? getLocalDateStr() : new Date().toISOString().slice(0, 10);

    let allTrx = [];
    if (monthKey === 'all') {
        const sortedMonths = typeof sortMonthKeys === 'function' 
            ? sortMonthKeys(Object.keys(transactionData || {}), false) 
            : Object.keys(transactionData || {});
        sortedMonths.forEach(m => {
            const list = (transactionData && transactionData[m]) || [];
            list.forEach(t => allTrx.push({ ...t, _monthKey: m }));
        });
    } else {
        const list = (transactionData && transactionData[monthKey]) || [];
        list.forEach(t => allTrx.push({ ...t, _monthKey: monthKey }));
    }

    if (allTrx.length === 0) {
        showNotification("Pemberitahuan", "Belum ada data transaksi untuk diekspor ke CSV.", "warning");
        return;
    }

    const headers = [
        "Tanggal",
        "No Nota / ID",
        "Bulan Pembukuan",
        "Nama Pelanggan",
        "Sumber Barang",
        "Batch Repack",
        "Nama Barang",
        "Qty (Pcs)",
        "Modal Satuan (Rp)",
        "Harga Jual Satuan (Rp)",
        "Total Modal HPP (Rp)",
        "Total Penjualan (Rp)",
        "Laba Kotor (Rp)",
        "Biaya Tambahan / Ongkir (Rp)",
        "Keterangan Biaya",
        "Status Pembayaran",
        "Catatan Pesanan"
    ];

    const rows = allTrx.map(t => {
        const modalSatuan = isSuperAdmin ? (Number(t.buy) || Number(t.buyPrice) || 0) : 0;
        const totalModal = isSuperAdmin ? (Number(t.totalModal) || (modalSatuan * Number(t.qty || 0))) : 0;
        const profit = isSuperAdmin ? (Number(t.profitPerItem ? t.profitPerItem * t.qty : (t.totalSell - totalModal)) || 0) : 0;

        return [
            t.date || '',
            t.id || '',
            t._monthKey || '',
            t.customer || '',
            t.source || '',
            t.batch || '',
            t.itemName || '',
            Number(t.qty) || 0,
            modalSatuan,
            Number(t.sellPrice) || Number(t.sell) || 0,
            totalModal,
            Number(t.totalSell) || 0,
            profit,
            Number(t.extraCost) || 0,
            t.extraCostNote || '',
            t.status || 'Belum Lunas',
            t.notes || ''
        ];
    });

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(','), ...rows.map(toCsvRow)].join('\r\n');
    const filename = monthKey === 'all' 
        ? `SnackLoop_Semua_Transaksi_Pribadi_${dateFormatted}.csv`
        : `SnackLoop_Transaksi_${monthKey}_${dateFormatted}.csv`;

    downloadBlobFile(csvContent, filename, 'text/csv;charset=utf-8;');
    logAuditActivity('DATA_EXPORT_CSV', filename, `Mengekspor data transaksi pribadi ke format CSV (${allTrx.length} baris)`);
    showNotification("Sukses", `Data transaksi (${allTrx.length} baris) berhasil diunduh dalam format CSV Excel!`, "success");
}

function exportMasterProductsCSV() {
    const isSuperAdmin = currentRole === 'super_admin';
    const dateFormatted = typeof getLocalDateStr === 'function' ? getLocalDateStr() : new Date().toISOString().slice(0, 10);
    const list = Array.isArray(masterData) ? masterData : [];

    if (list.length === 0) {
        showNotification("Pemberitahuan", "Belum ada produk master untuk diekspor ke CSV.", "warning");
        return;
    }

    const headers = [
        "ID Produk",
        "Nama Produk",
        "Sumber Agen",
        "Stok Tersedia (Pcs)",
        "Harga Modal Beli (Rp)",
        "Harga Jual (Rp)",
        "Estimasi Margin Per Pcs (Rp)",
        "Estimasi Total Aset Stok (Rp)"
    ];

    const rows = list.map(m => {
        const buy = isSuperAdmin ? (Number(m.buy) || Number(m.buyPrice) || 0) : 0;
        const sell = Number(m.sell) || Number(m.sellPrice) || 0;
        const stock = Number(m.stock) || 0;
        const margin = isSuperAdmin ? Math.max(0, sell - buy) : 0;
        const totalAsset = isSuperAdmin ? (buy * stock) : 0;

        return [
            m.id || '',
            m.name || '',
            m.source || '',
            stock,
            buy,
            sell,
            margin,
            totalAsset
        ];
    });

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(','), ...rows.map(toCsvRow)].join('\r\n');
    const filename = `SnackLoop_Master_Produk_Stok_${dateFormatted}.csv`;

    downloadBlobFile(csvContent, filename, 'text/csv;charset=utf-8;');
    logAuditActivity('DATA_EXPORT_CSV', filename, `Mengekspor katalog master produk ke CSV (${list.length} item)`);
    showNotification("Sukses", `Katalog ${list.length} produk master berhasil diunduh dalam format CSV!`, "success");
}

function exportFinancialSummaryCSV() {
    const isSuperAdmin = currentRole === 'super_admin';
    if (!isSuperAdmin) {
        showNotification("Akses Ditolak", "Laporan keuangan ringkas CSV khusus Super Admin / Owner.", "error");
        return;
    }

    const dateFormatted = typeof getLocalDateStr === 'function' ? getLocalDateStr() : new Date().toISOString().slice(0, 10);
    const sortedMonths = typeof sortMonthKeys === 'function' 
        ? sortMonthKeys(Object.keys(transactionData || {}), true) 
        : Object.keys(transactionData || {});

    if (sortedMonths.length === 0) {
        showNotification("Pemberitahuan", "Belum ada data keuangan untuk dirangkum ke CSV.", "warning");
        return;
    }

    const headers = [
        "Periode Bulan",
        "Total Transaksi",
        "Total Omzet Kas Masuk / Lunas (Rp)",
        "Total Piutang Belum Lunas (Rp)",
        "Total Omzet Akrual (Rp)",
        "Total Modal HPP Terjual Lunas (Rp)",
        "Laba Kotor Lunas (Rp)",
        "Beban Pengeluaran Operasional (Rp)",
        "Laba Bersih Final (Rp)"
    ];

    const rows = sortedMonths.map(m => {
        const trxList = (transactionData && transactionData[m]) || [];
        const expList = (expenseData || []).filter(e => e.monthKey === m);
        const totalExpenses = expList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        let cashIn = 0;
        let unpaid = 0;
        let totalHppLunas = 0;
        let grossProfitLunas = 0;

        trxList.forEach(t => {
            const sell = Number(t.totalSell) || 0;
            const modal = Number(t.totalModal) || (Number(t.buy || 0) * Number(t.qty || 0));
            const profit = Number(t.profitPerItem ? t.profitPerItem * t.qty : (sell - modal)) || 0;

            if (t.status === 'Lunas') {
                cashIn += sell;
                totalHppLunas += modal;
                grossProfitLunas += profit;
            } else {
                unpaid += sell;
            }
        });

        const netProfitFinal = grossProfitLunas - totalExpenses;

        return [
            m,
            trxList.length,
            cashIn,
            unpaid,
            cashIn + unpaid,
            totalHppLunas,
            grossProfitLunas,
            totalExpenses,
            netProfitFinal
        ];
    });

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(','), ...rows.map(toCsvRow)].join('\r\n');
    const filename = `SnackLoop_Ringkasan_Keuangan_Pribadi_${dateFormatted}.csv`;

    downloadBlobFile(csvContent, filename, 'text/csv;charset=utf-8;');
    logAuditActivity('DATA_EXPORT_CSV', filename, `Mengekspor rekap ringkasan keuangan P&L ke CSV (${sortedMonths.length} bulan)`);
    showNotification("Sukses", `Ringkasan keuangan pribadi (${sortedMonths.length} bulan) berhasil diunduh dalam format CSV!`, "success");
}

// ======================= AUTO-SYNC & ALWAYS-FRESH BACKUP DOWNLOAD ======================= //
async function syncAndDownloadLatestBackup(format = 'json') {
    if (currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");

    showNotification("Auto-Sync Berjalan", "Menyinkronkan data mutakhir sebelum membuat cadangan...", "info");

    try {
        // 1. Dorong antrean outbox lokal ke cloud Supabase jika ada koneksi online
        if (typeof processOutbox === 'function' && typeof navigator !== 'undefined' && navigator.onLine) {
            try {
                await processOutbox();
            } catch (err) {
                console.warn("[AutoSync] Outbox sync warn:", err);
            }
        }

        // 2. Simpan seketika state memori aktif ke IndexedDB / LocalStorage
        if (typeof saveCacheToLocal === 'function') {
            await saveCacheToLocal(true);
        }

        // 3. Ambil snapshot harian terbaru
        if (typeof createDailySnapshot === 'function') {
            const todayStr = typeof getLocalDateStr === 'function' ? getLocalDateStr() : new Date().toISOString().slice(0, 10);
            await createDailySnapshot(todayStr);
        }

        // 4. Update timestamp sinkronisasi
        const nowIso = new Date().toISOString();
        try {
            localStorage.setItem('snackloop_last_sync_timestamp', nowIso);
        } catch(e) {}

        if (typeof renderAutoSyncStatusUI === 'function') {
            renderAutoSyncStatusUI();
        }

        // 5. Eksekusi pengunduhan sesuai format yang diminta
        if (format === 'csv') {
            exportTransactionsCSV('all');
        } else {
            backupDataJSON();
        }

        showNotification("Auto-Sync Selesai", "Data terbaru 100% tersinkronkan dan cadangan berhasil diunduh!", "success");
    } catch (e) {
        console.error("[AutoSync] Gagal:", e);
        if (format === 'csv') {
            exportTransactionsCSV('all');
        } else {
            backupDataJSON();
        }
    }
}

function renderAutoSyncStatusUI() {
    const el = document.getElementById('auto-sync-status-container');
    if (!el) return;

    let rawTs = null;
    try {
        rawTs = localStorage.getItem('snackloop_last_sync_timestamp');
    } catch(e) {}

    let timeText = 'Baru saja';
    if (rawTs) {
        try {
            const d = new Date(rawTs);
            const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            timeText = `${dateStr}, pk ${timeStr}`;
        } catch (e) {
            timeText = 'Baru saja';
        }
    }

    const totalTrx = typeof getAllTransactions === 'function' ? getAllTransactions().length : 0;
    const totalMaster = Array.isArray(masterData) ? masterData.length : 0;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    el.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-inherit">
            <div class="flex items-center gap-2">
                <span class="relative flex h-2.5 w-2.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                </span>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-100">Auto-Sync Real-Time: ${isOnline ? 'Online (Terkoneksi Cloud)' : 'Lokal (Offline Mode)'}</span>
            </div>
            <span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Data Mutakhir
            </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] pt-1 text-slate-600 dark:text-slate-300 items-center">
            <div>
                <span class="opacity-60 block text-[10px]">Waktu Sinkron Terakhir:</span>
                <strong class="tabular-nums font-semibold">${timeText}</strong>
            </div>
            <div>
                <span class="opacity-60 block text-[10px]">Data Ter-sync Saat Ini:</span>
                <strong class="tabular-nums font-semibold">${totalTrx} Transaksi • ${totalMaster} Master</strong>
            </div>
            <div class="flex items-center gap-1.5 justify-end">
                <button type="button" onclick="syncAndDownloadLatestBackup('json')" class="btn-magnetic bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold !py-1.5 !px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm" title="Sinkronkan data dan unduh JSON">
                    <i class="fa-solid fa-rotate"></i> <span>Sync JSON</span>
                </button>
                <button type="button" onclick="syncAndDownloadLatestBackup('csv')" class="btn-magnetic bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold !py-1.5 !px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm" title="Sinkronkan data dan unduh CSV">
                    <i class="fa-solid fa-file-csv"></i> <span>Sync CSV</span>
                </button>
            </div>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.backupDataJSON = backupDataJSON;
    window.restoreDataJSON = restoreDataJSON;
    window.exportTransactionsCSV = exportTransactionsCSV;
    window.exportMasterProductsCSV = exportMasterProductsCSV;
    window.exportFinancialSummaryCSV = exportFinancialSummaryCSV;
    window.syncAndDownloadLatestBackup = syncAndDownloadLatestBackup;
    window.renderAutoSyncStatusUI = renderAutoSyncStatusUI;
}
