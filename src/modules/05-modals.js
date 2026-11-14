// ======================= MODAL KONFIRMASI KUSTOM & HELPER MODAL ======================= //
function openModalById(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const card = el.querySelector('.theme-card') || el.firstElementChild;
    if (card) {
        card.style.transform = '';
        card.style.opacity = '';
        card.style.transition = '';
    }
    if (typeof attachModalSwipeDismiss === 'function') {
        attachModalSwipeDismiss(el);
    }
    el.classList.remove('hidden');
    el.classList.add('flex');
    if (el.style.display === 'none') el.style.display = 'flex';
    return el;
}

function closeModalById(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.classList.remove('flex');
    el.classList.add('hidden');
    if (el.style.display === 'flex') el.style.display = 'none';
    return true;
}

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
    const year = activeTransactionYear || now.getFullYear();
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
            activeTransactionYear = y;
            isTransactionMonthsExpanded = true;
            shouldAnimateTransactionMonths = true;
            if (typeof lastActiveMonthByYear === 'object') lastActiveMonthByYear[y] = formattedMonthKey; 

            if(!transactionData[formattedMonthKey]) { 
                transactionData[formattedMonthKey] = []; 
                activeMonthSheet = formattedMonthKey; 
                if (typeof saveCacheToLocal === 'function') saveCacheToLocal();
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
    closeModalById('custom-prompt-modal');
}

function confirmDeleteMonthSheet(monthKey) {
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    
    const keys = Object.keys(transactionData);
    if(keys.length <= 1) {
        return showNotification("Peringatan", "Tidak dapat menghapus satu-satunya sheet yang tersisa.", "warning");
    }

    showConfirmModal("Konfirmasi Hapus Sheet", `Apakah Anda yakin ingin menghapus seluruh arsip sheet bulan "${monthKey}" beserta data transaksinya secara permanen?`, async () => {
        const deletedCount = (transactionData[monthKey] || []).length;
        delete transactionData[monthKey];
        if (typeof saveCacheToLocal === 'function') saveCacheToLocal();

        const remainingKeys = typeof sortMonthKeys === 'function' ? sortMonthKeys(Object.keys(transactionData)) : Object.keys(transactionData).sort();
        activeMonthSheet = remainingKeys[remainingKeys.length - 1];

        renderMonthTabs();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
        updateDashboard();
        renderFinancialChart();

        if (typeof logAuditActivity === 'function') {
            logAuditActivity('TRANSACTION_DELETE', monthKey, `Menghapus sheet arsip bulan ${monthKey} (${deletedCount} transaksi)`);
        }
        showNotification("Sukses", `Sheet arsip ${monthKey} berhasil dihapus dari sistem.`, "success");

        if (typeof dispatchMutation === 'function') {
            dispatchMutation({
                type: 'DELETE_MONTH_SHEET',
                payload: { month_key: monthKey }
            }, async () => {
                const { error } = await supabaseClient.from('transactions').delete().eq('month_key', monthKey);
                if (error) throw error;
            });
        }
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


// =========================================================================
// ERGONOMI KASIR & AKSESIBILITAS DIALOG (ESC, BACKDROP CLICK, SHORTCUT CTRL+K)
// =========================================================================
function openShortcutsGuideModal() {
    openModalById('modal-shortcuts-guide');
}

function closeShortcutsGuideModal() {
    closeModalById('modal-shortcuts-guide');
}

function closeTopmostModal() {
    const openModals = document.querySelectorAll('.fixed:not(.hidden)[id*="modal"], .fixed:not(.hidden)[id*="custom-"]');
    if (openModals.length > 0) {
        const topmost = openModals[openModals.length - 1];
        return closeModalById(topmost.id);
    }
    return false;
}

function focusActiveSearchInput() {
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    if (activeTab) {
        const input = activeTab.querySelector('input[type="search"], input[id*="search"], input[placeholder*="Cari"], input[placeholder*="cari"]');
        if (input) {
            input.focus();
            if (input.select) input.select();
            return;
        }
    }
    const fallbackSearch = document.getElementById('quick-search') || document.querySelector('input[id*="search"]');
    if (fallbackSearch) {
        fallbackSearch.focus();
        if (fallbackSearch.select) fallbackSearch.select();
    }
}

// Global Keyboard Listener: [Esc] to Close, [Ctrl+K] / [/] to Quick Search, [?] / [F1] for Guide
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const closed = closeTopmostModal();
        if (closed) e.preventDefault();
        return;
    }

    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    
    // F1 or [?] to open shortcuts guide modal
    if ((e.key === 'F1' || (e.key === '?' && !isEditing)) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openShortcutsGuideModal();
        return;
    }

    if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !isEditing)) {
        e.preventDefault();
        focusActiveSearchInput();
    }
});

// Global Backdrop Click to Close Modal
document.addEventListener('click', function(e) {
    if (!e.target || !e.target.classList) return;
    if (e.target.classList.contains('fixed') && (e.target.id?.startsWith('modal-') || e.target.id?.includes('-modal')) && !e.target.classList.contains('hidden')) {
        closeTopmostModal();
    }
});

// ======================= APPLE FLUID MODAL SHEET GESTURES ======================= //
function attachModalSwipeDismiss(modal) {
    if (!modal || modal._hasAppleGesture) return;
    modal._hasAppleGesture = true;

    const card = modal.querySelector('.theme-card') || modal.querySelector('[class*="bg-"]') || modal.firstElementChild;
    if (!card) return;

    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let isDragging = false;

    // Optional drag handle insertion for mobile viewports if absent
    if (!card.querySelector('.apple-sheet-handle') && !card.classList.contains('no-sheet-handle')) {
        const handle = document.createElement('div');
        handle.className = 'apple-sheet-handle block sm:hidden';
        card.insertBefore(handle, card.firstChild);
    }

    const onTouchStart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const touchTarget = e.target;
        if (touchTarget && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(touchTarget.tagName)) return;

        const scrollParent = touchTarget.closest ? touchTarget.closest('.overflow-y-auto, .overflow-auto') : null;
        if (scrollParent && scrollParent.scrollTop > 0) return;

        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = Date.now();
        isDragging = true;
        card.style.transition = 'none';
        card.style.willChange = 'transform, opacity';
    };

    const onTouchMove = (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        if (deltaY > 0) {
            const opacity = Math.max(0.2, 1 - (deltaY / (card.clientHeight || 400)) * 0.8);
            card.style.transform = `translate3d(0, ${deltaY}px, 0)`;
            card.style.opacity = `${opacity}`;
            if (e.cancelable) e.preventDefault();
        } else if (deltaY < 0) {
            const motion = window.SnackLoop && window.SnackLoop.AppleMotion;
            const rb = motion && typeof motion.rubberband === 'function' 
                ? motion.rubberband(deltaY, card.clientHeight || 400, 0.55) 
                : deltaY * 0.3;
            card.style.transform = `translate3d(0, ${rb}px, 0)`;
        }
    };

    const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.willChange = 'auto';

        const deltaY = currentY - startY;
        const dt = Math.max(1, Date.now() - startTime);
        const velocity = (deltaY / dt) * 1000;

        const motion = window.SnackLoop && window.SnackLoop.AppleMotion;
        const projected = motion && typeof motion.projectMomentum === 'function' 
            ? motion.projectMomentum(velocity, 0.998) 
            : velocity * 0.3;
        const cardHeight = card.clientHeight || 400;

        const shouldDismiss = (deltaY > cardHeight * 0.25) || (velocity > 500) || ((deltaY + projected) > cardHeight * 0.5);

        if (shouldDismiss && deltaY > 20) {
            card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out';
            card.style.transform = 'translate3d(0, 100%, 0)';
            card.style.opacity = '0';

            if (motion && typeof motion.triggerHaptic === 'function') {
                motion.triggerHaptic('light');
            }

            setTimeout(() => {
                closeModalById(modal.id);
                card.style.transform = '';
                card.style.opacity = '';
                card.style.transition = '';
            }, 230);
        } else {
            card.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out';
            card.style.transform = 'translate3d(0, 0, 0)';
            card.style.opacity = '1';
            setTimeout(() => {
                card.style.transition = '';
            }, 360);
        }
    };

    card.addEventListener('touchstart', onTouchStart, { passive: false });
    card.addEventListener('touchmove', onTouchMove, { passive: false });
    card.addEventListener('touchend', onTouchEnd, { passive: true });
    card.addEventListener('touchcancel', onTouchEnd, { passive: true });
}

function initAppleModalGestures() {
    if (typeof document === 'undefined') return;
    const modals = document.querySelectorAll('.fixed[id*="modal"], .fixed[id*="custom-"]');
    modals.forEach(m => attachModalSwipeDismiss(m));
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAppleModalGestures);
    } else {
        initAppleModalGestures();
    }
}

function openMobileMenuSheet() {
    const userRole = (typeof currentRole !== 'undefined' ? currentRole : null) || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') : '') || '';
    const usersBtn = document.getElementById('mobile-more-users');
    if (usersBtn) {
        usersBtn.style.display = (userRole === 'super_admin' || userRole === 'admin') ? 'flex' : 'none';
    }
    const reportsBtn = document.getElementById('mobile-more-reports');
    if (reportsBtn) {
        reportsBtn.style.display = (userRole === 'super_admin') ? 'flex' : 'none';
    }
    openModalById('modal-mobile-menu');
}

function closeMobileMenuSheet() {
    closeModalById('modal-mobile-menu');
}

if (typeof window !== 'undefined') {
    window.SnackLoop = window.SnackLoop || {};
    window.SnackLoop.attachModalSwipeDismiss = attachModalSwipeDismiss;
    window.openMobileMenuSheet = openMobileMenuSheet;
    window.closeMobileMenuSheet = closeMobileMenuSheet;
}
