/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/settings.js
 * Deskripsi: API konfigurasi pet hotel (Fase 7).
 *
 * Konfigurasi bersifat read-only: nilainya hanya diubah lewat seed database.
 * Dipakai frontend untuk menampilkan kapasitas, tarif, dan identitas hotel.
 */

const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function toSettings(row) {
    return {
        hotelName: row.hotel_name,
        totalCapacity: Number(row.total_capacity),
        standardDailyRate: Number(row.standard_daily_rate),
        pickupRateFlat: Number(row.pickup_rate_flat),
        address: row.address || '',
        contactPhone: row.contact_phone || ''
    };
}

// --- GET /api/settings : konfigurasi hotel (semua pengguna terautentikasi) ---
router.get('/settings', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Konfigurasi hotel belum tersedia.' });
        }
        res.json({ success: true, settings: toSettings(rows[0]) });
    } catch (error) {
        console.error('Gagal memuat konfigurasi hotel:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat konfigurasi hotel.' });
    }
});

module.exports = router;