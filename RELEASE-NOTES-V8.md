# Release Notes — V-Forge v8.0.0 Focus Redesign

## UI/UX yang berubah total

### Home

- Dashboard lama berbasis misi diganti dengan home editor modern.
- Tombol **Pilih video** menjadi pusat perhatian pertama.
- Proyek terbaru ditampilkan langsung di Home dalam grid dua kolom.
- Quick Start menampilkan Clean Cut, Velocity, dan Creator Pop.
- Informasi local-first dibuat ringkas dan mudah dipahami.
- Misi harian tetap tersedia tetapi dipindahkan ke bagian bawah agar tidak mengganggu alur edit.

### Template Studio

- Hero iklan lama yang tinggi dan rawan tumpang tindih dihapus.
- Studio memakai hero kompak dengan CTA Proyek Baru.
- Template tetap dirender dari `studio.js` dan mendukung Premium lock.
- Fitur Premium digabung dalam satu kartu, bukan tiga kartu besar terpisah.

### Editor

- Toolbar bawah baru: Media, Edit, Audio, Text, Effects, Export.
- Tombol toolbar membawa pengguna langsung ke panel terkait.
- Text diberi label **SOON** karena text layer belum benar-benar diimplementasikan.
- Warna dan card editor dibuat lebih gelap, konsisten, serta berfokus pada preview dan timeline.
- Toolbar editor hanya muncul saat workspace aktif.

### Navigasi

- Home
- Projects
- Tombol tengah Proyek Baru
- Templates
- Profile

## Local-first

- Video sumber tetap di HP.
- Hasil ekspor tetap di HP.
- Firestore hanya menerima metadata dan catatan ekspor.
- Tidak ada perubahan yang menambahkan upload video ke Firebase Storage.

## Kompatibilitas

Fitur berikut dipertahankan:

- Firebase Authentication.
- Profile sync.
- Project/history sync.
- Premium entitlement.
- Video workspace.
- Video processing dan ekspor lokal.
- Template, transisi, efek warna, dan motion preset.
