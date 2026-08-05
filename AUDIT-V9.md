# AUDIT Sprint V9

## Scope

Audit dilakukan pada navigasi SPA, scroll mobile, tema, mission UI, editor shell, Firebase Spark compatibility, PWA cache, dan struktur Functions.

## Temuan dan tindakan

| Area | Temuan | Tindakan V9 |
|---|---|---|
| Home | Beberapa style lama memakai `overflow:hidden` | V9 memaksa alur vertikal normal dan `touch-action: pan-y` |
| Mission | UI sebelumnya mencoba Functions yang belum dideploy | Build Spark tidak memuat SDK Functions; reward diberi label beta |
| Points | Nilai demo awal 348 dapat terlihat seperti saldo nyata | Nilai awal diubah menjadi 0 dan hanya profil server yang dianggap terverifikasi |
| Navigation | CTA ganda pernah membuka bottom sheet | `+` dan CTA Home memakai satu fungsi direct-to-editor dengan launch lock |
| Theme | Halaman lama memakai token putih/gelap sendiri | V9 memberi token tema global dan override halaman lama |
| Readability | Banyak label hanya 6–9 px | Typography mobile dinaikkan secara konsisten |
| Templates | Grid lama berpotensi mengalir horizontal | `grid-auto-flow: row` dipaksa pada library V9 |
| Editor | Tool panel dan timeline dapat saling mengunci gesture | Tool panel `pan-y`; timeline dan dock `pan-x` |
| PWA | Cache lama bisa mempertahankan UI v8.3 | Cache key dan asset URLs menjadi 9.0.0 |
| Functions | Kode backend harus tetap terpisah | Struktur `functions/index.js` + `functions/package.json` dipertahankan |

## Risiko yang masih ada

- Codec dan performa export berbeda antar browser/HP.
- Text layer, overlay, keyframe, trim frame-accurate, dan AI tools belum menjadi engine nyata.
- Reward Premium belum berjalan pada Spark karena sengaja membutuhkan backend terpercaya.
- Pengujian Firebase nyata tetap perlu dilakukan memakai akun pengguna.

## Keputusan keamanan

Frontend tidak boleh menulis `isPremium`, `points`, atau entitlement. Firestore Rules tetap mengunci field server-managed. Folder Functions disimpan untuk deployment Blaze di masa depan.
