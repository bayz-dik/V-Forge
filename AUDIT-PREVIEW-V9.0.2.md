# Audit Preview Editor Mobile v9.0.2

## Temuan

Preview v9.0.1 memenuhi seluruh kotak stage. Pada sebagian kombinasi class rasio dan CSS lama, aturan `object-fit: cover` masih dapat memenangkan cascade sehingga video portrait terlihat seperti landscape yang dipotong.

## Perbaikan

1. Semua selector video workspace dipaksa ke `object-fit: contain !important`.
2. Canvas tidak lagi selalu selebar stage.
3. JavaScript menghitung lebar dan tinggi canvas berdasarkan ruang tersedia dan rasio sumber/output.
4. Metadata tidak lagi mengambang di atas isi video.
5. ResizeObserver, MutationObserver, visualViewport, resize, dan orientationchange menyinkronkan ukuran preview.

## Prinsip UX

- **Fit** menjadi perilaku default.
- Aplikasi tidak boleh memotong media pengguna otomatis.
- Crop/Fill harus menjadi tindakan sadar pengguna dan memiliki tombol reset.
