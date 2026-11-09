# Audit & Spesifikasi Desain Apple (WWDC Fluid Interfaces & Design Foundations)

> **Proyek:** SnackLoop ERP  
> **Standar Rujukan:** Apple WWDC *Designing Fluid Interfaces* (2018), *The Details of UI Typography* (2020), *Principles of Great Design* (2026), *Designing Audio-Haptic Experiences*  
> **Tanggal:** 9 November 2026  

---

## 1. Audit 16 Prinsip Apple Design pada SnackLoop ERP

| No | Prinsip Apple Design | Status Saat Ini di SnackLoop | Temuan & Peluang Peningkatan |
|---|---|---|---|
| **1** | **Response (Kill Latency)** | Sebagian | Tombol saat ini menunggu `click`/release untuk efek transisi. Diperlukan feedback instan pada pointer-down (`active:scale-[0.97]` / `100ms ease-out`). |
| **2** | **Direct Manipulation** | Kurang | Dialog modal muncul secara statis di tengah layar mobile. Tidak ada drag-to-dismiss yang menempel 1:1 pada sentuhan jari. |
| **3** | **Interruptibility** | Kurang | Transisi CSS modal menggunakan timing tetap (`duration-200`) yang tidak dapat dibatalkan atau ditarik balik di tengah gerakan tanpa animasi selesai terlebih dahulu. |
| **4** | **Behavior over Animation (Springs)** | Belum Ada | Masih mengandalkan kurva easing kubik standar. Perlu implementasi parameter pegas Apple: *Damping 1.0* (critically damped) untuk UI default, dan *Damping 0.8* untuk interaksi ber-momentum (flick/swipe). |
| **5** | **Velocity Handoff** | Belum Ada | Saat swipe dilepas, modal belum mewarisi kecepatan lepas pointer (`releaseVelocity`) sehingga transisi terasa terputus antara gestur dan animasi. |
| **6** | **Momentum Projection** | Belum Ada | Proyeksi titik henti scroll/sheet belum menggunakan formula peluruhan eksponensial Apple: `project = (v / 1000) * d / (1 - d)`. |
| **7** | **Spatial Consistency** | Baik | Modal masuk dan keluar sudah menggunakan sumbu vertikal, namun origin pembukaan belum ter-anchor ke tombol pemicu. |
| **8** | **Hint in Gesture Direction** | Cukup | Belum ada drag-handle visual pill pada sheet modal mobile yang memberi isyarat arah geser ke bawah. |
| **9** | **Rubber-banding** | Belum Ada | Batas scroll/drag saat ini berhenti kaku (*hard stop*). Perlu rumus tahanan progresif `(overshoot * dim * 0.55) / (dim + 0.55 * abs(overshoot))` saat ditarik melampaui batas atas. |
| **10** | **Gesture Feel Checklist** | Cukup | Threshold gestur (~10px) dan area tap target sudah memadai, namun belum ada pembatalan gesture jika jari digeser keluar sebelum release. |
| **11** | **Frame-Level Smoothness** | Sangat Baik | Animasi sudah menggunakan `transform` dan `opacity` (GPU composite-friendly). Nol penggunaan `transition: all`. |
| **12** | **Materials & Depth** | Cukup | Header menggunakan background solid. Dapat ditingkatkan menjadi *Translucent Frosted Glass* (`backdrop-filter: blur(20px) saturate(180%)`) dengan *light-catching hairline edge* (`border-top: 1px solid rgba(255,255,255,0.35)`). |
| **13** | **Multimodal (Audio-Haptics)** | Belum Ada | Belum ada umpan balik taktil getar halus (*10ms subtle tick*) pada peristiwa kritis di perangkat mobile (scan sukses, pelunasan invoice, toggle status). |
| **14** | **Reduced Motion & A11y** | Baik | Sudah ada `@media (prefers-reduced-motion)`. Perlu ditambahkan `@media (prefers-reduced-transparency)` untuk menonaktifkan efek blur dan meningkatkan kontras. |
| **15** | **Optical Typography** | Cukup | Font Poppins saat ini menggunakan letter-spacing seragam. Judul display besar (>24px) memerlukan *negative tracking* (`-0.02em`) dan leading rapat, sedangkan caption kecil memerlukan *positive tracking* (`+0.02em`). |
| **16** | **Design Foundations (8 Pillars)** | Sangat Baik | Purpose, agency (mudah undo), simplicity, dan craft sudah kuat dari perbaikan enterprise sebelumnya. |

---

## 2. Eksplorasi Ide & Solusi Desain Baru (Phase 2)

Berdasarkan audit di atas, 4 spesifikasi solusi teknis dirumuskan:

### Solusi A: Engine Fisika Pegas & Rubberband (Pure Math Utility)
Membuat modul kalkulasi fisika murni tanpa dependensi eksternal di [`src/modules/03-ui-utils.js`](file:///c:/Users/rizky/Documents/Dev/snackloop-erp/src/modules/03-ui-utils.js):
- `rubberband(overshoot, dimension, constant = 0.55)`
- `projectMomentum(initialVelocity, decelerationRate = 0.998)`
- `springStep(current, target, velocity, damping, response, dt)`
- `triggerHaptic(type = 'light')` via Web Vibration API

### Solusi B: Material Kaca Buram Apple (*Frosted Glass Materials*)
Menambahkan kelas CSS dan custom properties di [`style.css`](file:///c:/Users/rizky/Documents/Dev/snackloop-erp/style.css):
```css
:root {
  --ease-apple-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-apple-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
.apple-glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
body.dark-theme .apple-glass {
  background: rgba(13, 17, 23, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Solusi C: Tipografi Optik Berbasis Skala (*Optical Typography*)
- Display Headings (`h1`, `h2`, `#page-title`): `letter-spacing: -0.02em; line-height: 1.15;`
- Sub-headings & Card Titles: `letter-spacing: -0.01em;`
- Monospace Numbers & Currency: `font-variant-numeric: tabular-nums;`
- Small Badges & Pills: `letter-spacing: +0.025em; font-weight: 600;`

### Solusi D: Fluid Touch Feedback & Swipe-Down Bottom Sheet
- Efek tekan instan `.btn-apple-press:active { transform: scale(0.97); transition: transform 80ms ease-out; }`
- Drag handle pada mobile modal di [`src/modules/05-modals.js`](file:///c:/Users/rizky/Documents/Dev/snackloop-erp/src/modules/05-modals.js) dengan deteksi pointer swipe-down menuju dismiss.
