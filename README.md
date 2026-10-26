# OMI — OemahPus Monitoring and Information

Sistem Informasi Pengelolaan Pet Hotel dan Penitipan Kucing untuk usaha **OemahPus Surabaya**.

Aplikasi ini dibangun menggunakan **Vanilla HTML, CSS, dan JavaScript** murni tanpa framework eksternal, dengan arsitektur modular yang rapi agar mudah dipelajari, dipresentasikan di hadapan dosen, dan siap disambungkan ke backend API di masa mendatang.

---

## 📌 Ruang Lingkup Layanan
Aplikasi ini berfokus **khusus pada layanan penitipan kucing (Pet Hotel)**.

**Fitur yang sudah tersedia:**
- ✅ Manajemen data kucing dan pemilik
- ✅ Pemeriksaan awal kondisi fisik (*intake physical check*: berat badan, suhu tubuh, parasit)
- ✅ Reservasi penitipan dan pemeriksaan benturan kapasitas kandang
- ✅ Monitoring penitipan, check-in/check-out, dan riwayat penitipan
- ✅ Laporan harian berbasis catatan teks: makan, minum, buang air kecil, buang air besar, aktivitas, dan mood. Laporan tidak mendukung foto.
- ✅ Tagihan reservasi berdasarkan tarif harian yang dikonfigurasi dan pembayaran manual tunai/transfer yang dicatat staf setelah diterima. Fitur ini tidak menghubungi bank atau payment gateway.

**Placeholder yang belum berfungsi:**
- ⏳ Menu antar-jemput dan riwayat tugas driver belum menyediakan alur pengelolaan layanan yang berfungsi.

**Batasan dan rencana pengembangan:**
- 💡 Fitur pembayaran online dan integrasi eksternal belum tersedia; pembayaran yang dicatat di aplikasi adalah pembayaran manual yang telah diterima staf.
- 💡 Daftar master kandang dan pencocokan identitas kandang dengan daftar resmi belum tersedia.
- ❌ *Tidak mencakup layanan grooming atau diagnosis medis dokter hewan*.

---

## 👥 Peran Pengguna (Role-Based Access)

1. **Pemilik Pet Hotel (Owner)** — Dr. Hendra (`owner@oemahpus.com`)
   - Memantau kapasitas kandang dan mengelola reservasi, monitoring penitipan, laporan harian, serta melihat tagihan dan transaksi pembayaran.
2. **Staf Operasional** — Siti Rahma (`ops@oemahpus.com`)
   - Mengelola check-in/out tamu, memeriksa data kondisi fisik awal, mengisi laporan harian (*Daily Report*), menyiapkan tagihan, dan mencatat pembayaran manual yang diterima.
3. **Staf Antar-Jemput (Driver)** — Doni Pratama (`driver@oemahpus.com`)
   - Memiliki menu jadwal antar-jemput dan riwayat tugas, tetapi alur tersebut masih berupa placeholder dan belum dapat digunakan untuk memperbarui tugas atau status perjalanan.
4. **Pemilik Kucing (Customer)** — Budi Santoso (`budi@gmail.com`) / Registrasi Akun Baru
   - Mengelola profil kucing milik sendiri, membuat reservasi, melihat riwayat penitipan, membaca laporan harian, serta melihat tagihan dan riwayat pembayaran miliknya.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi murni berbasis web statis dan tidak memerlukan instalasi dependensi `npm`:

### Opsi 1: Menggunakan Python HTTP Server (Rekomendasi)
Buka terminal di folder proyek dan jalankan:
```bash
python -m http.server 3000
```
Lalu buka browser di alamat: `http://localhost:3000/index.html`

### Opsi 2: Menggunakan VS Code Live Server / Langsung di Browser
Buka file `index.html` secara langsung dengan klik dua kali atau gunakan ekstensi *Live Server* di VS Code.

---

## 📂 Struktur File (Tahap 6B — Tagihan dan Pembayaran Manual)

```text
Omi Pet Hotel/
├── index.html               # Halaman utama aplikasi (Login, Register, Header, Sidebar, Dashboard, modul)
├── css/
│   ├── style.css            # Variabel desain sistem, tata letak grid/flexbox, sidebar tetap, topbar
│   └── components.css       # Styling form auth, kartu dashboard, tabel data, modal form, kartu kucing
├── js/
│   ├── utils.js             # Fungsi utilitas (format Rupiah, format tanggal lokal, sanitasi HTML)
│   ├── storage.js           # Pengelola data LocalStorage & operasi terotorisasi
│   ├── auth.js              # Layanan autentikasi mandiri berbasis sessionStorage & demo login
│   ├── app.js               # Pengendali utama alur aplikasi, navigasi dinamis, dan event listener
│   └── modules/
│       ├── dashboard.js     # Perender dashboard spesifik per peran (Owner, Ops, Driver, Customer)
│       ├── cats.js          # Modul B: Pengelolaan data kucing dan pemeriksaan awal
│       ├── reservations.js  # Modul C: Reservasi, status, detail, dan validasi kapasitas
│       ├── boarding.js      # Check-in/out, monitoring penitipan, dan laporan harian
│       └── billing.js       # Tagihan reservasi dan pembayaran manual
├── assets/                  # Aset gambar dan ikon
├── PROJECT_SPEC.md          # Spesifikasi teknis dan aturan bisnis proyek
└── OemahPus Monitoring Information.md # Dokumen SKPL / SRS asli
```

Modul reservasi memakai kapasitas kandang yang sudah tersimpan pada konfigurasi hotel (`totalCapacity`). Periode dihitung mulai tanggal check-in sampai sebelum tanggal check-out; reservasi yang dibatalkan tidak mengurangi kapasitas.

Check-in dan check-out disimpan sebagai riwayat penitipan tersendiri. Reservasi baru tetap berstatus konfirmasi; untuk data lama yang mencampur status dengan `Sedang Menginap`, migrasi membuat catatan penitipan, mengembalikan status reservasi ke `Dikonfirmasi`, dan menyimpan status lama sebagai metadata migrasi. Migrasi menggunakan jurnal pemulihan sebelum memperbarui beberapa data LocalStorage dan aplikasi tidak dibuka jika migrasi tertunda. Timestamp aktual yang tidak tersedia pada data lama dibiarkan kosong. Laporan memakai field yang sudah ada di data contoh: makan, minum, buang air kecil, buang air besar, serta aktivitas dan mood. Satu laporan per kucing per tanggal mengikuti indikator laporan harian yang sudah digunakan dashboard. Daftar master kandang belum tersedia, sehingga staf memasukkan identitas kandang saat check-in; format masukan divalidasi tetapi belum dicocokkan dengan daftar resmi.

Tagihan dibuat Staf Operasional untuk reservasi terkonfirmasi atau yang memiliki riwayat penitipan. Perhitungan memakai snapshot tarif harian saat tagihan dibuat dan menghitung tanggal check-in secara inklusif serta check-out secara eksklusif; data biaya lama pada reservasi demo tidak dipakai sebagai dasar. Pembayaran tunai atau transfer dicatat manual oleh Staf Operasional setelah dana diterima. Status pembayaran dihitung dari transaksi yang tercatat. Owner dapat melihat tagihan dan transaksi, sedangkan pelanggan hanya melihat data tagihan dan transaksi miliknya. Tidak ada pembayaran otomatis, konfirmasi bank, atau payment gateway.

---

## 💡 Transparansi & Keterbatasan Keamanan (Catatan Akademik)
- Autentikasi pada Tahap 1 menggunakan **simulasi frontend berbasis `sessionStorage`**.
- Kata sandi riil tidak disimpan di `localStorage` demi keamanan demonstrasi.
- Pembatasan menu, navigasi, serta operasi data berdasarkan peran dan kepemilikan diterapkan untuk kebutuhan simulasi prototipe. Karena kode dan LocalStorage berjalan di browser, pembatasan ini tetap dapat dilewati dan bukan mekanisme keamanan produksi. Pada aplikasi produksi nyata, autentikasi dan otorisasi wajib divalidasi di backend.
- Tagihan dan transaksi pada Tahap 6B disimpan lokal di browser. Catatan pembayaran merupakan input manual staf, bukan bukti konfirmasi dari bank; jangan gunakan prototipe ini sebagai sistem keuangan produksi.
