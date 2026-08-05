# V-Forge v8.2.0 — Native Navigation Rebuild

Versi ini membangun ulang arsitektur UI agar terasa seperti aplikasi editor video mobile, bukan dashboard web.

## Perubahan utama
- Home dipangkas: hanya tombol proyek baru, proyek terbaru, dan satu banner Premium.
- Templates menjadi halaman khusus dengan pencarian, kategori, featured template, dan CTA aktif.
- Projects menjadi halaman khusus dengan status sinkronisasi, statistik, pencarian, filter, dan daftar proyek.
- Tombol tengah membuka create sheet: proyek baru, gunakan template, atau lanjutkan proyek.
- Editor menjadi full-screen: preview, timeline, panel alat kontekstual, dan dock bawah.
- Panel editor dipisah menjadi Edit, Audio, Text, Overlay, Effects, Adjust, dan Export.
- Bottom navigation tetap tampil pada halaman utama, Templates, Projects, dan Profile.
- Video dan hasil ekspor tetap local-first; cloud hanya menyimpan metadata kecil.
- Firebase Auth, Firestore project sync, Premium lock, dan video processor lama tetap dipertahankan.

## Catatan
Text, overlay, sound library, dan masking ditampilkan sebagai jalur fitur tetapi belum memproses layer nyata. Tombolnya menampilkan status SOON agar UI jujur dan tidak memberi kesan fitur palsu.
