# ADR 0002: Pemisahan Model Finansial Arus Kas Realisasi vs Akrual Operasional

## Status
Diterima (Accepted)

## Konteks
Sebelumnya, sistem SnackLoop ERP mencampuradukkan metode kas dan akrual pada satu tempat:
- Modal (HPP) menghitung seluruh transaksi (termasuk yang tempo), sementara Pendapatan hanya menghitung transaksi lunas.
- Hal ini menyebabkan persentase modal (*split ratio*) membengkak secara keliru ketika terdapat transaksi piutang dalam jumlah besar.
- Terjadi perbedaan pemahaman antara kasir (yang fokus pada uang fisik di laci kas) dan akuntan/owner (yang memerlukan laporan laba rugi P&L komprehensif).

## Keputusan
Menerapkan pendekatan **Dual Financial View** yang tegas dan terpisah:

1. **Dashboard Utama Kasir (Arus Kas Realisasi):**
   - **Pendapatan:** Hanya mengakumulasi transaksi berstatus `Lunas`.
   - **HPP Barang Terjual:** Hanya mengakumulasi modal dari transaksi berstatus `Lunas` (`modalLunas`).
   - **Laba Kotor Realisasi:** `Pendapatan Kas - HPP Barang Terjual Lunas`.
   - **Laba Bersih Final:** `Laba Kotor Realisasi - Beban Operasional Toko`.
   - **Struktur Rasio (Split Bar):** Berbasis 100% pada Pendapatan Kas Masuk (`Modal % + Beban % + Laba % = 100%`).
   - **Piutang Usaha:** Dipantau pada kartu terpisah sebagai hak tagih tempo yang belum cair.

2. **Laporan Bisnis & Analitik PDF (Akrual Operasional):**
   - Menyajikan Total Omzet Akrual (`Penjualan Lunas + Penjualan Tempo`).
   - Menyajikan total HPP keseluruhan barang yang telah diserahkan.
   - Menyajikan performa Laba Bersih Operasional lengkap untuk kepentingan evaluasi performa bisnis tahunan.

## Konsekuensi
- **Positif:** Menghilangkan kebingungan owner mengenai mengapa uang di rekening berbeda dengan angka laba kotor di grafik bulanan. Seluruh formula matematis konsisten dan tidak menghasilkan angka artifisial.
- **Tantangan:** Staf kasir dan admin perlu memahami bahwa angka di Dashboard mengukur arus kas nyata, sedangkan lembar laporan PDF mencakup performa akrual tempo. Hal ini telah diakomodasi melalui subteks penjelasan pada masing-masing kartu dan tabel.
