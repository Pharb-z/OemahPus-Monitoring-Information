/**
 * OMI - OemahPus Monitoring and Information
 * File: js/modules/boarding.js
 * Deskripsi: Check-in/check-out, pemantauan penitipan, dan laporan harian
 */

const BoardingModule = {
    currentUser: null,
    mode: 'stays',

    render(containerElement, user, mode = 'stays') {
        const activeUser = AuthService.getCurrentUser();
        if (!containerElement || !user || !activeUser ||
            activeUser.id !== user.id || activeUser.role !== user.role ||
            !['owner', 'staff_ops', 'customer'].includes(activeUser.role) ||
            !['stays', 'reports'].includes(mode)) {
            Utils.showToast('Anda tidak memiliki izin membuka informasi penitipan.', 'error');
            if (containerElement) containerElement.innerHTML = '';
            return;
        }

        this.currentUser = activeUser;
        this.mode = mode;
        if (mode === 'reports') this.renderReports(containerElement, activeUser);
        else this.renderStays(containerElement, activeUser);
    },

    renderStays(containerElement, user) {
        const stays = StorageService.getBoardingStays()
            .sort((a, b) => (b.checkedInAt || b.checkInDate || '').localeCompare(a.checkedInAt || a.checkInDate || ''));
        const activeStays = stays.filter(stay => stay.status === 'Sedang Dititipkan');
        const reservations = user.role === 'customer' ? [] : StorageService.getReservations()
            .filter(reservation =>
                reservation.status === 'Dikonfirmasi' &&
                !StorageService.getBoardingStayByReservationId(reservation.id)
            )
            .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
        const canManage = ['owner', 'staff_ops'].includes(user.role);
        const capacity = StorageService.getReservationCapacity();
        const today = StorageService.getLocalDateString(new Date());

        containerElement.innerHTML = `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">${user.role === 'customer' ? 'Penitipan Kucing Saya' : 'Monitoring Penitipan Kucing'}</h2>
                        <p class="subtitle">
                            Status penitipan dicatat terpisah dari status reservasi.
                            ${capacity ? `Kapasitas terdaftar: <strong>${capacity} kandang</strong>.` : 'Kapasitas kandang belum dikonfigurasi.'}
                        </p>
                    </div>
                    ${user.role !== 'customer' ? `
                        <button type="button" class="btn btn-outline" id="btn-open-reports">📝 Laporan Harian</button>
                    ` : ''}
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Kucing yang Sedang Dititipkan</h3>
                    <span class="badge badge-success">${activeStays.length} Kucing Aktif</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Kucing</th>
                                <th>Pemilik</th>
                                <th>Kandang</th>
                                <th>Check-In Aktual</th>
                                <th>Rencana Check-Out</th>
                                <th>Status Penitipan</th>
                                ${canManage ? '<th>Aksi</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${activeStays.map(stay => `
                                <tr>
                                    <td><strong>🐱 ${Utils.escapeHtml(stay.catName)}</strong></td>
                                    <td>${Utils.escapeHtml(stay.ownerName)}</td>
                                    <td><span class="badge badge-secondary">${Utils.escapeHtml(stay.kennel || 'Belum tercatat')}</span></td>
                                    <td>${stay.checkedInAt ? Utils.formatDateTime(stay.checkedInAt) : `${Utils.formatDate(stay.checkInDate)} (data lama, waktu tidak tersedia)`}</td>
                                    <td>${Utils.formatDate(stay.plannedCheckOutDate)}</td>
                                    <td><span class="badge badge-success">${Utils.escapeHtml(stay.status)}</span></td>
                                    ${canManage ? `
                                        <td>
                                            <div style="display:flex;flex-wrap:wrap;gap:.4rem;">
                                                <button type="button" class="btn btn-outline btn-sm btn-stay-report" data-id="${Utils.escapeHtml(stay.id)}">Laporan</button>
                                                <button type="button" class="btn btn-danger-outline btn-sm btn-stay-checkout" data-id="${Utils.escapeHtml(stay.id)}">Check-Out</button>
                                            </div>
                                        </td>
                                    ` : ''}
                                </tr>
                            `).join('') || `
                                <tr><td colspan="${canManage ? 7 : 6}" class="text-center text-muted p-4">Tidak ada kucing yang sedang dititipkan.</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>

            ${user.role === 'customer' ? this.renderStayHistory(stays) : `
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Reservasi Terkonfirmasi — Siap Check-In</h3>
                        <span class="badge badge-info">${reservations.length} Reservasi</span>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>Kucing & Pemilik</th><th>Tanggal Check-In</th><th>Rencana Check-Out</th><th>Status Reservasi</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${reservations.map(reservation => {
                                    const canCheckIn = today >= reservation.checkInDate && today < reservation.checkOutDate;
                                    return `
                                        <tr>
                                            <td><strong>🐱 ${Utils.escapeHtml(reservation.catName)}</strong><br><small>${Utils.escapeHtml(reservation.ownerName)}</small></td>
                                            <td>${Utils.formatDate(reservation.checkInDate)}</td>
                                            <td>${Utils.formatDate(reservation.checkOutDate)}</td>
                                            <td><span class="badge badge-info">${Utils.escapeHtml(reservation.status)}</span></td>
                                            <td>
                                                <button type="button" class="btn btn-primary btn-sm btn-reservation-checkin" data-id="${Utils.escapeHtml(reservation.id)}" ${canCheckIn ? '' : 'disabled'}>
                                                    ${canCheckIn ? 'Check-In' : 'Di luar periode'}
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') || `
                                    <tr><td colspan="5" class="text-center text-muted p-4">Tidak ada reservasi terkonfirmasi yang belum check-in.</td></tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            `}
            <div id="boarding-modal-container"></div>
        `;

        this.bindStayEvents(containerElement);
    },

    renderStayHistory(stays) {
        const history = stays.filter(stay => stay.status !== 'Sedang Dititipkan');
        return `
            <div class="card">
                <div class="card-header"><h3 class="card-title">Riwayat Penitipan</h3></div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead><tr><th>Kucing</th><th>Kandang</th><th>Check-In</th><th>Check-Out Aktual</th><th>Status Penitipan</th></tr></thead>
                        <tbody>
                            ${history.map(stay => `
                                <tr>
                                    <td>${Utils.escapeHtml(stay.catName)}</td>
                                    <td>${Utils.escapeHtml(stay.kennel || 'Belum tercatat')}</td>
                                    <td>${stay.checkedInAt ? Utils.formatDateTime(stay.checkedInAt) : Utils.formatDate(stay.checkInDate)}</td>
                                    <td>${stay.checkedOutAt ? Utils.formatDateTime(stay.checkedOutAt) : '-'}</td>
                                    <td><span class="badge badge-secondary">${Utils.escapeHtml(stay.status)}</span></td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="text-center text-muted p-4">Belum ada riwayat penitipan.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderReports(containerElement, user) {
        const reports = StorageService.getDailyReports()
            .sort((a, b) => b.date.localeCompare(a.date) || (b.recordedAt || '').localeCompare(a.recordedAt || ''));
        const activeStays = StorageService.getActiveBoardingStays();
        const canManage = ['owner', 'staff_ops'].includes(user.role);
        const today = StorageService.getLocalDateString(new Date());

        containerElement.innerHTML = `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">${user.role === 'customer' ? 'Laporan Harian Kucing Saya' : 'Laporan Harian Penitipan'}</h2>
                        <p class="subtitle">Catatan aktivitas dan kondisi selama masa penitipan.</p>
                    </div>
                    ${user.role !== 'customer' ? `
                        <button type="button" class="btn btn-outline" id="btn-open-stays">🏨 Monitoring Penitipan</button>
                    ` : ''}
                </div>
            </div>

            ${canManage ? `
                <div class="card mb-4">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Kucing Aktif — Laporan Hari Ini</h3>
                        <span class="badge badge-success">${activeStays.length} Kucing</span>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>Kucing</th><th>Pemilik</th><th>Kandang</th><th>Check-In</th><th>Laporan ${Utils.formatDate(today)}</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${activeStays.map(stay => {
                                    const report = reports.find(item => item.boardingStayId === stay.id && item.date === today) ||
                                        reports.find(item => item.catId === stay.catId && item.date === today);
                                    return `
                                        <tr>
                                            <td><strong>${Utils.escapeHtml(stay.catName)}</strong></td>
                                            <td>${Utils.escapeHtml(stay.ownerName)}</td>
                                            <td>${Utils.escapeHtml(stay.kennel || 'Belum tercatat')}</td>
                                            <td>${Utils.formatDate(stay.checkInDate)}</td>
                                            <td>${report ? '<span class="badge badge-success">Sudah diisi</span>' : '<span class="badge badge-warning">Belum diisi</span>'}</td>
                                            <td><button type="button" class="btn btn-primary btn-sm btn-stay-report" data-id="${Utils.escapeHtml(stay.id)}" data-report-id="${report ? Utils.escapeHtml(report.id) : ''}">${report ? 'Edit Laporan' : 'Buat Laporan'}</button></td>
                                        </tr>
                                    `;
                                }).join('') || '<tr><td colspan="6" class="text-center text-muted p-4">Tidak ada kucing aktif untuk dilaporkan.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <div class="card">
                <div class="card-header flex-between">
                    <h3 class="card-title">Riwayat Laporan</h3>
                    <span class="badge badge-info">${reports.length} Laporan</span>
                </div>
                <div class="card-body">
                    ${reports.map(report => {
                        const stay = StorageService.getBoardingStayById(report.boardingStayId);
                        const editable = canManage && stay && stay.status === 'Sedang Dititipkan';
                        return `
                            <article class="report-box mb-3">
                                <div class="report-header flex-between">
                                    <h4>🐱 ${Utils.escapeHtml(report.catName)} — ${Utils.formatDate(report.date)}</h4>
                                    <span class="badge badge-light">Pencatat: ${Utils.escapeHtml(report.recordedBy)}</span>
                                </div>
                                <div class="report-grid-details mt-2">
                                    <div class="report-item"><strong>🍽️ Makan:</strong> <span>${Utils.escapeHtml(report.mealIntake)}</span></div>
                                    <div class="report-item"><strong>💧 Minum:</strong> <span>${Utils.escapeHtml(report.waterIntake)}</span></div>
                                    <div class="report-item"><strong>🚽 Buang air:</strong> <span>BAK: ${Utils.escapeHtml(report.urination)}; BAB: ${Utils.escapeHtml(report.defecation)}</span></div>
                                    <div class="report-item full-width"><strong>❤️ Aktivitas &amp; mood:</strong><p class="mood-text">${Utils.escapeHtml(report.activityAndMood)}</p></div>
                                </div>
                                ${editable ? `<button type="button" class="btn btn-outline btn-sm mt-2 btn-edit-report" data-id="${Utils.escapeHtml(report.id)}">Edit Laporan</button>` : ''}
                            </article>
                        `;
                    }).join('') || '<div class="text-center text-muted p-4">Belum ada laporan harian untuk ditampilkan.</div>'}
                </div>
            </div>
            <div id="boarding-modal-container"></div>
        `;

        const staysLink = containerElement.querySelector('#btn-open-stays');
        if (staysLink) staysLink.addEventListener('click', () => App.navigateTo(user.role === 'customer' ? 'my-boarding' : 'boarding'));
        containerElement.querySelectorAll('.btn-stay-report').forEach(button => {
            button.addEventListener('click', () => {
                const report = button.dataset.reportId
                    ? StorageService.getDailyReportById(button.dataset.reportId)
                    : null;
                this.openReportForm(button.dataset.id, report);
            });
        });
        containerElement.querySelectorAll('.btn-edit-report').forEach(button => {
            button.addEventListener('click', () => {
                const report = StorageService.getDailyReportById(button.dataset.id);
                if (report) this.openReportForm(report.boardingStayId, report);
            });
        });
    },

    bindStayEvents(containerElement) {
        const reportsButton = containerElement.querySelector('#btn-open-reports');
        if (reportsButton) reportsButton.addEventListener('click', () => App.navigateTo('reports'));
        containerElement.querySelectorAll('.btn-reservation-checkin').forEach(button => {
            button.addEventListener('click', () => this.openCheckInForm(button.dataset.id));
        });
        containerElement.querySelectorAll('.btn-stay-checkout').forEach(button => {
            button.addEventListener('click', () => this.checkOut(button.dataset.id));
        });
        containerElement.querySelectorAll('.btn-stay-report').forEach(button => {
            button.addEventListener('click', () => this.openReportForm(button.dataset.id));
        });
    },

    openCheckInForm(reservationId) {
        const user = AuthService.getCurrentUser();
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            Utils.showToast('Anda tidak memiliki izin melakukan check-in.', 'error');
            return;
        }
        const reservation = StorageService.getReservationById(reservationId);
        if (!reservation || reservation.status !== 'Dikonfirmasi' ||
            StorageService.getBoardingStayByReservationId(reservationId)) {
            Utils.showToast('Reservasi tidak valid untuk check-in.', 'error');
            return;
        }
        const modal = document.getElementById('boarding-modal-container');
        if (!modal) return;
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">Check-In ${Utils.escapeHtml(reservation.catName)}</h3>
                        <button type="button" class="modal-close-btn" data-modal-close>&times;</button>
                    </div>
                    <form id="boarding-checkin-form">
                        <div class="modal-body">
                            <p>Reservasi: <strong>${Utils.escapeHtml(reservation.id)}</strong> — ${Utils.formatDate(reservation.checkInDate)} s/d ${Utils.formatDate(reservation.checkOutDate)}</p>
                            <div class="form-group">
                                <label class="form-label" for="boarding-kennel">Kandang <span class="required">*</span></label>
                                <input class="form-control" id="boarding-kennel" maxlength="60" pattern="[A-Za-z0-9][A-Za-z0-9 ._\\-]{0,59}" title="Awali dengan huruf/angka; gunakan hanya huruf, angka, spasi, titik, garis bawah, atau tanda hubung." required placeholder="Masukkan nama/nomor kandang">
                                <small class="form-helper">Awali dengan huruf/angka; gunakan huruf, angka, spasi, titik, garis bawah, atau tanda hubung. Format diperiksa, tetapi belum dicocokkan dengan daftar kandang resmi.</small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" data-modal-close>Batal</button>
                            <button type="submit" class="btn btn-primary">Simpan Check-In</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        const close = () => { modal.innerHTML = ''; };
        modal.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', close));
        modal.querySelector('#boarding-checkin-form').addEventListener('submit', event => {
            event.preventDefault();
            const result = StorageService.checkInReservation({
                reservationId,
                kennel: modal.querySelector('#boarding-kennel').value
            });
            if (!result.success) {
                Utils.showToast(result.message, 'error');
                return;
            }
            Utils.showToast('Check-in berhasil dicatat.', 'success');
            close();
            this.render(document.getElementById('main-content-container'), AuthService.getCurrentUser(), 'stays');
        });
    },

    checkOut(stayId) {
        const result = StorageService.checkOutBoardingStay(stayId);
        if (!result.success) {
            Utils.showToast(result.message, 'error');
            return;
        }
        Utils.showToast('Check-out aktual berhasil dicatat.', 'success');
        this.render(document.getElementById('main-content-container'), AuthService.getCurrentUser(), 'stays');
    },

    openReportForm(stayId, report = null) {
        const user = AuthService.getCurrentUser();
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            Utils.showToast('Anda tidak memiliki izin mengelola laporan harian.', 'error');
            return;
        }
        const stay = StorageService.getBoardingStayById(stayId);
        if (!stay || stay.status !== 'Sedang Dititipkan') {
            Utils.showToast('Laporan hanya dapat dikelola selama penitipan masih aktif.', 'error');
            return;
        }
        const modal = document.getElementById('boarding-modal-container');
        if (!modal) return;
        const today = StorageService.getLocalDateString(new Date());
        const date = report ? report.date : today;
        const fields = [
            ['mealIntake', 'Asupan makan', 'Contoh: porsi dan jenis makanan'],
            ['waterIntake', 'Asupan minum', 'Contoh: normal atau jumlah yang teramati'],
            ['urination', 'Buang air kecil', 'Catat frekuensi/kondisi yang teramati'],
            ['defecation', 'Buang air besar', 'Catat frekuensi/kondisi yang teramati'],
            ['activityAndMood', 'Aktivitas & mood', 'Catat perilaku/aktivitas yang terlihat']
        ];
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">${report ? 'Edit' : 'Buat'} Laporan Harian</h3>
                        <button type="button" class="modal-close-btn" data-modal-close>&times;</button>
                    </div>
                    <form id="boarding-report-form">
                        <div class="modal-body">
                            <p><strong>${Utils.escapeHtml(stay.catName)}</strong> — ${Utils.escapeHtml(stay.kennel || 'Kandang')}</p>
                            <div class="form-group">
                                <label class="form-label" for="report-date">Tanggal laporan <span class="required">*</span></label>
                                <input class="form-control" type="date" id="report-date" min="${Utils.escapeHtml(stay.checkInDate)}" max="${today}" value="${Utils.escapeHtml(date)}" required>
                            </div>
                            ${fields.map(([name, label, placeholder]) => `
                                <div class="form-group">
                                    <label class="form-label" for="report-${name}">${label} <span class="required">*</span></label>
                                    <textarea class="form-control" id="report-${name}" maxlength="500" rows="${name === 'activityAndMood' ? 3 : 2}" required placeholder="${placeholder}">${Utils.escapeHtml(report ? report[name] : '')}</textarea>
                                </div>
                            `).join('')}
                            <small class="form-helper">Catat hasil pengamatan harian saja; laporan ini bukan diagnosis atau rekomendasi medis.</small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" data-modal-close>Batal</button>
                            <button type="submit" class="btn btn-primary">Simpan Laporan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        const close = () => { modal.innerHTML = ''; };
        modal.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', close));
        modal.querySelector('#boarding-report-form').addEventListener('submit', event => {
            event.preventDefault();
            const payload = {
                id: report ? report.id : undefined,
                boardingStayId: stay.id,
                date: modal.querySelector('#report-date').value
            };
            fields.forEach(([name]) => {
                payload[name] = modal.querySelector(`#report-${name}`).value;
            });
            const result = StorageService.saveDailyReport(payload);
            if (!result.success) {
                Utils.showToast(result.message, 'error');
                return;
            }
            Utils.showToast(report ? 'Laporan harian berhasil diperbarui.' : 'Laporan harian berhasil disimpan.', 'success');
            close();
            this.render(document.getElementById('main-content-container'), AuthService.getCurrentUser(), 'reports');
        });
    }
};
