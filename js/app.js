/**
 * OMI - OemahPus Monitoring and Information
 * File: js/app.js
 * Deskripsi: Pengendali utama alur aplikasi (Autentikasi, Navigasi Dinamis, dan State App)
 */

document.addEventListener('DOMContentLoaded', async () => {
    await App.init();
});

const App = {
    currentUser: null,

    /**
     * Inisialisasi awal aplikasi
     */
    async init() {
        if (!StorageService.isReady()) {
            Utils.showToast(
                StorageService.getInitializationError() || 'Data OMI belum siap. Muat ulang aplikasi untuk mencoba kembali.',
                'error'
            );
            return;
        }

        // Pulihkan sesi dari token tersimpan (jika ada) sebelum menampilkan UI
        await AuthService.restoreSession();

        // Selaraskan mirror data dari server untuk pengguna yang sudah masuk
        if (AuthService.isLoggedIn()) {
            await StorageService.loadFromServer();
        }

        // Periksa status login dan atur tampilan awal
        this.checkAuthState();

        // Daftarkan event listener untuk form login & registrasi
        this.bindAuthEvents();
    },

    /**
     * Cek status login dan alihkan tampilan (Auth View vs Main App View)
     */
    checkAuthState() {
        const user = AuthService.getCurrentUser();
        this.currentUser = user;

        const authContainer = document.getElementById('auth-container');
        const appWrapper = document.getElementById('app-wrapper');

        if (!user) {
            // Belum login: Tampilkan form login, sembunyikan aplikasi
            authContainer.style.display = 'flex';
            appWrapper.style.display = 'none';
            document.getElementById('sidebar-menu-list').innerHTML = '';
            document.getElementById('main-content-container').innerHTML = '';
            if (typeof CatsModule !== 'undefined') {
                CatsModule.currentUser = null;
                CatsModule.searchQuery = '';
                CatsModule.filterBreed = '';
                CatsModule.filterGender = '';
            }
            if (typeof BoardingModule !== 'undefined') {
                BoardingModule.currentUser = null;
            }
            this.switchAuthTab('login');
        } else {
            // Sudah login: Sembunyikan form login, tampilkan dashboard
            authContainer.style.display = 'none';
            appWrapper.style.display = 'flex';

            // Perbarui identitas di header
            this.updateHeaderProfile(user);

            // Bangun menu navigasi sidebar sesuai peran (Role-Based Menu)
            this.buildSidebarNav(user.role);

            // Render Dashboard sesuai peran
            this.navigateTo('dashboard');
        }
    },

    /**
     * Update profil pengguna di Topbar
     */
    updateHeaderProfile(user) {
        const userNameEl = document.getElementById('topbar-user-name');
        const userRoleEl = document.getElementById('topbar-user-role');
        const userAvatarEl = document.getElementById('topbar-user-avatar');

        if (userNameEl) userNameEl.textContent = user.name;
        if (userRoleEl) {
            userRoleEl.textContent = AuthService.getRoleLabel(user.role);
            userRoleEl.className = `user-role-badge badge-${this.getRoleBadgeClass(user.role)}`;
        }
        if (userAvatarEl) {
            // Ambil inisial nama
            const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            userAvatarEl.textContent = initials || '🐱';
        }
    },

    /**
     * Helper kelas badge untuk role
     */
    getRoleBadgeClass(role) {
        switch (role) {
            case 'owner': return 'warning';
            case 'staff_ops': return 'primary';
            case 'staff_driver': return 'purple';
            case 'customer': return 'success';
            default: return 'light';
        }
    },

    /**
     * Membangun menu navigasi sidebar sesuai peran (Role-Based Access Control)
     */
    buildSidebarNav(role) {
        const navContainer = document.getElementById('sidebar-menu-list');
        if (!navContainer) return;
        const activeUser = AuthService.getCurrentUser();
        if (!activeUser || activeUser.role !== role) {
            navContainer.innerHTML = '';
            return;
        }

        let menuItems = [];

        if (role === 'owner') {
            menuItems = [
                { id: 'dashboard', label: 'Dashboard Utama', icon: '📊', active: true },
                { id: 'cats', label: 'Data Kucing & Pemilik', icon: '🐱' },
                { id: 'reservations', label: 'Manajemen Reservasi', icon: '📅' },
                { id: 'boarding', label: 'Monitoring Penitipan', icon: '🏨' },
                { id: 'reports', label: 'Laporan Harian', icon: '📝' },
                { id: 'pickup', label: 'Layanan Antar-Jemput', icon: '🚗' },
                { id: 'payments', label: 'Laporan & Pembayaran', icon: '💰' }
            ];
        } else if (role === 'staff_ops') {
            menuItems = [
                { id: 'dashboard', label: 'Dashboard Operasional', icon: '📋', active: true },
                { id: 'cats', label: 'Data Kucing & Cek Awal', icon: '🩺' },
                { id: 'reservations', label: 'Daftar Reservasi', icon: '📅' },
                { id: 'boarding', label: 'Check-In & Check-Out', icon: '🏨' },
                { id: 'reports', label: 'Input Daily Report', icon: '📝' },
                { id: 'pickup', label: 'Pengelolaan Antar-Jemput', icon: '🚗' },
                { id: 'payments', label: 'Tagihan & Pembayaran', icon: '💰' }
            ];
        } else if (role === 'staff_driver') {
            menuItems = [
                { id: 'dashboard', label: 'Dashboard Driver', icon: '🚗', active: true },
                { id: 'pickup', label: 'Jadwal Antar-Jemput', icon: '📍' },
                { id: 'history', label: 'Riwayat Tugas', icon: '📜' }
            ];
        } else if (role === 'customer') {
            menuItems = [
                { id: 'dashboard', label: 'Ruang Kucing Saya', icon: '🐾', active: true },
                { id: 'my-cats', label: 'Profil Kucing Saya', icon: '🐱' },
                { id: 'new-reservation', label: 'Reservasi Penitipan', icon: '➕' },
                { id: 'my-boarding', label: 'Penitipan Saya', icon: '🏨' },
                { id: 'my-reports', label: 'Laporan Harian Kucing', icon: '📜' },
                { id: 'my-billing', label: 'Status Pembayaran', icon: '💳' }
            ];
        }

        navContainer.innerHTML = `
            <div class="nav-section-title">Menu Navigasi</div>
            ${menuItems.map(item => `
                <a class="nav-link ${item.active ? 'active' : ''}" data-nav="${item.id}">
                    <span class="nav-icon">${item.icon}</span>
                    <span class="nav-label">${item.label}</span>
                </a>
            `).join('')}
        `;

        // Event listener klik menu
        navContainer.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetNav = link.getAttribute('data-nav');
                if (this.navigateTo(targetNav)) {
                    navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    },

    getAllowedModules(role) {
        const permissions = {
            owner: ['dashboard', 'cats', 'reservations', 'boarding', 'reports', 'pickup', 'payments'],
            staff_ops: ['dashboard', 'cats', 'reservations', 'boarding', 'reports', 'pickup', 'payments'],
            staff_driver: ['dashboard', 'pickup', 'history'],
            customer: ['dashboard', 'my-cats', 'new-reservation', 'my-boarding', 'my-reports', 'my-billing']
        };
        return permissions[role] || [];
    },

    /**
     * Navigasi antar modul
     */
    navigateTo(moduleId) {
        const contentContainer = document.getElementById('main-content-container');
        if (!contentContainer) return false;
        const activeUser = AuthService.getCurrentUser();
        if (!activeUser) {
            this.currentUser = null;
            this.checkAuthState();
            return false;
        }
        this.currentUser = activeUser;
        if (!this.getAllowedModules(activeUser.role).includes(moduleId)) {
            Utils.showToast('Anda tidak memiliki izin untuk membuka modul tersebut.', 'error');
            DashboardModule.render(contentContainer, activeUser);
            document.querySelectorAll('#sidebar-menu-list .nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('data-nav') === 'dashboard');
            });
            return false;
        }

        if (moduleId === 'dashboard') {
            DashboardModule.render(contentContainer, this.currentUser);
        } else if (moduleId === 'cats' || moduleId === 'my-cats') {
            CatsModule.render(contentContainer, this.currentUser);
        } else if (moduleId === 'reservations' || moduleId === 'new-reservation') {
            ReservationsModule.render(contentContainer, this.currentUser);
        } else if (moduleId === 'boarding' || moduleId === 'my-boarding') {
            BoardingModule.render(contentContainer, this.currentUser, 'stays');
        } else if (moduleId === 'reports' || moduleId === 'my-reports') {
            BoardingModule.render(contentContainer, this.currentUser, 'reports');
        } else if (moduleId === 'payments' || moduleId === 'my-billing') {
            BillingModule.render(contentContainer, this.currentUser);
        } else if (moduleId === 'pickup' && this.currentUser.role === 'staff_driver') {
            DashboardModule.renderDriverSchedule(this.currentUser);
        } else if (moduleId === 'pickup' && ['owner', 'staff_ops'].includes(this.currentUser.role)) {
            PickupModule.render(contentContainer, this.currentUser);
        } else {
            // Tampilan placeholder informatif untuk modul tahap selanjutnya
            contentContainer.innerHTML = `
                <div class="card p-4 text-center">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                    <h3 class="title-lg mb-2">Modul Sedang Disiapkan</h3>
                    <p class="subtitle mb-3">Modul <strong>"${moduleId.toUpperCase()}"</strong> dijadwalkan pada implementasi tahap berikutnya sesuai roadmap proyek.</p>
                    <div>
                        <button class="btn btn-primary" onclick="App.navigateTo('dashboard')">
                            Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
        document.querySelectorAll('#sidebar-menu-list .nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-nav') === moduleId);
        });
        return true;
    },

    /**
     * Event listener untuk formulir login, registrasi, demo login, dan logout
     */
    bindAuthEvents() {
        // 1. Tab Switch (Login <-> Register)
        const tabLoginBtn = document.getElementById('tab-btn-login');
        const tabRegisterBtn = document.getElementById('tab-btn-register');

        if (tabLoginBtn) {
            tabLoginBtn.addEventListener('click', () => this.switchAuthTab('login'));
        }
        if (tabRegisterBtn) {
            tabRegisterBtn.addEventListener('click', () => this.switchAuthTab('register'));
        }

        // 2. Form Login Submit
        const loginForm = document.getElementById('form-login');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const identifierInput = document.getElementById('login-email');
                const passInput = document.getElementById('login-password');
                const submitBtn = loginForm.querySelector('[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;

                const result = await AuthService.login(
                    identifierInput ? identifierInput.value : '',
                    passInput ? passInput.value : ''
                );
                if (submitBtn) submitBtn.disabled = false;

                if (result.success) {
                    Utils.showToast(result.message, 'success');
                    if (passInput) passInput.value = '';
                    await StorageService.loadFromServer();
                    this.checkAuthState();
                } else {
                    Utils.showToast(result.message, 'error');
                }
            });
        }

        // 3. Form Registrasi Customer Submit (Ketat: hanya Customer)
        const registerForm = document.getElementById('form-register');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('reg-name');
                const emailInput = document.getElementById('reg-email');
                const phoneInput = document.getElementById('reg-phone');
                const addressInput = document.getElementById('reg-address');
                const passwordInput = document.getElementById('reg-password');
                const submitBtn = registerForm.querySelector('[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;

                const result = await AuthService.registerCustomer({
                    name: nameInput ? nameInput.value : '',
                    email: emailInput ? emailInput.value : '',
                    phone: phoneInput ? phoneInput.value : '',
                    address: addressInput ? addressInput.value : '',
                    password: passwordInput ? passwordInput.value : ''
                });
                if (submitBtn) submitBtn.disabled = false;

                if (result.success) {
                    Utils.showToast(result.message, 'success');
                    registerForm.reset();
                    await StorageService.loadFromServer();
                    this.checkAuthState();
                } else {
                    Utils.showToast(result.message, 'error');
                }
            });
        }

        // 4. Logout Button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await AuthService.logout();
                this.currentUser = null;
                Utils.showToast('Anda telah keluar dari aplikasi.', 'info');
                this.checkAuthState();
            });
        }

        // 5. Tampilkan / sembunyikan kata sandi (login & registrasi)
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.getAttribute('data-target'));
                if (!input) return;
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.textContent = show ? '🙈' : '👁';
                btn.setAttribute('aria-pressed', String(show));
                btn.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
            });
        });
    },

    /**
     * Beralih antara tab Login dan Registrasi
     */
    switchAuthTab(tab) {
        const tabLoginBtn = document.getElementById('tab-btn-login');
        const tabRegisterBtn = document.getElementById('tab-btn-register');
        const loginView = document.getElementById('auth-login-view');
        const registerView = document.getElementById('auth-register-view');

        if (tab === 'login') {
            if (tabLoginBtn) tabLoginBtn.classList.add('active');
            if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
            if (loginView) loginView.style.display = 'block';
            if (registerView) registerView.style.display = 'none';
        } else {
            if (tabLoginBtn) tabLoginBtn.classList.remove('active');
            if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
            if (loginView) loginView.style.display = 'none';
            if (registerView) registerView.style.display = 'block';
        }
    }
};
