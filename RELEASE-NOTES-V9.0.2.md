# V-Forge v9.0.2 — Full-Frame Preview

## Fokus rilis

Preview editor mobile sekarang selalu menampilkan seluruh frame video, termasuk video portrait, tanpa memotong bagian atas, bawah, kiri, atau kanan.

## Perubahan

- Preview memakai mode **Fit / Contain** secara paksa untuk semua rasio.
- Ukuran canvas dihitung ulang dari resolusi sumber dan rasio output.
- Video portrait tampil vertikal di tengah seperti Wink dan CapCut.
- Informasi file, durasi, dan resolusi dipindahkan ke bar di bawah canvas agar tidak menutupi video.
- Area preview mendapat porsi lebih besar; timeline dan panel alat tetap dapat digunakan.
- Ukuran preview disinkronkan saat metadata video terbaca, rasio berubah, layar diputar, keyboard terbuka, atau viewport Android berubah.
- Tidak ada horizontal overflow.
- Cache PWA: `vforge-v9-0-2-full-frame-preview`.

## Catatan

Pilihan rasio 9:16, 16:9, dan 1:1 mengubah bentuk canvas, tetapi sumber video tetap ditampilkan utuh. Fitur Fill/Crop manual akan dibuat sebagai alat terpisah pada sprint berikutnya agar aplikasi tidak memotong video tanpa izin pengguna.
