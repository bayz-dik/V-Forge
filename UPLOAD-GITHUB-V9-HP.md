# Upload Sprint V9 dari HP Android

Gunakan ZIP **GITHUB-UPDATE**, bukan Full, untuk repository yang sudah berisi V-Forge v8.3.

## 1. File root

Upload/replace di halaman utama repository:

- `index.html`
- `manifest.json`
- `service-worker.js`
- `README.md`
- `firestore.rules.txt`
- `RELEASE-NOTES-V9.md`
- `AUDIT-V9.md`
- `TEST-V9.md`
- `UPLOAD-GITHUB-V9-HP.md`
- `SHA256SUMS.txt`

Commit: `Start V-Forge Sprint V9 Spark app shell`

## 2. CSS

Buka folder `css`, replace `style.css`.

Commit: `Unify V9 mobile theme and scrolling`

## 3. JavaScript

Buka folder `js`, upload/replace:

- `app.js`
- `firebase-config.js`
- `v9-ui.js` (file baru)

Commit: `Add Spark-safe missions and V9 editor motion`

`js/v8-ui.js` tidak lagi dipanggil oleh `index.html`. Boleh dibiarkan sebagai arsip. Setelah V9 stabil, file itu boleh dihapus agar repository lebih rapi.

## 4. Functions

Jangan pindahkan dan jangan hapus:

```text
functions/index.js
functions/package.json
```

Keduanya belum dideploy pada Firebase Spark, tetapi disimpan untuk tahap Blaze.

## 5. Cache

- Tunggu GitHub Pages selesai deploy.
- Hapus data situs `bayz-dik.github.io`.
- Hapus PWA lama.
- Buka situs kembali dan pasang ulang.
