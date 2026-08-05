# Audit V-Forge v8.2.1

Audit dilakukan terhadap file repository `bayz-dik/V-Forge` branch `main` yang cocok dengan paket v8.2.0.

## Bug yang ditemukan

1. Template Library mewarisi `grid-auto-flow: column` dari carousel lama. Override v8.2 hanya mengganti jumlah kolom, sehingga kartu berikutnya tetap dibuat ke samping dan keluar dari layar.
2. Beberapa horizontal rail belum memiliki gesture/touch policy yang tegas pada layar Android sempit.
3. Create Sheet dan Permission Sheet tidak memiliki batas tinggi dan internal scroll.
4. Root page scroll masih bergantung pada aturan lama `overscroll-behavior-y: none`, sehingga terasa terkunci pada beberapa browser/PWA.
5. Scroll-lock modal dapat tertinggal setelah perpindahan halaman atau restore PWA.
6. Navigasi tidak melakukan reset scroll kedua setelah layout/render dinamis selesai.

## Hasil pengujian hotfix

- Template grid: 6 kartu, 2 kolom, 3 baris, seluruh kartu berada dalam tinggi dokumen.
- Templates: scroll vertikal terdeteksi hingga 727 px pada viewport 390×844.
- Projects: scroll vertikal terdeteksi hingga 1671 px dengan 20 proyek uji.
- Home carousel: scroll horizontal terdeteksi hingga 972 px.
- Kategori template pada viewport 320 px: scroll horizontal 47 px.
- Filter project pada viewport 320 px: scroll horizontal 37 px.
- Editor Effects pada viewport 360×600: internal tool scroll terdeteksi 86 px.
- Create Sheet pada viewport 320 px tinggi: internal scroll terdeteksi.
- Modal → Templates: body lock dilepas, scroll kembali ke 0, sheet tertutup.
- Seluruh JavaScript lolos `node --check`.
- Tidak ada ID HTML ganda dan tidak ada inline handler yang hilang.
- Seluruh aset Service Worker ditemukan.
