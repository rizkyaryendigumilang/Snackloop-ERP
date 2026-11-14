# Universal Design System & Website Quality Standard (Modern Premium 2026)

Dokumen ini merupakan pedoman resmi standar kualitas desain, arsitektur visual, dan interaksi antarmuka (UI/UX) untuk **SnackLoop ERP** dan ekosistem aplikasi web modern. Pedoman ini mengadopsi 8 Karakteristik Utama Website Modern dengan memadukan keunggulan dari benchmark industri kelas dunia: **Linear, Stripe, Apple, Raycast, dan Vercel**.

---

## 1. Filosofi Inti: Modern Premium 2026

Desain modern yang matang bukan sekadar tren kosmetik (seperti gelap gulita, gradasi pelangi, atau glassmorphism berlebihan), melainkan **pilihan desain yang disiplin, tenang, fungsional, dan presisi**.

| Benchmark | Prinsip yang Diadopsi ke SnackLoop |
| :--- | :--- |
| **Linear** | Konsistensi UI monokrom, kontras tinggi, typography kuat, arsitektur modular yang rapi. |
| **Stripe** | Visual clarity, hierarki finansial yang terpercaya, rasio komposisi yang seimbang. |
| **Apple** | Simplicity, whitespace proporsional, fluid physics, hairline borders, dan tabular figures. |
| **Raycast** | Interaktivitas cepat, keyboard shortcuts (`Ctrl+K`, `F1 / ?`), instant response tanpa jeda. |
| **Vercel** | Developer-grade structure, clean state management, accessible contrast. |

---

## 2. 8 Pilar Karakteristik Website Modern

### Pilar 1: Modern Visual Language
* **Typography Berkarakter**: Hirarki visual tegas dengan kontras jelas antara judul utama dan teks isi. Heading berukuran besar menggunakan optical negative tracking (`letter-spacing: -0.02em`).
* **Whitespace Proporsional**: Memberikan ruang bernapas (*breathing room*) antarkartu dan seksi, menghindari kepadatan yang melelahkan mata.
* **Warna Tidak Berlebihan**: Menghilangkan warna pelangi acak. Menggunakan palet netral sebagai fondasi dengan **satu warna aksen dominan** (`#4f46e5` Royal Indigo).
* **Konsistensi Lintas Halaman**: Seluruh modul (Dashboard, POS Kasir, Piutang, Jastip, Laporan, Gudang) menggunakan struktur kartu, tombol, badge, dan modal yang seragam.

### Pilar 2: Bento Grid & Modular Layout
* **Komposisi Variatif**: Tidak menggunakan kartu yang monoton berukuran sama. Menggunakan grid modular asimetris namun proporsional:
  * **Large Feature / Hero Card**: *Pelacak Keuangan & Beban* (kolom ganda) dengan rasio modal vs laba.
  * **Modular Statistic Tiles**: *Pendapatan, Beban, Laba Bersih, Piutang* dalam tile mandiri (`.bento-stat-tile`).
  * **Information & Action Card**: *Catatan Cepat & Agenda Owner* (kolom tunggal).
  * **Visual Showcase**: Grafik performa bulanan dan peringkat mitra / produk terlaris.

### Pilar 3: Sophisticated Typography
* **Font Family Stack**:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Inter", -system-ui, sans-serif;
  ```
* **Optical Tracking**:
  * Heading 1–4, Display: `letter-spacing: -0.02em; line-height: 1.15;`
  * Body Text: `letter-spacing: -0.005em; line-height: 1.5;`
  * Badges & Micro-Captions: `letter-spacing: 0.01em; font-size: 11px;`
* **Tabular Figures**:
  ```css
  font-variant-numeric: tabular-nums;
  -webkit-font-feature-settings: "tnum" 1, "cv05" 1;
  font-feature-settings: "tnum" 1, "cv05" 1;
  ```
  Menjamin digit nominal angka dan rupiah tidak bergeser saat data berubah atau di-scroll.

### Pilar 4: Subtle Animations & Micro-Interactions
* **Zero `transition: all`**: Menghindari *paint reflow* global. Transisi secara eksplisit didefinisikan per properti (`transform`, `opacity`, `background-color`, `border-color`).
* **Instant Tactile Press (`.btn-apple-press`)**:
  ```css
  .btn-apple-press:active {
    transform: scale(0.97);
    transition: transform 80ms ease-out;
  }
  ```
* **Bento Card Micro-Elevation**:
  ```css
  .bento-card.interactive:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.07);
    border-color: rgba(79, 70, 229, 0.3);
  }
  ```
* **Loading Skeleton Shimmer**: Animasi shimmer gelombang lembut 1.6s untuk pengalaman pemuatan tanpa layout shift.

### Pilar 5: Modern Color System (Light & Dark)
* **Light Theme**:
  * Canvas Background: `#f8fafc`
  * Card Surface: `#ffffff`
  * Primary Accent: `#4f46e5` (Royal Indigo), Hover `#4338ca`
  * Primary Text: `#0f172a` (Slate 900)
  * Secondary Text: `#64748b` (Slate 500)
  * Hairline Border: `rgba(226, 232, 240, 0.9)`
* **Dark Theme (Deep Obsidian)**:
  * Canvas Background: `#090d16`
  * Card Surface: `#0f172a`
  * Hairline Border: `rgba(255, 255, 255, 0.08)`
  * Primary Text: `#f8fafc`
  * Secondary Text: `#94a3b8`
* **Semantic Tones (Muted Signals)**:
  * Sukses / Lunas: Muted Emerald (`#059669` light, `#34d399` dark)
  * Peringatan / Jatuh Tempo: Muted Ochre (`#d97706` light, `#fbbf24` dark)
  * Bahaya / Retur / Hapus: Soft Rose (`#e11d48` light, `#f87171` dark)

### Pilar 6: Glassmorphism & Depth
* **Selective Acrylic Glass**: Diterapkan secara tepat sasaran pada komponen yang melayang (*floating elements*), yaitu Header Utama (`.apple-header`), Sidebar Navbar, Modal Backdrops, dan Toast Notifications:
  ```css
  .apple-header {
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  }
  ```
* **Inner Glass Rim**: Menggunakan `inset 0 1px 0 rgba(255,255,255,0.85)` untuk menghasilkan refleksi tepi kaca khas perangkat keras Apple.
* **Prefers Reduced Transparency**: Mendukung mode aksesibilitas perangkat dengan fallback solid otomatis.

### Pilar 7: Responsive & Adaptive Design
* **Desktop / Laptop (>= 1024px)**:
  * Sidebar dock vertikal dengan menu tooltip cepat dan tombol pintasan keyboard.
  * Tabel komprehensif dengan sticky header dan scroll shadow affordance.
  * Split bento grid 3 kolom.
* **Tablet (768px – 1023px)**:
  * Grid 2 kolom adaptif, form kasir 2 baris fleksibel.
* **Smartphone (< 768px)**:
  * **HIG 5-Pillar Bottom Navigation Bar**: Akses jempol satu tangan ke 5 modul utama (Dashboard, Transaksi, Kasir POS, Invoice, Menu Lainnya).
  * **Apple Bottom Sheets**: Modal otomatis bertransformasi menjadi lembar tarik bawah dengan *swipe handle pill*.
  * **Mobile Card View**: Tabel transaksi beralih ke format kartu vertikal ramah sentuhan.
  * **Safe-Area Inset Support**: Kompatibel penuh dengan notch iPhone, Dynamic Island, dan status bar Android.

### Pilar 8: Functional UX & High Reliability
* **Navigasi Intuitif & Keyboard-First**:
  * `Ctrl + K`: Quick search pelanggan dan transaksi.
  * `F1 / ?`: Dialog panduan pintasan kasir desktop.
  * `↵ Enter`: Simpan transaksi cepat tanpa menyentuh mouse.
* **Kalkulator Kasir Terintegrasi**: Fitur hitung kembalian instan dengan tombol preset (`[Uang Pas]`, `[+10rb]`, `[+20rb]`, `[50rb]`, `[100rb]`, `[200rb]`).
* **Offline-First & Outbox Engine**: Indikator status jaringan real-time dengan Web Locks multi-tab guard, mencegah kehilangan transaksi saat sinyal terputus.
* **Accessible & Non-Intrusive Feedback**: Toast notifikasi mengambang dengan suara taktil haptic di perangkat mobile.

---

## 3. Matriks Komponen UI Standar

| Komponen | Kelas CSS / Pola Desain | Ciri Khas Modern Premium 2026 |
| :--- | :--- | :--- |
| **Bento Hero Card** | `.bento-card .bento-hero` | Elevasi mikro, sudut squircle 16px, subtle radial glow aksen. |
| **Stat Tile** | `.bento-stat-tile` | Background semitransparan 70%, border hairline, tabular numerals. |
| **Segmented Control** | `.seg-control .seg-btn` | Kapsul iOS, tombol aktif warna putih solid (light) / slate (dark). |
| **Tombol Taktil** | `.btn-apple-press .btn-magnetic` | Kompresi 0.97 saat ditekan (80ms), sudut 10px, kontras tinggi. |
| **Pill Badge** | `.badge-soft-good / warn / bad` | Warna pastel redup (8% opacity background), border tipis 20%. |
| **Modal / Sheet** | `.apple-sheet-handle` | Bottom sheet pada mobile, drag handle pill, backdrop blur 12px. |

---

## 4. Checklist Kualitas Desain (Design QA Checklist)

Sebelum merilis fitur atau antarmuka baru, verifikasi kriteria berikut:
- [x] Font menggunakan system stack Apple / Inter dengan tabular numerals pada nominal uang.
- [x] Zero `transition: all` pada berkas stylesheet.
- [x] Tidak ada warna pelangi acak pada ikon atau label (Tell 04 Kill AI Slop).
- [x] Tombol dan kontrol memiliki respon sentuh instan (`:active:scale-[0.97]`).
- [x] Header dan bilah navigasi menerapkan frosted glass blur yang terukur.
- [x] Tampilan mobile memiliki safe-area insets dan bottom navigation bar yang ergonomis.
- [x] Seluruh 18 automated tests (`node scripts/test.js`) lulus 100%.
- [x] Skema database dan logika transaksi tetap utuh tanpa modifikasi destruktif.
