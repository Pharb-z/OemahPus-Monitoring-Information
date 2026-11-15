/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/users.js
 * Deskripsi: Endpoint daftar pengguna (khusus pemilihan pelanggan).
 *
 * Fase 2: dipakai modul Data Kucing agar Owner/Staf dapat memilih pemilik
 * kucing dari daftar pelanggan yang tersimpan di database.
 */

const express = require('express');
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/customers : daftar akun pelanggan (owner & staff ops) ---
router.get('/customers', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, phone, address, role FROM users WHERE role = 'customer' ORDER BY name ASC"
        );
        const users = rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone || '',
            address: row.address || '',
            role: row.role
        }));
        res.json({ success: true, users });
    } catch (error) {
        console.error('Gagal memuat daftar pelanggan:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat daftar pelanggan.' });
    }
});

module.exports = router;
