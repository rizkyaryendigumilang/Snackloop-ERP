// ======================= LOCALSTORAGE CACHING (OFFLINE READY) ======================= //
function saveCacheToLocal() {
    try {
        const jData = typeof jastipData !== 'undefined' ? jastipData : [];
        const cacheObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData, returnData, userData, jastipData: jData };
        localStorage.setItem('snackloop_cache', JSON.stringify(cacheObj));
    } catch(e) {}
}

function loadCacheFromLocal() {
    try {
        const cached = localStorage.getItem('snackloop_cache');
        if(cached) {
            const data = JSON.parse(cached);
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
    } catch(e) {}
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

