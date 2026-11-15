/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/middleware/auth.js
 * Deskripsi: Middleware verifikasi JWT dan pembatasan peran (role).
 *
 * Semua route yang butuh login memakai authenticate; route yang khusus
 * peran tertentu memakai requireRole(...).
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Memverifikasi token pada header Authorization: Bearer <token>.
 * Jika valid, menempelkan data pengguna ke req.user.
 */
function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
        return res.status(401).json({ success: false, message: 'Silakan masuk terlebih dahulu.' });
    }
    try {
        const payload = jwt.verify(token, config.jwtSecret);
        req.user = {
            id: payload.sub,
            role: payload.role,
            name: payload.name,
            email: payload.email
        };
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.'
        });
    }
}

/**
 * Membatasi akses hanya untuk peran yang diizinkan.
 * Pemakaian: router.get('/x', authenticate, requireRole('owner'), handler)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Silakan masuk terlebih dahulu.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki izin untuk tindakan ini.'
            });
        }
        next();
    };
}

module.exports = { authenticate, requireRole };
