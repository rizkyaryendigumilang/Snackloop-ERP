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
