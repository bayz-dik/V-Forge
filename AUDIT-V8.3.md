# Audit V-Forge v8.3.0

## Pemeriksaan statis

- JavaScript frontend: seluruh file lolos `node --check`.
- Firebase Functions: `functions/index.js` lolos `node --check`.
- CSS: tidak ditemukan parse error.
- HTML: tidak ada ID ganda.
- Inline handlers: seluruh nama fungsi ditemukan di file JavaScript.
- Service Worker: seluruh aset lokal yang dicache tersedia.

## Pemeriksaan alur UI dengan browser headless

- Render misi menghasilkan 4 kartu.
- Dengan 1.000 poin, tombol reward berubah menjadi `Aktifkan` dan enabled.
- Tombol proyek baru memanggil halaman editor dan pemilih video satu kali.
- Perubahan tema dark → light memperbarui atribut tema dan class kompatibilitas.
- Editor attraction berubah ke state `has-video` saat video memiliki source.
- Halaman utama dengan misi memiliki tinggi lebih besar daripada viewport dan dapat digulir.
- Semua halaman utama menghasilkan background yang sama dengan tema aktif:
  - dark: `rgb(7, 7, 10)`
  - light: `rgb(243, 243, 247)`
- Profile menu memiliki label yang dapat dibaca.
- Settings card dan page background memiliki kontras yang benar di light mode.

## Hal yang tetap perlu diuji di HP nyata

- File picker Android/iOS.
- Preview codec video tertentu.
- Firebase Authentication dengan akun nyata.
- Deployment dan region Firebase Functions.
- Ekspor MediaRecorder pada perangkat target.
- Install/update PWA setelah cache lama dihapus.
