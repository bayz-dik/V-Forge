# Urutan Upload V-Forge v8 Melalui HP

Gunakan ZIP **V-Forge-v8.0.0-FOCUS-REDESIGN-GITHUB-UPDATE.zip**.

## 1. Ekstrak ZIP

Setelah diekstrak, buka folder `V-Forge`.

## 2. Upload file root

Buka repository `bayz-dik/V-Forge`, lalu pada halaman utama pilih **Add file → Upload files**.

Upload file berikut:

- `index.html`
- `manifest.json`
- `service-worker.js`
- `README.md`
- `RELEASE-NOTES-V8.md`
- `UPLOAD-GITHUB-V8-HP.md`
- `TEST-V8-REDESIGN.md`

Commit dengan pesan:

```text
Redesign V-Forge Focus UI v8
```

## 3. Upload CSS

Buka folder `css` pada repository, lalu upload:

- `style.css`

Commit dengan pesan:

```text
Update V-Forge v8 visual system
```

## 4. Upload JavaScript

Buka folder `js`, lalu upload:

- `projects.js`
- `studio.js`
- `v8-ui.js`

`v8-ui.js` adalah file baru. Dua file lainnya mengganti versi lama.

Commit dengan pesan:

```text
Add V-Forge v8 editor navigation
```

## 5. Periksa struktur

```text
V-Forge/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
└── js/
    ├── projects.js
    ├── studio.js
    └── v8-ui.js
```

Jangan membuat struktur `V-Forge/V-Forge/index.html`.

## 6. Bersihkan cache PWA

Setelah GitHub Pages selesai deploy:

1. Hapus V-Forge lama dari layar utama apabila sudah dipasang sebagai PWA.
2. Buka Setelan browser → Setelan situs.
3. Cari `bayz-dik.github.io`.
4. Hapus data situs dan cache.
5. Buka kembali `https://bayz-dik.github.io/V-Forge/`.
6. Pasang ulang PWA setelah v8 terlihat.
