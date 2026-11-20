// ======================= 6. MASTER & CUSTOMER (DENGAN PRICE HISTORY & MARKUP) ======================= //
function updateLiveMarkup(buyId, sellId, previewId, textId) {
    const buy = getCleanNumber(buyId);
    const sell = getCleanNumber(sellId);
    const previewEl = document.getElementById(previewId);
    const textEl = document.getElementById(textId);
    if (!previewEl || !textEl) return;

    if (buy > 0 && sell > 0) {
        const diff = sell - buy;
        const pct = ((diff / buy) * 100).toFixed(1);
        previewEl.classList.remove('hidden');
        if (diff >= 0) {
            textEl.className = "font-bold text-emerald-600 dark:text-emerald-400 font-mono";
            textEl.innerHTML = `+Rp ${diff.toLocaleString('id-ID')} <span class="badge-soft-good text-[10px] ml-1.5 font-mono">+${pct}%</span>`;
        } else {
            textEl.className = "font-bold text-rose-600 dark:text-rose-400 font-mono";
            textEl.innerHTML = `-Rp ${Math.abs(diff).toLocaleString('id-ID')} <span class="badge-soft-bad text-[10px] ml-1.5 font-mono">${pct}%</span>`;
        }
    } else {
        previewEl.classList.add('hidden');
    }
}

// Live listener untuk perhitungan markup otomatis saat mengetik harga
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        ['m-buy', 'm-sell'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                updateLiveMarkup('m-buy', 'm-sell', 'm-markup-preview', 'm-markup-text');
            });
        });

        ['edit-m-buy', 'edit-m-sell'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                updateLiveMarkup('edit-m-buy', 'edit-m-sell', 'edit-m-markup-preview', 'edit-m-markup-text');
            });
        });
    });
}

async function renderMaster() {
    if (currentRole === 'super_admin' && typeof selfHealMasterDataPrices === 'function') {
        selfHealMasterDataPrices();
    }
    const tbody = document.getElementById('master-table-body');
    if(!tbody) return;
    const canEdit = currentRole === 'super_admin';
    const rows = masterData.map((m) => {
        const actionBtns = canEdit ? `
            <button onclick="openEditMasterModal(${m.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold mr-1"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
            <button onclick="confirmDeleteMaster(${m.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>
        ` : `
            <button onclick="openHistoryModal(${m.id})" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat</button>
        `;

        let buyPrice = Number(m.buy) || 0;
        if (buyPrice <= 0 && typeof getCanonicalMasterPrice === 'function') {
            const c = getCanonicalMasterPrice(m.name);
            if (c && c.buy > 0) {
                buyPrice = c.buy;
                m.buy = c.buy;
                if (!m.sell || Number(m.sell) <= 0) m.sell = c.sell;
            }
        }
        const sellPrice = Number(m.sell) || 0;
        const buyPriceDisplay = canEdit ? `Rp ${buyPrice.toLocaleString('id-ID')}` : `<span class="opacity-40 italic">-</span>`;

        let markupDisplay = `<span class="opacity-40 italic">-</span>`;
        if (canEdit) {
            const diffProfit = sellPrice - buyPrice;
            const markupPct = buyPrice > 0 ? ((diffProfit / buyPrice) * 100) : 0;
            if (diffProfit > 0) {
                markupDisplay = `
                    <div class="leading-tight">
                        <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono block text-xs">+Rp ${diffProfit.toLocaleString('id-ID')}</span>
                        <span class="badge-soft-good text-[10px] inline-block font-mono mt-0.5">+${markupPct.toFixed(1)}%</span>
                    </div>
                `;
            } else if (diffProfit === 0) {
                markupDisplay = `<span class="text-slate-500 font-mono font-medium text-xs">Rp 0 (0%)</span>`;
            } else {
                markupDisplay = `
                    <div class="leading-tight">
                        <span class="font-bold text-rose-600 dark:text-rose-400 font-mono block text-xs">-Rp ${Math.abs(diffProfit).toLocaleString('id-ID')}</span>
                        <span class="badge-soft-bad text-[10px] inline-block font-mono mt-0.5">${markupPct.toFixed(1)}%</span>
                    </div>
                `;
            }
        }

        const safeName = escapeHtml(m.name || '');
        const safeSource = escapeHtml(m.source || '');
        const barcodeDisplay = m.barcode ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 mt-1"><i class="fa-solid fa-barcode text-[8px]"></i>${escapeHtml(m.barcode)}</span>` : '';
        
        let expiryBadge = '';
        if (m.expiry_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expDate = new Date(m.expiry_date);
            expDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
                expiryBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 mt-1"><i class="fa-solid fa-triangle-exclamation text-[8px]"></i>KADALUARSA (${m.expiry_date})</span>`;
            } else if (diffDays <= 30) {
                expiryBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 mt-1"><i class="fa-solid fa-clock text-[8px]"></i>Exp: ${diffDays} hari lagi</span>`;
            } else if (diffDays <= 60) {
                expiryBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 mt-1"><i class="fa-solid fa-clock text-[8px]"></i>Exp: ${diffDays} hari</span>`;
            } else {
                expiryBadge = `<span class="text-[9px] opacity-60 font-mono block mt-0.5">Exp: ${m.expiry_date}</span>`;
            }
        }

        const stockQty = Number(m.stock_qty !== undefined ? m.stock_qty : 0);
        const minStock = Number(m.min_stock !== undefined ? m.min_stock : 5);
        let stockBadge = `<span class="font-bold font-mono text-xs">${stockQty.toLocaleString('id-ID')}</span>`;
        if (stockQty <= 0) {
            stockBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Habis (0)</span>`;
        } else if (stockQty <= minStock) {
            stockBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">${stockQty} (Menipis)</span>`;
        }

        const tierGrosirBadge = (m.wholesale_price && Number(m.wholesale_price) > 0) ? `<span class="block text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">Grosir (≥${m.wholesale_min_qty || 10}): Rp ${Number(m.wholesale_price).toLocaleString('id-ID')}</span>` : '';
        const tierBoxBadge = (m.box_price && Number(m.box_price) > 0) ? `<span class="block text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">Dus (≥${m.box_min_qty || 50}): Rp ${Number(m.box_price).toLocaleString('id-ID')}</span>` : '';

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">
                    <div>${safeName}</div>
                    ${barcodeDisplay}
                    ${expiryBadge}
                </td>
                <td class="p-3 border border-inherit"><span class="px-2 py-0.5 theme-input border rounded text-[10px] font-bold">${safeSource}</span></td>
                <td class="p-3 border border-inherit text-center">${stockBadge}</td>
                <td class="p-3 border border-inherit font-mono">${buyPriceDisplay}</td>
                <td class="p-3 border border-inherit font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    <div>Rp ${sellPrice.toLocaleString('id-ID')}</div>
                    ${tierGrosirBadge}
                    ${tierBoxBadge}
                </td>
                <td class="p-3 border border-inherit">${markupDisplay}</td>
                <td class="p-3 border border-inherit text-center">${actionBtns}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function openEditMasterModal(id) {
    const item = masterData.find(m => m.id === id);
    if(!item) return;

    document.getElementById('edit-m-id').value = item.id;
    document.getElementById('edit-m-name').value = item.name;
    document.getElementById('edit-m-buy').value = item.buy.toLocaleString('id-ID');
    document.getElementById('edit-m-sell').value = item.sell.toLocaleString('id-ID');
    const editStockEl = document.getElementById('edit-m-stock');
    if (editStockEl) editStockEl.value = (item.stock_qty !== undefined ? item.stock_qty : 0);

    const editBarcodeEl = document.getElementById('edit-m-barcode');
    if (editBarcodeEl) editBarcodeEl.value = item.barcode || '';
    const editWholesalePriceEl = document.getElementById('edit-m-wholesale-price');
    if (editWholesalePriceEl) editWholesalePriceEl.value = item.wholesale_price ? Number(item.wholesale_price).toLocaleString('id-ID') : '';
    const editWholesaleQtyEl = document.getElementById('edit-m-wholesale-qty');
    if (editWholesaleQtyEl) editWholesaleQtyEl.value = item.wholesale_min_qty || 10;
    const editBoxPriceEl = document.getElementById('edit-m-box-price');
    if (editBoxPriceEl) editBoxPriceEl.value = item.box_price ? Number(item.box_price).toLocaleString('id-ID') : '';
    const editBoxQtyEl = document.getElementById('edit-m-box-qty');
    if (editBoxQtyEl) editBoxQtyEl.value = item.box_min_qty || 50;

    const editExpiryEl = document.getElementById('edit-m-expiry');
    if (editExpiryEl) editExpiryEl.value = item.expiry_date || '';

    updateAgentDropdowns();
    document.getElementById('edit-m-source').value = item.source;
    updateLiveMarkup('edit-m-buy', 'edit-m-sell', 'edit-m-markup-preview', 'edit-m-markup-text');
    openModalById('edit-master-modal');
}

function closeEditMasterModal() {
    closeModalById('edit-master-modal');
}

document.getElementById('edit-master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Akses Ditolak", "Akun view tidak diizinkan.", "error");

    const id = parseInt(document.getElementById('edit-m-id').value);
    const newName = document.getElementById('edit-m-name').value.trim();
    const newSource = document.getElementById('edit-m-source').value;
    const newBuy = getCleanNumber('edit-m-buy');
    const newSell = getCleanNumber('edit-m-sell');
    const editStockEl = document.getElementById('edit-m-stock');
    const newStock = editStockEl ? (parseInt(editStockEl.value, 10) || 0) : 0;

    const newBarcode = document.getElementById('edit-m-barcode')?.value.trim() || null;
    const newWholesalePrice = getCleanNumber('edit-m-wholesale-price');
    const newWholesaleQty = parseInt(document.getElementById('edit-m-wholesale-qty')?.value, 10) || 10;
    const newBoxPrice = getCleanNumber('edit-m-box-price');
    const newBoxQty = parseInt(document.getElementById('edit-m-box-qty')?.value, 10) || 50;
    const newExpiry = document.getElementById('edit-m-expiry')?.value || null;

    const oldItem = masterData.find(m => m.id === id);
    if(!oldItem) return;

    let priceHistoryPayload = null;
    if(oldItem.buy !== newBuy || oldItem.sell !== newSell) {
        priceHistoryPayload = {
            master_id: id,
            product_name: newName,
            old_buy: oldItem.buy,
            new_buy: newBuy,
            old_sell: oldItem.sell,
            new_sell: newSell,
            changed_by: currentUser,
            changed_at: new Date().toISOString()
        };
        priceHistoryData.unshift(priceHistoryPayload);
    }

    oldItem.name = newName;
    oldItem.source = newSource;
    oldItem.buy = newBuy;
    oldItem.sell = newSell;
    oldItem.stock_qty = newStock;
    oldItem.barcode = newBarcode;
    oldItem.wholesale_price = newWholesalePrice;
    oldItem.wholesale_min_qty = newWholesaleQty;
    oldItem.box_price = newBoxPrice;
    oldItem.box_min_qty = newBoxQty;
    oldItem.expiry_date = newExpiry;
    saveCacheToLocal();

    logAuditActivity('PRICE_CHANGE', newName, `Ubah master ${newName}: Stok ${newStock}, Beli Rp ${newBuy.toLocaleString()}, Jual Rp ${newSell.toLocaleString()}, Grosir Rp ${newWholesalePrice.toLocaleString()}`);

    renderMaster();
    renderDropdowns();
    closeEditMasterModal();
    showNotification("Sukses", "Master produk dan riwayat harga berhasil diperbarui!", "success");

    dispatchMutation({
        type: 'UPDATE_MASTER',
        payload: {
            id,
            updates: { name: newName, source: newSource, buy: newBuy, sell: newSell, stock_qty: newStock, barcode: newBarcode, wholesale_price: newWholesalePrice, wholesale_min_qty: newWholesaleQty, box_price: newBoxPrice, box_min_qty: newBoxQty, expiry_date: newExpiry },
            history: priceHistoryPayload
        }
    }, async () => {
        const updateObj = { name: newName, source: newSource, buy: newBuy, sell: newSell, stock_qty: newStock };
        if (newBarcode) updateObj.barcode = newBarcode;
        if (newWholesalePrice > 0) { updateObj.wholesale_price = newWholesalePrice; updateObj.wholesale_min_qty = newWholesaleQty; }
        if (newBoxPrice > 0) { updateObj.box_price = newBoxPrice; updateObj.box_min_qty = newBoxQty; }
        if (newExpiry) updateObj.expiry_date = newExpiry;

        try {
            const { error } = await supabaseClient.from('master').update(updateObj).eq('id', id);
            if(error) throw error;
        } catch(upErr) {
            // Graceful fallback jika kolom tambahan belum dimigrasikan di cloud
            await supabaseClient.from('master').update({
                name: newName, source: newSource, buy: newBuy, sell: newSell, stock_qty: newStock
            }).eq('id', id);
        }
        if(priceHistoryPayload) {
            await supabaseClient.from('price_history').insert([priceHistoryPayload]);
        }
    });
});

function openHistoryModal(masterId) {
    const item = masterData.find(m => m.id === masterId);
    if(!item) return;

    document.getElementById('history-product-title').innerText = item.name;
    const tbody = document.getElementById('history-table-body');
    tbody.replaceChildren();

    const histories = priceHistoryData.filter(h => h.master_id === masterId).sort((a,b) => new Date(b.changed_at) - new Date(a.changed_at));

    if(histories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center opacity-60">Belum ada riwayat perubahan harga untuk produk ini.</td></tr>`;
    } else {
        const rows = histories.map(h => {
            const diff = h.new_buy - h.old_buy;
            const diffBadge = diff > 0 ? 
                `<span class="text-rose-500 font-bold">+Rp ${diff.toLocaleString()} (Naik)</span>` : 
                diff < 0 ? `<span class="text-emerald-500 font-bold">-Rp ${Math.abs(diff).toLocaleString()} (Turun)</span>` : `<span class="opacity-50">Tetap</span>`;

            return `
                <tr class="hover:bg-slate-50/50">
                    <td class="p-2.5 border border-inherit">${new Date(h.changed_at).toLocaleString('id-ID')}</td>
                    <td class="p-2.5 border border-inherit opacity-70">Rp ${h.old_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit font-bold">Rp ${h.new_buy.toLocaleString()}</td>
                    <td class="p-2.5 border border-inherit">${diffBadge}</td>
                </tr>`;
        }).join('');
        tbody.innerHTML = rows;
    }

    openModalById('history-master-modal');
}

function closeHistoryModal() {
    closeModalById('history-master-modal');
}

function confirmDeleteMaster(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akun Viewer hanya dapat melihat data dan tidak diizinkan menghapus produk.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus produk master ini?", async () => {
        const idx = masterData.findIndex(m => m.id === id);
        const item = idx !== -1 ? masterData[idx] : null;
        if(idx !== -1) masterData.splice(idx, 1);
        saveCacheToLocal();
        renderMaster();
        renderDropdowns();
        if (item) logAuditActivity('MASTER_DELETE', item.name, `Menghapus produk master: ${item.name} (${item.source})`);
        showNotification("Sukses", "Produk master berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_MASTER',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('master').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

document.getElementById('master-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun Viewer hanya dapat melihat data dan tidak diizinkan menambah produk.", "warning");
    
    let rawName = document.getElementById('m-name').value.trim();
    let normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const source = document.getElementById('m-source').value;
    const buy = getCleanNumber('m-buy');
    const sell = getCleanNumber('m-sell');
    const stockInput = document.getElementById('m-stock');
    const stockQty = stockInput ? (parseInt(stockInput.value, 10) || 0) : 0;

    const barcode = document.getElementById('m-barcode')?.value.trim() || null;
    const wholesalePrice = getCleanNumber('m-wholesale-price');
    const wholesaleQty = parseInt(document.getElementById('m-wholesale-qty')?.value, 10) || 10;
    const boxPrice = getCleanNumber('m-box-price');
    const boxQty = parseInt(document.getElementById('m-box-qty')?.value, 10) || 50;
    const expiryDate = document.getElementById('m-expiry')?.value || null;

    const tempMaster = {
        id: Date.now(),
        name: normalizedName,
        source,
        buy,
        sell,
        stock_qty: stockQty,
        min_stock: 5,
        barcode,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: wholesaleQty,
        box_price: boxPrice,
        box_min_qty: boxQty,
        expiry_date: expiryDate
    };
    masterData.push(tempMaster);
    saveCacheToLocal();
    renderMaster();
    renderDropdowns();
    this.reset();
    document.getElementById('m-markup-preview')?.classList.add('hidden');
    showNotification("Sukses", "Master produk tersimpan", "success");

    dispatchMutation({
        type: 'INSERT_MASTER',
        payload: { name: normalizedName, source, buy, sell, stock_qty: stockQty, min_stock: 5, barcode, wholesale_price: wholesalePrice, wholesale_min_qty: wholesaleQty, box_price: boxPrice, box_min_qty: boxQty, expiry_date: expiryDate }
    }, async () => {
        const insertObj = { name: normalizedName, source, buy, sell, stock_qty: stockQty, min_stock: 5 };
        if (barcode) insertObj.barcode = barcode;
        if (wholesalePrice > 0) { insertObj.wholesale_price = wholesalePrice; insertObj.wholesale_min_qty = wholesaleQty; }
        if (boxPrice > 0) { insertObj.box_price = boxPrice; insertObj.box_min_qty = boxQty; }
        if (expiryDate) insertObj.expiry_date = expiryDate;

        try {
            const { data, error } = await supabaseClient.from('master').insert([insertObj]).select();
            if(error) throw error;
            if(data && data.length > 0) {
                tempMaster.id = data[0].id;
                saveCacheToLocal();
                renderMaster();
                renderDropdowns();
            }
        } catch(insErr) {
            // Fallback graceful jika kolom tier belum ditambahkan di cloud
            const { data, error } = await supabaseClient.from('master').insert([{
                name: normalizedName, source, buy, sell, stock_qty: stockQty, min_stock: 5
            }]).select();
            if(!error && data && data.length > 0) {
                tempMaster.id = data[0].id;
                saveCacheToLocal();
            }
        }
    });
});

async function renderCustomer() {
    const tbody = document.getElementById('cust-table-body');
    if(!tbody) return;
    const isSuperAdmin = currentRole === 'super_admin';
    const rows = customerData.map((c) => {
        const action = isSuperAdmin ? `<button onclick="confirmDeleteCustomer(${c.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>` : '-';
        const safeName = escapeHtml(c.name || '');
        const safePhone = escapeHtml(c.phone || '');
        const safeCustParam = encodeURIComponent(c.name || '').replace(/'/g, "%27");

        let unpaidTotal = 0;
        let unpaidCount = 0;
        if (typeof transactionData === 'object' && transactionData !== null) {
            Object.values(transactionData).flat().forEach(t => {
                if (t && t.customer === c.name && t.status !== 'Lunas') {
                    unpaidTotal += Number(t.totalSell) || 0;
                    unpaidCount++;
                }
            });
        }

        let debtStatusHtml = '';
        if (unpaidTotal > 0) {
            debtStatusHtml = `
                <div class="space-y-1">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <i class="fa-solid fa-triangle-exclamation text-[9px]"></i> Rp ${unpaidTotal.toLocaleString('id-ID')} (${unpaidCount} nota)
                    </span>
                    <div>
                        <button type="button" onclick="sendCustomerDebtReminder('${safeCustParam}')" class="btn-apple-press inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition" title="Kirim Pengingat Tagihan via WhatsApp">
                            <i class="fa-brands fa-whatsapp text-xs"></i> <span>Ingatkan WA</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            debtStatusHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><i class="fa-solid fa-circle-check text-[9px]"></i> Lunas</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/50">
                <td class="p-3 border border-inherit font-semibold">${safeName}</td>
                <td class="p-3 border border-inherit text-emerald-500 font-bold font-mono">+${safePhone}</td>
                <td class="p-3 border border-inherit">${debtStatusHtml}</td>
                <td class="p-3 border border-inherit text-center">${action}</td>
            </tr>`;
    }).join('');
    tbody.innerHTML = rows;
}

function sendCustomerDebtReminder(custParam) {
    let custName = custParam;
    try {
        custName = decodeURIComponent(custParam);
    } catch(e) {}
    const trimmedTarget = String(custName || '').trim().toLowerCase();
    const cust = customerData.find(c => (c.name || '').trim().toLowerCase() === trimmedTarget);
    if (!cust || !cust.phone) {
        showNotification("Peringatan", "Data nomor telepon pelanggan tidak ditemukan.", "warning");
        return;
    }

    const canonicalCustName = cust.name || custName;
    const unpaidList = [];
    let totalUnpaid = 0;
    if (typeof transactionData === 'object' && transactionData !== null) {
        Object.values(transactionData).flat().forEach(t => {
            if (t && String(t.customer || '').trim().toLowerCase() === trimmedTarget && t.status !== 'Lunas') {
                unpaidList.push(t);
                totalUnpaid += Number(t.totalSell) || 0;
            }
        });
    }

    if (unpaidList.length === 0) {
        showNotification("Informasi", `Pelanggan ${canonicalCustName} tidak memiliki tagihan aktif.`, "info");
        return;
    }

    const bizName = appSettings.bizName || 'SnackLoop ERP';
    const bankName = appSettings.bankName || 'BCA';
    const bankAccount = appSettings.bankAccount || '-';
    const bankHolder = appSettings.bankHolder || bizName;

    let msg = `Halo Kak *${canonicalCustName}*,\n\n`;
    msg += `Kami dari *${bizName}* ingin menginformasikan rincian nota/pesanan yang masih belum lunas sbb:\n\n`;

    unpaidList.forEach((t, i) => {
        const itemInfo = `${t.itemName} (${t.qty} pcs)`;
        const dueInfo = t.dueDate ? ` [Jatuh Tempo: ${t.dueDate}]` : '';
        msg += `${i + 1}. ${t.date} - ${itemInfo} : *Rp ${(Number(t.totalSell) || 0).toLocaleString('id-ID')}*${dueInfo}\n`;
    });

    msg += `\n*TOTAL TAGIHAN: Rp ${totalUnpaid.toLocaleString('id-ID')}*\n\n`;
    if (bankAccount && bankAccount !== '-') {
        msg += `Pembayaran dapat ditransfer ke:\n`;
        msg += `Bank: *${bankName}*\n`;
        msg += `No. Rekening: *${bankAccount}*\n`;
        msg += `Atas Nama: *${bankHolder}*\n\n`;
    }
    msg += `Mohon konfirmasi jika sudah melakukan pembayaran/transfer. Terima kasih banyak atas kerjasamanya! 🙏`;

    const cleanPhone = String(cust.phone).replace(/\D/g, '').replace(/^0/, '62');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
}

function confirmDeleteCustomer(id) {
    if(currentRole === 'view') return showNotification("Peringatan", "Akun Viewer hanya dapat melihat data dan tidak diizinkan menghapus pelanggan.", "warning");
    showConfirmModal("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus pelanggan ini?", async () => {
        const idx = customerData.findIndex(c => c.id === id);
        if(idx !== -1) customerData.splice(idx, 1);
        saveCacheToLocal();
        renderCustomer();
        renderDropdowns();
        showNotification("Sukses", "Data pelanggan berhasil dihapus", "success");

        dispatchMutation({
            type: 'DELETE_CUSTOMER',
            payload: { id }
        }, async () => {
            const { error } = await supabaseClient.from('customers').delete().eq('id', id);
            if(error) throw error;
        });
    });
}

document.getElementById('cust-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if(currentRole === 'view') return showNotification("Peringatan", "Akun Viewer hanya dapat melihat data dan tidak diizinkan menambah pelanggan.", "warning");
    
    let rawCust = document.getElementById('cu-name').value.trim();
    let normCust = rawCust.charAt(0).toUpperCase() + rawCust.slice(1);
    let rawPhone = typeof normalizeWaPhone === 'function'
        ? normalizeWaPhone(document.getElementById('cu-phone').value)
        : document.getElementById('cu-phone').value.trim().replace(/\D/g, '').replace(/^0/, '62');

    const tempCust = { id: Date.now(), name: normCust, phone: rawPhone };
    customerData.push(tempCust);
    saveCacheToLocal();
    renderCustomer();
    renderDropdowns();
    this.reset();
    showNotification("Sukses", "Pelanggan tersimpan", "success");

    dispatchMutation({
        type: 'INSERT_CUSTOMER',
        payload: { name: normCust, phone: rawPhone }
    }, async () => {
        const { data, error } = await supabaseClient.from('customers').insert([{ name: normCust, phone: rawPhone }]).select();
        if(error) throw error;
        if(data && data.length > 0) {
            tempCust.id = data[0].id;
            saveCacheToLocal();
            renderCustomer();
            renderDropdowns();
        }
    });
});
