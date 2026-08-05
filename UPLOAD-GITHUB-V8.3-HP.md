# Urutan Upload GitHub v8.3 dari HP

Gunakan ZIP `GITHUB-UPDATE`, bukan Full Project.

## A. File root

Buka halaman utama repository `bayz-dik/V-Forge`, lalu upload/replace:

```text
index.html
manifest.json
service-worker.js
README.md
firestore.rules.txt
firebase.json
RELEASE-NOTES-V8.3.md
FIREBASE-MISSIONS-PREMIUM-V8.3.md
TEST-V8.3.md
UPLOAD-GITHUB-V8.3-HP.md
SHA256SUMS.txt
```

Commit:

```text
Rebuild missions theme and editor attraction v8.3
```

## B. Folder css

Buka folder `css`, replace:

```text
style.css
```

Commit:

```text
Unify dark light themes and mission UI
```

## C. Folder js

Buka folder `js`, replace:

```text
app.js
auth.js
firebase-config.js
projects.js
workspace.js
v8-ui.js
```

Commit:

```text
Connect direct editor flow and Firebase mission UI
```

## D. Folder functions

Di halaman root repository tekan Add file → Upload files. Pilih folder/files berikut dengan struktur:

```text
functions/index.js
functions/package.json
```

GitHub harus menampilkan folder `functions`, bukan menaruh `index.js` Functions di root.

Commit:

```text
Add secure Firebase mission and premium backend
```

## E. Bersihkan cache

1. Tunggu GitHub Pages selesai.
2. Hapus data situs `bayz-dik.github.io` dari browser.
3. Hapus PWA V-Forge lama bila sudah terpasang.
4. Buka situs dua kali.
5. Pasang ulang sebagai aplikasi.

## F. Firebase

Upload GitHub hanya memperbarui tampilan. Untuk poin dan Premium reward yang aman, lanjutkan ke `FIREBASE-MISSIONS-PREMIUM-V8.3.md`.
