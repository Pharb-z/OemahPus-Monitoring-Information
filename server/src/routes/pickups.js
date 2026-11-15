/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/pickups.js
 * Deskripsi: API tugas antar-jemput (Fase 5).
 *
 * Otorisasi:
 *  - owner / staff_ops : membuat & mengatur tugas, lihat semua.
 *  - staff_driver      : lihat tugas miliknya, tandai Selesai.
 *  - customer          : lihat tugas untuk reservasinya.
 */

const express = require('express');
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const PICKUP_SERVICE_TYPES = {
    pickup: ['Penjemputan'],
    delivery: ['Pengantaran Kembali'],
    both: ['Penjemputan', 'Pengantaran Kembali']
};
const SCHEDULABLE_STATUSES = ['Dikonfirmasi', 'Sedang Menginap'];

function toPickup(row) {
    return {
        id: row.id,
        reservationId: row.reservation_id,
        catId: row.cat_id,
        ownerId: row.owner_id,
        catName: row.cat_name,
        ownerName: row.owner_name,
        phone: row.phone || '',
        type: row.type,
        address: row.address,
        scheduledTime: row.scheduled_time,
        status: row.status,
        driverId: row.driver_id,
        driverName: row.driver_name,
        notes: row.notes || ''
    };
}

/** 'YYYY-MM-DDTHH:MM' atau 'YYYY-MM-DD HH:MM [WIB]' -> 'YYYY-MM-DD HH:MM WIB'. */
function normalizeScheduledTime(value) {
    const match = typeof value === 'string'
        ? value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?: WIB)?$/)
        : null;
    if (!match) return null;
    const [, y, mo, d, h, mi] = match;
    const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
    if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 ||
        date.getDate() !== Number(d) || date.getHours() !== Number(h) || date.getMinutes() !== Number(mi)) {
        return null;
    }
    return `${y}-${mo}-${d} ${h}:${mi} WIB`;
}

async function fetchDriver(conn, driverId) {
    if (!driverId) return null;
    const [rows] = await conn.query(
        "SELECT id, name FROM users WHERE id = ? AND role = 'staff_driver' LIMIT 1",
        [driverId]
    );
    return rows.length ? rows[0] : null;
}

// --- GET /api/pickups : daftar tugas sesuai peran ---
router.get('/pickups', authenticate, async (req, res) => {
    try {
        let rows;
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query('SELECT * FROM pickups ORDER BY scheduled_time ASC');
        } else if (req.user.role === 'staff_driver') {
            [rows] = await pool.query('SELECT * FROM pickups WHERE driver_id = ? ORDER BY scheduled_time ASC', [req.user.id]);
        } else if (req.user.role === 'customer') {
            [rows] = await pool.query('SELECT * FROM pickups WHERE owner_id = ? ORDER BY scheduled_time ASC', [req.user.id]);
        } else {
            return res.json({ success: true, pickups: [] });
        }
        res.json({ success: true, pickups: rows.map(toPickup) });
    } catch (error) {
        console.error('Gagal memuat tugas antar-jemput:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data antar-jemput.' });
    }
});

// --- GET /api/drivers : daftar akun staf antar-jemput ---
router.get('/drivers', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, phone FROM users WHERE role = 'staff_driver' ORDER BY name ASC"
        );
        res.json({ success: true, drivers: rows.map(row => ({ id: row.id, name: row.name, phone: row.phone || '' })) });
    } catch (error) {
        console.error('Gagal memuat daftar driver:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat daftar driver.' });
    }
});

// --- POST /api/pickups : buat tugas antar-jemput ---
router.post('/pickups', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    const reservationId = String(req.body.reservationId || '').trim();
    const type = String(req.body.type || '').trim();
    const driverId = String(req.body.driverId || '').trim();
    const address = String(req.body.address || '').trim();
    const scheduledTime = normalizeScheduledTime(req.body.scheduledTime);

    if (!reservationId || !type || !driverId) {
        return res.status(400).json({ success: false, message: 'Data tugas antar-jemput tidak valid.' });
    }
    if (!address || address.length > 500 || !scheduledTime) {
        return res.status(400).json({ success: false, message: 'Alamat atau waktu terjadwal tidak valid.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [reservations] = await conn.query('SELECT * FROM reservations WHERE id = ? LIMIT 1', [reservationId]);
        if (reservations.length === 0) {
            return res.status(400).json({ success: false, message: 'Reservasi tidak ditemukan.' });
        }
        const reservation = reservations[0];
        if (!SCHEDULABLE_STATUSES.includes(reservation.status)) {
            return res.status(409).json({ success: false, message: 'Reservasi harus sudah dikonfirmasi atau sedang menginap.' });
        }
        const serviceTypes = PICKUP_SERVICE_TYPES[reservation.pickup_type] || [];
        if (!serviceTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Jenis tugas tidak sesuai layanan pada reservasi.' });
        }

        const driver = await fetchDriver(conn, driverId);
        if (!driver) {
            return res.status(400).json({ success: false, message: 'Driver tidak ditemukan atau bukan akun staf antar-jemput yang valid.' });
        }

        const [owners] = await conn.query('SELECT phone FROM users WHERE id = ? LIMIT 1', [reservation.owner_id]);
        const phone = owners.length ? owners[0].phone || '' : '';

        const [existing] = await conn.query(
            'SELECT 1 FROM pickups WHERE reservation_id = ? AND type = ? LIMIT 1',
            [reservation.id, type]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Tugas untuk reservasi dan jenis layanan tersebut sudah ada.' });
        }

        let id;
        for (let i = 0; i < 20; i++) {
            const candidate = `PCK-${Math.floor(1000 + Math.random() * 9000)}`;
            const [rows] = await conn.query('SELECT 1 FROM pickups WHERE id = ? LIMIT 1', [candidate]);
            if (rows.length === 0) { id = candidate; break; }
        }
        if (!id) id = `PCK-${Date.now()}`;

        await conn.query(
            'INSERT INTO pickups ' +
            '(id, reservation_id, cat_id, owner_id, cat_name, owner_name, phone, type, address,' +
            ' scheduled_time, status, driver_id, driver_name, notes)' +
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Terjadwal', ?, ?, '')",
            [
                id, reservation.id, reservation.cat_id, reservation.owner_id, reservation.cat_name,
                reservation.owner_name, phone, type, address, scheduledTime, driver.id, driver.name
            ]
        );

        res.status(201).json({
            success: true,
            pickup: {
                id,
                reservationId: reservation.id,
                catId: reservation.cat_id,
                ownerId: reservation.owner_id,
                catName: reservation.cat_name,
                ownerName: reservation.owner_name,
                phone,
                type,
                address,
                scheduledTime,
                status: 'Terjadwal',
                driverId: driver.id,
                driverName: driver.name,
                notes: ''
            }
        });
    } catch (error) {
        console.error('Gagal menyimpan tugas antar-jemput:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan tugas antar-jemput. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/pickups/:id : atur penugasan (driver/alamat/waktu) ---
router.put('/pickups/:id', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    const driverId = String(req.body.driverId || '').trim();
    const address = String(req.body.address || '').trim();
    const scheduledTime = normalizeScheduledTime(req.body.scheduledTime);
    if (!address || address.length > 500 || !scheduledTime) {
        return res.status(400).json({ success: false, message: 'Alamat atau waktu terjadwal tidak valid.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM pickups WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
        }
        const pickup = rows[0];
        if (pickup.status !== 'Terjadwal') {
            return res.status(409).json({ success: false, message: 'Tugas sudah tidak dapat diubah.' });
        }

        const driver = await fetchDriver(conn, driverId);
        if (!driver) {
            return res.status(400).json({ success: false, message: 'Driver tidak ditemukan atau bukan akun staf antar-jemput yang valid.' });
        }

        await conn.query(
            'UPDATE pickups SET driver_id = ?, driver_name = ?, address = ?, scheduled_time = ? WHERE id = ?',
            [driver.id, driver.name, address, scheduledTime, pickup.id]
        );

        res.json({
            success: true,
            pickup: toPickup({ ...pickup, driver_id: driver.id, driver_name: driver.name, address, scheduled_time: scheduledTime })
        });
    } catch (error) {
        console.error('Gagal memperbarui tugas antar-jemput:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memperbarui tugas antar-jemput.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/pickups/:id/status : tandai Selesai (driver terkait) ---
router.put('/pickups/:id/status', authenticate, requireRole('staff_driver'), async (req, res) => {
    const status = String(req.body.status || '');
    if (status !== 'Selesai') {
        return res.status(400).json({ success: false, message: 'Status tugas tidak valid.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM pickups WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
        }
        const pickup = rows[0];
        if (pickup.driver_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Tugas ini bukan penugasan Anda.' });
        }
        if (pickup.status !== 'Terjadwal') {
            return res.status(409).json({ success: false, message: 'Tugas sudah diselesaikan sebelumnya.' });
        }

        await conn.query("UPDATE pickups SET status = 'Selesai' WHERE id = ?", [pickup.id]);
        res.json({ success: true, pickup: toPickup({ ...pickup, status: 'Selesai' }) });
    } catch (error) {
        console.error('Gagal memperbarui status tugas:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memperbarui status tugas.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;