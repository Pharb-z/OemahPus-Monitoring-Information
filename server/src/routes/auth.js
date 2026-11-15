/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/auth.js
 * Deskripsi: Endpoint autentikasi (login, registrasi pelanggan, profil, logout).
 *
 * Login menerima email ATAU username:
 *  - Owner / Staf  : memakai username (mis. "owner", "staf01").
 *  - Pelanggan     : memakai email (mis. "budi@gmail.com").
 * Kata sandi diverifikasi dengan bcrypt terhadap kolom password_hash.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const config = require('../config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const ROLE_LABELS = {
    owner: 'Pemilik Pet Hotel',
    staff_ops: 'Staf Operasional',
    staff_driver: 'Staf Antar-Jemput',
    customer: 'Pemilik Kucing'
};

/** Ambil kolom aman pengguna (tanpa password_hash). */
function toPublicUser(row) {
    return {
        id: row.id,
        username: row.username || '',
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        address: row.address || '',
        role: row.role,
        roleLabel: ROLE_LABELS[row.role] || 'Pengguna'
    };
}

function signToken(user) {
    return jwt.sign(
        { sub: user.id, role: user.role, name: user.name, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

function todayString() {
    const d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
}

async function generateUniqueUserId(conn, prefix) {
    for (let i = 0; i < 20; i++) {
        const id = `USR-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        const [rows] = await conn.query('SELECT 1 FROM users WHERE id = ? LIMIT 1', [id]);
        if (rows.length === 0) return id;
    }
    return `USR-${prefix}-${Date.now()}`;
}

// --- POST /api/auth/login : masuk sebagai owner/staf/pelanggan ---
router.post('/login', async (req, res) => {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');

    if (!identifier) {
        return res.status(400).json({ success: false, message: 'Email atau username wajib diisi.' });
    }
    if (!password) {
        return res.status(400).json({ success: false, message: 'Kata sandi wajib diisi.' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT id, username, email, password_hash, name, phone, address, role FROM users ' +
            'WHERE username = ? OR email = ? LIMIT 1',
            [identifier, identifier.toLowerCase()]
        );
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Akun dengan email atau username tersebut tidak ditemukan.'
            });
        }
        const user = rows[0];
        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ success: false, message: 'Kata sandi salah.' });
        }
        res.json({
            success: true,
            token: signToken(user),
            user: toPublicUser(user),
            message: `Selamat datang kembali, ${user.name}!`
        });
    } catch (error) {
        console.error('Login gagal:', error.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat login.' });
    }
});

// --- POST /api/auth/register : registrasi akun pelanggan baru ---
router.post('/register', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();
    const password = String(req.body.password || '');

    if (!name) {
        return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
    }
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Nomor telepon / WhatsApp wajib diisi.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.'
            });
        }

        const id = await generateUniqueUserId(conn, 'CUST');
        const passwordHash = await bcrypt.hash(password, 10);
        await conn.query(
            'INSERT INTO users (id, username, email, password_hash, name, phone, address, role, created_at) ' +
            'VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)',
            [id, email, passwordHash, name, phone, address, 'customer', todayString()]
        );

        const user = { id, username: '', name, email, phone, address, role: 'customer' };
        res.status(201).json({
            success: true,
            token: signToken(user),
            user: toPublicUser(user),
            message: `Registrasi berhasil! Selamat datang di OemahPus, ${name}.`
        });
    } catch (error) {
        console.error('Registrasi gagal:', error.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat registrasi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- GET /api/auth/me : data pengguna dari token aktif ---
router.get('/me', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, email, name, phone, address, role FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Akun tidak ditemukan.' });
        }
        res.json({ success: true, user: toPublicUser(rows[0]) });
    } catch (error) {
        console.error('Gagal memuat profil:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data akun.' });
    }
});

// --- POST /api/auth/logout : JWT bersifat stateless, sesi dibuang di klien ---
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Anda telah berhasil keluar.' });
});

module.exports = router;
