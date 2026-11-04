// ======================= MODAL KONFIRMASI KUSTOM & HELPER MODAL ======================= //
function openModalById(id) {
    const el = document.getElementById(id);
    if (!el) return null;
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
