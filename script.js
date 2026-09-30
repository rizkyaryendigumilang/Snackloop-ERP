// ==========================================================
// KONFIGURASI SUPABASE 
// ==========================================================
const SUPABASE_URL = 'https://wirypusjlaywxlnlpebc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hBxnQJOgix-cY8Bt5Tl6wQ_x1AOglpR';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentRole = null; 

let agentData = []; 
let masterData = []; 
let customerData = []; 
let repackData = []; 
let transactionData = {}; 
let userData = [];

let activeMonthSheet = ""; 
let currentTransactionFilter = 'all'; 
let currentRepackCalcResult = null;
let financialChartInstance = null;

// ======================= SISTEM TOAST NOTIFIKASI MODERN ======================= //
function showNotification(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(`${title}: ${message}`);
        return;
    }

    let borderColor = 'border-emerald-500';
    let iconClass = 'fa-solid fa-circle-check text-emerald-500';
    if (type === 'info') { borderColor = 'border-blue-500'; iconClass = 'fa-solid fa-circle-info text-blue-500'; }
    if (type === 'warning') { borderColor = 'border-amber-500'; iconClass = 'fa-solid fa-triangle-exclamation text-amber-500'; }
    if (type === 'error') { borderColor = 'border-rose-500'; iconClass = 'fa-solid fa-circle-xmark text-rose-500'; }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto bg-white rounded-lg shadow-xl border border-slate-100 border-l-4 ${borderColor} p-4 flex items-start justify-between gap-3 transform translate-x-10 opacity-0 transition-all duration-300 ease-out`;
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="${iconClass} text-lg mt-0.5"></i>
            <div>
                <h4 class="text-xs font-bold text-slate-800">${title}</h4>
                <p class="text-xs text-slate-500 mt-0.5">${message}</p>
            </div>
        </div>
        <button onclick="this.closest('div').parentElement.remove()" class="text-slate-400 hover:text-slate-600 text-sm font-bold">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('translate-x-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-x-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ======================= HELPER RUPIAH FORMAT ======================= //
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

document.addEventListener("DOMContentLoaded", function() {
    ['m-buy', 'm-sell', 'c-price', 'c-disc', 'c-fee', 'c-plastic', 'c-sell', 't-sell'].forEach(id => {
        setupCurrencyFormatter(id);
    });
});

// ======================= 1. LOGIN & AUTH ======================= //
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', u)
        .eq('password', p);
        
    if (error || !data || data.length === 0) {
        showNotification("Gagal", "Username atau Password salah.", "error");
        document.getElementById('login-password').value = '';
        return;
    }
    
    const userInfo = data[0];
    currentUser = userInfo.username;
    currentRole = userInfo.role;
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('current-user-label').innerText = `${currentUser} (${currentRole.toUpperCase()})`;
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    // PENERAPAN OPSI A: Kontrol Tampilan Menu & Form Berdasarkan Role
    if (currentRole === 'super_admin') {
        document.getElementById('nav-item-users').style.display = 'block';
    } else {
        document.getElementById('nav-item-users').style.display = 'none';
        ['form-transaksi-card', 'form-repack-card', 'form-master-card', 'form-customer-card', 'form-agent-card'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }
    
    initApp();
    showNotification("Sukses", `Selamat datang kembali, ${currentUser}!`, "success");
});

function logoutApp() {
    currentUser = null;
    currentRole = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    switchTab('dashboard');
    showNotification("Info", "Berhasil keluar aplikasi.", "info");
}

async function initApp() {
    await loadDataFromCloud();
    feather.replace();

    const dateInput = document.getElementById('t-date');
    if(dateInput && !dateInput.value) dateInput.valueAsDate = new Date();
    
    const currentMonthKey = getCurrentMonthKey(new Date());
    if(!transactionData[currentMonthKey]) transactionData[currentMonthKey] = [];
    if(!activeMonthSheet) activeMonthSheet = currentMonthKey;

    renderAgents();
    renderDropdowns(); 
    renderMonthTabs(); 
    updateDashboard(); 
    renderFinancialChart();
    renderRepackWarehouse();
    renderMaster();
    renderCustomer();
    if(currentRole === 'super_admin') renderUsers();
}

// ======================= 2. FETCH DATA DARI SUPABASE ======================= //
async function loadDataFromCloud() {
    try {
        const [resAgent, resMaster, resCust, resRepack, resTrx, resUsers] = await Promise.all([
            supabaseClient.from('agents').select('*'),
            supabaseClient.from('master').select('*'),
            supabaseClient.from('customers').select('*'),
            supabaseClient.from('repack').select('*'),
            supabaseClient.from('transactions').select('*'),
            supabaseClient.from('users').select('id, username, role')
        ]);

        agentData = resAgent.data || [];
        masterData = resMaster.data || [];
        customerData = resCust.data || [];
        repackData = resRepack.data || [];
        userData = resUsers.data || [];

        transactionData = {};
        (resTrx.data || []).forEach(t => {
            const formatted = {
                id: t.id, monthKey: t.month_key, date: t.date, customer: t.customer,
                itemName: t.item_name, source: t.source, qty: t.qty, batch: t.batch,
                buy: t.buy, totalModal: t.total_modal, sell: t.sell, totalSell: t.total_sell,
                status: t.status, profitPerItem: t.profit_per_item
            };
            if(!transactionData[formatted.monthKey]) transactionData[formatted.monthKey] = [];
            transactionData[formatted.monthKey].push(formatted);
        });
    } catch (err) { console.error("Gagal sinkronisasi Supabase:", err); }
}

function getCurrentMonthKey(dateObj) { 
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]; 
    return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`; 
}

// ======================= 3. NAVIGASI & DARK MODE ======================= //
document.getElementById('dark-mode-toggle').addEventListener('change', function() {
    if(this.checked) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.navbar__link').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.remove('hidden');
    
    const activeBtn = document.getElementById('btn-' + tabId);
    if(activeBtn) activeBtn.classList.add('active');

    const titles = { 
        'dashboard': 'Dashboard Keuangan', 
        'transactions': 'Buku Transaksi', 
        'calculator': 'Kalkulator & Gudang Repack', 
        'master': 'Data Master Produk', 
        'customers': 'Manajemen Pelanggan', 
        'agents': 'Kelola Agent Pool',
        'users': 'Kelola Akun User' 
    };
    const pageTitleEl = document.getElementById('page-title');
    if(pageTitleEl) pageTitleEl.innerText = titles[tabId] || 'SnackLoop ERP';

    if(tabId === 'dashboard') {
        updateDashboard();
        renderFinancialChart();
    }
    if(tabId === 'transactions') renderMonthTabs();
}

// ======================= 4. MANAJEMEN AGENT POOL ======================= //
function renderAgents() {
    const tbody = document.getElementById('agent-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    agentData.forEach((ag) => {
        const action = currentRole === 'super_admin' ? `<button onclick="deleteAgent(${ag.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>` : '-';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-mono opacity-60">#${ag.id}</td>
                <td class="p-3 border border-inherit font-semibold">${ag.name}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
    updateAgentDropdowns();
}

function updateAgentDropdowns() {
    const selects = ['m-source', 't-source'];
    selects.forEach(selId => {
        const el = document.getElementById(selId);
        if(el) {
            const currentVal = el.value;
            el.innerHTML = `<option value="" disabled selected>-- Pilih Agen / Sumber --</option>`;
            if(selId === 't-source') {
                el.innerHTML += `<option value="Repack">📦 Gudang Repack (Dinamis)</option>`;
            }
            agentData.forEach(ag => {
                el.innerHTML += `<option value="${ag.name}">${ag.name}</option>`;
            });
            el.value = currentVal;
        }
    });
}

document.getElementById('agent-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const name = document.getElementById('ag-name').value.trim();
    
    const { error } = await supabaseClient.from('agents').insert([{ name }]);
    if(error) return showNotification("Gagal", error.message, "error");
    
    await loadDataFromCloud();
    renderAgents();
    this.reset();
    showNotification("Sukses", "Agen baru berhasil ditambahkan!", "success");
});

async function deleteAgent(id) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    if(confirm('Hapus agen ini dari pool?')) {
        await supabaseClient.from('agents').delete().eq('id', id);
        await loadDataFromCloud();
        renderAgents();
        showNotification("Info", "Agen berhasil dihapus.", "info");
    }
}

// ======================= 5. MANAJEMEN USER ======================= //
async function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    userData.forEach((u) => {
        const deleteBtn = u.username === 'admin' ? `<span class="text-xs opacity-40">Utama</span>` : `<button onclick="deleteUser(${u.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>`;
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${u.username}</td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-600 rounded text-[10px] font-bold">${u.role}</span></td>
                <td class="p-3 border border-inherit text-center">${deleteBtn}</td>
            </tr>`;
    });
}

document.getElementById('user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole !== 'super_admin') return showNotification("Akses Ditolak", "Hanya Super Admin yang diizinkan.", "error");
    
    const username = document.getElementById('u-name').value.trim();
    const password = document.getElementById('u-pass').value.trim();
    
    const { error } = await supabaseClient.from('users').insert([{ username, password, role: 'view' }]);
    if(error) return showNotification("Gagal", error.message, "error");
    
    await loadDataFromCloud(); 
    renderUsers(); 
    this.reset(); 
    showNotification("Sukses", "Akun View berhasil dibuat!", "success");
});

async function deleteUser(id) {
    if(currentRole !== 'super_admin') return;
    if(confirm('Hapus akun ini?')) {
        await supabaseClient.from('users').delete().eq('id', id);
        await loadDataFromCloud(); 
        renderUsers();
        showNotification("Info", "Akun berhasil dihapus.", "info");
    }
}

// ======================= 6. MASTER & CUSTOMER ======================= //
async function renderMaster() {
    const tbody = document.getElementById('master-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    masterData.forEach((m) => {
        const action = currentRole === 'super_admin' ? `<button onclick="deleteMaster(${m.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>` : '-';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${m.name}</td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">${m.source}</span></td>
                <td class="p-3 border border-inherit">Rp ${m.buy.toLocaleString()}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${m.sell.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
}

document.getElementById('master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan.", "warning");
    
    await supabaseClient.from('master').insert([{
        name: document.getElementById('m-name').value, 
        source: document.getElementById('m-source').value,
        buy: getCleanNumber('m-buy'),
        sell: getCleanNumber('m-sell')
    }]);
    
    await loadDataFromCloud(); 
    renderMaster(); 
    this.reset(); 
    showNotification("Sukses", "Master produk tersimpan ke Cloud!", "success");
});

async function deleteMaster(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    if(confirm('Hapus produk master?')) { 
        await supabaseClient.from('master').delete().eq('id', id); 
        await loadDataFromCloud(); 
        renderMaster(); 
        showNotification("Info", "Master produk dihapus.", "info");
    }
}

async function renderCustomer() {
    const tbody = document.getElementById('cust-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    customerData.forEach((c) => {
        const action = currentRole === 'super_admin' ? `<button onclick="deleteCustomer(${c.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>` : '-';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${c.name}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">+${c.phone}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
}

document.getElementById('cust-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    await supabaseClient.from('customers').insert([{ name: document.getElementById('cu-name').value, phone: document.getElementById('cu-phone').value }]);
    await loadDataFromCloud(); renderCustomer(); renderDropdowns(); this.reset(); 
    showNotification("Sukses", "Pelanggan tersimpan ke Cloud!", "success");
});

async function deleteCustomer(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akses ditolak.", "warning");
    if(confirm('Hapus pelanggan?')) { 
        await supabaseClient.from('customers').delete().eq('id', id); 
        await loadDataFromCloud(); renderCustomer(); renderDropdowns(); 
        showNotification("Info", "Pelanggan dihapus.", "info");
    }
}

// ======================= 7. REPACK WAREHOUSE ======================= //
function calculateRepack() {
    const name = document.getElementById('c-name').value || 'Produk Repack';
    const price = getCleanNumber('c-price');
    const disc = getCleanNumber('c-disc');
    const fee = getCleanNumber('c-fee');
    const qty = parseInt(document.getElementById('c-qty').value) || 1;
    const plastic = getCleanNumber('c-plastic');
    const sellTarget = getCleanNumber('c-sell');

    const buyPerItem = (price - disc + fee) / qty;
    const finalModal = Math.ceil(buyPerItem + plastic);
    const estProfit = (sellTarget - finalModal) * qty;

    document.getElementById('calc-res').classList.remove('hidden');
    document.getElementById('res-final').innerHTML = `HPP / Modal: <b>Rp ${finalModal.toLocaleString()}</b> /pcs`;
    document.getElementById('res-profit').innerHTML = `Potensi Keuntungan Batch: <b>Rp ${estProfit.toLocaleString()}</b>`;

    currentRepackCalcResult = {
        id: `BATCH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().slice(0, 10),
        name, modal_per_pcs: finalModal, sell_target: sellTarget, initial_qty: qty, remaining_qty: qty
    };
    if(currentRole === 'super_admin') document.getElementById('btn-save-repack').classList.remove('hidden');
    showNotification("Sukses", "Perhitungan HPP berhasil!", "success");
}

async function saveToRepackWarehouse() {
    if(!currentRepackCalcResult || currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    await supabaseClient.from('repack').insert([currentRepackCalcResult]);
    await loadDataFromCloud(); renderRepackWarehouse(); onSourceChange(); 
    showNotification("Sukses", "Batch masuk ke Gudang Repack Cloud!", "success");
    currentRepackCalcResult = null;
    document.getElementById('btn-save-repack').classList.add('hidden');
    document.getElementById('calc-res').classList.add('hidden');
    ['c-name', 'c-price', 'c-disc', 'c-fee', 'c-qty', 'c-plastic', 'c-sell'].forEach(id => document.getElementById(id).value = '');
}

function renderRepackWarehouse() {
    const tbody = document.getElementById('repack-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    repackData.forEach((r) => {
        const outOfStock = r.remaining_qty <= 0;
        const bgClass = outOfStock ? 'opacity-50' : 'hover:bg-slate-50/50';
        const badge = outOfStock ? `<span class="bg-rose-100 text-rose-700 px-2 rounded font-bold">HABIS</span>` : `<span class="font-bold text-lg text-emerald-500">${r.remaining_qty}</span>`;
        const action = currentRole === 'super_admin' ? `<button onclick="deleteRepackBatch('${r.id}')" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>` : '-';
        tbody.innerHTML += `
            <tr class="${bgClass}">
                <td class="p-3 border border-inherit font-mono text-indigo-500 font-bold">${r.id} <br><span class="text-[9px] opacity-60">${r.date}</span></td>
                <td class="p-3 border border-inherit font-semibold">${r.name}</td>
                <td class="p-3 border border-inherit opacity-70">Rp ${r.modal_per_pcs.toLocaleString()}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-500">Rp ${r.sell_target.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center">${r.initial_qty}</td>
                <td class="p-3 border border-inherit text-center">${badge}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    });
}

async function deleteRepackBatch(batchId) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    if(confirm('Hapus Batch Repack permanen?')) { 
        await supabaseClient.from('repack').delete().eq('id', batchId); 
        await loadDataFromCloud(); renderRepackWarehouse(); onSourceChange(); 
        showNotification("Info", "Batch Repack dihapus.", "info");
    }
}

// ======================= 8. KASIR & TRANSAKSI ======================= //
function renderDropdowns() {
    const tCust = document.getElementById('t-customer');
    if(tCust) {
        tCust.innerHTML = `<option value="" disabled selected>-- Pilih Pelanggan --</option>`;
        customerData.forEach(c => { tCust.innerHTML += `<option value="${c.name}">${c.name}</option>`; });
    }
    updateAgentDropdowns();
}

function onSourceChange() {
    const src = document.getElementById('t-source').value;
    const prodSel = document.getElementById('t-product');
    prodSel.innerHTML = `<option value="" disabled selected>-- Pilih Produk --</option>`;
    document.getElementById('t-batch').value = ""; document.getElementById('t-buy').value = ''; document.getElementById('t-sell').value = ''; document.getElementById('t-qty').max = ""; document.getElementById('t-qty').value = "1";

    if(!src) return;
    if(src === 'Repack') {
        let hasStock = false;
        repackData.forEach((r) => {
            if(r.remaining_qty > 0) { prodSel.innerHTML += `<option value="REPACK|${r.id}">[Sisa: ${r.remaining_qty}] ${r.name}</option>`; hasStock = true; }
        });
        if(!hasStock) prodSel.innerHTML = `<option value="" disabled selected>❌ Gudang Repack Kosong</option>`;
    } else {
        masterData.forEach((m) => {
            if(m.source === src) prodSel.innerHTML += `<option value="MASTER|${m.id}">${m.name} (Modal: Rp${m.buy.toLocaleString()})</option>`;
        });
    }
}

function fillProductData() {
    const val = document.getElementById('t-product').value;
    if(!val) return;
    const parts = val.split('|'); const type = parts[0]; const id = parts[1];

    if(type === 'REPACK') {
        const item = repackData.find(r => r.id === id);
        document.getElementById('t-buy').value = item.modal_per_pcs.toLocaleString('id-ID');
        document.getElementById('t-sell').value = item.sell_target.toLocaleString('id-ID');
        document.getElementById('t-batch').value = item.id;
        document.getElementById('t-qty').max = item.remaining_qty;
    } else {
        const item = masterData.find(m => m.id === parseInt(id));
        document.getElementById('t-buy').value = item.buy.toLocaleString('id-ID');
        document.getElementById('t-sell').value = item.sell.toLocaleString('id-ID');
        document.getElementById('t-batch').value = "Reguler";
        document.getElementById('t-qty').removeAttribute('max');
    }
}

document.getElementById('trx-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun View tidak diizinkan mencatat transaksi.", "warning");
    
    const date = document.getElementById('t-date').value;
    const customer = document.getElementById('t-customer').value;
    const source = document.getElementById('t-source').value;
    const pVal = document.getElementById('t-product').value;
    let qty = parseInt(document.getElementById('t-qty').value);
    const buy = getCleanNumber('t-buy');
    const sell = getCleanNumber('t-sell');
    const status = document.getElementById('t-status').value;
    
    let itemName = ""; let batchId = document.getElementById('t-batch').value;

    if(source === 'Repack') {
        const rItem = repackData.find(r => r.id === batchId);
        if(qty > rItem.remaining_qty) return showNotification("Peringatan", `Stok ${rItem.name} hanya sisa ${rItem.remaining_qty}.`, "warning");
        itemName = rItem.name;
        await supabaseClient.from('repack').update({ remaining_qty: rItem.remaining_qty - qty }).eq('id', batchId);
    } else {
        const mId = parseInt(pVal.split('|')[1]);
        itemName = masterData.find(m => m.id === mId).name;
    }

    const monthKey = getCurrentMonthKey(new Date(date));
    await supabaseClient.from('transactions').insert([{
        month_key: monthKey, date, customer, item_name: itemName, source, qty, batch: batchId,
        buy, total_modal: buy*qty, sell, total_sell: sell*qty, status, profit_per_item: sell-buy
    }]);

    await loadDataFromCloud(); activeMonthSheet = monthKey;
    renderMonthTabs(); updateDashboard(); renderRepackWarehouse();
    
    showNotification("Sukses", "Penjualan tersimpan ke Cloud!", "success");
    this.reset(); document.getElementById('t-date').valueAsDate = new Date();
    document.getElementById('t-product').innerHTML = `<option value="" disabled selected>-- Pilih Sumber Dulu --</option>`;
});

function renderMonthTabs() {
    const container = document.getElementById('month-tabs-container');
    if(!container) return;
    container.innerHTML = '';
    let keys = Object.keys(transactionData).sort();
    if(keys.length === 0) { keys = [getCurrentMonthKey(new Date())]; transactionData[keys[0]] = []; }
    if(!activeMonthSheet || !transactionData[activeMonthSheet]) activeMonthSheet = keys[keys.length-1];

    keys.forEach(mk => {
        const isActive = mk === activeMonthSheet;
        container.innerHTML += `<button onclick="activeMonthSheet='${mk}'; renderMonthTabs();" class="px-4 py-2 rounded-xl text-xs font-bold transition border ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-transparent hover:bg-slate-500/10'}">Sheet: ${mk}</button>`;
    });
    if(currentRole === 'super_admin') {
        container.innerHTML += `<button onclick="createNewMonthSheet()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/30 transition shadow-sm ml-2"><i class="fa-solid fa-plus mr-1"></i> Buat Sheet Baru</button>`;
    }

    renderTransactionsForActiveSheet();
}

function createNewMonthSheet() {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    const inputMonth = prompt("Masukkan nama bulan baru (Contoh: Okt 2026):");
    if(inputMonth && inputMonth.trim() !== "") {
        const formatted = inputMonth.trim();
        if(!transactionData[formatted]) { transactionData[formatted] = []; activeMonthSheet = formatted; renderMonthTabs(); }
        else { showNotification('Info', 'Sheet sudah ada!', 'info'); activeMonthSheet = formatted; renderMonthTabs(); }
    }
}

function filterTrxStatus(st) {
    currentTransactionFilter = st;
    document.getElementById('filter-btn-all').className = st === 'all' ? 'px-3 py-1.5 rounded-lg font-bold bg-indigo-600 text-white' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition';
    document.getElementById('filter-btn-lunas').className = st === 'Lunas' ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition';
    document.getElementById('filter-btn-belum').className = st === 'Belum Lunas' ? 'px-3 py-1.5 rounded-lg font-bold bg-rose-600 text-white' : 'px-3 py-1.5 rounded-lg font-bold theme-btn-filter transition';
    renderTransactionsForActiveSheet();
}

function renderTransactionsForActiveSheet() {
    document.getElementById('table-sheet-heading').innerText = `Tabel Penjualan: ${activeMonthSheet}`;
    const tbody = document.getElementById('trx-table-body'); tbody.innerHTML = '';
    const list = transactionData[activeMonthSheet] || [];
    const filteredList = list.filter(t => currentTransactionFilter === 'all' || t.status === currentTransactionFilter);

    if(filteredList.length === 0) return tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center opacity-60">Belum ada transaksi di sheet ini.</td></tr>`;

    filteredList.forEach((t) => {
        const itemProfit = t.profitPerItem * t.qty;
        const statusDropdown = currentRole === 'super_admin' ? 
            `<select onchange="updateTrxStatus(${t.id}, this.value)" class="text-[11px] font-bold px-2 py-1 rounded border cursor-pointer outline-none ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/20 text-rose-600 border-rose-500/30'}"><option value="Lunas" ${t.status === 'Lunas' ? 'selected' : ''}>Lunas</option><option value="Belum Lunas" ${t.status === 'Belum Lunas' ? 'selected' : ''}>Belum Lunas</option></select>` :
            `<span class="px-2 py-1 rounded text-xs font-bold ${t.status === 'Lunas' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}">${t.status}</span>`;

        const srcBadge = t.source === 'Repack' ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-600 px-1 rounded font-bold">${t.batch}</span>` : `<span class="text-[9px] bg-slate-500/20 text-inherit px-1 rounded font-bold">${t.source}</span>`;
        
        const actionBtn = currentRole === 'super_admin' ? `
            <button onclick="downloadPDF(${t.id})" title="Download PDF" class="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded text-xs"><i class="fa-solid fa-file-pdf"></i></button>
            <button onclick="sendWhatsAppOnly(${t.id})" title="Kirim WA" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs"><i class="fa-brands fa-whatsapp"></i></button>
            <button onclick="deleteTrx(${t.id})" class="text-rose-500 hover:text-rose-700 px-1"><i class="fa-solid fa-trash"></i></button>` : `
            <button onclick="downloadPDF(${t.id})" title="Download PDF" class="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded text-xs"><i class="fa-solid fa-file-pdf"></i></button>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit">${t.date}</td>
                <td class="p-3 border border-inherit font-bold text-indigo-500">${t.customer}</td>
                <td class="p-3 border border-inherit font-medium">${t.itemName} <br>${srcBadge}</td>
                <td class="p-3 border border-inherit text-center font-bold">${t.qty}</td>
                <td class="p-3 border border-inherit opacity-70">Rp ${t.totalModal.toLocaleString()}</td>
                <td class="p-3 border border-inherit font-bold">Rp ${t.totalSell.toLocaleString()}</td>
                <td class="p-3 border border-inherit">${statusDropdown}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold">Rp ${itemProfit.toLocaleString()}</td>
                <td class="p-3 border border-inherit text-center space-x-1">${actionBtn}</td>
            </tr>`;
    });
}

async function updateTrxStatus(id, newStatus) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    await supabaseClient.from('transactions').update({ status: newStatus }).eq('id', id);
    await loadDataFromCloud(); renderTransactionsForActiveSheet(); updateDashboard();
    showNotification("Sukses", "Status transaksi diperbarui.", "success");
}

async function deleteTrx(id) {
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");
    if(confirm('Hapus transaksi ini? (Stok Repack akan dikembalikan otomatis)')) {
        const trx = (transactionData[activeMonthSheet] || []).find(t => t.id === id);
        if(trx && trx.source === 'Repack') {
            const rItem = repackData.find(r => r.id === trx.batch);
            if(rItem) await supabaseClient.from('repack').update({ remaining_qty: rItem.remaining_qty + trx.qty }).eq('id', trx.batch);
        }
        await supabaseClient.from('transactions').delete().eq('id', id);
        await loadDataFromCloud(); renderTransactionsForActiveSheet(); updateDashboard(); renderRepackWarehouse();
        showNotification("Info", "Transaksi berhasil dihapus.", "info");
    }
}

// PDF Nota Satuan
async function downloadPDF(trxId) {
    let targetTrx = null;
    for(let m in transactionData) {
        const found = transactionData[m].find(t => t.id === trxId);
        if(found) { targetTrx = found; break; }
    }
    if (!targetTrx) return showNotification('Gagal', 'Data tidak valid!', 'error');
    
    document.getElementById('pdf-doc-title').innerText = "INVOICE";
    document.getElementById('pdf-meta-subtitle').innerText = "Ditagihkan Kepada:";
    document.getElementById('pdf-meta-id-wrap').style.display = "block";
    document.getElementById('pdf-total-label').innerText = "Total Tagihan";
    document.getElementById('pdf-footer-note').innerText = "Terima kasih telah berbelanja di SnackLoop!";
    
    await prepareInvoiceCartFromRow(targetTrx);

    const parts = targetTrx.date.split('-');
    const fileName = `${parts[2]}-${parts[1]}-${parts[0]}_${targetTrx.customer}_Receipt.pdf`;

    html2pdf().from(document.querySelector('.print-area')).set({
        margin: 10, filename: fileName, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
    showNotification("Sukses", "Nota PDF berhasil diunduh.", "success");
}

async function prepareInvoiceCartFromRow(targetTrx) {
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);
    let grandTotal = 0;
    let tbody = document.getElementById('inv-cart-body');
    tbody.innerHTML = '';

    matchingTransactions.forEach(t => {
        grandTotal += t.totalSell;
        tbody.innerHTML += `
            <tr class="border-b border-slate-200">
                <td class="py-3 pr-2 font-medium">${t.itemName} <span class="text-xs opacity-60">(${t.source})</span></td>
                <td class="py-3 px-2 text-center">${t.qty}</td>
                <td class="py-3 px-2 text-right">Rp ${(t.totalSell / t.qty).toLocaleString()}</td>
                <td class="py-3 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    });

    document.getElementById('inv-meta-customer').innerText = targetTrx.customer;
    document.getElementById('inv-meta-date').innerText = targetTrx.date;
    document.getElementById('inv-meta-no').innerText = `INV-${targetTrx.date.replace(/-/g,'')}-${targetTrx.id}`;
    document.getElementById('inv-subtotal').innerText = 'Rp ' + grandTotal.toLocaleString();
    document.getElementById('inv-grand-total').innerText = 'Rp ' + grandTotal.toLocaleString();
}

// CETAK REKAP LAPORAN BULANAN PDF
async function printMonthlyRecapPDF() {
    const list = transactionData[activeMonthSheet] || [];
    if(list.length === 0) return showNotification("Peringatan", `Sheet ${activeMonthSheet} kosong.`, "warning");

    let totalPendapatan = 0; let totalModal = 0; let totalKeuntungan = 0;
    let tbody = document.getElementById('inv-cart-body');
    tbody.innerHTML = '';

    list.forEach((t, index) => {
        const itemProfit = (t.profitPerItem * t.qty);
        totalPendapatan += t.totalSell;
        totalModal += t.totalModal;
        if(t.status === 'Lunas') totalKeuntungan += itemProfit;

        tbody.innerHTML += `
            <tr class="border-b border-slate-200 text-xs">
                <td class="py-2.5 pr-2">${index + 1}. ${t.date} - <b>${t.customer}</b><br><span class="opacity-70">${t.itemName} (${t.qty}x)</span></td>
                <td class="py-2.5 px-2 text-center">${t.status}</td>
                <td class="py-2.5 px-2 text-right">Rp ${t.totalModal.toLocaleString()}</td>
                <td class="py-2.5 pl-2 text-right font-bold">Rp ${t.totalSell.toLocaleString()}</td>
            </tr>`;
    });

    document.getElementById('pdf-doc-title').innerText = "REKAP LAPORAN KEUANGAN";
    document.getElementById('pdf-meta-subtitle').innerText = "Periode Bulan:";
    document.getElementById('inv-meta-customer').innerText = activeMonthSheet;
    document.getElementById('inv-meta-date').innerText = new Date().toISOString().slice(0, 10);
    document.getElementById('pdf-meta-id-wrap').style.display = "none";
    document.getElementById('pdf-subtotal-row').innerHTML = `<span>Total Modal (HPP)</span><span class="font-medium">Rp ${totalModal.toLocaleString()}</span>`;
    document.getElementById('pdf-total-label').innerText = "Keuntungan Bersih (Lunas)";
    document.getElementById('inv-grand-total').innerText = 'Rp ' + totalKeuntungan.toLocaleString();
    document.getElementById('pdf-footer-note').innerText = `Total Pendapatan Periode Ini: Rp ${totalPendapatan.toLocaleString()}`;

    const fileName = `Rekap_Keuangan_${activeMonthSheet.replace(' ', '_')}.pdf`;

    html2pdf().from(document.querySelector('.print-area')).set({
        margin: 10, filename: fileName, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();

    showNotification("Sukses", `Rekap PDF bulan ${activeMonthSheet} berhasil diunduh.`, "success");
}

async function sendWhatsAppOnly(trxId) {
    let targetTrx = null;
    for(let m in transactionData) {
        const found = transactionData[m].find(t => t.id === trxId);
        if(found) { targetTrx = found; break; }
    }
    if (!targetTrx) return showNotification('Gagal', 'Data tidak valid!', 'error');
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);

    let total = 0; let itemsText = "";
    matchingTransactions.forEach((t) => {
        itemsText += `- ${t.itemName} (${t.qty}x) - Rp ${t.totalSell.toLocaleString()}%0A`;
        total += t.totalSell;
    });

    const custObj = customerData.find(c => c.name === targetTrx.customer);
    const phone = custObj ? custObj.phone : '628123456789';

    let msg = `*NOTA SNACKLOOP (${targetTrx.monthKey})* Kepada: *${targetTrx.customer}* Tanggal: ${targetTrx.date}%0A`;
    msg += `-----------------------------------%0A` + itemsText + `-----------------------------------%0A`;
    msg += `*TOTAL: Rp ${total.toLocaleString()}* Status: *${targetTrx.status}* Terima kasih! 🙏`;

    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// ======================= 9. DASHBOARD & EXPORT & CHART.JS ======================= //
function updateDashboard() {
    let Pendapatan = 0, modal = 0, Keuntungan = 0, Hutang = 0; let unpaidList = [];
    const filterSel = document.getElementById('dashboard-month-filter');
    const currentSel = filterSel ? filterSel.value : 'all';
    
    if (filterSel) {
        filterSel.innerHTML = `<option value="all">🌐 Keseluruhan </option>`;
        Object.keys(transactionData).forEach(mk => {
            const isSel = mk === currentSel ? 'selected' : '';
            filterSel.innerHTML += `<option value="${mk}" ${isSel}>📅 Bulan: ${mk}</option>`;
        });
    }
    const targetMonth = filterSel ? filterSel.value : 'all';

    for(let mk in transactionData) {
        if (targetMonth !== 'all' && mk !== targetMonth) continue;
        transactionData[mk].forEach((t) => {
            Pendapatan += t.totalSell; modal += t.totalModal;
            if(t.status === 'Lunas') Keuntungan += (t.profitPerItem * t.qty);
            else { Hutang += t.totalSell; unpaidList.push(t); }
        });
    }

    document.getElementById('stat-Pendapatan').innerText = 'Rp ' + Pendapatan.toLocaleString();
    document.getElementById('stat-modal').innerText = 'Rp ' + modal.toLocaleString();
    document.getElementById('stat-Keuntungan').innerText = 'Rp ' + Keuntungan.toLocaleString();
    document.getElementById('stat-Hutang').innerText = 'Rp ' + Hutang.toLocaleString();
    document.getElementById('stat-Pendapatan-desc').innerText = targetMonth === 'all' ? 'Keseluruhan' : targetMonth;

    const uBody = document.getElementById('dashboard-unpaid-body');
    document.getElementById('unpaid-badge').innerText = `${unpaidList.length} Tagihan`;
    if(uBody) {
        uBody.innerHTML = unpaidList.length === 0 ? `<tr><td colspan="5" class="p-4 text-center opacity-60">Tidak ada Hutang aktif. Mantap!</td></tr>` : '';
        unpaidList.forEach(t => {
            const btnLunasi = currentRole === 'super_admin' ? `<button onclick="updateTrxStatus(${t.id}, 'Lunas')" class="bg-indigo-500/20 text-indigo-600 px-2 py-1 rounded text-[11px] font-bold">Lunasi</button>` : '-';
            uBody.innerHTML += `
                <tr class="hover:bg-slate-50/50">
                    <td class="p-2.5 border border-inherit">${t.date} <br><span class="text-[9px] opacity-60">${t.monthKey}</span></td>
                    <td class="p-2.5 border border-inherit font-bold text-indigo-500">${t.customer}</td>
                    <td class="p-2.5 border border-inherit font-medium">${t.itemName} (${t.qty}x)</td>
                    <td class="p-2.5 border border-inherit font-bold text-rose-500">Rp ${t.totalSell.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit text-center">${btnLunasi}</td>
                </tr>`;
        });
    }
}

// RENDER GRAFIK KEUANGAN CHART.JS
function renderFinancialChart() {
    const ctx = document.getElementById('financialChart');
    if(!ctx) return;

    let months = Object.keys(transactionData).sort();
    let PendapatanData = [];
    let KeuntunganData = [];

    months.forEach(mk => {
        let omz = 0; let lab = 0;
        (transactionData[mk] || []).forEach(t => {
            omz += t.totalSell;
            if(t.status === 'Lunas') lab += (t.profitPerItem * t.qty);
        });
        PendapatanData.push(omz);
        KeuntunganData.push(lab);
    });

    if(financialChartInstance) {
        financialChartInstance.destroy();
    }

    financialChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.length > 0 ? months : ['Belum Ada Data'],
            datasets: [
                {
                    label: 'Total Pendapatan (Rp)',
                    data: PendapatanData.length > 0 ? PendapatanData : [0],
                    backgroundColor: 'rgba(99, 102, 241, 0.75)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1,
                    borderRadius: 8
                },
                {
                    label: 'Keuntungan Bersih (Rp)',
                    data: KeuntunganData.length > 0 ? KeuntunganData : [0],
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Poppins', size: 11 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: 'Poppins', size: 10 },
                        callback: function(value) { return 'Rp ' + value.toLocaleString(); }
                    }
                },
                x: {
                    ticks: { font: { family: 'Poppins', size: 10 } }
                }
            }
        }
    });
}

async function exportActiveSheetToExcelLocal() {
    const list = transactionData[activeMonthSheet] || [];
    if (list.length === 0) return showNotification("Peringatan", "Sheet kosong.", "warning");
    const rows = list.map((t, idx) => ({
        "No": idx + 1, "Tanggal": t.date, "Pelanggan": t.customer, "Nama Barang": t.itemName, "Sumber/Batch": t.source === 'Repack' ? `Repack: ${t.batch}` : t.source,
        "Qty": t.qty, "Harga Beli": t.buy, "Total Modal": t.totalModal, "Harga Jual": t.sell / t.qty, "Total Jual": t.totalSell, "Status": t.status, "Keuntungan": t.profitPerItem * t.qty
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, activeMonthSheet);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Data_Penjualan_${activeMonthSheet.replace(' ', '_')}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    showNotification("Sukses", "Data Excel berhasil diexport.", "success");
}