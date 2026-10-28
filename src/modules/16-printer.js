// ========================================================================================= //
// ==================== ENGINE CETAK STRUK KASIR THERMAL (58MM / 80MM) ===================== //
// ========================================================================================= //

function printThermalReceipt(receiptData, format = 'thermal58') {
    const is58 = format === 'thermal58';
    const paperWidth = is58 ? '48mm' : '72mm';
    const fontSize = is58 ? '10.5px' : '11.5px';

    const bizName = (appSettings?.businessName || 'SNACKLOOP ERP').toUpperCase();
    const bizTagline = appSettings?.businessTagline || 'Sistem Distribusi Snack';
    const bizAddr = appSettings?.businessAddress || '';
    const bizCity = appSettings?.businessCity || '';
    const bizPhone = appSettings?.whatsappPhone || '';
    const bankInfo = appSettings?.bankAccount || '';

    let itemsRows = '';
    let subtotal = 0;

    (receiptData.items || []).forEach(item => {
        const itemTotal = (item.qty * item.sell);
        subtotal += itemTotal;
        itemsRows += `
            <div style="margin-bottom: 4px;">
                <div style="font-weight: bold; word-break: break-word;">${item.name}</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>${item.qty} x ${item.sell.toLocaleString('id-ID')}</span>
                    <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    const extraCost = receiptData.extraCost || 0;
    const grandTotal = receiptData.grandTotal || (subtotal + extraCost);
    const statusBayar = receiptData.status === 'Lunas' ? 'LUNAS (SELESAI)' : 'TEMPO / BELUM LUNAS';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Struk_${receiptData.noNota || 'Receipt'}</title>
            <style>
                @page {
                    size: ${is58 ? '58mm' : '80mm'} auto;
                    margin: 0;
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: ${fontSize};
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: ${is58 ? '2mm 2mm 8mm 2mm' : '3mm 3mm 10mm 3mm'};
                    width: ${paperWidth};
                    max-width: ${paperWidth};
                    box-sizing: border-box;
                    line-height: 1.25;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .divider { margin: 4px 0; border-top: 1px dashed #000; }
                .double-divider { margin: 4px 0; border-top: 1.5px solid #000; }
                .flex-between { display: flex; justify-content: space-between; }
                @media print {
                    body {
                        width: ${paperWidth};
                    }
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="bold" style="font-size: ${is58 ? '13px' : '15px'};">${bizName}</div>
                <div style="font-size: 9.5px;">${bizTagline}</div>
                ${bizAddr ? `<div style="font-size: 9px;">${bizAddr}${bizCity ? ', ' + bizCity : ''}</div>` : ''}
                ${bizPhone ? `<div style="font-size: 9px;">WA: ${bizPhone}</div>` : ''}
            </div>

            <div class="double-divider"></div>

            <div style="font-size: 9.5px;">
                <div class="flex-between">
                    <span>No. Nota:</span>
                    <span class="bold">${receiptData.noNota}</span>
                </div>
                <div class="flex-between">
                    <span>Tanggal:</span>
                    <span>${receiptData.date}</span>
                </div>
                <div class="flex-between">
                    <span>Pelanggan:</span>
                    <span class="bold">${receiptData.customer}</span>
                </div>
                <div class="flex-between">
                    <span>Petugas:</span>
                    <span>${receiptData.operator || (currentUser || 'Kasir')}</span>
                </div>
            </div>

            <div class="divider"></div>

            <!-- Items -->
            <div>
                ${itemsRows}
            </div>

            <div class="divider"></div>

            <!-- Total Calculations -->
            <div style="font-size: 10px;">
                <div class="flex-between">
                    <span>Subtotal:</span>
                    <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
                </div>
                ${extraCost > 0 ? `
                <div class="flex-between">
                    <span>Ongkir/Biaya:</span>
                    <span>Rp ${extraCost.toLocaleString('id-ID')}</span>
                </div>` : ''}
                <div class="flex-between bold" style="font-size: ${is58 ? '12px' : '13px'}; margin-top: 2px;">
                    <span>TOTAL:</span>
                    <span>Rp ${grandTotal.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex-between" style="margin-top: 3px;">
                    <span>Status:</span>
                    <span class="bold">${statusBayar}</span>
                </div>
            </div>

            ${bankInfo ? `
            <div class="divider"></div>
            <div style="font-size: 9px;" class="text-center">
                <div class="bold">Rekening Pembayaran:</div>
                <div>${bankInfo}</div>
            </div>` : ''}

            <div class="double-divider"></div>

            <div class="text-center" style="font-size: 9px; margin-top: 4px;">
                <div>Barang yang sudah dibeli dapat ditukar</div>
                <div>bila kemasan rusak / melempem.</div>
                <div style="margin-top: 3px;" class="bold">*** TERIMA KASIH ***</div>
            </div>
        </body>
        </html>
    `;

    // Cetak menggunakan iframe tersembunyi untuk zero-margin Bluetooth printing
    let iframe = document.getElementById('thermal-print-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'thermal-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            showNotification("Cetak Struk", `Struk Thermal ${is58 ? '58mm' : '80mm'} berhasil dikirim ke printer!`, "success");
        } catch (e) {
            console.error("Gagal cetak iframe thermal:", e);
            showNotification("Gagal", "Tidak dapat membuka dialog cetak printer.", "error");
        }
    }, 400);
}

function printThermalReceiptFromTrx(targetTrx, format) {
    const matchingTransactions = (transactionData[targetTrx.monthKey] || []).filter(t => t.date === targetTrx.date && t.customer === targetTrx.customer);
    
    let items = [];
    let extraCost = 0;
    let grandTotal = 0;

    matchingTransactions.forEach(t => {
        items.push({
            name: t.itemName,
            qty: t.qty,
            sell: t.sell
        });
        extraCost += (t.extraCost || 0);
        grandTotal += t.totalSell;
    });

    printThermalReceipt({
        noNota: `TRX-${targetTrx.date.replace(/-/g, '')}-${String(targetTrx.id).slice(-4)}`,
        date: targetTrx.date,
        customer: targetTrx.customer,
        operator: currentUser || 'Kasir',
        status: targetTrx.status,
        items: items,
        extraCost: extraCost,
        grandTotal: grandTotal
    }, format);
}

function printThermalReceiptFromInvoice(inv, format) {
    let items = [];
    let foundTrxList = [];
    for (let m in transactionData) {
        const matches = (transactionData[m] || []).filter(t => t.date === inv.date && t.customer === inv.customer_name);
        if (matches.length > 0) {
            foundTrxList = matches;
            break;
        }
    }

    if (foundTrxList.length > 0) {
        foundTrxList.forEach(t => {
            items.push({
                name: t.itemName,
                qty: t.qty,
                sell: t.sell
            });
        });
    } else {
        items.push({
            name: "Pembelian Produk SnackLoop",
            qty: 1,
            sell: inv.total_amount
        });
    }

    printThermalReceipt({
        noNota: inv.invoice_number,
        date: inv.date,
        customer: inv.customer_name,
        operator: currentUser || 'Kasir',
        status: inv.status,
        items: items,
        extraCost: 0,
        grandTotal: inv.total_amount
    }, format);
}

function testThermalPrintFromSettings() {
    const format = document.getElementById('set-print-format')?.value || appSettings.printFormat || 'thermal58';
    
    if (format === 'a4') {
        return showNotification("Format A4", "Format yang dipilih saat ini adalah Dokumen A4. Pilih 58mm atau 80mm untuk tes cetak printer thermal bluetooth.", "info");
    }

    printThermalReceipt({
        noNota: `TES-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-001`,
        date: new Date().toLocaleDateString('id-ID'),
        customer: "Toko Contoh (Tes Struk)",
        operator: currentUser || 'Admin',
        status: "Lunas",
        items: [
            { name: "Makaroni Pedas Level 3", qty: 10, sell: 7500 },
            { name: "Keripik Singkong Balado", qty: 5, sell: 12000 },
            { name: "Basreng Daun Jeruk", qty: 5, sell: 10000 }
        ],
        extraCost: 0,
        grandTotal: 185000
    }, format);
}
