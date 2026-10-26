/**
 * OMI - OemahPus Monitoring and Information
 * File: js/modules/cats.js
 * Deskripsi: Modul B — Pengelolaan Data Kucing, Pelanggan, dan Pemeriksaan Kondisi Awal
 */

const CatsModule = {
    currentUser: null,
    searchQuery: '',
    filterBreed: '',
    filterGender: '',

    /**
     * Render halaman utama Data Kucing
     */
    render(containerElement, user) {
        if (!containerElement || !user) return;
        const activeUser = AuthService.getCurrentUser();
        if (!activeUser || activeUser.id !== user.id || !['owner', 'staff_ops', 'customer'].includes(activeUser.role)) {
            Utils.showToast('Anda tidak memiliki izin untuk membuka data kucing.', 'error');
            containerElement.innerHTML = '';
            return;
        }
        this.currentUser = activeUser;

        const isCustomer = activeUser.role === 'customer';
        const isDriver = activeUser.role === 'staff_driver';

        const cats = this.getFilteredCats();
        const allBreeds = [...new Set(StorageService.getCats().map(c => c.breed).filter(Boolean))];

        containerElement.innerHTML = `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">${isCustomer ? 'Profil Kucing Saya' : 'Data Kucing & Pemilik'}</h2>
                        <p class="subtitle">
                            ${isCustomer 
                                ? 'Kelola data profil kucing kesayangan Anda.' 
                                : 'Kelola data seluruh kucing terdaftar, identitas pemilik, dan catatan fisik intake.'}
                        </p>
                    </div>
                    ${!isDriver ? `
                        <div>
                            <button type="button" id="btn-add-cat" class="btn btn-primary">
                                <span>➕ Tambah Kucing Baru</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Toolbar Pencarian & Filter -->
            <div class="toolbar-card">
                <div class="toolbar-filters">
                    <div class="search-input-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="cat-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Cari nama kucing, ras, atau pemilik...">
                    </div>

                    <select id="cat-filter-breed" class="filter-select">
                        <option value="">Semua Ras</option>
                        ${allBreeds.map(b => `
                            <option value="${Utils.escapeHtml(b)}" ${this.filterBreed === b ? 'selected' : ''}>
                                ${Utils.escapeHtml(b)}
                            </option>
                        `).join('')}
                    </select>

                    <select id="cat-filter-gender" class="filter-select">
                        <option value="">Semua Jenis Kelamin</option>
                        <option value="Jantan" ${this.filterGender === 'Jantan' ? 'selected' : ''}>Jantan</option>
                        <option value="Betina" ${this.filterGender === 'Betina' ? 'selected' : ''}>Betina</option>
                    </select>

                    ${(this.searchQuery || this.filterBreed || this.filterGender) ? `
                        <button type="button" id="btn-reset-filter" class="btn btn-outline btn-sm">
                            Reset Filter
                        </button>
                    ` : ''}
                </div>
                <div class="text-muted" style="font-size: 0.85rem;">
                    Menampilkan <strong>${cats.length}</strong> kucing
                </div>
            </div>

            <!-- Grid Kartu Kucing -->
            ${cats.length > 0 ? `
                <div class="cat-card-grid">
                    ${cats.map(cat => this.renderCatCard(cat)).join('')}
                </div>
            ` : `
                <div class="card p-4 text-center">
                    <div style="font-size: 3rem; margin-bottom: 0.75rem;">🐱</div>
                    <h3 class="title-lg mb-2">Tidak Ada Data Kucing Ditemukan</h3>
                    <p class="subtitle mb-3">
                        ${isCustomer 
                            ? 'Anda belum mendaftarkan profil kucing atau hasil pencarian tidak sesuai.' 
                            : 'Belum ada data kucing yang terdaftar atau filter pencarian tidak menghasilkan data.'}
                    </p>
                    ${!isDriver ? `
                        <div>
                            <button type="button" class="btn btn-primary" onclick="CatsModule.openCatFormModal()">
                                ➕ Daftarkan Kucing Pertama
                            </button>
                        </div>
                    ` : ''}
                </div>
            `}

            <!-- Wadah Modal Dialog (Inject dinamis) -->
            <div id="cat-modal-container"></div>
        `;

        this.bindEvents(containerElement);
    },

    /**
     * Mengambil daftar kucing yang sudah difilter sesuai peran dan kata kunci
     */
    getFilteredCats() {
        let cats = StorageService.getCats();

        // 1. FILTER PERAN KETAT:
        // Customer hanya boleh melihat kucing miliknya sendiri!
        if (this.currentUser.role === 'customer') {
            cats = cats.filter(c => c.ownerId === this.currentUser.id);
        }

        // 2. Filter Pencarian Teks
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            cats = cats.filter(c => 
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.breed && c.breed.toLowerCase().includes(query)) ||
                (c.ownerName && c.ownerName.toLowerCase().includes(query)) ||
                (c.color && c.color.toLowerCase().includes(query))
            );
        }

        // 3. Filter Ras
        if (this.filterBreed) {
            cats = cats.filter(c => c.breed === this.filterBreed);
        }

        // 4. Filter Jenis Kelamin
        if (this.filterGender) {
            cats = cats.filter(c => c.gender === this.filterGender);
        }

        return cats;
    },

    /**
     * Render satu kartu profil kucing
     */
    renderCatCard(cat) {
        const initCheck = cat.initialCheck || {};
        const isDriver = this.currentUser.role === 'staff_driver';

        return `
            <div class="cat-profile-card">
                <div class="cat-card-header">
                    <div class="cat-avatar-large">🐱</div>
                    <div class="cat-info-title" style="flex: 1;">
                        <h3>${Utils.escapeHtml(cat.name)}</h3>
                        <p class="text-muted" style="font-size: 0.85rem;">
                            ${Utils.escapeHtml(cat.breed)} • <span class="badge ${cat.gender === 'Jantan' ? 'badge-primary' : 'badge-purple'}">${Utils.escapeHtml(cat.gender)}</span>
                        </p>
                    </div>
                </div>

                <div class="cat-card-body">
                    <div class="cat-meta-list">
                        <p><strong>Umur / Warna:</strong> ${Utils.escapeHtml(cat.age)} • ${Utils.escapeHtml(cat.color)}</p>
                        <p><strong>Pemilik:</strong> ${Utils.escapeHtml(cat.ownerName)}</p>
                    </div>

                    <!-- Kotak Pemeriksaan Kondisi Fisik Awal -->
                    <div class="cat-intake-badge-box">
                        <div class="intake-header">
                            <span>🩺 Catatan Kondisi Fisik Intake</span>
                        </div>
                        <div class="intake-metrics">
                            <span class="badge badge-light">Berat: <strong>${initCheck.weight ? initCheck.weight + ' kg' : '-'}</strong></span>
                            <span class="badge badge-light">Suhu: <strong>${initCheck.temperature ? initCheck.temperature + ' °C' : '-'}</strong></span>
                            <span class="badge badge-light">${Utils.escapeHtml(initCheck.parasites || 'Bebas Kutu/Jamur')}</span>
                        </div>
                        <div class="mt-1 text-muted" style="font-size: 0.78rem;">
                            <em>"${Utils.escapeHtml(initCheck.notes || 'Normal.')}"</em>
                        </div>
                    </div>
                </div>

                <div class="cat-card-footer">
                    <button type="button" class="btn btn-outline btn-sm btn-detail-cat" data-id="${cat.id}">
                        👁️ Rincian Lengkap
                    </button>
                    ${!isDriver ? `
                        <button type="button" class="btn btn-outline btn-sm btn-edit-cat" data-id="${cat.id}">
                            ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-danger-outline btn-sm btn-delete-cat" data-id="${cat.id}">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Memasang event listener untuk pencarian, filter, modal, dll.
     */
    bindEvents(containerElement) {
        // 1. Search Input
        const searchInput = containerElement.querySelector('#cat-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.render(containerElement, this.currentUser);
            });
        }

        // 2. Filter Breed
        const breedSelect = containerElement.querySelector('#cat-filter-breed');
        if (breedSelect) {
            breedSelect.addEventListener('change', (e) => {
                this.filterBreed = e.target.value;
                this.render(containerElement, this.currentUser);
            });
        }

        // 3. Filter Gender
        const genderSelect = containerElement.querySelector('#cat-filter-gender');
        if (genderSelect) {
            genderSelect.addEventListener('change', (e) => {
                this.filterGender = e.target.value;
                this.render(containerElement, this.currentUser);
            });
        }

        // 4. Reset Filter
        const resetBtn = containerElement.querySelector('#btn-reset-filter');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.searchQuery = '';
                this.filterBreed = '';
                this.filterGender = '';
                this.render(containerElement, this.currentUser);
            });
        }

        // 5. Tambah Kucing Baru
        const addBtn = containerElement.querySelector('#btn-add-cat');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openCatFormModal());
        }

        // 6. Rincian Kucing
        containerElement.querySelectorAll('.btn-detail-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.getAttribute('data-id');
                this.openCatDetailModal(catId);
            });
        });

        // 7. Edit Kucing
        containerElement.querySelectorAll('.btn-edit-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.getAttribute('data-id');
                const cat = StorageService.getCatById(catId);
                if (cat) this.openCatFormModal(cat);
            });
        });

        // 8. Hapus Kucing
        containerElement.querySelectorAll('.btn-delete-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.getAttribute('data-id');
                const cat = StorageService.getCatById(catId);
                if (cat && confirm(`Apakah Anda yakin ingin menghapus data kucing "${cat.name}"?`)) {
                    const result = StorageService.deleteCat(catId);
                    if (!result.success) {
                        Utils.showToast(result.message, 'error');
                        return;
                    }
                    Utils.showToast(`Kucing ${cat.name} berhasil dihapus.`, 'info');
                    this.render(containerElement, this.currentUser);
                }
            });
        });
    },

    /**
     * Modal Form Tambah / Edit Kucing
     */
    openCatFormModal(catToEdit = null) {
        const modalContainer = document.getElementById('cat-modal-container');
        if (!modalContainer || !this.currentUser ||
            !['owner', 'staff_ops', 'customer'].includes(this.currentUser.role) ||
            !AuthService.hasRole(this.currentUser.role) ||
            AuthService.getCurrentUser().id !== this.currentUser.id) {
            Utils.showToast('Anda tidak memiliki izin mengelola data kucing.', 'error');
            return;
        }

        const isEdit = catToEdit !== null;
        const isCustomer = this.currentUser.role === 'customer';
        if (isEdit && (!catToEdit.id || StorageService.getCatById(catToEdit.id) === null)) {
            Utils.showToast('Data kucing tidak ditemukan atau bukan milik Anda.', 'error');
            return;
        }
        const customers = StorageService.getCustomers();
        const initCheck = isEdit && catToEdit.initialCheck ? catToEdit.initialCheck : {};
        const parasiteStatuses = ['Bebas Kutu & Jamur', 'Ada Kutu Ringan', 'Ada Jamur Ringan', 'Lainnya'];
        const hasCustomParasiteStatus = initCheck.parasites && !parasiteStatuses.includes(initCheck.parasites);

        modalContainer.innerHTML = `
            <div class="modal-backdrop" id="cat-modal-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">${isEdit ? '✏️ Edit Data Kucing' : '➕ Daftarkan Kucing Baru'}</h3>
                        <button type="button" class="modal-close-btn" id="modal-close-btn">&times;</button>
                    </div>

                    <form id="cat-form">
                        <div class="modal-body">
                            <!-- Callout Non-Medis -->
                            <div class="health-callout">
                                ℹ️ <strong>Catatan Intake Fisik Awal:</strong> Pencatatan kondisi awal (berat badan, suhu, dan parasit) dilakukan saat penerimaan kucing untuk baseline perawatan, <em>bukan merupakan diagnosis medis hewan</em>.
                            </div>

                            <!-- Identitas Kucing -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-name">Nama Kucing <span class="required">*</span></label>
                                    <input type="text" id="form-cat-name" class="form-control" value="${isEdit ? Utils.escapeHtml(catToEdit.name) : ''}" placeholder="Contoh: Milo" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-breed">Ras Kucing <span class="required">*</span></label>
                                    <input type="text" id="form-cat-breed" class="form-control" value="${isEdit ? Utils.escapeHtml(catToEdit.breed) : ''}" placeholder="Contoh: Persia, Shorthair, Domestik" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-gender">Jenis Kelamin <span class="required">*</span></label>
                                    <select id="form-cat-gender" class="form-control" required>
                                        <option value="Jantan" ${isEdit && catToEdit.gender === 'Jantan' ? 'selected' : ''}>Jantan</option>
                                        <option value="Betina" ${isEdit && catToEdit.gender === 'Betina' ? 'selected' : ''}>Betina</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-age">Usia Kucing <span class="required">*</span></label>
                                    <input type="text" id="form-cat-age" class="form-control" value="${isEdit ? Utils.escapeHtml(catToEdit.age) : ''}" placeholder="Contoh: 1.5 tahun, 8 bulan" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-color">Warna / Corak Bulu <span class="required">*</span></label>
                                    <input type="text" id="form-cat-color" class="form-control" value="${isEdit ? Utils.escapeHtml(catToEdit.color) : ''}" placeholder="Contoh: Oranye belang putih" required>
                                </div>

                                <!-- Kepemilikan -->
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-owner">Pemilik Kucing <span class="required">*</span></label>
                                    ${isCustomer ? `
                                        <input type="text" class="form-control" value="${Utils.escapeHtml(this.currentUser.name)} (Akun Anda)" disabled>
                                        <input type="hidden" id="form-cat-owner-id" value="${this.currentUser.id}">
                                        <input type="hidden" id="form-cat-owner-name" value="${Utils.escapeHtml(this.currentUser.name)}">
                                    ` : `
                                        <select id="form-cat-owner-select" class="form-control" required>
                                            ${customers.map(c => `
                                                <option value="${c.id}" ${isEdit && catToEdit.ownerId === c.id ? 'selected' : ''}>
                                                    ${Utils.escapeHtml(c.name)} (${Utils.escapeHtml(c.email)})
                                                </option>
                                            `).join('') || `<option value="${this.currentUser.id}">Dr. Hendra (Owner)</option>`}
                                        </select>
                                    `}
                                </div>
                            </div>

                            ${!isCustomer ? `
                            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1.25rem 0;">
                            <h4 class="mb-3" style="font-size: 0.95rem; color: var(--primary-dark);">🩺 Pencatatan Kondisi Awal Intake</h4>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-weight">Berat Badan (kg) <span class="required">*</span></label>
                                    <input type="number" step="0.1" min="0.5" max="25" id="form-cat-weight" class="form-control" value="${initCheck.weight || ''}" placeholder="Contoh: 4.2" required>
                                    <small class="form-helper">Rentang pencatatan: 0.5–25 kg</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-temp">Suhu Tubuh (°C) <span class="required">*</span></label>
                                    <input type="number" step="0.1" min="35.0" max="42.5" id="form-cat-temp" class="form-control" value="${initCheck.temperature || ''}" placeholder="Contoh: 38.5" required>
                                    <small class="form-helper">Rentang pencatatan: 35–42.5 °C</small>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-parasites">Kondisi Kulit & Parasit <span class="required">*</span></label>
                                    <select id="form-cat-parasites" class="form-control" required>
                                        ${hasCustomParasiteStatus ? `<option value="${Utils.escapeHtml(initCheck.parasites)}" selected>${Utils.escapeHtml(initCheck.parasites)}</option>` : ''}
                                        <option value="Bebas Kutu & Jamur" ${initCheck.parasites === 'Bebas Kutu & Jamur' ? 'selected' : ''}>Bebas Kutu & Jamur (Bersih)</option>
                                        <option value="Ada Kutu Ringan" ${initCheck.parasites === 'Ada Kutu Ringan' ? 'selected' : ''}>Ada Kutu Ringan</option>
                                        <option value="Ada Jamur Ringan" ${initCheck.parasites === 'Ada Jamur Ringan' ? 'selected' : ''}>Ada Jamur Ringan</option>
                                        <option value="Lainnya" ${initCheck.parasites === 'Lainnya' ? 'selected' : ''}>Lainnya (Catat di Bawah)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="form-cat-vaccine">Riwayat Vaksinasi</label>
                                    <input type="text" id="form-cat-vaccine" class="form-control" value="${Utils.escapeHtml(initCheck.vaccinationStatus || 'Lengkap')}" placeholder="Contoh: Lengkap / Belum Vaksin">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="form-cat-notes">Catatan Karakter / Kebiasaan Khusus</label>
                                <textarea id="form-cat-notes" class="form-control" rows="2" placeholder="Contoh: Ramah, suka makanan basah Royal Canin, agak pemalu di hari pertama.">${Utils.escapeHtml(initCheck.notes || '')}</textarea>
                            </div>
                            ` : ''}
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" id="modal-cancel-btn">Batal</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Daftarkan Kucing'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Event listener penutup modal
        const closeModal = () => { modalContainer.innerHTML = ''; };
        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

        // Submit form dengan validasi numerik ketat
        document.getElementById('cat-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('form-cat-name').value.trim();
            const breed = document.getElementById('form-cat-breed').value.trim();
            const gender = document.getElementById('form-cat-gender').value;
            const age = document.getElementById('form-cat-age').value.trim();
            const color = document.getElementById('form-cat-color').value.trim();
            const weightInput = document.getElementById('form-cat-weight');
            const temperatureInput = document.getElementById('form-cat-temp');
            const weight = weightInput ? parseFloat(weightInput.value) : null;
            const temperature = temperatureInput ? parseFloat(temperatureInput.value) : null;
            const parasitesInput = document.getElementById('form-cat-parasites');
            const vaccineInput = document.getElementById('form-cat-vaccine');
            const notesInput = document.getElementById('form-cat-notes');
            const parasites = parasitesInput ? parasitesInput.value : '';
            const vaccinationStatus = vaccineInput ? vaccineInput.value.trim() : '';
            const notes = notesInput ? notesInput.value.trim() : '';

            // 1. Validasi Kolom Wajib
            if (!name || !breed || !age || !color) {
                Utils.showToast('Semua kolom identitas kucing wajib diisi.', 'error');
                return;
            }

            // 2. Validasi Numerik Masuk Akal
            if (!isCustomer) {
                if (!Number.isFinite(weight) || weight < 0.5 || weight > 25) {
                    Utils.showToast('Nilai berat badan harus berada pada rentang 0.5–25 kg.', 'error');
                    return;
                }

                if (!Number.isFinite(temperature) || temperature < 35 || temperature > 42.5) {
                    Utils.showToast('Nilai suhu harus berada pada rentang 35–42.5 °C.', 'error');
                    return;
                }
            }

            // Tentukan Pemilik
            let ownerId = '';
            let ownerName = '';

            if (isCustomer) {
                ownerId = this.currentUser.id;
                ownerName = this.currentUser.name;
            } else {
                const ownerSelect = document.getElementById('form-cat-owner-select');
                if (ownerSelect) {
                    ownerId = ownerSelect.value;
                    const selectedOpt = ownerSelect.options[ownerSelect.selectedIndex];
                    ownerName = selectedOpt ? selectedOpt.text.split(' (')[0] : 'Pemilik';
                } else {
                    ownerId = this.currentUser.id;
                    ownerName = this.currentUser.name;
                }
            }

            const catPayload = {
                id: isEdit ? catToEdit.id : undefined,
                name,
                breed,
                gender,
                age,
                color,
                ownerId,
                ownerName,
                initialCheck: isCustomer ? undefined : {
                    weight,
                    temperature,
                    parasites,
                    vaccinationStatus,
                    notes
                }
            };

            const result = StorageService.saveCat(catPayload);
            if (result.success) {
                Utils.showToast(`Data kucing "${name}" berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}!`, 'success');
                closeModal();
                this.render(document.getElementById('main-content-container'), this.currentUser);
            } else {
                Utils.showToast(result.message || 'Gagal menyimpan data kucing.', 'error');
            }
        });
    },

    /**
     * Modal Rincian Lengkap Profil Kucing
     */
    openCatDetailModal(catId) {
        const activeUser = AuthService.getCurrentUser();
        if (!this.currentUser || !activeUser || activeUser.id !== this.currentUser.id ||
            !AuthService.hasRole(['owner', 'staff_ops', 'customer'])) {
            Utils.showToast('Anda tidak memiliki izin melihat data kucing.', 'error');
            return;
        }
        const cat = StorageService.getCatById(catId);
        if (!cat) {
            Utils.showToast('Data kucing tidak ditemukan atau bukan milik Anda.', 'error');
            return;
        }

        const modalContainer = document.getElementById('cat-modal-container');
        if (!modalContainer) return;

        const initCheck = cat.initialCheck || {};

        modalContainer.innerHTML = `
            <div class="modal-backdrop" id="cat-detail-backdrop">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">🐱 Profil Lengkap: ${Utils.escapeHtml(cat.name)}</h3>
                        <button type="button" class="modal-close-btn" id="modal-detail-close">&times;</button>
                    </div>

                    <div class="modal-body">
                        <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem;">
                            <div class="cat-avatar-large" style="width: 72px; height: 72px; font-size: 2.5rem;">🐱</div>
                            <div>
                                <h2 style="font-size: 1.4rem;">${Utils.escapeHtml(cat.name)}</h2>
                                <p class="text-muted">${Utils.escapeHtml(cat.breed)} • <span class="badge ${cat.gender === 'Jantan' ? 'badge-primary' : 'badge-purple'}">${Utils.escapeHtml(cat.gender)}</span></p>
                                <p class="text-muted" style="font-size: 0.85rem;">Terdaftar sejak: ${Utils.formatDate(cat.createdAt)}</p>
                            </div>
                        </div>

                        <!-- Data Identitas -->
                        <div class="card mb-3 p-3">
                            <h4 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">DATA IDENTITAS</h4>
                            <div class="form-row" style="font-size: 0.88rem;">
                                <div><strong>ID Kucing:</strong> ${Utils.escapeHtml(cat.id)}</div>
                                <div><strong>Usia:</strong> ${Utils.escapeHtml(cat.age)}</div>
                                <div><strong>Warna Bulu:</strong> ${Utils.escapeHtml(cat.color)}</div>
                                <div><strong>Pemilik:</strong> ${Utils.escapeHtml(cat.ownerName)}</div>
                            </div>
                        </div>

                        <!-- Catatan Kondisi Fisik Awal Intake -->
                        <div class="card p-3" style="border-left: 4px solid var(--primary);">
                            <div class="flex-between mb-2">
                                <h4 style="font-size: 0.9rem; color: var(--primary-dark);">🩺 PEMERIKSAAN KONDISI FISIK AWAL</h4>
                                <span class="badge badge-light">Pencatatan Intake</span>
                            </div>
                            <div class="form-row mb-2" style="font-size: 0.88rem;">
                                <div><strong>Berat Badan:</strong> ${initCheck.weight ? initCheck.weight + ' kg' : '-'}</div>
                                <div><strong>Suhu Tubuh:</strong> ${initCheck.temperature ? initCheck.temperature + ' °C' : '-'}</div>
                                <div><strong>Kondisi Parasit:</strong> <span class="badge badge-light">${Utils.escapeHtml(initCheck.parasites || 'Bersih')}</span></div>
                                <div><strong>Vaksinasi:</strong> ${Utils.escapeHtml(initCheck.vaccinationStatus || '-')}</div>
                            </div>
                            <div style="font-size: 0.85rem; background: #f8fafc; padding: 0.65rem; border-radius: var(--radius-sm); margin-top: 0.5rem;">
                                <strong>Catatan Karakter / Kebiasaan:</strong><br>
                                <em>"${Utils.escapeHtml(initCheck.notes || 'Tidak ada catatan khusus.')}"</em>
                            </div>
                            <small class="text-muted mt-2" style="display: block; font-size: 0.75rem;">
                                * Data pemeriksaan awal dicatat staf saat kucing pertama kali diterima untuk memantau kenyamanan selama menginap, bukan merupakan diagnosis medis klinis.
                            </small>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="modal-detail-ok">Tutup</button>
                    </div>
                </div>
            </div>
        `;

        const closeModal = () => { modalContainer.innerHTML = ''; };
        document.getElementById('modal-detail-close').addEventListener('click', closeModal);
        document.getElementById('modal-detail-ok').addEventListener('click', closeModal);
    }
};
