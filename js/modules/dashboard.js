/**
 * OMI - OemahPus Monitoring and Information
 * File: js/modules/dashboard.js
 * Deskripsi: Komponen perender Dashboard dinamis dan multi-peran (Owner, Ops, Driver, Customer)
 * Tahap 2: Semua statistik dihitung secara matematis dari satu sumber data StorageService.
 */

const DashboardModule = {
    /**
     * Render dashboard utama sesuai peran pengguna yang sedang aktif
     */
    render(containerElement, user) {
        if (!containerElement || !user) return;
        const activeUser = AuthService.getCurrentUser();
        if (!activeUser || activeUser.id !== user.id || activeUser.role !== user.role) {
            Utils.showToast('Sesi tidak valid. Silakan masuk kembali.', 'error');
            containerElement.innerHTML = '';
            return;
        }

        let contentHtml = '';

        switch (user.role) {
            case 'owner':
                contentHtml = this.renderOwnerDashboard(user);
                break;
            case 'staff_ops':
                contentHtml = this.renderStaffOpsDashboard(user);
                break;
            case 'staff_driver':
                contentHtml = this.renderDriverDashboard(user);
                break;
            case 'customer':
                contentHtml = this.renderCustomerDashboard(user);
                break;
            default:
                contentHtml = `<div class="card p-4"><p>Peran pengguna tidak dikenali.</p></div>`;
        }

        containerElement.innerHTML = contentHtml;

        // Pasang event listener untuk tombol aksi cepat di dashboard jika ada
        this.bindDashboardActions(containerElement, user);
    },

    /**
     * =========================================================================
     * 1. DASHBOARD PEMILIK PET HOTEL (OWNER)
     * =========================================================================
     */
    renderOwnerDashboard(user) {
        const settings = StorageService.getSettings();
        const reservations = StorageService.getReservations();
        const pickups = StorageService.getPickups();
        const activities = StorageService.getRecentActivities();

        // 1. Perhitungan Statistik Dinamis
        const activeStays = reservations.filter(r => r.status === 'Sedang Menginap');
        const pendingConfirm = reservations.filter(r => r.status === 'Menunggu Konfirmasi');
        const totalCapacity = Number(settings.totalCapacity) || 10;
        const availableRooms = Math.max(0, totalCapacity - activeStays.length);
        const occupancyPercentage = Math.min(100, Math.round((activeStays.length / totalCapacity) * 100));

        // 2. Simulasi Pendapatan Total (dari reservasi yang tidak dibatalkan)
        const totalRevenue = reservations.reduce((acc, curr) => {
            if (curr.status !== 'Dibatalkan') {
                return acc + (Number(curr.estimatedCost) || 0) + (Number(curr.pickupCost) || 0);
            }
            return acc;
        }, 0);

        const activePickups = pickups.filter(p => p.status !== 'Selesai');

        return `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">Dashboard Pemilik Pet Hotel</h2>
                        <p class="subtitle">Selamat datang kembali, <strong>${Utils.escapeHtml(user.name)}</strong>. Pantau performa operasional OemahPus hari ini.</p>
                    </div>
                    <div class="banner-badge">
                        <span class="badge badge-warning"><i class="icon">👑</i> Mode: Owner Pet Hotel</span>
                    </div>
                </div>
            </div>

            <!-- Kartu Metrik KPI Utama -->
            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <div class="stat-icon bg-emerald-light text-emerald">🏨</div>
                    <div class="stat-info">
                        <span class="stat-label">Okupansi Kandang</span>
                        <div class="stat-value">${activeStays.length} <span class="stat-sub">/ ${totalCapacity} Kandang</span></div>
                        <span class="stat-desc text-muted">${availableRooms} kandang kosong tersedia (${occupancyPercentage}%)</span>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill" style="width: ${occupancyPercentage}%"></div>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-amber-light text-amber">⏳</div>
                    <div class="stat-info">
                        <span class="stat-label">Menunggu Konfirmasi</span>
                        <div class="stat-value">${pendingConfirm.length}</div>
                        <span class="stat-desc text-muted">Reservasi baru perlu verifikasi</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-blue-light text-blue">💰</div>
                    <div class="stat-info">
                        <span class="stat-label">Simulasi Pendapatan</span>
                        <div class="stat-value">${Utils.formatRupiah(totalRevenue)}</div>
                        <span class="stat-desc text-muted">Estimasi omset tercatat di sistem</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-purple-light text-purple">🚗</div>
                    <div class="stat-info">
                        <span class="stat-label">Tugas Antar-Jemput</span>
                        <div class="stat-value">${activePickups.length} <span class="stat-sub">/ ${pickups.length}</span></div>
                        <span class="stat-desc text-muted">Tugas aktif dalam perjalanan</span>
                    </div>
                </div>
            </div>

            <!-- Tata Letak Dua Kolom: Tabel Tamu & Feed Aktivitas -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;" class="owner-grid-layout">
                <div class="owner-main-col">
                    <!-- Tabel 1: Kucing Sedang Menginap -->
                    <div class="card mb-4">
                        <div class="card-header flex-between">
                            <h3 class="card-title">Kucing yang Sedang Menginap</h3>
                            <span class="badge badge-success">${activeStays.length} Kucing Aktif</span>
                        </div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Nama Kucing</th>
                                        <th>Kamar / Kandang</th>
                                        <th>Pemilik</th>
                                        <th>Masa Menginap</th>
                                        <th>Layanan Jemput</th>
                                        <th>Status Bayar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${activeStays.map(r => `
                                        <tr>
                                            <td><strong>🐱 ${Utils.escapeHtml(r.catName)}</strong></td>
                                            <td><span class="badge badge-secondary">${Utils.escapeHtml(r.roomNumber || 'Kandang Standar')}</span></td>
                                            <td>${Utils.escapeHtml(r.ownerName)}</td>
                                            <td>${Utils.formatDate(r.checkInDate)} - ${Utils.formatDate(r.checkOutDate)}</td>
                                            <td>${r.needPickup ? '<span class="badge badge-primary">Antar-Jemput</span>' : '<span class="badge badge-light">Antar Sendiri</span>'}</td>
                                            <td><span class="badge ${r.paymentStatus === 'Lunas' ? 'badge-success' : 'badge-warning'}">${Utils.escapeHtml(r.paymentStatus)}</span></td>
                                        </tr>
                                    `).join('') || `<tr><td colspan="6" class="text-center text-muted p-4">Tidak ada kucing yang sedang menginap saat ini.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tabel 2: Reservasi Menunggu Konfirmasi (Dengan Aksi Cepat) -->
                    <div class="card mb-4">
                        <div class="card-header flex-between">
                            <h3 class="card-title">Reservasi Menunggu Konfirmasi</h3>
                            <span class="badge badge-warning">${pendingConfirm.length} Antrean</span>
                        </div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Kucing & Pemilik</th>
                                        <th>Tanggal Inap</th>
                                        <th>Total Estimasi</th>
                                        <th>Antar-Jemput</th>
                                        <th>Aksi Cepat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingConfirm.map(r => `
                                        <tr>
                                            <td>
                                                <strong>🐱 ${Utils.escapeHtml(r.catName)}</strong><br>
                                                <small class="text-muted">Pemilik: ${Utils.escapeHtml(r.ownerName)}</small>
                                            </td>
                                            <td>${Utils.formatDate(r.checkInDate)} s/d ${Utils.formatDate(r.checkOutDate)}</td>
                                            <td>${Utils.formatRupiah((r.estimatedCost || 0) + (r.pickupCost || 0))}</td>
                                            <td>${r.needPickup ? '<span class="badge badge-info">Butuh Jemput</span>' : '<span class="badge badge-light">Tidak</span>'}</td>
                                            <td>
                                                <button class="btn btn-primary btn-sm btn-quick-confirm" data-id="${r.id}">
                                                    ✓ Konfirmasi
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('') || `<tr><td colspan="5" class="text-center text-muted p-4">Semua reservasi telah dikonfirmasi.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Kolom Kanan: Feed Aktivitas Operasional Terbaru -->
                <div class="owner-side-col">
                    <div class="card mb-4">
                        <div class="card-header flex-between">
                            <h3 class="card-title">Aktivitas Terbaru</h3>
                            <span class="badge badge-light">Realtime</span>
                        </div>
                        <div class="card-body">
                            <div class="activity-feed">
                                ${activities.map(act => `
                                    <div class="activity-item">
                                        <div class="activity-icon-bubble">${act.icon}</div>
                                        <div class="activity-content">
                                            <div class="activity-text">
                                                <strong>${Utils.escapeHtml(act.title)}</strong><br>
                                                <small class="text-muted">${Utils.escapeHtml(act.desc)}</small>
                                            </div>
                                            <div class="activity-time">📅 ${Utils.escapeHtml(act.time)}</div>
                                        </div>
                                    </div>
                                `).join('') || `<p class="text-muted text-center p-3">Belum ada aktivitas tercatat.</p>`}
                            </div>
                        </div>
                    </div>

                    <!-- Ringkasan Info Usaha -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Informasi Pet Hotel</h3>
                        </div>
                        <div class="card-body text-muted" style="font-size: 0.88rem;">
                            <p class="mb-2"><strong>Nama:</strong> ${Utils.escapeHtml(settings.hotelName)}</p>
                            <p class="mb-2"><strong>Alamat:</strong> ${Utils.escapeHtml(settings.address)}</p>
                            <p class="mb-2"><strong>Kontak:</strong> ${Utils.escapeHtml(settings.contactPhone)}</p>
                            <p><strong>Tarif Dasar:</strong> ${Utils.formatRupiah(settings.standardDailyRate)} / malam</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * =========================================================================
     * 2. DASHBOARD STAF OPERASIONAL (STAFF OPS)
     * =========================================================================
     */
    renderStaffOpsDashboard(user) {
        const reservations = StorageService.getReservations();
        const cats = StorageService.getCats();
        const reports = StorageService.getDailyReports();
        const activeStays = reservations.filter(r => r.status === 'Sedang Menginap');
        const confirmedReservations = reservations.filter(r => r.status === 'Dikonfirmasi');
        const todayDate = new Date().toISOString().split('T')[0];

        // Laporan harian yang sudah dibuat hari ini
        const reportsToday = reports.filter(rep => rep.date === todayDate);
        const reportProgressPercent = activeStays.length > 0 
            ? Math.round((reportsToday.length / activeStays.length) * 100) 
            : 100;

        return `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">Dashboard Staf Operasional</h2>
                        <p class="subtitle">Halo, <strong>${Utils.escapeHtml(user.name)}</strong>. Pastikan kondisi pakan, kebersihan kandang, dan laporan harian terisi dengan akurat.</p>
                    </div>
                    <div class="banner-badge">
                        <span class="badge badge-primary"><i class="icon">📋</i> Mode: Staf Operasional</span>
                    </div>
                </div>
            </div>

            <!-- Kartu Metrik Staf Ops -->
            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <div class="stat-icon bg-emerald-light text-emerald">🐾</div>
                    <div class="stat-info">
                        <span class="stat-label">Kucing Menginap</span>
                        <div class="stat-value">${activeStays.length} Kucing</div>
                        <span class="stat-desc text-muted">Aktif dalam perawatan harian</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-blue-light text-blue">📝</div>
                    <div class="stat-info">
                        <span class="stat-label">Daily Report Hari Ini</span>
                        <div class="stat-value">${reportsToday.length} <span class="stat-sub">/ ${activeStays.length}</span></div>
                        <span class="stat-desc text-muted">${Math.max(0, activeStays.length - reportsToday.length)} laporan belum diisi (${reportProgressPercent}%)</span>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill" style="width: ${reportProgressPercent}%"></div>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-amber-light text-amber">📥</div>
                    <div class="stat-info">
                        <span class="stat-label">Siap Check-In</span>
                        <div class="stat-value">${confirmedReservations.length} Kucing</div>
                        <span class="stat-desc text-muted">Dijadwalkan segera tiba</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-purple-light text-purple">🩺</div>
                    <div class="stat-info">
                        <span class="stat-label">Pemeriksaan Awal</span>
                        <div class="stat-value">${activeStays.length} Dicatat</div>
                        <span class="stat-desc text-muted">Kondisi fisik awal saat intake</span>
                    </div>
                </div>
            </div>

            <!-- Bagian 1: Pemantauan Tamu Kucing & Catatan Kondisi Fisik Awal (Intake) -->
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <div>
                        <h3 class="card-title">Pemeriksaan Fisik Awal & Monitoring Tamu Aktif</h3>
                        <small class="text-muted">Catatan kondisi intake fisik (berat badan, suhu, parasit). <em>Bukan diagnosis medis</em>.</small>
                    </div>
                    <span class="badge badge-success">${activeStays.length} Sedang Menginap</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Kucing & Ras</th>
                                <th>Kamar</th>
                                <th>Berat Badan</th>
                                <th>Suhu Tubuh</th>
                                <th>Kondisi Parasit</th>
                                <th>Catatan Khusus Karakter</th>
                                <th>Daily Report Hari Ini</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeStays.map(r => {
                                const catData = cats.find(c => c.id === r.catId) || {};
                                const initCheck = catData.initialCheck || {};
                                const hasReport = reports.some(rep => rep.catId === r.catId && rep.date === todayDate);

                                return `
                                    <tr>
                                        <td>
                                            <strong>🐱 ${Utils.escapeHtml(r.catName)}</strong><br>
                                            <small class="text-muted">${Utils.escapeHtml(catData.breed || 'Kucing Domestik')} • ${Utils.escapeHtml(catData.gender || '-')}</small>
                                        </td>
                                        <td><span class="badge badge-secondary">${Utils.escapeHtml(r.roomNumber || 'Kandang')}</span></td>
                                        <td><strong>${initCheck.weight ? initCheck.weight + ' kg' : '-'}</strong></td>
                                        <td><strong>${initCheck.temperature ? initCheck.temperature + ' °C' : '-'}</strong></td>
                                        <td><span class="badge badge-light">${Utils.escapeHtml(initCheck.parasites || 'Bersih')}</span></td>
                                        <td><small>${Utils.escapeHtml(initCheck.notes || 'Normal')}</small></td>
                                        <td>
                                            ${hasReport 
                                                ? '<span class="badge badge-success">✓ Sudah Diisi</span>' 
                                                : '<span class="badge badge-warning">⚠️ Belum Diisi</span>'}
                                        </td>
                                    </tr>
                                `;
                            }).join('') || `<tr><td colspan="7" class="text-center text-muted p-4">Tidak ada tamu kucing yang aktif saat ini.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Bagian 2: Jadwal Kedatangan & Kepulangan Tamu (Check-In & Check-Out) -->
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Jadwal Check-In & Check-Out Mendatang</h3>
                    <span class="badge badge-info">Operasional Pet Hotel</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Status Jadwal</th>
                                <th>Kucing & Pemilik</th>
                                <th>Tanggal Check-In</th>
                                <th>Tanggal Check-Out</th>
                                <th>Layanan Antar-Jemput</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${confirmedReservations.map(r => `
                                <tr>
                                    <td><span class="badge badge-info">🟢 Siap Check-In</span></td>
                                    <td><strong>🐱 ${Utils.escapeHtml(r.catName)}</strong> (${Utils.escapeHtml(r.ownerName)})</td>
                                    <td><strong>${Utils.formatDate(r.checkInDate)}</strong></td>
                                    <td>${Utils.formatDate(r.checkOutDate)}</td>
                                    <td>${r.needPickup ? '<span class="badge badge-primary">Ya (Driver)</span>' : '<span class="badge badge-light">Mandiri</span>'}</td>
                                </tr>
                            `).join('')}
                            ${activeStays.map(r => `
                                <tr>
                                    <td><span class="badge badge-warning">🔴 Masa Menginap Berjalan</span></td>
                                    <td><strong>🐱 ${Utils.escapeHtml(r.catName)}</strong> (${Utils.escapeHtml(r.ownerName)})</td>
                                    <td>${Utils.formatDate(r.checkInDate)}</td>
                                    <td><strong>Rencana Check-Out: ${Utils.formatDate(r.checkOutDate)}</strong></td>
                                    <td>${r.needPickup ? '<span class="badge badge-primary">Antar Kembali</span>' : '<span class="badge badge-light">Diambil Sendiri</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * =========================================================================
     * 3. DASHBOARD STAF ANTAR-JEMPUT (STAFF DRIVER)
     * =========================================================================
     */
    renderDriverDashboard(user) {
        const pickups = StorageService.getPickups();
        const pendingPickups = pickups.filter(p => p.status !== 'Selesai');
        const completedPickups = pickups.filter(p => p.status === 'Selesai');

        return `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">Dashboard Staf Antar-Jemput</h2>
                        <p class="subtitle">Semangat bertugas, <strong>${Utils.escapeHtml(user.name)}</strong>. Pastikan keselamatan dan kenyamanan kucing selama perjalanan.</p>
                    </div>
                    <div class="banner-badge">
                        <span class="badge badge-purple"><i class="icon">🚗</i> Mode: Staf Antar-Jemput</span>
                    </div>
                </div>
            </div>

            <!-- Kartu Metrik Driver -->
            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <div class="stat-icon bg-amber-light text-amber">📋</div>
                    <div class="stat-info">
                        <span class="stat-label">Tugas Aktif</span>
                        <div class="stat-value">${pendingPickups.length}</div>
                        <span class="stat-desc text-muted">Perlu dijemput / diantar</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-emerald-light text-emerald">✅</div>
                    <div class="stat-info">
                        <span class="stat-label">Tugas Selesai</span>
                        <div class="stat-value">${completedPickups.length}</div>
                        <span class="stat-desc text-muted">Perjalanan berhasil dituntaskan</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-blue-light text-blue">🚗</div>
                    <div class="stat-info">
                        <span class="stat-label">Total Penugasan</span>
                        <div class="stat-value">${pickups.length}</div>
                        <span class="stat-desc text-muted">Total agenda antar-jemput</span>
                    </div>
                </div>
            </div>

            <!-- Tabel Daftar Tugas Antar Jemput Lengkap (Dengan Aksi Cepat Update Status) -->
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Jadwal Penugasan Antar-Jemput Kucing</h3>
                    <span class="badge badge-info">${pendingPickups.length} Tugas Perlu Diproses</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Jenis Layanan</th>
                                <th>Kucing</th>
                                <th>Pemilik & WhatsApp</th>
                                <th>Alamat Lengkap</th>
                                <th>Waktu Penjemputan</th>
                                <th>Status</th>
                                <th>Pembaruan Cepat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pickups.map(p => `
                                <tr>
                                    <td>
                                        <span class="badge ${p.type.includes('Jemput') ? 'badge-primary' : 'badge-purple'}">
                                            ${Utils.escapeHtml(p.type)}
                                        </span><br>
                                        <small class="text-muted">${Utils.escapeHtml(p.id)}</small>
                                    </td>
                                    <td><strong>🐱 ${Utils.escapeHtml(p.catName)}</strong></td>
                                    <td>
                                        <strong>${Utils.escapeHtml(p.ownerName)}</strong><br>
                                        <small class="text-muted">📞 ${Utils.escapeHtml(p.phone)}</small>
                                    </td>
                                    <td><small>${Utils.escapeHtml(p.address)}</small></td>
                                    <td><strong>${Utils.escapeHtml(p.scheduledTime)}</strong></td>
                                    <td>
                                        <span class="badge ${p.status === 'Selesai' ? 'badge-success' : 'badge-warning'}">
                                            ${Utils.escapeHtml(p.status)}
                                        </span>
                                    </td>
                                    <td>
                                        ${p.status !== 'Selesai' ? `
                                            <button class="btn btn-primary btn-sm btn-update-pickup" data-id="${p.id}" data-status="Selesai">
                                                ✓ Tandai Selesai
                                            </button>
                                        ` : `
                                            <span class="text-muted" style="font-size: 0.8rem;">✓ Tuntas</span>
                                        `}
                                    </td>
                                </tr>
                            `).join('') || `<tr><td colspan="7" class="text-center text-muted p-4">Tidak ada tugas penjemputan saat ini.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * =========================================================================
     * 4. DASHBOARD PEMILIK KUCING (CUSTOMER)
     * KETAT: Hanya menampilkan data milik customer yang sedang login!
     * =========================================================================
     */
    renderCustomerDashboard(user) {
        const allCats = StorageService.getCats();
        const allReservations = StorageService.getReservations();
        const allReports = StorageService.getDailyReports();
        const allPickups = StorageService.getPickups();

        // FILTER KETAT KHUSUS DATA CUSTOMER YANG LOGIN (Single Source of Truth)
        const myCats = allCats.filter(c => c.ownerId === user.id);
        const myCatIds = myCats.map(c => c.id);
        const myReservations = allReservations.filter(r => r.ownerId === user.id || myCatIds.includes(r.catId));
        const myReports = allReports.filter(rep => myCatIds.includes(rep.catId));
        const myPickups = allPickups.filter(p => myReservations.some(r => r.id === p.reservationId));

        const activeStay = myReservations.find(r => r.status === 'Sedang Menginap');

        // Total akumulasi tagihan simulasi
        const totalEstimatedBill = myReservations.reduce((acc, curr) => {
            if (curr.status !== 'Dibatalkan') {
                return acc + (Number(curr.estimatedCost) || 0) + (Number(curr.pickupCost) || 0);
            }
            return acc;
        }, 0);

        return `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner customer-banner">
                    <div>
                        <h2 class="title-lg">Ruang Pemilik Kucing</h2>
                        <p class="subtitle">Halo, <strong>${Utils.escapeHtml(user.name)}</strong>! Pantau kondisi harian, reservasi, dan kenyamanan kucing kesayangan Anda.</p>
                    </div>
                    <div class="banner-badge">
                        <span class="badge badge-success"><i class="icon">🐾</i> Mode: Pemilik Kucing</span>
                    </div>
                </div>
            </div>

            <!-- Kartu Metrik Customer (Dihitung Realtime) -->
            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <div class="stat-icon bg-emerald-light text-emerald">🐱</div>
                    <div class="stat-info">
                        <span class="stat-label">Kucing Terdaftar</span>
                        <div class="stat-value">${myCats.length} Kucing</div>
                        <span class="stat-desc text-muted">Profil kucing milik Anda</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-amber-light text-amber">🏨</div>
                    <div class="stat-info">
                        <span class="stat-label">Sedang Dititipkan</span>
                        <div class="stat-value">${activeStay ? '1 Kucing' : '0'}</div>
                        <span class="stat-desc text-muted">${activeStay ? `${activeStay.catName} (${activeStay.roomNumber || 'Kandang'})` : 'Tidak ada yang menginap'}</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-blue-light text-blue">📜</div>
                    <div class="stat-info">
                        <span class="stat-label">Laporan Harian Diterima</span>
                        <div class="stat-value">${myReports.length}</div>
                        <span class="stat-desc text-muted">Catatan harian kondisi & mood</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-purple-light text-purple">💳</div>
                    <div class="stat-info">
                        <span class="stat-label">Simulasi Tagihan</span>
                        <div class="stat-value">${Utils.formatRupiah(totalEstimatedBill)}</div>
                        <span class="stat-desc text-muted">Estimasi biaya penitipan</span>
                    </div>
                </div>
            </div>

            <!-- Bagian 1: Highlight Kucing yang Sedang Menginap (Jika Ada) -->
            ${activeStay ? `
                <div class="card mb-4" style="border-left: 4px solid var(--primary);">
                    <div class="card-header flex-between">
                        <h3 class="card-title">🟢 Kucing Sedang Menginap: <strong>${Utils.escapeHtml(activeStay.catName)}</strong></h3>
                        <span class="badge badge-success">Masa Inap: ${Utils.formatDate(activeStay.checkInDate)} s/d ${Utils.formatDate(activeStay.checkOutDate)}</span>
                    </div>
                    <div class="card-body">
                        <div class="stay-summary-grid">
                            <div class="stay-detail">
                                <span class="label">Kamar / Kandang:</span>
                                <span class="value">${Utils.escapeHtml(activeStay.roomNumber || 'Kandang Standar')}</span>
                            </div>
                            <div class="stay-detail">
                                <span class="label">Fasilitas Antar-Jemput:</span>
                                <span class="value">${activeStay.needPickup ? 'Aktif (Dijemput/Diantar Driver)' : 'Diantar Mandiri'}</span>
                            </div>
                            <div class="stay-detail">
                                <span class="label">Status Pembayaran:</span>
                                <span class="value"><span class="badge badge-warning">${activeStay.paymentStatus}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Bagian 2: Laporan Harian Terakhir (Daily Report) -->
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Laporan Harian Kondisi Kucing (Daily Report)</h3>
                    <span class="badge badge-info">Pemantauan Staf OemahPus</span>
                </div>
                <div class="card-body">
                    ${myReports.length > 0 ? `
                        <div class="daily-reports-list">
                            ${myReports.map(rep => `
                                <div class="report-box mb-3">
                                    <div class="report-header flex-between">
                                        <h4>🐱 ${Utils.escapeHtml(rep.catName)} - Laporan Tanggal ${Utils.formatDate(rep.date)}</h4>
                                        <span class="badge badge-light">Pencatat: ${Utils.escapeHtml(rep.recordedBy)}</span>
                                    </div>
                                    <div class="report-grid-details mt-2">
                                        <div class="report-item">
                                            <strong>🍽️ Porsi Makan:</strong> <span>${Utils.escapeHtml(rep.mealIntake)}</span>
                                        </div>
                                        <div class="report-item">
                                            <strong>💧 Minum:</strong> <span>${Utils.escapeHtml(rep.waterIntake)}</span>
                                        </div>
                                        <div class="report-item">
                                            <strong>🚽 Buang Air:</strong> <span>Pipis: ${Utils.escapeHtml(rep.urination)}, BAB: ${Utils.escapeHtml(rep.defecation)}</span>
                                        </div>
                                        <div class="report-item full-width">
                                            <strong>❤️ Aktivitas & Mood Kucing:</strong>
                                            <p class="mood-text">${Utils.escapeHtml(rep.activityAndMood)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state text-center p-4">
                            <p class="text-muted">Belum ada laporan harian terbaru untuk kucing Anda. Laporan akan diisi staf operasional setiap sore selama masa penitipan.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Bagian 3: Riwayat & Status Pengajuan Reservasi Saya -->
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Status Reservasi Penitipan Saya</h3>
                    <span class="badge badge-secondary">${myReservations.length} Pengajuan</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>No. Reservasi</th>
                                <th>Kucing</th>
                                <th>Jadwal Masuk - Keluar</th>
                                <th>Layanan Antar-Jemput</th>
                                <th>Estimasi Biaya</th>
                                <th>Status Reservasi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${myReservations.map(r => `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(r.id)}</strong></td>
                                    <td><strong>🐱 ${Utils.escapeHtml(r.catName)}</strong></td>
                                    <td>${Utils.formatDate(r.checkInDate)} s/d ${Utils.formatDate(r.checkOutDate)}</td>
                                    <td>${r.needPickup ? '<span class="badge badge-primary">Antar-Jemput</span>' : '<span class="badge badge-light">Mandiri</span>'}</td>
                                    <td>${Utils.formatRupiah((r.estimatedCost || 0) + (r.pickupCost || 0))}</td>
                                    <td>
                                        <span class="badge ${r.status === 'Sedang Menginap' ? 'badge-success' : (r.status === 'Dikonfirmasi' ? 'badge-info' : 'badge-warning')}">
                                            ${Utils.escapeHtml(r.status)}
                                        </span>
                                    </td>
                                </tr>
                            `).join('') || `<tr><td colspan="6" class="text-center text-muted p-4">Anda belum memiliki riwayat reservasi penitipan.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Bagian 4: Profil Kucing Saya yang Terdaftar -->
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Profil Kucing Saya</h3>
                    <span class="badge badge-secondary">${myCats.length} Kucing</span>
                </div>
                <div class="card-body">
                    ${myCats.length > 0 ? `
                        <div class="cats-mini-grid">
                            ${myCats.map(cat => `
                                <div class="cat-mini-card">
                                    <div class="cat-avatar">🐱</div>
                                    <div class="cat-meta" style="flex: 1;">
                                        <h4>${Utils.escapeHtml(cat.name)}</h4>
                                        <p class="text-muted" style="font-size: 0.85rem;">${Utils.escapeHtml(cat.breed)} • ${Utils.escapeHtml(cat.gender)} • ${Utils.escapeHtml(cat.age)}</p>
                                        <div class="cat-health-tags mt-1">
                                            <span class="badge badge-light">BB: ${cat.initialCheck ? cat.initialCheck.weight : '-'} kg</span>
                                            <span class="badge badge-light">Suhu: ${cat.initialCheck ? cat.initialCheck.temperature : '-'} °C</span>
                                            <span class="badge badge-light">${cat.initialCheck ? Utils.escapeHtml(cat.initialCheck.parasites) : 'Bebas Parasit'}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state text-center p-4">
                            <p class="text-muted">Anda belum mendaftarkan profil kucing. Pada modul berikutnya Anda dapat mendaftarkan kucing kesayangan untuk penitipan.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Pasang interaksi cepat pada elemen dashboard (Action Handlers)
     */
    bindDashboardActions(containerElement, user) {
        // 1. Aksi Konfirmasi Reservasi Cepat oleh Owner
        containerElement.querySelectorAll('.btn-quick-confirm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!AuthService.hasRole('owner')) {
                    Utils.showToast('Hanya Owner yang dapat mengonfirmasi reservasi.', 'error');
                    return;
                }
                const resId = btn.getAttribute('data-id');
                if (!StorageService.updateReservationStatus(resId, 'Dikonfirmasi')) {
                    Utils.showToast('Reservasi tidak dapat diperbarui.', 'error');
                    return;
                }
                Utils.showToast(`Reservasi ${resId} berhasil dikonfirmasi!`, 'success');
                // Re-render dashboard seketika untuk membuktikan Single Source of Truth
                this.render(containerElement, user);
            });
        });

        // 2. Aksi Tandai Selesai Tugas Antar-Jemput oleh Driver
        containerElement.querySelectorAll('.btn-update-pickup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!AuthService.hasRole('staff_driver')) {
                    Utils.showToast('Hanya staf antar-jemput yang dapat memperbarui tugas.', 'error');
                    return;
                }
                const pickupId = btn.getAttribute('data-id');
                const newStatus = btn.getAttribute('data-status') || 'Selesai';
                if (!StorageService.updatePickupStatus(pickupId, newStatus)) {
                    Utils.showToast('Tugas tidak ditemukan atau bukan penugasan Anda.', 'error');
                    return;
                }
                Utils.showToast(`Tugas ${pickupId} berhasil diselesaikan!`, 'success');
                // Re-render dashboard driver seketika
                this.render(containerElement, user);
            });
        });
    }
};
