# V-Forge — Premium Mobile Video Studio v8.3.0

V-Forge adalah editor video **local-first** berbasis PWA. Video sumber dan hasil ekspor tetap berada di perangkat pengguna. Firebase dipakai untuk Authentication, sinkronisasi profil, metadata proyek, progres misi, Forge Points, dan entitlement Premium.

## v8.3 — Mission, Theme & Editor Attraction Rebuild

Perubahan utama:

- Bagian **Proyek Terbaru** di Home dihapus agar tidak menduplikasi halaman Projects.
- Home sekarang memiliki **Misi Harian** dengan progres dari data proyek Firestore secara real-time.
- Forge Points dapat ditukar menjadi **Premium 30 hari** setelah mencapai 1.000 poin.
- Penghitungan poin dan aktivasi Premium dipindahkan ke Firebase Cloud Functions agar tidak dapat dimanipulasi dari browser.
- Tombol tengah `+` dan tombol **Mulai mengedit** langsung membuka editor dan pemilih video—tanpa bottom sheet ganda.
- Profile, Settings, Subscription, Notifications, Rewards, Cloud, Templates, dan Projects memakai sistem tema yang sama.
- Pilihan dark/light tersimpan di perangkat dan diterapkan sebelum UI tampil agar tidak terjadi kilatan warna putih.
- Editor kosong sekarang mempunyai animasi otomotif V-Forge: gerakan kamera, grid, light sweep, smoke, dan logo motion.
- Perbaikan scroll vertikal dan horizontal tetap dipertahankan dari v8.2.1.

## Struktur navigasi

```text
Home       : tombol edit utama + misi harian
Templates  : katalog gaya dan preset
+          : langsung ke editor/pilih video
Projects   : seluruh draft dan hasil proyek
Me         : profil, hadiah, pengaturan, subscription
```

## Status fitur

### Sudah berfungsi di frontend

- Login/register Firebase Authentication.
- Profil dan metadata proyek real-time melalui Firestore.
- Pemilihan video lokal.
- Preview, rasio, template, transisi, efek, motion intensity.
- Target resolusi, FPS, audio, Premium lock.
- Penyimpanan draft dan status proses.
- Tema dark/light untuk seluruh menu utama.
- Misi harian membaca progres proyek secara real-time.
- Editor attraction animation saat belum ada video.

### Memerlukan deployment Firebase backend

- Poin misi masuk secara aman dan otomatis.
- Penukaran 1.000 Forge Points menjadi Premium 30 hari.
- Expired Premium reward otomatis setelah 30 hari.

Backend sudah disediakan di folder `functions/`. Ikuti `FIREBASE-MISSIONS-PREMIUM-V8.3.md`.

### Tahap berikutnya

- Text layer nyata.
- Overlay multi-layer.
- Trim presisi frame.
- Keyframe animation.
- Sticker/subtitle/AI tools.
- Native wrapper Android/iOS dan proses store review.

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
functions/index.js
functions/package.json
firebase.json
firestore.rules.txt
manifest.json
service-worker.js
```

## Keamanan penting

- Video tidak dimasukkan ke Firestore.
- Field `points`, `dailyMissionState`, `isPremium`, dan subscription dikunci dari perubahan klien.
- Hanya Cloud Functions/Admin SDK yang boleh memberi poin dan mengaktifkan Premium.
- Jangan mengubah Rules agar pengguna bisa menulis `isPremium` sendiri.
