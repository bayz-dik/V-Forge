# Audit Editor Mobile V-Forge v9.0.1

## Temuan utama

Pada viewport 393×852, elemen preview memiliki lebar sekitar 525 px walaupun viewport hanya 393 px. Timeline dan form ikut melebar menjadi sekitar 545 px. Hal ini membuat sebagian antarmuka berada di luar layar dan menyebabkan tampilan terasa acak.

Penyebab teknis:

1. `workspace-video-frame` memakai `aspect-ratio: 16 / 9` dan tinggi 100% tanpa batas lebar yang tegas.
2. Grid editor memakai ukuran minimum berdasarkan konten, sehingga elemen yang terlalu lebar memperbesar kolom grid.
3. Header dan dock memakai posisi absolute, sehingga keduanya menimpa ruang preview atau panel alat.
4. Tool sheet masih menyediakan padding untuk dock absolute, tetapi pada layar pendek tombol tetap dapat tertutup.
5. Tidak ada sinkronisasi tinggi dengan `visualViewport` ketika toolbar browser atau keyboard Android berubah.

## Perbaikan

- Lebar seluruh rantai layout dikunci ke viewport: page → shell → preview → timeline → form.
- `min-width: 0` diterapkan pada semua grid child penting.
- Aspect ratio preview tidak lagi menentukan lebar layout; video memakai `object-fit: contain`.
- Timeline menjadi scroll container horizontal dengan track minimum 520 px.
- Dock dipindahkan menjadi row ketiga pada grid halaman.
- Tool sheet menjadi scroll container vertikal yang independen.
- Visual Viewport disinkronkan ke CSS variable `--vf-editor-height`.
- Breakpoint khusus diterapkan untuk HP kecil, layar pendek, dan landscape.

## Hasil pengujian layout

| Viewport | Document overflow | Preview | Timeline | Tool sheet | Dock |
|---|---:|---:|---:|---:|---:|
| 393×852 | Tidak ada | 377 px | 393 px | Scroll aktif | Tepat di bawah |
| 360×740 | Tidak ada | 344 px | 360 px | Scroll aktif | Tepat di bawah |
| 320×640 | Tidak ada | 304 px | 320 px | Scroll aktif | Tepat di bawah |
| 844×390 | Tidak ada | 477 px | 489 px | Panel kanan scroll | Tepat di bawah |

Semua tujuh panel editor diuji pada viewport 393×852 dan 320×640. Tidak ditemukan overflow horizontal pada dokumen atau form.
