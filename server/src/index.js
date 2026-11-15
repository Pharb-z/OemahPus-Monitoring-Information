/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/index.js
 * Deskripsi: Server Express: menyajikan API dan file frontend statis.
 *
 * Fase 0: health check koneksi database + penyajian frontend.
 * Fase selanjutnya akan menambahkan route auth, cats, reservations, dll.
 */

const path = require('path');
const express = require('express');
const config = require('./config');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const catsRoutes = require('./routes/cats');
const usersRoutes = require('./routes/users');
const reservationsRoutes = require('./routes/reservations');
const boardingRoutes = require('./routes/boarding');
const pickupsRoutes = require('./routes/pickups');
const billingRoutes = require('./routes/billing');
const settingsRoutes = require('./routes/settings');

const app = express();
app.use(express.json());

// --- API ---
app.use('/api/auth', authRoutes);
app.use('/api/cats', catsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api', boardingRoutes);
app.use('/api', pickupsRoutes);
app.use('/api', billingRoutes);
app.use('/api', settingsRoutes);
app.use('/api', usersRoutes);

// --- Endpoint status koneksi database ---
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS ok');
        res.json({
            status: 'ok',
            database: 'connected',
            checked: rows.length === 1
        });
    } catch (error) {
        console.error('Health check gagal:', error.message);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            message: 'Database tidak dapat dihubungi. Periksa konfigurasi .env dan pastikan MySQL berjalan.'
        });
    }
});

// --- Menyajikan frontend statis dari root proyek ---
const projectRoot = path.join(__dirname, '..', '..');
app.use(express.static(projectRoot));

const PORT = config.port;
app.listen(PORT, () => {
    console.log(`OMI Pet Hotel server berjalan di http://localhost:${PORT}`);
    console.log(`Cek status database: http://localhost:${PORT}/api/health`);
});
