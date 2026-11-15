/**
 * OMI - OemahPus Monitoring and Information
 * File: js/auth.js
 * Deskripsi: Layanan autentikasi berbasis API server (JWT + bcrypt).
 *
 * Perubahan Fase 1:
 *  - Login/registrasi memanggil API (js/api.js), bukan localStorage.
 *  - Token disimpan di sessionStorage; data pengguna di-cache di memori
 *    agar pemakaian sinkron seperti AuthService.getCurrentUser() tetap jalan.
 *  - Quick demo login dihapus; login memakai email/username + kata sandi.
 *
 * CATATAN KEAMANAN: kata sandi diverifikasi di server (bcrypt) dan tidak
 * pernah dikirim balik ke browser.
 */

const AuthService = {
    // Cache pengguna aktif (diisi saat login atau pemulihan sesi).
    _currentUser: null,

    /** Mengembalikan pengguna aktif (sinkron, dari cache). */
    getCurrentUser() {
        return this._currentUser;
    },

    isLoggedIn() {
        return this._currentUser !== null;
    },

    /** @param {string|string[]} allowedRoles */
    hasRole(allowedRoles) {
        const user = this._currentUser;
        if (!user) return false;
        return Array.isArray(allowedRoles)
            ? allowedRoles.includes(user.role)
            : user.role === allowedRoles;
    },

    /**
     * Memulihkan sesi dari token tersimpan. Dipanggil sekali saat aplikasi
     * dimuat. Mengembalikan pengguna atau null bila tidak ada sesi valid.
     */
    async restoreSession() {
        this._currentUser = null;
        if (!AuthToken.get()) return null;
        try {
            const data = await AppApi.request('/auth/me');
            this._currentUser = data.user;
            return data.user;
        } catch (error) {
            AuthToken.clear();
            return null;
        }
    },

    /** Login dengan email atau username + kata sandi. */
    async login(identifier, password) {
        try {
            const data = await AppApi.request('/auth/login', {
                method: 'POST',
                auth: false,
                body: { identifier, password }
            });
            AuthToken.set(data.token);
            this._currentUser = data.user;
            return { success: true, user: data.user, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /** Registrasi akun pelanggan baru (role customer). */
    async registerCustomer({ name, email, phone, address, password }) {
        try {
            const data = await AppApi.request('/auth/register', {
                method: 'POST',
                auth: false,
                body: { name, email, phone, address, password }
            });
            AuthToken.set(data.token);
            this._currentUser = data.user;
            return { success: true, user: data.user, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /** Keluar: buang token & cache pengguna. */
    async logout() {
        try {
            await AppApi.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            // Abaikan kegagalan jaringan saat logout; sesi lokal tetap dibuang.
        }
        AuthToken.clear();
        this._currentUser = null;
        return { success: true, message: 'Anda telah berhasil keluar.' };
    },

    /** Label representasi peran untuk antarmuka. */
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
