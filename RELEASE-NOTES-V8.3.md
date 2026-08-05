# Release Notes — V-Forge v8.3.0

## Home

- Menghapus carousel Proyek Terbaru dari Home.
- Menambahkan Misi Harian vertikal agar layar tetap dapat digulir ke atas/bawah.
- Menambahkan progres Forge Points menuju Premium 30 hari.
- Menghapus CTA Premium terpisah yang sebelumnya menduplikasi fungsi reward.

## Navigation

- Tombol tengah `+` langsung membuka editor dan file picker.
- Tombol Mulai mengedit di Home mengikuti alur yang sama.
- Bottom sheet Create dihapus dari markup utama.

## Theme

- Tema dark/light memakai satu token warna global.
- Profile, Settings, Subscription, Notifications, Rewards, Cloud, Templates, Projects, dan editor controls diselaraskan.
- Pilihan tema disimpan di `localStorage`.
- Theme color browser/PWA ikut berubah.

## Profile

- Label menu dibuat eksplisit: Misi & Hadiah, Profil Saya, Pengaturan, Keluar.
- Kontras kartu dan teks diperbaiki di dark maupun light mode.

## Editor

- Empty editor mendapatkan V-Forge Motion Engine attraction scene.
- Animasi: camera float, moving perspective grid, light sweep, smoke, dan logo pulse.
- Animasi otomatis hilang ketika video sudah dimuat.

## Firebase

- Menambahkan Cloud Functions untuk recalculate daily missions.
- Menambahkan callable function untuk redeem Premium 30 hari.
- Menambahkan scheduled function untuk menonaktifkan reward yang kedaluwarsa.
- Rules v8.3 melindungi points, missions, dan subscription dari manipulasi klien.
