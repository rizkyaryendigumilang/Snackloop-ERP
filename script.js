// ==========================================================
// KONFIGURASI SUPABASE 
// ==========================================================
const SUPABASE_URL = 'https://wirypusjlaywxlnlpebc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hBxnQJOgix-cY8Bt5Tl6wQ_x1AOglpR';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentRole = null; 

let agentData = []; 
let masterData = []; 
let customerData = []; 
let repackData = []; 
let transactionData = {}; 
let expenseData = [];
let userData = [];
let invoiceData = [];
let priceHistoryData = []; 

let activeMonthSheet = ""; 
let currentTransactionFilter = 'all'; 
let currentDashboardTimeFilter = 'all'; 
let currentRepackCalcResult = null;
let financialChartInstance = null;
let isCompact = false;
let transactionDateSortAsc = true; 

// State Pagination & In-Memory Search
let currentTransactionPage = 1;
const rowsPerPage = 25;
let currentSearchKeyword = '';

// ======================= SISTEM TOAST NOTIFIKASI MODERN ======================= //
function showNotification(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(`${title}: ${message}`);
        return;
    }

    let borderColor = 'border-emerald-500';
    let iconClass = 'fa-solid fa-circle-check text-emerald-500';
    if (type === 'info') { borderColor = 'border-blue-500'; iconClass = 'fa-solid fa-circle-info text-blue-500'; }
    if (type === 'warning') { borderColor = 'border-amber-500'; iconClass = 'fa-solid fa-triangle-exclamation text-amber-500'; }
    if (type === 'error') { borderColor = 'border-rose-500'; iconClass = 'fa-solid fa-circle-xmark text-rose-500'; }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto theme-card rounded-lg shadow-xl border border-l-4 ${borderColor} p-4 flex items-start justify-between gap-3 transform translate-x-10 opacity-0 transition-all duration-300 ease-out z-[99999] w-full`;
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="${iconClass} text-lg mt-0.5"></i>
            <div>
                <h4 class="text-xs font-bold">${title}</h4>
                <p class="text-xs opacity-70 mt-0.5">${message}</p>
            </div>
        </div>
        <button onclick="this.closest('div').parentElement.remove()" class="opacity-60 hover:opacity-100 text-sm font-bold">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-x-10', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-x-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ======================= PENGGANTI DEFAULT TOOLTIP BROWSER ======================= //
document.addEventListener("DOMContentLoaded", function() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('invalid', function(e) {
            e.preventDefault();
            const invalidField = form.querySelector(':invalid');
            if (invalidField) {
                const labelEl = form.querySelector(`label[for="${invalidField.id}"]`) || invalidField.previousElementSibling;
                const fieldName = labelEl ? labelEl.textContent.replace('*', '').trim() : 'Kolom ini';
                showNotification("Perhatian", `${fieldName} wajib diisi dengan benar.`, "warning");
                invalidField.focus();
            }
        }, true);
    });

    ['m-buy', 'm-sell', 'c-price', 'c-disc', 'c-fee', 'c-plastic', 'c-sell', 't-sell', 't-extracost', 'exp-amount', 'edit-m-buy', 'edit-m-sell'].forEach(id => {
        setupCurrencyFormatter(id);
    });

    const savedCompact = localStorage.getItem('snackloop_compact') === 'true';
    if (savedCompact) toggleCompactView(true);

    const savedTheme = localStorage.getItem('snackloop_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const icon = document.getElementById('dark-mode-icon');
        if(icon) icon.innerText = 'light_mode';
    }

    loadMemos();
    loadCacheFromLocal();
});

// ======================= LOCALSTORAGE CACHING (OFFLINE READY) ======================= //
function saveCacheToLocal() {
    try {
        const cacheObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData };
        localStorage.setItem('snackloop_cache', JSON.stringify(cacheObj));
    } catch(e) {}
}

function loadCacheFromLocal() {
    try {
        const cached = localStorage.getItem('snackloop_cache');
        if(cached) {
            const data = JSON.parse(cached);
            agentData = data.agentData || [];
            masterData = data.masterData || [];
            customerData = data.customerData || [];
            repackData = data.repackData || [];
            transactionData = data.transactionData || {};
            expenseData = data.expenseData || [];
            invoiceData = data.invoiceData || [];
            priceHistoryData = data.priceHistoryData || [];
        }
    } catch(e) {}
}

// ======================= MODAL KONFIRMASI KUSTOM ======================= //
function showConfirmModal(title, message, onConfirmCallback) {
    const modal = document.getElementById('custom-confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const btnYes = document.getElementById('confirm-btn-yes');
    const btnCancel = document.getElementById('confirm-btn-cancel');
    const btnClose = document.getElementById('confirm-btn-close');

    if(!modal) {
        if(confirm(message)) onConfirmCallback();
        return;
    }

    titleEl.innerText = title;
    msgEl.innerText = message;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const newBtnYes = btnYes.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnClose = btnClose ? btnClose.cloneNode(true) : null;
    
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    if(btnClose && newBtnClose) {
        btnClose.parentNode.replaceChild(newBtnClose, btnClose);
        newBtnClose.addEventListener('click', () => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        });
    }

    newBtnYes.addEventListener('click', () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        onConfirmCallback();
    });

    newBtnCancel.addEventListener('click', () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    });
}

// ======================= MODAL PROMPT KUSTOM (BERBASIS KALENDER BULAN & HAPUS SHEET) ======================= //
function createNewMonthSheet() {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");

    const modal = document.getElementById('custom-prompt-modal');
    const inputField = document.getElementById('calendar-month-input');
    const btnOk = document.getElementById('custom-prompt-btn-ok');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    if(inputField) inputField.value = `${year}-${month}`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if(inputField) inputField.focus();

    const newBtnOk = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);

    newBtnOk.addEventListener('click', () => {
        const val = inputField.value; 
        if(val) {
            const [y, m] = val.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
            const formattedMonthKey = `${monthNames[parseInt(m, 10) - 1]} ${y}`; 

            if(!transactionData[formattedMonthKey]) { 
                transactionData[formattedMonthKey] = []; 
                activeMonthSheet = formattedMonthKey; 
                renderMonthTabs(); 
                showNotification("Sukses", `Sheet arsip ${formattedMonthKey} berhasil dibuat!`, "success");
            } else { 
                showNotification('Info', 'Sheet arsip periode tersebut sudah ada.', 'info'); 
                activeMonthSheet = formattedMonthKey; 
                renderMonthTabs(); 
            }
        }
        closeCustomPromptModal();
    });
}

function closeCustomPromptModal() {
    const modal = document.getElementById('custom-prompt-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function confirmDeleteMonthSheet(monthKey) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    
    const keys = Object.keys(transactionData);
    if(keys.length <= 1) {
        return showNotification("Peringatan", "Tidak dapat menghapus satu-satunya sheet yang tersisa.", "warning");
    }

    showConfirmModal("Konfirmasi Hapus Sheet", `Apakah Anda yakin ingin menghapus seluruh arsip sheet bulan "${monthKey}" beserta data transaksinya secara permanen?`, async () => {
        delete transactionData[monthKey];

        const remainingKeys = Object.keys(transactionData).sort();
        activeMonthSheet = remainingKeys[remainingKeys.length - 1];

        renderMonthTabs();
        updateDashboard();
        renderFinancialChart();

        showNotification("Sukses", `Sheet arsip ${monthKey} berhasil dihapus dari sistem.`, "success");
    });
}

function setupCurrencyFormatter(id) {
    const input = document.getElementById(id);
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let value = this.value.replace(/[^0-9]/g, '');
        if (value) {
            this.value = parseInt(value, 10).toLocaleString('id-ID');
        } else {
            this.value = '';
        }
    });
}

function getCleanNumber(id) {
    const el = document.getElementById(id);
    if (!el || !el.value) return 0;
    return parseInt(el.value.replace(/\./g, ''), 10) || 0;
}

function toggleCompactView(forceState = null) {
    isCompact = forceState !== null ? forceState : !isCompact;
    const tables = document.querySelectorAll('table');
    const statusText = document.getElementById('compact-status');
    
    tables.forEach(table => {
        if (isCompact) table.classList.add('compact-mode');
        else table.classList.remove('compact-mode');
    });

    if (statusText) {
        statusText.textContent = isCompact ? 'ON' : 'OFF';
        statusText.className = isCompact ? 'text-emerald-500 font-bold' : 'opacity-50';
    }
    localStorage.setItem('snackloop_compact', isCompact);
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    const icon = document.getElementById('dark-mode-icon');
    
    if (isDark) {
        icon.innerText = 'light_mode';
        localStorage.setItem('snackloop_theme', 'dark');
    } else {
        icon.innerText = 'dark_mode';
        localStorage.setItem('snackloop_theme', 'light');
    }

    if(document.getElementById('tab-dashboard').classList.contains('hidden') === false) {
        renderFinancialChart();
    }
}

// ======================= 1. LOGIN & AUTH ======================= //
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', u)
        .eq('password', p);
        
    if (error || !data || data.length === 0) {
        showNotification("Gagal", "Username atau Password salah.", "error");
        document.getElementById('login-password').value = '';
        return;
    }
    
    const userInfo = data[0];
    currentUser = userInfo.username;
    currentRole = userInfo.role;
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('current-user-label').innerText = `${currentUser} (${currentRole.toUpperCase()})`;
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    if (currentRole === 'super_admin') {
        document.getElementById('nav-item-users').style.display = 'block';
    } else {
        document.getElementById('nav-item-users').style.display = 'none';
        ['form-transaksi-card', 'form-repack-card', 'form-master-card', 'form-customer-card', 'form-agent-card'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }
    
    initApp();
    showNotification("Sukses", `Selamat datang kembali, ${currentUser}!`, "success");
});

function logoutApp() {
    currentUser = null;
    currentRole = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    switchTab('dashboard');
    showNotification("Info", "Berhasil keluar dari aplikasi.", "info");
}

async function initApp() {
    await loadDataFromCloud();
    feather.replace();

    const dateInput = document.getElementById('t-date');
    if(dateInput && !dateInput.value) dateInput.valueAsDate = new Date();
    
    const expDateInput = document.getElementById('exp-date');
    if(expDateInput && !expDateInput.value) expDateInput.valueAsDate = new Date();
    
    const currentMonthKey = getCurrentMonthKey(new Date());
    if(!transactionData[currentMonthKey]) transactionData[currentMonthKey] = [];
    if(!activeMonthSheet) activeMonthSheet = currentMonthKey;

    renderAgents();
    renderDropdowns(); 
    renderMonthTabs(); 
    setDashboardTimeFilter('all');

    renderRepackWarehouse();
    renderMaster();
    renderCustomer();
    renderInvoicesTable();
    if(currentRole === 'super_admin') renderUsers();
}

async function loadDataFromCloud() {
    try {
        const [resAgent, resMaster, resCust, resRepack, resTrx, resExp, resUsers, resInv, resHistory] = await Promise.all([
            supabaseClient.from('agents').select('*'),
            supabaseClient.from('master').select('*'),
            supabaseClient.from('customers').select('*'),
            supabaseClient.from('repack').select('*'),
            supabaseClient.from('transactions').select('*'),
            supabaseClient.from('expenses').select('*'),
            supabaseClient.from('users').select('id, username, role'),
            supabaseClient.from('invoices').select('*'),
            supabaseClient.from('price_history').select('*')
        ]);

        agentData = resAgent.data || [];
        masterData = resMaster.data || [];
        customerData = resCust.data || [];
        repackData = resRepack.data || [];
        expenseData = resExp.data || [];
        userData = resUsers.data || [];
        invoiceData = resInv.data || [];
        priceHistoryData = resHistory.data || [];

        transactionData = {};
        (resTrx.data || []).forEach(t => {
            const formatted = {
                id: t.id, monthKey: t.month_key, date: t.date, customer: t.customer,
                itemName: t.item_name, source: t.source, qty: t.qty, batch: t.batch,
                buy: t.buy, extraCost: t.extra_cost || 0, extraCostNote: t.extra_cost_note || '-',
                totalModal: t.total_modal, sell: t.sell, totalSell: t.total_sell,
                status: t.status, profitPerItem: t.profit_per_item, notes: t.notes || '-'
            };
            if(!transactionData[formatted.monthKey]) transactionData[formatted.monthKey] = [];
            transactionData[formatted.monthKey].push(formatted);
        });

        saveCacheToLocal();
    } catch (err) { console.error("Gagal sinkronisasi Supabase:", err); }
}

function getCurrentMonthKey(dateObj) { 
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]; 
    return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`; 
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.navbar__link').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.remove('hidden');
    
    const activeBtn = document.getElementById('btn-' + tabId);
    if(activeBtn) activeBtn.classList.add('active');

    const titles = { 
        'dashboard': 'Dashboard Keuangan', 
        'transactions': 'Buku Transaksi', 
        'invoices': 'Manajemen Invoice',
        'calculator': 'Kalkulator & Gudang Repack', 
        'master': 'Data Master Produk', 
        'customers': 'Manajemen Pelanggan', 
        'agents': 'Kelola Agent Pool',
        'users': 'Kelola Akun User' 
    };
    const pageTitleEl = document.getElementById('page-title');
    if(pageTitleEl) pageTitleEl.innerText = titles[tabId] || 'SnackLoop ERP';

    if(tabId === 'dashboard') {
        updateDashboard();
        setTimeout(() => { renderFinancialChart(); }, 100);
    }
    if(tabId === 'transactions') renderMonthTabs();
    if(tabId === 'invoices') renderInvoicesTable();
}

// ======================= 4. MANAJEMEN AGENT POOL ======================= //
function renderAgents() {
    const tbody = document.getElementById('agent-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    agentData.forEach((ag) => {
        const action = currentRole === 'super_admin' ? `<button onclick="confirmDeleteAgent(${ag.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-mono opacity-60">#${ag.id}</td>
                <td class="p-3 border border-inherit font-semibold">${ag.name}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
    updateAgentDropdowns();
}

function confirmDeleteAgent(id) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus agen ini dari pool?", async () => {
        const { error } = await supabaseClient.from('agents').delete().eq('id', id);
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud();
        renderAgents();
        showNotification("Sukses", "Data berhasil dihapus", "success");
    });
}

function updateAgentDropdowns() {
    const selects = ['m-source', 't-source', 'edit-m-source'];
    selects.forEach(selId => {
        const el = document.getElementById(selId);
        if(el) {
            const currentVal = el.value;
            el.innerHTML = `<option value="" disabled selected> Pilih Agen </option>`;
            if(selId === 't-source') {
                el.innerHTML += `<option value="Repack">Gudang Repack</option>`;
            }
            agentData.forEach(ag => {
                el.innerHTML += `<option value="${ag.name}">${ag.name}</option>`;
            });
            el.value = currentVal;
        }
    });
}

document.getElementById('agent-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const name = document.getElementById('ag-name').value.trim();
    
    const { error } = await supabaseClient.from('agents').insert([{ name }]);
    if(error) return showNotification("Gagal", error.message, "error");
    
    await loadDataFromCloud();
    renderAgents();
    this.reset();
    showNotification("Sukses", "Agen baru berhasil ditambahkan!", "success");
});

// ======================= 5. MANAJEMEN USER & BACKUP/RESTORE ======================= //
async function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    userData.forEach((u) => {
        const deleteBtn = u.username === 'admin' ? `<span class="text-xs opacity-40">Utama</span>` : `<button onclick="confirmDeleteUser(${u.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>`;
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${u.username}</td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-600 rounded text-[10px] font-bold">${u.role}</span></td>
                <td class="p-3 border border-inherit text-center">${deleteBtn}</td>
            </tr>`;
    });
}

function confirmDeleteUser(id) {
    if(currentRole !== 'super_admin') return;
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus akun pengguna ini?", async () => {
        const { error } = await supabaseClient.from('users').delete().eq('id', id);
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud(); 
        renderUsers();
        showNotification("Sukses", "Data berhasil dihapus", "success");
    });
}

document.getElementById('user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    
    const username = document.getElementById('u-name').value.trim();
    const password = document.getElementById('u-pass').value.trim();
    
    const { error } = await supabaseClient.from('users').insert([{ username, password, role: 'view' }]);
    if(error) return showNotification("Gagal", error.message, "error");
    
    await loadDataFromCloud(); 
    renderUsers(); 
    this.reset(); 
    showNotification("Sukses", "Akun View berhasil dibuat!", "success");
});

function backupDataJSON() {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const backupObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `SnackLoop_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showNotification("Sukses", "File backup lokal berhasil diunduh.", "success");
}

function restoreDataJSON(event) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            showNotification("Info", "Data backup terbaca. Sinkronisasi sukses.", "info");
        } catch(err) {
            showNotification("Gagal", "Format file backup tidak valid.", "error");
        }
    };
    reader.readAsText(file);
}

// ======================= 6. MASTER & CUSTOMER (DENGAN PRICE HISTORY) ======================= //
async function renderMaster() {
    const tbody = document.getElementById('master-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    masterData.forEach((m) => {
        const canEdit = currentRole === 'super_admin';
        const actionBtns = canEdit ? `
            <button onclick="openEditMasterModal(${m.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
            <button onclick="confirmDeleteMaster(${m.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>
        ` : `
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
        `;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${m.name}</td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 theme-input border rounded text-[10px] font-bold">${m.source}</span></td>
                <td class="p-3 border border-inherit">Rp ${m.buy.toLocaleString()}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${m.sell.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${actionBtns}</td>
            </tr>`;
    });
}

function openEditMasterModal(id) {
    const item = masterData.find(m => m.id === id);
    if(!item) return;

    document.getElementById('edit-m-id').value = item.id;
    document.getElementById('edit-m-name').value = item.name;
    document.getElementById('edit-m-buy').value = item.buy.toLocaleString('id-ID');
    document.getElementById('edit-m-sell').value = item.sell.toLocaleString('id-ID');

    updateAgentDropdowns();
    document.getElementById('edit-m-source').value = item.source;

    const modal = document.getElementById('edit-master-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeEditMasterModal() {
    const modal = document.getElementById('edit-master-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

document.getElementById('edit-master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");

    const id = parseInt(document.getElementById('edit-m-id').value);
    const newName = document.getElementById('edit-m-name').value.trim();
    const newSource = document.getElementById('edit-m-source').value;
    const newBuy = getCleanNumber('edit-m-buy');
    const newSell = getCleanNumber('edit-m-sell');

    const oldItem = masterData.find(m => m.id === id);
    if(!oldItem) return;

    if(oldItem.buy !== newBuy) {
        await supabaseClient.from('price_history').insert([{
            master_id: id,
            product_name: newName,
            old_buy: oldItem.buy,
            new_buy: newBuy,
            old_sell: oldItem.sell,
            new_sell: newSell,
            changed_by: currentUser
        }]);
    }

    const { error } = await supabaseClient.from('master').update({
        name: newName,
        source: newSource,
        buy: newBuy,
        sell: newSell
    }).eq('id', id);

    if(error) return showNotification("Gagal", error.message, "error");

    await loadDataFromCloud();
    renderMaster();
    closeEditMasterModal();
    showNotification("Sukses", "Master produk dan riwayat harga berhasil diperbarui!", "success");
});

function openHistoryModal(masterId) {
    const item = masterData.find(m => m.id === masterId);
    if(!item) return;

    document.getElementById('history-product-title').innerText = item.name;
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    const histories = priceHistoryData.filter(h => h.master_id === masterId).sort((a,b) => new Date(b.changed_at) - new Date(a.changed_at));

    if(histories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center opacity-60">Belum ada riwayat perubahan harga untuk produk ini.</td></tr>`;
    } else {
        histories.forEach(h => {
            const diff = h.new_buy - h.old_buy;
            const diffBadge = diff > 0 ? 
                `<span class="text-rose-500 font-bold">+Rp ${diff.toLocaleString()} (Naik)</span>` : 
                diff < 0 ? `<span class="text-emerald-500 font-bold">-Rp ${Math.abs(diff).toLocaleString()} (Turun)</span>` : `<span class="opacity-50">Tetap</span>`;

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/50">
                    <td class="p-2.5 border border-inherit">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                    <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit">${diffBadge}</td>
                </tr>`;
        });
    }

    const modal = document.getElementById('history-master-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeHistoryModal() {
    const modal = document.getElementById('history-master-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function confirmDeleteMaster(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus produk master ini?", async () => {
        const { error } = await supabaseClient.from('master').delete().eq('id', id); 
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud(); 
        renderMaster(); 
        showNotification("Sukses", "Data berhasil dihapus", "success");
    });
}

document.getElementById('master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan.", "warning");
    
    let rawName = document.getElementById('m-name').value.trim();
    let normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    await supabaseClient.from('master').insert([{
        name: normalizedName, 
        source: document.getElementById('m-source').value,
        buy: getCleanNumber('m-buy'),
        sell: getCleanNumber('m-sell')
    }]);
    
    await loadDataFromCloud(); 
    renderMaster(); 
    this.reset(); 
    showNotification("Sukses", "Master produk tersimpan", "success");
});

async function renderCustomer() {
    const tbody = document.getElementById('cust-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    customerData.forEach((c) => {
        const action = currentRole === 'super_admin' ? `<button onclick="confirmDeleteCustomer(${c.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${c.name}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">+${c.phone}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
}

function confirmDeleteCustomer(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus pelanggan ini?", async () => {
        const { error } = await supabaseClient.from('customers').delete().eq('id', id); 
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud(); 
        renderCustomer(); 
        renderDropdowns(); 
        showNotification("Sukses", "Data berhasil dihapus", "success");
    });
}

document.getElementById('cust-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    
    let rawCust = document.getElementById('cu-name').value.trim();
    let normCust = rawCust.charAt(0).toUpperCase() + rawCust.slice(1);
    let rawPhone = document.getElementById('cu-phone').value.trim().replace(/^0/, '62');

    await supabaseClient.from('customers').insert([{ name: normCust, phone: rawPhone }]);
    await loadDataFromCloud(); renderCustomer(); renderDropdowns(); this.reset(); 
    showNotification("Sukses", "Pelanggan tersimpan", "success");
});

// ======================= 7. REPACK WAREHOUSE ======================= //
function calculateRepack() {
    const name = document.getElementById('c-name').value || 'Produk Repack';
    const price = getCleanNumber('c-price');
    const disc = getCleanNumber('c-disc');
    const fee = getCleanNumber('c-fee');
    const qty = parseInt(document.getElementById('c-qty').value) || 1;
    const plastic = getCleanNumber('c-plastic');
    const sellTarget = getCleanNumber('c-sell');

    const buyPerItem = (price - disc + fee) / qty;
    const finalModal = Math.ceil(buyPerItem + plastic);
    const estProfit = (sellTarget - finalModal) * qty;

    document.getElementById('calc-res').classList.remove('hidden');
    document.getElementById('res-final').innerHTML = `HPP / Modal: <b>Rp ${finalModal.toLocaleString()}</b> /pcs`;
    document.getElementById('res-profit').innerHTML = `Potensi Keuntungan Batch: <b>Rp ${estProfit.toLocaleString()}</b>`;

    currentRepackCalcResult = {
        id: `BATCH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().slice(0, 10),
        name, modal_per_pcs: finalModal, sell_target: sellTarget, initial_qty: qty, remaining_qty: qty
    };
    if(currentRole === 'super_admin') document.getElementById('btn-save-repack').classList.remove('hidden');
    showNotification("Sukses", "Perhitungan HPP berhasil!", "success");
}

async function saveToRepackWarehouse() {
    if(!currentRepackCalcResult || currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    await supabaseClient.from('repack').insert([currentRepackCalcResult]);
    await loadDataFromCloud(); renderRepackWarehouse(); onSourceChange(); 
    showNotification("Sukses", "Batch masuk ke Gudang Repack", "success");
    currentRepackCalcResult = null;
    document.getElementById('btn-save-repack').classList.add('hidden');
    document.getElementById('calc-res').classList.add('hidden');
    ['c-name', 'c-price', 'c-disc', 'c-fee', 'c-qty', 'c-plastic', 'c-sell'].forEach(id => document.getElementById(id).value = '');
}

function renderRepackWarehouse() {
    const tbody = document.getElementById('repack-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    repackData.forEach((r) => {
        const outOfStock = r.remaining_qty <= 0;
        const bgClass = outOfStock ? 'opacity-50' : 'hover:bg-slate-50/50';
        const badge = outOfStock ? `<span class="bg-rose-500/20 text-rose-500 px-2 rounded font-bold">HABIS</span>` : `<span class="font-bold text-lg text-emerald-500">${r.remaining_qty}</span>`;
        const action = currentRole === 'super_admin' ? `<button onclick="confirmDeleteRepackBatch('${r.id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        tbody.innerHTML += `
            <tr class="${bgClass}">
                <td class="p-3 border border-inherit font-mono text-indigo-500 font-bold">${r.id} <br><span class="text-[9px] opacity-60">${r.date}</span></td>
                <td class="p-3 border border-inherit font-semibold">${r.name}</td>
                <td class="p-3 border border-inherit opacity-70">Rp ${r.modal_per_pcs.toLocaleString()}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${r.sell_target.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${r.initial_qty}</td>
                <td class="p-3 border border-inherit text-center">${badge}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
}

function confirmDeleteRepackBatch(batchId) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus Batch Repack ini secara permanen?", async () => {
        const { error } = await supabaseClient.from('repack').delete().eq('id', batchId); 
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud(); 
        renderRepackWarehouse(); 
        onSourceChange(); 
        showNotification("Sukses", "Data berhasil dihapus", "success");
    });
}

// ======================= 8. KASIR & TRANSAKSI ======================= //
function renderDropdowns() {
    const tCust = document.getElementById('t-customer');
    if(tCust) {
        tCust.innerHTML = `<option value="" disabled selected>Pilih Pelanggan</option>`;
        customerData.forEach(c => { tCust.innerHTML += `<option value="${c.name}">${c.name}</option>`; });
    }
    updateAgentDropdowns();
}

function onSourceChange() {
    const src = document.getElementById('t-source').value;
    const prodSel = document.getElementById('t-product');
    prodSel.innerHTML = `<option value="" disabled selected>Pilih Produk</option>`;
    document.getElementById('t-batch').value = ""; document.getElementById('t-buy').value = ''; document.getElementById('t-sell').value = ''; document.getElementById('t-qty').max = ""; document.getElementById('t-qty').value = "1";

    if(!src) return;
    if(src === 'Repack') {
        let hasStock = false;
        repackData.forEach((r) => {
            if(r.remaining_qty > 0) { prodSel.innerHTML += `<option value="REPACK|${r.id}">[Sisa: ${r.remaining_qty}] ${r.name}</option>`; hasStock = true; }
        });
        if(!hasStock) prodSel.innerHTML = `<option value="" disabled selected>Gudang Repack Kosong</option>`;
    } else {
        masterData.forEach((m) => {
            if(m.source === src) prodSel.innerHTML += `<option value="MASTER|${m.id}">${m.name} (Modal: Rp${m.buy.toLocaleString()})</option>`;
        });
    }
}

function fillProductData() {
    const val = document.getElementById('t-product').value;
    if(!val) return;
    const parts = val.split('|'); const type = parts[0]; const id = parts[1];

    if(type === 'REPACK') {
        const item = repackData.find(r => r.id === id);
        document.getElementById('t-buy').value = item.modal_per_pcs.toLocaleString('id-ID');
        document.getElementById('t-sell').value = item.sell_target.toLocaleString('id-ID');
        document.getElementById('t-batch').value = item.id;
        document.getElementById('t-qty').max = item.remaining_qty;
    } else {
        const item = masterData.find(m => m.id === parseInt(id));
        document.getElementById('t-buy').value = item.buy.toLocaleString('id-ID');
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
    const buy = getCleanNumber('t-buy');
    const extraCost = getCleanNumber('t-extracost');
    const extraCostNote = document.getElementById('t-extracostnote').value.trim() || '-';
    const sell = getCleanNumber('t-sell');
    const status = document.getElementById('t-status').value;
    const notes = document.getElementById('t-notes').value.trim() || '-';
    
    let itemName = ""; let batchId = document.getElementById('t-batch').value || 'Reguler';

    if(source === 'Repack') {
        const rItem = repackData.find(r => r.id === batchId);
        if(!rItem) return showNotification("Peringatan", "Pilih batch produk Repack dengan benar.", "warning");
        if(qty > rItem.remaining_qty) return showNotification("Peringatan", `Stok ${rItem.name} hanya sisa ${rItem.remaining_qty}.`, "warning");
        itemName = rItem.name;
        await supabaseClient.from('repack').update({ remaining_qty: rItem.remaining_qty - qty }).eq('id', batchId);
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
    
    const { error } = await supabaseClient.from('transactions').insert([{
        month_key: monthKey, date, customer, item_name: itemName, source, qty, batch: batchId,
        buy, extra_cost: extraCost, extra_cost_note: extraCostNote, total_modal: totalModalComputed, 
        sell, total_sell: totalSellComputed, status, profit_per_item: netProfitItem, notes
    }]);

    if(error) {
        showNotification("Gagal", error.message, "error");
        return;
    }

    const invNumber = `INV-${date.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;
    await supabaseClient.from('invoices').insert([{
        invoice_number: invNumber,
        date: date,
        customer_name: customer,
        total_amount: totalSellComputed,
        status: status,
        notes: notes
    }]);

    await loadDataFromCloud(); 
    activeMonthSheet = monthKey;
    renderMonthTabs(); 
    updateDashboard(); 
    renderRepackWarehouse();
    renderFinancialChart();
    renderInvoicesTable();
    
    showNotification("Sukses", "Data penjualan berhasil disimpan", "success");
    
    this.reset(); 
    document.getElementById('t-date').valueAsDate = new Date();
    document.getElementById('t-product').innerHTML = `<option value="" disabled selected>Pilih Sumber Dulu</option>`;
});

async function renderInvoicesTable() {
    const tbody = document.getElementById('invoices-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(invoiceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center opacity-60">Belum ada data invoice tercatat.</td></tr>`;
        return;
    }

    invoiceData.forEach(inv => {
        const badgeStatus = inv.status === 'Lunas' ? 
            `<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-full font-bold">LUNAS</span>` : 
            `<span class="px-2.5 py-1 bg-rose-500/20 text-rose-500 rounded-full font-bold">BELUM LUNAS</span>`;
        
        const btnLunasi = inv.status !== 'Lunas' ? 
            `<button onclick="markInvoiceAsPaid(${inv.id}, '${inv.customer_name}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-check mr-1"></i> Lunasi</button>` : 
            `<span class="text-xs opacity-50 font-medium">Selesai</span>`;

        const btnDelete = currentRole === 'super_admin' ? 
            `<button onclick="confirmDeleteInvoice(${inv.id}, '${inv.invoice_number}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-mono font-bold text-indigo-500">${inv.invoice_number}</td>
                <td class="p-3 border border-inherit">${inv.date}</td>
                <td class="p-3 border border-inherit font-bold">${inv.customer_name}</td>
                <td class="p-3 border border-inherit font-bold">Rp ${inv.total_amount.toLocaleString()}</td>
                <td class="p-3 border border-inherit">${badgeStatus}</td>
                <td class="p-3 border border-inherit text-center space-x-1">
                    <button onclick="downloadInvoicePDF('${inv.invoice_number}', '${inv.status}')" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs" title="Download PDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                    <button onclick="sendInvoiceWA('${inv.invoice_number}', '${inv.customer_name}', ${inv.total_amount}, '${inv.status}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs" title="Kirim WA"><i class="fa-brands fa-whatsapp"></i> WA</button>
                    ${btnLunasi}
                    ${btnDelete}
                </td>
            </tr>`;
    });
}

function confirmDeleteInvoice(invId, invNumber) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", `Apakah Anda yakin ingin menghapus invoice ${invNumber} secara permanen?`, async () => {
        const { error } = await supabaseClient.from('invoices').delete().eq('id', invId);
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud();
        renderInvoicesTable();
        updateDashboard();
        showNotification("Sukses", "Data berhasil di hapus", "success");
    });
}

async function markInvoiceAsPaid(invId, custName) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    
    await supabaseClient.from('invoices').update({ status: 'Lunas' }).eq('id', invId);

    for(let mk in transactionData) {
        transactionData[mk].forEach(async (t) => {
            if(t.customer === custName && t.status === 'Belum Lunas') {
                await supabaseClient.from('transactions').update({ status: 'Lunas' }).eq('id', t.id);
            }
        });
    }

    await loadDataFromCloud();
    renderInvoicesTable();
    updateDashboard();
    renderFinancialChart();
    
    showNotification("Sukses", "Invoice berhasil dilunasi dan diperbarui ke sistem!", "success");
}

async function downloadInvoicePDF(invNumber, statusInv) {
    const inv = invoiceData.find(i => i.invoice_number === invNumber);
    if(!inv) return showNotification("Gagal", "Invoice tidak ditemukan.", "error");

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
    container.innerHTML = '';
    let keys = Object.keys(transactionData).sort();
    if(keys.length === 0) { keys = [getCurrentMonthKey(new Date())]; transactionData[keys[0]] = []; }
    if(!activeMonthSheet || !transactionData[activeMonthSheet]) activeMonthSheet = keys[keys.length-1];

    keys.forEach(mk => {
        const isActive = mk === activeMonthSheet;
        
        let deleteBtnHtml = '';
        if (currentRole === 'super_admin' && keys.length > 1) {
            deleteBtnHtml = `<span onclick="event.stopPropagation(); confirmDeleteMonthSheet('${mk}')" class="ml-1.5 opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 text-[10px]" title="Hapus Sheet"><i class="fa-solid fa-xmark"></i></span>`;
        }

        container.innerHTML += `
            <button onclick="activeMonthSheet='${mk}'; currentTransactionPage=1; renderMonthTabs();" class="px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'theme-input hover:opacity-80'}">
                <span>${mk}</span>
                ${deleteBtnHtml}
            </button>`;
    });
    
    if(currentRole === 'super_admin') {
        container.innerHTML += `<button onclick="createNewMonthSheet()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/25 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/35 transition shadow-sm ml-1 flex items-center gap-1.5"><i class="fa-solid fa-calendar-plus"></i> <span>+ Pilih Bulan</span></button>`;
    }

    renderTransactionsForActiveSheet();
}

function filterTrxStatus(st) {
    currentTransactionFilter = st;
    currentTransactionPage = 1; // Reset halaman ke 1 saat filter status diganti
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
function filterTable() {
    const input = document.getElementById('quick-search');
    currentSearchKeyword = input ? input.value.toLowerCase() : '';
    currentTransactionPage = 1; // Reset ke halaman 1 saat mengetik pencarian
    renderTransactionsForActiveSheet();
}

function renderTransactionsForActiveSheet() {
    document.getElementById('table-sheet-heading').innerText = `Tabel Penjualan: ${activeMonthSheet}`;
    const tbody = document.getElementById('trx-table-body'); 
    tbody.innerHTML = '';
    
    const list = transactionData[activeMonthSheet] || [];
    
    // In-memory filtering (Status & Search Keyword)
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

    // Pagination Slicing
    const totalPages = Math.ceil(filteredList.length / rowsPerPage);
    if(currentTransactionPage > totalPages) currentTransactionPage = totalPages || 1;
    const startIndex = (currentTransactionPage - 1) * rowsPerPage;
    const paginatedList = filteredList.slice(startIndex, startIndex + rowsPerPage);

    paginatedList.forEach((t) => {
        const itemProfit = t.profitPerItem * t.qty;
        const statusDropdown = currentRole === 'super_admin' ? 
            `<select onchange="updateTrxStatus(${t.id}, this.value)" class="text-[11px] font-bold px-2 py-1 rounded border cursor-pointer outline-none ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}"><option value="Lunas" ${t.status === 'Lunas' ? 'selected' : ''}>Lunas</option><option value="Belum Lunas" ${t.status === 'Belum Lunas' ? 'selected' : ''}>Belum Lunas</option></select>` :
            `<span class="px-2 py-1 rounded text-xs font-bold ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}">${t.status}</span>`;

        const srcBadge = t.source === 'Repack' ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-500 px-1 rounded font-bold">${t.batch}</span>` : `<span class="text-[9px] theme-input border px-1 rounded font-bold">${t.source}</span>`;
        const notesDisplay = t.notes && t.notes !== '-' ? `<span class="block text-[10px] text-amber-500 italic">Notes: ${t.notes}</span>` : '';
        const extraCostDisplay = t.extraCost > 0 ? `<span class="text-amber-500 font-bold">+Rp ${t.extraCost.toLocaleString()}</span><br><span class="text-[9px] opacity-70 italic">(${t.extraCostNote})</span>` : `<span class="opacity-40">-</span>`;
        
        const actionBtn = currentRole === 'super_admin' ? `
            <button onclick="downloadPDF(${t.id})" title="Download PDF" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-file-pdf"></i></button>
            <button onclick="sendWhatsAppOnly(${t.id})" title="Kirim WA" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-brands fa-whatsapp"></i></button>
            <button onclick="confirmDeleteTrx(${t.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : `
            <button onclick="downloadPDF(${t.id})" title="Download PDF" class="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-file-pdf"></i></button>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit">${t.date}</td>
                <td class="p-3 border border-inherit font-bold text-indigo-500">${t.customer}</td>
                <td class="p-3 border border-inherit font-medium">${t.itemName} <br>${srcBadge} ${notesDisplay}</td>
                <td class="p-3 border border-inherit text-center font-bold">${t.qty}</td>
                <td class="p-3 border border-inherit text-center">${extraCostDisplay}</td>
                <td class="p-3 border border-inherit opacity-70">Rp ${t.totalModal.toLocaleString()}</td>
                <td class="p-3 border border-inherit font-bold">Rp ${t.totalSell.toLocaleString()}</td>
                <td class="p-3 border border-inherit">${statusDropdown}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">Rp ${itemProfit.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center space-x-1">${actionBtn}</td>
            </tr>`;
    });

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
        const trx = (transactionData[activeMonthSheet] || []).find(t => t.id === id);
        if(trx && trx.source === 'Repack') {
            const rItem = repackData.find(r => r.id === trx.batch);
            if(rItem) await supabaseClient.from('repack').update({ remaining_qty: rItem.remaining_qty + trx.qty }).eq('id', trx.batch);
        }
        
        const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
        if(error) return showNotification("Gagal", error.message, "error");

        await loadDataFromCloud(); 
        renderTransactionsForActiveSheet(); 
        updateDashboard(); 
        renderFinancialChart();
        renderRepackWarehouse();
        
        showNotification("Sukses", "Data berhasil di hapus", "success");
    });
}

async function updateTrxStatus(id, newStatus) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    await supabaseClient.from('transactions').update({ status: newStatus }).eq('id', id);
    await loadDataFromCloud(); renderTransactionsForActiveSheet(); updateDashboard();
    renderFinancialChart();
    showNotification("Sukses", "Status transaksi diperbarui.", "success");
}

async function downloadPDF(trxId) {
    let targetTrx = null;
    for(let m in transactionData) {
        const found = transactionData[m].find(t => t.id === trxId);
        if(found) { targetTrx = found; break; }
    }
    if (!targetTrx) return showNotification('Gagal', 'Data tidak valid!', 'error');
    
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
    tbody.innerHTML = '';

    matchingTransactions.forEach(t => {
        grandTotal += t.totalSell;
        tbody.innerHTML += `
            <tr class="border-b border-slate-200">
                <td class="py-3 pr-2 font-medium">${t.itemName} <span class="text-xs opacity-60">(${t.source})</span></td>
                <td class="py-3 px-2 text-center">${t.qty}</td>
                <td class="py-3 px-2 text-right">Rp ${(t.totalSell / t.qty).toLocaleString()}</td>
                <td class="py-3 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    });

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
    tbody.innerHTML = '';

    list.forEach((t, index) => {
        const itemProfit = (t.profitPerItem * t.qty);
        totalPendapatan += t.totalSell;
        totalModal += t.totalModal;
        if(t.status === 'Lunas') totalKeuntungan += itemProfit;

        tbody.innerHTML += `
            <tr class="border-b border-slate-200 text-xs">
                <td class="py-2.5 pr-2">${index + 1}. ${t.date} - <b>${t.customer}</b><br><span class="opacity-70">${t.itemName} (${t.qty}x)</span></td>
                <td class="py-2.5 px-2 text-center">${t.status}</td>
                <td class="py-2.5 px-2 text-right">Rp ${t.totalModal.toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    });

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
    const phone = custObj ? custObj.phone : '628123456789';

    let msg = `*NOTA SNACKLOOP (${targetTrx.monthKey})* Kepada: *${targetTrx.customer}* Tanggal: ${targetTrx.date}%0A`;
    msg += `-----------------------------------%0A` + itemsText + `-----------------------------------%0A`;
    msg += `*TOTAL: Rp ${total.toLocaleString()}* Status: *${targetTrx.status}* Terima kasih!`;

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

    const { error } = await supabaseClient.from('expenses').insert([{ date, description, amount }]);
    if(error) return showNotification("Gagal", error.message, "error");

    await loadDataFromCloud();
    updateDashboard();
    renderFinancialChart();
    closeExpenseModal();
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
    showNotification("Sukses", "Biaya operasional berhasil dicatat!", "success");
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

    document.getElementById('stat-Pendapatan').innerText = 'Rp ' + Pendapatan.toLocaleString();
    document.getElementById('stat-expense').innerText = 'Rp ' + totalExpense.toLocaleString();
    document.getElementById('stat-Keuntungan').innerText = 'Rp ' + NetProfitFinal.toLocaleString();
    document.getElementById('stat-Hutang').innerText = 'Rp ' + Hutang.toLocaleString();
    
    const labelsDesc = { 'today': 'Hari Ini', '7days': '7 Hari Terakhir', '30days': '30 Hari Terakhir', 'all': 'Keseluruhan' };
    document.getElementById('stat-Pendapatan-desc').innerText = labelsDesc[currentDashboardTimeFilter];

    renderTopProducts(productSalesMap);
    renderDashboardHistory(); 

    const uBody = document.getElementById('dashboard-unpaid-body');
    document.getElementById('unpaid-badge').innerText = `${unpaidList.length} Item`;
    if(uBody) {
        uBody.innerHTML = unpaidList.length === 0 ? `<tr><td colspan="6" class="p-4 text-center opacity-60">Tidak ada Piutang aktif. Mantap!</td></tr>` : '';
        unpaidList.forEach(t => {
            const btnLunasi = currentRole === 'super_admin' ? `<button onclick="updateTrxStatus(${t.id}, 'Lunas')" class="bg-indigo-500/25 text-indigo-500 px-2 py-1 rounded text-[11px] font-bold">Lunasi</button>` : '-';
            const custObj = customerData.find(c => c.name === t.customer);
            const phone = custObj ? custObj.phone : '628123456789';
            const waText = `Halo Kak ${t.customer}, pengingat tagihan SnackLoop sebesar Rp ${t.totalSell.toLocaleString()} untuk pesanan ${t.itemName}. Terima kasih!`;
            const waBtn = `<button onclick="window.open('https://wa.me/${phone}?text=${encodeURIComponent(waText)}', '_blank')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold"><i class="fa-brands fa-whatsapp"></i> Tagih WA</button>`;
            
            uBody.innerHTML += `
                <tr class="hover:bg-slate-50/50">
                    <td class="p-2.5 border border-inherit">${t.date} <br><span class="text-[9px] opacity-60">${t.monthKey}</span></td>
                    <td class="p-2.5 border border-inherit font-bold text-indigo-500">${t.customer}</td>
                    <td class="p-2.5 border border-inherit font-medium">${t.itemName} (${t.qty}x)</td>
                    <td class="p-2.5 border border-inherit font-bold text-rose-500">Rp ${t.totalSell.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit text-center">${waBtn}</td>
                    <td class="p-2.5 border border-inherit text-center">${btnLunasi}</td>
                </tr>`;
        });
    }
}

function renderDashboardHistory() {
    const tbody = document.getElementById('dashboard-history-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    const sortedHistory = [...priceHistoryData].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at)).slice(0, 5);

    if(sortedHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center opacity-60">Belum ada riwayat kenaikan harga modal tercatat.</td></tr>`;
        return;
    }

    sortedHistory.forEach(h => {
        const diff = h.new_buy - h.old_buy;
        const diffBadge = diff > 0 ? 
            `<span class="text-rose-500 font-bold">+Rp ${diff.toLocaleString()} (Naik)</span>` : 
            diff < 0 ? `<span class="text-emerald-500 font-bold">-Rp ${Math.abs(diff).toLocaleString()} (Turun)</span>` : `<span class="opacity-50">Tetap</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-2.5 border border-inherit opacity-70">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                <td class="p-2.5 border border-inherit font-bold text-indigo-500">${h.product_name}</td>
                <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                <td class="p-2.5 border border-inherit">${diffBadge}</td>
                <td class="p-2.5 border border-inherit font-medium">${h.changed_by || 'admin'}</td>
            </tr>`;
    });
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

    container.innerHTML = '';
    sortedProducts.forEach((p, idx) => {
        container.innerHTML += `
            <div class="p-4 theme-input border rounded-2xl flex flex-col justify-between space-y-2 shadow-sm">
                <div class="flex justify-between items-start">
                    <span class="text-xs font-bold opacity-60">#${idx + 1}</span>
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 font-bold rounded text-[10px]">${p.qty} Terjual</span>
                </div>
                <div>
                    <h4 class="font-bold text-sm line-clamp-1">${p.name}</h4>
                    <p class="text-xs font-semibold text-indigo-500 mt-0.5">Rp ${p.revenue.toLocaleString()}</p>
                </div>
            </div>`;
    });
}

function renderFinancialChart() {
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

    if(financialChartInstance) {
        financialChartInstance.destroy();
    }

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? '#21262d' : '#e2e8f0';

    financialChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.length > 0 ? months : ['Belum Ada Data'],
            datasets: [
                {
                    label: 'Total Pendapatan',
                    data: pendapatanData.length > 0 ? pendapatanData : [0],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1,
                    borderRadius: 8
                },
                {
                    label: 'Keuntungan Bersih',
                    data: keuntunganData.length > 0 ? keuntunganData : [0],
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