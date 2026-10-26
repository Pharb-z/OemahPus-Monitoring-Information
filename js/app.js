/**
 * OMI - OemahPus Monitoring and Information
 * File: js/app.js
 * Deskripsi: Pengendali utama alur aplikasi (Autentikasi, Navigasi Dinamis, dan State App)
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentUser: null,

    /**
     * Inisialisasi awal aplikasi
     */
    init() {
        if (!StorageService.isReady()) {
            Utils.showToast(
                StorageService.getInitializationError() || 'Data OMI belum siap. Muat ulang aplikasi untuk mencoba kembali.',
                'error'
            );
            return;
        }

        // Periksa apakah sudah ada sesi aktif di sessionStorage
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
                { id: 'reports', label: 'Input Daily Report', icon: '📝' }
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
            staff_ops: ['dashboard', 'cats', 'reservations', 'boarding', 'reports'],
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

        // 2. Quick Demo Login Buttons
        const demoButtons = document.querySelectorAll('.btn-demo');
        demoButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.getAttribute('data-role');
                const result = AuthService.loginAsDemo(role);
                if (result.success) {
                    Utils.showToast(result.message, 'success');
                    this.checkAuthState();
                } else {
                    Utils.showToast(result.message, 'error');
                }
            });
        });

        // 3. Form Login Submit
        const loginForm = document.getElementById('form-login');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('login-email');
                const passInput = document.getElementById('login-password');

                const result = AuthService.loginWithEmail(emailInput.value, passInput ? passInput.value : '');
                if (result.success) {
                    Utils.showToast(result.message, 'success');
                    this.checkAuthState();
                } else {
                    Utils.showToast(result.message, 'error');
                }
            });
        }

        // 4. Form Registrasi Customer Submit (Ketat: hanya Customer)
        const registerForm = document.getElementById('form-register');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('reg-name');
                const emailInput = document.getElementById('reg-email');
                const phoneInput = document.getElementById('reg-phone');
                const addressInput = document.getElementById('reg-address');

                const result = AuthService.registerCustomer({
                    name: nameInput ? nameInput.value : '',
                    email: emailInput ? emailInput.value : '',
                    phone: phoneInput ? phoneInput.value : '',
                    address: addressInput ? addressInput.value : ''
                });

                if (result.success) {
                    Utils.showToast(result.message, 'success');
                    registerForm.reset();
                    this.checkAuthState();
                } else {
                    Utils.showToast(result.message, 'error');
                }
            });
        }

        // 5. Logout Button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                AuthService.logout();
                this.currentUser = null;
                Utils.showToast('Anda telah keluar dari aplikasi.', 'info');
                this.checkAuthState();
            });
        }
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
