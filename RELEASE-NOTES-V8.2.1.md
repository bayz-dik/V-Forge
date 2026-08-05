# V-Forge v8.2.1 — Scroll & Navigation Reliability

## Perbaikan penting

- Memperbaiki Template Library yang mewarisi `grid-auto-flow: column`, sehingga kartu ketiga dan seterusnya keluar ke sisi kanan layar dan tidak dapat dijangkau.
- Memastikan Home, Templates, Projects, dan Profile dapat digulir vertikal menggunakan root page scroll.
- Menambahkan gesture horizontal yang stabil untuk proyek terbaru, kategori template, filter proyek, dan pilihan Effects.
- Membuat Create Sheet dan Permission Sheet dapat digulir pada layar pendek, mode landscape, dan saat keyboard muncul.
- Membuat panel alat editor tetap dapat digulir tanpa menggeser preview atau timeline.
- Memperbaiki scroll-lock yang dapat tertinggal setelah modal, onboarding, atau project detail ditutup.
- Memperbaiki perpindahan halaman agar input kehilangan fokus, posisi scroll kembali ke atas, dan `aria-current` navigasi selalu sinkron.
- Cache PWA dinaikkan ke `vforge-v8-2-1-scroll-reliability`.

## File yang berubah

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/v8-ui.js`
- `service-worker.js`
- `manifest.json`
- `README.md`
