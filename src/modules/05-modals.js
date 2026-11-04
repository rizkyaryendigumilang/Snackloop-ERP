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
            if (typeof lastActiveMonthByYear === 'object') lastActiveMonthByYear[y] = formattedMonthKey; 

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

        const remainingKeys = typeof sortMonthKeys === 'function' ? sortMonthKeys(Object.keys(transactionData)) : Object.keys(transactionData).sort();
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


// =========================================================================
// ERGONOMI KASIR & AKSESIBILITAS DIALOG (ESC, BACKDROP CLICK, SHORTCUT CTRL+K)
// =========================================================================
function openShortcutsGuideModal() {
    const modal = document.getElementById('modal-shortcuts-guide');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeShortcutsGuideModal() {
    const modal = document.getElementById('modal-shortcuts-guide');
    if (!modal) return;
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function closeTopmostModal() {
    // 1. Modal konfirmasi & prompt
    const confirmModal = document.getElementById('custom-confirm-modal');
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
        confirmModal.classList.remove('flex');
        confirmModal.classList.add('hidden');
        return true;
    }
    const promptModal = document.getElementById('custom-prompt-modal');
    if (promptModal && !promptModal.classList.contains('hidden')) {
        closeCustomPromptModal();
        return true;
    }

    // 2. Seluruh modal operasional terdaftar
    const modalHandlers = [
        { id: 'modal-shortcuts-guide', closeFn: () => typeof closeShortcutsGuideModal === 'function' && closeShortcutsGuideModal() },
        { id: 'modal-wa-invoice-templates', closeFn: () => typeof closeWaInvoiceTemplatesModal === 'function' && closeWaInvoiceTemplatesModal() },
        { id: 'modal-settings', closeFn: () => typeof closeSettingsModal === 'function' && closeSettingsModal() },
        { id: 'modal-return', closeFn: () => typeof closeReturnModal === 'function' && closeReturnModal() },
        { id: 'modal-print-agent-claim', closeFn: () => typeof closePrintAgentClaimModal === 'function' && closePrintAgentClaimModal() },
        { id: 'modal-jastip-calculator', closeFn: () => typeof closeJastipCalculatorModal === 'function' && closeJastipCalculatorModal() },
        { id: 'modal-jastip-order', closeFn: () => typeof closeJastipOrderModal === 'function' && closeJastipOrderModal() },
        { id: 'modal-jastip-checklist', closeFn: () => typeof closeJastipChecklistModal === 'function' && closeJastipChecklistModal() },
        { id: 'modal-jastip-customs', closeFn: () => typeof closeJastipCustomsModal === 'function' && closeJastipCustomsModal() },
        { id: 'modal-jastip-photo-preview', closeFn: () => typeof closeJastipPhotoModal === 'function' && closeJastipPhotoModal() },
        { id: 'modal-install-guide', closeFn: () => typeof closeInstallGuideModal === 'function' && closeInstallGuideModal() },
        { id: 'edit-master-modal', closeFn: () => typeof closeEditMasterModal === 'function' && closeEditMasterModal() },
        { id: 'history-master-modal', closeFn: () => typeof closeHistoryModal === 'function' && closeHistoryModal() },
        { id: 'modal-forgot-password', closeFn: () => typeof closeForgotPasswordModal === 'function' && closeForgotPasswordModal() },
        { id: 'modal-reset-password', closeFn: () => typeof closeResetPasswordModal === 'function' && closeResetPasswordModal() },
        { id: 'modal-expense', closeFn: () => typeof closeExpenseModal === 'function' && closeExpenseModal() },
        { id: 'modal-bulk-order', closeFn: () => typeof closeBulkOrderModal === 'function' && closeBulkOrderModal() }
    ];

    for (const m of modalHandlers) {
        const el = document.getElementById(m.id);
        if (el && !el.classList.contains('hidden')) {
            if (m.closeFn) m.closeFn();
            el.classList.remove('flex');
            el.classList.add('hidden');
            return true;
        }
    }

    // 3. Fallback selector generik
    const genericModal = document.querySelector('.fixed.flex[id*="modal"], .fixed.flex[id*="custom-"]');
    if (genericModal) {
        genericModal.classList.remove('flex');
        genericModal.classList.add('hidden');
        return true;
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
    const fallbackSearch = document.getElementById('t-search') || document.querySelector('input[id*="search"]');
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
