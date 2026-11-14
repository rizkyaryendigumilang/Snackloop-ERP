# Issue Tracker Configuration - SnackLoop ERP

## Tracker Location
- **Primary Tracker:** GitHub Issues
- **Repository Remote:** `origin` (GitHub)
- **Local Fallback:** `.scratch/<ticket-id>/` untuk tiket investigasi offline atau spike teknis.

## Triage Label Vocabulary
| Label | Peran / Definisi |
| :--- | :--- |
| `needs-triage` | Isu/tiket baru yang belum dievaluasi arsitek atau tim QA. |
| `bug` | Kesalahan logika, kegagalan kalkulasi, atau regresi fungsional. |
| `security` | Celah keamanan, kebocoran data sensitif, atau otorisasi peran. |
| `ready-for-agent` | Spesifikasi dan acceptance criteria telah lengkap untuk dieksekusi. |
| `ready-for-human` | Membutuhkan keputusan owner/kasir atau input kredensial eksternal. |
| `wontfix` | Di luar scope atau deprecated oleh arsitektur terbaru. |

## Workflow Standard
1. Setiap bug atau perbaikan fitur didaftarkan dengan judul ringkas dan kutipan `file:line`.
2. Verifikasi automated regression test (`node scripts/test.js`) wajib 100% lulus (18/18) sebelum tiket dinyatakan *resolved*.
3. Perubahan skema basis data wajib menyertakan skrip idempoten di direktori `database/`.
