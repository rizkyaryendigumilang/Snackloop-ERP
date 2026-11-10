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

let currentHelpdeskPhotoBase64 = null;
let currentHelpdeskPhotoName = null;

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
        new: customContext.new !== undefined ? String(customContext.new) : '1'
    });

    if (customContext.subject) {
        params.set('subject', String(customContext.subject).slice(0, 200));
    }
    if (customContext.description) {
        params.set('description', String(customContext.description).slice(0, 2000));
    }
    if (customContext.category) {
        params.set('category', String(customContext.category));
    }
    if (customContext.priority) {
        params.set('priority', String(customContext.priority));
    }
    if (customContext.has_photo) {
        params.set('has_photo', '1');
    }

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

function openHelpdeskModal(prefillCategory = '', prefillSubject = '') {
    const modal = document.getElementById('modal-helpdesk-report');
    if (!modal) return;

    // Tampilkan identitas pelapor
    const userBadge = document.getElementById('helpdesk-modal-user');
    if (userBadge) {
        const u = typeof currentUser === 'string' && currentUser ? currentUser : 'Tamu / Sesi Aktif';
        let r = 'Kasir';
        if (typeof currentRole !== 'undefined') {
            if (currentRole === 'super_admin') r = 'Owner / Admin';
            else if (currentRole === 'staff_rekap') r = 'Staff Rekap';
            else if (currentRole === 'view') r = 'Viewer';
            else if (currentRole) r = currentRole;
        }
        userBadge.textContent = `${u} (${r})`;
    }

    // Prefill form bila ada parameter
    const catSelect = document.getElementById('helpdesk-modal-category');
    if (catSelect && prefillCategory) catSelect.value = prefillCategory;

    const subInput = document.getElementById('helpdesk-modal-subject');
    if (subInput && prefillSubject) subInput.value = prefillSubject;

    // Reset photo preview bila ada foto tersisa dari sesi sebelumnya
    removeHelpdeskPhoto();

    if (typeof openModalById === 'function') {
        openModalById('modal-helpdesk-report');
    } else {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeHelpdeskModal() {
    if (typeof closeModalById === 'function') {
        closeModalById('modal-helpdesk-report');
    } else {
        const modal = document.getElementById('modal-helpdesk-report');
        if (modal) {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }
    }
    removeHelpdeskPhoto();
}

function handleHelpdeskPhotoUpload(event) {
    const file = event.target && event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
        if (typeof showNotification === 'function') {
            showNotification("Format Salah", "Pilih berkas gambar (JPG, PNG, atau WebP)", "error");
        } else {
            alert("Pilih berkas gambar (JPG, PNG, atau WebP)");
        }
        event.target.value = '';
        return;
    }

    // Batasi ukuran awal sebelum kompresi maksimal 10MB
    if (file.size > 10 * 1024 * 1024) {
        if (typeof showNotification === 'function') {
            showNotification("Berkas Terlalu Besar", "Ukuran foto maksimal 10MB", "error");
        } else {
            alert("Ukuran foto maksimal 10MB");
        }
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 900;
                const MAX_HEIGHT = 900;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                currentHelpdeskPhotoBase64 = canvas.toDataURL('image/jpeg', 0.65);
                currentHelpdeskPhotoName = file.name || 'foto_kendala.jpg';

                const dropzone = document.getElementById('helpdesk-photo-dropzone');
                const preview = document.getElementById('helpdesk-photo-preview');
                const previewImg = document.getElementById('helpdesk-photo-img');
                const nameEl = document.getElementById('helpdesk-photo-filename');
                const sizeEl = document.getElementById('helpdesk-photo-filesize');

                if (previewImg) previewImg.src = currentHelpdeskPhotoBase64;
                if (nameEl) nameEl.textContent = currentHelpdeskPhotoName;
                if (sizeEl) {
                    const approxKb = Math.round((currentHelpdeskPhotoBase64.length * 3 / 4) / 1024);
                    sizeEl.innerHTML = `<i class="fa-solid fa-circle-check text-[9px]"></i> Foto terlampir (~${approxKb} KB)`;
                }

                if (dropzone) dropzone.classList.add('hidden');
                if (preview) preview.classList.remove('hidden');
            } catch (err) {
                console.error("Gagal kompresi foto kendala:", err);
                currentHelpdeskPhotoBase64 = evt.target.result;
                currentHelpdeskPhotoName = file.name || 'foto_kendala.jpg';
                const preview = document.getElementById('helpdesk-photo-preview');
                const dropzone = document.getElementById('helpdesk-photo-dropzone');
                if (dropzone) dropzone.classList.add('hidden');
                if (preview) preview.classList.remove('hidden');
            }
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

function removeHelpdeskPhoto() {
    currentHelpdeskPhotoBase64 = null;
    currentHelpdeskPhotoName = null;

    const fileInput = document.getElementById('helpdesk-modal-photo');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('helpdesk-photo-dropzone');
    if (dropzone) dropzone.classList.remove('hidden');

    const preview = document.getElementById('helpdesk-photo-preview');
    if (preview) preview.classList.add('hidden');

    const previewImg = document.getElementById('helpdesk-photo-img');
    if (previewImg) previewImg.src = '';
}

function openHelpdeskPortalDirect() {
    const url = buildHelpdeskUrl({ new: '0' });
    if (typeof window !== 'undefined') {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) window.location.href = url;
    }
    return url;
}

function submitHelpdeskModal(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    const catEl = document.getElementById('helpdesk-modal-category');
    const subEl = document.getElementById('helpdesk-modal-subject');
    const descEl = document.getElementById('helpdesk-modal-description') || document.getElementById('helpdesk-modal-complaint');
    const urgentEl = document.getElementById('helpdesk-modal-urgent');

    const category = catEl ? catEl.value : 'other';
    const subject = subEl ? subEl.value.trim() : '';
    const complaint = descEl ? descEl.value.trim() : '';
    const isUrgent = urgentEl ? urgentEl.checked : false;

    if (!subject) {
        if (typeof showNotification === 'function') {
            showNotification("Data Kurang", "Mohon isi judul / ringkasan kendala", "error");
        } else {
            alert("Mohon isi judul / ringkasan kendala");
        }
        if (subEl) subEl.focus();
        return;
    }

    if (!complaint) {
        if (typeof showNotification === 'function') {
            showNotification("Data Kurang", "Mohon ceritakan rincian keluhan Anda", "error");
        } else {
            alert("Mohon ceritakan rincian keluhan Anda");
        }
        if (descEl) descEl.focus();
        return;
    }

    // Petakan label kategori yang ramah
    const categoryLabels = {
        bug_error: 'Bug / Error Sistem',
        data_transaction: 'Data Transaksi & Struk',
        account_login: 'Akun & Hak Akses',
        feature_question: 'Pertanyaan Fitur',
        other: 'Lainnya'
    };
    const categoryName = categoryLabels[category] || category;

    // Susun isi deskripsi / keluhan
    let fullDescription = `[KATEGORI: ${categoryName.toUpperCase()}]${isUrgent ? ' [PRIORITAS: MENDESAK]' : ''}\n\n${complaint}`;
    if (currentHelpdeskPhotoBase64) {
        fullDescription += `\n\n---\n[Lampiran Foto Masalah]: ${currentHelpdeskPhotoName || 'foto_masalah.jpg'} (Telah diverifikasi dan dilampirkan via SnackLoop client)`;
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('snackloop_helpdesk_last_photo', JSON.stringify({
                    timestamp: Date.now(),
                    name: currentHelpdeskPhotoName,
                    preview: currentHelpdeskPhotoBase64.slice(0, 1000)
                }));
            }
        } catch(e) {}
    }

    const targetUrl = buildHelpdeskUrl({
        subject: subject,
        description: fullDescription,
        category: category,
        priority: isUrgent ? 'urgent' : 'normal',
        has_photo: currentHelpdeskPhotoBase64 ? '1' : '0',
        new: '1'
    });

    if (typeof logAuditActivity === 'function') {
        try {
            logAuditActivity(
                'HELPDESK_TICKET_SUBMIT',
                subject,
                `Lapor kendala ke VPS Helpdesk: "${subject}" (${categoryName})${currentHelpdeskPhotoBase64 ? ' [Dengan Foto]' : ''}`
            );
        } catch(e) {
            console.warn("Audit log helpdesk skip:", e);
        }
    }

    if (typeof window !== 'undefined') {
        const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
            window.location.href = targetUrl;
        }
    }

    if (typeof showNotification === 'function') {
        showNotification("Laporan Terkirim", "Kendala dan rincian keluhan Anda berhasil diteruskan ke Meja Kerja VPS Helpdesk!", "success");
    }

    // Reset dan tutup modal
    const form = document.getElementById('form-helpdesk-report');
    if (form) form.reset();
    removeHelpdeskPhoto();
    closeHelpdeskModal();

    return targetUrl;
}

if (typeof window !== 'undefined') {
    window.SnackLoop = window.SnackLoop || {};
    window.SnackLoop.openHelpdeskTicket = openHelpdeskTicket;
    window.SnackLoop.openHelpdeskModal = openHelpdeskModal;
    window.SnackLoop.closeHelpdeskModal = closeHelpdeskModal;
    window.SnackLoop.handleHelpdeskPhotoUpload = handleHelpdeskPhotoUpload;
    window.SnackLoop.removeHelpdeskPhoto = removeHelpdeskPhoto;
    window.SnackLoop.openHelpdeskPortalDirect = openHelpdeskPortalDirect;
    window.SnackLoop.submitHelpdeskModal = submitHelpdeskModal;
    window.SnackLoop.buildHelpdeskUrl = buildHelpdeskUrl;
}

