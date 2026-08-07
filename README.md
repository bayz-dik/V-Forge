# V-Forge v9.0.2 — Full-Frame Mobile Preview

# V-Forge — Mobile Video Studio v9.0.1

V-Forge adalah editor video local-first berbasis PWA. Video sumber dan hasil ekspor tetap berada di HP. Firebase Spark digunakan untuk Authentication, profil, dan metadata proyek Firestore.


## Hotfix v9.0.1 — Mobile Editor

- Editor tidak lagi melebar keluar viewport HP.
- Header, preview, timeline, panel alat, dan dock memakai layout grid penuh yang stabil.
- Dock alat tidak lagi menutupi tombol dan form editor.
- Timeline tetap dapat digeser horizontal tanpa membuat halaman ikut melebar.
- Panel Edit, Audio, Text, Overlay, Effects, Adjust, dan Export dapat digulir vertikal.
- Tinggi editor mengikuti `visualViewport`, termasuk ketika keyboard Android terbuka.
- Landscape menggunakan komposisi dua panel agar preview dan alat tetap terbaca.

## Sprint V9

- Home berisi CTA editor dan misi harian, tanpa Projects ganda.
- Tombol `+` langsung menuju editor.
- Misi beta dihitung dari proyek Firestore secara real-time.
- Premium tetap terkunci secara aman pada paket Spark.
- Dark/light theme konsisten di seluruh halaman.
- Typography, scrolling, safe area, dan editor motion ditingkatkan.
- Attraction animation editor berganti pesan secara halus.

## Backend

Folder `functions/` sudah benar dan disimpan untuk tahap Firebase Blaze:

```text
functions/
├── index.js
└── package.json
```

Pada Sprint V9 Spark, SDK Functions sengaja tidak dimuat. Field `points`, `isPremium`, mission claims, dan entitlement tetap dikunci oleh Firestore Rules.

## Struktur

```text
index.html
css/style.css
js/app.js
js/auth.js
js/firebase-config.js
js/projects.js
js/workspace.js
js/processor.js
js/studio.js
js/v9-ui.js
functions/index.js
functions/package.json
firebase.json
firestore.rules.txt
manifest.json
service-worker.js
```

Lihat `UPLOAD-GITHUB-V9-HP.md`, `AUDIT-V9.md`, dan `TEST-V9.md`.
Pages redeploy V9.2.4 — 2026-08-07
