# V-Forge Sprint V9 — Spark App Shell & Editor Motion

Sprint V9 memusatkan pengembangan pada stabilitas aplikasi mobile sebelum mengaktifkan layanan berbayar.

## Perubahan utama

- Home tetap sederhana: satu CTA editor dan misi harian, tanpa daftar Projects ganda.
- Tombol tengah `+` dan CTA Home langsung membuka editor serta file picker.
- Misi membaca draft, template, dan status ekspor dari data proyek Firestore secara real-time.
- Mode Firebase Spark ditampilkan dengan jujur: skor misi beta dapat dilihat, tetapi poin aman dan Premium tidak diaktifkan dari browser.
- SDK Firebase Functions tidak dimuat pada build Spark sehingga tidak ada panggilan backend yang belum tersedia.
- Tema dark/light disatukan untuk Home, Template, Projects, Profile, Settings, Premium, Notifications, Rewards, Cloud, dan Edit Profile.
- Ukuran teks dinaikkan agar nyaman dibaca di HP.
- Scroll vertikal Home/Profile/Settings dan scroll horizontal filter/timeline diperkuat.
- Editor kosong memiliki attraction animation yang berganti pesan dan tetap ringan.
- Toolbar editor dapat digeser pada layar sempit.
- Cache PWA dinaikkan ke `vforge-v9-0-0-spark-app-shell`.

## Status Spark

Berfungsi tanpa Blaze:

- Firebase Authentication.
- Firestore profile dan metadata proyek.
- Project realtime listener.
- Misi beta yang dihitung dari proyek.
- Dark/light theme.
- Local video editing dan export sesuai kemampuan browser.

Disimpan untuk tahap Blaze:

- `functions/index.js` dan `functions/package.json`.
- Reward poin yang diverifikasi server.
- Penukaran 1.000 poin menjadi Premium.
- Expiry Premium dan scheduler.

## Catatan

File `js/v8-ui.js` lama tidak lagi dimuat. Sprint V9 memakai `js/v9-ui.js`. File lama boleh dibiarkan untuk arsip atau dihapus setelah V9 terbukti stabil.
