# Upload V-Forge v9.0.1 dari HP Android

Gunakan ZIP `V-Forge-v9.0.1-MOBILE-EDITOR-FIX-GITHUB-UPDATE.zip`.

## 1. Ekstrak ZIP

Setelah diekstrak, buka folder `V-Forge`.

## 2. Upload file root

Di halaman utama repository GitHub, upload dan ganti:

- `index.html`
- `service-worker.js`
- `README.md`
- `RELEASE-NOTES-V9.0.1.md`
- `AUDIT-EDITOR-MOBILE-V9.0.1.md`
- `TEST-EDITOR-MOBILE-V9.0.1.md`
- `UPLOAD-GITHUB-V9.0.1-HP.md`
- `SHA256SUMS.txt`

Pesan commit:

```text
Fix full mobile editor layout v9.0.1
```

## 3. Upload CSS

Masuk ke folder `css` di GitHub. Upload dan replace:

- `style.css`

Pesan commit:

```text
Fix editor viewport timeline and dock
```

## 4. Upload JavaScript

Masuk ke folder `js`. Upload dan replace:

- `v9-ui.js`

Pesan commit:

```text
Sync editor with Android visual viewport
```

## 5. Jangan mengubah Functions

Folder berikut tetap dibiarkan:

```text
functions/
├── index.js
└── package.json
```

Perbaikan editor ini tidak membutuhkan Firebase Blaze atau deployment Functions.

## 6. Bersihkan cache

Sesudah GitHub Pages selesai deploy:

1. Hapus PWA V-Forge lama dari layar utama.
2. Buka Setelan Brave/Chrome.
3. Hapus data situs `bayz-dik.github.io`.
4. Tutup browser sepenuhnya.
5. Buka kembali situs V-Forge.
6. Refresh dua kali.
7. Pasang ulang sebagai aplikasi.

Service Worker baru memakai cache `vforge-v9-0-1-mobile-editor-layout`.
