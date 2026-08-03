# V-Forge - AI Video Studio

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

2. **Status project saat ini: Frontend/UI prototype.**
   Semua data (poin, history, notifikasi, subscription) masih disimulasikan
   di JavaScript — belum tersambung ke server/database sungguhan.
   Refresh browser = data kembali ke kondisi awal.

3. **Fitur render video masih simulasi** (`setTimeout`), belum memproses
   file video sungguhan.

## Langkah Selanjutnya (disarankan urut)

1. ✅ Pisah HTML/CSS/JS — **SUDAH SELESAI**
2. ⬜ Setup PWA (manifest.json + service-worker.js + icons) → supaya bisa
   di-install ke HP/desktop
3. ⬜ Bangun backend (auth, database untuk user/poin/history)
4. ⬜ Integrasi proses video sungguhan (client-side ringan + server-side berat)
