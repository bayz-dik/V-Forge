# Checklist Pengujian Editor Mobile v9.0.1

## Setelah upload

1. Buka V-Forge tanpa mode desktop.
2. Tekan tombol `+`.
3. Batalkan pemilihan video untuk melihat empty editor.
4. Pastikan seluruh header terlihat dan tombol Export berada di kanan.
5. Pastikan preview tidak melebar keluar layar.
6. Geser timeline ke kiri dan kanan.
7. Buka panel Edit lalu gulir sampai tombol Simpan draft.
8. Buka Audio, Text, Overlay, Effects, Adjust, dan Export.
9. Pastikan setiap panel dapat digulir jika isinya lebih tinggi dari ruang yang tersedia.
10. Buka keyboard pada kolom nama proyek. Pastikan form tetap dapat dijangkau.
11. Putar HP ke landscape. Preview harus berada di kiri dan alat di kanan.
12. Kembali ke portrait. Layout harus tersusun ulang tanpa reload.

## Ukuran yang diuji otomatis

- 393×852
- 360×740
- 320×640
- 844×390 landscape

## Pemeriksaan statis

- JavaScript syntax: lulus.
- CSS parse: lulus tanpa error.
- HTML duplicate ID: tidak ada.
- Referensi aset lokal: lengkap.
- Service Worker precache: seluruh file ditemukan.
