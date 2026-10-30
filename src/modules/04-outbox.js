// ======================= MODERN INDEXEDDB STORAGE & AUDIT TRAIL ENGINE ======================= //
const DB_NAME = 'snackloop_erp_db';
const DB_VERSION = 1;
let dbPromise = null;

function getIndexedDB() {
    if (!window.indexedDB) return null;
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('keyval')) {
                    db.createObjectStore('keyval');
                }
                if (!db.objectStoreNames.contains('audit_logs')) {
                    const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('action', 'action', { unique: false });
                    auditStore.createIndex('user', 'user', { unique: false });
                }
                if (!db.objectStoreNames.contains('snapshots')) {
                    db.createObjectStore('snapshots', { keyPath: 'date' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => {
                console.warn("[IndexedDB] Gagal membuka database:", e);
                resolve(null);
            };
        } catch(err) {
            console.warn("[IndexedDB] Exception membuka database:", err);
            resolve(null);
        }
    });

    return dbPromise;
}

async function idbGet(key) {
    const db = await getIndexedDB();
    if (!db) {
        try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction('keyval', 'readonly');
            const store = tx.objectStore('keyval');
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
            req.onerror = () => resolve(null);
        } catch(e) {
            resolve(null);
        }
    });
}

async function idbSet(key, val) {
    const db = await getIndexedDB();
    if (!db) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
        return true;
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction('keyval', 'readwrite');
            const store = tx.objectStore('keyval');
            store.put(val, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch(e) {
            resolve(false);
        }
    });
}

// ----------------- AUDIT TRAIL LOGGING & STORAGE ----------------- //
async function idbAddAuditLog(logEntry) {
    const db = await getIndexedDB();
    if (!db) {
        try {
            const list = JSON.parse(localStorage.getItem('snackloop_audit_logs') || '[]');
            list.unshift(logEntry);
            if (list.length > 200) list.pop();
            localStorage.setItem('snackloop_audit_logs', JSON.stringify(list));
        } catch(e) {}
        return true;
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction('audit_logs', 'readwrite');
            const store = tx.objectStore('audit_logs');
            store.put(logEntry);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch(e) {
            resolve(false);
        }
    });
}

async function idbGetAuditLogs(limit = 300) {
    const db = await getIndexedDB();
    if (!db) {
        try { return JSON.parse(localStorage.getItem('snackloop_audit_logs') || '[]'); } catch(e) { return []; }
    }
    return new Promise((resolve) => {
        try {
            const tx = db.transaction('audit_logs', 'readonly');
            const store = tx.objectStore('audit_logs');
            const req = store.openCursor(null, 'prev');
            const logs = [];
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && logs.length < limit) {
                    logs.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(logs);
                }
            };
            req.onerror = () => resolve([]);
        } catch(e) {
            resolve([]);
        }
    });
}

async function logAuditActivity(action, target, details, prevVal = null, newVal = null) {
    const now = new Date();
    const logItem = {
        id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: now.toISOString(),
        displayTime: now.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }),
        user: currentUser || 'system',
        role: currentRole || 'operator',
        action: action,
        target: String(target || '-'),
        details: String(details || ''),
        prevVal: prevVal,
        newVal: newVal
    };

    auditLogData.unshift(logItem);
    if (auditLogData.length > 500) auditLogData.pop();

    await idbAddAuditLog(logItem);

    // Kirim mutasi jika online (graceful catch jika Supabase audit_logs belum dibuat)
    dispatchOutboxMutation('audit_logs', 'insert', {
        id: logItem.id,
        timestamp: logItem.timestamp,
        operator_user: logItem.user,
        operator_role: logItem.role,
        action: logItem.action,
        target_ref: logItem.target,
        description: logItem.details
    });

    if (typeof renderAuditLogsTable === 'function') {
        renderAuditLogsTable();
    }
}

// ----------------- SNAPSHOT ENGINE (DISASTER RECOVERY) ----------------- //
async function checkAndCreateDailySnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    const lastSnapDate = localStorage.getItem('snackloop_last_snapshot_date');
    if (lastSnapDate === today) return;

    await createDailySnapshot(today);
}

async function createDailySnapshot(dateKey = null) {
    const key = dateKey || new Date().toISOString().slice(0, 10);
    try {
        const jData = typeof jastipData !== 'undefined' ? jastipData : [];
        const snapshotPayload = {
            date: key,
            createdAt: new Date().toISOString(),
            displayDate: new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
            itemCount: Object.values(transactionData).reduce((acc, curr) => acc + (curr ? curr.length : 0), 0),
            data: { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData, returnData, userData, jastipData: jData }
        };

        const db = await getIndexedDB();
        if (db) {
            const tx = db.transaction('snapshots', 'readwrite');
            const store = tx.objectStore('snapshots');
            store.put(snapshotPayload);
            tx.oncomplete = () => {
                localStorage.setItem('snackloop_last_snapshot_date', key);
                pruneOldSnapshots(db);
                if (typeof renderSnapshotListUI === 'function') renderSnapshotListUI();
            };
        }
    } catch(e) {
        console.warn("[Snapshot] Warning:", e);
    }
}

async function pruneOldSnapshots(db) {
    try {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        const req = store.getAllKeys();
        req.onsuccess = () => {
            const keys = req.result || [];
            if (keys.length > 7) {
                keys.sort();
                const toDelete = keys.slice(0, keys.length - 7);
                toDelete.forEach(k => store.delete(k));
            }
        };
    } catch(e) {}
}

async function listDailySnapshots() {
    const db = await getIndexedDB();
    if (!db) return [];
    return new Promise((resolve) => {
        try {
            const tx = db.transaction('snapshots', 'readonly');
            const store = tx.objectStore('snapshots');
            const req = store.getAll();
            req.onsuccess = () => {
                const list = req.result || [];
                list.sort((a, b) => (b.date > a.date ? 1 : -1));
                resolve(list);
            };
            req.onerror = () => resolve([]);
        } catch(e) {
            resolve([]);
        }
    });
}

async function restoreDailySnapshot(dateKey) {
    if (currentRole !== 'super_admin') {
        return showNotification("Akses Ditolak", "Hanya Super Admin / Owner yang dapat memulihkan snapshot.", "error");
    }
    if (!confirm(`Pulihkan seluruh database sistem ke snapshot tanggal ${dateKey}? Perubahan setelah tanggal ini akan ditimpa.`)) {
        return;
    }

    const db = await getIndexedDB();
    if (!db) return showNotification("Gagal", "Database IndexedDB tidak tersedia.", "error");

    const tx = db.transaction('snapshots', 'readonly');
    const store = tx.objectStore('snapshots');
    const req = store.get(dateKey);

    req.onsuccess = async () => {
        const snap = req.result;
        if (!snap || !snap.data) {
            return showNotification("Gagal", "Data snapshot tidak ditemukan.", "error");
        }

        const data = snap.data;
        if (data.transactionData) transactionData = data.transactionData;
        if (data.masterData) masterData = data.masterData;
        if (data.customerData) customerData = data.customerData;
        if (data.agentData) agentData = data.agentData;
        if (data.repackData) repackData = data.repackData;
        if (data.expenseData) expenseData = data.expenseData;
        if (data.invoiceData) invoiceData = data.invoiceData;
        if (data.priceHistoryData) priceHistoryData = data.priceHistoryData;
        if (data.returnData) returnData = data.returnData;
        if (data.jastipData && typeof jastipData !== 'undefined') jastipData = data.jastipData;

        await saveCacheToLocal();

        if (typeof renderMonthTabs === 'function') renderMonthTabs();
        if (typeof renderMaster === 'function') renderMaster();
        if (typeof renderCustomer === 'function') renderCustomer();
        if (typeof renderAgents === 'function') renderAgents();
        if (typeof renderRepackWarehouse === 'function') renderRepackWarehouse();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        if (typeof renderReturns === 'function') renderReturns();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderFinancialChart === 'function') renderFinancialChart();
        if (typeof renderTransactionsForActiveSheet === 'function') renderTransactionsForActiveSheet();

        logAuditActivity('DATA_RESTORE', `Snapshot ${dateKey}`, `Memulihkan database dari snapshot otomatis tanggal ${dateKey}`);
        showNotification("Berhasil", `Sistem berhasil dipulihkan ke kondisi snapshot ${dateKey}!`, "success");
    };
}

// ----------------- LOCAL / INDEXEDDB CACHING ----------------- //
function saveCacheToLocal() {
    const jData = typeof jastipData !== 'undefined' ? jastipData : [];
    const cacheObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData, returnData, userData, jastipData: jData };

    // 1. Asinkron ke IndexedDB (Kapasitas Besar & Bebas Quota Limit)
    const p = idbSet('snackloop_cache_v2', cacheObj).catch(err => {
        console.warn("[Storage] idbSet warn:", err);
    });

    // 2. Mirror ringan ke localStorage jika ukuran aman (< 2.5 MB)
    try {
        const jsonStr = JSON.stringify(cacheObj);
        if (jsonStr.length < 2500000) {
            localStorage.setItem('snackloop_cache', jsonStr);
        } else {
            localStorage.removeItem('snackloop_cache');
            localStorage.setItem('snackloop_storage_mode', 'indexeddb');
        }
    } catch(e) {
        localStorage.removeItem('snackloop_cache');
    }

    return p;
}

async function loadCacheFromLocal() {
    let data = null;

    // 1. Baca dari IndexedDB
    try {
        data = await idbGet('snackloop_cache_v2');
    } catch(e) {
        data = null;
    }

    // 2. Migrasi otomatis dari localStorage jika di IndexedDB belum ada
    if (!data) {
        try {
            const cached = localStorage.getItem('snackloop_cache');
            if (cached) {
                data = JSON.parse(cached);
                if (data) {
                    await idbSet('snackloop_cache_v2', data);
                    console.info("[Storage] Migrasi otomatis cache localStorage -> IndexedDB berhasil.");
                }
            }
        } catch(e) {}
    }

    if (data) {
        if (typeof jastipData !== 'undefined' && data.jastipData) {
            jastipData = data.jastipData;
        }
        agentData = data.agentData || [];
        masterData = data.masterData || [];
        customerData = data.customerData || [];
        repackData = data.repackData || [];
        transactionData = data.transactionData || {};
        expenseData = data.expenseData || [];
        invoiceData = data.invoiceData || [];
        priceHistoryData = data.priceHistoryData || [];
        returnData = data.returnData || [];
        userData = data.userData && data.userData.length > 0 ? data.userData : [
            { id: 1, username: 'admin', role: 'super_admin' },
            { id: 2, username: 'staff1', role: 'staff_rekap' },
            { id: 3, username: 'admin_kiky', role: 'super_admin' }
        ];
        if (!userData.some(u => u.username && u.username.toLowerCase() === 'admin_kiky')) {
            userData.push({ id: 3, username: 'admin_kiky', role: 'super_admin' });
        }
    } else {
        userData = [
            { id: 1, username: 'admin', role: 'super_admin' },
            { id: 2, username: 'staff1', role: 'staff_rekap' },
            { id: 3, username: 'admin_kiky', role: 'super_admin' }
        ];
    }

    // Muat riwayat audit logs
    try {
        const logs = await idbGetAuditLogs(300);
        if (logs && Array.isArray(logs) && logs.length > 0) {
            auditLogData = logs;
        }
    } catch(e) {}

    // Jalankan auto snapshot harian di background
    setTimeout(checkAndCreateDailySnapshot, 3000);

    return data;
}

// ======================= OFFLINE OUTBOX & SYNC ENGINE ======================= //
const OUTBOX_KEY = 'snackloop_outbox';

function getOutbox() {
    try {
        return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    } catch(e) {
        return [];
    }
}

function saveOutbox(queue) {
    try {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    } catch(e) {
        console.warn("Gagal menyimpan outbox ke localStorage:", e);
    }
    updateNetworkStatus();
}

function addToOutbox(item) {
    const queue = getOutbox();
    const queuedItem = {
        ...item,
        queueId: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        createdAt: new Date().toISOString()
    };
    queue.push(queuedItem);
    saveOutbox(queue);
    return queuedItem;
}

function updateNetworkStatus() {
    const badgeEl = document.getElementById('sync-status-badge');
    if (!badgeEl) return;

    const outbox = getOutbox();
    const count = outbox.length;
    const online = navigator.onLine;
    const container = document.getElementById('sync-status-container');

    if (isSyncing) {
        badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 shadow-sm cursor-pointer";
        badgeEl.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin text-xs text-indigo-500"></i><span id="sync-status-text" class="hidden">Syncing</span>`;
        if (container) container.setAttribute('title', `Menyinkronkan ${count} data ke database cloud...`);
    } else if (!online) {
        badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm cursor-pointer";
        badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500"></span><span id="sync-status-text" class="hidden">Offline</span>`;
        if (container) container.setAttribute('title', `Status: Offline (${count} data tersimpan lokal)`);
    } else if (count > 0) {
        badgeEl.className = "relative w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-sm cursor-pointer hover:bg-amber-100 transition-colors";
        badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">${count}</span><span id="sync-status-text" class="hidden">Pending</span>`;
        if (container) container.setAttribute('title', `Ada ${count} data tertunda sinkronisasi. Klik untuk kirim.`);
    } else {
        badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-slate-50 text-emerald-700 border-slate-200 dark:bg-slate-900 dark:text-emerald-400 dark:border-slate-800 shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
        badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-600"></span><span id="sync-status-text" class="hidden">Online</span>`;
        if (container) container.setAttribute('title', "Status: Online - Terhubung dengan Database");
    }
}

function handleSyncBadgeClick() {
    const count = getOutbox().length;
    if (!navigator.onLine) {
        showNotification("Mode Offline", count > 0 ? `Ada ${count} data tersimpan lokal di perangkat ini. Otomatis terunggah saat ada sinyal internet.` : "Aplikasi sedang offline. Data lokal aman tersimpan.", "warning");
        return;
    }
    if (count > 0) {
        showNotification("Sinkronisasi", `Memproses ${count} data yang tertunda ke cloud...`, "info");
        syncOutboxQueue();
    } else {
        showNotification("Status Cloud", "Semua data sudah tersinkronisasi penuh dengan database.", "success");
    }
}

async function syncOutboxQueue() {
    if (!navigator.onLine || isSyncing) return;
    const queue = getOutbox();
    if (queue.length === 0) {
        updateNetworkStatus();
        return;
    }

    isSyncing = true;
    updateNetworkStatus();

    let syncedCount = 0;
    const remainingQueue = [];

    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        let success = false;
        try {
            if (item.type === 'INSERT_TRANSACTION') {
                if (item.payload.repackUpdate) {
                    await supabaseClient.from('repack')
                        .update({ remaining_qty: item.payload.repackUpdate.newRemainingQty })
                        .eq('id', item.payload.repackUpdate.batchId);
                }
                const { error: trxErr } = await supabaseClient.from('transactions').insert([item.payload.transaction]);
                if (trxErr) throw trxErr;

                if (item.payload.invoice) {
                    await supabaseClient.from('invoices').insert([item.payload.invoice]);
                }
                success = true;
            } else if (item.type === 'DELETE_TRANSACTION') {
                if (item.payload.source === 'Repack' && item.payload.batch) {
                    const rItem = repackData.find(r => r.id === item.payload.batch);
                    if (rItem) {
                        await supabaseClient.from('repack')
                            .update({ remaining_qty: rItem.remaining_qty })
                            .eq('id', item.payload.batch);
                    }
                }
                const { error } = await supabaseClient.from('transactions').delete().eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'UPDATE_TRANSACTION_STATUS') {
                const { error } = await supabaseClient.from('transactions')
                    .update({ status: item.payload.status })
                    .eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'INSERT_EXPENSE') {
                const { error } = await supabaseClient.from('expenses').insert([item.payload]);
                if (error) throw error;
                success = true;
            } else if (item.type === 'INSERT_REPACK') {
                const { error } = await supabaseClient.from('repack').insert([item.payload]);
                if (error) throw error;
                success = true;
            } else if (item.type === 'DELETE_REPACK') {
                const { error } = await supabaseClient.from('repack').delete().eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'INSERT_CUSTOMER') {
                const { error } = await supabaseClient.from('customers').insert([item.payload]);
                if (error) throw error;
                success = true;
            } else if (item.type === 'DELETE_CUSTOMER') {
                const { error } = await supabaseClient.from('customers').delete().eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'INSERT_AGENT') {
                const { error } = await supabaseClient.from('agents').insert([item.payload]);
                if (error) throw error;
                success = true;
            } else if (item.type === 'DELETE_AGENT') {
                const { error } = await supabaseClient.from('agents').delete().eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'INSERT_MASTER') {
                const { error } = await supabaseClient.from('master').insert([item.payload]);
                if (error) throw error;
                success = true;
            } else if (item.type === 'DELETE_MASTER') {
                const { error } = await supabaseClient.from('master').delete().eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'UPDATE_MASTER') {
                const { error } = await supabaseClient.from('master').update(item.payload.updates).eq('id', item.payload.id);
                if (error) throw error;
                if (item.payload.history) {
                    await supabaseClient.from('price_history').insert([item.payload.history]);
                }
                success = true;
            } else if (item.type === 'DELETE_INVOICE') {
                const { error } = await supabaseClient.from('invoices').delete().eq('id', item.payload.id);
                if (error) throw error;
                success = true;
            } else if (item.type === 'UPDATE_INVOICE_PAID') {
                await supabaseClient.from('invoices').update({ status: 'Lunas' }).eq('id', item.payload.invId);
                if (item.payload.customerName) {
                    await supabaseClient.from('transactions').update({ status: 'Lunas' }).eq('customer', item.payload.customerName);
                }
                success = true;
            } else if (item.type === 'UPSERT_JASTIP') {
                try {
                    const { error } = await supabaseClient.from('jastip_orders').upsert([item.payload]);
                    if (error) console.warn("Supabase jastip_orders note:", error.message);
                } catch (e) {
                    console.warn("Supabase jastip sync skipped:", e);
                }
                success = true;
            } else if (item.type === 'DELETE_JASTIP') {
                try {
                    const { error } = await supabaseClient.from('jastip_orders').delete().eq('id', item.payload.id);
                    if (error) console.warn("Supabase jastip_orders delete note:", error.message);
                } catch (e) {
                    console.warn("Supabase jastip delete skipped:", e);
                }
                success = true;
            }
        } catch (err) {
            console.error("Gagal sinkron item outbox:", item, err);
            success = false;
        }

        if (success) {
            syncedCount++;
        } else {
            remainingQueue.push(item);
            if (!navigator.onLine) {
                for (let k = i + 1; k < queue.length; k++) remainingQueue.push(queue[k]);
                break;
            }
        }
    }

    saveOutbox(remainingQueue);
    isSyncing = false;
    updateNetworkStatus();

    if (syncedCount > 0) {
        showNotification("Sinkronisasi Selesai", `${syncedCount} data offline berhasil diunggah ke cloud!`, "success");
    }
}

async function dispatchMutation(item, asyncOnlineCall) {
    if (navigator.onLine) {
        try {
            await asyncOnlineCall();
        } catch (err) {
            console.warn("Operasi online gagal, menyimpan ke antrean outbox:", err);
            addToOutbox(item);
        }
    } else {
        addToOutbox(item);
    }
}

function dispatchOutboxMutation(table, action, payload) {
    if (navigator.onLine && typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            if (action === 'insert') {
                supabaseClient.from(table).insert([payload]).then(({ error }) => {
                    if (error) console.warn(`[Outbox] Supabase ${table} insert notice:`, error.message);
                }).catch(e => console.warn(e));
            } else if (action === 'update') {
                supabaseClient.from(table).update(payload).eq('id', payload.id).catch(e => console.warn(e));
            } else if (action === 'delete') {
                supabaseClient.from(table).delete().eq('id', payload.id).catch(e => console.warn(e));
            }
        } catch(e) {
            console.warn("Direct online sync notice:", e);
        }
    }
}

// Event Listeners Koneksi
window.addEventListener('online', () => {
    updateNetworkStatus();
    showNotification("Online", "Koneksi internet terhubung kembali. Memulai sinkronisasi data...", "info");
    syncOutboxQueue();
});

window.addEventListener('offline', () => {
    updateNetworkStatus();
    showNotification("Offline", "Koneksi terputus. SnackLoop beralih ke mode penyimpanan lokal.", "warning");
});

// Periodic Sync Interval (setiap 30 detik jika ada antrean)
setInterval(() => {
    if (navigator.onLine && getOutbox().length > 0 && !isSyncing) {
        syncOutboxQueue();
    }
}, 30000);

// ======================= AUDIT TRAIL UI & EXPORT HANDLERS ======================= //
function renderAuditLogsTable() {
    const tbody = document.getElementById('audit-logs-table-body');
    const badgeEl = document.getElementById('audit-log-count-badge');
    if (!tbody) return;

    let filtered = auditLogData || [];

    // Filter Aksi
    if (currentAuditActionFilter && currentAuditActionFilter !== 'all') {
        filtered = filtered.filter(l => (l.action || '').startsWith(currentAuditActionFilter));
    }

    // Filter Search Keyword
    if (currentAuditSearchKeyword) {
        const kw = currentAuditSearchKeyword.toLowerCase();
        filtered = filtered.filter(l => 
            (l.user || '').toLowerCase().includes(kw) ||
            (l.target || '').toLowerCase().includes(kw) ||
            (l.details || '').toLowerCase().includes(kw) ||
            (l.action || '').toLowerCase().includes(kw)
        );
    }

    if (badgeEl) {
        badgeEl.innerText = `${filtered.length} Catatan`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center opacity-60">Tidak ada riwayat aktivitas yang sesuai.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.slice(0, 150).map(log => {
        let actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border theme-input">${log.action}</span>`;
        if (log.action.includes('CREATE')) {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">Buat Data</span>`;
        } else if (log.action.includes('DELETE')) {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">Hapus Data</span>`;
        } else if (log.action.includes('STATUS')) {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">Ubah Status</span>`;
        } else if (log.action.includes('PAID')) {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">Pelunasan</span>`;
        } else if (log.action.includes('PRICE')) {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">Ubah Harga</span>`;
        } else if (log.action.includes('RESTORE') || log.action.includes('BACKUP')) {
            actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-medium border theme-input text-slate-700 dark:text-slate-300">Cadangan</span>`;
        }

        const roleBadge = log.role === 'super_admin' ? 'Owner' : (log.role === 'staff_rekap' ? 'Kasir' : log.role);

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-b border-inherit">
                <td class="p-3 border border-inherit tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">${log.displayTime || log.timestamp}</td>
                <td class="p-3 border border-inherit whitespace-nowrap font-medium">
                    <span>${log.user}</span>
                    <span class="text-[10px] opacity-60 block">(${roleBadge})</span>
                </td>
                <td class="p-3 border border-inherit whitespace-nowrap">${actionBadge}</td>
                <td class="p-3 border border-inherit font-mono font-semibold">${log.target}</td>
                <td class="p-3 border border-inherit text-slate-700 dark:text-slate-300">${log.details}</td>
            </tr>
        `;
    }).join('');
}

function onAuditSearch(e) {
    currentAuditSearchKeyword = (e.target.value || '').trim();
    renderAuditLogsTable();
}

function onAuditActionFilterChange(val) {
    currentAuditActionFilter = val || 'all';
    renderAuditLogsTable();
}

async function refreshAuditLogs() {
    showNotification("Memuat Ulang", "Menyegarkan catatan log audit...", "info");
    const logs = await idbGetAuditLogs(300);
    if (logs) auditLogData = logs;
    renderAuditLogsTable();
}

function exportAuditLogsCSV() {
    if (!auditLogData || auditLogData.length === 0) {
        return showNotification("Info", "Belum ada catatan log aktivitas untuk diekspor.", "info");
    }

    const headers = ["Waktu", "Operator", "Peran", "Aksi", "Target", "Rincian"];
    const rows = auditLogData.map(l => [
        `"${(l.displayTime || l.timestamp || '').replace(/"/g, '""')}"`,
        `"${(l.user || '').replace(/"/g, '""')}"`,
        `"${(l.role || '').replace(/"/g, '""')}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.target || '').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SnackLoop_AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Sukses", "File rekap Audit Log (CSV) berhasil diunduh.", "success");
}

function exportAuditLogsJSON() {
    if (!auditLogData || auditLogData.length === 0) {
        return showNotification("Info", "Belum ada catatan log aktivitas untuk diekspor.", "info");
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `SnackLoop_AuditLogs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showNotification("Sukses", "File JSON Audit Log berhasil diunduh.", "success");
}

// ----------------- STORAGE HEALTH & SNAPSHOT UI ----------------- //
async function renderStorageHealthUI() {
    const statUsageEl = document.getElementById('storage-stat-usage');
    const statOutboxEl = document.getElementById('storage-stat-outbox');
    const statAuditEl = document.getElementById('storage-stat-audit');
    const badgeEl = document.getElementById('storage-engine-badge');

    if (!statUsageEl && !badgeEl) return;

    const hasIDB = !!window.indexedDB;
    if (badgeEl) {
        badgeEl.className = hasIDB 
            ? "px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            : "px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
        badgeEl.innerText = hasIDB ? "IndexedDB Aktif" : "LocalStorage Mode";
    }

    if (statOutboxEl) {
        const outboxCount = getOutbox().length;
        statOutboxEl.innerText = `${outboxCount} pending`;
    }

    if (statAuditEl) {
        statAuditEl.innerText = `${auditLogData.length} log`;
    }

    if (statUsageEl) {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const est = await navigator.storage.estimate();
                const mb = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
                statUsageEl.innerText = `${mb} MB`;
            } catch(e) {
                statUsageEl.innerText = `< 5 MB`;
            }
        } else {
            statUsageEl.innerText = `Normal`;
        }
    }
}

async function renderSnapshotListUI() {
    const container = document.getElementById('snapshot-history-list');
    if (!container) return;

    const snapshots = await listDailySnapshots();
    if (snapshots.length === 0) {
        container.innerHTML = `<div class="p-2.5 rounded-lg border theme-input text-center text-[11px] opacity-60">Belum ada snapshot harian tersimpan. Tekan "Ambil Sekarang" untuk mencadangkan.</div>`;
        return;
    }

    container.innerHTML = snapshots.map(s => `
        <div class="p-2.5 rounded-lg border theme-input flex items-center justify-between gap-2">
            <div>
                <strong class="font-mono text-xs block text-slate-800 dark:text-slate-200">${s.date}</strong>
                <span class="text-[10px] opacity-60">${s.displayDate || s.createdAt} | ${s.itemCount || 0} transaksi</span>
            </div>
            <button type="button" onclick="restoreDailySnapshot('${s.date}')" class="px-2.5 py-1 rounded text-[11px] font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition" title="Pulihkan data ke snapshot ini">
                <i class="fa-solid fa-rotate-left mr-1"></i> Pulihkan
            </button>
        </div>
    `).join('');
}

async function triggerManualSnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    showNotification("Memproses Snapshot", "Mencadangkan snapshot lokal ke IndexedDB...", "info");
    await createDailySnapshot(today);
    await renderSnapshotListUI();
    showNotification("Sukses", `Snapshot tanggal ${today} berhasil disimpan!`, "success");
}


