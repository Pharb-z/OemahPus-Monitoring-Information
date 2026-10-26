# PROJECT SPECIFICATION — OMI

## 1. Informasi Proyek

- **Nama aplikasi:** OMI
- **Kepanjangan:** OemahPus Monitoring and Information
- **Jenis aplikasi:** Sistem informasi pengelolaan pet hotel
- **Studi kasus:** Usaha OemahPus
- **Tujuan:** Membantu pengelolaan penitipan kucing, reservasi, data pelanggan, pemantauan kondisi kucing, dan layanan antar jemput.

## 2. Ruang Lingkup

OemahPus menyediakan layanan pet hotel dan grooming. Namun, aplikasi OMI yang dikembangkan hanya berfokus pada layanan pet hotel atau penitipan kucing.

Aplikasi tidak mencakup:
- Pemesanan layanan grooming.
- Diagnosis atau penanganan medis hewan.
- Pemantauan otomatis menggunakan kamera atau sensor khusus.

Pemeriksaan awal kucing tetap termasuk dalam sistem, dengan pencatatan kondisi seperti berat badan, suhu tubuh, dan kondisi parasit sebelum penitipan. Pemeriksaan ini hanya berupa pencatatan kondisi awal, bukan diagnosis medis.

## 3. Jenis Pengguna

### Pemilik Pet Hotel
- Melihat dan mengelola data kucing serta pelanggan.
- Mengelola dan memantau reservasi.
- Memantau layanan penitipan dan laporan harian.
- Memantau pembayaran serta layanan antar jemput.

### Pemilik Kucing
- Mengelola profil kucing.
- Mengajukan reservasi penitipan.
- Melihat status reservasi dan pembayaran.
- Melihat laporan kondisi serta aktivitas kucing.
- Melihat informasi layanan antar jemput jika digunakan.

### Staf Operasional
- Melihat data kucing dan reservasi yang relevan.
- Mencatat pemeriksaan awal.
- Mencatat check-in dan check-out.
- Mencatat aktivitas serta kondisi kucing.
- Mengunggah dokumentasi untuk laporan harian.

### Staf Antar Jemput
- Melihat jadwal dan detail tugas antar jemput.
- Memperbarui status layanan antar jemput.

## 4. Kebutuhan Fungsional

Prioritas mengikuti SRS dengan koreksi F-005 menjadi Must sesuai konfirmasi pemilik proyek.

| ID | Kebutuhan | Prioritas |
|---|---|---|
| SKPL-F-001 | Pembuatan reservasi pet hotel | Must |
| SKPL-F-002 | Pengelolaan profil kucing dan pencatatan kondisi kesehatan awal | Must |
| SKPL-F-003 | Pencatatan serta penampilan laporan harian | Must |
| SKPL-F-004 | Pengelolaan pembayaran terintegrasi | Should |
| SKPL-F-005 | Pengelolaan jadwal layanan antar jemput | Must |
| SKPL-F-006 | Pesan singkat internal | Should |
| SKPL-F-007 | Riwayat penggunaan layanan | Should |
| SKPL-F-008 | Notifikasi status layanan | Could |

Catatan: implementasi harus dilakukan bertahap. Fitur yang membutuhkan layanan pihak ketiga tidak boleh diklaim telah terintegrasi jika baru berupa simulasi.

## 5. Rekomendasi MVP

Versi pertama ditujukan sebagai prototipe portofolio yang dapat didemonstrasikan.

### Modul A — Dashboard
- Ringkasan jumlah reservasi.
- Jumlah kucing yang sedang menginap.
- Reservasi yang menunggu konfirmasi.
- Jadwal penitipan mendatang.
- Ringkasan aktivitas terbaru.

### Modul B — Data Kucing dan Pelanggan
- Menampilkan daftar kucing.
- Menambahkan dan mengubah data kucing.
- Mengelola informasi pemilik.
- Menampilkan foto kucing jika tersedia.
- Mencatat kondisi awal: berat badan, suhu tubuh, dan kondisi parasit.

### Modul C — Reservasi
- Membuat reservasi penitipan.
- Memilih kucing dan tanggal masuk serta keluar.
- Memeriksa benturan jadwal dan kapasitas penitipan.
- Menampilkan status reservasi.
- Mengubah status reservasi melalui tindakan yang sesuai.

### Modul D — Pengelolaan Penitipan
- Mencatat check-in.
- Mencatat aktivitas dan kondisi kucing.
- Membuat laporan harian.
- Mengunggah foto atau dokumentasi jika fitur penyimpanan mendukungnya.
- Mencatat check-out.

### Modul E — Antar Jemput
- Menampilkan daftar tugas antar jemput.
- Menampilkan jadwal dan informasi tugas.
- Memperbarui status tugas.

### Modul F — Pembayaran
Untuk tahap awal, pembayaran boleh menggunakan simulasi status transaksi. Jangan mengklaim pembayaran QRIS sungguhan sudah berfungsi tanpa integrasi penyedia pembayaran.

### Fitur Lanjutan
OMI Chat, riwayat layanan lengkap, notifikasi otomatis, integrasi kalender, dan pembayaran sungguhan dapat dikembangkan setelah MVP stabil.

## 6. Aturan Bisnis Awal

Aturan berikut adalah rekomendasi implementasi yang harus dikonfirmasi atau disesuaikan dengan kebijakan usaha:

1. Reservasi harus terhubung dengan data pemilik dan kucing.
2. Tanggal keluar tidak boleh lebih awal daripada tanggal masuk.
3. Sistem harus mencegah reservasi yang bertentangan dengan kapasitas atau jadwal yang sudah terisi.
4. Status reservasi, pembayaran, penitipan, dan antar jemput harus dibedakan.
5. Check-in harus terhubung dengan reservasi yang valid.
6. Laporan harian harus terhubung dengan kucing yang sedang dititipkan.
7. Check-out menandai berakhirnya masa penitipan, tetapi tidak boleh otomatis menghapus riwayat.
8. Data pemeriksaan awal merupakan catatan kondisi, bukan diagnosis atau rekomendasi pengobatan.

Jangan menetapkan harga, kapasitas total kandang, aturan pembatalan, uang muka, atau kebijakan pembayaran sebagai fakta sebelum nilainya dikonfirmasi.

## 7. Kebutuhan Nonfungsional

- Antarmuka mudah dipahami oleh pemilik kucing dan staf.
- Halaman utama dan data penting ditargetkan tampil dalam maksimal 3 detik pada kondisi koneksi stabil.
- Sistem dirancang dengan pembatasan hak akses berdasarkan peran.
- Data pribadi pelanggan dan data kucing harus dilindungi.
- Versi produksi harus menggunakan penyimpanan yang sesuai, autentikasi yang aman, dan koneksi HTTPS.
- Tampilan harus responsif untuk desktop dan perangkat seluler.
- Formulir harus memberikan validasi dan pesan kesalahan yang mudah dipahami.

## 8. Teknologi dan Tahapan Implementasi

### Tahap 1 — Frontend
- HTML
- CSS
- JavaScript
- Desain responsif
- Data contoh untuk demonstrasi

### Tahap 2 — Interaksi Prototipe
- CRUD data kucing dan pelanggan.
- Formulir reservasi.
- Pencarian dan filter.
- Perubahan status.
- Validasi formulir.
- Penyimpanan lokal untuk demonstrasi jika sesuai.

### Tahap 3 — Backend dan Database
Setelah prototipe stabil, evaluasi penggunaan backend dan database terpusat, misalnya Node.js, Express, dan MySQL.

Jangan menganggap localStorage sebagai database bersama atau solusi keamanan untuk penggunaan produksi.

## 9. Arahan untuk AI Coding Agent

1. Baca file PROJECT_SPEC.md dan dokumen SRS yang tersedia sebelum menulis kode.
2. Periksa struktur proyek yang sudah ada. Jangan menghapus atau menimpa file tanpa alasan yang jelas.
3. Buat rencana implementasi bertahap sebelum mengubah banyak file.
4. Mulai dari struktur halaman, navigasi, dan dashboard.
5. Implementasikan modul satu per satu dan uji setiap modul.
6. Gunakan nama variabel, fungsi, dan komponen yang konsisten serta mudah dipahami pemula.
7. Hindari dependensi, framework, atau layanan eksternal yang tidak diperlukan.
8. Jangan membuat fitur di luar ruang lingkup pet hotel.
9. Jangan mengklaim autentikasi aman, pembayaran nyata, atau integrasi eksternal berfungsi jika belum benar-benar diterapkan dan diuji.
10. Setelah setiap tahap, jelaskan file yang dibuat atau diubah, fungsi setiap file, cara menjalankan aplikasi, serta cara menguji hasilnya.
11. Jangan langsung membangun seluruh aplikasi dalam satu langkah.
12. Jika ada kebutuhan yang belum jelas, catat sebagai pertanyaan atau asumsi dan minta konfirmasi sebelum membuat keputusan yang berdampak besar.

## 10. Kriteria Keberhasilan MVP

MVP dianggap berhasil jika:
- Aplikasi dapat dijalankan secara lokal dengan petunjuk yang jelas.
- Pengguna dapat melihat dashboard dan menavigasi modul utama.
- Data kucing dan pelanggan dapat dikelola.
- Reservasi dapat dibuat dan divalidasi.
- Jadwal yang bertentangan dapat ditangani dengan benar.
- Check-in, laporan harian, dan check-out dapat didemonstrasikan.
- Jadwal serta status antar jemput dapat dikelola.
- Status pembayaran ditampilkan secara jujur sesuai implementasinya.
- Tampilan dapat digunakan di desktop dan perangkat seluler.
- Kode cukup terstruktur agar dapat dipelajari dan dikembangkan lebih lanjut.
