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
    updateSettingsInstallButton();

    // Update status pengguna Helpdesk SSO
    const helpUserIndicator = document.getElementById('helpdesk-user-indicator');
    if (helpUserIndicator) {
        const u = currentUser || 'Tamu / Sesi Aktif';
        let r = 'Kasir';
        if (currentRole === 'super_admin') r = 'Super Admin';
        else if (currentRole === 'staff_rekap') r = 'Staff Rekap';
        else if (currentRole === 'view') r = 'Viewer';
        else if (currentRole) r = currentRole;
        helpUserIndicator.innerText = `${u} • ${r}`;
    }

    switchSettingsTab(initialTab);
    openModalById('modal-settings');
}

function closeSettingsModal() {
    closeModalById('modal-settings');
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
            if (p === 'backup') {
                if (typeof renderStorageHealthUI === 'function') renderStorageHealthUI();
                if (typeof renderSnapshotListUI === 'function') renderSnapshotListUI();
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
    const rawPhone = document.getElementById('set-biz-phone')?.value.trim() || DEFAULT_APP_SETTINGS.whatsappPhone;
    const phone = (typeof normalizeWaPhone === 'function')
        ? normalizeWaPhone(rawPhone, DEFAULT_APP_SETTINGS.whatsappPhone)
        : rawPhone;
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
    showConfirmModal("Konfirmasi Reset Pengaturan", "Kembalikan semua pengaturan sistem ke standar default?", () => {
        appSettings = { ...DEFAULT_APP_SETTINGS };
        localStorage.setItem('snackloop_settings', JSON.stringify(appSettings));
        openSettingsModal();
        applyAppSettingsUI();
        showNotification("Pengaturan Direset", "Pengaturan telah dikembalikan ke standar awal.", "info");
    });
}

function clearLocalAppCache() {
    showConfirmModal("Konfirmasi Bersihkan Cache", "Bersihkan cache lokal browser? Data Anda di database cloud tetap aman.", () => {
        try {
            localStorage.removeItem('snackloop_cache');
            localStorage.removeItem('snackloop_storage_mode');
            if (window.indexedDB) {
                indexedDB.deleteDatabase('snackloop_erp_db');
            }
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            showNotification("Sukses", "Cache lokal browser berhasil dibersihkan! Memuat ulang...", "success");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch(e) {
            showNotification("Error", "Gagal membersihkan cache: " + e.message, "error");
        }
    });
}

// Inisialisasi pengaturan saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
    applyAppSettingsUI();
});

// ========================================================================================= //
// ==================== INTEGRASI HELPDESK TERPUSAT (SSO JIT HANDOFF) ====================== //
// ========================================================================================= //

const HELPDESK_CONFIG = {
    baseUrl: 'https://43.156.236.102/helpdesk/handoff',
    appSlug: 'snackloop'
};

function buildHelpdeskUrl(customContext = {}) {
    const activeUsername = typeof currentUser === 'string' && currentUser ? currentUser : null;
    let userObj = null;
    if (activeUsername && typeof userData !== 'undefined' && Array.isArray(userData)) {
        userObj = userData.find(u => u.username && u.username.toLowerCase() === activeUsername.toLowerCase());
    }

    const fallbackGuestId = () => {
        try {
            if (typeof sessionStorage !== 'undefined') {
                let gid = sessionStorage.getItem('snackloop_guest_id');
                if (!gid) {
                    gid = 'guest_' + Math.random().toString(36).substring(2, 9);
                    sessionStorage.setItem('snackloop_guest_id', gid);
                }
                return gid;
            }
        } catch(e) {}
        return 'guest_' + Date.now().toString(36);
    };

    const uid = customContext.uid 
        || (userObj && userObj.id ? String(userObj.id) : null) 
        || activeUsername 
        || fallbackGuestId();

    const name = customContext.name 
        || activeUsername 
        || 'Pengguna SnackLoop';

    let resolvedRole = customContext.role;
    if (!resolvedRole) {
        if (currentRole === 'super_admin') resolvedRole = 'Owner (Super Admin)';
        else if (currentRole === 'staff_rekap') resolvedRole = 'Staff Rekap / Kasir';
        else if (currentRole === 'view') resolvedRole = 'Viewer';
        else resolvedRole = currentRole || 'Kasir';
    }

    const fromUrl = customContext.from_url 
        || (typeof window !== 'undefined' && window.location ? window.location.href : '');

    const params = new URLSearchParams({
        app: HELPDESK_CONFIG.appSlug,
        uid: String(uid).slice(0, 200),
        name: String(name),
        role: String(resolvedRole),
        from_url: fromUrl,
        new: '1'
    });

    return `${HELPDESK_CONFIG.baseUrl}?${params.toString()}`;
}

function openHelpdeskTicket(customContext = {}) {
    const targetUrl = buildHelpdeskUrl(customContext);

    if (typeof window !== 'undefined') {
        const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
            window.location.href = targetUrl;
        }
    }
    return targetUrl;
}

if (typeof window !== 'undefined') {
    window.SnackLoop = window.SnackLoop || {};
    window.SnackLoop.openHelpdeskTicket = openHelpdeskTicket;
    window.SnackLoop.buildHelpdeskUrl = buildHelpdeskUrl;
}

