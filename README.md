# V-Forge — Mobile Video Studio Sprint V9

V-Forge adalah editor video local-first berbasis PWA. Video sumber dan hasil ekspor tetap berada di HP. Firebase Spark digunakan untuk Authentication, profil, dan metadata proyek Firestore.

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
