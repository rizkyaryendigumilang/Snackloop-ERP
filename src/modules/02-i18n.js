// ======================= SISTEM MULTI-BAHASA (I18N) & TEMA ======================= //
let currentLanguage = localStorage.getItem('snackloop_lang') || 'id';

const I18N = {
    id: {
        // Navigasi Sidebar
        nav_dashboard: "Dashboard",
        nav_transactions: "Buku Transaksi",
        nav_invoices: "Manajemen Invoice",
        nav_returns: "Retur & Klaim Agen",
        nav_jastip: "Jastip",
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
        nav_jastip: "Jastip",
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
