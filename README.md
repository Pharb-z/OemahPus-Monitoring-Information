# OMI — OemahPus Monitoring and Information

Sistem Informasi Pengelolaan Pet Hotel dan Penitipan Kucing untuk usaha **OemahPus Surabaya**.

Aplikasi ini dibangun menggunakan **Vanilla HTML, CSS, dan JavaScript** murni tanpa framework eksternal, dengan arsitektur modular yang rapi agar mudah dipelajari, dipresentasikan di hadapan dosen, dan siap disambungkan ke backend API di masa mendatang.

---

## 📌 Ruang Lingkup Layanan
Aplikasi ini berfokus **khusus pada layanan penitipan kucing (Pet Hotel)**:
- ✅ Manajemen Data Kucing & Pemilik
- ✅ Pemeriksaan Awal Kondisi Fisik (*Intake physical check*: berat badan, suhu tubuh, parasit)
- ✅ Reservasi Penitipan & Pemeriksaan Benturan Kapasitas Kandang
- ✅ Pemantauan Penitipan & Laporan Harian (*Daily Report* makan, minum, pup, mood, foto)
- ✅ Jadwal & Status Layanan Antar-Jemput (*Pet Pickup*)
- ✅ Simulasi Status Pembayaran (*Belum Bayar, DP, Lunas*)
- ❌ *Tidak mencakup layanan grooming atau diagnosis medis dokter hewan*.

---

## 👥 Peran Pengguna (Role-Based Access)

1. **Pemilik Pet Hotel (Owner)** — Dr. Hendra (`owner@oemahpus.com`)
   - Memantau kapasitas kandang, omset/pendapatan simulasi, seluruh reservasi, dan armada antar-jemput.
2. **Staf Operasional** — Siti Rahma (`ops@oemahpus.com`)
   - Mengelola check-in/out tamu, memeriksa data kondisi fisik awal, dan mengisi laporan harian (*Daily Report*).
3. **Staf Antar-Jemput (Driver)** — Doni Pratama (`driver@oemahpus.com`)
   - Mengelola daftar tugas penjemputan dan pengantaran kucing serta memperbarui status perjalanan.
4. **Pemilik Kucing (Customer)** — Budi Santoso (`budi@gmail.com`) / Registrasi Akun Baru
   - Mengelola profil kucing milik sendiri, melihat masa menginap aktif, dan membaca laporan harian kucing miliknya.

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

## 📂 Struktur File (Tahap 3 — Modul B: Pengelolaan Data Kucing & Pemeriksaan Awal)

```text
Omi Pet Hotel/
├── index.html               # Halaman utama aplikasi (Login, Register, Header, Sidebar, Dashboard, Data Kucing)
├── css/
│   ├── style.css            # Variabel desain sistem, tata letak grid/flexbox, sidebar tetap, topbar
│   └── components.css       # Styling form auth, kartu dashboard, tabel data, modal form, kartu kucing
├── js/
│   ├── utils.js             # Fungsi utilitas (format Rupiah, format tanggal lokal, sanitasi HTML)
│   ├── storage.js           # Pengelola data LocalStorage & CRUD data (kucing, reservasi, laporan, tugas)
│   ├── auth.js              # Layanan autentikasi mandiri berbasis sessionStorage & demo login
│   ├── app.js               # Pengendali utama alur aplikasi, navigasi dinamis, dan event listener
│   └── modules/
│       ├── dashboard.js     # Perender dashboard spesifik per peran (Owner, Ops, Driver, Customer)
│       └── cats.js          # Modul B: Pengelolaan data kucing, filter/pencarian, form intake fisik
├── assets/                  # Aset gambar dan ikon
├── PROJECT_SPEC.md          # Spesifikasi teknis dan aturan bisnis proyek
└── OemahPus Monitoring Information.md # Dokumen SKPL / SRS asli
```

---

## 💡 Transparansi & Keterbatasan Keamanan (Catatan Akademik)
- Autentikasi pada Tahap 1 menggunakan **simulasi frontend berbasis `sessionStorage`**.
- Kata sandi riil tidak disimpan di `localStorage` demi keamanan demonstrasi.
- Pembatasan menu, navigasi, serta operasi data berdasarkan peran dan kepemilikan diterapkan untuk kebutuhan simulasi prototipe. Karena kode dan LocalStorage berjalan di browser, pembatasan ini tetap dapat dilewati dan bukan mekanisme keamanan produksi. Pada aplikasi produksi nyata, autentikasi dan otorisasi wajib divalidasi di backend.
