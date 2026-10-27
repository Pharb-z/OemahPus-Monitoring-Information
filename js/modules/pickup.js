/**
 * OMI - OemahPus Monitoring and Information
 * File: js/modules/pickup.js
 * Deskripsi: Pengelolaan tugas antar-jemput untuk Owner dan Staf Operasional
 */

const PickupModule = {
    currentUser: null,
    searchQuery: '',

    render(containerElement, user) {
        const activeUser = AuthService.getCurrentUser();
        if (!containerElement || !user || !activeUser ||
            activeUser.id !== user.id || activeUser.role !== user.role ||
            !['owner', 'staff_ops'].includes(activeUser.role)) {
            Utils.showToast('Anda tidak memiliki izin mengelola antar-jemput.', 'error');
            if (containerElement) containerElement.innerHTML = '';
            return;
        }

        this.currentUser = activeUser;
        let result;
        try {
            result = StorageService.getPickupManagementData();
        } catch (error) {
            if (!error || error.name !== 'StoredDataReadError') {
                Utils.showToast('Data antar-jemput gagal dimuat.', 'error');
            }
            containerElement.innerHTML = `
                <div class="card p-4 text-center">
                    <h2 class="title-lg">Data antar-jemput tidak tersedia</h2>
                    <p class="subtitle">Pembacaan data gagal. Periksa penyimpanan sebelum mencoba kembali.</p>
                </div>
            `;
            return;
        }
        if (!result.success) {
            Utils.showToast(result.message, 'error');
            containerElement.innerHTML = `
                <div class="card p-4 text-center">
                    <h2 class="title-lg">Data antar-jemput tidak tersedia</h2>
                    <p class="subtitle">${Utils.escapeHtml(result.message)}</p>
                </div>
            `;
            return;
        }

        const query = this.searchQuery.trim().toLowerCase();
        const pickups = result.pickups.filter(pickup =>
            [pickup.id, pickup.reservationId, pickup.catName, pickup.ownerName,
                pickup.type, pickup.address, pickup.driverName, pickup.status]
                .some(value => String(value || '').toLowerCase().includes(query))
        );
        const choices = result.reservations.flatMap(reservation =>
            reservation.availablePickupTypes.map(type => ({ reservation, type }))
        );
        this.reservationChoices = choices;

        containerElement.innerHTML = `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">Pengelolaan Antar-Jemput</h2>
                        <p class="subtitle">
                            Buat dan atur tugas dari reservasi yang meminta layanan dan sudah
                            <strong>Dikonfirmasi</strong> atau <strong>Sedang Menginap</strong>.
                        </p>
                    </div>
                    ${choices.length && result.drivers.length ? `
                        <button type="button" class="btn btn-primary" id="btn-add-pickup">➕ Buat Tugas</button>
                    ` : ''}
                </div>
            </div>

            ${choices.length === 0 ? `
                <div class="health-callout">
                    Belum ada reservasi yang memenuhi syarat untuk dibuatkan tugas. Reservasi harus meminta layanan
                    antar-jemput; nilai biaya saja tidak membuat tugas. Form reservasi saat ini menyimpan permintaan
                    layanan sebagai tidak ada secara default.
                </div>
            ` : ''}
            ${result.drivers.length === 0 ? `
                <div class="health-callout">
                    Belum ada akun Driver valid. Tugas baru tidak dapat dibuat atau ditugaskan.
                </div>
            ` : ''}

            <div class="toolbar-card">
                <div class="toolbar-filters">
                    <label for="pickup-search" class="form-label" style="margin: 0;">Cari tugas</label>
                    <input id="pickup-search" class="form-control" type="search"
                        placeholder="ID, kucing, pemilik, Driver, atau status"
                        value="${Utils.escapeHtml(this.searchQuery)}">
                </div>
                <div class="text-muted" style="font-size: 0.85rem;">
                    Menampilkan <strong>${pickups.length}</strong> dari ${result.pickups.length} tugas
                </div>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Tugas</th>
                                <th>Kucing & Pemilik</th>
                                <th>Jenis Layanan</th>
                                <th>Alamat</th>
                                <th>Waktu Terjadwal</th>
                                <th>Driver</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pickups.map(pickup => `
                                <tr>
                                    <td>
                                        <strong>${Utils.escapeHtml(pickup.id || '-')}</strong><br>
                                        <small class="text-muted">${Utils.escapeHtml(pickup.reservationId || '-')}</small>
                                    </td>
                                    <td>
                                        <strong>🐱 ${Utils.escapeHtml(pickup.catName || '-')}</strong><br>
                                        <small class="text-muted">${Utils.escapeHtml(pickup.ownerName || '-')}</small>
                                    </td>
                                    <td>${Utils.escapeHtml(pickup.type || '-')}</td>
                                    <td>${Utils.escapeHtml(pickup.address || '-')}</td>
                                    <td>${Utils.escapeHtml(pickup.scheduledTime || '-')}</td>
                                    <td>${Utils.escapeHtml(pickup.driverName || 'Belum ditugaskan')}</td>
                                    <td><span class="badge ${pickup.status === 'Selesai' ? 'badge-success' : 'badge-warning'}">
                                        ${Utils.escapeHtml(pickup.status || 'Status tidak diketahui')}
                                    </span></td>
                                    <td>
                                        ${pickup.status === 'Terjadwal' && result.drivers.length ? `
                                            <button type="button" class="btn btn-outline btn-sm btn-edit-pickup"
                                                data-id="${Utils.escapeHtml(pickup.id || '')}">Atur Jadwal</button>
                                        ` : '<span class="text-muted">-</span>'}
                                    </td>
                                </tr>
                            `).join('') || `
                                <tr><td colspan="8" class="text-center text-muted p-4">Belum ada tugas antar-jemput.</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="pickup-modal-container"></div>
        `;
        this.bindEvents(containerElement, result);
    },

    bindEvents(containerElement, data) {
        const searchInput = containerElement.querySelector('#pickup-search');
        searchInput.addEventListener('input', () => {
            this.searchQuery = searchInput.value;
            const selectionStart = searchInput.selectionStart;
            this.render(containerElement, this.currentUser);
            const nextInput = containerElement.querySelector('#pickup-search');
            nextInput.focus();
            nextInput.setSelectionRange(selectionStart, selectionStart);
        });

        const addButton = containerElement.querySelector('#btn-add-pickup');
        if (addButton) addButton.addEventListener('click', () => this.openForm(data));
        containerElement.querySelectorAll('.btn-edit-pickup').forEach(button => {
            button.addEventListener('click', () => {
                const pickup = data.pickups.find(item => item.id === button.dataset.id);
                if (pickup) this.openForm(data, pickup);
            });
        });
    },

    openForm(data, pickup = null) {
        const user = AuthService.getCurrentUser();
        if (!user || !['owner', 'staff_ops'].includes(user.role) ||
            !this.currentUser || user.id !== this.currentUser.id) {
            Utils.showToast('Anda tidak memiliki izin mengelola tugas antar-jemput.', 'error');
            return;
        }
        const modal = document.getElementById('pickup-modal-container');
        if (!modal) return;

        const choices = pickup
            ? []
            : this.reservationChoices || [];
        const initialScheduledTime = pickup
            ? String(pickup.scheduledTime || '').replace(/ WIB$/, '').replace(' ', 'T')
            : '';
        modal.innerHTML = `
            <div class="modal-backdrop" id="pickup-form-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">${pickup ? 'Atur Tugas Antar-Jemput' : 'Buat Tugas Antar-Jemput'}</h3>
                        <button type="button" class="modal-close-btn" id="pickup-modal-close">&times;</button>
                    </div>
                    <form id="pickup-form">
                        <div class="modal-body">
                            ${pickup ? `
                                <div class="health-callout">
                                    ${Utils.escapeHtml(pickup.reservationId)} — ${Utils.escapeHtml(pickup.type)}.
                                    Reservasi dan jenis tugas tidak dapat diubah.
                                </div>
                            ` : `
                                <div class="form-group">
                                    <label class="form-label" for="pickup-reservation">Reservasi & jenis layanan <span class="required">*</span></label>
                                    <select id="pickup-reservation" class="form-control" required>
                                        <option value="">Pilih reservasi</option>
                                        ${choices.map((choice, index) => `
                                            <option value="${index}">
                                                ${Utils.escapeHtml(choice.reservation.id)} — ${Utils.escapeHtml(choice.reservation.catName)}
                                                — ${Utils.escapeHtml(choice.type)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            `}
                            <div class="form-group">
                                <label class="form-label" for="pickup-driver">Driver <span class="required">*</span></label>
                                <select id="pickup-driver" class="form-control" required>
                                    <option value="">Pilih Driver</option>
                                    ${data.drivers.map(driver => `
                                        <option value="${Utils.escapeHtml(driver.id)}"
                                            ${pickup && pickup.driverId === driver.id ? 'selected' : ''}>
                                            ${Utils.escapeHtml(driver.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="pickup-address">Alamat layanan <span class="required">*</span></label>
                                <input id="pickup-address" class="form-control" type="text" maxlength="500"
                                    value="${Utils.escapeHtml(pickup ? pickup.address || '' : '')}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="pickup-scheduled-time">Waktu terjadwal <span class="required">*</span></label>
                                <input id="pickup-scheduled-time" class="form-control" type="datetime-local"
                                    value="${Utils.escapeHtml(initialScheduledTime)}" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" id="pickup-modal-cancel">Batal</button>
                            <button type="submit" class="btn btn-primary" ${data.drivers.length ? '' : 'disabled'}>
                                ${pickup ? 'Simpan Perubahan' : 'Buat Tugas'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const close = () => { modal.innerHTML = ''; };
        modal.querySelector('#pickup-modal-close').addEventListener('click', close);
        modal.querySelector('#pickup-modal-cancel').addEventListener('click', close);
        if (!pickup) {
            const reservationSelect = modal.querySelector('#pickup-reservation');
            reservationSelect.addEventListener('change', () => {
                const optionIndex = Number.parseInt(reservationSelect.value, 10);
                const choice = Number.isInteger(optionIndex) ? choices[optionIndex] : null;
                if (choice) modal.querySelector('#pickup-address').value = choice.reservation.pickupAddress || '';
            });
        }
        modal.querySelector('#pickup-form').addEventListener('submit', event => {
            event.preventDefault();
            const scheduledTime = modal.querySelector('#pickup-scheduled-time').value;
            const assignment = {
                driverId: modal.querySelector('#pickup-driver').value,
                address: modal.querySelector('#pickup-address').value,
                scheduledTime
            };
            let result;
            try {
                result = pickup
                    ? StorageService.updatePickupAssignment(pickup.id, assignment)
                    : (() => {
                        const optionIndex = Number.parseInt(
                            modal.querySelector('#pickup-reservation').value,
                            10
                        );
                        const choice = Number.isInteger(optionIndex) ? choices[optionIndex] : null;
                        return choice
                            ? StorageService.createPickup({
                                reservationId: choice.reservation.id,
                                type: choice.type,
                                ...assignment
                            })
                            : { success: false, message: 'Pilih reservasi yang valid.' };
                    })();
            } catch (error) {
                if (!error || error.name !== 'StoredDataReadError') {
                    Utils.showToast('Tugas gagal disimpan karena data tidak dapat diproses.', 'error');
                }
                return;
            }
            if (!result.success) {
                Utils.showToast(result.message, 'error');
                return;
            }
            Utils.showToast(
                pickup ? 'Penugasan antar-jemput berhasil diperbarui.' : 'Tugas antar-jemput berhasil dibuat.',
                'success'
            );
            close();
            this.render(document.getElementById('main-content-container'), AuthService.getCurrentUser());
        });
    }
};
