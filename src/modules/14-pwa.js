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
    // Sembunyikan floating banner & tombol navbar agar tidak mengganggu tampilan website
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.add('hidden');
        banner.style.display = 'none';
    }

    const btn = document.getElementById('btn-install-pwa');
    if (btn) {
        btn.classList.add('hidden');
    }
    const navItem = document.getElementById('nav-item-install-pwa');
    if (navItem) {
        navItem.style.display = 'none';
    }
    updateSettingsInstallButton();
}

function updateSettingsInstallButton() {
    const btn = document.getElementById('btn-install-from-settings');
    if (!btn) return;
    if (isAppInstalled()) {
        btn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>Aplikasi Sudah Terpasang</span>';
        btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'cursor-default');
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

