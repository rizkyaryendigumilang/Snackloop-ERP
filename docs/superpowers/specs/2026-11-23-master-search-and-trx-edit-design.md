# Design Specification: Master Produk Search Bar & Full Transaction Editing with Holistic Financial Reconciliation

## 1. Intent & The Why
Dalam operasional harian SnackLoop ERP, dua bottleneck utama yang sering terjadi adalah:
1. **Pencarian Master Produk:** Memiliki puluhan master produk membutuhkan pengguliran tabel yang panjang untuk memeriksa harga atau agen. Dibutuhkan search bar langsung pada tabel Master Produk untuk menyaring data secara instan.
2. **Koreksi & Fleksibilitas Transaksi (Transaction Ledger):**
   - Sering terjadi perubahan harga modal dari agen secara mendadak saat transaksi berlangsung sebelum pengguna sempat memperbarui data master.
   - Sering terjadi kesalahan input tanggal, salah memilih nama pelanggan, salah memilih agen, atau salah input harga jual.
   - Saat ini baris transaksi hanya bisa dihapus dan dibuat ulang, yang merepotkan dan berisiko merusak integritas invoice dan histori audit.
   - Pengguna membutuhkan tombol aksi **Edit Transaksi** yang memungkinkan pengubahan langsung: **Tanggal, Pelanggan, Agen Sumber, Nama Barang, Qty, Harga Beli/Modal Langsung, Harga Jual Langsung, Biaya Tambahan/Ongkir, Status Pembayaran, dan Catatan**, disertai penyesuaian perhitungan keuangan menyeluruh (*holistic financial reconciliation*).

---

## 2. Goals, Non-Goals, and Anti-Goals
### Goals:
- **Search Bar Master Produk:** Menyediakan kotak pencarian instan pada tabel Daftar Master Produk yang memfilter nama barang, agen, dan barcode secara real-time tanpa reload halaman.
- **Modal Dialog Edit Transaksi:** Menyediakan antarmuka modal ramah pengguna (desktop & mobile) yang memuat data transaksi secara lengkap dan memungkinkan modifikasi semua kolom penting.
- **Harga Fleksibel Tanpa Bergantung Master:** Memungkinkan pengubahan harga beli (modal) dan harga jual secara langsung pada transaksi yang diedit, tanpa memaksa update master produk terlebih dahulu.
- **Migrasi Antar-Bulan Otomatis:** Jika tanggal transaksi diubah ke bulan yang berbeda (misal dari November ke Oktober), sistem secara otomatis memindahkan transaksi ke sheet bulan yang sesuai di lokal dan Supabase.
- **Rekonsiliasi Finansial Menyeluruh:** Mengkalkulasi ulang secara otomatis:
  - Laba bersih baris: $(\text{Harga Jual} - \text{Harga Beli}) \times \text{Qty} - \text{Biaya Tambahan}$
  - Akumulasi Profit Harian per tanggal
  - Ringkasan KPI bulanan (Omzet, Total Modal, Laba Kotor, Laba Bersih, Piutang)
  - Metrik & grafik Financial Dashboard
  - Sinkronisasi nominal tagihan pada invoice terkait (jika transaksi terkait invoice)
  - Sinkronisasi mutasi ke Supabase dan pencatatan Audit Log

### Non-Goals:
- Mengubah master catalog produk secara otomatis ketika harga transaksi diedit (pengguna secara spesifik meminta kemampuan edit harga transaksi on-the-fly tanpa mengubah master).
- Mengganti arsitektur penyimpanan Supabase; schema yang ada tetap dipertahankan.

### Anti-Goals:
- Perhitungan sepihak (partial recalculation) yang menyebabkan inkonsistensi matematis ($\Delta \ne 0$) antara Laba Baris, Profit Harian, dan Dashboard.
- Edit inline langsung di sel tabel yang merusak tampilan mobile dan rentan salah sentuh.

---

## 3. Constraints
- Menjaga aturan zero duplicate top-level functions di `script.js`.
- Menjaga aturan zero `transition: all` di `style.css`.
- Mendukung mode layar kecil (mobile card view `< 640px`) dan desktop table view (`>= 640px`).
- Mempertahankan backward-compatibility dengan seluruh 24 unit test yang ada.

---

## 4. Approaches Considered
1. **Pendekatan A: Modal Dialog Edit Transaksi (Dipilih)**
   - Menggunakan modal responsif (`#modal-edit-trx`) yang konsisten dengan desain SnackLoop (Apple design system, floating backdrop, rounded-2xl).
   - Menampilkan live calculation preview laba bersih & margin saat nilai modal/jual/qty/ongkir diubah.
   - *Alasan dipilih:* Aman dari misklik, responsif di HP/desktop, mendukung form lengkap termasuk catatan biaya operasional, dan mencegah kesalahan input.
2. **Pendekatan B: Inline Table Edit (Ditolak)**
   - Mengubah sel baris tabel menjadi text input saat tombol edit diklik.
   - *Alasan ditolak:* Tidak dapat bekerja dengan baik pada mobile card view, membatasi pengeditan field pelengkap (seperti catatan ongkir), dan berisiko salah trigger saat scrolling di layar sentuh.

---

## 5. User Decisions & Detailed Functional Design

### A. Fitur 1: Search Bar di Daftar Master Produk
- **Komponen UI:** Elemen input pencarian responsif diletakkan tepat di atas tabel `#master-table-body` dalam container `#tab-master`.
  - Placeholder: `Cari produk, agen, barcode...`
  - Ikon kaca pembesar di sisi kiri, tombol clear / keyboard escape.
- **Logika Filtering:**
  - Debounced input (150ms).
  - Menyaring array `masterData` berdasarkan kecocokan substring pada `name`, `source`, dan `barcode` (case-insensitive).
  - Jika kotak pencarian kosong, menampilkan seluruh `masterData`.
  - Jika tidak ditemukan hasil, menampilkan pesan informatif *"Tidak ada produk yang cocok dengan pencarian."*

### B. Fitur 2: Modal Edit Transaksi
- **Tombol Pemicu:** Tombol Edit (<i class="fa-solid fa-pen"></i>) warna indigo di kolom aksi baris tabel desktop dan kartu transaksi mobile (`openEditTrxModal(id)`).
- **Elemen Form di Modal:**
  1. `edit-trx-date`: Input Tanggal (type="date", required)
  2. `edit-trx-customer`: Select/Input Pelanggan (required)
  3. `edit-trx-source`: Select Sumber Agen (required)
  4. `edit-trx-item`: Input / Select Nama Barang (required)
  5. `edit-trx-qty`: Input Qty (type="number", min="1", required)
  6. `edit-trx-buy`: Input Modal / Harga Beli Satuan (format Rupiah live, required)
  7. `edit-trx-sell`: Input Harga Jual Satuan (format Rupiah live, required)
  8. `edit-trx-extra-cost`: Input Biaya Tambahan / Ongkir (format Rupiah live, default 0)
  9. `edit-trx-extra-cost-note`: Input Catatan Biaya Tambahan
  10. `edit-trx-status`: Select Status Pembayaran ("Lunas" / "Belum Lunas")
  11. `edit-trx-notes`: Input Catatan Transaksi
- **Live Profit Preview:**
  - Menampilkan panel pratinjau kalkulasi seketika:
    $$\text{Total Modal} = \text{Qty} \times \text{Harga Beli}$$
    $$\text{Total Jual} = \text{Qty} \times \text{Harga Jual}$$
    $$\text{Laba Bersih} = \text{Total Jual} - \text{Total Modal} - \text{Biaya Tambahan}$$
    $$\text{Margin \%} = (\text{Laba Bersih} / \text{Total Modal}) \times 100\%$$
- **Logika Penyimpanan & Rekonsiliasi:**
  1. Validasi input: Pastikan Qty $\ge 1$, harga jual $\ge 0$, dan tanggal valid.
  2. Ekstraksi bulan: Tentukan `newMonthKey` berdasarkan tanggal baru (misal `Nov 2026`).
  3. Jika `newMonthKey !== oldMonthKey`:
     - Pindahkan objek transaksi dari `transactionData[oldMonthKey]` ke `transactionData[newMonthKey]`.
     - Update field `month_key` di Supabase.
  4. Perbarui atribut transaksi:
     - `t.date = newDate`
     - `t.customer = newCustomer`
     - `t.source = newSource`
     - `t.itemName = newItemName`
     - `t.qty = newQty`
     - `t.buy = newBuy`
     - `t.sell = newSell`
     - `t.extraCost = newExtraCost`
     - `t.extraCostNote = newExtraCostNote`
     - `t.status = newStatus`
     - `t.notes = newNotes`
     - `t.totalModal = newQty * newBuy`
     - `t.totalSell = newQty * newSell`
     - `t.profitPerItem = (newSell - newBuy) * newQty - newExtraCost`
  5. Jika transaksi tertaut invoice:
     - Cari invoice terkait via `notes` atau relasi invoice.
     - Hitung ulang `total_amount` invoice berdasarkan akumulasi seluruh itemnya.
     - Simpan perubahan invoice ke lokal dan Supabase `invoices`.
  6. Eksekusi rekonsiliasi UI & Dashboard:
     - `calculateDailyProfits()`
     - `renderTable()` & `renderMobileCards()`
     - `updateMonthlyRecap()`
     - `updateDashboard()`
  7. Mutasi Supabase & Audit:
     - Dispatch mutation update transaksi ke Supabase via `dispatchMutation('UPDATE_TRANSACTION', ...)`.
     - `logAuditActivity('TRX_EDIT', t.id, 'Mengubah transaksi...')`.
     - Simpan cache lokal `saveCacheToLocal()`.
     - Tampilkan notifikasi sukses.

---

## 6. What's Left to the Builder
- Penambahan markup modal `#modal-edit-trx` di `index.html`.
- Penambahan markup input `#master-search` di `index.html`.
- Penulisan fungsi `filterMasterTable()`, `openEditTrxModal()`, `closeEditTrxModal()`, dan `saveEditTrx()` di modular scripts (`src/modules/09-master.js` dan `src/modules/11-transactions.js`).
- Eksekusi bundling `scripts/bundle.js` dan sinkronisasi `dist/` serta mobile wrapper.
- Penambahan pengujian unit baru pada `scripts/test.js` untuk memverifikasi fungsionalitas pencarian master dan pengeditan transaksi beserta rekonsiliasinya.
