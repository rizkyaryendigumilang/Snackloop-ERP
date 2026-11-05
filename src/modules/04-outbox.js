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
    const today = getLocalDateStr();
    const lastSnapDate = localStorage.getItem('snackloop_last_snapshot_date');
    if (lastSnapDate === today) return;

    await createDailySnapshot(today);
}

async function createDailySnapshot(dateKey = null) {
    const key = dateKey || getLocalDateStr();
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
    showConfirmModal("Konfirmasi Pemulihan Database", `Pulihkan seluruh database sistem ke snapshot tanggal ${dateKey}? Perubahan setelah tanggal ini akan ditimpa.`, async () => {
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

            applyStateBundle(snap.data);

            await saveCacheToLocal(true);
            localStorage.setItem('snackloop_pending_restore_sync', String(Date.now()));
            syncRestoredStateToCloud();
            refreshAllViews();

            logAuditActivity('DATA_RESTORE', `Snapshot ${dateKey}`, `Memulihkan database dari snapshot otomatis tanggal ${dateKey}`);
            showNotification("Berhasil", `Sistem berhasil dipulihkan ke kondisi snapshot ${dateKey}!`, "success");
        };
    });
}

async function syncRestoredStateToCloud() {
    if (!navigator.onLine || typeof supabaseClient === 'undefined' || !supabaseClient) return;
    try {
        const tasks = [];
        if (Array.isArray(agentData) && agentData.length > 0) {
            tasks.push(supabaseClient.from('agents').upsert(agentData.map(a => ({ id: a.id, name: a.name }))));
        }
        if (Array.isArray(masterData) && masterData.length > 0) {
            tasks.push(supabaseClient.from('master').upsert(masterData.map(m => ({
                id: m.id, name: m.name, source: m.source, buy: m.buy, sell: m.sell
            }))));
        }
        if (Array.isArray(customerData) && customerData.length > 0) {
            tasks.push(supabaseClient.from('customers').upsert(customerData.map(c => ({
                id: c.id, name: c.name, phone: c.phone
            }))));
        }
        if (Array.isArray(repackData) && repackData.length > 0) {
            tasks.push(supabaseClient.from('repack').upsert(repackData));
        }
        if (Array.isArray(expenseData) && expenseData.length > 0) {
            tasks.push(supabaseClient.from('expenses').upsert(expenseData.map(e => ({
                id: e.id, date: e.date, description: e.description, amount: e.amount
            }))));
        }
        if (Array.isArray(invoiceData) && invoiceData.length > 0) {
            tasks.push(supabaseClient.from('invoices').upsert(invoiceData));
        }
        if (Array.isArray(returnData) && returnData.length > 0) {
            tasks.push(supabaseClient.from('returns').upsert(returnData));
        }
        if (typeof jastipData !== 'undefined' && Array.isArray(jastipData) && jastipData.length > 0) {
            tasks.push(supabaseClient.from('jastip_orders').upsert(jastipData));
        }
        const flatTrx = getAllTransactions().map(t => ({
            id: t.id,
            month_key: t.monthKey || getCurrentMonthKey(new Date((t.date || getLocalDateStr()) + 'T00:00:00')),
            date: t.date,
            customer: t.customer,
            item_name: t.itemName || t.item || '',
            source: t.source,
            qty: t.qty,
            batch: t.batch || '-',
            buy: t.buy,
            extra_cost: t.extraCost || 0,
            extra_cost_note: t.extraCostNote || '-',
            total_modal: t.totalModal,
            sell: t.sell,
            total_sell: t.totalSell,
            status: t.status,
            profit_per_item: t.profitPerItem,
            notes: t.notes || '-'
        }));
        if (flatTrx.length > 0) {
            tasks.push(supabaseClient.from('transactions').upsert(flatTrx));
        }
        await Promise.allSettled(tasks);
        localStorage.removeItem('snackloop_pending_restore_sync');
    } catch (err) {
        console.warn("[RestoreSync] Gagal menyinkronkan pemulihan ke cloud:", err);
    }
}

// ----------------- LOCAL / INDEXEDDB CACHING (OPTIMIZED & DEBOUNCED) ----------------- //
let _saveCacheTimer = null;
let _pendingSavePromise = null;

function saveCacheToLocal(immediate = false) {
    if (immediate) {
        if (_saveCacheTimer) {
            clearTimeout(_saveCacheTimer);
            _saveCacheTimer = null;
        }
        return _executeSaveCache();
    }

    if (!_saveCacheTimer) {
        _pendingSavePromise = new Promise(resolve => {
            _saveCacheTimer = setTimeout(() => {
                _saveCacheTimer = null;
                resolve(_executeSaveCache());
            }, 120);
        });
    }
    return _pendingSavePromise;
}

function _executeSaveCache() {
    const isSuperAdmin = currentRole === 'super_admin';
    const jData = typeof jastipData !== 'undefined' ? jastipData : [];

    // P1: Proteksi Keamanan Cache Lokal untuk Role Non-Admin
    // Mencegah harga modal, laba bersih, dan biaya operasional tersimpan di storage klien non-admin
    const safeExpData = isSuperAdmin ? expenseData : [];
    let safeTrxData = transactionData;
    let safeMasterData = masterData;
    let safeRepackData = repackData;

    if (!isSuperAdmin) {
        safeTrxData = {};
        for (const k in transactionData) {
            safeTrxData[k] = (transactionData[k] || []).map(t => ({
                ...t,
                buy: 0,
                totalModal: 0,
                profitPerItem: 0
            }));
        }
        safeMasterData = (masterData || []).map(m => ({ ...m, buy: 0 }));
        safeRepackData = (repackData || []).map(r => ({ ...r, modal_per_pcs: 0 }));
    }

    const cacheObj = { 
        agentData, 
        masterData: safeMasterData, 
        customerData, 
        repackData: safeRepackData, 
        transactionData: safeTrxData, 
        expenseData: safeExpData, 
        invoiceData, 
        priceHistoryData: isSuperAdmin ? priceHistoryData : [], 
        returnData, 
        userData: isSuperAdmin ? userData : (currentUser ? [{ username: currentUser, role: currentRole }] : []), 
        jastipData: jData 
    };

    // 1. Asinkron ke IndexedDB (Kapasitas Besar & Non-Blocking)
    const p = idbSet('snackloop_cache_v2', cacheObj).catch(err => {
        console.warn("[Storage] idbSet warn:", err);
    });

    // 2. Mirror ringan ke localStorage menggunakan idle callback agar tidak menjeda UI thread
    const saveToLocalStorage = () => {
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
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(saveToLocalStorage, { timeout: 1000 });
    } else {
        setTimeout(saveToLocalStorage, 0);
    }

    return p;
}

// Flush data instan jika user menutup atau me-refresh browser
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        saveCacheToLocal(true);
    });
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
        const isSuperAdmin = currentRole === 'super_admin';
        if (typeof jastipData !== 'undefined' && data.jastipData) {
            jastipData = data.jastipData;
        }
        agentData = data.agentData || [];
        masterData = (data.masterData || []).map(m => isSuperAdmin ? m : { ...m, buy: 0 });
        customerData = data.customerData || [];
        repackData = (data.repackData || []).map(r => isSuperAdmin ? r : { ...r, modal_per_pcs: 0 });
        
        transactionData = data.transactionData || {};
        if (!isSuperAdmin) {
            for (const k in transactionData) {
                transactionData[k] = (transactionData[k] || []).map(t => ({
                    ...t,
                    buy: 0,
                    totalModal: 0,
                    profitPerItem: 0
                }));
            }
        }
        expenseData = isSuperAdmin ? (data.expenseData || []) : [];
        invoiceData = data.invoiceData || [];
        priceHistoryData = isSuperAdmin ? (data.priceHistoryData || []) : [];
        returnData = data.returnData || [];
        userData = isSuperAdmin ? (data.userData && data.userData.length > 0 ? data.userData : [
            { id: 1, username: 'admin', role: 'super_admin' }
        ]) : (currentUser ? [{ username: currentUser, role: currentRole }] : []);
    } else {
        userData = [
            { id: 1, username: 'admin', role: 'super_admin' }
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

// ======================= OFFLINE OUTBOX & BATCHED SYNC ENGINE ======================= //
const OUTBOX_KEY = 'snackloop_outbox';
const BATCH_CHUNK_SIZE = 50; // Kapasitas optimal bulk request PostgREST / Supabase
let _outboxMemoryQueue = null;
let _outboxSaveTimer = null;

function getOutbox() {
    if (Array.isArray(_outboxMemoryQueue)) {
        return _outboxMemoryQueue;
    }
    try {
        _outboxMemoryQueue = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
        if (!Array.isArray(_outboxMemoryQueue)) _outboxMemoryQueue = [];
        return _outboxMemoryQueue;
    } catch(e) {
        _outboxMemoryQueue = [];
        return _outboxMemoryQueue;
    }
}

function saveOutbox(queue) {
    _outboxMemoryQueue = Array.isArray(queue) ? queue : [];
    if (_outboxSaveTimer) clearTimeout(_outboxSaveTimer);
    const persistFn = () => {
        try {
            localStorage.setItem(OUTBOX_KEY, JSON.stringify(_outboxMemoryQueue));
        } catch(e) {
            console.warn("Gagal menyimpan outbox ke localStorage:", e);
        }
    };
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        _outboxSaveTimer = setTimeout(() => {
            window.requestIdleCallback(persistFn, { timeout: 800 });
        }, 50);
    } else {
        _outboxSaveTimer = setTimeout(persistFn, 50);
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
        if (typeof _isRealtimeSubscribed !== 'undefined' && _isRealtimeSubscribed) {
            badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-sm cursor-pointer hover:bg-emerald-100 transition-colors";
            badgeEl.innerHTML = `<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span id="sync-status-text" class="hidden">Live</span>`;
            if (container) container.setAttribute('title', "Status: Online (Realtime Sync Multi-Device Aktif)");
        } else {
            badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-slate-50 text-emerald-700 border-slate-200 dark:bg-slate-900 dark:text-emerald-400 dark:border-slate-800 shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
            badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-600"></span><span id="sync-status-text" class="hidden">Online</span>`;
            if (container) container.setAttribute('title', "Status: Online - Terhubung dengan Database");
        }
    }
}

function handleSyncBadgeClick() {
    const count = getOutbox().length;
    if (!navigator.onLine) {
        showNotification("Mode Offline", count > 0 ? `Ada ${count} data tersimpan lokal di perangkat ini. Otomatis terunggah saat ada sinyal internet.` : "Aplikasi sedang offline. Data lokal aman tersimpan.", "warning");
        return;
    }
    if (count > 0) {
        showNotification("Sinkronisasi", `Memproses ${count} data yang tertunda ke cloud (Batching Mode)...`, "info");
        syncOutboxQueue();
    } else {
        const isLive = typeof _isRealtimeSubscribed !== 'undefined' && _isRealtimeSubscribed;
        showNotification("Status Cloud", isLive ? "Semua data tersinkronisasi. Realtime Live Sync aktif antar-perangkat." : "Semua data sudah tersinkronisasi penuh dengan database.", "success");
    }
}

// ----------------- EKSEKUTOR ATOMIK SATUAN (FALLBACK TAHAN BANTING) ----------------- //
async function syncInvoicePayloadToCloud(inv) {
    if (!inv) return;
    const cleanRow = {
        invoice_number: inv.invoice_number,
        date: inv.date,
        customer_name: inv.customer_name,
        total_amount: inv.total_amount,
        status: inv.status,
        notes: inv.notes || '-'
    };
    if (inv.isNew === false) {
        let q = supabaseClient.from('invoices').update({
            total_amount: inv.total_amount,
            status: inv.status
        });
        if (inv.id && !String(inv.id).startsWith('inv_')) {
            q = q.eq('id', inv.id);
        } else {
            q = q.eq('invoice_number', inv.invoice_number);
        }
        const { error } = await q;
        if (error) throw error;
    } else {
        const { data, error } = await supabaseClient.from('invoices').insert([cleanRow]).select();
        if (error) throw error;
        if (data && data.length > 0 && Array.isArray(invoiceData)) {
            const localInv = invoiceData.find(i => i.invoice_number === inv.invoice_number);
            if (localInv) {
                localInv.id = data[0].id;
                saveCacheToLocal();
            }
        }
    }
}

async function syncDailyInvoiceCloud(invSync) {
    if (!invSync || !invSync.inv || typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const invObj = invSync.inv;
    const matchCol = (invObj.id && !String(invObj.id).startsWith('inv_')) ? 'id' : 'invoice_number';
    const matchVal = matchCol === 'id' ? invObj.id : invObj.invoice_number;
    if (invSync.action === 'delete') {
        await supabaseClient.from('invoices').delete().eq(matchCol, matchVal);
    } else {
        await supabaseClient.from('invoices').update({
            total_amount: invObj.total_amount,
            status: invObj.status
        }).eq(matchCol, matchVal);
    }
}

const OUTBOX_SIMPLE_ROUTES = {
    INSERT_EXPENSE: { table: 'expenses', op: 'insert' },
    INSERT_CUSTOMER: { table: 'customers', op: 'insert' },
    DELETE_CUSTOMER: { table: 'customers', op: 'delete' },
    INSERT_AGENT: { table: 'agents', op: 'insert' },
    DELETE_AGENT: { table: 'agents', op: 'delete' },
    INSERT_REPACK: { table: 'repack', op: 'insert' },
    DELETE_REPACK: { table: 'repack', op: 'delete' },
    INSERT_MASTER: { table: 'master', op: 'insert' },
    DELETE_MASTER: { table: 'master', op: 'delete' },
    DELETE_INVOICE: { table: 'invoices', op: 'delete' },
    UPSERT_JASTIP: { table: 'jastip_orders', op: 'upsert', softFail: true },
    DELETE_JASTIP: { table: 'jastip_orders', op: 'delete', softFail: true },
    INSERT_RETURN: { table: 'returns', op: 'insert', unwrapData: true },
    UPDATE_RETURN: { table: 'returns', op: 'update', unwrapData: true },
    DELETE_RETURN: { table: 'returns', op: 'delete', unwrapData: true },
    INSERT_AUDIT_LOG: { table: 'audit_logs', op: 'insert', unwrapData: true }
};

async function syncSingleOutboxItem(item) {
    const route = OUTBOX_SIMPLE_ROUTES[item.type];
    if (route) {
        const data = (route.unwrapData && item.payload && item.payload.data) ? item.payload.data : item.payload;
        try {
            let res;
            if (route.op === 'insert') res = await supabaseClient.from(route.table).insert([data]);
            else if (route.op === 'upsert') res = await supabaseClient.from(route.table).upsert([data]);
            else if (route.op === 'update') res = await supabaseClient.from(route.table).update(data).eq('id', data.id);
            else if (route.op === 'delete') res = await supabaseClient.from(route.table).delete().eq('id', data.id || item.payload.id);
            if (res && res.error && !route.softFail) throw res.error;
        } catch (err) {
            if (!route.softFail) throw err;
        }
        return;
    }

    if (item.type === 'INSERT_TRANSACTION') {
        if (item.payload && item.payload.repackUpdate) {
            await supabaseClient.from('repack')
                .update({ remaining_qty: item.payload.repackUpdate.newRemainingQty })
                .eq('id', item.payload.repackUpdate.batchId);
        }
        const trxRow = item.payload && (item.payload.transaction || item.payload);
        if (trxRow) {
            const { data: insertedTrx, error: trxErr } = await supabaseClient.from('transactions').insert([trxRow]).select();
            if (trxErr) throw trxErr;
            if (insertedTrx && insertedTrx.length > 0) {
                reconcileOfflineTransactionIds(insertedTrx);
            }
        }

        if (item.payload && item.payload.invoice) {
            await syncInvoicePayloadToCloud(item.payload.invoice);
        }
    } else if (item.type === 'INSERT_BULK_TRANSACTIONS') {
        const rows = item.payload && Array.isArray(item.payload.transactions) ? item.payload.transactions : [];
        if (rows.length > 0) {
            const { data: insertedTrx, error: trxErr } = await supabaseClient.from('transactions').insert(rows).select();
            if (trxErr) throw trxErr;
            if (insertedTrx && insertedTrx.length > 0) {
                reconcileOfflineTransactionIds(insertedTrx);
            }
        }
        if (item.payload && item.payload.invoice) {
            await syncInvoicePayloadToCloud(item.payload.invoice);
        }
    } else if (item.type === 'CONSOLIDATE_DAILY_INVOICES') {
        const idsToDelete = (item.payload && Array.isArray(item.payload.idsToDelete))
            ? item.payload.idsToDelete.filter(id => !String(id).startsWith('inv_'))
            : [];
        if (idsToDelete.length > 0) {
            await supabaseClient.from('invoices').delete().in('id', idsToDelete);
        }
        const updates = (item.payload && Array.isArray(item.payload.masterInvUpdates)) ? item.payload.masterInvUpdates : [];
        for (const up of updates) {
            if (up.id && !String(up.id).startsWith('inv_')) {
                await supabaseClient.from('invoices').update({
                    total_amount: up.total_amount,
                    status: up.status
                }).eq('id', up.id);
            }
        }
    } else if (item.type === 'DELETE_TRANSACTION') {
        if (item.payload.source === 'Repack' && item.payload.batch) {
            const rItem = repackData.find(r => r.id === item.payload.batch);
            if (rItem) {
                await supabaseClient.from('repack')
                    .update({ remaining_qty: rItem.remaining_qty })
                    .eq('id', item.payload.batch);
            }
        }
        if (item.payload.id && !String(item.payload.id).startsWith('trx_')) {
            const { error } = await supabaseClient.from('transactions').delete().eq('id', item.payload.id);
            if (error) throw error;
        }
        await syncDailyInvoiceCloud(item.payload.invSync);
    } else if (item.type === 'UPDATE_TRANSACTION_STATUS') {
        if (item.payload.id && !String(item.payload.id).startsWith('trx_')) {
            const { error } = await supabaseClient.from('transactions')
                .update({ status: item.payload.status })
                .eq('id', item.payload.id);
            if (error) throw error;
        }
        await syncDailyInvoiceCloud(item.payload.invSync);
    } else if (item.type === 'DELETE_MONTH_SHEET') {
        if (item.payload && item.payload.month_key) {
            const { error } = await supabaseClient.from('transactions').delete().eq('month_key', item.payload.month_key);
            if (error) throw error;
        }
    } else if (item.type === 'DELETE_JASTIP_FINANCE_TRX') {
        const cloudIds = (item.payload && Array.isArray(item.payload.cloudIds)) ? item.payload.cloudIds : [];
        if (cloudIds.length > 0) {
            await supabaseClient.from('transactions').delete().in('id', cloudIds);
        } else if (item.payload && item.payload.jastipId) {
            await supabaseClient.from('transactions').delete().eq('source', 'Jastip').ilike('item_name', `%[${item.payload.jastipId}]%`);
        }
    } else if (item.type === 'UPDATE_MASTER') {
        const { error } = await supabaseClient.from('master').update(item.payload.updates).eq('id', item.payload.id);
        if (error) throw error;
        if (item.payload.history) {
            await supabaseClient.from('price_history').insert([item.payload.history]);
        }
    } else if (item.type === 'UPDATE_INVOICE_PAID') {
        if (item.payload.invId && !String(item.payload.invId).startsWith('inv_')) {
            await supabaseClient.from('invoices').update({ status: 'Lunas' }).eq('id', item.payload.invId);
        } else if (item.payload.customerName && item.payload.date) {
            await supabaseClient.from('invoices').update({ status: 'Lunas' }).eq('customer_name', item.payload.customerName).eq('date', item.payload.date);
        }
        if (item.payload.customerName) {
            let trxQuery = supabaseClient.from('transactions').update({ status: 'Lunas' }).eq('customer', item.payload.customerName);
            if (item.payload.date) trxQuery = trxQuery.eq('date', item.payload.date);
            await trxQuery;
        }
    } else if (item.table && item.action) {
        if (item.action === 'insert') {
            const { error } = await supabaseClient.from(item.table).insert([item.payload]);
            if (error) throw error;
        } else if (item.action === 'update') {
            const { error } = await supabaseClient.from(item.table).update(item.payload).eq('id', item.payload.id);
            if (error) throw error;
        } else if (item.action === 'delete') {
            const { error } = await supabaseClient.from(item.table).delete().eq('id', item.payload.id);
            if (error) throw error;
        }
    }
}

// ----------------- REKONSILIASI ID TRANSAKSI OFFLINE KE CLOUD ----------------- //
function reconcileOfflineTransactionIds(insertedList) {
    if (!Array.isArray(insertedList) || insertedList.length === 0) return;
    let modified = false;
    insertedList.forEach(cloudRow => {
        for (let mk in transactionData) {
            const list = transactionData[mk];
            const localTrx = list.find(t => 
                typeof t.id === 'string' && t.id.startsWith('trx_') &&
                t.date === cloudRow.date &&
                t.customer === cloudRow.customer &&
                t.itemName === cloudRow.item_name
            );
            if (localTrx) {
                localTrx.id = cloudRow.id;
                modified = true;
            }
        }
    });
    if (modified) {
        saveCacheToLocal();
        if (typeof renderTransactionsForActiveSheet === 'function') {
            renderTransactionsForActiveSheet();
        }
    }
}

// ----------------- BATCHING MUTATION ENGINE (50x LEBIH CEPAT DI KONEKSI MOBILE) ----------------- //
async function syncBatchedItems(type, batchItems) {
    if (batchItems.length === 1) {
        await syncSingleOutboxItem(batchItems[0]);
        return;
    }

    if (type === 'INSERT_TRANSACTION') {
        // 1. Batch Repack Stock Updates (ambil remaining_qty paling mutakhir per batchId)
        const repackMap = new Map();
        batchItems.forEach(it => {
            if (it.payload && it.payload.repackUpdate) {
                repackMap.set(it.payload.repackUpdate.batchId, it.payload.repackUpdate.newRemainingQty);
            }
        });
        if (repackMap.size > 0) {
            await Promise.all(
                Array.from(repackMap.entries()).map(([batchId, qty]) =>
                    supabaseClient.from('repack').update({ remaining_qty: qty }).eq('id', batchId)
                )
            );
        }

        // 2. Bulk Insert Transactions (1 HTTP POST)
        const trxRows = batchItems.map(it => it.payload && (it.payload.transaction || it.payload)).filter(Boolean);
        if (trxRows.length > 0) {
            const { data: insertedTrx, error: trxErr } = await supabaseClient.from('transactions').insert(trxRows).select();
            if (trxErr) throw trxErr;
            if (insertedTrx && insertedTrx.length > 0) {
                reconcileOfflineTransactionIds(insertedTrx);
            }
        }

        // 3. Sinkronisasi Invoices (pisah insert baru vs update existing)
        const invPayloads = batchItems.map(it => it.payload && it.payload.invoice).filter(Boolean);
        for (const inv of invPayloads) {
            await syncInvoicePayloadToCloud(inv);
        }
    } else if (OUTBOX_SIMPLE_ROUTES[type] && OUTBOX_SIMPLE_ROUTES[type].op !== 'update') {
        const route = OUTBOX_SIMPLE_ROUTES[type];
        if (route.op === 'insert' || route.op === 'upsert') {
            const rows = batchItems.map(it => (route.unwrapData && it.payload && it.payload.data) ? it.payload.data : it.payload).filter(Boolean);
            const { error } = route.op === 'upsert'
                ? await supabaseClient.from(route.table).upsert(rows)
                : await supabaseClient.from(route.table).insert(rows);
            if (error && !route.softFail) throw error;
        } else if (route.op === 'delete') {
            const ids = batchItems.map(it => it.payload.id || (it.payload.data && it.payload.data.id)).filter(Boolean);
            const { error } = await supabaseClient.from(route.table).delete().in('id', ids);
            if (error && !route.softFail) throw error;
        }
    } else if (type === 'DELETE_TRANSACTION') {
        // Kembalikan stok repack jika ada
        batchItems.forEach(it => {
            if (it.payload && it.payload.source === 'Repack' && it.payload.batch) {
                const rItem = repackData.find(r => r.id === it.payload.batch);
                if (rItem) {
                    supabaseClient.from('repack').update({ remaining_qty: rItem.remaining_qty }).eq('id', it.payload.batch).catch(() => {});
                }
            }
        });
        const ids = batchItems.map(it => it.payload.id).filter(Boolean);
        const { error } = await supabaseClient.from('transactions').delete().in('id', ids);
        if (error) throw error;
    } else {
        // Tipe lain yang disparate / non-batchable (misal UPDATE_MASTER, UPDATE_INVOICE_PAID, UPDATE_RETURN)
        for (const it of batchItems) {
            await syncSingleOutboxItem(it);
        }
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
    let currentIndex = 0;

    while (currentIndex < queue.length) {
        if (!navigator.onLine) {
            for (let k = currentIndex; k < queue.length; k++) remainingQueue.push(queue[k]);
            break;
        }

        const currentType = queue[currentIndex].type;
        const batchItems = [];
        while (
            currentIndex < queue.length &&
            queue[currentIndex].type === currentType &&
            batchItems.length < BATCH_CHUNK_SIZE
        ) {
            batchItems.push(queue[currentIndex]);
            currentIndex++;
        }

        try {
            await syncBatchedItems(currentType, batchItems);
            syncedCount += batchItems.length;
        } catch (batchErr) {
            console.warn(`[OutboxBatch] Batch sinkronisasi tipe ${currentType} (${batchItems.length} item) gagal, mengaktifkan fallback item-by-item:`, batchErr);
            // Resilient Fallback: Proses item satu per satu agar data yang valid tetap terkirim
            for (const item of batchItems) {
                if (!navigator.onLine) {
                    remainingQueue.push(item);
                    continue;
                }
                try {
                    await syncSingleOutboxItem(item);
                    syncedCount++;
                } catch (singleErr) {
                    console.error("[OutboxBatch] Item gagal disinkronkan:", item, singleErr);
                    remainingQueue.push(item);
                }
            }
        }
    }

    saveOutbox(remainingQueue);
    isSyncing = false;
    updateNetworkStatus();

    if (syncedCount > 0) {
        showNotification("Sinkronisasi Selesai", `${syncedCount} data offline berhasil diunggah ke cloud (Batching Mode)!`, "success");
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
    let mutationType = null;
    if (table === 'returns') {
        if (action === 'insert') mutationType = 'INSERT_RETURN';
        else if (action === 'update') mutationType = 'UPDATE_RETURN';
        else if (action === 'delete') mutationType = 'DELETE_RETURN';
    } else if (table === 'expenses') {
        if (action === 'insert') mutationType = 'INSERT_EXPENSE';
    } else if (table === 'transactions') {
        if (action === 'insert') mutationType = 'INSERT_TRANSACTION';
    } else if (table === 'audit_logs') {
        if (action === 'insert') mutationType = 'INSERT_AUDIT_LOG';
    }

    const item = {
        id: 'outbox_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: mutationType || `GENERIC_${table.toUpperCase()}_${action.toUpperCase()}`,
        payload: payload,
        table: table,
        action: action,
        timestamp: new Date().toISOString()
    };

    return dispatchMutation(item, async () => {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            throw new Error('Supabase client unavailable');
        }
        if (action === 'insert') {
            const { error } = await supabaseClient.from(table).insert(Array.isArray(payload) ? payload : [payload]);
            if (error) throw error;
        } else if (action === 'update') {
            const { error } = await supabaseClient.from(table).update(payload).eq('id', payload.id);
            if (error) throw error;
        } else if (action === 'delete') {
            const { error } = await supabaseClient.from(table).delete().eq('id', payload.id);
            if (error) throw error;
        }
    });
}

// =========================================================================
// PAGE VISIBILITY API & SMART POWER SAVER ENGINE (HEMAT BATERAI KASIR)
// =========================================================================
let isAppVisible = typeof document !== 'undefined' ? !document.hidden : true;
let syncIntervalId = null;
let currentSyncIntervalMs = 30000;
let wakeLockSentinel = null;
let isEcoModeActive = false;

function setSyncInterval(ms) {
    if (syncIntervalId) clearInterval(syncIntervalId);
    currentSyncIntervalMs = ms;
    if (isAppVisible) {
        syncIntervalId = setInterval(() => {
            if (navigator.onLine && getOutbox().length > 0 && !isSyncing && isAppVisible) {
                syncOutboxQueue();
            }
        }, currentSyncIntervalMs);
    }
}

function pauseBackgroundTimers() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
    releaseScreenWakeLock();
    console.info("[PowerSaver] Tab diminimalkan / latar belakang. Interval & CPU dijeda.");
}

function resumeBackgroundTimers() {
    if (!syncIntervalId) {
        setSyncInterval(isEcoModeActive ? 60000 : 30000);
    }
    console.info("[PowerSaver] Tab aktif kembali. Sinkronisasi dipulihkan.");
    if (navigator.onLine && getOutbox().length > 0 && !isSyncing) {
        syncOutboxQueue();
    }
}

async function requestScreenWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && isAppVisible) {
        try {
            if (!wakeLockSentinel) {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
                wakeLockSentinel.addEventListener('release', () => {
                    wakeLockSentinel = null;
                });
                console.info("[PowerSaver] Screen Wake Lock aktif (Layar kasir tetap menyala saat kasir aktif).");
            }
        } catch (err) {
            console.debug("[PowerSaver] Wake Lock notice:", err.message);
        }
    }
}

async function releaseScreenWakeLock() {
    if (wakeLockSentinel) {
        try {
            await wakeLockSentinel.release();
        } catch(e) {}
        wakeLockSentinel = null;
    }
}

function applyEcoMode(enable) {
    isEcoModeActive = enable;
    if (typeof document !== 'undefined') {
        if (enable) {
            document.documentElement.classList.add('eco-mode');
            setSyncInterval(60000);
            console.info("[PowerSaver] Mode Hemat Baterai (Eco Mode) diaktifkan.");
        } else {
            document.documentElement.classList.remove('eco-mode');
            setSyncInterval(30000);
            console.info("[PowerSaver] Mode Hemat Baterai dinonaktifkan.");
        }
    }
}

async function initBatteryMonitoring() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            const checkBattery = () => {
                if (battery.level <= 0.20 && !battery.charging) {
                    applyEcoMode(true);
                } else if (battery.charging || battery.level > 0.30) {
                    if (isEcoModeActive) applyEcoMode(false);
                }
            };
            checkBattery();
            battery.addEventListener('levelchange', checkBattery);
            battery.addEventListener('chargingchange', checkBattery);
        } catch (e) {
            console.debug("[PowerSaver] Battery status API not available or restricted.");
        }
    }
}

function initPageVisibilityAndPowerSaver() {
    setSyncInterval(30000);

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isAppVisible = false;
                pauseBackgroundTimers();
            } else {
                isAppVisible = true;
                resumeBackgroundTimers();
            }
        });
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
            if (!isAppVisible) {
                isAppVisible = true;
                resumeBackgroundTimers();
            }
        });

        window.addEventListener('online', () => {
            updateNetworkStatus();
            showNotification("Online", "Koneksi internet terhubung kembali. Memulai sinkronisasi data...", "info");
            syncOutboxQueue();
        });

        window.addEventListener('offline', () => {
            updateNetworkStatus();
            showNotification("Offline", "Koneksi terputus. SnackLoop beralih ke mode penyimpanan lokal.", "warning");
        });
    }

    initBatteryMonitoring();
}

// Inisialisasi otomatis jika di lingkungan browser
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageVisibilityAndPowerSaver);
    } else {
        initPageVisibilityAndPowerSaver();
    }
}

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

        const roleBadge = log.role === 'super_admin' ? 'Owner' : (log.role === 'staff_rekap' ? 'Kasir' : (log.role || ''));
        const safeUser = escapeHtml(log.user || '-');
        const safeTarget = escapeHtml(log.target || '-');
        const safeDetails = escapeHtml(log.details || '-');
        const safeTime = escapeHtml(log.displayTime || log.timestamp || '-');

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-b border-inherit">
                <td class="p-3 border border-inherit tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">${safeTime}</td>
                <td class="p-3 border border-inherit whitespace-nowrap font-medium">
                    <span>${safeUser}</span>
                    <span class="text-[10px] opacity-60 block">(${escapeHtml(roleBadge)})</span>
                </td>
                <td class="p-3 border border-inherit whitespace-nowrap">${actionBadge}</td>
                <td class="p-3 border border-inherit font-mono font-semibold">${safeTarget}</td>
                <td class="p-3 border border-inherit text-slate-700 dark:text-slate-300">${safeDetails}</td>
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
    downloadBlobFile(csvContent, `SnackLoop_AuditLogs_${getLocalDateStr()}.csv`, 'text/csv;charset=utf-8;');
    showNotification("Sukses", "File rekap Audit Log (CSV) berhasil diunduh.", "success");
}

function exportAuditLogsJSON() {
    if (!auditLogData || auditLogData.length === 0) {
        return showNotification("Info", "Belum ada catatan log aktivitas untuk diekspor.", "info");
    }
    downloadBlobFile(JSON.stringify(auditLogData, null, 2), `SnackLoop_AuditLogs_${getLocalDateStr()}.json`);
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

    container.innerHTML = snapshots.map(s => {
        const safeDate = escapeHtml(s.date || '');
        const safeDisplay = escapeHtml(s.displayDate || s.createdAt || '-');
        const encodedDate = encodeURIComponent(s.date || '').replace(/'/g, "%27");
        return `
        <div class="p-2.5 rounded-lg border theme-input flex items-center justify-between gap-2">
            <div>
                <strong class="font-mono text-xs block text-slate-800 dark:text-slate-200">${safeDate}</strong>
                <span class="text-[10px] opacity-60">${safeDisplay} | ${s.itemCount || 0} transaksi</span>
            </div>
            <button type="button" onclick="restoreDailySnapshot(decodeURIComponent('${encodedDate}'))" class="px-2.5 py-1 rounded text-[11px] font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition" title="Pulihkan data ke snapshot ini">
                <i class="fa-solid fa-rotate-left mr-1"></i> Pulihkan
            </button>
        </div>
    `;}).join('');
}

async function triggerManualSnapshot() {
    const today = getLocalDateStr();
    showNotification("Memproses Snapshot", "Mencadangkan snapshot lokal ke IndexedDB...", "info");
    await createDailySnapshot(today);
    await renderSnapshotListUI();
    showNotification("Sukses", `Snapshot tanggal ${today} berhasil disimpan!`, "success");
}

// =========================================================================
// P3: SUPABASE REALTIME MULTI-DEVICE SYNC ENGINE
// =========================================================================
let _realtimeChannel = null;
let _realtimeUIRefreshTimer = null;
let _isRealtimeSubscribed = false;

function scheduleRealtimeUIRefresh(options = {}) {
    if (_realtimeUIRefreshTimer) clearTimeout(_realtimeUIRefreshTimer);
    _realtimeUIRefreshTimer = setTimeout(() => {
        _realtimeUIRefreshTimer = null;
        if (options.transactions && typeof renderTransactionsForActiveSheet === 'function') {
            renderTransactionsForActiveSheet();
        }
        if (options.dashboard && typeof updateDashboard === 'function') {
            updateDashboard();
        }
        if (options.months && typeof renderMonthTabs === 'function') {
            renderMonthTabs();
        }
        if (options.invoices && typeof renderInvoicesTable === 'function') {
            renderInvoicesTable();
        }
        if (options.master && typeof renderMaster === 'function') {
            renderMaster();
        }
        if (options.dropdowns && typeof renderDropdowns === 'function') {
            renderDropdowns();
        }
        if (options.repack && typeof renderRepackWarehouse === 'function') {
            renderRepackWarehouse();
        }
        if (options.customers && typeof renderCustomer === 'function') {
            renderCustomer();
        }
        if (options.returns && typeof renderReturnList === 'function') {
            renderReturnList();
        }
    }, 160);
}

function initSupabaseRealtimeSync() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient || typeof supabaseClient.channel !== 'function') {
        return;
    }

    if (_realtimeChannel) {
        try { supabaseClient.removeChannel(_realtimeChannel); } catch(e) {}
        _realtimeChannel = null;
    }

    try {
        _realtimeChannel = supabaseClient.channel('snackloop-realtime-sync')
            // 1. Perubahan Produk Master (Harga Jual / Stok / Nama)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'master' }, (payload) => {
                _handleRealtimeMaster(payload);
            })
            // 2. Transaksi Penjualan Baru / Update Status Lunas
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                _handleRealtimeTransactions(payload);
            })
            // 3. Faktur / Invoice Pelunasan Tempo
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
                _handleRealtimeInvoices(payload);
            })
            // 4. Stok Repack Kemasan
            .on('postgres_changes', { event: '*', schema: 'public', table: 'repack' }, (payload) => {
                _handleRealtimeRepack(payload);
            })
            // 5. Data Pelanggan / Toko Mitra
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
                _handleRealtimeCustomers(payload);
            })
            // 6. Retur Barang
            .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, (payload) => {
                _handleRealtimeReturns(payload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    _isRealtimeSubscribed = true;
                    console.info("[Realtime] Multi-device Live Sync berhasil terhubung.");
                    _updateRealtimeStatusBadge(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    _isRealtimeSubscribed = false;
                    _updateRealtimeStatusBadge(false);
                }
            });
    } catch(err) {
        console.warn("[Realtime] Gagal inisialisasi Realtime channel:", err);
    }
}

function stopSupabaseRealtimeSync() {
    if (_realtimeChannel && typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            supabaseClient.removeChannel(_realtimeChannel);
        } catch(e) {}
    }
    _realtimeChannel = null;
    _isRealtimeSubscribed = false;
    _updateRealtimeStatusBadge(false);
}

function _updateRealtimeStatusBadge(isActive) {
    const badgeEl = document.getElementById('sync-status-badge');
    const container = document.getElementById('sync-status-container');
    const count = typeof getOutbox === 'function' ? getOutbox().length : 0;
    
    if (count > 0 || !navigator.onLine) {
        return;
    }

    if (isActive && badgeEl) {
        badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-sm cursor-pointer hover:bg-emerald-100 transition-colors";
        badgeEl.innerHTML = `<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span id="sync-status-text" class="hidden">Live</span>`;
        if (container) container.setAttribute('title', "Status: Online (Realtime Sync Multi-Device Aktif)");
    }
}

function _handleRealtimeMaster(payload) {
    const isSuperAdmin = currentRole === 'super_admin';
    if (payload.eventType === 'INSERT') {
        const item = payload.new;
        if (!masterData.some(m => String(m.id) === String(item.id))) {
            masterData.push(isSuperAdmin ? item : { ...item, buy: 0 });
            masterData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ master: true, dropdowns: true });
        }
    } else if (payload.eventType === 'UPDATE') {
        const item = payload.new;
        const idx = masterData.findIndex(m => String(m.id) === String(item.id));
        if (idx !== -1) {
            const oldBuy = masterData[idx].buy || 0;
            masterData[idx] = isSuperAdmin ? item : { ...item, buy: oldBuy };
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ master: true, dropdowns: true });
        }
    } else if (payload.eventType === 'DELETE') {
        masterData = masterData.filter(m => String(m.id) !== String(payload.old.id));
        saveCacheToLocal();
        scheduleRealtimeUIRefresh({ master: true, dropdowns: true });
    }
}

function _handleRealtimeTransactions(payload) {
    const isSuperAdmin = currentRole === 'super_admin';
    if (payload.eventType === 'INSERT') {
        const t = payload.new;
        const formatted = {
            id: t.id,
            monthKey: t.month_key,
            date: t.date,
            customer: t.customer,
            itemName: t.item_name,
            source: t.source,
            qty: Number(t.qty) || 0,
            batch: t.batch,
            buy: isSuperAdmin ? (Number(t.buy) || 0) : 0,
            extraCost: Number(t.extra_cost) || 0,
            extraCostNote: t.extra_cost_note || '-',
            totalModal: isSuperAdmin ? (Number(t.total_modal) || 0) : 0,
            sell: Number(t.sell) || 0,
            totalSell: Number(t.total_sell) || 0,
            status: t.status,
            profitPerItem: isSuperAdmin ? (Number(t.profit_per_item) || 0) : 0,
            notes: t.notes || '-'
        };

        if (!transactionData[formatted.monthKey]) {
            transactionData[formatted.monthKey] = [];
        }

        const exists = transactionData[formatted.monthKey].some(item => String(item.id) === String(formatted.id));
        if (!exists) {
            transactionData[formatted.monthKey].unshift(formatted);
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ transactions: true, dashboard: true, months: true });
        }
    } else if (payload.eventType === 'UPDATE') {
        const t = payload.new;
        let found = false;
        for (const mKey in transactionData) {
            const list = transactionData[mKey] || [];
            const idx = list.findIndex(item => String(item.id) === String(t.id));
            if (idx !== -1) {
                const oldBuy = list[idx].buy || 0;
                const oldModal = list[idx].totalModal || 0;
                const oldProfit = list[idx].profitPerItem || 0;

                list[idx] = {
                    ...list[idx],
                    date: t.date,
                    customer: t.customer,
                    itemName: t.item_name,
                    source: t.source,
                    qty: Number(t.qty) || 0,
                    batch: t.batch,
                    buy: isSuperAdmin ? (Number(t.buy) || 0) : oldBuy,
                    extraCost: Number(t.extra_cost) || 0,
                    extraCostNote: t.extra_cost_note || '-',
                    totalModal: isSuperAdmin ? (Number(t.total_modal) || 0) : oldModal,
                    sell: Number(t.sell) || 0,
                    totalSell: Number(t.total_sell) || 0,
                    status: t.status,
                    profitPerItem: isSuperAdmin ? (Number(t.profit_per_item) || 0) : oldProfit,
                    notes: t.notes || '-'
                };
                found = true;
                break;
            }
        }
        if (found) {
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ transactions: true, dashboard: true });
        }
    } else if (payload.eventType === 'DELETE') {
        const delId = String(payload.old.id);
        let changed = false;
        for (const mKey in transactionData) {
            const prevLen = transactionData[mKey].length;
            transactionData[mKey] = transactionData[mKey].filter(item => String(item.id) !== delId);
            if (transactionData[mKey].length !== prevLen) changed = true;
        }
        if (changed) {
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ transactions: true, dashboard: true });
        }
    }
}

function _handleRealtimeInvoices(payload) {
    if (payload.eventType === 'INSERT') {
        const inv = payload.new;
        if (!invoiceData.some(i => String(i.id) === String(inv.id) || i.invoice_number === inv.invoice_number)) {
            invoiceData.unshift(inv);
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ invoices: true, dashboard: true });
        }
    } else if (payload.eventType === 'UPDATE') {
        const inv = payload.new;
        const idx = invoiceData.findIndex(i => String(i.id) === String(inv.id) || i.invoice_number === inv.invoice_number);
        if (idx !== -1) {
            invoiceData[idx] = { ...invoiceData[idx], ...inv };
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ invoices: true, dashboard: true });
        }
    } else if (payload.eventType === 'DELETE') {
        invoiceData = invoiceData.filter(i => String(i.id) !== String(payload.old.id));
        saveCacheToLocal();
        scheduleRealtimeUIRefresh({ invoices: true, dashboard: true });
    }
}

function _handleRealtimeRepack(payload) {
    const isSuperAdmin = currentRole === 'super_admin';
    if (payload.eventType === 'INSERT') {
        const r = payload.new;
        if (!repackData.some(item => String(item.id) === String(r.id))) {
            repackData.unshift(isSuperAdmin ? r : { ...r, modal_per_pcs: 0 });
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ repack: true, dropdowns: true });
        }
    } else if (payload.eventType === 'UPDATE') {
        const r = payload.new;
        const idx = repackData.findIndex(item => String(item.id) === String(r.id));
        if (idx !== -1) {
            const oldModal = repackData[idx].modal_per_pcs || 0;
            repackData[idx] = isSuperAdmin ? r : { ...r, modal_per_pcs: oldModal };
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ repack: true, dropdowns: true });
        }
    } else if (payload.eventType === 'DELETE') {
        repackData = repackData.filter(item => String(item.id) !== String(payload.old.id));
        saveCacheToLocal();
        scheduleRealtimeUIRefresh({ repack: true, dropdowns: true });
    }
}

function _handleRealtimeCustomers(payload) {
    if (payload.eventType === 'INSERT') {
        const c = payload.new;
        if (!customerData.some(item => String(item.id) === String(c.id))) {
            customerData.push(c);
            customerData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ customers: true, dropdowns: true });
        }
    } else if (payload.eventType === 'UPDATE') {
        const c = payload.new;
        const idx = customerData.findIndex(item => String(item.id) === String(c.id));
        if (idx !== -1) {
            customerData[idx] = c;
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ customers: true, dropdowns: true });
        }
    } else if (payload.eventType === 'DELETE') {
        customerData = customerData.filter(item => String(item.id) !== String(payload.old.id));
        saveCacheToLocal();
        scheduleRealtimeUIRefresh({ customers: true, dropdowns: true });
    }
}

function _handleRealtimeReturns(payload) {
    if (payload.eventType === 'INSERT') {
        const r = payload.new;
        if (!returnData.some(item => String(item.id) === String(r.id))) {
            returnData.unshift(r);
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ returns: true });
        }
    } else if (payload.eventType === 'UPDATE') {
        const r = payload.new;
        const idx = returnData.findIndex(item => String(item.id) === String(r.id));
        if (idx !== -1) {
            returnData[idx] = r;
            saveCacheToLocal();
            scheduleRealtimeUIRefresh({ returns: true });
        }
    } else if (payload.eventType === 'DELETE') {
        returnData = returnData.filter(item => String(item.id) !== String(payload.old.id));
        saveCacheToLocal();
        scheduleRealtimeUIRefresh({ returns: true });
    }
}



