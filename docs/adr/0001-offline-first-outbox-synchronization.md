# ADR 0001: Arsitektur Sinkronisasi Offline-First Menggunakan IndexedDB Outbox Queue

## Status
Diterima (Accepted)

## Konteks
Aplikasi SnackLoop ERP digunakan langsung oleh kasir gerai di lapangan dengan koneksi internet yang fluktuatif. Transaksi penjualan kasir, pencatatan batch repack, dan manajemen invoice tidak boleh macet atau kehilangan data saat sinyal seluler drop.

## Keputusan
1. Menggunakan **IndexedDB** (`snackloop_erp_db`) sebagai media penyimpanan lokal utama di sisi peramban klien.
2. Menerapkan pola **Outbox Queue Mutation**:
   - Seluruh mutasi tulis (`INSERT_TRANSACTION`, `INSERT_MASTER`, `INSERT_REPACK`, dll.) disimpan terlebih dahulu ke antrean outbox lokal dengan stempel waktu dan ID temporer.
   - Antarmuka pengguna (UI) diperbarui secara optimistik (*optimistic UI updates*) dalam 0 ms.
   - Ketika koneksi online terdeteksi (`navigator.onLine === true`), worker `syncOutboxQueue()` memproses antrean satu per satu ke Supabase PostgreSQL.
   - Panggilan mutasi transaksi penjualan memanfaatkan stored procedure ACID `create_sale_transaction_atomic` untuk mencegah *partial state* atau pengurangan stok ganda.
3. Mengadopsi **Automatic Rolling Daily Snapshots**:
   - Kondisi basis data lokal dicadangkan otomatis setiap hari ke *object store* `snapshots` di IndexedDB dengan batas retensi 7 hari bergulir.

## Konsekuensi
- **Positif:** Kasir tetap dapat melayani antrean pelanggan tanpa hambatan jaringan. Data aman dari risiko kehilangan akibat browser ditutup mendadak.
- **Tantangan:** Perlu mekanisme rekonsiliasi ID (`reconcileOfflineTransactionIds`) agar ID temporer lokal diselaraskan dengan Primary Key BigInt dari database cloud setelah tersinkronisasi.
