# TEST Sprint V9

## Setelah upload

1. Bersihkan data situs/PWA lama.
2. Login menggunakan akun Firebase.
3. Uji Home dapat digulir dari hero sampai misi terakhir.
4. Tekan CTA Home dan tombol `+`; keduanya harus langsung membuka editor dan file picker satu kali.
5. Batalkan file picker; attraction animation harus tetap terlihat.
6. Pilih video; attraction harus menghilang dan preview muncul.
7. Simpan draft; kembali ke Home dan pastikan misi draft berubah.
8. Buka Templates dan geser kategori horizontal.
9. Buka Projects dan gulir sampai item terakhir.
10. Buka Settings, ubah dark/light, lalu kunjungi Premium dan Notifications.
11. Tutup dan buka PWA; tema harus tetap tersimpan.
12. Pastikan tombol reward menjelaskan Spark Beta dan tidak mengaktifkan Premium.

## Expected

- Tidak ada body scroll lock yang tertinggal.
- Tidak ada menu pembuatan ganda.
- Tidak ada saldo demo 348.
- Tidak ada panggilan Firebase Functions pada build Spark.
- Video tidak diunggah ke Firestore.
