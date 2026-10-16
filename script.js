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
let userData = [
    { id: 1, username: 'admin', role: 'super_admin' },
    { id: 2, username: 'staff1', role: 'staff_rekap' },
    { id: 3, username: 'admin_kiky', role: 'super_admin' }
];
let invoiceData = [];
let priceHistoryData = []; 
let returnData = [];
let currentReturnStatusFilter = 'all';
let currentReturnAgentFilter = 'all'; 

let activeMonthSheet = ""; 
let currentTransactionFilter = 'all'; 
let currentDashboardTimeFilter = 'all'; 
let currentRepackCalcResult = null;
let financialChartInstance = null;
let isCompact = false;
let transactionDateSortAsc = true; 
let isSyncing = false;

// State Pagination & In-Memory Search
let currentTransactionPage = 1;
const rowsPerPage = 25;
let currentSearchKeyword = '';

// ======================= SISTEM MULTI-BAHASA (I18N) & TEMA ======================= //
let currentLanguage = localStorage.getItem('snackloop_lang') || 'id';

const I18N = {
    id: {
        // Navigasi Sidebar
        nav_dashboard: "Dashboard",
        nav_transactions: "Buku Transaksi",
        nav_invoices: "Manajemen Invoice",
        nav_returns: "Retur & Klaim Agen",
        nav_reports: "Laporan Bisnis",
        nav_calculator: "Kalkulator Repack",
        nav_master: "Master Produk",
        nav_customers: "Data Pelanggan",
        nav_agents: "Kelola Agen",
        nav_users: "Kelola Pengguna",
        nav_settings: "Pengaturan",
        nav_install: "Pasang App",
        nav_logout: "Keluar",

        // Header & Actions
        btn_install: "Pasang App",
        tab_preferences: "Preferensi Sistem",
        set_modal_title: "Pengaturan Sistem & Profil Usaha",

        // Login Screen
        login_tagline: "Masuk ke Akun Anda",
        login_btn: "Masuk",
        forgot_password_btn: "Lupa Password?",

        // Dashboard
        dash_overview_title: "Ringkasan Performa Usaha",
        dash_overview_subtitle: "Pilih rentang waktu untuk melihat analisis penjualan",
        filter_today: "Hari Ini",
        filter_7days: "7 Hari",
        filter_30days: "30 Hari",
        filter_all: "Keseluruhan",
        filter_all_label: "Semua",
        dash_financial_title: "Pelacak Keuangan & Beban",
        dash_financial_subtitle: "Pendapatan Bersih",
        stat_revenue: "Pendapatan",
        stat_expense: "Biaya Operasional",
        stat_net_profit: "Laba Bersih Final",
        stat_debt: "Total Tagihan Piutang",
        btn_record_expense: "Catat Biaya Operasional",
        dash_memo_title: "Catatan Cepat & Agenda Owner",
        memo_priority: "Prioritas",
        memo_placeholder: "Tulis catatan tugas kilat...",
        btn_save_memo: "Simpan Catatan",

        // Buku Transaksi
        btn_save_sale: "Simpan Penjualan",
        search_trx_placeholder: "Cari transaksi, pelanggan...",
        lbl_filter: "Filter:",
        opt_paid: "Lunas",
        opt_unpaid: "Belum Lunas",
        th_date: "Tgl",
        th_customer: "Pelanggan",
        th_item: "Barang & Catatan",
        th_qty: "Qty",
        th_extracost: "Biaya Operasional & Catatan",
        th_totalmodal: "Total Modal",
        th_totalsell: "Total Jual",
        th_status: "Status",
        th_profit: "Keuntungan",
        th_action: "Aksi",

        // Modal Pengaturan
        tab_profile: "Profil & Nota",
        tab_backup: "Cadangan Data",
        set_theme_label: "Tema Tampilan (Theme)",
        theme_light: "Mode Terang",
        theme_dark: "Mode Gelap",
        set_lang_label: "Bahasa Aplikasi (Language)",
        set_print_label: "Ukuran Kertas & Format Nota Cetak"
    },
    en: {
        // Navigasi Sidebar
        nav_dashboard: "Dashboard",
        nav_transactions: "Transaction Ledger",
        nav_invoices: "Invoice Management",
        nav_returns: "Returns & Claims",
        nav_reports: "Business Reports",
        nav_calculator: "Repack Calculator",
        nav_master: "Product Master",
        nav_customers: "Customers",
        nav_agents: "Manage Agents",
        nav_users: "Manage Users",
        nav_settings: "Settings",
        nav_install: "Install App",
        nav_logout: "Logout",

        // Header & Actions
        btn_install: "Install App",
        tab_preferences: "System Preferences",
        set_modal_title: "System Settings & Business Profile",

        // Login Screen
        login_tagline: "Sign in to Your Account",
        login_btn: "Login",
        forgot_password_btn: "Forgot Password?",

        // Dashboard
        dash_overview_title: "Business Performance Overview",
        dash_overview_subtitle: "Select a time range to view sales analysis",
        filter_today: "Today",
        filter_7days: "7 Days",
        filter_30days: "30 Days",
        filter_all: "All Time",
        filter_all_label: "All",
        dash_financial_title: "Financial & Expense Tracker",
        dash_financial_subtitle: "Net Revenue",
        stat_revenue: "Revenue",
        stat_expense: "Operational Expenses",
        stat_net_profit: "Final Net Profit",
        stat_debt: "Total Receivables",
        btn_record_expense: "Record Operational Expense",
        dash_memo_title: "Quick Notes & Owner Agenda",
        memo_priority: "Priority",
        memo_placeholder: "Write quick task memo...",
        btn_save_memo: "Save Memo",

        // Buku Transaksi
        btn_save_sale: "Save Sale",
        search_trx_placeholder: "Search transactions, customer...",
        lbl_filter: "Filter:",
        opt_paid: "Paid",
        opt_unpaid: "Unpaid",
        th_date: "Date",
        th_customer: "Customer",
        th_item: "Item & Notes",
        th_qty: "Qty",
        th_extracost: "Operational Cost & Notes",
        th_totalmodal: "Total Cost",
        th_totalsell: "Total Sales",
        th_status: "Status",
        th_profit: "Profit",
        th_action: "Action",

        // Modal Pengaturan
        tab_profile: "Profile & Receipt",
        tab_backup: "Data Backup",
        set_theme_label: "Display Theme",
        theme_light: "Light Mode",
        theme_dark: "Dark Mode",
        set_lang_label: "Application Language",
        set_print_label: "Paper Size & Print Receipt Format"
    }
};

function applyLanguageDOM() {
    const dict = I18N[currentLanguage] || I18N['id'];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (dict[key]) el.setAttribute('title', dict[key]);
    });
}

function updateLanguageButtonsUI() {
    const btnId = document.getElementById('lang-btn-id');
    const btnEn = document.getElementById('lang-btn-en');

    const activeClass = "p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/30";
    const inactiveClass = "p-2.5 rounded-xl border flex items-center justify-center gap-2 font-semibold transition border-inherit bg-transparent opacity-75 hover:opacity-100 hover:border-indigo-400";

    if (btnId) btnId.className = currentLanguage === 'id' ? activeClass : inactiveClass;
    if (btnEn) btnEn.className = currentLanguage === 'en' ? activeClass : inactiveClass;
}

function setAppLanguage(lang) {
    if (lang !== 'id' && lang !== 'en') return;
    currentLanguage = lang;
    localStorage.setItem('snackloop_lang', lang);
    applyLanguageDOM();
    updateLanguageButtonsUI();

    // Perbarui judul tab yang sedang aktif
    const activeTabLink = document.querySelector('.navbar__link.active');
    if (activeTabLink && activeTabLink.id) {
        const tabKey = activeTabLink.id.replace('btn-', '');
        const titlesId = { 
            'dashboard': 'Dashboard Keuangan', 'transactions': 'Buku Transaksi', 'invoices': 'Manajemen Invoice',
            'returns': 'Retur & Klaim Agen', 'reports': 'Laporan Bisnis & Analitik', 'calculator': 'Kalkulator & Gudang Repack', 
            'master': 'Data Master Produk', 'customers': 'Manajemen Pelanggan', 'agents': 'Kelola Agent Pool', 'users': 'Kelola Akun User' 
        };
        const titlesEn = {
            'dashboard': 'Financial Dashboard', 'transactions': 'Transaction Ledger', 'invoices': 'Invoice Management',
            'returns': 'Returns & Agent Claims', 'reports': 'Business Reports & Analytics', 'calculator': 'Repack Calculator & Warehouse',
            'master': 'Product Master Data', 'customers': 'Customer Management', 'agents': 'Agent Pool Management', 'users': 'User Account Management'
        };
        const titles = currentLanguage === 'en' ? titlesEn : titlesId;
        const pageTitleEl = document.getElementById('page-title');
        if (pageTitleEl && titles[tabKey]) pageTitleEl.innerText = titles[tabKey];
    }

    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
    
    showNotification(
        currentLanguage === 'id' ? 'Bahasa Diperbarui' : 'Language Updated',
        currentLanguage === 'id' ? 'Bahasa aplikasi berhasil diubah ke Bahasa Indonesia.' : 'Application language changed to English.',
        'info'
    );
}

function updateThemeButtonsUI() {
    const isDark = document.body.classList.contains('dark-theme');
    const btnLight = document.getElementById('theme-btn-light');
    const btnDark = document.getElementById('theme-btn-dark');

    const activeClass = "p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/30";
    const inactiveClass = "p-2.5 rounded-xl border flex items-center justify-center gap-2 font-semibold transition border-inherit bg-transparent opacity-75 hover:opacity-100 hover:border-indigo-400";

    if (btnLight) btnLight.className = !isDark ? activeClass : inactiveClass;
    if (btnDark) btnDark.className = isDark ? activeClass : inactiveClass;
}

function setAppTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        localStorage.setItem('snackloop_theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('snackloop_theme', 'light');
    }

    const icon = document.getElementById('dark-mode-icon');
    if (icon) {
        icon.innerText = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    updateThemeButtonsUI();

    const dashTab = document.getElementById('tab-dashboard');
    if (dashTab && !dashTab.classList.contains('hidden') && typeof renderFinancialChart === 'function') {
        renderFinancialChart();
    }
}

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

// ======================= PENGGANTI DEFAULT TOOLTIP BROWSER & PERSISTENT SESSION ======================= //
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
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeButtonsUI();

    const savedLang = localStorage.getItem('snackloop_lang');
    if (savedLang === 'en' || savedLang === 'id') {
        currentLanguage = savedLang;
    }
    applyLanguageDOM();
    updateLanguageButtonsUI();

    loadMemos();
    loadCacheFromLocal();
    updateNetworkStatus();

    // Cek Sesi Login yang Tersimpan (Persistent Session Check)
    const savedSession = localStorage.getItem('snackloop_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            currentUser = sessionData.username;
            currentRole = sessionData.role;

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            
            applyRolePermissions();
            initApp();
        } catch(e) {
            localStorage.removeItem('snackloop_session');
        }
    }

    if (typeof feather !== 'undefined') feather.replace();
});

// ======================= SISTEM HAK AKSES PERAN (ROLE-BASED PERMISSIONS) ======================= //
function applyRolePermissions() {
    const isSuperAdmin = currentRole === 'super_admin';
    const isStaffRekap = currentRole === 'staff_rekap';
    const isView = currentRole === 'view' || (!isSuperAdmin && !isStaffRekap);

    // 1. Label Pengguna & Badge Peran di Top Header
    const userLabelEl = document.getElementById('current-user-label');
    const userBadgeEl = document.getElementById('user-badge');
    if (userLabelEl) {
        let roleDisplay = 'VIEWER';
        if (isSuperAdmin) roleDisplay = 'OWNER';
        else if (isStaffRekap) roleDisplay = 'STAFF REKAP';
        userLabelEl.innerText = `${currentUser || 'User'} (${roleDisplay})`;
    }
    if (userBadgeEl) {
        userBadgeEl.style.display = 'none';
    }

    // 2. Menu Navigasi Eksklusif Owner (Kelola Akun & Laporan Finansial)
    const navUsers = document.getElementById('nav-item-users');
    if (navUsers) navUsers.style.display = isSuperAdmin ? 'block' : 'none';

    const navReports = document.getElementById('nav-item-reports');
    if (navReports) navReports.style.display = isSuperAdmin ? 'block' : 'none';

    const navSettings = document.getElementById('nav-item-settings');
    if (navSettings) navSettings.style.display = 'block';

    // 3. Form Input Cards
    // Staff Rekap & Owner BISA input transaksi, pelanggan, agen, repack, master
    // Viewer TIDAK BISA input apapun
    const formCards = ['form-transaksi-card', 'form-repack-card', 'form-master-card', 'form-customer-card', 'form-agent-card'];
    formCards.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = isView ? 'none' : 'block';
        }
    });

    // 4. Tombol & Fitur Biaya Operasional (Hanya Owner)
    const btnExpense = document.querySelector('button[onclick="openExpenseModal()"]');
    if (btnExpense) btnExpense.style.display = isSuperAdmin ? 'inline-flex' : 'none';
}

// ======================= LOCALSTORAGE CACHING (OFFLINE READY) ======================= //
function saveCacheToLocal() {
    try {
        const cacheObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData, returnData, userData };
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
        badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-sm cursor-pointer";
        badgeEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span id="sync-status-text" class="hidden">Offline</span>`;
        if (container) container.setAttribute('title', `Status: Offline (${count} data tersimpan lokal)`);
    } else if (count > 0) {
        badgeEl.className = "relative w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-sm cursor-pointer hover:bg-amber-100 transition";
        badgeEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span><span class="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">${count}</span><span id="sync-status-text" class="hidden">Pending</span>`;
        if (container) container.setAttribute('title', `Ada ${count} data tertunda sinkronisasi. Klik untuk kirim.`);
    } else {
        badgeEl.className = "w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-sm cursor-pointer hover:scale-105 transition-all";
        badgeEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span><span id="sync-status-text" class="hidden">Online</span>`;
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
    const isDark = document.body.classList.contains('dark-theme');
    setAppTheme(isDark ? 'light' : 'dark');
}

// ======================= 1. LOGIN & AUTH ======================= //
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    
    let userInfo = null;
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', u)
            .eq('password', p);
            
        if (!error && data && data.length > 0) {
            userInfo = data[0];
        }
    } catch(err) {
        console.warn("Supabase query error:", err);
    }

    // Auto-provisioning & otentikasi akun admin_kiky (Super Admin / Owner)
    if (!userInfo && u.toLowerCase() === 'admin_kiky' && (p === '123456' || p === 'password123')) {
        try {
            const { data: newAdmin } = await supabaseClient
                .from('users')
                .insert([{ username: 'admin_kiky', password: p, role: 'super_admin' }])
                .select();
            if (newAdmin && newAdmin.length > 0) {
                userInfo = newAdmin[0];
            } else {
                userInfo = { username: 'admin_kiky', role: 'super_admin' };
            }
        } catch(err) {
            userInfo = { username: 'admin_kiky', role: 'super_admin' };
        }
    }

    // Auto-provisioning akun staff1 jika belum terdaftar di Supabase
    if (!userInfo && u.toLowerCase() === 'staff1' && (p === 'password123' || p === '123456')) {
        try {
            const { data: newStaff } = await supabaseClient
                .from('users')
                .insert([{ username: 'staff1', password: p, role: 'staff_rekap' }])
                .select();
            if (newStaff && newStaff.length > 0) {
                userInfo = newStaff[0];
            } else {
                userInfo = { username: 'staff1', role: 'staff_rekap' };
            }
        } catch(err) {
            userInfo = { username: 'staff1', role: 'staff_rekap' };
        }
    }

    // Fallback akun default admin
    if (!userInfo && u.toLowerCase() === 'admin' && (p === 'admin' || p === 'admin123' || p === '123456')) {
        userInfo = { username: 'admin', role: 'super_admin' };
    }
        
    if (!userInfo) {
        showNotification("Gagal", "Username atau Password salah.", "error");
        document.getElementById('login-password').value = '';
        return;
    }
    
    currentUser = userInfo.username;
    currentRole = userInfo.role || 'staff_rekap';

    // Simpan sesi login ke localStorage
    localStorage.setItem('snackloop_session', JSON.stringify({ username: currentUser, role: currentRole }));
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    applyRolePermissions();
    initApp();
    showNotification("Sukses", `Selamat datang kembali, ${currentUser}!`, "success");
});

function logoutApp() {
    currentUser = null;
    currentRole = null;
    localStorage.removeItem('snackloop_session'); // Hapus sesi saat logout
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    switchTab('dashboard');
    showNotification("Info", "Berhasil keluar dari aplikasi.", "info");
}

// ======================= FITUR LUPA & RESET PASSWORD (SUPABASE) ======================= //
function openForgotPasswordModal(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-forgot-password');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const input = document.getElementById('forgot-identifier');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
    const feedback = document.getElementById('forgot-password-feedback');
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.innerHTML = '';
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('modal-forgot-password');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const inputEl = document.getElementById('forgot-identifier');
    const btnSubmit = document.getElementById('btn-submit-forgot');
    const feedbackEl = document.getElementById('forgot-password-feedback');
    const identifier = inputEl ? inputEl.value.trim() : '';

    if (!identifier) {
        showNotification("Perhatian", "Silakan masukkan email atau username Anda.", "warning");
        return;
    }

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : 'Kirim';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span>Memproses...</span>`;
    }

    try {
        const isEmail = identifier.includes('@');

        if (isEmail) {
            // Flow 1: Email Supabase Auth
            const redirectUrl = window.location.origin + window.location.pathname;
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(identifier, {
                redirectTo: redirectUrl
            });

            if (error) {
                // Tampilkan pesan error ramah dari Supabase
                feedbackEl.className = "p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-circle-exclamation mt-0.5 text-rose-500"></i>
                    <div>
                        <div class="font-bold">Gagal Mengirim Email</div>
                        <div class="mt-0.5 opacity-90">${error.message || 'Terjadi kesalahan saat menghubungi server Supabase.'}</div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Gagal", error.message || "Gagal mengirim email reset.", "error");
            } else {
                feedbackEl.className = "p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs space-y-1.5";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm"></i>
                    <div>
                        <div class="font-bold">Instruksi Reset Terkirim!</div>
                        <div class="mt-1 leading-relaxed">
                            Tautan pemulihan kata sandi telah dikirim ke <strong>${identifier}</strong>. Silakan periksa folder <em>Inbox</em> atau <em>Spam</em> Anda dan klik tautan tersebut untuk membuat kata sandi baru.
                        </div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Sukses", `Tautan reset telah dikirim ke ${identifier}`, "success");
                if (inputEl) inputEl.value = '';
            }
        } else {
            // Flow 2: Username pada tabel internal 'users'
            const { data: users, error } = await supabaseClient
                .from('users')
                .select('id, username, role')
                .eq('username', identifier);

            if (error) {
                feedbackEl.className = "p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-circle-exclamation mt-0.5 text-rose-500"></i>
                    <div>
                        <div class="font-bold">Koneksi Database Bermasalah</div>
                        <div class="mt-0.5 opacity-90">${error.message}</div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Gagal", error.message, "error");
            } else if (!users || users.length === 0) {
                feedbackEl.className = "p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs space-y-1";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400 mt-0.5 text-sm"></i>
                    <div>
                        <div class="font-bold">Akun Tidak Ditemukan</div>
                        <div class="mt-1 leading-relaxed">
                            Username <strong>${identifier}</strong> tidak terdaftar dalam database SnackLoop. Pastikan penulisan sudah benar atau gunakan alamat email Supabase Anda.
                        </div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Perhatian", `Username "${identifier}" tidak ditemukan.`, "warning");
            } else {
                const u = users[0];
                const waText = encodeURIComponent(`Halo Super Admin SnackLoop, saya ingin meminta bantuan reset password untuk akun ERP saya.\n\nUsername: ${u.username}\nRole: ${u.role}\n\nTerima kasih.`);
                feedbackEl.className = "p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 text-xs space-y-2.5";
                feedbackEl.innerHTML = `
                    <div class="flex items-start gap-2">
                        <i class="fa-solid fa-id-badge text-indigo-600 dark:text-indigo-400 mt-0.5 text-sm"></i>
                        <div>
                            <div class="font-bold">Akun Staf Ditemukan</div>
                            <div class="mt-0.5 opacity-90">Username: <strong>${u.username}</strong> &bull; Hak Akses: <span class="uppercase font-semibold">${u.role}</span></div>
                        </div>
                    </div>
                    <p class="text-[11px] leading-relaxed opacity-90">
                        Akun ini dikelola oleh Super Admin sistem. Silakan hubungi Super Admin untuk mereset kata sandi akun operasional ini, atau masukkan email Supabase jika akun Anda terhubung dengan email.
                    </p>
                    <div class="pt-1">
                        <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition">
                            <i class="fa-brands fa-whatsapp"></i>
                            <span>Hubungi Super Admin via WhatsApp</span>
                        </a>
                    </div>
                `;
                feedbackEl.classList.remove('hidden');
                showNotification("Akun Terverifikasi", `Akun ${u.username} ditemukan. Silakan hubungi Super Admin.`, "info");
            }
        }
    } catch (err) {
        console.error("Error pada proses lupa password:", err);
        showNotification("Kesalahan", "Terjadi kegagalan komunikasi dengan server Supabase.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
    }
}

function openResetPasswordModal() {
    const modal = document.getElementById('modal-reset-password');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const passInput = document.getElementById('new-password');
    if (passInput) {
        passInput.value = '';
        setTimeout(() => passInput.focus(), 100);
    }
    const confirmInput = document.getElementById('confirm-new-password');
    if (confirmInput) confirmInput.value = '';
}

function closeResetPasswordModal() {
    const modal = document.getElementById('modal-reset-password');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value.trim();
    const confirmPass = document.getElementById('confirm-new-password').value.trim();
    const btnSubmit = document.getElementById('btn-submit-reset');

    if (!newPass || !confirmPass) {
        showNotification("Perhatian", "Semua kolom password wajib diisi.", "warning");
        return;
    }

    if (newPass.length < 6) {
        showNotification("Perhatian", "Password baru minimal harus 6 karakter.", "warning");
        return;
    }

    if (newPass !== confirmPass) {
        showNotification("Perhatian", "Konfirmasi password baru tidak cocok.", "warning");
        return;
    }

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : 'Simpan';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span>Menyimpan...</span>`;
    }

    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPass
        });

        if (error) {
            showNotification("Gagal Reset Password", error.message || "Gagal memperbarui kata sandi.", "error");
            return;
        }

        showNotification("Sukses", "Password berhasil diperbarui! Silakan login dengan password baru.", "success");
        closeResetPasswordModal();

        // Bersihkan hash fragment recovery di URL
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
        }

        // Arahkan fokus ke form login
        const loginPass = document.getElementById('login-password');
        if (loginPass) {
            loginPass.value = '';
            loginPass.focus();
        }
    } catch (err) {
        console.error("Gagal update password:", err);
        showNotification("Kesalahan", "Terjadi kesalahan saat memperbarui kata sandi.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
    }
}

// Inisialisasi Auth State Change Supabase untuk mendeteksi link recovery password
if (window.supabaseClient && supabaseClient.auth) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            openResetPasswordModal();
            showNotification("Pemulihan Akun", "Silakan masukkan password baru Anda.", "info");
        }
    });
}

// Deteksi jika link URL mengandung tipe recovery saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'))) {
        setTimeout(() => {
            openResetPasswordModal();
            showNotification("Pemulihan Akun", "Tautan pemulihan terdeteksi. Silakan masukkan kata sandi baru.", "info");
        }, 600);
    }
});

async function initApp() {
    updateNetworkStatus();
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
    if(navigator.onLine) {
        syncOutboxQueue();
    }
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
        if (!userData.some(u => u.username && u.username.toLowerCase() === 'admin_kiky')) {
            try {
                const { data: newAdmin } = await supabaseClient
                    .from('users')
                    .insert([{ username: 'admin_kiky', password: '123456', role: 'super_admin' }])
                    .select('id, username, role');
                if (newAdmin && newAdmin.length > 0) {
                    userData.push(newAdmin[0]);
                } else {
                    userData.push({ id: 3, username: 'admin_kiky', role: 'super_admin' });
                }
            } catch(e) {
                userData.push({ id: 3, username: 'admin_kiky', role: 'super_admin' });
            }
        }
        if (!userData.some(u => u.username && u.username.toLowerCase() === 'staff1')) {
            try {
                const { data: newStaff } = await supabaseClient
                    .from('users')
                    .insert([{ username: 'staff1', password: 'password123', role: 'staff_rekap' }])
                    .select('id, username, role');
                if (newStaff && newStaff.length > 0) {
                    userData.push(newStaff[0]);
                }
            } catch(e) {}
        }
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
    if (tabId === 'settings' || tabId === 'preferences') {
        openSettingsModal('app');
        return;
    }

    if ((tabId === 'users' || tabId === 'reports') && currentRole !== 'super_admin') {
        showNotification("Akses Terbatas", "Halaman ini hanya dapat diakses oleh Akun Owner / Super Admin.", "warning");
        tabId = 'dashboard';
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.navbar__link').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.remove('hidden');
    
    const activeBtn = document.getElementById('btn-' + tabId);
    if(activeBtn) activeBtn.classList.add('active');

    const titlesId = { 
        'dashboard': 'Dashboard Keuangan', 
        'transactions': 'Buku Transaksi', 
        'invoices': 'Manajemen Invoice',
        'returns': 'Retur & Klaim Agen',
        'reports': 'Laporan Bisnis & Analitik',
        'calculator': 'Kalkulator & Gudang Repack', 
        'master': 'Data Master Produk', 
        'customers': 'Manajemen Pelanggan', 
        'agents': 'Kelola Agent Pool',
        'users': 'Kelola Akun User' 
    };
    const titlesEn = {
        'dashboard': 'Financial Dashboard',
        'transactions': 'Transaction Ledger',
        'invoices': 'Invoice Management',
        'returns': 'Returns & Agent Claims',
        'reports': 'Business Reports & Analytics',
        'calculator': 'Repack Calculator & Warehouse',
        'master': 'Product Master Data',
        'customers': 'Customer Management',
        'agents': 'Agent Pool Management',
        'users': 'User Account Management'
    };
    const titles = currentLanguage === 'en' ? titlesEn : titlesId;
    const pageTitleEl = document.getElementById('page-title');
    if(pageTitleEl) pageTitleEl.innerText = titles[tabId] || 'SnackLoop ERP';
    
    if(tabId === 'returns') {
        renderReturns();
    }
    if(tabId === 'reports') {
        renderReports();
    }

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
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = agentData.map((ag) => {
        const action = isSuperAdmin ? `<button onclick="confirmDeleteAgent(${ag.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-mono opacity-60">#${ag.id}</td>
                <td class="p-3 border border-inherit font-semibold">${ag.name}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
    updateAgentDropdowns();
}

function confirmDeleteAgent(id) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus agen ini dari pool?", async () => {
        const idx = agentData.findIndex(a => a.id === id);
        if(idx !== -1) agentData.splice(idx, 1);
        saveCacheToLocal();
        renderAgents();
        updateAgentDropdowns();
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_AGENT',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('agents').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

function updateAgentDropdowns() {
    const selects = ['m-source', 't-source', 'edit-m-source'];
    selects.forEach(selId => {
        const el = document.getElementById(selId);
        if(el) {
            const currentVal = el.value;
            let options = `<option value="" disabled selected> Pilih Agen </option>`;
            if(selId === 't-source') {
                options += `<option value="Repack">Gudang Repack</option>`;
            }
            options += agentData.map(ag => `<option value="${ag.name}">${ag.name}</option>`).join('');
            el.innerHTML = options;
            el.value = currentVal;
        }
    });
}

document.getElementById('agent-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const name = document.getElementById('ag-name').value.trim();
    if(!name) return;

    const tempAgent = { id: Date.now(), name };
    agentData.push(tempAgent);
    saveCacheToLocal();
    renderAgents();
    updateAgentDropdowns();
    this.reset();
    showNotification("Sukses", "Agen baru berhasil ditambahkan!", "success");

    dispatchMutation({
        type: 'INSERT_AGENT',
        payload: { name }
    }, async () => {
        const { data, error } = await supabaseClient.from('agents').insert([{ name }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempAgent.id = data[0].id;
    });
});

// ======================= 5. MANAJEMEN USER & BACKUP/RESTORE ======================= //
async function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    if(!tbody) return;
    const rows = userData.map((u) => {
        const deleteBtn = (u.username === 'admin' || u.username === 'admin_kiky') ? `<span class="text-xs opacity-40 font-semibold text-indigo-500">Utama</span>` : `<button onclick="confirmDeleteUser(${u.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>`;
        
        let roleBadge = `<span class="px-2.5 py-1 bg-slate-500/15 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold border border-slate-500/30"><i class="fa-solid fa-eye mr-1"></i>Viewer</span>`;
        if (u.role === 'super_admin') {
            roleBadge = `<span class="px-2.5 py-1 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-500/30"><i class="fa-solid fa-crown mr-1 text-amber-500"></i>Owner (Super Admin)</span>`;
        } else if (u.role === 'staff_rekap') {
            roleBadge = `<span class="px-2.5 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/30"><i class="fa-solid fa-cash-register mr-1"></i>Staff Rekap / Kasir</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${u.username}</td>
                <td class="p-3 border border-inherit">${roleBadge}</td>
                <td class="p-3 border border-inherit text-center">${deleteBtn}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
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
    const role = document.getElementById('u-role')?.value || 'staff_rekap';
    
    if(!username || !password) return showNotification("Perhatian", "Username dan Password wajib diisi.", "warning");

    const { error } = await supabaseClient.from('users').insert([{ username, password, role }]);
    if(error) return showNotification("Gagal", error.message, "error");
    
    await loadDataFromCloud(); 
    renderUsers(); 
    this.reset(); 
    const roleLabel = role === 'staff_rekap' ? 'Staff Rekap / Kasir' : (role === 'super_admin' ? 'Owner / Super Admin' : 'Viewer');
    showNotification("Sukses", `Akun ${username} (${roleLabel}) berhasil didaftarkan!`, "success");
});

function backupDataJSON() {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Eksklusif Super Admin.", "error");
    const backupObj = { agentData, masterData, customerData, repackData, transactionData, expenseData, invoiceData, priceHistoryData, returnData };
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
            const data = JSON.parse(e.target.result);
            if (data.transactionData) transactionData = data.transactionData;
            if (data.masterData) masterData = data.masterData;
            if (data.customerData) customerData = data.customerData;
            if (data.agentData) agentData = data.agentData;
            if (data.repackData) repackData = data.repackData;
            if (data.expenseData) expenseData = data.expenseData;
            if (data.invoiceData) invoiceData = data.invoiceData;
            if (data.priceHistoryData) priceHistoryData = data.priceHistoryData;
            if (data.returnData) returnData = data.returnData;

            saveCacheToLocal();
            renderMonthTabs();
            renderMaster();
            renderCustomer();
            renderAgents();
            renderRepackWarehouse();
            renderInvoicesTable();
            renderReturns();
            updateDashboard();

            showNotification("Sukses", "Data backup berhasil dipulihkan secara penuh ke sistem!", "success");
        } catch(err) {
            console.error("Gagal restore:", err);
            showNotification("Gagal", "Format file backup JSON tidak valid.", "error");
        }
    };
    reader.readAsText(file);
}

// ======================= 6. MASTER & CUSTOMER (DENGAN PRICE HISTORY) ======================= //
async function renderMaster() {
    const tbody = document.getElementById('master-table-body');
    if(!tbody) return;
    const canEdit = currentRole === 'super_admin';
    const rows = masterData.map((m) => {
        const actionBtns = canEdit ? `
            <button onclick="openEditMasterModal(${m.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
            <button onclick="confirmDeleteMaster(${m.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>
        ` : `
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
        `;

        const buyPriceDisplay = canEdit ? `Rp ${m.buy.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${m.name}</td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 theme-input border rounded text-[10px] font-bold">${m.source}</span></td>
                <td class="p-3 border border-inherit">${buyPriceDisplay}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${m.sell.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${actionBtns}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
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

    let priceHistoryPayload = null;
    if(oldItem.buy !== newBuy || oldItem.sell !== newSell) {
        priceHistoryPayload = {
            master_id: id,
            product_name: newName,
            old_buy: oldItem.buy,
            new_buy: newBuy,
            old_sell: oldItem.sell,
            new_sell: newSell,
            changed_by: currentUser,
            changed_at: new Date().toISOString()
        };
        priceHistoryData.unshift(priceHistoryPayload);
    }

    oldItem.name = newName;
    oldItem.source = newSource;
    oldItem.buy = newBuy;
    oldItem.sell = newSell;
    saveCacheToLocal();

    renderMaster();
    renderDropdowns();
    closeEditMasterModal();
    showNotification("Sukses", "Master produk dan riwayat harga berhasil diperbarui!", "success");

    dispatchMutation({
        type: 'UPDATE_MASTER',
        payload: {
            id,
            updates: { name: newName, source: newSource, buy: newBuy, sell: newSell },
            history: priceHistoryPayload
        }
    }, async () => {
        const { error } = await supabaseClient.from('master').update({
            name: newName, source: newSource, buy: newBuy, sell: newSell
        }).eq('id', id);
        if(error) throw error;
        if(priceHistoryPayload) {
            await supabaseClient.from('price_history').insert([priceHistoryPayload]);
        }
    });
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
        const rows = histories.map(h => {
            const diff = h.new_buy - h.old_buy;
            const diffBadge = diff > 0 ? 
                `<span class="text-rose-500 font-bold">+Rp ${diff.toLocaleString()} (Naik)</span>` : 
                diff < 0 ? `<span class="text-emerald-500 font-bold">-Rp ${Math.abs(diff).toLocaleString()} (Turun)</span>` : `<span class="opacity-50">Tetap</span>`;

            return `
                <tr class="hover:bg-slate-50/50">
                    <td class="p-2.5 border border-inherit">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                    <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit">${diffBadge}</td>
                </tr>`;
        }).join('');
        tbody.innerHTML = rows;
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
        const idx = masterData.findIndex(m => m.id === id);
        if(idx !== -1) masterData.splice(idx, 1);
        saveCacheToLocal();
        renderMaster();
        renderDropdowns();
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_MASTER',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('master').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

document.getElementById('master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan.", "warning");
    
    let rawName = document.getElementById('m-name').value.trim();
    let normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const source = document.getElementById('m-source').value;
    const buy = getCleanNumber('m-buy');
    const sell = getCleanNumber('m-sell');

    const tempMaster = { id: Date.now(), name: normalizedName, source, buy, sell };
    masterData.push(tempMaster);
    saveCacheToLocal();
    renderMaster();
    renderDropdowns();
    this.reset();
    showNotification("Sukses", "Master produk tersimpan", "success");

    dispatchMutation({
        type: 'INSERT_MASTER',
        payload: { name: normalizedName, source, buy, sell }
    }, async () => {
        const { data, error } = await supabaseClient.from('master').insert([{
            name: normalizedName, source, buy, sell
        }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempMaster.id = data[0].id;
    });
});

async function renderCustomer() {
    const tbody = document.getElementById('cust-table-body');
    if(!tbody) return;
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = customerData.map((c) => {
        const action = isSuperAdmin ? `<button onclick="confirmDeleteCustomer(${c.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${c.name}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">+${c.phone}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function confirmDeleteCustomer(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus pelanggan ini?", async () => {
        const idx = customerData.findIndex(c => c.id === id);
        if(idx !== -1) customerData.splice(idx, 1);
        saveCacheToLocal();
        renderCustomer();
        renderDropdowns();
        showNotification("Sukses", "Data berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_CUSTOMER',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('customers').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

document.getElementById('cust-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    
    let rawCust = document.getElementById('cu-name').value.trim();
    let normCust = rawCust.charAt(0).toUpperCase() + rawCust.slice(1);
    let rawPhone = document.getElementById('cu-phone').value.trim().replace(/^0/, '62');

    const tempCust = { id: Date.now(), name: normCust, phone: rawPhone };
    customerData.push(tempCust);
    saveCacheToLocal();
    renderCustomer();
    renderDropdowns();
    this.reset();
    showNotification("Sukses", "Pelanggan tersimpan", "success");

    dispatchMutation({
        type: 'INSERT_CUSTOMER',
        payload: { name: normCust, phone: rawPhone }
    }, async () => {
        const { data, error } = await supabaseClient.from('customers').insert([{ name: normCust, phone: rawPhone }]).select();
        if(error) throw error;
        if(data && data.length > 0) tempCust.id = data[0].id;
    });
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
    const isSuperAdmin = currentRole === 'super_admin';
    if (isSuperAdmin) {
        document.getElementById('res-final').innerHTML = `HPP / Modal: <b>Rp ${finalModal.toLocaleString()}</b> /pcs`;
        document.getElementById('res-profit').innerHTML = `Potensi Keuntungan Batch: <b>Rp ${estProfit.toLocaleString()}</b>`;
        document.getElementById('res-profit').style.display = 'block';
    } else {
        document.getElementById('res-final').innerHTML = `Target Output Kemasan: <b>${qty} Pcs</b>`;
        document.getElementById('res-profit').style.display = 'none';
    }

    currentRepackCalcResult = {
        id: `BATCH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().slice(0, 10),
        name, modal_per_pcs: finalModal, sell_target: sellTarget, initial_qty: qty, remaining_qty: qty
    };
    if (currentRole === 'super_admin' || currentRole === 'staff_rekap') {
        document.getElementById('btn-save-repack').classList.remove('hidden');
    }
    showNotification("Sukses", "Perhitungan batch repack berhasil!", "success");
}

async function saveToRepackWarehouse() {
    if(!currentRepackCalcResult || currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const itemToSave = { ...currentRepackCalcResult };
    repackData.push(itemToSave);
    saveCacheToLocal();
    renderRepackWarehouse();
    onSourceChange();
    showNotification("Sukses", "Batch masuk ke Gudang Repack", "success");

    currentRepackCalcResult = null;
    document.getElementById('btn-save-repack').classList.add('hidden');
    document.getElementById('calc-res').classList.add('hidden');
    ['c-name', 'c-price', 'c-disc', 'c-fee', 'c-qty', 'c-plastic', 'c-sell'].forEach(id => document.getElementById(id).value = '');

    dispatchMutation({
        type: 'INSERT_REPACK',
        payload: itemToSave
    }, async () => {
        const { error } = await supabaseClient.from('repack').insert([itemToSave]);
        if(error) throw error;
    });
}

function renderRepackWarehouse() {
    const tbody = document.getElementById('repack-table-body');
    if(!tbody) return;
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = repackData.map((r) => {
        const outOfStock = r.remaining_qty <= 0;
        const bgClass = outOfStock ? 'opacity-50' : 'hover:bg-slate-50/50';
        const badge = outOfStock ? `<span class="bg-rose-500/20 text-rose-500 px-2 rounded font-bold">HABIS</span>` : `<span class="font-bold text-lg text-emerald-500">${r.remaining_qty}</span>`;
        const action = isSuperAdmin ? `<button onclick="confirmDeleteRepackBatch('${r.id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        const modalDisplay = isSuperAdmin ? `Rp ${r.modal_per_pcs.toLocaleString()}` : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="${bgClass}">
                <td class="p-3 border border-inherit font-mono text-indigo-500 font-bold">${r.id} <br><span class="text-[9px] opacity-60">${r.date}</span></td>
                <td class="p-3 border border-inherit font-semibold">${r.name}</td>
                <td class="p-3 border border-inherit opacity-70">${modalDisplay}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${r.sell_target.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${r.initial_qty}</td>
                <td class="p-3 border border-inherit text-center">${badge}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function confirmDeleteRepackBatch(batchId) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Owner / Super Admin yang diizinkan menghapus batch.", "error");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus Batch Repack ini secara permanen?", async () => {
        const idx = repackData.findIndex(r => r.id === batchId);
        if(idx !== -1) repackData.splice(idx, 1);
        saveCacheToLocal();
        renderRepackWarehouse();
        onSourceChange();
        showNotification("Sukses", "Batch Repack berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_REPACK',
            payload: { id: batchId }
        }, async () => {
            const { error } = await supabaseClient.from('repack').delete().eq('id', batchId);
            if(error) throw error;
        });
    });
}

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

    if(navigator.onLine) {
        showNotification("Sukses", "Data penjualan berhasil disimpan!", "success");
    } else {
        showNotification("Mode Offline", "Data tersimpan di perangkat. Otomatis disinkronkan saat online.", "warning");
    }
});

async function renderInvoicesTable() {
    const tbody = document.getElementById('invoices-table-body');
    if(!tbody) return;
    
    if(invoiceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center opacity-60">Belum ada data invoice tercatat.</td></tr>`;
        return;
    }

    const isSuperAdmin = currentRole === 'super_admin';
    const rows = invoiceData.map(inv => {
        const badgeStatus = inv.status === 'Lunas' ? 
            `<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-500 rounded-full font-bold">LUNAS</span>` : 
            `<span class="px-2.5 py-1 bg-rose-500/20 text-rose-500 rounded-full font-bold">BELUM LUNAS</span>`;
        
        const btnLunasi = inv.status !== 'Lunas' ? 
            `<button onclick="markInvoiceAsPaid(${inv.id}, '${inv.customer_name}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-check mr-1"></i> Lunasi</button>` : 
            `<span class="text-xs opacity-50 font-medium">Selesai</span>`;

        const btnDelete = isSuperAdmin ? 
            `<button onclick="confirmDeleteInvoice(${inv.id}, '${inv.invoice_number}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '';

        return `
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
    }).join('');

    tbody.innerHTML = rows;
}

function confirmDeleteInvoice(invId, invNumber) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    showConfirmModal("Konfirmasi Hapus", `Apakah Anda yakin ingin menghapus invoice ${invNumber} secara permanen?`, async () => {
        const idx = invoiceData.findIndex(i => i.id === invId);
        if(idx !== -1) invoiceData.splice(idx, 1);
        saveCacheToLocal();
        renderInvoicesTable();
        updateDashboard();
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
    if(trx) {
        trx.status = newStatus;
        saveCacheToLocal();
        renderTransactionsForActiveSheet();
        updateDashboard();
        renderFinancialChart();
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
    renderDashboardHistory(); 

    const uBody = document.getElementById('dashboard-unpaid-body');
    const unpaidBadge = document.getElementById('unpaid-badge');
    if (unpaidBadge) unpaidBadge.innerText = `${unpaidList.length} Item`;
    if(uBody) {
        if(unpaidList.length === 0) {
            uBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center opacity-60">Tidak ada Piutang aktif. Mantap!</td></tr>`;
        } else {
            const uRows = unpaidList.map(t => {
                const btnLunasi = canMarkPaid ? `<button onclick="updateTrxStatus(${t.id}, 'Lunas')" class="bg-indigo-500/25 text-indigo-500 px-2 py-1 rounded text-[11px] font-bold">Lunasi</button>` : '-';
                const custObj = customerData.find(c => c.name === t.customer);
                const phone = custObj ? custObj.phone : '628123456789';
                const waText = `Halo Kak ${t.customer}, pengingat tagihan SnackLoop sebesar Rp ${t.totalSell.toLocaleString()} untuk pesanan ${t.itemName}. Terima kasih!`;
                const waBtn = `<button onclick="window.open('https://wa.me/${phone}?text=${encodeURIComponent(waText)}', '_blank')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold"><i class="fa-brands fa-whatsapp"></i> Tagih WA</button>`;
                
                return `
                    <tr class="hover:bg-slate-50/50">
                        <td class="p-2.5 border border-inherit">${t.date} <br><span class="text-[9px] opacity-60">${t.monthKey}</span></td>
                        <td class="p-2.5 border border-inherit font-bold text-indigo-500">${t.customer}</td>
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


// ========================================================================================= //
// ========================= MODUL RETUR BARANG & KLAIM AGEN =============================== //
// ========================================================================================= //

function setReturnStatusFilter(status) {
    currentReturnStatusFilter = status;
    const btnAll = document.getElementById('ret-filter-all');
    const btnMenunggu = document.getElementById('ret-filter-menunggu');
    const btnSelesai = document.getElementById('ret-filter-selesai');

    if (btnAll) btnAll.className = status === 'all' ? 'px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white text-xs shadow-sm' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    if (btnMenunggu) btnMenunggu.className = status === 'menunggu_agen' ? 'px-3 py-1.5 rounded-lg font-bold bg-amber-600 text-white text-xs shadow-sm' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';
    if (btnSelesai) btnSelesai.className = status === 'selesai' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white text-xs shadow-sm' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition text-xs';

    renderReturns();
}

function renderReturns() {
    const tbody = document.getElementById('returns-table-body');
    if (!tbody) return;

    // 1. Hitung Nilai KPI
    let pendingQty = 0;
    let pendingCost = 0;
    let totalValRetur = 0;
    let resolvedQty = 0;

    const currentMonthKeyStr = getCurrentMonthKey(new Date());

    returnData.forEach(r => {
        if (r.claim_status === 'menunggu_agen') {
            pendingQty += (r.qty || 0);
            pendingCost += (r.total_modal || (r.qty * (r.buy || 0)));
        } else if (r.claim_status === 'selesai') {
            resolvedQty += (r.qty || 0);
        }
        totalValRetur += (r.total_sell || (r.qty * (r.sell || 0)));
    });

    const kpiPendingQtyEl = document.getElementById('ret-kpi-pending-qty');
    const kpiPendingCostEl = document.getElementById('ret-kpi-pending-cost');
    const kpiTotalValEl = document.getElementById('ret-kpi-total-val');
    const kpiResolvedQtyEl = document.getElementById('ret-kpi-resolved-qty');

    if (kpiPendingQtyEl) kpiPendingQtyEl.innerText = `${pendingQty.toLocaleString('id-ID')} pcs`;
    if (kpiPendingCostEl) kpiPendingCostEl.innerText = `Rp ${pendingCost.toLocaleString('id-ID')}`;
    if (kpiTotalValEl) kpiTotalValEl.innerText = `Rp ${totalValRetur.toLocaleString('id-ID')}`;
    if (kpiResolvedQtyEl) kpiResolvedQtyEl.innerText = `${resolvedQty.toLocaleString('id-ID')} pcs`;

    // 2. Update Dropdown Agen Filter
    const filterAgentEl = document.getElementById('ret-filter-agent');
    if (filterAgentEl) {
        const curVal = filterAgentEl.value || 'all';
        let opts = `<option value="all">Semua Agen</option>`;
        agentData.forEach(ag => {
            opts += `<option value="${ag.name}">${ag.name}</option>`;
        });
        filterAgentEl.innerHTML = opts;
        filterAgentEl.value = curVal;
    }

    // 3. Filter Data
    const searchVal = (document.getElementById('ret-search')?.value || '').toLowerCase();
    const selAgent = filterAgentEl ? filterAgentEl.value : 'all';

    let list = returnData.filter(r => {
        if (currentReturnStatusFilter !== 'all' && r.claim_status !== currentReturnStatusFilter) return false;
        if (selAgent !== 'all' && r.agent !== selAgent) return false;
        if (searchVal) {
            const qStr = `${r.return_code || ''} ${r.customer || ''} ${r.item_name || ''} ${r.agent || ''} ${r.reason || ''}`.toLowerCase();
            return qStr.includes(searchVal);
        }
        return true;
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 4. Render Tabel
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center opacity-60">Tidak ada catatan retur barang yang sesuai.</td></tr>`;
        return;
    }

    const isSuperAdmin = currentRole === 'super_admin';
    const rows = list.map(r => {
        const isMenunggu = r.claim_status === 'menunggu_agen';
        const statusBadge = isMenunggu ?
            `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"><i class="fa-solid fa-clock text-[9px]"></i> Menunggu Agen</span>` :
            `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"><i class="fa-solid fa-check text-[9px]"></i> Selesai Klaim</span>`;

        let actionLabel = '';
        if (r.action_type === 'tukar_guling') {
            actionLabel = `<span class="font-semibold text-indigo-600 dark:text-indigo-400">Tukar Guling</span><br><span class="text-[9px] opacity-60">Ganti Fisik Baru</span>`;
        } else if (r.action_type === 'potong_tagihan') {
            actionLabel = `<span class="font-semibold text-rose-600 dark:text-rose-400">Potong Nota</span><br><span class="text-[9px] opacity-60">Kredit Saldo</span>`;
        } else {
            actionLabel = `<span class="font-semibold text-amber-600 dark:text-amber-400">Beban Toko</span><br><span class="text-[9px] opacity-60">Write-Off Rugi</span>`;
        }

        const resolveBtn = isMenunggu ?
            `<button onclick="resolveReturnClaim(${r.id})" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm transition" title="Tandai Sudah Selesai Ditukar / Diklaim ke Agen"><i class="fa-solid fa-check"></i> <span>Selesai</span></button>` :
            `<span class="text-[10px] opacity-50 font-mono">${r.resolved_date ? 'Tuntas: ' + r.resolved_date : 'Tuntas'}</span>`;

        const deleteBtn = isSuperAdmin ?
            `<button onclick="confirmDeleteReturn(${r.id})" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition" title="Hapus"><i class="fa-solid fa-trash"></i></button>` : '';

        const codeDisplay = r.return_code ? `<span class="font-mono text-[10px] text-indigo-500 font-bold block">${r.return_code}</span>` : '';
        const notesDisplay = r.notes ? `<span class="text-[9px] opacity-60 block italic mt-0.5">${r.notes}</span>` : '';

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-inherit transition">
                <td class="p-3 border border-inherit">
                    ${codeDisplay}
                    <span>${r.date}</span>
                </td>
                <td class="p-3 border border-inherit font-bold text-slate-800 dark:text-slate-200">
                    ${r.customer}
                </td>
                <td class="p-3 border border-inherit">
                    <span class="font-medium">${r.item_name}</span><br>
                    <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-inherit font-semibold opacity-85">
                        <i class="fa-solid fa-truck text-[9px] mr-1 text-indigo-500"></i>${r.agent || '-'}
                    </span>
                    ${notesDisplay}
                </td>
                <td class="p-3 border border-inherit text-center">
                    <span class="font-bold text-rose-600 dark:text-rose-400 text-sm">${r.qty}</span> <span class="text-[10px] opacity-60">pcs</span>
                </td>
                <td class="p-3 border border-inherit text-xs">
                    <span class="opacity-70 text-[11px]">Modal: Rp ${(r.total_modal || (r.qty * (r.buy||0))).toLocaleString('id-ID')}</span><br>
                    <span class="font-semibold text-slate-700 dark:text-slate-300">Jual: Rp ${(r.total_sell || (r.qty * (r.sell||0))).toLocaleString('id-ID')}</span>
                </td>
                <td class="p-3 border border-inherit">
                    <span class="text-xs font-medium text-slate-700 dark:text-slate-300">${r.reason}</span>
                </td>
                <td class="p-3 border border-inherit text-xs">
                    ${actionLabel}
                </td>
                <td class="p-3 border border-inherit text-center">
                    ${statusBadge}
                </td>
                <td class="p-3 border border-inherit text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        ${resolveBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = rows;
}

function openReturnModal(prefill = null) {
    const modal = document.getElementById('modal-return');
    if (!modal) return;

    // Reset Form
    document.getElementById('return-form').reset();
    document.getElementById('ret-date').valueAsDate = new Date();
    document.getElementById('ret-ref-trx-id').value = '';

    // Populate Pelanggan Datalist
    const custListEl = document.getElementById('ret-cust-list');
    if (custListEl) {
        custListEl.innerHTML = customerData.map(c => `<option value="${c.name}">${c.name} (${c.phone || '-'})</option>`).join('');
    }

    // Populate Agen Select
    const agentSel = document.getElementById('ret-agent');
    if (agentSel) {
        let opts = `<option value="" disabled selected>Pilih Agen</option>`;
        opts += agentData.map(ag => `<option value="${ag.name}">${ag.name}</option>`).join('');
        agentSel.innerHTML = opts;
    }

    // Populate Master Products Datalist
    const masterListEl = document.getElementById('ret-master-list');
    if (masterListEl) {
        masterListEl.innerHTML = masterData.map(m => `<option value="${m.name}">${m.name} [${m.source || 'Gudang'}]</option>`).join('');
    }

    // Setup formatters
    setupCurrencyFormatter('ret-buy');
    setupCurrencyFormatter('ret-sell');

    // Apply Prefill jika dipanggil dari Buku Transaksi
    if (prefill) {
        if (prefill.date) document.getElementById('ret-date').value = prefill.date;
        if (prefill.customer) document.getElementById('ret-customer').value = prefill.customer;
        if (prefill.itemName) document.getElementById('ret-product').value = prefill.itemName;
        if (prefill.agent && agentSel) agentSel.value = prefill.agent;
        if (prefill.qty) document.getElementById('ret-qty').value = prefill.qty;
        if (prefill.buy) document.getElementById('ret-buy').value = parseInt(prefill.buy, 10).toLocaleString('id-ID');
        if (prefill.sell) document.getElementById('ret-sell').value = parseInt(prefill.sell, 10).toLocaleString('id-ID');
        if (prefill.refTrxId) document.getElementById('ret-ref-trx-id').value = prefill.refTrxId;
        if (prefill.notes) document.getElementById('ret-notes').value = prefill.notes;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeReturnModal() {
    const modal = document.getElementById('modal-return');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function onReturnProductSelect() {
    const pName = document.getElementById('ret-product').value.trim();
    if (!pName) return;

    const matched = masterData.find(m => m.name.toLowerCase() === pName.toLowerCase());
    if (matched) {
        if (matched.buy_price) {
            document.getElementById('ret-buy').value = parseInt(matched.buy_price, 10).toLocaleString('id-ID');
        }
        if (matched.sell_price) {
            document.getElementById('ret-sell').value = parseInt(matched.sell_price, 10).toLocaleString('id-ID');
        }
        if (matched.source) {
            const agentSel = document.getElementById('ret-agent');
            if (agentSel && Array.from(agentSel.options).some(o => o.value === matched.source)) {
                agentSel.value = matched.source;
            }
        }
    }
}

function openReturnModalFromTrx(trxId) {
    let foundTrx = null;
    for (let mk in transactionData) {
        const item = (transactionData[mk] || []).find(t => t.id === trxId);
        if (item) {
            foundTrx = item;
            break;
        }
    }

    if (!foundTrx) {
        return showNotification("Peringatan", "Data transaksi tidak ditemukan.", "warning");
    }

    openReturnModal({
        date: new Date().toISOString().split('T')[0],
        customer: foundTrx.customer,
        itemName: foundTrx.itemName,
        agent: foundTrx.source !== 'Repack' ? foundTrx.source : (agentData[0]?.name || ''),
        qty: 1,
        buy: foundTrx.buy,
        sell: foundTrx.sell,
        refTrxId: foundTrx.id,
        notes: `Retur dari transaksi: ${foundTrx.itemName} (${foundTrx.date})`
    });
}

function saveReturnRecord(e) {
    e.preventDefault();

    const date = document.getElementById('ret-date').value;
    const customer = document.getElementById('ret-customer').value.trim();
    const agent = document.getElementById('ret-agent').value;
    const itemName = document.getElementById('ret-product').value.trim();
    const qty = parseInt(document.getElementById('ret-qty').value, 10) || 1;
    const buy = getCleanNumber('ret-buy');
    const sell = getCleanNumber('ret-sell');
    const reason = document.getElementById('ret-reason').value;
    const actionType = document.querySelector('input[name="ret-action"]:checked')?.value || 'tukar_guling';
    const notes = document.getElementById('ret-notes').value.trim();
    const refTrxId = document.getElementById('ret-ref-trx-id').value;

    if (!date || !customer || !agent || !itemName || qty <= 0) {
        return showNotification("Peringatan", "Mohon lengkapi semua kolom wajib bertanda bintang!", "warning");
    }

    const totalModal = qty * buy;
    const totalSell = qty * sell;
    const returnId = Date.now();
    const returnCode = `RET-${date.replace(/-/g, '').slice(0, 6)}-${String(returnId).slice(-4)}`;

    const newReturn = {
        id: returnId,
        return_code: returnCode,
        date: date,
        customer: customer,
        agent: agent,
        item_name: itemName,
        qty: qty,
        buy: buy,
        sell: sell,
        total_modal: totalModal,
        total_sell: totalSell,
        reason: reason,
        action_type: actionType,
        claim_status: 'menunggu_agen',
        resolved_date: null,
        ref_trx_id: refTrxId || null,
        notes: notes
    };

    // 1. Integrasi ke Buku Transaksi (Jika Potong Tagihan atau Beban Toko)
    const monthKey = getCurrentMonthKey(new Date(date));
    if (!transactionData[monthKey]) transactionData[monthKey] = [];

    if (actionType === 'potong_tagihan') {
        const negativeTrx = {
            id: Date.now() + 1,
            date: date,
            customer: customer,
            itemName: itemName,
            source: agent,
            batch: '-',
            qty: -qty,
            buy: buy,
            extraCost: 0,
            extraCostNote: '-',
            totalModal: -totalModal,
            sell: sell,
            totalSell: -totalSell,
            status: 'Belum Lunas', // Status Belum Lunas dengan angka negatif akan otomatis memotong tagihan/hutang toko
            profitPerItem: (sell - buy),
            notes: `[RETUR] ${reason} - Ref: ${returnCode}`,
            isReturn: true,
            returnId: returnId
        };
        transactionData[monthKey].unshift(negativeTrx);

        // Background dispatch transaksi koreksi
        dispatchOutboxMutation('transactions', 'insert', {
            month_key: monthKey,
            date: date,
            customer: customer,
            item_name: itemName,
            source: agent,
            qty: -qty,
            buy: buy,
            extra_cost: 0,
            total_modal: -totalModal,
            sell: sell,
            total_sell: -totalSell,
            status: 'Belum Lunas',
            profit_per_item: (sell - buy),
            notes: `[RETUR] ${reason} - Ref: ${returnCode}`
        });

    } else if (actionType === 'beban_rusak') {
        // Toko tidak bayar (potong omzet)
        const negativeTrx = {
            id: Date.now() + 1,
            date: date,
            customer: customer,
            itemName: itemName,
            source: agent,
            batch: '-',
            qty: -qty,
            buy: buy,
            extraCost: 0,
            extraCostNote: '-',
            totalModal: -totalModal,
            sell: sell,
            totalSell: -totalSell,
            status: 'Belum Lunas',
            profitPerItem: (sell - buy),
            notes: `[RETUR WRITE-OFF] ${reason} - Ref: ${returnCode}`,
            isReturn: true,
            returnId: returnId
        };
        transactionData[monthKey].unshift(negativeTrx);

        // Masukkan modal barang ke Beban Operasional Usaha
        const newExpense = {
            id: 'exp_' + Date.now(),
            date: date,
            description: `Kerugian Retur Rusak: ${itemName} (${qty} pcs) - ${customer}`,
            amount: totalModal
        };
        expenseData.unshift(newExpense);

        // Background dispatch
        dispatchOutboxMutation('expenses', 'insert', {
            date: date,
            description: newExpense.description,
            amount: totalModal
        });
    }

    // 2. Simpan Catatan Retur
    returnData.unshift(newReturn);
    saveCacheToLocal();

    // 3. Background dispatch returns outbox
    dispatchOutboxMutation('returns', 'insert', {
        id: newReturn.id,
        return_code: newReturn.return_code,
        date: newReturn.date,
        customer: newReturn.customer,
        agent: newReturn.agent,
        item_name: newReturn.item_name,
        qty: newReturn.qty,
        buy: newReturn.buy,
        sell: newReturn.sell,
        total_modal: newReturn.total_modal,
        total_sell: newReturn.total_sell,
        reason: newReturn.reason,
        action_type: newReturn.action_type,
        claim_status: newReturn.claim_status,
        notes: newReturn.notes
    });

    // 4. Update UI di Semua Modul
    renderReturns();
    renderTransactionsForActiveSheet();
    updateDashboard();
    renderFinancialChart();
    renderInvoicesTable();

    closeReturnModal();
    showNotification("Sukses", `Retur "${returnCode}" berhasil dicatat & disinkronkan!`, "success");
}

function resolveReturnClaim(returnId) {
    const item = returnData.find(r => r.id === returnId);
    if (!item) return;

    item.claim_status = 'selesai';
    item.resolved_date = new Date().toISOString().split('T')[0];

    saveCacheToLocal();
    dispatchOutboxMutation('returns', 'update', {
        id: item.id,
        claim_status: 'selesai',
        resolved_date: item.resolved_date
    });

    renderReturns();
    showNotification("Klaim Selesai", `Barang ${item.item_name} (${item.qty} pcs) berhasil ditandai selesai ditukar ke ${item.agent}.`, "success");
}

function confirmDeleteReturn(returnId) {
    const item = returnData.find(r => r.id === returnId);
    if (!item) return;

    if (!confirm(`Hapus catatan retur "${item.return_code || item.item_name}"?`)) return;

    // Bersihkan transaksi koreksi jika ada
    for (let mk in transactionData) {
        const idx = (transactionData[mk] || []).findIndex(t => t.returnId === returnId);
        if (idx !== -1) {
            transactionData[mk].splice(idx, 1);
        }
    }

    const retIdx = returnData.findIndex(r => r.id === returnId);
    if (retIdx !== -1) returnData.splice(retIdx, 1);

    saveCacheToLocal();
    dispatchOutboxMutation('returns', 'delete', { id: returnId });

    renderReturns();
    renderTransactionsForActiveSheet();
    updateDashboard();
    renderFinancialChart();
    renderInvoicesTable();

    showNotification("Sukses", "Catatan retur berhasil dihapus.", "success");
}

// ------------------- CETAK SURAT JALAN KLAIM AGEN ------------------- //
function openPrintAgentClaimModal() {
    const modal = document.getElementById('modal-print-agent-claim');
    if (!modal) return;

    const selAgent = document.getElementById('claim-print-agent');
    if (selAgent) {
        let opts = `<option value="" disabled selected>Pilih Agen</option>`;
        opts += agentData.map(ag => {
            const count = returnData.filter(r => r.agent === ag.name && r.claim_status === 'menunggu_agen').reduce((acc, r) => acc + (r.qty || 0), 0);
            return `<option value="${ag.name}">${ag.name} (${count} pcs antre klaim)</option>`;
        }).join('');
        selAgent.innerHTML = opts;
    }

    const driverInput = document.getElementById('claim-print-driver');
    if (driverInput) driverInput.value = currentUser || '';

    previewAgentClaimItems();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePrintAgentClaimModal() {
    const modal = document.getElementById('modal-print-agent-claim');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function previewAgentClaimItems() {
    const selAgent = document.getElementById('claim-print-agent')?.value;
    const previewList = document.getElementById('claim-preview-list');
    if (!previewList) return;

    if (!selAgent) {
        previewList.innerHTML = `<p class="italic opacity-60">Pilih agen terlebih dahulu untuk melihat daftar barang.</p>`;
        return;
    }

    const items = returnData.filter(r => r.agent === selAgent && r.claim_status === 'menunggu_agen');
    if (items.length === 0) {
        previewList.innerHTML = `<p class="text-emerald-500 font-semibold"><i class="fa-solid fa-circle-check mr-1"></i> Tidak ada antrean barang retur untuk ${selAgent}.</p>`;
        return;
    }

    let html = `<ul class="space-y-1">`;
    items.forEach(r => {
        html += `<li class="flex justify-between items-center border-b border-inherit pb-1">
            <span><strong>${r.qty} pcs</strong> ${r.item_name} <span class="opacity-60 text-[10px]">(${r.reason})</span></span>
            <span class="font-mono text-[10px] opacity-75">Toko: ${r.customer}</span>
        </li>`;
    });
    html += `</ul>`;
    previewList.innerHTML = html;
}

function generateAgentClaimPDF() {
    const selAgent = document.getElementById('claim-print-agent')?.value;
    const driverName = document.getElementById('claim-print-driver')?.value.trim() || (currentUser || 'Driver / Sales');

    if (!selAgent) {
        return showNotification("Peringatan", "Pilih agen terlebih dahulu!", "warning");
    }

    const items = returnData.filter(r => r.agent === selAgent && r.claim_status === 'menunggu_agen');
    if (items.length === 0) {
        return showNotification("Info", `Tidak ada barang retur yang menunggu klaim untuk ${selAgent}.`, "info");
    }

    const renderArea = document.getElementById('report-pdf-render-area');
    if (!renderArea) return;

    const todayFormatted = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const docNumber = `SJ-KLAIM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalQty = 0;
    let totalModal = 0;

    let rowsHtml = '';
    items.forEach((r, idx) => {
        totalQty += (r.qty || 0);
        totalModal += (r.total_modal || (r.qty * (r.buy || 0)));
        rowsHtml += `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
                <td style="padding: 6px 8px; font-weight: 600;">${r.item_name}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: #e11d48;">${r.qty} pcs</td>
                <td style="padding: 6px 8px;">${r.reason}</td>
                <td style="padding: 6px 8px; opacity: 75;">${r.customer}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace;">Rp ${(r.total_modal || (r.qty * (r.buy||0))).toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    renderArea.innerHTML = `
        <div style="font-family: 'Poppins', sans-serif; color: #0f172a; line-height: 1.4; padding: 10px;">
            <!-- Header Kop -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f59e0b; padding-bottom: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="Snackloop-logo.png" style="height: 40px; width: auto; object-fit: contain;">
                    <div>
                        <h1 style="font-size: 16px; font-weight: 800; margin: 0; color: #1e1b4b;">SnackLoop Distribution</h1>
                        <p style="font-size: 10px; color: #64748b; margin: 0;">Sistem Distribusi & Pengelolaan Stok Snack</p>
                    </div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #475569;">
                    <p style="margin: 0; font-weight: 800; color: #d97706; font-size: 13px;">SURAT JALAN KLAIM RETUR BARANG</p>
                    <p style="margin: 2px 0 0 0; font-family: monospace;">No: <strong>${docNumber}</strong></p>
                    <p style="margin: 2px 0 0 0;">Tanggal: ${todayFormatted}</p>
                </div>
            </div>

            <!-- Info Agen & Pembawa -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                    <span style="color: #64748b; display: block; font-size: 10px;">Kepada Supplier / Agen:</span>
                    <strong style="font-size: 13px; color: #1e293b;">${selAgent}</strong>
                </div>
                <div style="text-align: right;">
                    <span style="color: #64748b; display: block; font-size: 10px;">Petugas Pembawa Barang (Kurir/Sales):</span>
                    <strong style="font-size: 12px; color: #1e293b;">${driverName}</strong>
                </div>
            </div>

            <!-- Tabel Barang -->
            <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 16px;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                        <th style="padding: 6px 8px; text-align: center; width: 30px;">No</th>
                        <th style="padding: 6px 8px;">Nama Snack / Produk</th>
                        <th style="padding: 6px 8px; text-align: center; width: 75px;">Qty Rusak</th>
                        <th style="padding: 6px 8px;">Alasan Kerusakan</th>
                        <th style="padding: 6px 8px;">Toko Asal</th>
                        <th style="padding: 6px 8px; text-align: right; width: 110px;">Estimasi Modal</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr style="background: #fffbeb; font-weight: bold; border-top: 2px solid #f59e0b;">
                        <td colspan="2" style="padding: 8px; text-align: right;">TOTAL BARANG RETUR:</td>
                        <td style="padding: 8px; text-align: center; color: #e11d48; font-size: 12px;">${totalQty} pcs</td>
                        <td colspan="2" style="padding: 8px;"></td>
                        <td style="padding: 8px; text-align: right; color: #d97706; font-size: 11px;">Rp ${totalModal.toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>

            <p style="font-size: 10px; color: #64748b; margin-bottom: 28px;">
                * Catatan: Mohon diperiksa fisik barang yang diserahkan untuk proses tukar guling (barang baru) atau potongan tagihan belanja berikutnya.
            </p>

            <!-- Tanda Tangan -->
            <div style="display: flex; justify-content: space-between; font-size: 10.5px;">
                <div style="text-align: center; width: 170px;">
                    <p style="color: #64748b; margin-bottom: 50px;">Diserahkan Oleh (SnackLoop),</p>
                    <p style="font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; margin: 0;">${driverName}</p>
                    <span style="font-size: 9px; opacity: 60;">Driver / Petugas Lapangan</span>
                </div>
                <div style="text-align: center; width: 170px;">
                    <p style="color: #64748b; margin-bottom: 50px;">Diterima Oleh (Agen Supplier),</p>
                    <p style="font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; margin: 0;">( .................................... )</p>
                    <span style="font-size: 9px; opacity: 60;">Pihak ${selAgent}</span>
                </div>
            </div>
        </div>
    `;

    closePrintAgentClaimModal();

    if (typeof html2pdf !== 'undefined') {
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Surat_Jalan_Klaim_${selAgent.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        showNotification("Memproses Dokumen", "Sedang membuat Surat Jalan Klaim Agen...", "info");
        html2pdf().from(renderArea).set(opt).save().then(() => {
            showNotification("Sukses", "Surat Jalan Klaim Agen berhasil diunduh!", "success");
        }).catch(err => {
            console.warn("Fallback to print:", err);
            window.print();
        });
    } else {
        window.print();
    }
}


// ========================================================================================= //
// ==================== PWA 1-KLIK: PASANG KE LAYAR UTAMA (A2HS) =========================== //
// ========================================================================================= //

let deferredPwaPrompt = null;

// Tangkap event sebelum dialog instalasi bawaan browser muncul
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    console.log('[PWA] beforeinstallprompt event ditangkap!');

    if (!isAppInstalled()) {
        showPwaInstallElements();
    }
});

// Tangkap event saat aplikasi selesai dipasang
window.addEventListener('appinstalled', (evt) => {
    console.log('[PWA] SnackLoop berhasil dipasang ke Layar Utama!');
    deferredPwaPrompt = null;
    hidePwaInstallElements();
    showNotification("Sukses", "SnackLoop ERP berhasil dipasang di Layar Utama Anda!", "success");
});

function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

function isIosDevice() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function showPwaInstallElements() {
    if (isAppInstalled()) return;

    // Tampilkan tombol di Header
    const btn = document.getElementById('btn-install-pwa');
    if (btn) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
    }

    // Tampilkan tombol di Sidebar Navbar
    const navItem = document.getElementById('nav-item-install-pwa');
    if (navItem) {
        navItem.style.display = 'block';
        if (typeof feather !== 'undefined') feather.replace();
    }

    // Tampilkan floating banner jika belum ditutup di sesi ini
    const dismissed = sessionStorage.getItem('snackloop_pwa_dismissed');
    if (!dismissed) {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('hidden');
        }
    }
}

function hidePwaInstallElements() {
    const btn = document.getElementById('btn-install-pwa');
    if (btn) {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
    }
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
    const navItem = document.getElementById('nav-item-install-pwa');
    if (navItem) {
        navItem.style.display = 'none';
    }
}

function dismissInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
    sessionStorage.setItem('snackloop_pwa_dismissed', 'true');
}

function getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'pc';
}

function switchInstallGuideTab(tab) {
    const panels = ['android', 'ios', 'pc'];
    panels.forEach(p => {
        const panelEl = document.getElementById('panel-inst-' + p);
        const btnEl = document.getElementById('tab-btn-inst-' + p);
        if (p === tab) {
            if (panelEl) panelEl.classList.remove('hidden');
            if (btnEl) {
                btnEl.className = "py-1.5 rounded-lg transition bg-indigo-600 text-white shadow-sm font-bold";
            }
        } else {
            if (panelEl) panelEl.classList.add('hidden');
            if (btnEl) {
                btnEl.className = "py-1.5 rounded-lg transition opacity-70 hover:opacity-100";
            }
        }
    });
}

function openInstallGuideModal(preferredTab = null) {
    const modal = document.getElementById('modal-install-guide');
    if (!modal) return;
    const tabToOpen = preferredTab || getDeviceType();
    switchInstallGuideTab(tabToOpen);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeInstallGuideModal() {
    const modal = document.getElementById('modal-install-guide');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function openIosInstallModal() {
    openInstallGuideModal('ios');
}

function closeIosInstallModal() {
    closeInstallGuideModal();
}

async function triggerPwaInstall() {
    // 1. Jika event deferredPrompt siap (Chromium, Chrome Mobile, Edge)
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        console.log(`[PWA] Keputusan pengguna: ${outcome}`);
        if (outcome === 'accepted') {
            hidePwaInstallElements();
            showNotification("Memasang Aplikasi", "SnackLoop sedang ditambahkan ke layar utama perangkat Anda...", "info");
        }
        deferredPwaPrompt = null;
        return;
    }

    // 2. Jika sudah terpasang
    if (isAppInstalled()) {
        return showNotification("Info", "Aplikasi SnackLoop sudah terpasang di layar utama perangkat ini.", "info");
    }

    // 3. Buka dialog panduan instalasi visual instan (otomatis sesuai jenis perangkat)
    openInstallGuideModal();
}

// Inisialisasi pemeriksaan status instalasi saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (isAppInstalled()) {
            hidePwaInstallElements();
        } else {
            showPwaInstallElements();
        }
    }, 1500);
});


// ========================================================================================= //
// ==================== MODUL PENGATURAN SISTEM & PROFIL USAHA ============================= //
// ========================================================================================= //

const DEFAULT_APP_SETTINGS = {
    businessName: "SnackLoop ERP",
    businessTagline: "Sistem Manajemen & Distribusi Snack",
    businessAddress: "Indonesia",
    businessCity: "Jakarta",
    bankAccount: "BCA 12345678 a/n SnackLoop",
    whatsappPhone: "628123456789",
    printFormat: "a4"
};

function loadAppSettings() {
    try {
        const saved = localStorage.getItem('snackloop_settings');
        if (saved) {
            return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
        }
    } catch(e) {}
    return { ...DEFAULT_APP_SETTINGS };
}

let appSettings = loadAppSettings();

function applyAppSettingsUI() {
    // Terapkan nama usaha ke judul dan kop
    const brandSub = document.querySelector('header .text-\\[10px\\]');
    if (brandSub && appSettings.businessTagline) {
        brandSub.innerText = appSettings.businessTagline;
    }
}

function openSettingsModal(initialTab = 'profile') {
    const modal = document.getElementById('modal-settings');
    if (!modal) return;

    // Sanitasi parameter initialTab
    if (typeof initialTab !== 'string' || !['profile', 'backup', 'app'].includes(initialTab)) {
        initialTab = 'app';
    }
    if (initialTab === 'settings' || initialTab === 'preferences' || initialTab === 'pref') {
        initialTab = 'app';
    }

    // Role Permissions pada Tab Pengaturan
    const isSuperAdmin = currentRole === 'super_admin';
    const profileTabBtn = document.getElementById('set-tab-btn-profile');
    const backupTabBtn = document.getElementById('set-tab-btn-backup');

    if (profileTabBtn) {
        profileTabBtn.style.display = isSuperAdmin ? 'flex' : 'none';
    }
    if (backupTabBtn) {
        backupTabBtn.style.display = isSuperAdmin ? 'flex' : 'none';
    }

    // Jika staf / viewer buka pengaturan, arahkan langsung ke tab Preferensi Sistem (Dark Mode & Bahasa)
    if (!isSuperAdmin) {
        initialTab = 'app';
    }

    appSettings = loadAppSettings();

    // Isi nilai input form
    const nameEl = document.getElementById('set-biz-name');
    const tagEl = document.getElementById('set-biz-tagline');
    const phoneEl = document.getElementById('set-biz-phone');
    const cityEl = document.getElementById('set-biz-city');
    const bankEl = document.getElementById('set-biz-bank');
    const addrEl = document.getElementById('set-biz-address');
    const printEl = document.getElementById('set-print-format');

    if (nameEl) nameEl.value = appSettings.businessName || '';
    if (tagEl) tagEl.value = appSettings.businessTagline || '';
    if (phoneEl) phoneEl.value = appSettings.whatsappPhone || '';
    if (cityEl) cityEl.value = appSettings.businessCity || '';
    if (bankEl) bankEl.value = appSettings.bankAccount || '';
    if (addrEl) addrEl.value = appSettings.businessAddress || '';
    if (printEl) printEl.value = appSettings.printFormat || 'a4';

    updateThemeButtonsUI();
    updateLanguageButtonsUI();
    switchSettingsTab(initialTab);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
}

function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
}

function switchSettingsTab(tabName) {
    if (typeof tabName !== 'string' || !['profile', 'backup', 'app'].includes(tabName)) {
        tabName = 'app';
    }
    const panels = ['profile', 'backup', 'app'];
    panels.forEach(p => {
        const panelEl = document.getElementById('set-panel-' + p);
        const btnEl = document.getElementById('set-tab-btn-' + p);

        if (p === tabName) {
            if (panelEl) {
                panelEl.classList.remove('hidden');
                panelEl.style.display = 'block';
            }
            if (btnEl) {
                btnEl.className = "px-3 py-2 font-bold border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 transition flex items-center gap-1.5";
            }
        } else {
            if (panelEl) {
                panelEl.classList.add('hidden');
                panelEl.style.display = 'none';
            }
            if (btnEl) {
                btnEl.className = "px-3 py-2 font-semibold opacity-70 hover:opacity-100 transition flex items-center gap-1.5";
            }
        }
    });
}

function saveAppSettings(e) {
    e.preventDefault();

    const name = document.getElementById('set-biz-name')?.value.trim() || DEFAULT_APP_SETTINGS.businessName;
    const tagline = document.getElementById('set-biz-tagline')?.value.trim() || DEFAULT_APP_SETTINGS.businessTagline;
    const phone = document.getElementById('set-biz-phone')?.value.trim() || DEFAULT_APP_SETTINGS.whatsappPhone;
    const city = document.getElementById('set-biz-city')?.value.trim() || DEFAULT_APP_SETTINGS.businessCity;
    const bank = document.getElementById('set-biz-bank')?.value.trim() || DEFAULT_APP_SETTINGS.bankAccount;
    const address = document.getElementById('set-biz-address')?.value.trim() || DEFAULT_APP_SETTINGS.businessAddress;
    const printFormat = document.getElementById('set-print-format')?.value || 'a4';

    appSettings = {
        businessName: name,
        businessTagline: tagline,
        whatsappPhone: phone,
        businessCity: city,
        bankAccount: bank,
        businessAddress: address,
        printFormat: printFormat
    };

    localStorage.setItem('snackloop_settings', JSON.stringify(appSettings));
    applyAppSettingsUI();
    closeSettingsModal();
    showNotification("Sukses", "Pengaturan sistem & identitas nota berhasil diperbarui!", "success");
}

function resetAppSettingsToDefault() {
    if (!confirm("Kembalikan semua pengaturan sistem ke standar default?")) return;
    appSettings = { ...DEFAULT_APP_SETTINGS };
    localStorage.setItem('snackloop_settings', JSON.stringify(appSettings));
    openSettingsModal();
    applyAppSettingsUI();
    showNotification("Pengaturan Direset", "Pengaturan telah dikembalikan ke standar awal.", "info");
}

function clearLocalAppCache() {
    if (!confirm("Bersihkan cache lokal browser? Data Anda di database cloud tetap aman.")) return;
    try {
        localStorage.removeItem('snackloop_cache');
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        showNotification("Sukses", "Cache lokal browser berhasil dibersihkan! Memuat ulang...", "success");
        setTimeout(() => {
            window.location.reload();
        }, 1200);
    } catch(err) {
        showNotification("Gagal", "Gagal membersihkan cache lokal.", "error");
    }
}

// Inisialisasi pengaturan saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
    applyAppSettingsUI();
});


// ========================================================================================= //
// ==================== ENGINE CETAK STRUK KASIR THERMAL (58MM / 80MM) ===================== //
// ========================================================================================= //

function printThermalReceipt(receiptData, format = 'thermal58') {
    const is58 = format === 'thermal58';
    const paperWidth = is58 ? '48mm' : '72mm';
    const fontSize = is58 ? '10.5px' : '11.5px';

    const bizName = (appSettings?.businessName || 'SNACKLOOP ERP').toUpperCase();
    const bizTagline = appSettings?.businessTagline || 'Sistem Distribusi Snack';
    const bizAddr = appSettings?.businessAddress || '';
    const bizCity = appSettings?.businessCity || '';
    const bizPhone = appSettings?.whatsappPhone || '';
    const bankInfo = appSettings?.bankAccount || '';

    let itemsRows = '';
    let subtotal = 0;

    (receiptData.items || []).forEach(item => {
        const itemTotal = (item.qty * item.sell);
        subtotal += itemTotal;
        itemsRows += `
            <div style="margin-bottom: 4px;">
                <div style="font-weight: bold; word-break: break-word;">${item.name}</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>${item.qty} x ${item.sell.toLocaleString('id-ID')}</span>
                    <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    const extraCost = receiptData.extraCost || 0;
    const grandTotal = receiptData.grandTotal || (subtotal + extraCost);
    const statusBayar = receiptData.status === 'Lunas' ? 'LUNAS (SELESAI)' : 'TEMPO / BELUM LUNAS';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Struk_${receiptData.noNota || 'Receipt'}</title>
            <style>
                @page {
                    size: ${is58 ? '58mm' : '80mm'} auto;
                    margin: 0;
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: ${fontSize};
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: ${is58 ? '2mm 2mm 8mm 2mm' : '3mm 3mm 10mm 3mm'};
                    width: ${paperWidth};
                    max-width: ${paperWidth};
                    box-sizing: border-box;
                    line-height: 1.25;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .divider { margin: 4px 0; border-top: 1px dashed #000; }
                .double-divider { margin: 4px 0; border-top: 1.5px solid #000; }
                .flex-between { display: flex; justify-content: space-between; }
                @media print {
                    body {
                        width: ${paperWidth};
                    }
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="bold" style="font-size: ${is58 ? '13px' : '15px'};">${bizName}</div>
                <div style="font-size: 9.5px;">${bizTagline}</div>
                ${bizAddr ? `<div style="font-size: 9px;">${bizAddr}${bizCity ? ', ' + bizCity : ''}</div>` : ''}
                ${bizPhone ? `<div style="font-size: 9px;">WA: ${bizPhone}</div>` : ''}
            </div>

            <div class="double-divider"></div>

            <div style="font-size: 9.5px;">
                <div class="flex-between">
                    <span>No. Nota:</span>
                    <span class="bold">${receiptData.noNota}</span>
                </div>
                <div class="flex-between">
                    <span>Tanggal:</span>
                    <span>${receiptData.date}</span>
                </div>
                <div class="flex-between">
                    <span>Pelanggan:</span>
                    <span class="bold">${receiptData.customer}</span>
                </div>
                <div class="flex-between">
                    <span>Petugas:</span>
                    <span>${receiptData.operator || (currentUser || 'Kasir')}</span>
                </div>
            </div>

            <div class="divider"></div>

            <!-- Items -->
            <div>
                ${itemsRows}
            </div>

            <div class="divider"></div>

            <!-- Total Calculations -->
            <div style="font-size: 10px;">
                <div class="flex-between">
                    <span>Subtotal:</span>
                    <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
                </div>
                ${extraCost > 0 ? `
                <div class="flex-between">
                    <span>Ongkir/Biaya:</span>
                    <span>Rp ${extraCost.toLocaleString('id-ID')}</span>
                </div>` : ''}
                <div class="flex-between bold" style="font-size: ${is58 ? '12px' : '13px'}; margin-top: 2px;">
                    <span>TOTAL:</span>
                    <span>Rp ${grandTotal.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex-between" style="margin-top: 3px;">
                    <span>Status:</span>
                    <span class="bold" style="text-decoration: underline;">${statusBayar}</span>
                </div>
            </div>

            ${bankInfo ? `
            <div class="divider"></div>
            <div style="font-size: 9px;" class="text-center">
                <div class="bold">Rekening Pembayaran:</div>
                <div>${bankInfo}</div>
            </div>` : ''}

            <div class="double-divider"></div>

            <div class="text-center" style="font-size: 9px; margin-top: 4px;">
                <div>Barang yang sudah dibeli dapat ditukar</div>
                <div>bila kemasan rusak / melempem.</div>
                <div style="margin-top: 3px;" class="bold">*** TERIMA KASIH ***</div>
            </div>
        </body>
        </html>
    `;

    // Cetak menggunakan iframe tersembunyi untuk zero-margin Bluetooth printing
    let iframe = document.getElementById('thermal-print-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'thermal-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            showNotification("Cetak Struk", `Struk Thermal ${is58 ? '58mm' : '80mm'} berhasil dikirim ke printer!`, "success");
        } catch (e) {
            console.error("Gagal cetak iframe thermal:", e);
            showNotification("Gagal", "Tidak dapat membuka dialog cetak printer.", "error");
        }
    }, 400);
}

function printThermalReceiptFromTrx(targetTrx, format) {
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);
    
    let items = [];
    let extraCost = 0;
    let grandTotal = 0;

    matchingTransactions.forEach(t => {
        items.push({
            name: t.itemName,
            qty: t.qty,
            sell: t.sell
        });
        extraCost += (t.extraCost || 0);
        grandTotal += t.totalSell;
    });

    printThermalReceipt({
        noNota: `TRX-${targetTrx.date.replace(/-/g, '')}-${String(targetTrx.id).slice(-4)}`,
        date: targetTrx.date,
        customer: targetTrx.customer,
        operator: currentUser || 'Kasir',
        status: targetTrx.status,
        items: items,
        extraCost: extraCost,
        grandTotal: grandTotal
    }, format);
}

function printThermalReceiptFromInvoice(inv, format) {
    let items = [];
    let foundTrxList = [];
    for (let m in transactionData) {
        const matches = (transactionData[m] || []).filter(t => t.date === inv.date && t.customer === inv.customer_name);
        if (matches.length > 0) {
            foundTrxList = matches;
            break;
        }
    }

    if (foundTrxList.length > 0) {
        foundTrxList.forEach(t => {
            items.push({
                name: t.itemName,
                qty: t.qty,
                sell: t.sell
            });
        });
    } else {
        items.push({
            name: "Pembelian Produk SnackLoop",
            qty: 1,
            sell: inv.total_amount
        });
    }

    printThermalReceipt({
        noNota: inv.invoice_number,
        date: inv.date,
        customer: inv.customer_name,
        operator: currentUser || 'Kasir',
        status: inv.status,
        items: items,
        extraCost: 0,
        grandTotal: inv.total_amount
    }, format);
}

function testThermalPrintFromSettings() {
    const format = document.getElementById('set-print-format')?.value || appSettings.printFormat || 'thermal58';
    
    if (format === 'a4') {
        return showNotification("Format A4", "Format yang dipilih saat ini adalah Dokumen A4. Pilih 58mm atau 80mm untuk tes cetak printer thermal bluetooth.", "info");
    }

    printThermalReceipt({
        noNota: `TES-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-001`,
        date: new Date().toLocaleDateString('id-ID'),
        customer: "Toko Contoh (Tes Struk)",
        operator: currentUser || 'Admin',
        status: "Lunas",
        items: [
            { name: "Makaroni Pedas Level 3", qty: 10, sell: 7500 },
            { name: "Keripik Singkong Balado", qty: 5, sell: 12000 },
            { name: "Basreng Daun Jeruk", qty: 5, sell: 10000 }
        ],
        extraCost: 0,
        grandTotal: 185000
    }, format);
}
