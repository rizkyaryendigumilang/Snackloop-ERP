// =========================================================================
// KEAMANAN & ENKODING DATA (XSS PROTECTION & CRYPTO HASHING)
// =========================================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function hashPassword(plainText, salt = 'snackloop_sec_salt_2026') {
    if (!plainText) return '';
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const enc = new TextEncoder();
            const data = enc.encode(plainText + ':' + salt);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return 'sha256$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch(e) {
            console.warn('[Crypto] subtle digest fallback:', e);
        }
    }
    let hash = 0;
    const str = plainText + ':' + salt;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return 'h$' + Math.abs(hash).toString(16);
}

// ======================= SISTEM TOAST NOTIFIKASI MODERN ======================= //
function showNotification(title, message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-5 right-5 z-[9999999] space-y-3 pointer-events-none w-80 max-w-full';
        document.body.appendChild(container);
    }

    let iconClass = 'fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400';
    if (type === 'info') { iconClass = 'fa-solid fa-circle-info text-indigo-600 dark:text-indigo-400'; }
    if (type === 'warning') { iconClass = 'fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400'; }
    if (type === 'error') { iconClass = 'fa-solid fa-circle-xmark text-rose-600 dark:text-rose-400'; }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto theme-card rounded-xl shadow-lg border border-inherit p-3.5 flex items-start justify-between gap-3 transform translate-x-4 opacity-0 transition-[transform,opacity] duration-200 ease-out z-[9999999] w-full`;
    const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(title) : title;
    const safeMsg = typeof escapeHtml === 'function' ? escapeHtml(message) : message;
    toast.innerHTML = `
        <div class="flex items-start gap-2.5">
            <i class="${iconClass} text-base mt-0.5 shrink-0"></i>
            <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">${safeTitle}</h4>
                <p class="text-xs opacity-75 mt-0.5 leading-relaxed">${safeMsg}</p>
            </div>
        </div>
        <button onclick="this.closest('div').parentElement.remove()" class="opacity-50 hover:opacity-100 text-sm font-bold shrink-0 leading-none p-1">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-x-4', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-x-4', 'opacity-0');
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

// ======================= CHRONOLOGICAL MONTH PARSING & SORTING ======================= //
const INDO_MONTHS_MAP = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
    'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
};

function parseMonthKey(mk) {
    if (!mk || typeof mk !== 'string') return 0;
    const parts = mk.trim().split(/\s+/);
    if (parts.length < 2) return 0;
    const m = INDO_MONTHS_MAP[parts[0]] !== undefined ? INDO_MONTHS_MAP[parts[0]] : 0;
    const y = parseInt(parts[1], 10) || 2000;
    return y * 12 + m;
}

function sortMonthKeys(keys, asc = true) {
    if (!Array.isArray(keys)) return [];
    return [...keys].sort((a, b) => {
        const diff = parseMonthKey(a) - parseMonthKey(b);
        return asc ? diff : -diff;
    });
}

// ======================= PENGGANTI DEFAULT TOOLTIP BROWSER & PERSISTENT SESSION ======================= //
document.addEventListener("DOMContentLoaded", async function() {
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
    await loadCacheFromLocal();
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
