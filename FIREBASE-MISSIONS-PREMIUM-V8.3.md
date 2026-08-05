# Firebase Misi & Premium v8.3 — Panduan Pemula

## Mengapa ada frontend dan backend?

Frontend adalah tampilan yang dibuka pengguna. Kode frontend dapat dilihat dan dimodifikasi melalui browser, sehingga frontend **tidak boleh** menjadi pihak yang memberikan Premium.

Backend Firebase Cloud Functions berjalan di server. Backend memeriksa data proyek, memberikan poin satu kali, mengurangi 1.000 poin, lalu mengaktifkan Premium 30 hari secara aman.

## Data yang digunakan

```text
users/{UID}
  points
  completedTasks
  dailyMissionState
  isPremium
  subscriptionStatus
  subscriptionExpiresAt

users/{UID}/projects/{PROJECT_ID}
  status
  templateId
  createdAt
  updatedAt
  lastExportedAt
```

## Misi harian

- Buat satu draft: +50 poin.
- Ekspor satu video: +100 poin.
- Gunakan dua template berbeda: +150 poin.
- Simpan tiga draft: +200 poin.

Periode harian mengikuti zona waktu Asia/Jakarta.

## Cara deploy paling aman melalui laptop/PC

1. Instal Node.js versi LTS.
2. Buka Terminal pada folder project V-Forge.
3. Instal Firebase CLI:

```bash
npm install -g firebase-tools
```

4. Login:

```bash
firebase login
```

5. Hubungkan project:

```bash
firebase use --add
```

Pilih project ID:

```text
v-forge-app
```

6. Instal dependency Functions:

```bash
cd functions
npm install
cd ..
```

7. Deploy Firestore Rules:

```bash
firebase deploy --only firestore:rules
```

8. Deploy Functions:

```bash
firebase deploy --only functions
```

9. Buka V-Forge, logout lalu login kembali.
10. Buat draft. Misi pertama harus berubah real-time dan poin masuk otomatis.

## Dari HP

Proses frontend GitHub bisa dilakukan melalui browser HP. Deployment Functions lebih nyaman melalui laptop. Alternatifnya gunakan terminal cloud/Codespaces yang dapat menjalankan Node.js dan Firebase CLI, lalu jalankan perintah yang sama.

## Jika belum deploy Functions

- UI Misi tetap membaca progres proyek yang sudah sinkron.
- Tombol Premium tidak akan mengubah entitlement.
- Aplikasi menampilkan pesan bahwa backend hadiah belum dipasang.
- Ini disengaja agar Premium tidak dapat diaktifkan secara palsu dari browser.

## Pengujian

1. Buat satu draft baru.
2. Pastikan `dailyMissionState.progress.firstDraft` menjadi `1`.
3. Pastikan `dailyMissionState.claimed.firstDraft` menjadi `true`.
4. Pastikan points bertambah 50 hanya satu kali.
5. Edit draft yang sama lagi; poin tidak boleh bertambah untuk misi yang sama.
6. Setelah points mencapai 1.000, tekan Aktifkan.
7. Periksa `isPremium: true`, `subscriptionStatus: active`, dan tanggal kedaluwarsa.
