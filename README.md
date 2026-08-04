# V-Forge — Motion Studio v7.0.0

Versi ini menambahkan Template Studio, Smart Timeline, preview transisi, efek warna, onboarding premium, project card modern, dan optimasi motion untuk browser Android. Lihat `RELEASE-NOTES-V7.md` untuk detail.

# V-Forge — AI Video Studio

Versi: **7.0.1 — Motion Studio Mobile Layout Hotfix**

## Fitur yang sudah terhubung

- Firebase Authentication: daftar, login, logout, reset password, dan sesi tetap masuk.
- Profile Sync v1: nama, username, dan tanggal lahir tersimpan real-time di Firestore.
- Project & History v1: metadata draft proyek tersimpan real-time per akun.
- Video Workspace v1.2: preview video lokal, rasio, target 720p/1080p/4K, target 30/60/120 FPS, kualitas audio, dan penanda fitur Premium.
- Video Processing v1.2: crop rasio, perubahan resolusi, FPS, audio opsional, progress, jeda, batal, preview hasil, serta ekspor video nyata di perangkat.
- Hi-Res Lossless: menghasilkan file audio pendamping WAV PCM 24-bit dengan sample rate hingga 96 kHz sesuai dukungan perangkat.
- Premium entitlement: 4K, 120 FPS, dan Hi-Res Lossless hanya terbuka untuk subscription yang terverifikasi backend.
- PWA: dapat dipasang dari browser Android dan berjalan tanpa address bar.

## Struktur utama

```text
index.html
css/style.css
js/firebase-config.js
js/app.js
js/projects.js
js/workspace.js
js/processor.js
js/auth.js
assets/images/
icons/
manifest.json
service-worker.js
firestore.rules.txt
```

## Struktur data Firestore

```text
users/{uid}
users/{uid}/projects/{projectId}
```

Setiap dokumen proyek mempunyai status:

```text
draft → uploading → processing → completed / failed
```

Video Workspace memakai Object URL lokal milik browser untuk menampilkan preview tanpa mengunggah isi file. Saat draft disimpan, Firestore menerima metadata sumber dan setelan workspace saja. File harus dipilih ulang setelah aplikasi ditutup karena browser tidak mengizinkan aplikasi web menyimpan akses permanen ke video perangkat.

Video Processing memakai Canvas, Web Audio, dan MediaRecorder. Format MP4 dipakai jika encoder browser mendukungnya; jika tidak, aplikasi memakai WebM. Pemrosesan berjalan real-time, maksimal 5 menit untuk mode normal, dan dijeda saat aplikasi masuk ke latar belakang. Mode Premium 4K, 120 FPS, atau Hi-Res Lossless dibatasi 60 detik untuk menjaga memori dan suhu HP.

4K dan 120 FPS merupakan target permintaan ke encoder. Resolusi aktual, frame rate aktual, format, dan kelancaran tetap bergantung pada browser, codec, kemampuan perangkat, sumber video, memori, serta kondisi suhu. Sumber ber-FPS rendah tidak memperoleh gerakan baru hanya dengan memilih 120 FPS.

Mode Hi-Res Lossless membuat WAV PCM 24-bit terpisah. Audio di dalam video MP4/WebM tetap memakai codec encoder browser dengan target bitrate tinggi. Konversi ke WAV tidak dapat memulihkan detail yang sudah hilang dari audio sumber terkompresi. Setelah ekspor berhasil, tekan **Simpan video** dan—jika mode lossless dipilih—**Simpan WAV** sebelum menutup workspace.

Firestore hanya menyimpan catatan ekspor. File sumber dan hasil tidak diunggah ke cloud, sehingga Firebase Storage dan paket berbayar tidak diperlukan. Upload cloud tetap belum dijalankan pada versi ini.

## Keamanan

Publikasikan isi `firestore.rules.txt` melalui Firebase Console. Aturan tersebut memastikan akun hanya dapat membuka profil dan subkoleksi proyek miliknya sendiri, menolak perubahan field subscription dari aplikasi klien, serta menolak metadata output Ultra dari akun Free.

Status Premium efektif hanya jika dokumen user berisi `isPremium: true` dan `subscriptionStatus: "active"`. Kedua field tersebut harus diubah oleh backend pembayaran melalui Firebase Admin SDK. Tombol subscription pada versi ini tidak mengubah entitlement karena checkout/webhook pembayaran belum dihubungkan.

Lihat `UPLOAD-VIDEO-PROCESSING-V1.md` dan `TEST-VIDEO-PROCESSING-V1.md` untuk langkah pemasangan dan pengujian dari HP Android.
