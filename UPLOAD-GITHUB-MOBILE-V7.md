# Upload V-Forge v7 ke GitHub lewat HP

## Cara paling aman

1. Ekstrak ZIP **V-Forge-Motion-Studio-v7.0.0-FULL.zip** di aplikasi File Manager/ZArchiver.
2. Buka repository GitHub `bayz-dik/V-Forge` melalui browser.
3. Upload isi folder `V-Forge` ke root repository dengan struktur yang sama.
4. Pilih **Commit changes**.
5. Tunggu GitHub Pages selesai deploy, lalu buka ulang situs.
6. Jika tampilan lama masih muncul, hapus cache situs/PWA atau buka DevTools browser lalu unregister Service Worker. Pada HP, cara paling mudah adalah hapus data situs V-Forge lalu buka kembali.

## File utama yang harus terunggah

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/projects.js`
- `js/workspace.js`
- `js/processor.js`
- `js/studio.js`
- `service-worker.js`
- seluruh folder `assets/images`

Jangan menghapus `js/firebase-config.js`, `js/auth.js`, ikon PWA, atau file rules Firebase yang sudah digunakan.
