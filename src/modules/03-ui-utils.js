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
    'Jan': 0, 'Januari': 0, 'January': 0,
    'Feb': 1, 'Februari': 1, 'February': 1,
    'Mar': 2, 'Maret': 2, 'March': 2,
    'Apr': 3, 'April': 3,
    'Mei': 4, 'May': 4,
    'Jun': 5, 'Juni': 5, 'June': 5,
    'Jul': 6, 'Juli': 6, 'July': 6,
    'Agu': 7, 'Agt': 7, 'Agustus': 7, 'Aug': 7, 'August': 7,
    'Sep': 8, 'September': 8,
    'Okt': 9, 'Oct': 9, 'Oktober': 9, 'October': 9,
    'Nov': 10, 'November': 10,
    'Des': 11, 'Dec': 11, 'Desember': 11, 'December': 11
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
    if (typeof keys.toSorted === 'function') {
        return keys.toSorted((a, b) => {
            const diff = parseMonthKey(a) - parseMonthKey(b);
            return asc ? diff : -diff;
        });
    }
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

// Validasi Masa Aktif Sesi Pengguna (Session TTL: Default 7 Hari = 604,800,000 ms)
function validateSessionTTL(sessionData, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    if (!sessionData || typeof sessionData !== 'object') return false;
    if (!sessionData.username) return false;
    const loginTs = sessionData.loginAt || sessionData.timestamp || 0;
    if (!loginTs || typeof loginTs !== 'number') return false;
    return (Date.now() - loginTs) <= maxAgeMs;
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
    const metaTheme = document.querySelector('meta[name="color-scheme"]');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (metaTheme) metaTheme.content = 'dark';
    } else {
        document.body.classList.remove('dark-theme');
        if (metaTheme) metaTheme.content = 'light';
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

    // Cek Sesi Login yang Tersimpan dengan Validasi TTL 7 Hari (Persistent Session Check)
    const savedSession = localStorage.getItem('snackloop_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (validateSessionTTL(sessionData)) {
                currentUser = sessionData.username;
                currentRole = sessionData.role;

                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                
                applyRolePermissions();
                initApp();
            } else {
                console.info("[Auth] Sesi login telah kedaluwarsa (> 7 hari). Membersihkan sesi lokal demi keamanan.");
                localStorage.removeItem('snackloop_session');
                currentUser = null;
                currentRole = null;
            }
        } catch(e) {
            localStorage.removeItem('snackloop_session');
        }
    }

    // P4: Normalisasi Otomatis Nomor WhatsApp pada Seluruh Input Formulir
    const phoneInputIds = ['cu-phone', 'jastip-cust-phone', 'set-biz-phone', 'wa-modal-phone'];
    phoneInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('blur', function() {
                if (this.value && typeof normalizeWaPhone === 'function') {
                    this.value = normalizeWaPhone(this.value);
                }
            });
        }
    });

    if (typeof feather !== 'undefined') feather.replace();
    initNavbarPillInteractions();
    syncNavbarActivePill(true);
});

// ======================= SISTEM HAK AKSES PERAN (ROLE-BASED PERMISSIONS) ======================= //
function applyRolePermissions() {
    const isSuperAdmin = currentRole === 'super_admin';
    const isStaffRekap = currentRole === 'staff_rekap';
    const isKasir = currentRole === 'kasir';
    const isAdminGudang = currentRole === 'admin_gudang';
    const isView = currentRole === 'view' || (!isSuperAdmin && !isStaffRekap && !isKasir && !isAdminGudang);

    // 1. Label Pengguna & Badge Peran di Top Header
    const userLabelEl = document.getElementById('current-user-label');
    const userBadgeEl = document.getElementById('user-badge');
    if (userLabelEl) {
        let roleDisplay = 'VIEWER';
        if (isSuperAdmin) roleDisplay = 'OWNER';
        else if (isKasir) roleDisplay = 'KASIR';
        else if (isAdminGudang) roleDisplay = 'ADMIN GUDANG';
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

    // Menu Gudang vs Kasir
    const navRepack = document.getElementById('nav-item-repack');
    if (navRepack) navRepack.style.display = isKasir ? 'none' : '';

    const navMaster = document.getElementById('nav-item-master');
    if (navMaster) navMaster.style.display = isKasir ? 'none' : '';

    const navAgents = document.getElementById('nav-item-agents');
    if (navAgents) navAgents.style.display = isKasir ? 'none' : '';

    // 3. Form Input Cards
    // Kasir & Staff Rekap: BISA input transaksi & pelanggan
    // Admin Gudang: BISA input master, repack, agen
    // Owner: BISA SEMUA
    // Viewer: TIDAK BISA input
    const formCards = ['form-transaksi-card', 'form-repack-card', 'form-master-card', 'form-customer-card', 'form-agent-card'];
    formCards.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isView) {
                el.style.display = 'none';
            } else if (isKasir) {
                el.style.display = (id === 'form-transaksi-card' || id === 'form-customer-card') ? 'block' : 'none';
            } else if (isAdminGudang) {
                el.style.display = (id === 'form-master-card' || id === 'form-repack-card' || id === 'form-agent-card') ? 'block' : 'none';
            } else {
                el.style.display = 'block';
            }
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

// =========================================================================
// CANONICAL MASTER CATALOG (REFERENSI RESMI GOOGLE SPREADSHEET)
// Sumber: https://docs.google.com/spreadsheets/d/16-y31zsM8Trtn9AhKmnU5sprM2YkfSrt9EwU98w3euY/edit?usp=sharing
// =========================================================================
var CANONICAL_MASTER_CATALOG = [
    { name: "Le Mineral 600ml", buy: 50000, sell: 65000, aliases: ["le minerale 600ml"] },
    { name: "Le Mineal 330ml", buy: 42000, sell: 55000, aliases: ["le minerale 330ml", "le mineral 330ml"] },
    { name: "Le Mineral 1500ml", buy: 52000, sell: 70000, aliases: ["le minerale 1500ml"] },
    { name: "Vit Mineral 550ml", buy: 36000, sell: 55000, aliases: ["vit 550ml"] },
    { name: "Nextar Brownis", buy: 21000, sell: 23000, aliases: ["nextar brownies"] },
    { name: "Slai o'lai Stawberry", buy: 18000, sell: 22000, aliases: ["slai olai strawberry", "slai olai stawberry", "slai o'lai strawberry"] },
    { name: "Chocolatos", buy: 21000, sell: 25000, aliases: ["chocolatos choco"] },
    { name: "Sari Gandum Coklat", buy: 22000, sell: 23000 },
    { name: "Momogi Jagung", buy: 10000, sell: 17000 },
    { name: "Momogi Keju", buy: 10000, sell: 17000 },
    { name: "Momogi Coklat", buy: 10000, sell: 17000 },
    { name: "Astor", buy: 18000, sell: 20000 },
    { name: "Better", buy: 18000, sell: 20000 },
    { name: "Better Caramel", buy: 18000, sell: 20000 },
    { name: "Coki-Coki", buy: 19000, sell: 20000, aliases: ["coki coki", "choki choki", "choki-choki", "choki-choki stick", "choki - choki stick"] },
    { name: "Superstar", buy: 19000, sell: 22000 },
    { name: "Pocky Mini Size Box", buy: 26022, sell: 27000, aliases: ["pocky mini"] },
    { name: "Sari Gandum Peanute", buy: 24273, sell: 25000, aliases: ["sari gandum peanut"] },
    { name: "Chocolatos Mix Variant", buy: 23274, sell: 25000 },
    { name: "SPIX Soba Renceng BBQ", buy: 12000, sell: 15000, aliases: ["spix soba"] },
    { name: "Oishi Snack Renceng Pop Corn", buy: 20773, sell: 25000, aliases: ["oishi pop corn", "oishi popcorn"] },
    { name: "Garuda Kacang Telur Pack", buy: 20273, sell: 25000, aliases: ["garuda kacang telur"] },
    { name: "Slai o'lai Nanas", buy: 19523, sell: 23000, aliases: ["slai olai nanas"] },
    { name: "Go! Egg roll", buy: 13023, sell: 17000, aliases: ["go egg roll"] },
    { name: "Gery Wafer Roll Coconut", buy: 11733, sell: 15000, aliases: ["gery coconut"] },
    { name: "Superco", buy: 10023, sell: 15000 },
    { name: "Nabati AHH Long Staw", buy: 9398, sell: 15000, aliases: ["nabati ahh long straw", "nabati ahh long strawberry", "nabati ahh long staw"] },
    { name: "Nabati AHH Long Chese", buy: 9000, sell: 15000, aliases: ["nabati ahh long cheese", "nabati ahh long chese"] },
    { name: "Roma Malkist Keju Manis Renceng", buy: 9273, sell: 15000 },
    { name: "Roma Malkist Original Renceng", buy: 9273, sell: 15000 },
    { name: "Kacang Garuda Roast Renceng Bawang", buy: 9223, sell: 14000 },
    { name: "Kacang Garuda Roast Renceng Pedas", buy: 9223, sell: 14000 },
    { name: "Momogi Caramel", buy: 8148, sell: 17000 },
    { name: "Momogi Rendang", buy: 8148, sell: 17000 },
    { name: "Momogi Jagung Pedas", buy: 8148, sell: 17000 },
    { name: "Momogi Seaweed", buy: 8148, sell: 17000 },
    { name: "Nextar Brownis SP", buy: 18523, sell: 23000 },
    { name: "Momogi Truffle", buy: 9000, sell: 17000 },
    { name: "Momogi Soto Ayam", buy: 9000, sell: 17000 },
    { name: "Ciki Chuba Balado", buy: 19346, sell: 23000, aliases: ["chuba balado"] },
    { name: "Ciki Chuba Keju", buy: 19346, sell: 23000, aliases: ["chuba keju"] },
    { name: "SaltCheese", buy: 10505, sell: 15000, aliases: ["salt cheese"] },
    { name: "Mie Shorr Ayam Panggang", buy: 18000, sell: 23000, aliases: ["mie shorr"] },
    { name: "NoriGo Pedas", buy: 22000, sell: 25000, aliases: ["norigo", "nori renceng"] },
    { name: "Nabati Waffer Coklat", buy: 9000, sell: 15000, aliases: ["nabati wafer coklat"] },
    { name: "Dilan Matcha", buy: 22000, sell: 25000 },
    { name: "Nextar Chocopie", buy: 22000, sell: 25000 },
    { name: "Stick Biscuite Nissin", buy: 9000, sell: 14000, aliases: ["stick biscuit nissin"] },
    { name: "Soba Baldo", buy: 9000, sell: 13000, aliases: ["soba balado"] },
    { name: "Mie Lidi (25pcs)", buy: 10000, sell: 20000, aliases: ["mie lidi"] },
    { name: "Kripik Kaca", buy: 10000, sell: 11000 },
    { name: "Makaroni Pedas Daun Jeruk 175 Grm", buy: 7964, sell: 8000, aliases: ["makaroni pedas daun jeruk"] },
    { name: "Makaroni Ulir 175Grm", buy: 8234, sell: 8000, aliases: ["makaroni ulir"] },
    { name: "Krupuk Seblak", buy: 6191, sell: 8000 },
    { name: "Apetito Snack Stik", buy: 18000, sell: 20000 },
    { name: "Basreng Daun Jeruk 175Grm", buy: 6000, sell: 8000, aliases: ["basreng daun jeruk"] },
    { name: "Nextar Chocopie Staw", buy: 22000, sell: 25000, aliases: ["nextar chocopie straw", "nextar chocopie strawberry"] },
    { name: "Chupacups", buy: 22000, sell: 25000, aliases: ["chupa chups", "chupacup"] },
    { name: "Fruta Gummy", buy: 11000, sell: 16000 },
    { name: "Popmie Biasa Kuah", buy: 4375, sell: 5500 },
    { name: "Makaroni Bantet 1Kg", buy: 27788, sell: 35000 },
    { name: "Seblak Rafael", buy: 19799, sell: 25000 },
    { name: "Arden Blueberry", buy: 22000, sell: 25000 },
    { name: "Floaty", buy: 10000, sell: 12000 },
    { name: "Good Time", buy: 22000, sell: 25000 },
    { name: "Caca", buy: 18000, sell: 23000 },
    { name: "Cannonball", buy: 11000, sell: 20000 },
    { name: "Bonita", buy: 22000, sell: 25000 },
    { name: "Oreo Softcake", buy: 22000, sell: 25000 },
    { name: "OMG Snack", buy: 18000, sell: 28000 },
    { name: "Marie Gold", buy: 22000, sell: 25000 },
    { name: "Makaroni Naruto (6pcs)", buy: 10000, sell: 12000, aliases: ["makaroni naruto"] },
    { name: "Roti Aoka", buy: 9000, sell: 13000 },
    { name: "Le Mineral 1500ml Agen Mampang", buy: 62000, sell: 70000 },
    { name: "Le Mineral 600ml Agen Mampang", buy: 52000, sell: 65000 },
    { name: "Cannonball Big Size", buy: 22000, sell: 26000 },
    { name: "Popmie Biasa Kuah Mix 1 Karton 24PCs", buy: 108000, sell: 130000, aliases: ["popmie biasa kuah mix", "popmie 1 karton 24pcs"] },
    { name: "Nice Tissu", buy: 5805, sell: 6500, aliases: ["nice tissue"] }
];

function getCanonicalMasterPrice(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    const cleanNorm = clean.replace(/[^a-z0-9]/g, '');

    // 1. Exact match on name
    for (const item of CANONICAL_MASTER_CATALOG) {
        if (item.name.toLowerCase() === clean) return item;
    }
    // 2. Normalized match on name
    for (const item of CANONICAL_MASTER_CATALOG) {
        if (item.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanNorm) return item;
    }
    // 3. Match on aliases
    for (const item of CANONICAL_MASTER_CATALOG) {
        if (Array.isArray(item.aliases)) {
            for (const alias of item.aliases) {
                if (alias.toLowerCase() === clean || alias.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanNorm) {
                    return item;
                }
            }
        }
    }
    // 4. Substring / contains match
    for (const item of CANONICAL_MASTER_CATALOG) {
        const itemNorm = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanNorm.includes(itemNorm) || itemNorm.includes(cleanNorm)) {
            return item;
        }
    }
    return null;
}

function selfHealMasterDataPrices() {
    if (typeof masterData === 'undefined' || !Array.isArray(masterData)) return false;
    let modified = false;
    masterData.forEach(m => {
        if (!m.buy || Number(m.buy) <= 0) {
            const canonical = getCanonicalMasterPrice(m.name);
            if (canonical && canonical.buy > 0) {
                m.buy = canonical.buy;
                if (!m.sell || Number(m.sell) <= 0) m.sell = canonical.sell;
                modified = true;
            }
        }
    });
    return modified;
}

// =========================================================================
// SMART PROFIT & COST RESOLUTION (FINANCIAL RECOGNITION ENGINE)
// =========================================================================
function getEffectiveTrxModal(t) {
    if (!t) return 0;
    const isNegative = (Number(t.qty) < 0) || Boolean(t.isReturn);
    const qty = Math.abs(Number(t.qty) || 0);
    const extraCost = Math.abs(Number(t.extraCost) || 0);

    // 1. Jika totalModal sudah tercatat valid dan != 0
    const recordedModal = Number(t.totalModal);
    if (!isNaN(recordedModal) && recordedModal !== 0) {
        return isNegative ? -Math.abs(recordedModal) : Math.abs(recordedModal);
    }

    // 2. Tentukan harga beli satuan (unitBuy)
    let unitBuy = Number(t.buy || t.buy_price || 0);

    // 3. Fallback: Lookup ke repackData jika transaksi berasal dari batch Repack
    if (unitBuy <= 0 && t.source === 'Repack' && t.batch && typeof repackData !== 'undefined' && Array.isArray(repackData)) {
        const rItem = repackData.find(r => String(r.id) === String(t.batch));
        if (rItem && Number(rItem.modal_per_pcs) > 0) {
            unitBuy = Number(rItem.modal_per_pcs);
        }
    }

    // 4. Fallback: Lookup ke masterData berdasarkan nama item & sumber
    if (unitBuy <= 0 && t.itemName && typeof masterData !== 'undefined' && Array.isArray(masterData)) {
        const cleanName = String(t.itemName).trim().toLowerCase();
        const mItem = masterData.find(m => m.name && String(m.name).trim().toLowerCase() === cleanName && (!t.source || m.source === t.source))
                   || masterData.find(m => m.name && String(m.name).trim().toLowerCase() === cleanName);
        if (mItem && Number(mItem.buy) > 0) {
            unitBuy = Number(mItem.buy);
        }
    }

    // 5. Fallback ke CANONICAL_MASTER_CATALOG resmi spreadsheet
    if (unitBuy <= 0 && t.itemName) {
        const canonical = getCanonicalMasterPrice(t.itemName);
        if (canonical && canonical.buy > 0) {
            unitBuy = canonical.buy;
        }
    }

    if (unitBuy > 0 || extraCost > 0) {
        const base = (unitBuy * (qty || 1)) + extraCost;
        return isNegative ? -base : base;
    }

    return 0;
}

function getEffectiveTrxUnitProfit(t) {
    if (!t) return 0;
    const qty = Math.abs(Number(t.qty) || 0) || 1;
    const isNegative = (Number(t.qty) < 0) || Boolean(t.isReturn);

    // 1. Jika profitPerItem sudah tercatat valid dan bukan 0
    const recordedProfit = Number(t.profitPerItem);
    if (!isNaN(recordedProfit) && recordedProfit !== 0) {
        return isNegative ? -Math.abs(recordedProfit) : recordedProfit;
    }

    const sellUnit = Number(t.sell || t.sell_price || 0) || (Math.abs(Number(t.totalSell) || 0) / qty);
    let unitBuy = Number(t.buy || t.buy_price || 0);

    if (unitBuy <= 0) {
        if (t.source === 'Repack' && t.batch && typeof repackData !== 'undefined' && Array.isArray(repackData)) {
            const rItem = repackData.find(r => String(r.id) === String(t.batch));
            if (rItem && Number(rItem.modal_per_pcs) > 0) unitBuy = Number(rItem.modal_per_pcs);
        }
    }
    if (unitBuy <= 0 && t.itemName && typeof masterData !== 'undefined' && Array.isArray(masterData)) {
        const cleanName = String(t.itemName).trim().toLowerCase();
        const mItem = masterData.find(m => m.name && String(m.name).trim().toLowerCase() === cleanName && (!t.source || m.source === t.source))
                   || masterData.find(m => m.name && String(m.name).trim().toLowerCase() === cleanName);
        if (mItem && Number(mItem.buy) > 0) unitBuy = Number(mItem.buy);
    }
    if (unitBuy <= 0 && t.itemName) {
        const canonical = getCanonicalMasterPrice(t.itemName);
        if (canonical && canonical.buy > 0) unitBuy = canonical.buy;
    }

    if (sellUnit > 0 && unitBuy > 0) {
        const diff = sellUnit - unitBuy;
        return isNegative ? -diff : diff;
    }

    return 0;
}

function getEffectiveTrxProfit(t) {
    if (!t) return 0;
    const qty = Math.abs(Number(t.qty) || 0) || 1;
    const isNegative = (Number(t.qty) < 0) || Boolean(t.isReturn);
    const extraCost = Math.abs(Number(t.extraCost) || 0);

    // 1. Jika profit per item teridentifikasi
    const unitProfit = getEffectiveTrxUnitProfit(t);
    if (unitProfit !== 0) {
        const raw = (unitProfit * qty) - extraCost;
        return isNegative ? -Math.abs(raw) : raw;
    }

    // 2. Hitung dari effective modal dan totalSell
    const effModal = getEffectiveTrxModal(t);
    const totalSell = Number(t.totalSell) || ((Number(t.sell || t.sell_price || 0)) * (Number(t.qty) || 1));
    if (effModal !== 0 && totalSell !== 0) {
        const diff = totalSell - effModal;
        return diff;
    }

    // 3. Khusus jasa murni / fee ongkir tanpa modal fisik (source: Jasa / nama mengandung Jasa)
    const isPureService = t.source === 'Jasa' || (t.itemName && /jasa|titip|ongkir|fee|service/i.test(t.itemName));
    if (isPureService && t.status === 'Lunas' && totalSell !== 0) {
        const netRevenue = Math.abs(totalSell) - extraCost;
        return isNegative ? -netRevenue : netRevenue;
    }

    return 0;
}

// =========================================================================
// NUMBER FLOW ROLLING DIGIT ENGINE (DETAILS.SO / BARVIAN ARCHITECTURE)
// Smooth continuous numeric transitions with Apple spring physics & tabular-nums
// =========================================================================
function renderNumberFlow(el, targetVal, options = {}) {
    if (!el) return;

    const prefix = options.prefix !== undefined ? options.prefix : 'Rp ';
    const suffix = options.suffix || '';
    const duration = options.duration || 600;

    // Handle non-numeric text like '*** (Rahasia)'
    if (typeof targetVal === 'string' && isNaN(Number(targetVal))) {
        el.innerText = targetVal;
        delete el._numberFlowCurrent;
        return;
    }

    const num = Math.round(Number(targetVal) || 0);
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formattedStr = absNum.toLocaleString('id-ID');
    const fullPrefix = isNegative ? (prefix === 'Rp ' ? '-Rp ' : '-' + prefix) : prefix;
    const fullText = fullPrefix + formattedStr + suffix;

    // Headless / Node vm mock fallback (for test.js compatibility)
    if (typeof el.setAttribute !== 'function' || typeof document === 'undefined' || typeof document.createElement !== 'function' || !el.classList) {
        el.innerText = fullText;
        el._numberFlowCurrent = num;
        return;
    }

    // Set accessibility label
    el.setAttribute('aria-label', fullText);

    // Respect user motion preferences
    const prefersReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        el.innerText = fullText;
        el._numberFlowCurrent = num;
        return;
    }

    // Tokenize characters from right to left (positional ranking)
    const chars = formattedStr.split('');
    const tokens = [];
    let digitRank = 0;
    let symbolRank = 0;

    for (let i = chars.length - 1; i >= 0; i--) {
        const ch = chars[i];
        if (ch >= '0' && ch <= '9') {
            tokens.unshift({
                type: 'digit',
                char: ch,
                digit: parseInt(ch, 10),
                key: 'd_' + digitRank,
                rank: digitRank
            });
            digitRank++;
        } else {
            tokens.unshift({
                type: 'symbol',
                char: ch,
                key: 's_' + symbolRank,
                rank: symbolRank
            });
            symbolRank++;
        }
    }

    // Check if container already has number-flow structure
    let root = el.querySelector('.number-flow-root');
    const isFirstRender = !root;

    if (!root) {
        el.innerHTML = '';
        root = document.createElement('span');
        root.className = 'number-flow-root inline-flex items-baseline select-none';
        root.setAttribute('aria-hidden', 'true');
        el.appendChild(root);
    }

    // Update or create prefix
    let prefixEl = root.querySelector('.number-flow-prefix');
    if (!prefixEl) {
        prefixEl = document.createElement('span');
        prefixEl.className = 'number-flow-prefix inline-block shrink-0';
        root.insertBefore(prefixEl, root.firstChild);
    }
    prefixEl.textContent = fullPrefix;

    // Update or create suffix (if any)
    let suffixEl = root.querySelector('.number-flow-suffix');
    if (suffix) {
        if (!suffixEl) {
            suffixEl = document.createElement('span');
            suffixEl.className = 'number-flow-suffix inline-block shrink-0';
            root.appendChild(suffixEl);
        }
        suffixEl.textContent = suffix;
    } else if (suffixEl) {
        suffixEl.remove();
    }

    // Map existing token elements by key
    const existingMap = new Map();
    root.querySelectorAll('[data-nf-key]').forEach(node => {
        existingMap.set(node.getAttribute('data-nf-key'), node);
    });

    const newElements = [];
    const digitHeightEm = 1.25;

    tokens.forEach((token, idx) => {
        let tokenEl = existingMap.get(token.key);

        if (token.type === 'symbol') {
            if (!tokenEl) {
                tokenEl = document.createElement('span');
                tokenEl.className = 'number-flow-symbol inline-block shrink-0';
                tokenEl.setAttribute('data-nf-key', token.key);
                tokenEl.textContent = token.char;
            } else {
                tokenEl.textContent = token.char;
                existingMap.delete(token.key);
            }
            newElements.push(tokenEl);
        } else {
            // Digit token
            const targetY = - (token.digit * digitHeightEm);
            const delayMs = Math.min(180, (tokens.length - 1 - idx) * 20); // subtle stagger from right

            if (!tokenEl) {
                // Create new digit box & ribbon
                tokenEl = document.createElement('span');
                tokenEl.className = 'number-flow-digit-box inline-block overflow-hidden relative shrink-0';
                tokenEl.setAttribute('data-nf-key', token.key);
                tokenEl.style.height = `${digitHeightEm}em`;
                tokenEl.style.lineHeight = `${digitHeightEm}em`;
                tokenEl.style.width = '1ch';
                tokenEl.style.verticalAlign = 'baseline';

                const ribbon = document.createElement('span');
                ribbon.className = 'number-flow-ribbon flex flex-col will-change-transform';
                // Fluid entrance: start at 0 and roll to target position
                ribbon.style.transform = 'translate3d(0, 0, 0)';
                ribbon.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`;

                for (let d = 0; d <= 9; d++) {
                    const digitSpan = document.createElement('span');
                    digitSpan.className = 'number-flow-digit inline-block text-center';
                    digitSpan.style.height = `${digitHeightEm}em`;
                    digitSpan.style.lineHeight = `${digitHeightEm}em`;
                    digitSpan.style.width = '1ch';
                    digitSpan.textContent = String(d);
                    ribbon.appendChild(digitSpan);
                }

                tokenEl.appendChild(ribbon);

                // Animate into target position on next frame
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(() => {
                        ribbon.style.transform = `translate3d(0, ${targetY}em, 0)`;
                    });
                } else {
                    ribbon.style.transform = `translate3d(0, ${targetY}em, 0)`;
                }
            } else {
                // Existing digit box: update ribbon transform
                const ribbon = tokenEl.querySelector('.number-flow-ribbon');
                if (ribbon) {
                    ribbon.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`;
                    ribbon.style.transform = `translate3d(0, ${targetY}em, 0)`;
                }
                existingMap.delete(token.key);
            }
            newElements.push(tokenEl);
        }
    });

    // Remove any leftover columns that are no longer part of the number
    existingMap.forEach(orphanEl => {
        orphanEl.style.transition = 'opacity 250ms ease, transform 250ms ease, width 250ms ease';
        orphanEl.style.opacity = '0';
        orphanEl.style.width = '0';
        orphanEl.style.overflow = 'hidden';
        setTimeout(() => orphanEl.remove(), 260);
    });

    // Reorder/insert newElements inside root between prefix and suffix
    const refNode = suffixEl || null;
    newElements.forEach(node => {
        root.insertBefore(node, refNode);
    });

    el._numberFlowCurrent = num;
}

if (typeof window !== 'undefined') {
    window.SnackLoop = window.SnackLoop || {};
    window.SnackLoop.AppleMotion = AppleMotion;
    window.SnackLoop.CANONICAL_MASTER_CATALOG = CANONICAL_MASTER_CATALOG;
    window.SnackLoop.getCanonicalMasterPrice = getCanonicalMasterPrice;
    window.SnackLoop.selfHealMasterDataPrices = selfHealMasterDataPrices;
    window.SnackLoop.getEffectiveTrxModal = getEffectiveTrxModal;
    window.SnackLoop.getEffectiveTrxUnitProfit = getEffectiveTrxUnitProfit;
    window.SnackLoop.getEffectiveTrxProfit = getEffectiveTrxProfit;
    window.SnackLoop.renderNumberFlow = renderNumberFlow;
    window.renderNumberFlow = renderNumberFlow;
    if (typeof validateSessionTTL !== 'undefined') {
        window.SnackLoop.validateSessionTTL = validateSessionTTL;
    }
}
