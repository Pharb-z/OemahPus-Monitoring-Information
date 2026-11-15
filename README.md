# OMI — OemahPus Monitoring and Information

Sistem Informasi Pengelolaan Pet Hotel dan Penitipan Kucing untuk usaha **OemahPus Surabaya**.

Aplikasi ini dibangun menggunakan **HTML, CSS, dan JavaScript** tanpa framework eksternal. Data aplikasi disimpan di **LocalStorage** browser; autentikasi menggunakan simulasi frontend berbasis `sessionStorage`. Aplikasi ini masih berupa prototipe frontend dan belum menggunakan backend atau database server.

---

## 📌 Ruang Lingkup Layanan
Aplikasi ini berfokus **khusus pada layanan penitipan kucing (Pet Hotel)**.

**Fitur yang sudah tersedia:**
- ✅ Manajemen data kucing dan pemilik
- ✅ Pemeriksaan awal kondisi fisik (*intake physical check*: berat badan, suhu tubuh, parasit)
- ✅ Reservasi penitipan dan pemeriksaan benturan kapasitas kandang
- ✅ Pilihan layanan antar-jemput pada reservasi: `none`, `pickup`, `delivery`, dan `both`
- ✅ Owner dan Staf Operasional dapat membuat dan mengatur tugas antar-jemput sesuai pembatasan role aplikasi
- ✅ Driver dapat melihat tugas yang ditugaskan kepadanya dan menyelesaikan tugas berstatus `Terjadwal`
- ✅ Monitoring penitipan, check-in/check-out, dan riwayat penitipan
- ✅ Laporan harian berbasis catatan teks: makan, minum, buang air kecil, buang air besar, aktivitas, dan mood. Laporan tidak mendukung foto.
- ✅ Tagihan reservasi berdasarkan tarif harian yang dikonfigurasi dan pembayaran manual tunai/transfer yang dicatat staf setelah diterima. Fitur ini tidak menghubungi bank atau payment gateway.

**Placeholder yang belum berfungsi:**
- ⏳ Menu riwayat tugas Driver belum diimplementasikan. Menu Jadwal Antar-Jemput Driver membuka daftar tugas yang sama dengan dashboard Driver.

**Batasan dan rencana pengembangan:**
- 💡 Fitur pembayaran online dan integrasi eksternal belum tersedia; pembayaran yang dicatat di aplikasi adalah pembayaran manual yang telah diterima staf.
- 💡 Tarif antar-jemput (`pickupRateFlat`) dan integrasi billing untuk biaya pickup belum termasuk implementasi yang terverifikasi; tagihan yang tersedia menggunakan tarif harian penitipan.
- 💡 Daftar master kandang dan pencocokan identitas kandang dengan daftar resmi belum tersedia.
- ❌ *Tidak mencakup layanan grooming atau diagnosis medis dokter hewan*.

---

## 👥 Peran Pengguna (Role-Based Access)

1. **Pemilik Pet Hotel (Owner)** — Dr. Hendra (`owner@oemahpus.com`)
   - Memantau kapasitas kandang dan mengelola reservasi serta tugas antar-jemput; memantau penitipan dan laporan harian; melihat tagihan dan transaksi pembayaran.
2. **Staf Operasional** — Siti Rahma (`ops@oemahpus.com`)
   - Mengelola tugas antar-jemput, check-in/out tamu, pemeriksaan kondisi fisik awal, laporan harian (*Daily Report*), tagihan, dan pencatatan pembayaran manual yang telah diterima.
3. **Staf Antar-Jemput (Driver)** — Doni Pratama (`driver@oemahpus.com`)
   - Melihat tugas yang ditugaskan kepadanya melalui dashboard atau menu **Jadwal Antar-Jemput**; menu jadwal menampilkan daftar tugas yang sama dengan dashboard.
   - Dapat menandai tugas berstatus `Terjadwal` sebagai selesai. Menu **Riwayat Tugas** masih berupa placeholder dan belum diimplementasikan.
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

## 📂 Struktur File

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
│       ├── dashboard.js     # Dashboard per peran dan daftar tugas Driver
│       ├── cats.js          # Modul B: Pengelolaan data kucing dan pemeriksaan awal
│       ├── reservations.js  # Modul C: Reservasi, status, detail, dan validasi kapasitas
│       ├── boarding.js      # Check-in/out, monitoring penitipan, dan laporan harian
│       ├── pickup.js        # Pengelolaan tugas antar-jemput Owner dan Staf Operasional
│       └── billing.js       # Tagihan reservasi dan pembayaran manual
├── assets/                  # Aset gambar dan ikon
├── PROJECT_SPEC.md          # Spesifikasi teknis dan aturan bisnis proyek
└── OemahPus Monitoring Information.md # Dokumen SKPL / SRS asli
```

Modul reservasi memakai kapasitas kandang yang sudah tersimpan pada konfigurasi hotel (`totalCapacity`). Periode dihitung mulai tanggal check-in sampai sebelum tanggal check-out; reservasi yang dibatalkan tidak mengurangi kapasitas.

Check-in dan check-out disimpan sebagai riwayat penitipan tersendiri. Reservasi baru tetap berstatus konfirmasi; untuk data lama yang mencampur status dengan `Sedang Menginap`, migrasi membuat catatan penitipan, mengembalikan status reservasi ke `Dikonfirmasi`, dan menyimpan status lama sebagai metadata migrasi. Migrasi menggunakan jurnal pemulihan sebelum memperbarui beberapa data LocalStorage dan aplikasi tidak dibuka jika migrasi tertunda. Timestamp aktual yang tidak tersedia pada data lama dibiarkan kosong. Laporan memakai field yang sudah ada di data contoh: makan, minum, buang air kecil, buang air besar, serta aktivitas dan mood. Satu laporan per kucing per tanggal mengikuti indikator laporan harian yang sudah digunakan dashboard. Daftar master kandang belum tersedia, sehingga staf memasukkan identitas kandang saat check-in; format masukan divalidasi tetapi belum dicocokkan dengan daftar resmi.

Tagihan dibuat Staf Operasional untuk reservasi terkonfirmasi atau yang memiliki riwayat penitipan. Perhitungan memakai snapshot tarif harian saat tagihan dibuat dan menghitung tanggal check-in secara inklusif serta check-out secara eksklusif; data biaya lama pada reservasi demo tidak dipakai sebagai dasar. Tarif antar-jemput dan penambahan biaya pickup ke billing belum termasuk implementasi yang terverifikasi. Pembayaran tunai atau transfer dicatat manual oleh Staf Operasional setelah dana diterima. Status pembayaran dihitung dari transaksi yang tercatat. Owner dapat melihat tagihan dan transaksi, sedangkan pelanggan hanya melihat data tagihan dan transaksi miliknya. Tidak ada pembayaran otomatis, konfirmasi bank, atau payment gateway.

---

## 💡 Transparansi & Keterbatasan Keamanan (Catatan Akademik)
- Autentikasi pada Tahap 1 menggunakan **simulasi frontend berbasis `sessionStorage`**.
- Data aplikasi disimpan di **LocalStorage** browser; belum ada backend atau database server. Data tetap tersimpan pada browser yang digunakan dan aplikasi ini bukan sistem produksi.
- Kata sandi riil tidak disimpan di `localStorage` demi keamanan demonstrasi.
- Pembatasan menu, navigasi, serta operasi data berdasarkan peran dan kepemilikan diterapkan untuk kebutuhan simulasi prototipe. Karena kode dan LocalStorage berjalan di browser, pembatasan ini tetap dapat dilewati dan bukan mekanisme keamanan produksi. Pada aplikasi produksi nyata, autentikasi dan otorisasi wajib divalidasi di backend.
- Tagihan dan transaksi pada Tahap 6B disimpan lokal di browser. Catatan pembayaran merupakan input manual staf, bukan bukti konfirmasi dari bank; jangan gunakan prototipe ini sebagai sistem keuangan produksi.
