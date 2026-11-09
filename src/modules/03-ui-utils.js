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
        <button onclick="this.closest('.theme-card')?.remove()" class="opacity-50 hover:opacity-100 text-sm font-bold shrink-0 leading-none p-1">&times;</button>
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

// ======================= TANGGAL LOKAL & NORMALISASI NOMOR WHATSAPP ======================= //
function getLocalDateStr(dateObj = new Date()) {
    const d = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function normalizeWaPhone(rawPhone, fallback = '') {
    let clean = String(rawPhone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean && fallback) {
        clean = String(fallback).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    }
    return clean;
}

function getAllTransactions() {
    if (typeof transactionData === 'undefined' || !transactionData) return [];
    return Object.values(transactionData).flat().filter(Boolean);
}

function findTransactionById(trxId) {
    const target = String(trxId);
    for (const mk in (typeof transactionData !== 'undefined' ? transactionData : {})) {
        const found = (transactionData[mk] || []).find(t => String(t.id) === target);
        if (found) return found;
    }
    return null;
}

function downloadBlobFile(content, filename, mimeType = 'application/json;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function applyStateBundle(data) {
    if (!data || typeof data !== 'object') return;
    if (data.transactionData) transactionData = data.transactionData;
    if (data.masterData) masterData = data.masterData;
    if (data.customerData) customerData = data.customerData;
    if (data.agentData) agentData = data.agentData;
    if (data.repackData) repackData = data.repackData;
    if (data.expenseData) expenseData = data.expenseData;
    if (data.invoiceData) invoiceData = data.invoiceData;
    if (Array.isArray(data.priceHistoryData)) priceHistoryData = data.priceHistoryData;
    if (data.returnData) returnData = data.returnData;
    if (data.jastipData && typeof jastipData !== 'undefined') jastipData = data.jastipData;
    if (Array.isArray(data.auditLogData)) auditLogData = data.auditLogData;
}

function refreshAllViews() {
    if (typeof renderMonthTabs === 'function') renderMonthTabs();
    if (typeof renderMaster === 'function') renderMaster();
    if (typeof renderCustomer === 'function') renderCustomer();
    if (typeof renderAgents === 'function') renderAgents();
    if (typeof renderRepackWarehouse === 'function') renderRepackWarehouse();
    if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
    if (typeof renderReturns === 'function') renderReturns();
    if (typeof renderJastip === 'function') renderJastip();
    if (typeof renderUsers === 'function') renderUsers();
    if (typeof renderDropdowns === 'function') renderDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderFinancialChart === 'function') renderFinancialChart();
    if (typeof renderTransactionsForActiveSheet === 'function') renderTransactionsForActiveSheet();
}

function getRelativeNavOffset(linkEl, menuEl) {
    let x = 0, y = 0, el = linkEl;
    while (el && el !== menuEl && menuEl.contains(el)) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent;
    }
    return { x, y, w: linkEl.offsetWidth, h: linkEl.offsetHeight };
}

function syncNavbarActivePill(immediate = false) {
    if (typeof document === 'undefined') return;
    const menuEl = document.querySelector('.navbar__menu');
    const pill = document.getElementById('navbar-active-pill');
    const activeLink = menuEl ? menuEl.querySelector('.navbar__link.active') : null;
    if (!menuEl || !pill || !activeLink) return;

    const { x, y, w, h } = getRelativeNavOffset(activeLink, menuEl);
    if (w <= 0 || h <= 0) return;

    const shouldSnap = immediate || !menuEl.classList.contains('pill-ready');
    if (shouldSnap) pill.style.transition = 'none';

    pill.style.width = `${w}px`;
    pill.style.height = `${h}px`;
    pill.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    pill.style.opacity = '1';

    if (shouldSnap) {
        void pill.offsetWidth;
        pill.style.transition = '';
        menuEl.classList.add('pill-ready');
    }
}

function initNavbarPillInteractions() {
    if (typeof document === 'undefined') return;
    const menuEl = document.querySelector('.navbar__menu');
    const hoverPill = document.getElementById('navbar-hover-pill');
    if (!menuEl || !hoverPill || menuEl.dataset.pillBound === 'true') return;
    menuEl.dataset.pillBound = 'true';

    menuEl.querySelectorAll('.navbar__link').forEach(link => {
        link.addEventListener('mouseenter', () => {
            const { x, y, w, h } = getRelativeNavOffset(link, menuEl);
            if (w <= 0 || h <= 0) return;
            const wasHidden = hoverPill.style.opacity !== '1';
            if (wasHidden) hoverPill.style.transition = 'none';
            hoverPill.classList.toggle('is-danger', link.classList.contains('navbar__link--logout'));
            hoverPill.style.width = `${w}px`;
            hoverPill.style.height = `${h}px`;
            hoverPill.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            if (wasHidden) {
                void hoverPill.offsetWidth;
                hoverPill.style.transition = '';
            }
            hoverPill.style.opacity = link.classList.contains('active') ? '0' : '1';
        });
    });

    menuEl.addEventListener('mouseleave', () => {
        hoverPill.style.opacity = '0';
    });

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => syncNavbarActivePill(true));
        window.addEventListener('keydown', (e) => {
            if (e.key === '[' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) && !e.target?.isContentEditable) {
                e.preventDefault();
                toggleNavbarCollapse();
            }
        });
    }
}

function toggleNavbarCollapse(forceCollapsed) {
    if (typeof document === 'undefined' || !document.body) return false;
    const isCurrentlyCollapsed = document.body.classList.contains('navbar-collapsed');
    const nextCollapsed = typeof forceCollapsed === 'boolean' ? forceCollapsed : !isCurrentlyCollapsed;
    document.body.classList.toggle('navbar-collapsed', nextCollapsed);
    const btn = typeof document.getElementById === 'function' ? document.getElementById('navbar-collapse-btn') : null;
    if (btn) {
        btn.setAttribute('aria-expanded', String(!nextCollapsed));
        btn.title = nextCollapsed ? 'Buka Navigasi [' : 'Lipat Navigasi [';
    }
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('snackloop_navbar_collapsed', nextCollapsed ? 'true' : 'false');
        }
    } catch (e) {}
    return nextCollapsed;
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

    const savedNavCollapsed = localStorage.getItem('snackloop_navbar_collapsed') === 'true';
    if (savedNavCollapsed) toggleNavbarCollapse(true);

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
    initNavbarPillInteractions();
    syncNavbarActivePill(true);
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
    if (navUsers) navUsers.style.display = isSuperAdmin ? '' : 'none';

    const navReports = document.getElementById('nav-item-reports');
    if (navReports) navReports.style.display = isSuperAdmin ? '' : 'none';

    const navSettings = document.getElementById('nav-item-settings');
    if (navSettings) navSettings.style.display = '';

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

    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => syncNavbarActivePill(true));
    } else {
        syncNavbarActivePill(true);
    }
}

// ======================= APPLE DESIGN MOTION & HAPTICS ENGINE ======================= //
/**
 * Apple Fluid Interface Mathematics (WWDC 2018 - Designing Fluid Interfaces)
 */
const AppleMotion = {
    // 1. Rubber-banding Formula (Soft Boundaries)
    // f(x, d, c) = (x * d * c) / (d + c * |x|)
    rubberband(overshoot, dimension, constant = 0.55) {
        if (!overshoot || !dimension) return 0;
        return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
    },

    // 2. Momentum Projection via Exponential Decay
    // endpoint = (v / 1000) * d / (1 - d)
    projectMomentum(initialVelocity, decelerationRate = 0.998) {
        if (!initialVelocity) return 0;
        return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
    },

    // 3. Apple Spring Simulation Step (Displacement & Velocity)
    springStep(current, target, velocity, dampingRatio = 1.0, responseTime = 0.35, dt = 0.016) {
        const angularFreq = (2 * Math.PI) / Math.max(0.01, responseTime);
        const dampingCoeff = 2 * dampingRatio * angularFreq;
        const springForce = -Math.pow(angularFreq, 2) * (current - target);
        const dampingForce = -dampingCoeff * velocity;
        const acceleration = springForce + dampingForce;

        const nextVelocity = velocity + acceleration * dt;
        const nextPosition = current + nextVelocity * dt;
        return { position: nextPosition, velocity: nextVelocity };
    },

    // 4. Subtle Multimodal Audio-Haptic Feedback (WWDC Designing Audio-Haptic Experiences)
    triggerHaptic(type = 'light') {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                if (type === 'light') navigator.vibrate(10);
                else if (type === 'medium') navigator.vibrate(25);
                else if (type === 'success') navigator.vibrate([12, 40, 12]);
                else if (type === 'warning') navigator.vibrate([20, 50, 30]);
                else if (type === 'error') navigator.vibrate([40, 60, 40]);
            } catch (e) {
                // Ignore silent failure on restricted browsers
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.SnackLoop = window.SnackLoop || {};
    window.SnackLoop.AppleMotion = AppleMotion;
}
