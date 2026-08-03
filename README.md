# V-Forge — Authentication v1

Versi ini sudah menyelesaikan Login, Daftar, Reset Password, session persistence, proteksi halaman, konfirmasi Logout, dan pembuatan dokumen user di Firestore. Panduan pengujian dari HP tersedia di `TEST-AUTH-V1.md`.

## Struktur Project

```
vforge/
├── index.html          # Struktur halaman (HTML murni, tanpa CSS/JS inline)
├── css/
│   └── style.css        # Semua styling aplikasi
├── js/
│   └── app.js           # Semua logika aplikasi (navigasi, state, interaksi)
├── assets/
│   └── images/          # Taruh foto/gambar produk di sini
│       ├── 1000069349.jpg   (Mazda - WAJIB diisi, sekarang masih kosong)
│       ├── 1000069350.jpg   (Nissan Silvia - WAJIB diisi)
│       └── 1000069352.jpg   (Porsche - WAJIB diisi)
└── icons/                # (disiapkan untuk kebutuhan PWA nanti)
```

## Catatan Penting

1. **3 file gambar di `assets/images/` masih placeholder/belum ada.**
   Upload foto asli kamu dengan nama file yang SAMA PERSIS seperti di atas,
   atau ganti nama filenya di `css/style.css` (baris ~231-234) dan
   `js/app.js` (baris ~13-14) sesuai nama file kamu.

2. **Status project saat ini: Authentication v1 sudah terhubung ke Firebase.**
   Login dan data dasar akun sudah aktif. Poin, history, notifikasi,
   subscription, Library, dan Analytics masih berupa prototipe/simulasi.

3. **Fitur render video masih simulasi** (`setTimeout`), belum memproses
   file video sungguhan.

## Langkah Selanjutnya (disarankan urut)

1. ✅ Pisah HTML/CSS/JS
2. ✅ Setup PWA dasar
3. ✅ Authentication v1 + dokumen user Firestore
4. ⬜ Profile Sync (nama, username, tanggal lahir, foto profil)
5. ⬜ Project/History dan upload video
6. ⬜ Rendering video melalui backend cloud
