# Checklist Tes Authentication v1 di HP

Lakukan setelah seluruh isi folder V-Forge selesai diunggah dan GitHub Pages sudah deploy.

## 1. Pemisahan halaman

- Buka aplikasi saat belum login.
- Yang boleh terlihat hanya layar **Masuk**.
- Home dan navigasi bawah tidak boleh muncul di belakangnya.

## 2. Login dan sesi

- Coba email dengan format salah; pesan validasi harus muncul.
- Login menggunakan akun Firebase yang sudah ada.
- Tutup aplikasi/PWA, lalu buka kembali.
- Jika **Tetap masuk** dicentang, aplikasi harus langsung membuka Home.

## 3. Pendaftaran

- Buat akun memakai email lain yang belum terdaftar.
- Password dan ulangi password harus sama serta minimal 6 karakter.
- Setelah berhasil, Firebase Authentication harus menampilkan user baru.
- Firestore → koleksi `users` harus menampilkan dokumen dengan UID yang sama.

## 4. Reset password

- Keluar dari akun.
- Tekan **Lupa password?** lalu masukkan email akun.
- Periksa Inbox dan folder Spam.
- Link reset seharusnya dikirim oleh Firebase.

## 5. Logout dan proteksi

- Buka Profile → **Log out**.
- Dialog konfirmasi harus muncul.
- Setelah memilih **Keluar**, aplikasi harus kembali ke layar Masuk.
- Home tidak boleh dapat dibuka sebelum login lagi.

Jika ada bagian yang gagal, kirim screenshot layar dan jelaskan nomor tes yang gagal.
