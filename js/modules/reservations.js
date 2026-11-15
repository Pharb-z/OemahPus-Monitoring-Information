/**
 * OMI - OemahPus Monitoring and Information
 * File: js/modules/reservations.js
 * Deskripsi: Modul Reservasi dan validasi kapasitas penitipan
 */

const ReservationsModule = {
    currentUser: null,
    statusFilter: '',

    render(containerElement, user) {
        const activeUser = AuthService.getCurrentUser();
        if (!containerElement || !user || !activeUser ||
            activeUser.id !== user.id || activeUser.role !== user.role ||
            !['owner', 'staff_ops', 'customer'].includes(activeUser.role)) {
            Utils.showToast('Anda tidak memiliki izin melihat reservasi.', 'error');
            if (containerElement) containerElement.innerHTML = '';
            return;
        }

        this.currentUser = activeUser;
        const reservations = StorageService.getReservations()
            .filter(reservation => !this.statusFilter || reservation.status === this.statusFilter)
            .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
        const canManage = activeUser.role === 'owner';
        const canCreate = canManage || activeUser.role === 'customer';
        const capacity = StorageService.getReservationCapacity();
        const billingOverview = canManage ? StorageService.getBillingOverview() : null;
        if (billingOverview && !billingOverview.success) {
            Utils.showToast(billingOverview.message, 'error');
        }
        const billedReservationIds = new Set(
            billingOverview && billingOverview.success
                ? billingOverview.bills.map(bill => bill.reservationId)
                : []
        );

        containerElement.innerHTML = `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">${activeUser.role === 'customer' ? 'Reservasi Penitipan Saya' : 'Manajemen Reservasi'}</h2>
                        <p class="subtitle">
                            ${activeUser.role === 'customer'
                                ? 'Ajukan penitipan dan pantau status reservasi kucing Anda.'
                                : 'Periksa jadwal penitipan, benturan periode, dan kapasitas kandang.'}
                            Kapasitas terdaftar: <strong>${capacity ? `${capacity} kandang` : 'belum dikonfigurasi'}</strong>.
                        </p>
                    </div>
                    ${canCreate ? `
                        <button type="button" class="btn btn-primary" id="btn-add-reservation">
                            ➕ Buat Reservasi
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="toolbar-card">
                <div class="toolbar-filters">
                    <label for="reservation-status-filter" class="form-label" style="margin: 0;">Filter status</label>
                    <select id="reservation-status-filter" class="filter-select">
                        <option value="">Semua Status</option>
                        ${this.getStatuses().map(status => `
                            <option value="${status}" ${this.statusFilter === status ? 'selected' : ''}>${status}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="text-muted" style="font-size: 0.85rem;">
                    Menampilkan <strong>${reservations.length}</strong> reservasi
                </div>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Reservasi</th>
                                <th>Kucing & Pemilik</th>
                                <th>Check-In</th>
                                <th>Check-Out</th>
                                <th>Lama Inap</th>
                                <th>Status</th>
                                <th>Status Penitipan</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reservations.map(reservation => {
                                const stay = StorageService.getBoardingStayByReservationId(reservation.id);
                                return `
                                    <tr>
                                        <td><strong>${Utils.escapeHtml(reservation.id)}</strong></td>
                                        <td>
                                            <strong>🐱 ${Utils.escapeHtml(reservation.catName)}</strong><br>
                                            <small class="text-muted">${Utils.escapeHtml(reservation.ownerName)}</small>
                                        </td>
                                        <td>${Utils.formatDate(reservation.checkInDate)}</td>
                                        <td>${Utils.formatDate(reservation.checkOutDate)}</td>
                                        <td>${this.getStayLength(reservation.checkInDate, reservation.checkOutDate)} malam</td>
                                        <td><span class="badge ${this.getStatusBadge(reservation.status)}">${Utils.escapeHtml(reservation.status)}</span></td>
                                        <td><span class="badge ${stay && stay.status === 'Sedang Dititipkan' ? 'badge-success' : 'badge-light'}">${Utils.escapeHtml(stay ? stay.status : 'Belum Check-In')}</span></td>
                                        <td>
                                            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                                                <button type="button" class="btn btn-outline btn-sm btn-reservation-detail" data-id="${Utils.escapeHtml(reservation.id)}">Detail</button>
                                                ${canManage && billingOverview.success && !stay && !billedReservationIds.has(reservation.id) && ['Menunggu Konfirmasi', 'Dikonfirmasi'].includes(reservation.status) ? `
                                                    <button type="button" class="btn btn-outline btn-sm btn-reservation-edit" data-id="${Utils.escapeHtml(reservation.id)}">Edit</button>
                                                ` : ''}
                                                ${canManage && reservation.status === 'Menunggu Konfirmasi' ? `
                                                    <button type="button" class="btn btn-primary btn-sm btn-reservation-confirm" data-id="${Utils.escapeHtml(reservation.id)}">Konfirmasi</button>
                                                ` : ''}
                                                ${canManage && !stay && !billedReservationIds.has(reservation.id) && ['Menunggu Konfirmasi', 'Dikonfirmasi'].includes(reservation.status) ? `
                                                    <button type="button" class="btn btn-danger-outline btn-sm btn-reservation-cancel" data-id="${Utils.escapeHtml(reservation.id)}">Batalkan</button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('') || `
                                <tr><td colspan="8" class="text-center text-muted p-4">Belum ada reservasi untuk ditampilkan.</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="reservation-modal-container"></div>
        `;

        this.bindEvents(containerElement);
    },

    getStatuses() {
        return ['Menunggu Konfirmasi', 'Dikonfirmasi', 'Sedang Menginap', 'Selesai', 'Dibatalkan'];
    },

    getStatusBadge(status) {
        const badges = {
            'Menunggu Konfirmasi': 'badge-warning',
            'Dikonfirmasi': 'badge-info',
            'Sedang Menginap': 'badge-success',
            'Selesai': 'badge-secondary',
            'Dibatalkan': 'badge-light'
        };
        return badges[status] || 'badge-light';
    },

    getStayLength(checkInDate, checkOutDate) {
        const start = new Date(`${checkInDate}T00:00:00Z`);
        const end = new Date(`${checkOutDate}T00:00:00Z`);
        return Math.round((end - start) / 86400000);
    },

    bindEvents(containerElement) {
        containerElement.querySelector('#reservation-status-filter').addEventListener('change', event => {
            this.statusFilter = event.target.value;
            this.render(containerElement, this.currentUser);
        });

        const addButton = containerElement.querySelector('#btn-add-reservation');
        if (addButton) addButton.addEventListener('click', () => this.openForm());

        containerElement.querySelectorAll('.btn-reservation-detail').forEach(button => {
            button.addEventListener('click', () => this.openDetail(button.dataset.id));
        });
        containerElement.querySelectorAll('.btn-reservation-edit').forEach(button => {
            button.addEventListener('click', () => this.openForm(StorageService.getReservationById(button.dataset.id)));
        });
        containerElement.querySelectorAll('.btn-reservation-confirm').forEach(button => {
            button.addEventListener('click', () => this.changeStatus(button.dataset.id, 'Dikonfirmasi'));
        });
        containerElement.querySelectorAll('.btn-reservation-cancel').forEach(button => {
            button.addEventListener('click', () => this.changeStatus(button.dataset.id, 'Dibatalkan'));
        });
    },

    openForm(reservation = null) {
        const user = AuthService.getCurrentUser();
        const billingOverview = reservation && user && user.role === 'owner'
            ? StorageService.getBillingOverview()
            : null;
        if (!user || !['owner', 'customer'].includes(user.role) ||
            (reservation && user.role !== 'owner') ||
            (reservation && StorageService.getBoardingStayByReservationId(reservation.id)) ||
            (reservation && (!billingOverview.success ||
                billingOverview.bills.some(bill => bill.reservationId === reservation.id)))) {
            Utils.showToast('Anda tidak memiliki izin membuat atau mengedit reservasi.', 'error');
            return;
        }
        const cats = StorageService.getCats();
        if (!cats.length) {
            Utils.showToast('Daftarkan data kucing sebelum membuat reservasi.', 'error');
            if (user.role === 'customer') App.navigateTo('my-cats');
            return;
        }

        const pickupConfiguration = reservation
            ? StorageService.getReservationPickupConfiguration(reservation)
            : { state: 'valid', pickupType: 'none', needPickup: false, pickupAddress: '' };
        let hasRelatedPickups = false;
        if (reservation) {
            let pickups;
            try {
                pickups = StorageService.getPickups();
            } catch (error) {
                Utils.showToast(
                    'Data tugas antar-jemput tidak dapat diperiksa; reservasi tidak dapat diedit.',
                    'error'
                );
                return;
            }
            if (!Array.isArray(pickups) || !pickups.every(pickup =>
                pickup !== null && typeof pickup === 'object' && !Array.isArray(pickup)
            )) {
                Utils.showToast(
                    'Struktur data tugas antar-jemput tidak valid; reservasi tidak dapat diedit.',
                    'error'
                );
                return;
            }
            hasRelatedPickups = pickups.some(pickup => pickup.reservationId === reservation.id);
        }

        const modal = document.getElementById('reservation-modal-container');
        if (!modal) return;
        const today = new Date();
        const minDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0')
        ].join('-');
        const initialCheckIn = reservation ? reservation.checkInDate : '';
        const initialCheckOut = reservation ? reservation.checkOutDate : '';
        const initialCatId = reservation ? reservation.catId : '';
        const canConfigurePickup = !reservation || pickupConfiguration.state === 'valid';
        const pickupFieldsLocked = !!reservation && hasRelatedPickups;

        modal.innerHTML = `
            <div class="modal-backdrop" id="reservation-form-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">${reservation ? 'Edit Reservasi' : 'Buat Reservasi Penitipan'}</h3>
                        <button type="button" class="modal-close-btn" id="reservation-modal-close">&times;</button>
                    </div>
                    <form id="reservation-form">
                        <div class="modal-body">
                            <div class="health-callout">
                                Periode memakai check-in inklusif dan check-out eksklusif. Biaya dan pembayaran tidak dihitung pada tahap ini.
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="reservation-cat">Kucing <span class="required">*</span></label>
                                <select id="reservation-cat" class="form-control" required>
                                    <option value="">Pilih kucing</option>
                                    ${cats.map(cat => `
                                        <option value="${Utils.escapeHtml(cat.id)}" ${initialCatId === cat.id ? 'selected' : ''}>
                                            ${Utils.escapeHtml(cat.name)}${user.role === 'owner' ? ` — ${Utils.escapeHtml(cat.ownerName)}` : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="reservation-check-in">Tanggal check-in <span class="required">*</span></label>
                                    <input type="date" id="reservation-check-in" class="form-control" min="${minDate}" value="${Utils.escapeHtml(initialCheckIn)}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="reservation-check-out">Tanggal check-out <span class="required">*</span></label>
                                    <input type="date" id="reservation-check-out" class="form-control" min="${minDate}" value="${Utils.escapeHtml(initialCheckOut)}" required>
                                </div>
                            </div>
                            ${canConfigurePickup ? `
                                <div class="form-group">
                                    <label class="form-label" for="reservation-pickup-type">Layanan antar-jemput</label>
                                    <select id="reservation-pickup-type" class="form-control"
                                        ${pickupFieldsLocked ? 'disabled' : ''}>
                                        <option value="none" ${pickupConfiguration.pickupType === 'none' ? 'selected' : ''}>Tanpa layanan antar-jemput</option>
                                        <option value="pickup" ${pickupConfiguration.pickupType === 'pickup' ? 'selected' : ''}>Penjemputan</option>
                                        <option value="delivery" ${pickupConfiguration.pickupType === 'delivery' ? 'selected' : ''}>Pengantaran kembali</option>
                                        <option value="both" ${pickupConfiguration.pickupType === 'both' ? 'selected' : ''}>Penjemputan dan pengantaran kembali</option>
                                    </select>
                                </div>
                                <div class="form-group" id="reservation-pickup-address-group"
                                    style="${pickupConfiguration.pickupType === 'none' ? 'display: none;' : ''}">
                                    <label class="form-label" for="reservation-pickup-address">Alamat awal reservasi <span class="required">*</span></label>
                                    <input type="text" id="reservation-pickup-address" class="form-control"
                                        maxlength="500" value="${Utils.escapeHtml(pickupConfiguration.pickupAddress || '')}"
                                        ${pickupConfiguration.pickupType === 'none' ? '' : 'required'}
                                        ${pickupFieldsLocked ? 'disabled' : ''}>
                                    <small class="form-helper">
                                        Alamat ini menjadi nilai awal tugas; Owner atau Staf Operasional dapat menyesuaikan alamat pada setiap tugas antar-jemput.
                                    </small>
                                </div>
                                ${pickupFieldsLocked ? `
                                    <div class="health-callout">
                                        Layanan antar-jemput tidak dapat diubah dari form reservasi karena sudah memiliki tugas terkait.
                                        Alamat tiap tugas dapat diatur melalui pengelolaan antar-jemput.
                                    </div>
                                ` : ''}
                            ` : `
                                <div class="health-callout">
                                    ${Utils.escapeHtml(pickupConfiguration.message)}
                                    Konfigurasi lama dipertahankan dan tidak dapat diubah dari form ini.
                                </div>
                            `}
                            <div id="reservation-availability" class="badge badge-info" aria-live="polite">
                                Pilih kucing dan tanggal untuk memeriksa ketersediaan kandang.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" id="reservation-modal-cancel">Batal</button>
                            <button type="submit" class="btn btn-primary">${reservation ? 'Simpan Perubahan' : 'Ajukan Reservasi'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const close = () => { modal.innerHTML = ''; };
        modal.querySelector('#reservation-modal-close').addEventListener('click', close);
        modal.querySelector('#reservation-modal-cancel').addEventListener('click', close);

        const pickupTypeInput = modal.querySelector('#reservation-pickup-type');
        const pickupAddressInput = modal.querySelector('#reservation-pickup-address');
        if (pickupTypeInput && !pickupFieldsLocked) {
            pickupTypeInput.addEventListener('change', () => {
                const requiresAddress = pickupTypeInput.value !== 'none';
                modal.querySelector('#reservation-pickup-address-group').style.display =
                    requiresAddress ? '' : 'none';
                pickupAddressInput.required = requiresAddress;
            });
        }

        const checkAvailability = () => {
            const catId = modal.querySelector('#reservation-cat').value;
            const checkInDate = modal.querySelector('#reservation-check-in').value;
            const checkOutDate = modal.querySelector('#reservation-check-out').value;
            const result = StorageService.checkReservationAvailability({
                catId,
                checkInDate,
                checkOutDate,
                reservationId: reservation ? reservation.id : null
            });
            modal.querySelector('#reservation-availability').textContent = result.message;
            modal.querySelector('#reservation-availability').className = result.available ? 'text-emerald' : 'text-danger';
        };
        const checkInInput = modal.querySelector('#reservation-check-in');
        const checkOutInput = modal.querySelector('#reservation-check-out');
        if (reservation) modal.querySelector('#reservation-cat').disabled = true;
        checkInInput.addEventListener('change', () => {
            if (checkInInput.value) checkOutInput.min = checkInInput.value;
        });
        ['#reservation-cat', '#reservation-check-in', '#reservation-check-out'].forEach(selector => {
            modal.querySelector(selector).addEventListener('change', checkAvailability);
        });
        if (initialCheckIn) checkOutInput.min = initialCheckIn;
        if (initialCheckIn && initialCheckOut) checkAvailability();

        modal.querySelector('#reservation-form').addEventListener('submit', async event => {
            event.preventDefault();
            const reservationData = {
                id: reservation ? reservation.id : undefined,
                catId: reservation ? reservation.catId : modal.querySelector('#reservation-cat').value,
                checkInDate: modal.querySelector('#reservation-check-in').value,
                checkOutDate: modal.querySelector('#reservation-check-out').value
            };
            if (canConfigurePickup) {
                const pickupType = pickupTypeInput.value;
                const pickupAddress = pickupType === 'none' ? '' : pickupAddressInput.value.trim();
                if (!['none', 'pickup', 'delivery', 'both'].includes(pickupType) ||
                    (pickupType !== 'none' && (!pickupAddress || pickupAddress.length > 500))) {
                    Utils.showToast(
                        pickupType === 'none'
                            ? 'Pilihan layanan antar-jemput tidak valid.'
                            : 'Alamat layanan wajib diisi maksimal 500 karakter.',
                        'error'
                    );
                    return;
                }
                Object.assign(reservationData, {
                    pickupType,
                    needPickup: pickupType !== 'none',
                    pickupAddress
                });
            }
            const result = await StorageService.saveReservation(reservationData);
            if (!result.success) {
                Utils.showToast(result.message, 'error');
                checkAvailability();
                return;
            }
            Utils.showToast(reservation ? 'Reservasi berhasil diperbarui.' : 'Reservasi berhasil diajukan.', 'success');
            close();
            this.render(document.getElementById('main-content-container'), AuthService.getCurrentUser());
        });
    },

    openDetail(reservationId) {
        const user = AuthService.getCurrentUser();
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            Utils.showToast('Anda tidak memiliki izin melihat detail reservasi.', 'error');
            return;
        }
        const reservation = StorageService.getReservationById(reservationId);
        if (!reservation) {
            Utils.showToast('Reservasi tidak ditemukan atau bukan milik Anda.', 'error');
            return;
        }
        const stay = StorageService.getBoardingStayByReservationId(reservationId);
        const pickupConfiguration = StorageService.getReservationPickupConfiguration(reservation);
        const pickupTypeLabels = {
            none: 'Tanpa layanan antar-jemput',
            pickup: 'Penjemputan',
            delivery: 'Pengantaran kembali',
            both: 'Penjemputan dan pengantaran kembali'
        };
        const pickupDetails = pickupConfiguration.state === 'valid'
            ? `
                <p><strong>Layanan antar-jemput:</strong> ${Utils.escapeHtml(pickupTypeLabels[pickupConfiguration.pickupType])}</p>
                ${pickupConfiguration.pickupType !== 'none' && pickupConfiguration.pickupAddress
                    ? `<p><strong>Alamat awal reservasi:</strong> ${Utils.escapeHtml(pickupConfiguration.pickupAddress)}</p>`
                    : ''}
            `
            : `
                <p><strong>Layanan antar-jemput:</strong> ${Utils.escapeHtml(pickupConfiguration.message)}</p>
                ${typeof reservation.pickupAddress === 'string' && reservation.pickupAddress.trim()
                    ? `<p><strong>Alamat tersimpan (belum diverifikasi):</strong> ${Utils.escapeHtml(reservation.pickupAddress)}</p>`
                    : ''}
            `;
        const modal = document.getElementById('reservation-modal-container');
        if (!modal) return;
        modal.innerHTML = `
            <div class="modal-backdrop" id="reservation-detail-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">Detail Reservasi ${Utils.escapeHtml(reservation.id)}</h3>
                        <button type="button" class="modal-close-btn" id="reservation-detail-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="cat-meta-list">
                            <p><strong>Kucing:</strong> ${Utils.escapeHtml(reservation.catName)}</p>
                            <p><strong>Pemilik:</strong> ${Utils.escapeHtml(reservation.ownerName)}</p>
                            <p><strong>Check-in:</strong> ${Utils.formatDate(reservation.checkInDate)} (inklusif)</p>
                            <p><strong>Check-out:</strong> ${Utils.formatDate(reservation.checkOutDate)} (eksklusif)</p>
                            <p><strong>Lama inap:</strong> ${this.getStayLength(reservation.checkInDate, reservation.checkOutDate)} malam</p>
                            <p><strong>Status:</strong> <span class="badge ${this.getStatusBadge(reservation.status)}">${Utils.escapeHtml(reservation.status)}</span></p>
                            ${pickupDetails}
                            <p><strong>Status penitipan:</strong> ${Utils.escapeHtml(stay ? stay.status : 'Belum Check-In')}</p>
                            ${stay ? `<p><strong>Kandang:</strong> ${Utils.escapeHtml(stay.kennel || 'Belum tercatat')}</p>` : ''}
                            <p><strong>Diajukan:</strong> ${Utils.formatDate(reservation.createdAt)}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="reservation-detail-ok">Tutup</button>
                    </div>
                </div>
            </div>
        `;
        const close = () => { modal.innerHTML = ''; };
        modal.querySelector('#reservation-detail-close').addEventListener('click', close);
        modal.querySelector('#reservation-detail-ok').addEventListener('click', close);
    },

    async changeStatus(reservationId, status) {
        if (!AuthService.hasRole('owner')) {
            Utils.showToast('Hanya Owner yang dapat mengubah status reservasi.', 'error');
            return;
        }
        const success = await StorageService.updateReservationStatus(reservationId, status);
        if (!success) {
            Utils.showToast('Perubahan status reservasi tidak diizinkan atau gagal disimpan.', 'error');
            return;
        }
        Utils.showToast(`Status reservasi diperbarui menjadi ${status}.`, 'success');
        this.render(document.getElementById('main-content-container'), AuthService.getCurrentUser());
    }
};
