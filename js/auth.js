/**
 * OMI - OemahPus Monitoring and Information
 * File: js/auth.js
 * Deskripsi: Layanan autentikasi mandiri (simulasi sesi, registrasi customer, quick demo login)
 * 
 * CATATAN KEAMANAN & AKADEMIK:
 * Modul ini merupakan simulasi autentikasi frontend untuk keperluan prototipe dan portofolio.
 * Pada implementasi produksi sesungguhnya, autentikasi harus divalidasi di sisi server (backend)
 * menggunakan mekanisme token aman (JWT) atau session cookie HTTP-Only, dengan kata sandi ter-hash (e.g. bcrypt).
 */

const SESSION_KEY = 'omi_active_session';
const VALID_ROLES = ['owner', 'staff_ops', 'staff_driver', 'customer'];

const AuthService = {
    /**
     * Mengambil data pengguna yang sedang aktif dari sessionStorage.
     * Menggunakan sessionStorage agar sesi demo otomatis berakhir saat tab/browser ditutup.
     */
    getCurrentUser() {
        try {
            const sessionData = sessionStorage.getItem(SESSION_KEY);
            if (!sessionData) return null;
            const session = JSON.parse(sessionData);
            const storedUser = session && StorageService.findUserById(session.id);
            if (!storedUser || !VALID_ROLES.includes(storedUser.role) || storedUser.role !== session.role) {
                sessionStorage.removeItem(SESSION_KEY);
                return null;
            }
            return {
                ...session,
                name: storedUser.name,
                email: storedUser.email,
                phone: storedUser.phone || '',
                address: storedUser.address || ''
            };
        } catch (e) {
            console.error('Error saat membaca session:', e);
            sessionStorage.removeItem(SESSION_KEY);
            return null;
        }
    },

    /**
     * Memeriksa apakah ada pengguna yang sedang login
     */
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    /**
     * Memeriksa apakah pengguna aktif memiliki peran yang diizinkan
     * @param {string|string[]} allowedRoles - Contoh: 'owner' atau ['owner', 'staff_ops']
     */
    hasRole(allowedRoles) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (Array.isArray(allowedRoles)) {
            return allowedRoles.includes(user.role);
        }
        return user.role === allowedRoles;
    },

    /**
     * Quick Demo Login: Masuk instan menggunakan akun demo berdasarkan role.
     * Sangat aman untuk demonstrasi lokal tanpa perlu mengetik/menyimpan kata sandi.
     * @param {'owner'|'staff_ops'|'staff_driver'|'customer'} role
     */
    loginAsDemo(role) {
        sessionStorage.removeItem(SESSION_KEY);
        if (!VALID_ROLES.includes(role)) {
            return { success: false, message: 'Peran akun demo tidak valid.' };
        }
        const demoUser = StorageService.findDemoUser(role);

        if (!demoUser) {
            return {
                success: false,
                message: `Akun demo untuk peran '${role}' tidak ditemukan.`
            };
        }

        // Simpan hanya data profil publik ke sessionStorage (TANPA kata sandi)
        const sessionPayload = {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            role: demoUser.role,
            phone: demoUser.phone || '',
            address: demoUser.address || '',
            loginAt: new Date().toISOString(),
            isDemo: true
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));

        return {
            success: true,
            user: sessionPayload,
            message: `Berhasil login sebagai ${demoUser.name} (${this.getRoleLabel(demoUser.role)})`
        };
    },

    /**
     * Login menggunakan email (Simulasi autentikasi kredensial)
     * Untuk prototipe portofolio, verifikasi mencocokkan email terdaftar.
     */
    loginWithEmail(email, password = '') {
        sessionStorage.removeItem(SESSION_KEY);
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
            return { success: false, message: 'Email tidak boleh kosong.' };
        }

        const matchedUser = StorageService.findUserByEmail(cleanEmail);

        if (!matchedUser) {
            return {
                success: false,
                message: 'Akun dengan email tersebut belum terdaftar. Silakan daftar terlebih dahulu atau gunakan Quick Demo Login.'
            };
        }

        // Catatan: Pada prototipe ini, validasi kata sandi tidak membandingkan plain text di LocalStorage.
        const sessionPayload = {
            id: matchedUser.id,
            name: matchedUser.name,
            email: matchedUser.email,
            role: matchedUser.role,
            phone: matchedUser.phone || '',
            address: matchedUser.address || '',
            loginAt: new Date().toISOString(),
            isDemo: false
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));

        return {
            success: true,
            user: sessionPayload,
            message: `Selamat datang kembali, ${matchedUser.name}!`
        };
    },

    /**
     * Registrasi Akun Baru - Khusus Role Customer (Pemilik Kucing)
     * Sesuai ketentuan: Tidak ada pilihan role lain pada pendaftaran publik.
     */
    registerCustomer({ name, email, phone, address }) {
        // 1. Validasi Kolom Wajib
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPhone = (phone || '').trim();
        const cleanAddress = (address || '').trim();

        if (!cleanName) {
            return { success: false, message: 'Nama lengkap wajib diisi.' };
        }
        if (!cleanEmail) {
            return { success: false, message: 'Alamat email wajib diisi.' };
        }
        // Validasi format email sederhana
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return { success: false, message: 'Format email tidak valid.' };
        }
        if (!cleanPhone) {
            return { success: false, message: 'Nomor telepon / WhatsApp wajib diisi.' };
        }

        // 2. Validasi Email Unik
        if (StorageService.emailExists(cleanEmail)) {
            return {
                success: false,
                message: 'Email sudah terdaftar. Silakan gunakan email lain atau login langsung.'
            };
        }

        // 3. Simpan Akun Baru (Ketat: Selalu bertindak sebagai role 'customer')
        const newCustomer = {
            id: Utils.generateId('USR-CUST'),
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            address: cleanAddress,
            role: 'customer', // Ditetapkan secara baku, tidak bisa diubah dari UI
            createdAt: new Date().toISOString().split('T')[0]
        };

        const saveResult = StorageService.createCustomer(newCustomer);
        if (!saveResult.success) {
            return saveResult;
        }

        // 4. Buat sesi aktif langsung untuk kenyamanan pengguna
        const sessionPayload = {
            id: newCustomer.id,
            name: newCustomer.name,
            email: newCustomer.email,
            role: newCustomer.role,
            phone: newCustomer.phone,
            address: newCustomer.address,
            loginAt: new Date().toISOString(),
            isDemo: false
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));

        return {
            success: true,
            user: sessionPayload,
            message: `Registrasi berhasil! Selamat datang di OemahPus, ${newCustomer.name}.`
        };
    },

    /**
     * Logout: Menghapus sesi dari sessionStorage
     */
    logout() {
        sessionStorage.removeItem(SESSION_KEY);
        return { success: true, message: 'Anda telah berhasil keluar.' };
    },

    /**
     * Label representasi peran untuk antarmuka
     */
    getRoleLabel(role) {
        const labels = {
            owner: 'Pemilik Pet Hotel',
            staff_ops: 'Staf Operasional',
            staff_driver: 'Staf Antar-Jemput',
            customer: 'Pemilik Kucing'
        };
        return labels[role] || 'Pengguna';
    }
};
