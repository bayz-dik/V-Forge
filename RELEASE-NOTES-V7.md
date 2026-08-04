# V-Forge Motion Studio v7.0.0

## Fitur utama

- Hero otomotif animatif dengan logo V-Forge berjalan, wheel-spin, smoke trail, dan slider showcase.
- Template Studio: Clean Cut, Creator Pop, Velocity Drive, Minimal Story, Neon Rush, dan Cinematic Drive.
- Preset template mengatur rasio, FPS, resolusi, transisi, efek warna, audio, serta intensitas motion.
- Smart Timeline di workspace dengan preview transisi, waveform, playhead, undo, dan redo.
- Transisi: Hard Cut, Cross Dissolve, Soft Fade, Whip Pan, Zoom Punch, Film Burn, Glitch Split, dan Liquid Warp.
- Color effect: Natural, Vibrant, Cinema, Soft Film, Mono, Neon, dan Cinema Pro.
- Efek warna, motion preset, dan intro/outro transition ikut dirender ke hasil ekspor Canvas/MediaRecorder—bukan hanya tampilan UI.
- Onboarding studio empat tahap yang hanya muncul sekali per akun dan dapat dibuka kembali lewat tombol Tour.
- Project card menyimpan dan menampilkan template serta transisi terpilih.
- Optimasi animasi untuk Chrome/Brave Android: transform/opacity, pause saat tab tidak terlihat, IntersectionObserver, dan prefers-reduced-motion.
- Service Worker diperbarui ke cache v7 dan menyimpan asset gambar serta `studio.js`.

## File baru

- `js/studio.js`
- `RELEASE-NOTES-V7.md`
- `TEST-MOTION-STUDIO-V7.md`

## File diperbarui

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/projects.js`
- `js/workspace.js`
- `service-worker.js`
- `README.md`

## Catatan

Animasi dirancang agar terasa halus, tetapi frame rate aktual tetap bergantung pada kemampuan HP, browser, suhu perangkat, dan ukuran video. Fitur Premium tetap memakai status subscription terverifikasi yang sudah ada.
