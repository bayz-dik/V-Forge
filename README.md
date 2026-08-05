# V-Forge — Mobile Video Studio v8.2.1


## v8.2.1 — Scroll & Navigation Reliability

Hotfix ini memperbaiki kartu template yang keluar dari layar, scroll vertikal halaman utama, halaman Templates, Projects, Profile, panel editor, serta bottom sheet pada layar pendek. Navigasi sekarang membersihkan scroll-lock yang tertinggal dan mengembalikan posisi halaman secara aman setelah modal ditutup.


V-Forge adalah editor video **local-first** berbasis PWA. File video sumber dan hasil ekspor tetap berada di perangkat pengguna. Firebase dipakai untuk akun, status Premium, metadata proyek, preset, efek, transisi, dan catatan ekspor kecil.

## Perubahan utama v8

- Home baru dengan satu fokus utama: **Proyek Baru**.
- Riwayat proyek dipindahkan ke Home agar pengguna dapat langsung melanjutkan edit.
- Template Studio didesain ulang menjadi layar fokus tanpa hero lama yang bertumpuk.
- Editor memakai toolbar bawah: Media, Edit, Audio, Text, Effects, dan Export.
- Tampilan preview, timeline, panel efek, pilihan format, audio, dan export dibuat lebih ringkas.
- Navigasi utama menjadi Home, Projects, tombol Proyek Baru, Templates, dan Profile.
- Sistem Premium 4K, 120 FPS, dan Hi-Res Lossless tetap memakai entitlement backend yang sudah ada.
- Service Worker menggunakan cache `vforge-v8-0-0-focus-redesign`.

## Status fitur editor

Berfungsi:

- Pemilihan video lokal.
- Preview video di perangkat.
- Template, efek warna, transisi, dan motion intensity.
- Rasio, target resolusi, FPS, audio, dan Premium lock.
- Penyimpanan metadata draft ke Firestore.
- Pemrosesan dan ekspor melalui Canvas, Web Audio, dan MediaRecorder.

Belum diimplementasikan penuh:

- Text layer ditampilkan sebagai **SOON** dan tidak berpura-pura sebagai fitur aktif.
- Multi-track editing, trim presisi frame, sticker layer, keyframe, dan subtitle otomatis masih menjadi tahap berikutnya.

## Struktur utama

```text
index.html
css/style.css
js/app.js
js/auth.js
js/firebase-config.js
js/projects.js
js/workspace.js
js/processor.js
js/studio.js
js/v8-ui.js
assets/images/
icons/
manifest.json
service-worker.js
firestore.rules.txt
```

## Keamanan dan storage

- Jangan mengubah Premium dari sisi klien.
- `isPremium` dan `subscriptionStatus` harus dikelola backend/Admin SDK.
- Terapkan `firestore.rules.txt` melalui Firebase Console.
- Video sumber dan hasil ekspor tidak dikirim ke Firestore atau Firebase Storage oleh versi ini.


## v8.2 Native UX
Home ringkas, Templates dan Projects menjadi halaman tersendiri, tombol tengah membuka create sheet, serta workspace menjadi editor full-screen dengan preview, timeline, dan panel alat kontekstual.
