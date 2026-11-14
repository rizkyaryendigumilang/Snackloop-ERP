# GLOSSARY - SnackLoop ERP Domain Vocabulary

Dokumen kamus domain baku (*Ubiquitous Language*) untuk SnackLoop ERP. Seluruh kode, antarmuka pengguna, tiket pelacakan isu, dan dokumentasi arsitektur mengacu pada terminologi standar di bawah ini.

---

## 1. Terminologi Finansial & Akuntansi

| Istilah Baku | Kode / Database | Definisi & Batasan |
| :--- | :--- | :--- |
| **Arus Kas Masuk (Cash Inflow)** | `Pendapatan` / `total_sell` (status `Lunas`) | Uang nyata yang telah diterima kasir/toko dari transaksi yang dibayar lunas. Ditampilkan di kartu utama Dashboard Keuangan. |
| **Piutang Penjualan (Accounts Receivable / A/R)** | `Piutang` / `stat-Hutang` (status `Belum Lunas`) | Tagihan penjualan tempo ke pelanggan/toko mitra di mana barang sudah diserahkan tetapi pembayaran belum dilunasi. Bukan hutang toko ke pihak luar. |
| **Hutang Operasional (Accounts Payable / A/P)** | `expenses` / `payable` | Kewajiban pembayaran SnackLoop kepada pihak ketiga (supplier, agen, sewa, listrik, dll.). |
| **Harga Pokok Penjualan (HPP) Kas** | `modalLunas` / `total_modal` | Total modal pembelian produk dari transaksi yang **sudah lunas terjual**. |
| **HPP Barang Piutang (Modal Tertahan)** | `modalPiutang` | Modal barang dagangan yang telah keluar tetapi uangnya masih tertahan di tangan pelanggan tempo. |
| **Laba Kotor Realisasi (Gross Profit)** | `KeuntunganKotor` | Selisih antara Penjualan Lunas dikurangi HPP Barang Lunas (`Pendapatan - modalLunas`). |
| **Beban Operasional (Opex)** | `totalExpense` / `expenses` | Seluruh pengeluaran operasional toko di luar harga pokok barang (bensin, sewa, listrik, plastik kemasan, dll.). |
| **Laba Bersih Final (Net Profit)** | `NetProfitFinal` | Keuntungan bersih riil toko setelah Laba Kotor Realisasi dikurangi Beban Operasional Toko (`KeuntunganKotor - totalExpense`). |
| **Omzet Akrual (P&L Akrual)** | `totalRev` (`paidRev + unpaidRev`) | Total seluruh volume penjualan (Lunas + Tempo) yang disajikan pada laporan bisnis resmi (PDF Laporan). |

---

## 2. Terminologi Gudang, Stok, & Distribusi

| Istilah Baku | Kode / Database | Definisi & Batasan |
| :--- | :--- | :--- |
| **Master Produk** | `master` / `masterData` | Katalog produk reguler yang siap dijual langsung oleh kasir dari supplier/agen tanpa pengemasan ulang. |
| **Gudang Repack** | `repack` / `repackData` | Gudang pengolahan bal snack besar menjadi kemasan eceran siap jual. Tiap proses menghasilkan batch ber-ID unik. |
| **Batch Repack** | `batch` / `RPK-...` | Satuan pelacakan kemasan hasil repack yang memiliki `modal_per_pcs`, `sell_target`, `initial_qty`, dan `remaining_qty`. |
| **Stok Minimum (Threshold)** | `min_stock` | Batas kuantitas minimum produk sebelum sistem memunculkan indikator visual "Menipis" atau "Habis" pada kasir. |
| **Agen / Supplier** | `agents` / `agentData` | Mitra pemasok snack bal atau produk siap jual ke SnackLoop ERP. |

---

## 3. Terminologi Arsitektur & Sinkronisasi

| Istilah Baku | Kode / Database | Definisi & Batasan |
| :--- | :--- | :--- |
| **Outbox Queue** | `snackloop_outbox` (IndexedDB) | Antrean mutasi offline-first di browser yang menyimpan mutasi data lokal saat offline dan menyinkronkannya ke cloud secara otomatis saat online. |
| **Snapshot Harian** | `snapshots` (IndexedDB) | Cadangan lokal kondisi data menyeluruh per hari dengan kebijakan retensi berputar 7 hari (*rolling 7-day retention*). |
| **Jaring Pengaman Pre-Restore** | `SEBELUM_RESTORE_...` | Snapshot darurat otomatis yang dibuat tepat sebelum database dipulihkan dari berkas JSON eksternal. |
| **Jastip (Personal Shopper)** | `jastip_orders` / `jastipData` | Modul layanan titip belanja barang mancanegara dan lokal dengan perhitungan kurs valas, estimasi pajak bea cukai, dan skema uang muka (DP). |
