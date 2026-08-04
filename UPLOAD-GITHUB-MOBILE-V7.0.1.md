# Upload Hotfix V-Forge v7.0.1 lewat HP

Hotfix ini memperbaiki komponen halaman Studio yang saling menumpuk pada Chrome/Brave Android.

## File yang perlu diganti di GitHub

- `index.html`
- `css/style.css`
- `service-worker.js`
- `README.md` (dokumentasi versi)
- `RELEASE-NOTES-V7.0.1.md` (file baru)

## Langkah upload

1. Ekstrak `V-Forge-v7.0.1-MOBILE-LAYOUT-GITHUB-UPDATE.zip`.
2. Buka repository `bayz-dik/V-Forge` melalui browser HP.
3. Masuk ke folder yang sesuai, lalu upload file pengganti.
4. Pastikan `style.css` tetap berada di folder `css`, jangan di root.
5. Commit dengan pesan: `Fix mobile Studio layout v7.0.1`.
6. Tunggu GitHub Pages deploy.
7. Buka situs lalu hapus data/cache situs atau instal ulang PWA agar Service Worker v7.0.1 terpasang.
