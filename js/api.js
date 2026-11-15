/**
 * OMI - OemahPus Monitoring and Information
 * File: js/api.js
 * Deskripsi: Pembungkus fetch ke API server + penyimpanan token JWT.
 *
 * Token disimpan di sessionStorage sehingga sesi berakhir saat tab ditutup.
 * Semua permintaan data pada fase berikutnya akan memakai AppApi.request().
 */

const AuthToken = {
    key: 'omi_auth_token',

    get() {
        try { return sessionStorage.getItem(this.key); } catch (e) { return null; }
    },
    set(token) {
        try { sessionStorage.setItem(this.key, token); } catch (e) { /* penyimpanan tidak tersedia */ }
    },
    clear() {
        try { sessionStorage.removeItem(this.key); } catch (e) { /* penyimpanan tidak tersedia */ }
    }
};

const AppApi = {
    base: '/api',

    /**
     * Melakukan permintaan HTTP ke API.
     * @param {string} path - contoh: '/auth/login'
     * @param {{method?:string, body?:object|null, auth?:boolean}} options
     * @returns {Promise<any>} data JSON jika sukses.
     * @throws {Error} pesan dari server bila gagal.
     */
    async request(path, { method = 'GET', body = null, auth = true } = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth) {
            const token = AuthToken.get();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        let response;
        try {
            response = await fetch(this.base + path, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (error) {
            const networkError = new Error('Tidak dapat menghubungi server. Pastikan server OMI berjalan.');
            networkError.isNetworkError = true;
            throw networkError;
        }

        let data = null;
        try { data = await response.json(); } catch (error) { /* respons tanpa body JSON */ }

        if (!response.ok) {
            const message = (data && data.message) || `Permintaan gagal (${response.status}).`;
            const apiError = new Error(message);
            apiError.status = response.status;
            apiError.data = data;
            throw apiError;
        }
        return data;
    }
};
