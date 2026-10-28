// ========================================================================================= //
// ==================== MODUL JASTIP (PERSONAL SHOPPER & IMPORT SERVICE) =================== //
// ========================================================================================= //

let jastipData = [];
let currentJastipFilter = 'all';
let currentJastipSearch = '';
let currentReceiptPhotoBase64 = '';

const JASTIP_STORAGE_KEY = 'snackloop_jastip_orders';

// Daftar Kurs Default (Dapat disesuaikan di kalkulator/form)
const DEFAULT_EXCHANGE_RATES = {
    JPY: { name: 'Yen Jepang (JPY)', symbol: '¥', real: 105, catalog: 116, taxRefund: 10, flag: '🇯🇵', toUsd: 0.0065 },
    SGD: { name: 'Dolar Singapura (SGD)', symbol: 'S$', real: 11900, catalog: 12500, taxRefund: 8, flag: '🇸🇬', toUsd: 0.76 },
    KRW: { name: 'Won Korea (KRW)', symbol: '₩', real: 11.5, catalog: 13.0, taxRefund: 7, flag: '🇰🇷', toUsd: 0.00073 },
    THB: { name: 'Baht Thailand (THB)', symbol: '฿', real: 460, catalog: 510, taxRefund: 7, flag: '🇹🇭', toUsd: 0.028 },
    MYR: { name: 'Ringgit Malaysia (MYR)', symbol: 'RM', real: 3600, catalog: 3850, taxRefund: 0, flag: '🇲🇾', toUsd: 0.23 },
    USD: { name: 'Dolar AS (USD)', symbol: '$', real: 16200, catalog: 16900, taxRefund: 0, flag: '🇺🇸', toUsd: 1.0 },
    IDR: { name: 'Rupiah Indonesia (Lokal)', symbol: 'Rp', real: 1, catalog: 1, taxRefund: 0, flag: '🇮🇩', toUsd: 0.000062 }
};

// 1. Inisialisasi & Caching Data Jastip
function initJastipData() {
    try {
        const cached = localStorage.getItem(JASTIP_STORAGE_KEY);
        if (cached) {
            jastipData = JSON.parse(cached);
        } else {
            // Data demo edukatif mencerminkan workflow nyata (Lokal & Impor)
            jastipData = [
                {
                    id: 'JST-2610-001',
                    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                    customer_name: 'Kak Sarah - BSD',
                    customer_phone: '6281234567890',
                    customer_address: 'Cluster Foresta No. 8, BSD City, Tangerang',
                    delivery_courier: 'JNE YES',
                    tracking_number: 'JNE-YES-882910',
                    item_name: 'Tokyo Banana Original (Box 8 pcs)',
                    item_variant: 'Edisi Tokyo Station',
                    item_qty: 2,
                    currency: 'JPY',
                    price_valas: 1180,
                    real_rate: 105,
                    catalog_rate: 116,
                    tax_percent: 10,
                    tax_refund_percent: 10,
                    operational_cost_per_item: 15000,
                    logistics_cost_per_item: 25000,
                    customs_cost_per_item: 0,
                    fee_type: 'flat',
                    fee_amount: 35000,
                    landed_cost_per_item: 163900,
                    selling_price_per_item: 211880,
                    total_selling_price: 423760,
                    total_net_profit: 95960,
                    dp_amount: 250000,
                    dp_status: 'dp_paid',
                    remaining_payment: 173760,
                    status: 'transit',
                    shipping_channel: 'hand_carry',
                    is_purchased: true,
                    purchase_receipt_note: 'Nota Donki #98211 (Sudah Tax Refund bandara)',
                    expiry_date_note: 'Min. Exp Feb 2027',
                    notes: 'Minta paper bag original Tokyo Banana',
                    is_booked_to_finance: false
                },
                {
                    id: 'JST-2610-002',
                    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
                    customer_name: 'Budi Santoso',
                    customer_phone: '6281987654321',
                    customer_address: 'Apartemen Menteng Park Tower B-1205, Jakarta Pusat',
                    delivery_courier: 'Gojek Instant',
                    tracking_number: '',
                    item_name: 'Irvins Salted Egg Fish Skin 230g',
                    item_variant: 'Big Pouch Spicy',
                    item_qty: 3,
                    currency: 'SGD',
                    price_valas: 18.5,
                    real_rate: 11900,
                    catalog_rate: 12500,
                    tax_percent: 9,
                    tax_refund_percent: 8,
                    operational_cost_per_item: 20000,
                    logistics_cost_per_item: 30000,
                    customs_cost_per_item: 0,
                    fee_type: 'flat',
                    fee_amount: 45000,
                    landed_cost_per_item: 272460,
                    selling_price_per_item: 326250,
                    total_selling_price: 978750,
                    total_net_profit: 161370,
                    dp_amount: 500000,
                    dp_status: 'dp_paid',
                    remaining_payment: 478750,
                    status: 'purchasing',
                    shipping_channel: 'hand_carry',
                    is_purchased: true,
                    purchase_receipt_note: 'Struk Jewel Changi Airport',
                    expiry_date_note: 'Exp Date Aman 6 Bulan',
                    notes: 'Kemasan jangan sampai tertimpa',
                    is_booked_to_finance: false
                }
            ];
            saveJastipToLocal();
        }
    } catch (err) {
        console.warn('Gagal membaca cache Jastip:', err);
    }
}

function saveJastipToLocal() {
    try {
        localStorage.setItem(JASTIP_STORAGE_KEY, JSON.stringify(jastipData));
        if (typeof saveCacheToLocal === 'function') saveCacheToLocal();
    } catch (e) {
        console.warn('Gagal menyimpan cache Jastip:', e);
    }
}

// 1b. Sinkronisasi Cloud Supabase (Otomatis & Offline-Tolerant)
async function fetchJastipFromCloud() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient || !navigator.onLine) return;
    try {
        const { data, error } = await supabaseClient
            .from('jastip_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
            // Gabungkan data cloud dengan cache lokal
            jastipData = data;
            saveJastipToLocal();
            renderJastip();
        }
    } catch (err) {
        console.warn('Catatan Cloud Jastip (fallback lokal):', err);
    }
}

function dispatchJastipMutation(type, payload) {
    if (typeof dispatchMutation === 'function') {
        dispatchMutation({ type, payload }, async () => {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                if (type === 'UPSERT_JASTIP') {
                    await supabaseClient.from('jastip_orders').upsert([payload]);
                } else if (type === 'DELETE_JASTIP') {
                    await supabaseClient.from('jastip_orders').delete().eq('id', payload.id);
                }
            }
        });
    }
}

// 2. Kalkulasi Landed Cost & Rumus Struktur Harga Jastip
function computeJastipLandedCost(params) {
    const qty = parseInt(params.qty) || 1;
    const priceValas = parseFloat(params.priceValas) || 0;
    const realRate = parseFloat(params.realRate) || 1;
    const catalogRate = parseFloat(params.catalogRate) || realRate;
    const taxPercent = parseFloat(params.taxPercent) || 0;
    const taxRefundPercent = parseFloat(params.taxRefundPercent) || 0;
    const opsPerItem = parseFloat(params.opsPerItem) || 0;
    const logisticsPerItem = parseFloat(params.logisticsPerItem) || 0;
    const customsPerItem = parseFloat(params.customsPerItem) || 0;
    const feeType = params.feeType || 'flat';
    const feeAmount = parseFloat(params.feeAmount) || 0;

    // A. Modal Riil Valas (Setelah Tax & Tax Refund Toko)
    const baseValasWithTax = priceValas * (1 + (taxPercent / 100));
    const taxRefundValas = priceValas * (taxRefundPercent / 100);
    const netValasPaid = Math.max(0, baseValasWithTax - taxRefundValas);

    // B. Konversi ke IDR via Kurs Riil Kartu Kredit / Kas
    const costGoodsIdr = netValasPaid * realRate;

    // C. Landed Cost Bersih per Item
    const landedCostPerItem = Math.round(costGoodsIdr + opsPerItem + logisticsPerItem + customsPerItem);

    // D. Penetapan Harga Jual Berdasarkan Kurs Buffer & Margin
    let sellingPricePerItem = 0;
    const catalogBaseIdr = priceValas * (1 + (taxPercent / 100)) * catalogRate;
    const baseSellingBeforeFee = catalogBaseIdr + opsPerItem + logisticsPerItem + customsPerItem;

    if (feeType === 'percent') {
        sellingPricePerItem = Math.round(baseSellingBeforeFee * (1 + (feeAmount / 100)));
    } else {
        sellingPricePerItem = Math.round(baseSellingBeforeFee + feeAmount);
    }

    const totalSellingPrice = sellingPricePerItem * qty;
    const totalLandedCost = landedCostPerItem * qty;
    const totalNetProfit = totalSellingPrice - totalLandedCost;

    return {
        landedCostPerItem,
        sellingPricePerItem,
        totalSellingPrice,
        totalLandedCost,
        totalNetProfit,
        profitPerItem: Math.round(totalNetProfit / qty)
    };
}

// 3. Render Dashboard & Tabel Manajemen Jastip
function renderJastip() {
    initJastipData();

    // 1. Hitung Statistik Ringkasan
    let totalOrders = jastipData.length;
    let totalDpCollected = 0;
    let totalTurnoverEst = 0;
    let totalEstProfit = 0;

    jastipData.forEach(item => {
        if (item.status !== 'out_of_stock' && item.status !== 'refunded') {
            totalDpCollected += (Number(item.dp_amount) || 0);
            totalTurnoverEst += (Number(item.total_selling_price) || 0);
            totalEstProfit += (Number(item.total_net_profit) || 0);
        }
    });

    const statOrdersEl = document.getElementById('jastip-stat-orders');
    const statDpEl = document.getElementById('jastip-stat-dp');
    const statTurnoverEl = document.getElementById('jastip-stat-turnover');
    const statProfitEl = document.getElementById('jastip-stat-profit');

    if (statOrdersEl) statOrdersEl.innerText = `${totalOrders} Pesanan`;
    if (statDpEl) statDpEl.innerText = `Rp ${totalDpCollected.toLocaleString()}`;
    if (statTurnoverEl) statTurnoverEl.innerText = `Rp ${totalTurnoverEst.toLocaleString()}`;
    if (statProfitEl) {
        const isSuperAdmin = currentRole === 'super_admin';
        statProfitEl.innerText = isSuperAdmin ? `Rp ${totalEstProfit.toLocaleString()}` : '*** (Rahasia)';
    }

    // 2. Filter & Render Baris Tabel
    const tbody = document.getElementById('jastip-table-body');
    if (!tbody) return;

    let filtered = jastipData.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (currentJastipFilter !== 'all') {
        filtered = filtered.filter(item => item.status === currentJastipFilter);
    }

    if (currentJastipSearch.trim()) {
        const q = currentJastipSearch.toLowerCase();
        filtered = filtered.filter(item => 
            (item.customer_name || '').toLowerCase().includes(q) ||
            (item.item_name || '').toLowerCase().includes(q) ||
            (item.id || '').toLowerCase().includes(q) ||
            (item.currency || '').toLowerCase().includes(q) ||
            (item.tracking_number || '').toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 opacity-60">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i class="fa-solid fa-plane-departure text-3xl opacity-30"></i>
                        <p class="font-medium text-xs">Belum ada pesanan Jastip pada kategori ini.</p>
                        <button onclick="openJastipOrderModal()" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Buat Order Baru</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const rateInfo = DEFAULT_EXCHANGE_RATES[item.currency] || DEFAULT_EXCHANGE_RATES.IDR;
        const flag = rateInfo.flag || '✈️';
        const isSuperAdmin = currentRole === 'super_admin';

        // Badge Status Alur Jastip
        let statusBadge = '';
        if (item.status === 'pre_order') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">Pre-Order (DP)</span>`;
        } else if (item.status === 'purchasing') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">Sedang Dibeli</span>`;
        } else if (item.status === 'transit') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">Transit / Pabean</span>`;
        } else if (item.status === 'ready_dispatch') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">Siap Kirim</span>`;
        } else if (item.status === 'completed') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">Selesai</span>`;
        } else if (item.status === 'out_of_stock') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">Stok Kosong</span>`;
        } else if (item.status === 'refunded') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-medium theme-input text-slate-600 dark:text-slate-400 border">DP Dikembalikan</span>`;
        }

        // Badge Status DP / Pelunasan
        let payBadge = '';
        if (item.status === 'refunded') {
            payBadge = `<span class="text-[10px] font-bold text-slate-500"><i class="fa-solid fa-undo mr-0.5"></i>Refund Selesai</span>`;
        } else if (item.dp_status === 'fully_paid') {
            payBadge = `<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-circle-check mr-0.5"></i>Lunas</span>`;
        } else {
            payBadge = `<span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">DP Rp ${(item.dp_amount || 0).toLocaleString()} (Sisa: Rp ${(item.remaining_payment || 0).toLocaleString()})</span>`;
        }

        // Indikator Terbuku ke Kas ERP
        const financeBadge = item.is_booked_to_finance 
            ? `<span class="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-1 cursor-pointer" onclick="unbookJastipFromFinance('${item.id}')" title="Sudah dicatat di Kas ERP (Klik untuk batalkan buku)"><i class="fa-solid fa-check mr-1"></i>Terbuku di Kas</span>`
            : `<button onclick="bookJastipToFinance('${item.id}')" class="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-400/40 mt-1 transition" title="Klik untuk bukukan ke Buku Transaksi & Kas ERP"><i class="fa-solid fa-plus mr-1"></i>Bukukan Kas</button>`;

        // Indikator Foto Struk
        const receiptPhotoBadge = item.purchase_receipt_image 
            ? `<button onclick="viewJastipReceiptImage('${item.id}')" class="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 mt-0.5" title="Lihat Foto Struk"><i class="fa-solid fa-image"></i> Foto Struk</button>`
            : '';

        // Indikator Resi
        const trackingDisplay = item.tracking_number 
            ? `<div class="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline" onclick="promptJastipTracking('${item.id}')" title="Klik untuk ubah resi"><i class="fa-solid fa-barcode mr-1"></i>${item.tracking_number}</div>`
            : `<div class="text-[9px] opacity-50 cursor-pointer hover:text-indigo-500" onclick="promptJastipTracking('${item.id}')">+ Input Resi</div>`;

        const profitDisplay = isSuperAdmin 
            ? `<span class="text-emerald-600 dark:text-emerald-400 font-bold">${item.status === 'out_of_stock' || item.status === 'refunded' ? 'Rp 0' : '+Rp ' + (item.total_net_profit || 0).toLocaleString()}</span>` 
            : `<span class="opacity-40 italic">-</span>`;

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition border-b border-inherit text-xs">
                <td class="py-3 px-3.5 font-mono text-[11px] font-bold text-slate-500">
                    <div>${item.id}</div>
                    <span class="text-[10px] opacity-60 font-sans">${new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                    <div>${financeBadge}</div>
                </td>
                <td class="py-3 px-3.5">
                    <div class="font-bold flex items-center gap-1.5">
                        <span>${item.customer_name}</span>
                        ${item.customer_phone ? `
                            <button onclick="openJastipWhatsApp('${item.id}')" class="text-emerald-600 hover:text-emerald-700 text-xs" title="Chat WhatsApp">
                                <i class="fa-brands fa-whatsapp"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="text-[11px] opacity-70 truncate max-w-[180px]">${item.customer_address || '-'}</div>
                    <div class="flex items-center gap-1 mt-0.5">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 border">${item.delivery_courier || 'Kurir Lokal'}</span>
                    </div>
                    ${trackingDisplay}
                </td>
                <td class="py-3 px-3.5">
                    <div class="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                        <span>${flag}</span>
                        <span>${item.item_name}</span>
                    </div>
                    <div class="text-[10px] opacity-70">${item.item_variant || '-'} (${item.item_qty} pcs)</div>
                    ${item.expiry_date_note ? `<span class="text-[9px] text-amber-600 dark:text-amber-400 font-mono block"><i class="fa-solid fa-hourglass-half mr-0.5"></i>${item.expiry_date_note}</span>` : ''}
                    ${receiptPhotoBadge}
                </td>
                <td class="py-3 px-3.5 font-mono">
                    <div class="text-[11px]">${rateInfo.symbol} ${(item.price_valas || 0).toLocaleString()}</div>
                    <div class="text-[10px] opacity-60">Kurs: ${item.catalog_rate || item.real_rate}</div>
                </td>
                <td class="py-3 px-3.5">
                    <div class="font-bold text-slate-900 dark:text-white">Rp ${(item.total_selling_price || 0).toLocaleString()}</div>
                    <div>${payBadge}</div>
                </td>
                <td class="py-3 px-3.5 font-mono text-[11px]">
                    ${profitDisplay}
                </td>
                <td class="py-3 px-3.5">
                    ${statusBadge}
                </td>
                <td class="py-3 px-3.5 text-right">
                    <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        ${item.status === 'out_of_stock' || item.status === 'refunded' ? `
                            <button onclick="shareJastipRefundWA('${item.id}')" class="p-1.5 rounded-lg border theme-input hover:border-amber-500 text-amber-600 transition" title="Kirim WA Refund DP Barang Kosong">
                                <i class="fa-solid fa-arrow-rotate-left text-xs"></i>
                            </button>
                        ` : `
                            <button onclick="shareJastipInvoiceWA('${item.id}')" class="p-1.5 rounded-lg border theme-input hover:border-emerald-500 text-emerald-600 transition" title="Kirim Tagihan DP / Pelunasan / Resi ke WhatsApp">
                                <i class="fa-brands fa-whatsapp text-sm"></i>
                            </button>
                        `}
                        <button onclick="openEditJastipModal('${item.id}')" class="p-1.5 rounded-lg border theme-input hover:border-indigo-500 text-indigo-600 transition" title="Edit Pesanan">
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button onclick="changeJastipStatus('${item.id}')" class="p-1.5 rounded-lg border theme-input hover:border-blue-500 text-blue-600 transition" title="Update Status Tahapan">
                            <i class="fa-solid fa-arrow-progress text-xs"></i>
                        </button>
                        <button onclick="confirmDeleteJastip('${item.id}')" class="p-1.5 rounded-lg border theme-input hover:border-rose-500 text-rose-600 transition" title="Hapus Pesanan">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. Filter & Pencarian Tab Jastip
function setJastipFilter(status) {
    currentJastipFilter = status;
    const buttons = ['all', 'pre_order', 'purchasing', 'transit', 'ready_dispatch', 'completed', 'out_of_stock', 'refunded'];
    buttons.forEach(btn => {
        const el = document.getElementById('jastip-filter-' + btn);
        if (el) {
            if (btn === status) {
                el.className = 'px-3 py-1.5 rounded-full transition text-xs font-bold bg-indigo-600 text-white shadow-sm';
            } else {
                el.className = 'px-3 py-1.5 rounded-full transition text-xs font-semibold opacity-70 hover:opacity-100 theme-input border';
            }
        }
    });
    renderJastip();
}

function onJastipSearch(e) {
    currentJastipSearch = (e.target.value || '').trim();
    renderJastip();
}

// 5. Kalkulator Landed Cost Pop-up Simulator
function openJastipCalculatorModal() {
    const modal = document.getElementById('modal-jastip-calculator');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    onJastipCalcCurrencyChange();
}

function closeJastipCalculatorModal() {
    const modal = document.getElementById('modal-jastip-calculator');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function onJastipCalcCurrencyChange() {
    const currSelect = document.getElementById('calc-currency');
    if (!currSelect) return;
    const curr = currSelect.value || 'JPY';
    const rate = DEFAULT_EXCHANGE_RATES[curr] || DEFAULT_EXCHANGE_RATES.IDR;

    const realRateEl = document.getElementById('calc-real-rate');
    const catalogRateEl = document.getElementById('calc-catalog-rate');
    const taxRefundEl = document.getElementById('calc-tax-refund');
    const taxShopEl = document.getElementById('calc-tax-shop');

    if (realRateEl) realRateEl.value = rate.real;
    if (catalogRateEl) catalogRateEl.value = rate.catalog;
    if (taxRefundEl) taxRefundEl.value = rate.taxRefund;
    if (taxShopEl) taxShopEl.value = curr === 'IDR' ? 11 : (curr === 'JPY' ? 10 : (curr === 'SGD' ? 9 : 7));

    calculateJastipSimulator();
}

function calculateJastipSimulator() {
    const params = {
        qty: parseInt(document.getElementById('calc-qty')?.value) || 1,
        priceValas: parseFloat(document.getElementById('calc-price-valas')?.value) || 0,
        realRate: parseFloat(document.getElementById('calc-real-rate')?.value) || 1,
        catalogRate: parseFloat(document.getElementById('calc-catalog-rate')?.value) || 1,
        taxPercent: parseFloat(document.getElementById('calc-tax-shop')?.value) || 0,
        taxRefundPercent: parseFloat(document.getElementById('calc-tax-refund')?.value) || 0,
        opsPerItem: parseFloat(document.getElementById('calc-ops-cost')?.value) || 0,
        logisticsPerItem: parseFloat(document.getElementById('calc-logistics-cost')?.value) || 0,
        customsPerItem: parseFloat(document.getElementById('calc-customs-cost')?.value) || 0,
        feeType: document.getElementById('calc-fee-type')?.value || 'flat',
        feeAmount: parseFloat(document.getElementById('calc-fee-amount')?.value) || 0
    };

    const res = computeJastipLandedCost(params);

    const outLandedEl = document.getElementById('calc-out-landed');
    const outPriceEl = document.getElementById('calc-out-price');
    const outProfitEl = document.getElementById('calc-out-profit');
    const outTotalProfitEl = document.getElementById('calc-out-total-profit');

    if (outLandedEl) outLandedEl.innerText = `Rp ${res.landedCostPerItem.toLocaleString()}`;
    if (outPriceEl) outPriceEl.innerText = `Rp ${res.sellingPricePerItem.toLocaleString()}`;
    if (outProfitEl) outProfitEl.innerText = `Rp ${res.profitPerItem.toLocaleString()}`;
    if (outTotalProfitEl) outTotalProfitEl.innerText = `Rp ${res.totalNetProfit.toLocaleString()}`;
}

// 6. Generator Format Broadcast Telegram & WhatsApp
function copyJastipBroadcastTemplate() {
    const curr = document.getElementById('calc-currency')?.value || 'JPY';
    const rateInfo = DEFAULT_EXCHANGE_RATES[curr] || DEFAULT_EXCHANGE_RATES.IDR;
    const priceValas = document.getElementById('calc-price-valas')?.value || '0';
    const sellPrice = document.getElementById('calc-out-price')?.innerText || 'Rp 0';

    const text = `*OPEN JASTIP ${rateInfo.name.toUpperCase()}*\n` +
                 `-----------------------------------------\n` +
                 `• Produk: [Nama Produk / Varian]\n` +
                 `• Harga Toko: ${rateInfo.symbol} ${priceValas}\n` +
                 `• Harga Jastip: ${sellPrice} / pcs (All-in)\n` +
                 `• Sistem: Pre-Order (DP min. 50%)\n` +
                 `• Estimasi Tiba: [Tanggal / Minggu Depan]\n` +
                 `• Ekspedisi: JNE / J&T / Instant\n` +
                 `-----------------------------------------\n` +
                 `Format Pemesanan:\n` +
                 `• Nama:\n` +
                 `• No. WhatsApp:\n` +
                 `• Alamat Lengkap:\n` +
                 `• Pesanan & Jumlah:\n\n` +
                 `Kirimkan format pemesanan via WhatsApp SnackLoop: https://wa.me/628123456789`;

    navigator.clipboard.writeText(text).then(() => {
        showNotification("Disalin!", "Format broadcast promosi berhasil disalin ke clipboard.", "success");
    }).catch(() => {
        showNotification("Info", text, "info");
    });
}

// 7. Modal Form Tambah / Edit Order Jastip
function openJastipOrderModal(orderId = null) {
    const modal = document.getElementById('modal-jastip-order');
    if (!modal) return;

    const titleEl = document.getElementById('jastip-modal-title');
    const form = document.getElementById('jastip-order-form');
    if (form) form.reset();
    currentReceiptPhotoBase64 = '';
    const previewContainer = document.getElementById('jastip-receipt-preview-container');
    if (previewContainer) previewContainer.classList.add('hidden');

    if (orderId) {
        const item = jastipData.find(x => x.id === orderId);
        if (!item) return;
        if (titleEl) titleEl.innerText = `Edit Pesanan Jastip (${item.id})`;

        document.getElementById('jastip-order-id').value = item.id;
        document.getElementById('jastip-cust-name').value = item.customer_name || '';
        document.getElementById('jastip-cust-phone').value = item.customer_phone || '';
        document.getElementById('jastip-cust-address').value = item.customer_address || '';
        document.getElementById('jastip-courier').value = item.delivery_courier || 'JNE REG';
        const trackingInput = document.getElementById('jastip-tracking-number');
        if (trackingInput) trackingInput.value = item.tracking_number || '';

        document.getElementById('jastip-item-name').value = item.item_name || '';
        document.getElementById('jastip-item-variant').value = item.item_variant || '';
        document.getElementById('jastip-item-qty').value = item.item_qty || 1;
        document.getElementById('jastip-currency').value = item.currency || 'JPY';
        document.getElementById('jastip-price-valas').value = item.price_valas || 0;
        document.getElementById('jastip-real-rate').value = item.real_rate || 1;
        document.getElementById('jastip-catalog-rate').value = item.catalog_rate || 1;
        document.getElementById('jastip-tax-percent').value = item.tax_percent || 0;
        document.getElementById('jastip-tax-refund').value = item.tax_refund_percent || 0;
        document.getElementById('jastip-ops-cost').value = item.operational_cost_per_item || 0;
        document.getElementById('jastip-logistics-cost').value = item.logistics_cost_per_item || 0;
        document.getElementById('jastip-customs-cost').value = item.customs_cost_per_item || 0;
        document.getElementById('jastip-fee-amount').value = item.fee_amount || 0;
        document.getElementById('jastip-dp-amount').value = item.dp_amount || 0;
        document.getElementById('jastip-status').value = item.status || 'pre_order';
        document.getElementById('jastip-notes').value = item.notes || '';
        document.getElementById('jastip-receipt-note').value = item.purchase_receipt_note || '';
        document.getElementById('jastip-exp-note').value = item.expiry_date_note || '';

        if (item.purchase_receipt_image) {
            currentReceiptPhotoBase64 = item.purchase_receipt_image;
            if (previewContainer) {
                previewContainer.classList.remove('hidden');
                document.getElementById('jastip-receipt-img').src = item.purchase_receipt_image;
            }
        }
    } else {
        if (titleEl) titleEl.innerText = 'Buat Pesanan Jastip Baru';
        document.getElementById('jastip-order-id').value = '';
        const now = new Date();
        const code = `JST-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(100 + Math.random()*900)}`;
        document.getElementById('jastip-generated-code').innerText = code;
        const trackingInput = document.getElementById('jastip-tracking-number');
        if (trackingInput) trackingInput.value = '';
        onJastipFormCurrencyChange();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeJastipOrderModal() {
    const modal = document.getElementById('modal-jastip-order');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function onJastipFormCurrencyChange() {
    const currSelect = document.getElementById('jastip-currency');
    if (!currSelect) return;
    const curr = currSelect.value || 'JPY';
    const rate = DEFAULT_EXCHANGE_RATES[curr] || DEFAULT_EXCHANGE_RATES.IDR;

    const realEl = document.getElementById('jastip-real-rate');
    const catEl = document.getElementById('jastip-catalog-rate');
    const refundEl = document.getElementById('jastip-tax-refund');
    const taxEl = document.getElementById('jastip-tax-percent');

    if (realEl) realEl.value = rate.real;
    if (catEl) catEl.value = rate.catalog;
    if (refundEl) refundEl.value = rate.taxRefund;
    if (taxEl) taxEl.value = curr === 'IDR' ? 11 : (curr === 'JPY' ? 10 : (curr === 'SGD' ? 9 : 7));
}

// 7b. Handler Kompresi & Upload Foto Struk Kamera
function handleJastipReceiptUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            // Kompresi via Canvas agar muat di localStorage & hemat bandwidth
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            currentReceiptPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

            const previewContainer = document.getElementById('jastip-receipt-preview-container');
            const previewImg = document.getElementById('jastip-receipt-img');
            if (previewContainer && previewImg) {
                previewImg.src = currentReceiptPhotoBase64;
                previewContainer.classList.remove('hidden');
            }
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

function removeJastipReceiptPhoto() {
    currentReceiptPhotoBase64 = '';
    const fileInput = document.getElementById('jastip-receipt-file');
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('jastip-receipt-preview-container');
    if (previewContainer) previewContainer.classList.add('hidden');
}

function saveJastipOrder(e) {
    e.preventDefault();
    const orderIdInput = document.getElementById('jastip-order-id').value;
    const now = new Date();
    const id = orderIdInput || `JST-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(100 + Math.random()*900)}`;

    const qty = parseInt(document.getElementById('jastip-item-qty').value) || 1;
    const priceValas = parseFloat(document.getElementById('jastip-price-valas').value) || 0;
    const realRate = parseFloat(document.getElementById('jastip-real-rate').value) || 1;
    const catalogRate = parseFloat(document.getElementById('jastip-catalog-rate').value) || realRate;
    const taxPercent = parseFloat(document.getElementById('jastip-tax-percent').value) || 0;
    const taxRefundPercent = parseFloat(document.getElementById('jastip-tax-refund').value) || 0;
    const opsPerItem = parseFloat(document.getElementById('jastip-ops-cost').value) || 0;
    const logisticsPerItem = parseFloat(document.getElementById('jastip-logistics-cost').value) || 0;
    const customsPerItem = parseFloat(document.getElementById('jastip-customs-cost').value) || 0;
    const feeAmount = parseFloat(document.getElementById('jastip-fee-amount').value) || 0;
    const dpAmount = parseFloat(document.getElementById('jastip-dp-amount').value) || 0;
    const statusVal = document.getElementById('jastip-status').value || 'pre_order';
    const trackingVal = (document.getElementById('jastip-tracking-number')?.value || '').trim();

    const computed = computeJastipLandedCost({
        qty, priceValas, realRate, catalogRate, taxPercent, taxRefundPercent,
        opsPerItem, logisticsPerItem, customsPerItem, feeType: 'flat', feeAmount
    });

    let dpStatus = 'unpaid';
    if (dpAmount >= computed.totalSellingPrice) {
        dpStatus = 'fully_paid';
    } else if (dpAmount > 0) {
        dpStatus = 'dp_paid';
    }

    const prevItem = orderIdInput ? jastipData.find(x => x.id === id) : null;

    const orderObj = {
        id,
        created_at: prevItem ? prevItem.created_at : new Date().toISOString(),
        customer_name: document.getElementById('jastip-cust-name').value.trim(),
        customer_phone: document.getElementById('jastip-cust-phone').value.trim(),
        customer_address: document.getElementById('jastip-cust-address').value.trim(),
        delivery_courier: document.getElementById('jastip-courier').value,
        tracking_number: trackingVal,
        item_name: document.getElementById('jastip-item-name').value.trim(),
        item_variant: document.getElementById('jastip-item-variant').value.trim(),
        item_qty: qty,
        currency: document.getElementById('jastip-currency').value,
        price_valas: priceValas,
        real_rate: realRate,
        catalog_rate: catalogRate,
        tax_percent: taxPercent,
        tax_refund_percent: taxRefundPercent,
        operational_cost_per_item: opsPerItem,
        logistics_cost_per_item: logisticsPerItem,
        customs_cost_per_item: customsPerItem,
        fee_type: 'flat',
        fee_amount: feeAmount,
        landed_cost_per_item: computed.landedCostPerItem,
        selling_price_per_item: computed.sellingPricePerItem,
        total_selling_price: computed.totalSellingPrice,
        total_net_profit: computed.totalNetProfit,
        profitPerItem: computed.profitPerItem,
        dp_amount: dpAmount,
        dp_status: dpStatus,
        remaining_payment: Math.max(0, computed.totalSellingPrice - dpAmount),
        status: statusVal,
        is_purchased: prevItem ? (prevItem.is_purchased || statusVal === 'purchasing' || statusVal === 'transit' || statusVal === 'ready_dispatch' || statusVal === 'completed') : false,
        purchase_receipt_note: document.getElementById('jastip-receipt-note').value.trim(),
        purchase_receipt_image: currentReceiptPhotoBase64 || (prevItem ? prevItem.purchase_receipt_image : ''),
        expiry_date_note: document.getElementById('jastip-exp-note').value.trim(),
        notes: document.getElementById('jastip-notes').value.trim(),
        is_booked_to_finance: prevItem ? (prevItem.is_booked_to_finance || false) : false
    };

    const existingIdx = jastipData.findIndex(x => x.id === id);
    if (existingIdx >= 0) {
        jastipData[existingIdx] = orderObj;
        showNotification("Diperbarui", `Pesanan ${id} berhasil diperbarui.`, "success");
    } else {
        jastipData.unshift(orderObj);
        showNotification("Tersimpan", `Pesanan Jastip ${id} berhasil dicatat.`, "success");
    }

    saveJastipToLocal();
    dispatchJastipMutation('UPSERT_JASTIP', orderObj);
    closeJastipOrderModal();
    renderJastip();

    // Auto-prompt buku kas jika selesai
    if (orderObj.status === 'completed' && !orderObj.is_booked_to_finance) {
        showConfirmModal("Bukukan ke Kas ERP?", `Pesanan ${id} berstatus Selesai. Apakah Anda ingin langsung membukukan laba Rp ${orderObj.total_net_profit.toLocaleString()} ke Laporan Bisnis & Kas ERP?`, () => {
            bookJastipToFinance(id);
        });
    }
}

function openEditJastipModal(id) {
    openJastipOrderModal(id);
}

function confirmDeleteJastip(id) {
    showConfirmModal("Hapus Pesanan Jastip", `Apakah Anda yakin ingin menghapus pesanan ${id}?`, () => {
        const item = jastipData.find(x => x.id === id);
        if (item && item.is_booked_to_finance) {
            unbookJastipFromFinance(id, true);
        }
        jastipData = jastipData.filter(x => x.id !== id);
        saveJastipToLocal();
        dispatchJastipMutation('DELETE_JASTIP', { id });
        renderJastip();
        showNotification("Dihapus", `Pesanan Jastip ${id} telah dihapus.`, "info");
    });
}

function changeJastipStatus(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;

    const stages = ['pre_order', 'purchasing', 'transit', 'ready_dispatch', 'completed', 'out_of_stock', 'refunded'];
    const currentIdx = stages.indexOf(item.status);
    const nextStatus = stages[(currentIdx + 1) % stages.length];

    item.status = nextStatus;
    if (nextStatus === 'purchasing' || nextStatus === 'transit' || nextStatus === 'ready_dispatch' || nextStatus === 'completed') {
        item.is_purchased = true;
    }

    saveJastipToLocal();
    dispatchJastipMutation('UPSERT_JASTIP', item);
    renderJastip();
    showNotification("Status Diperbarui", `${id} kini berstatus: ${nextStatus.toUpperCase()}`, "success");

    // Jika berubah jadi completed, tawarkan masuk kas
    if (nextStatus === 'completed' && !item.is_booked_to_finance) {
        showConfirmModal("Bukukan ke Kas ERP?", `Pesanan ${id} berstatus Selesai. Apakah ingin membukukan laba Rp ${item.total_net_profit.toLocaleString()} ke Laporan Keuangan?`, () => {
            bookJastipToFinance(id);
        });
    }
}

// 8. Integrasi Keuangan Utama ERP (Profit & Loss / Buku Kas)
function bookJastipToFinance(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;

    if (item.status === 'out_of_stock' || item.status === 'refunded') {
        return showNotification("Peringatan", "Pesanan yang dibatalkan / di-refund tidak dapat dibukukan ke kas.", "warning");
    }

    if (item.is_booked_to_finance) {
        return showNotification("Info", "Pesanan ini sudah pernah dibukukan ke Kas ERP.", "info");
    }

    const now = new Date();
    const monthKey = typeof getCurrentMonthKey === 'function' ? getCurrentMonthKey(now) : `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}`;

    if (typeof transactionData !== 'undefined') {
        if (!transactionData[monthKey]) transactionData[monthKey] = [];

        const trxId = 'trx_jst_' + item.id;
        // Hindari duplikasi jika trxId sudah ada
        const existingIdx = transactionData[monthKey].findIndex(t => t.id === trxId);
        const trxEntry = {
            id: trxId,
            monthKey: monthKey,
            date: now.toISOString().slice(0, 10),
            customer: `${item.customer_name} (Jastip)`,
            item: `${item.item_name} [${item.id}]`,
            source: 'Jastip',
            qty: item.item_qty,
            batch: '',
            buy: item.landed_cost_per_item,
            extraCost: 0,
            extraCostNote: '',
            totalModal: item.total_selling_price - item.total_net_profit,
            sell: item.selling_price_per_item,
            totalSell: item.total_selling_price,
            status: 'Lunas',
            profitPerItem: Math.round(item.total_net_profit / item.item_qty),
            notes: `Jastip ${item.currency} - ${item.item_variant || '-'} (Kurs: ${item.catalog_rate})`
        };

        if (existingIdx >= 0) {
            transactionData[monthKey][existingIdx] = trxEntry;
        } else {
            transactionData[monthKey].push(trxEntry);
        }

        item.is_booked_to_finance = true;
        saveJastipToLocal();
        if (typeof saveCacheToLocal === 'function') saveCacheToLocal();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderFinancialChart === 'function') renderFinancialChart();
        if (typeof renderMonthTabs === 'function') renderMonthTabs();
        if (typeof renderTransactionsForActiveSheet === 'function') renderTransactionsForActiveSheet();
        renderJastip();

        showNotification("Berhasil Masuk Kas", `Omzet Rp ${item.total_selling_price.toLocaleString()} dan Laba Bersih Rp ${item.total_net_profit.toLocaleString()} telah dicatat di Buku Transaksi & Laporan Keuangan ERP!`, "success");
    }
}

function unbookJastipFromFinance(id, silent = false) {
    const item = jastipData.find(x => x.id === id);
    if (!item || !item.is_booked_to_finance) return;

    const trxId = 'trx_jst_' + item.id;
    if (typeof transactionData !== 'undefined') {
        Object.keys(transactionData).forEach(mKey => {
            transactionData[mKey] = transactionData[mKey].filter(t => t.id !== trxId);
        });

        item.is_booked_to_finance = false;
        saveJastipToLocal();
        if (typeof saveCacheToLocal === 'function') saveCacheToLocal();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderFinancialChart === 'function') renderFinancialChart();
        if (typeof renderMonthTabs === 'function') renderMonthTabs();
        if (typeof renderTransactionsForActiveSheet === 'function') renderTransactionsForActiveSheet();
        renderJastip();

        if (!silent) {
            showNotification("Dibatalkan", "Pencatatan transaksi Jastip pada Buku Kas ERP telah ditarik kembali.", "info");
        }
    }
}

// 9. Integrasi WhatsApp (Invoice DP, Pelunasan, No Resi & Konfirmasi Refund DP)
function shareJastipInvoiceWA(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;

    const phone = (item.customer_phone || '').replace(/[^0-9]/g, '');
    if (!phone) {
        return showNotification("Peringatan", "Nomor WhatsApp pelanggan belum diisi.", "warning");
    }

    const appSettings = typeof loadAppSettings === 'function' ? loadAppSettings() : {};
    const bankAccount = appSettings.bankAccount || 'BCA 12345678 a/n SnackLoop';
    const bizName = appSettings.businessName || 'SnackLoop Personal Shopper';

    const isLunas = item.dp_status === 'fully_paid' || item.remaining_payment <= 0;
    let message = '';

    if (item.tracking_number) {
        message = `Halo Kak *${item.customer_name}*, paket pesanan Jastip Anda telah dikirim.\n\n` +
                  `• Barang: ${item.item_name} (${item.item_qty} pcs)\n` +
                  `• Kurir: ${item.delivery_courier || 'JNE/J&T'}\n` +
                  `• No. Resi: *${item.tracking_number}*\n` +
                  `• Alamat: ${item.customer_address || '-'}\n\n` +
                  `Anda dapat memantau status pengiriman melalui website resmi kurir terkait. Terima kasih telah berbelanja di *${bizName}*.`;
    } else if (isLunas) {
        message = `Halo Kak *${item.customer_name}*, pembayaran pesanan Jastip Anda telah lunas.\n\n` +
                  `• Rincian: ${item.item_name} (${item.item_qty} pcs)\n` +
                  `• Total: Rp ${(item.total_selling_price || 0).toLocaleString()}\n` +
                  `• Kurir: ${item.delivery_courier || 'JNE/J&T'}\n` +
                  `• Alamat: ${item.customer_address || '-'}\n` +
                  `• Status: ${item.status.toUpperCase()}\n\n` +
                  `Pesanan sedang dipersiapkan untuk pengiriman. Terima kasih atas kepercayaan Anda pada *${bizName}*.`;
    } else {
        message = `Halo Kak *${item.customer_name}*, terima kasih telah memesan di *${bizName}*.\n\n` +
                  `• No. Pesanan Jastip: ${item.id}\n` +
                  `• Barang: ${item.item_name} (${item.item_variant || '-'}) x ${item.item_qty} pcs\n` +
                  `• Total Tagihan: Rp ${(item.total_selling_price || 0).toLocaleString()}\n` +
                  `• DP Diterima: Rp ${(item.dp_amount || 0).toLocaleString()}\n` +
                  `• Sisa Pelunasan: *Rp ${(item.remaining_payment || 0).toLocaleString()}*\n\n` +
                  `Rekening Pembayaran:\n${bankAccount}\n\n` +
                  `Mohon kirimkan bukti transfer pelunasan agar pesanan dapat segera diproses untuk pengiriman. Terima kasih.`;
    }

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
}

function shareJastipRefundWA(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;

    const phone = (item.customer_phone || '').replace(/[^0-9]/g, '');
    if (!phone) return showNotification("Peringatan", "Nomor WhatsApp belum diisi.", "warning");

    const appSettings = typeof loadAppSettings === 'function' ? loadAppSettings() : {};
    const bizName = appSettings.businessName || 'SnackLoop Personal Shopper';

    const message = `Halo Kak *${item.customer_name}*, kami menginformasikan perihal pesanan Jastip *${item.item_name}* (${item.item_variant || '-'}), stok di toko sedang habis.\n\n` +
                    `Sesuai jaminan layanan *${bizName}*, dana DP sebesar *Rp ${(item.dp_amount || 0).toLocaleString()}* akan kami kembalikan 100% tanpa potongan.\n\n` +
                    `Mohon informasikan nomor rekening atau e-wallet (Nama Bank & Nama Pemilik) agar pengembalian dana DP dapat kami proses hari ini. Terima kasih atas pengertiannya.`;

    item.status = 'refunded';
    saveJastipToLocal();
    renderJastip();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

function openJastipWhatsApp(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;
    const phone = (item.customer_phone || '').replace(/[^0-9]/g, '');
    if (!phone) return showNotification("Peringatan", "Nomor WhatsApp belum diisi.", "warning");
    window.open(`https://wa.me/${phone}`, '_blank');
}

function promptJastipTracking(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;

    const newResi = prompt(`Masukkan Nomor Resi Kurir (${item.delivery_courier}):`, item.tracking_number || '');
    if (newResi !== null) {
        item.tracking_number = newResi.trim();
        if (item.tracking_number && item.status !== 'completed') {
            item.status = 'ready_dispatch';
        }
        saveJastipToLocal();
        dispatchJastipMutation('UPSERT_JASTIP', item);
        renderJastip();
        showNotification("Resi Disimpan", `Nomor resi untuk ${id} berhasil diperbarui.`, "success");
    }
}

// ======================= UI/UX: UMPAN BALIK TAKTIL & HAPTIK LAPANGAN ======================= //
function playTactileFeedback(isSuccess = true) {
    // 1. Mobile Native Haptic Vibration (iOS Safari / Android Chrome PWA)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(isSuccess ? [35, 45, 35] : 20);
        } catch (e) {}
    }
    // 2. Subtle Micro Audio Click via Web Audio API (100% offline, zero lag, synth gentle blip)
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(isSuccess ? 880 : 440, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        }
    } catch (e) {}
}

function toggleJastipMoreMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('jastip-more-dropdown');
    if (!menu) return;
    menu.classList.toggle('hidden');
}

// Global click-outside listener untuk dropdown Kelola Data
if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('jastip-more-dropdown');
        const btn = document.getElementById('btn-jastip-more');
        if (menu && !menu.classList.contains('hidden')) {
            if (btn && !btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        }
    });
}

// 10. Mode Belanja Cepat di Lapangan (In-Store Shopping Checklist)
let currentChecklistSearch = '';

function openJastipChecklistModal() {
    const modal = document.getElementById('modal-jastip-checklist');
    if (!modal) return;

    currentChecklistSearch = '';
    const searchInput = document.getElementById('jastip-checklist-search');
    if (searchInput) searchInput.value = '';

    renderJastipChecklist();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeJastipChecklistModal() {
    const modal = document.getElementById('modal-jastip-checklist');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function onJastipChecklistSearch(e) {
    currentChecklistSearch = (e.target.value || '').trim().toLowerCase();
    renderJastipChecklist();
}

function renderJastipChecklist() {
    const container = document.getElementById('jastip-checklist-container');
    if (!container) return;

    // Filter barang yang perlu dibeli di toko (status pre_order atau purchasing)
    let shoppingList = jastipData.filter(x => x.status === 'pre_order' || x.status === 'purchasing');
    const totalItems = shoppingList.length;
    const boughtCount = shoppingList.filter(x => x.is_purchased).length;

    const progressEl = document.getElementById('jastip-checklist-progress-text');
    const progressBar = document.getElementById('jastip-checklist-progress-bar');
    if (progressEl) progressEl.innerText = `${boughtCount} dari ${totalItems} barang sudah masuk keranjang`;
    if (progressBar) {
        const pct = totalItems > 0 ? Math.round((boughtCount / totalItems) * 100) : 0;
        progressBar.style.width = `${pct}%`;
    }

    if (currentChecklistSearch) {
        shoppingList = shoppingList.filter(it => 
            (it.item_name || '').toLowerCase().includes(currentChecklistSearch) ||
            (it.item_variant || '').toLowerCase().includes(currentChecklistSearch) ||
            (it.id || '').toLowerCase().includes(currentChecklistSearch)
        );
    }

    if (shoppingList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 opacity-60 space-y-2">
                <i class="fa-solid fa-basket-shopping text-3xl opacity-30"></i>
                <p class="text-xs font-semibold">${currentChecklistSearch ? 'Tidak ada barang yang cocok dengan pencarian.' : 'Semua barang belanjaan sudah selesai atau belum ada pesanan belanja aktif.'}</p>
            </div>
        `;
        return;
    }

    // Kelompokkan berdasarkan mata uang / negara asal
    const grouped = {};
    shoppingList.forEach(item => {
        const curr = item.currency || 'IDR';
        if (!grouped[curr]) grouped[curr] = [];
        grouped[curr].push(item);
    });

    container.innerHTML = Object.keys(grouped).map(curr => {
        const rateInfo = DEFAULT_EXCHANGE_RATES[curr] || DEFAULT_EXCHANGE_RATES.IDR;
        const items = grouped[curr];

        return `
            <div class="space-y-2.5">
                <div class="flex items-center gap-2 border-b border-inherit pb-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span class="text-base">${rateInfo.flag}</span>
                    <span>${rateInfo.name}</span>
                    <span class="text-[10px] opacity-60 font-mono">(${items.length} item)</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${items.map(it => `
                        <div class="p-3 rounded-xl border ${it.is_purchased ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' : 'theme-card border-inherit'} flex items-start justify-between gap-3 transition-colors">
                            <div class="space-y-1">
                                <div class="font-bold text-xs flex items-center gap-1.5 ${it.is_purchased ? 'line-through opacity-70 text-emerald-700 dark:text-emerald-400' : ''}">
                                    ${it.is_purchased ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>' : ''}
                                    <span>${it.item_name}</span>
                                </div>
                                <div class="text-[11px] opacity-70">
                                    Varian: <strong>${it.item_variant || '-'}</strong> | Jml: <strong class="text-indigo-600 dark:text-indigo-400">${it.item_qty} pcs</strong>
                                </div>
                                <div class="text-[10px] tabular-nums font-semibold">
                                    Target: ${rateInfo.symbol} ${(it.price_valas || 0).toLocaleString()} / pcs
                                </div>
                                ${it.expiry_date_note ? `<div class="text-[9px] text-amber-600 dark:text-amber-400"><i class="fa-solid fa-shield-halved mr-1"></i>${it.expiry_date_note}</div>` : ''}
                                ${it.notes ? `<div class="text-[9px] italic opacity-60">"${it.notes}"</div>` : ''}
                            </div>
                            <button onclick="toggleChecklistPurchased('${it.id}')" class="shrink-0 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${it.is_purchased ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'theme-input border hover:border-indigo-400 text-indigo-600'}">
                                ${it.is_purchased ? '<i class="fa-solid fa-check"></i> <span>Terbeli</span>' : '<i class="fa-solid fa-plus"></i> <span>Ambil</span>'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleChecklistPurchased(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item) return;

    item.is_purchased = !item.is_purchased;
    if (item.is_purchased) {
        item.status = 'purchasing';
    } else {
        item.status = 'pre_order';
    }

    // Trigger physical haptic & audio feedback
    playTactileFeedback(item.is_purchased);

    saveJastipToLocal();
    dispatchJastipMutation('UPSERT_JASTIP', item);
    renderJastipChecklist();
    renderJastip();
}

// 11. Dokumen Pabean & Packing List Bandara (Customs Compliance USD 500)
function openJastipCustomsModal() {
    const modal = document.getElementById('modal-jastip-customs');
    if (!modal) return;

    renderJastipCustomsSummary();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeJastipCustomsModal() {
    const modal = document.getElementById('modal-jastip-customs');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderJastipCustomsSummary() {
    // Barang bawaan penumpang (hand carry / koper) yang sedang transit atau dibeli
    const lugList = jastipData.filter(x => (x.status === 'transit' || x.status === 'purchasing' || x.status === 'ready_dispatch') && x.currency !== 'IDR');

    let totalUsdVal = 0;
    lugList.forEach(item => {
        const rateInfo = DEFAULT_EXCHANGE_RATES[item.currency] || DEFAULT_EXCHANGE_RATES.IDR;
        const valasTotal = (item.price_valas || 0) * (item.item_qty || 1);
        const usdVal = valasTotal * (rateInfo.toUsd || 0.000062);
        totalUsdVal += usdVal;
    });

    const totalUsdEl = document.getElementById('customs-total-usd');
    const badgeEl = document.getElementById('customs-status-badge');
    const tbody = document.getElementById('customs-table-body');

    if (totalUsdEl) totalUsdEl.innerText = `$${Math.round(totalUsdVal).toLocaleString('en-US')}`;

    const limitUsd = 500;
    if (badgeEl) {
        if (totalUsdVal <= limitUsd) {
            badgeEl.className = "p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 space-y-1";
            badgeEl.innerHTML = `
                <div class="font-bold text-xs flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>JALUR HIJAU (BEBAS BEA MASUK)</span>
                </div>
                <p class="text-[11px] opacity-80">Total belanja koper bawaan Anda masih di bawah fasilitas bebas pajak penumpang USD 500. Aman untuk deklarasi E-CD bandara.</p>
            `;
        } else {
            const excess = Math.round(totalUsdVal - limitUsd);
            const estPajak = Math.round(excess * 16200 * 0.22); // Estimasi BM 10% + PPN 11% + PPh
            badgeEl.className = "p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 space-y-1";
            badgeEl.innerHTML = `
                <div class="font-bold text-xs flex items-center gap-1.5">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>JALUR MERAH (LEBIH USD ${excess})</span>
                </div>
                <p class="text-[11px] opacity-80">Total belanja melebihi batas USD 500 sebesar <strong>$${excess}</strong> (~Rp ${(excess * 16200).toLocaleString()}). Siapkan dana estimasi bea cukai bandara sekitar <strong>Rp ${estPajak.toLocaleString()}</strong>.</p>
            `;
        }
    }

    if (tbody) {
        if (lugList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 opacity-60">Tidak ada barang bawaan valas di koper saat ini.</td></tr>`;
            return;
        }

        tbody.innerHTML = lugList.map((item, idx) => {
            const rateInfo = DEFAULT_EXCHANGE_RATES[item.currency] || DEFAULT_EXCHANGE_RATES.IDR;
            const valasTotal = (item.price_valas || 0) * (item.item_qty || 1);
            const usdVal = Math.round(valasTotal * (rateInfo.toUsd || 0.000062));

            return `
                <tr class="border-b border-inherit text-xs">
                    <td class="p-2 font-mono text-[10px]">${idx + 1}</td>
                    <td class="p-2 font-semibold">${item.item_name} <span class="opacity-60 text-[10px]">(${item.item_variant || '-'})</span></td>
                    <td class="p-2 text-center font-mono">${item.item_qty} pcs</td>
                    <td class="p-2 font-mono">${rateInfo.symbol} ${(item.price_valas || 0).toLocaleString()}</td>
                    <td class="p-2 font-mono font-bold">${rateInfo.symbol} ${valasTotal.toLocaleString()}</td>
                    <td class="p-2 font-mono font-bold text-right text-indigo-600 dark:text-indigo-400">$${usdVal}</td>
                </tr>
            `;
        }).join('');
    }
}

function generateJastipCustomsPDF() {
    const printArea = document.getElementById('customs-manifest-print-area');
    if (!printArea) return;

    if (typeof html2pdf !== 'undefined') {
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Packing_List_Customs_ECD_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        showNotification("Memproses PDF", "Sedang mengunduh berkas Packing List Bea Cukai...", "info");
        html2pdf().from(printArea).set(opt).save().then(() => {
            showNotification("Sukses", "Berkas Packing List Pabean siap dicetak!", "success");
        }).catch(() => {
            window.print();
        });
    } else {
        window.print();
    }
}

// 12. Modal Pratinjau Foto Struk
function viewJastipReceiptImage(id) {
    const item = jastipData.find(x => x.id === id);
    if (!item || !item.purchase_receipt_image) {
        return showNotification("Info", "Pesanan ini belum memiliki lampiran foto struk.", "info");
    }

    const modal = document.getElementById('modal-jastip-photo-preview');
    const imgEl = document.getElementById('jastip-photo-preview-img');
    const labelEl = document.getElementById('jastip-photo-preview-label');

    if (modal && imgEl) {
        imgEl.src = item.purchase_receipt_image;
        if (labelEl) labelEl.innerText = `${item.id} - ${item.item_name} (${item.purchase_receipt_note || 'Struk Kasir'})`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeJastipPhotoModal() {
    const modal = document.getElementById('modal-jastip-photo-preview');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// 13. Ekspor & Impor Data Jastip (Excel & JSON)
function exportJastipExcel() {
    if (typeof XLSX === 'undefined') {
        return showNotification("Gagal", "Pustaka SheetJS Excel belum siap.", "error");
    }

    const rows = jastipData.map(item => ({
        "ID Pesanan": item.id,
        "Tanggal": new Date(item.created_at).toLocaleDateString('id-ID'),
        "Nama Pemesan": item.customer_name,
        "No. WhatsApp": item.customer_phone,
        "Alamat": item.customer_address,
        "Kurir": item.delivery_courier,
        "No. Resi": item.tracking_number || '-',
        "Nama Barang": item.item_name,
        "Varian": item.item_variant || '-',
        "Jumlah (Pcs)": item.item_qty,
        "Mata Uang": item.currency,
        "Harga Beli Asli Toko": item.price_valas,
        "Kurs Riil": item.real_rate,
        "Kurs Jual Katalog": item.catalog_rate,
        "Landed Cost / pcs (Rp)": item.landed_cost_per_item,
        "Harga Jual / pcs (Rp)": item.selling_price_per_item,
        "Total Penjualan (Rp)": item.total_selling_price,
        "Laba Bersih (Rp)": item.total_net_profit,
        "DP Diterima (Rp)": item.dp_amount,
        "Sisa Tagihan (Rp)": item.remaining_payment,
        "Status Alur": item.status,
        "Terbuku di Kas ERP": item.is_booked_to_finance ? 'YA' : 'BELUM',
        "Catatan Struk": item.purchase_receipt_note || '-',
        "Batas Expired": item.expiry_date_note || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jastip SnackLoop");
    XLSX.writeFile(wb, `Rekap_Jastip_SnackLoop_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification("Sukses", "Berkas Excel rekap Jastip berhasil diunduh!", "success");
}

function exportJastipJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jastipData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `snackloop_jastip_backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showNotification("Dicadangkan", "File backup JSON Jastip berhasil disimpan.", "success");
}

function importJastipJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (Array.isArray(parsed)) {
                jastipData = parsed;
                saveJastipToLocal();
                renderJastip();
                showNotification("Berhasil Dipulihkan", `${parsed.length} pesanan Jastip berhasil diimpor!`, "success");
            } else {
                showNotification("Format Salah", "File JSON tidak berisi daftar pesanan valid.", "error");
            }
        } catch (err) {
            showNotification("Gagal", "File JSON rusak atau tidak dapat dibaca.", "error");
        }
    };
    reader.readAsText(file);
}
