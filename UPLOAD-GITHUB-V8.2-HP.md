# Urutan Upload V-Forge v8.2 dari HP

1. Ekstrak ZIP update.
2. Di root repository upload dan replace: `index.html`, `manifest.json`, `service-worker.js`, `README.md`, `RELEASE-NOTES-V8.2.md`, dan `TEST-V8.2.md`.
3. Buka folder `css`, upload dan replace `style.css`.
4. Buka folder `js`, upload dan replace `app.js` serta `v8-ui.js`.
5. Commit dengan pesan: `Rebuild native navigation and editor UI v8.2`.
6. Tunggu GitHub Pages selesai deploy.
7. Hapus data situs/PWA lama agar service worker v8.2 aktif.

Jangan mengunggah folder pembungkus `V-Forge` ke dalam repository. `index.html` harus tetap berada di root repository.
