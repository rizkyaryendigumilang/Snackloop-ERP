// ======================= 1. LOGIN & AUTH ======================= //
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    
    let userInfo = null;
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', u)
            .eq('password', p);
            
        if (!error && data && data.length > 0) {
            userInfo = data[0];
        }
    } catch(err) {
        console.warn("Supabase query error:", err);
    }

    // Auto-provisioning & otentikasi akun admin_kiky (Super Admin / Owner)
    if (!userInfo && u.toLowerCase() === 'admin_kiky' && (p === '123456' || p === 'password123')) {
        try {
            const { data: newAdmin } = await supabaseClient
                .from('users')
                .insert([{ username: 'admin_kiky', password: p, role: 'super_admin' }])
                .select();
            if (newAdmin && newAdmin.length > 0) {
                userInfo = newAdmin[0];
            } else {
                userInfo = { username: 'admin_kiky', role: 'super_admin' };
            }
        } catch(err) {
            userInfo = { username: 'admin_kiky', role: 'super_admin' };
        }
    }

    // Auto-provisioning akun staff1 jika belum terdaftar di Supabase
    if (!userInfo && u.toLowerCase() === 'staff1' && (p === 'password123' || p === '123456')) {
        try {
            const { data: newStaff } = await supabaseClient
                .from('users')
                .insert([{ username: 'staff1', password: p, role: 'staff_rekap' }])
                .select();
            if (newStaff && newStaff.length > 0) {
                userInfo = newStaff[0];
            } else {
                userInfo = { username: 'staff1', role: 'staff_rekap' };
            }
        } catch(err) {
            userInfo = { username: 'staff1', role: 'staff_rekap' };
        }
    }

    // Fallback akun default admin
    if (!userInfo && u.toLowerCase() === 'admin' && (p === 'admin' || p === 'admin123' || p === '123456')) {
        userInfo = { username: 'admin', role: 'super_admin' };
    }
        
    if (!userInfo) {
        showNotification("Gagal", "Username atau Password salah.", "error");
        document.getElementById('login-password').value = '';
        return;
    }
    
    currentUser = userInfo.username;
    currentRole = userInfo.role || 'staff_rekap';

    // Simpan sesi login ke localStorage
    localStorage.setItem('snackloop_session', JSON.stringify({ username: currentUser, role: currentRole }));
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    applyRolePermissions();
    initApp();
    showNotification("Sukses", `Selamat datang kembali, ${currentUser}!`, "success");
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
    const modal = document.getElementById('modal-forgot-password');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
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
    const modal = document.getElementById('modal-forgot-password');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
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
                            Tautan pemulihan kata sandi telah dikirim ke <strong>${identifier}</strong>. Silakan periksa folder <em>Inbox</em> atau <em>Spam</em> Anda dan klik tautan tersebut untuk membuat kata sandi baru.
                        </div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Sukses", `Tautan reset telah dikirim ke ${identifier}`, "success");
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
                        <div class="mt-0.5 opacity-90">${error.message}</div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Gagal", error.message, "error");
            } else if (!users || users.length === 0) {
                feedbackEl.className = "p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs space-y-1";
                feedbackEl.innerHTML = `<div class="flex items-start gap-2">
                    <i class="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400 mt-0.5 text-sm"></i>
                    <div>
                        <div class="font-bold">Akun Tidak Ditemukan</div>
                        <div class="mt-1 leading-relaxed">
                            Username <strong>${identifier}</strong> tidak terdaftar dalam database SnackLoop. Pastikan penulisan sudah benar atau gunakan alamat email Supabase Anda.
                        </div>
                    </div>
                </div>`;
                feedbackEl.classList.remove('hidden');
                showNotification("Perhatian", `Username "${identifier}" tidak ditemukan.`, "warning");
            } else {
                const u = users[0];
                const waText = encodeURIComponent(`Halo Super Admin SnackLoop, saya ingin meminta bantuan reset password untuk akun ERP saya.\n\nUsername: ${u.username}\nRole: ${u.role}\n\nTerima kasih.`);
                feedbackEl.className = "p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 text-xs space-y-2.5";
                feedbackEl.innerHTML = `
                    <div class="flex items-start gap-2">
                        <i class="fa-solid fa-id-badge text-indigo-600 dark:text-indigo-400 mt-0.5 text-sm"></i>
                        <div>
                            <div class="font-bold">Akun Staf Ditemukan</div>
                            <div class="mt-0.5 opacity-90">Username: <strong>${u.username}</strong> &bull; Hak Akses: <span class="uppercase font-semibold">${u.role}</span></div>
                        </div>
                    </div>
                    <p class="text-[11px] leading-relaxed opacity-90">
                        Akun ini dikelola oleh Super Admin sistem. Silakan hubungi Super Admin untuk mereset kata sandi akun operasional ini, atau masukkan email Supabase jika akun Anda terhubung dengan email.
                    </p>
                    <div class="pt-1">
                        <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition">
                            <i class="fa-brands fa-whatsapp"></i>
                            <span>Hubungi Super Admin via WhatsApp</span>
                        </a>
                    </div>
                `;
                feedbackEl.classList.remove('hidden');
                showNotification("Akun Terverifikasi", `Akun ${u.username} ditemukan. Silakan hubungi Super Admin.`, "info");
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
    const modal = document.getElementById('modal-reset-password');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const passInput = document.getElementById('new-password');
    if (passInput) {
        passInput.value = '';
        setTimeout(() => passInput.focus(), 100);
    }
    const confirmInput = document.getElementById('confirm-new-password');
    if (confirmInput) confirmInput.value = '';
}

function closeResetPasswordModal() {
    const modal = document.getElementById('modal-reset-password');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
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
    if(navigator.onLine) {
        syncOutboxQueue();
    }
}

async function loadDataFromCloud() {
    try {
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
            supabaseClient.from('jastip_orders').select('*').order('order_date', { ascending: false }).catch(() => ({ data: null }))
        ]);

        agentData = resAgent.data || [];
        masterData = resMaster.data || [];
        customerData = resCust.data || [];
        repackData = resRepack.data || [];
        expenseData = resExp.data || [];
        userData = resUsers.data || [];

        if (resReturns && resReturns.data && Array.isArray(resReturns.data) && resReturns.data.length > 0) {
            returnData = resReturns.data;
        }
        if (resJastip && resJastip.data && Array.isArray(resJastip.data) && resJastip.data.length > 0) {
            jastipData = resJastip.data;
        }
        if (!userData.some(u => u.username && u.username.toLowerCase() === 'admin_kiky')) {
            try {
                const { data: newAdmin } = await supabaseClient
                    .from('users')
                    .insert([{ username: 'admin_kiky', password: '123456', role: 'super_admin' }])
                    .select('id, username, role');
                if (newAdmin && newAdmin.length > 0) {
                    userData.push(newAdmin[0]);
                } else {
                    userData.push({ id: 3, username: 'admin_kiky', role: 'super_admin' });
                }
            } catch(e) {
                userData.push({ id: 3, username: 'admin_kiky', role: 'super_admin' });
            }
        }
        if (!userData.some(u => u.username && u.username.toLowerCase() === 'staff1')) {
            try {
                const { data: newStaff } = await supabaseClient
                    .from('users')
                    .insert([{ username: 'staff1', password: 'password123', role: 'staff_rekap' }])
                    .select('id, username, role');
                if (newStaff && newStaff.length > 0) {
                    userData.push(newStaff[0]);
                }
            } catch(e) {}
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
    if(targetTab) targetTab.classList.remove('hidden');
    
    const activeBtn = document.getElementById('btn-' + tabId);
    if(activeBtn) activeBtn.classList.add('active');

    const titlesId = { 
        'dashboard': 'Dashboard Keuangan', 
        'transactions': 'Buku Transaksi', 
        'invoices': 'Manajemen Invoice',
        'returns': 'Retur & Klaim Agen',
        'jastip': 'Jastip & Personal Shopper',
        'reports': 'Laporan Bisnis & Analitik',
        'calculator': 'Kalkulator & Gudang Repack', 
        'master': 'Data Master Produk', 
        'customers': 'Manajemen Pelanggan', 
        'agents': 'Kelola Agent Pool',
        'users': 'Kelola Akun User' 
    };
    const titlesEn = {
        'dashboard': 'Financial Dashboard',
        'transactions': 'Transaction Ledger',
        'invoices': 'Invoice Management',
        'returns': 'Returns & Agent Claims',
        'jastip': 'Jastip & Personal Shopper',
        'reports': 'Business Reports & Analytics',
        'calculator': 'Repack Calculator & Warehouse',
        'master': 'Product Master Data',
        'customers': 'Customer Management',
        'agents': 'Agent Pool Management',
        'users': 'User Account Management'
    };
    const titles = currentLanguage === 'en' ? titlesEn : titlesId;
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
        setTimeout(() => { renderFinancialChart(); }, 100);
    }
    if(tabId === 'transactions') renderMonthTabs();
    if(tabId === 'invoices') renderInvoicesTable();
}
