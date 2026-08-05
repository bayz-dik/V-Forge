# V-Forge v9.0.1 — Mobile Editor Layout Fix

Rilis ini berfokus pada bug editor yang terlihat rapi hanya ketika browser memakai mode desktop. Penyebab utamanya adalah ukuran elemen preview mengikuti rasio 16:9 berdasarkan tinggi, sehingga lebarnya melebihi viewport HP. Lebar tersebut kemudian ikut memperbesar timeline dan panel alat.

## Perubahan

- Editor menjadi halaman fixed full-screen dengan tiga bagian: header, workspace, dan dock alat.
- Header tidak lagi menimpa preview.
- Preview dipaksa mengikuti lebar viewport dan tidak dapat memperbesar layout.
- Timeline memiliki lebar layar tetap, sedangkan track di dalamnya dapat digeser horizontal.
- Panel alat menjadi satu-satunya area yang bergulir vertikal.
- Dock alat menjadi bagian layout, bukan elemen absolute yang menutupi form.
- Semua panel Edit, Audio, Text, Overlay, Effects, Adjust, dan Export memiliki lebar aman.
- Tinggi editor mengikuti Visual Viewport untuk membantu saat keyboard Android muncul.
- Layout landscape memakai dua kolom: preview/timeline di kiri dan panel alat di kanan.
- Query version seluruh file lokal dinaikkan ke `9.0.1`.
- Cache PWA dinaikkan menjadi `vforge-v9-0-1-mobile-editor-layout`.

## Status fitur

Perbaikan ini tidak mengubah Firebase Spark, data proyek, Premium lock, atau sistem ekspor. Fokusnya hanya stabilitas layout dan interaksi editor pada perangkat mobile.
