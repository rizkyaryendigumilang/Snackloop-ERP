# Fase 1: Pelacakan Stok Master, POS Quick Cash & Web Locks Sync Plan

> **Goal:** Mengimplementasikan perbaikan kritis prioritas 1 (Fase 1) dari hasil audit:
> 1. Pelacakan kuantitas stok produk master (`stock_qty`) & alert stok menipis (`min_stock`).
> 2. Kalkulator uang kembalian instan (*Cash Tendered & Change Calculator*) pada kasir POS dan cetak struk.
> 3. Penguncian Web Locks API pada `syncOutboxQueue` untuk mencegah duplikasi pengiriman saat multi-tab aktif.
> 4. Valuasi inventori gabungan (Repack + Master Supplier) pada Laporan Gudang.

---

### Task 1: Skema Database & Migrasi SQL untuk Stok Master
- **File:** `database/phase1_master_stock_improvements.sql`
- Tambahkan kolom `stock_qty` (INT DEFAULT 0) dan `min_stock` (INT DEFAULT 5) pada tabel `master`.

---

### Task 2: Modul Master Produk (09-master.js & index.html)
- **Files:** `src/modules/09-master.js`, `index.html`
- [x] Tambahkan input `m-stock` pada form tambah master dan `edit-m-stock` pada modal edit master.
- [x] Tampilkan kolom Stok pada tabel Master Produk dengan status badge stok menipis jika `stock_qty <= min_stock`.
- [x] Update `INSERT_MASTER` dan `UPDATE_MASTER` dengan kolom `stock_qty` dan `min_stock`.

---

### Task 3: Modul Kasir & Transaksi (11-transactions.js & index.html)
- **Files:** `src/modules/11-transactions.js`, `index.html`
- [x] Tampilkan sisa stok master pada dropdown produk kasir: `[Sisa: X] Nama Produk`.
- [x] Validasi pembelian kasir: Jika stok master ada dan `qty > stock_qty`, tampilkan peringatan konfirmasi atau cegah transaksi minus.
- [x] Pengurangan optimistik `stock_qty -= qty` saat transaksi tersimpan, dan pemulihan `stock_qty += qty` saat transaksi dihapus.
- [x] Tambahkan kalkulator uang diterima & kembalian (`t-cash-tendered`) dengan tombol cepat nominal.
- [x] Simpan `cash_tendered` dan `change_due` pada payload transaksi.

---

### Task 4: Modul Printer Struk Thermal (16-printer.js)
- **File:** `src/modules/16-printer.js`
- [x] Tampilkan baris `Tunai/Diterima: Rp X` dan `Kembalian: Rp Y` jika transaksi lunas dan memiliki nilai uang diterima.

---

### Task 5: Modul Laporan Inventori (12-reports.js)
- **File:** `src/modules/12-reports.js`
- [x] Perbarui `renderReportInventory()` untuk menghitung total valuasi aset gudang mencakup `repackData` dan `masterData` (`stock_qty * buy`).

---

### Task 6: Multi-Tab Outbox Sync Guard (04-outbox.js)
- **File:** `src/modules/04-outbox.js`
- [x] Lindungi eksekusi `syncOutboxQueue()` menggunakan Web Locks API (`navigator.locks.request('snackloop_outbox_sync')`) agar dua tab tidak memproses antrean bersamaan.

---

### Task 7: Unit Tests & Verifikasi (scripts/test.js)
- **File:** `scripts/test.js`
- [x] Tambahkan **TEST 17**: Validasi stok master, kalkulator kembalian kasir, Web Locks outbox guard, dan valuasi inventori gabungan.
- [x] Bundle, build dist, dan pastikan 17/17 tests passing.
- [x] Git commit, push, dan monitor deployment VPS di GitHub Actions.
