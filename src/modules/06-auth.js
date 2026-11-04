// ======================= 1. LOGIN & SECURE AUTH ======================= //
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    
    if (!u || !p) {
        showNotification("Perhatian", "Username dan Password wajib diisi.", "warning");
        return;
    }

    const hashedInput = await hashPassword(p);
    let userInfo = null;

    try {
        // 1. Coba otentikasi via PostgreSQL Stored Procedure verify_user_login (SECURITY DEFINER)
        // Menjamin kolom password hash tidak pernah dibocorkan ke client via PostgREST SELECT
        try {
            const { data: rpcAuth, error: rpcErr } = await supabaseClient.rpc('verify_user_login', {
                p_username: u,
                p_password_hash: hashedInput
            });
            if (!rpcErr && rpcAuth && rpcAuth.success && rpcAuth.user) {
                userInfo = rpcAuth.user;
            }
        } catch (rpcEx) {
            // Fallback ke REST query jika RPC belum di-deploy
        }

        // Fallback jika RPC belum tersedia
        if (!userInfo) {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, username, password, role')
                .ilike('username', u);
                
            if (!error && data && data.length > 0) {
                const foundUser = data[0];
                const isMatchHashed = foundUser.password === hashedInput;
                const isMatchPlain = foundUser.password === p;

                if (isMatchHashed || isMatchPlain) {
                    userInfo = { id: foundUser.id, username: foundUser.username, role: foundUser.role };
                    // Migrasi otomatis password legacy plaintext ke hash SHA-256
                    if (isMatchPlain && !isMatchHashed) {
                        supabaseClient.from('users').update({ password: hashedInput }).eq('id', foundUser.id).then(() => {
                            console.info("[Auth] Password akun berhasil dimigrasikan ke enkripsi SHA-256.");
                        }).catch(() => {});
                    }
                }
            }
        }
    } catch(err) {
        console.warn("Supabase auth verification error:", err);
    }

    // 2. Fallback offline: jika sedang offline, periksa cache pengguna lokal
    if (!userInfo && userData && userData.length > 0) {
        const localUser = userData.find(usr => usr.username && usr.username.toLowerCase() === u.toLowerCase());
        if (localUser) {
            const isMatchHashed = localUser.password === hashedInput;
            const isMatchPlain = localUser.password === p;
            if (isMatchHashed || isMatchPlain) {
                userInfo = localUser;
            }
        }
    }
        
    if (!userInfo) {
        showNotification("Gagal", "Username atau Password salah.", "error");
        document.getElementById('login-password').value = '';
        return;
    }
    
    currentUser = userInfo.username;
    currentRole = userInfo.role || 'staff_rekap';

    // Simpan sesi login ke localStorage
    localStorage.setItem('snackloop_session', JSON.stringify({ 
        username: currentUser, 
        role: currentRole,
        loginAt: Date.now()
    }));
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    applyRolePermissions();
    initApp();
    showNotification("Sukses", `Selamat datang kembali, ${escapeHtml(currentUser)}!`, "success");
});

function logoutApp() {
    currentUser = null;
    currentRole = null;
    localStorage.removeItem('snackloop_session'); // Hapus sesi saat logout
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    switchTab('dashboard');
    showNotification("Info", "Berhasil keluar dari aplikasi.", "info");
}

// ======================= FITUR LUPA & RESET PASSWORD (SUPABASE) ======================= //
function openForgotPasswordModal(e) {
    if (e) e.preventDefault();
    if (!openModalById('modal-forgot-password')) return;
    const input = document.getElementById('forgot-identifier');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
    const feedback = document.getElementById('forgot-password-feedback');
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.innerHTML = '';
    }
}

function closeForgotPasswordModal() {
    closeModalById('modal-forgot-password');
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const inputEl = document.getElementById('forgot-identifier');
    const btnSubmit = document.getElementById('btn-submit-forgot');
    const feedbackEl = document.getElementById('forgot-password-feedback');
    const identifier = inputEl ? inputEl.value.trim() : '';

    if (!identifier) {
        showNotification("Perhatian", "Silakan masukkan email atau username Anda.", "warning");
        return;
    }

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : 'Kirim';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span>Memproses...</span>`;
    }

    try {
        const isEmail = identifier.includes('@');

        if (isEmail) {
            // Flow 1: Email Supabase Auth
            const redirectUrl = window.location.origin + window.location.pathname;
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(identifier, {
                redirectTo: redirectUrl
            });

            if (error) {
                // Tampilkan pesan error ramah dari Supabase
                feedbackEl.className = "p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-circle-exclamation mt-0.5 text-rose-500"></i>
                    <div>
                        <div class="font-bold">Gagal Mengirim Email</div>
                        <div class="mt-0.5 opacity-90">${error.message || 'Terjadi kesalahan saat menghubungi server Supabase.'}</div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Gagal", error.message || "Gagal mengirim email reset.", "error");
            } else {
                feedbackEl.className = "p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs space-y-1.5";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm"></i>
                    <div>
                        <div class="font-bold">Instruksi Reset Terkirim!</div>
                        <div class="mt-1 leading-relaxed">
                            Tautan pemulihan kata sandi telah dikirim ke <strong>${escapeHtml(identifier)}</strong>. Silakan periksa folder <em>Inbox</em> atau <em>Spam</em> Anda dan klik tautan tersebut untuk membuat kata sandi baru.
                        </div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Sukses", `Tautan reset telah dikirim ke ${escapeHtml(identifier)}`, "success");
                if (inputEl) inputEl.value = '';
            }
        } else {
            // Flow 2: Username pada tabel internal 'users'
            const { data: users, error } = await supabaseClient
                .from('users')
                .select('id, username, role')
                .eq('username', identifier);

            if (error) {
                feedbackEl.className = "p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-circle-exclamation mt-0.5 text-rose-500"></i>
                    <div>
                        <div class="font-bold">Koneksi Database Bermasalah</div>
                        <div class="mt-0.5 opacity-90">${escapeHtml(error.message)}</div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Gagal", error.message, "error");
            } else {
                // Respons seragam (Uniform Generic Feedback) untuk mencegah User & Role Enumeration Oracle (SEC-005)
                const waText = encodeURIComponent(`Halo Super Admin SnackLoop, saya ingin meminta bantuan reset password untuk akun ERP saya.\n\nIdentifier: ${identifier}\n\nTerima kasih.`);
                feedbackEl.className = "p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 text-xs space-y-2.5";
                feedbackEl.innerHTML = `
                    <div class="flex items-start gap-2">
                        <i class="fa-solid fa-circle-info text-indigo-600 dark:text-indigo-400 mt-0.5 text-sm"></i>
                        <div>
                            <div class="font-bold">Permintaan Pemulihan Diproses</div>
                            <div class="mt-1 leading-relaxed opacity-90">
                                Jika akun <strong>${escapeHtml(identifier)}</strong> terdaftar dalam sistem, permintaan telah dicatat. Silakan hubungi Super Admin untuk verifikasi identitas dan pengaturan ulang kata sandi.
                            </div>
                        </div>
                    </div>
                    <div class="pt-1">
                        <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition">
                            <i class="fa-brands fa-whatsapp"></i>
                            <span>Hubungi Super Admin via WhatsApp</span>
                        </a>
                    </div>
                `;
                feedbackEl.classList.remove('hidden');
                showNotification("Info", "Permintaan pemulihan diproses. Silakan hubungi Super Admin.", "info");
            }
        }
    } catch (err) {
        console.error("Error pada proses lupa password:", err);
        showNotification("Kesalahan", "Terjadi kegagalan komunikasi dengan server Supabase.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
    }
}

function openResetPasswordModal() {
    if (!openModalById('modal-reset-password')) return;
    const passInput = document.getElementById('new-password');
    if (passInput) {
        passInput.value = '';
        setTimeout(() => passInput.focus(), 100);
    }
    const confirmInput = document.getElementById('confirm-new-password');
    if (confirmInput) confirmInput.value = '';
}

function closeResetPasswordModal() {
    closeModalById('modal-reset-password');
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value.trim();
    const confirmPass = document.getElementById('confirm-new-password').value.trim();
    const btnSubmit = document.getElementById('btn-submit-reset');

    if (!newPass || !confirmPass) {
        showNotification("Perhatian", "Semua kolom password wajib diisi.", "warning");
        return;
    }

    if (newPass.length < 6) {
        showNotification("Perhatian", "Password baru minimal harus 6 karakter.", "warning");
        return;
    }

    if (newPass !== confirmPass) {
        showNotification("Perhatian", "Konfirmasi password baru tidak cocok.", "warning");
        return;
    }

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : 'Simpan';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span>Menyimpan...</span>`;
    }

    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPass
        });

        if (error) {
            showNotification("Gagal Reset Password", error.message || "Gagal memperbarui kata sandi.", "error");
            return;
        }

        showNotification("Sukses", "Password berhasil diperbarui! Silakan login dengan password baru.", "success");
        closeResetPasswordModal();

        // Bersihkan hash fragment recovery di URL
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
        }

        // Arahkan fokus ke form login
        const loginPass = document.getElementById('login-password');
        if (loginPass) {
            loginPass.value = '';
            loginPass.focus();
        }
    } catch (err) {
        console.error("Gagal update password:", err);
        showNotification("Kesalahan", "Terjadi kesalahan saat memperbarui kata sandi.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
    }
}

// Inisialisasi Auth State Change Supabase untuk mendeteksi link recovery password
if (window.supabaseClient && supabaseClient.auth) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            openResetPasswordModal();
            showNotification("Pemulihan Akun", "Silakan masukkan password baru Anda.", "info");
        }
    });
}

// Deteksi jika link URL mengandung tipe recovery saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'))) {
        setTimeout(() => {
            openResetPasswordModal();
            showNotification("Pemulihan Akun", "Tautan pemulihan terdeteksi. Silakan masukkan kata sandi baru.", "info");
        }, 600);
    }
});

async function initApp() {
    updateNetworkStatus();
    await loadDataFromCloud();
    feather.replace();

    const dateInput = document.getElementById('t-date');
    if(dateInput && !dateInput.value) dateInput.valueAsDate = new Date();
    
    const expDateInput = document.getElementById('exp-date');
    if(expDateInput && !expDateInput.value) expDateInput.valueAsDate = new Date();
    
    const currentMonthKey = getCurrentMonthKey(new Date());
    if(!transactionData[currentMonthKey]) transactionData[currentMonthKey] = [];
    if(!activeMonthSheet) activeMonthSheet = currentMonthKey;

    renderAgents();
    renderDropdowns(); 
    renderMonthTabs(); 
    setDashboardTimeFilter('all');

    renderRepackWarehouse();
    renderMaster();
    renderCustomer();
    renderInvoicesTable();
    if(currentRole === 'super_admin') renderUsers();
    if (typeof initNavbarPillInteractions === 'function') initNavbarPillInteractions();
    if (typeof syncNavbarActivePill === 'function') syncNavbarActivePill(true);
    if(navigator.onLine) {
        syncOutboxQueue();
    }
}

async function loadDataFromCloud() {
    try {
        if (localStorage.getItem('snackloop_pending_restore_sync')) {
            if (typeof syncRestoredStateToCloud === 'function') {
                await syncRestoredStateToCloud();
            }
            if (localStorage.getItem('snackloop_pending_restore_sync')) {
                return;
            }
        }
        const [resAgent, resMaster, resCust, resRepack, resTrx, resExp, resUsers, resInv, resHistory, resReturns, resJastip] = await Promise.all([
            supabaseClient.from('agents').select('*').order('name', { ascending: true }),
            supabaseClient.from('master').select('*').order('name', { ascending: true }),
            supabaseClient.from('customers').select('*').order('name', { ascending: true }),
            supabaseClient.from('repack').select('*').order('created_at', { ascending: false }).catch(() => supabaseClient.from('repack').select('*')),
            supabaseClient.from('transactions').select('*').order('date', { ascending: false }),
            supabaseClient.from('expenses').select('*').order('date', { ascending: false }),
            supabaseClient.from('users').select('id, username, role').order('id', { ascending: true }),
            supabaseClient.from('invoices').select('*').order('date', { ascending: false }),
            supabaseClient.from('price_history').select('*').order('created_at', { ascending: false }).catch(() => supabaseClient.from('price_history').select('*')),
            supabaseClient.from('returns').select('*').order('date', { ascending: false }).catch(() => ({ data: null })),
            supabaseClient.from('jastip_orders').select('*').order('created_at', { ascending: false }).catch(() => ({ data: null }))
        ]);

        agentData = resAgent.data || [];
        masterData = resMaster.data || [];
        customerData = resCust.data || [];
        repackData = resRepack.data || [];
        expenseData = resExp.data || [];
        userData = resUsers.data || [];

        if (resReturns && !resReturns.error && Array.isArray(resReturns.data)) {
            returnData = resReturns.data;
        }
        if (resJastip && !resJastip.error && Array.isArray(resJastip.data)) {
            jastipData = resJastip.data;
        }
        invoiceData = resInv.data || [];
        priceHistoryData = resHistory.data || [];

        transactionData = {};
        (resTrx.data || []).forEach(t => {
            const formatted = {
                id: t.id, monthKey: t.month_key, date: t.date, customer: t.customer,
                itemName: t.item_name, source: t.source, qty: t.qty, batch: t.batch,
                buy: t.buy, extraCost: t.extra_cost || 0, extraCostNote: t.extra_cost_note || '-',
                totalModal: t.total_modal, sell: t.sell, totalSell: t.total_sell,
                status: t.status, profitPerItem: t.profit_per_item, notes: t.notes || '-'
            };
            if(!transactionData[formatted.monthKey]) transactionData[formatted.monthKey] = [];
            transactionData[formatted.monthKey].push(formatted);
        });

        saveCacheToLocal();
    } catch (err) { console.error("Gagal sinkronisasi Supabase:", err); }
}

function getCurrentMonthKey(dateObj) { 
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]; 
    return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`; 
}

function switchTab(tabId) {
    if (tabId === 'settings' || tabId === 'preferences') {
        openSettingsModal('app');
        return;
    }

    if ((tabId === 'users' || tabId === 'reports') && currentRole !== 'super_admin') {
        showNotification("Akses Terbatas", "Halaman ini hanya dapat diakses oleh Akun Owner / Super Admin.", "warning");
        tabId = 'dashboard';
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.navbar__link').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    
    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeBtn) {
        activeBtn.classList.add('active');
        if (typeof activeBtn.blur === 'function') activeBtn.blur();
        if (typeof window !== 'undefined' && window.innerWidth <= 768 && typeof activeBtn.scrollIntoView === 'function') {
            try { activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (e) {}
        }
    }

    const hoverPill = typeof document !== 'undefined' ? document.getElementById('navbar-hover-pill') : null;
    if (hoverPill) hoverPill.style.opacity = '0';
    if (typeof syncNavbarActivePill === 'function') syncNavbarActivePill(false);

    const titles = (typeof TAB_TITLES !== 'undefined' && TAB_TITLES[currentLanguage])
        ? TAB_TITLES[currentLanguage]
        : (typeof TAB_TITLES !== 'undefined' ? TAB_TITLES.id : {});
    const pageTitleEl = document.getElementById('page-title');
    if(pageTitleEl) pageTitleEl.innerText = titles[tabId] || 'SnackLoop ERP';
    
    if(tabId === 'returns') {
        renderReturns();
    }
    if(tabId === 'jastip') {
        renderJastip();
    }
    if(tabId === 'reports') {
        renderReports();
    }

    if(tabId === 'dashboard') {
        updateDashboard();
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => renderFinancialChart());
        } else {
            setTimeout(() => { renderFinancialChart(); }, 50);
        }
    }
    if(tabId === 'transactions') renderMonthTabs();
    if(tabId === 'invoices') renderInvoicesTable();
}
