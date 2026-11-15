/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/reservations.js
 * Deskripsi: API reservasi penitipan (Fase 3).
 *
 * Otorisasi:
 *  - owner            : lihat semua, buat, edit, ubah status.
 *  - staff_ops        : lihat semua.
 *  - customer         : lihat & buat reservasi untuk kucing miliknya.
 *  - staff_driver     : tidak memiliki akses.
 *
 * Catatan: validasi kapasitas/benturan periode dilakukan di klien memakai
 * cermin data (reservasi + penitipan + pengaturan) karena modul penitipan dan
 * pengaturan belum dimigrasi ke server.
 */

const express = require('express');
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const PICKUP_TYPES = ['none', 'pickup', 'delivery', 'both'];

/** DATE/DATETIME MySQL -> 'YYYY-MM-DD'. */
function toDateString(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function todayString() {
    return toDateString(new Date());
}

function isIsoDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Baris MySQL -> objek reservasi sesuai bentuk frontend. */
function toReservation(row) {
    return {
        id: row.id,
        catId: row.cat_id,
        catName: row.cat_name,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        checkInDate: toDateString(row.check_in_date),
        checkOutDate: toDateString(row.check_out_date),
        status: row.status,
        needPickup: Boolean(row.need_pickup),
        pickupType: row.pickup_type,
        pickupAddress: row.pickup_address || '',
        createdAt: toDateString(row.created_at)
    };
}

function validateReservationInput(body) {
    const catId = String(body.catId || '').trim();
    const checkInDate = String(body.checkInDate || '').trim();
    const checkOutDate = String(body.checkOutDate || '').trim();
    if (!catId) {
        return { error: 'Pilih kucing yang akan dititipkan.' };
    }
    if (!isIsoDate(checkInDate) || !isIsoDate(checkOutDate)) {
        return { error: 'Tanggal check-in dan check-out harus valid.' };
    }
    if (checkOutDate <= checkInDate) {
        return { error: 'Tanggal check-out harus setelah tanggal check-in.' };
    }
    if (checkInDate < todayString()) {
        return { error: 'Tanggal check-in tidak boleh sebelum hari ini.' };
    }
    return { value: { catId, checkInDate, checkOutDate } };
}

/** Konfigurasi antar-jemput opsional: { value: null } bila tidak dikirim. */
function validatePickup(body) {
    if (body.pickupType === undefined) return { value: null };
    const pickupType = String(body.pickupType);
    if (!PICKUP_TYPES.includes(pickupType)) {
        return { error: 'Pilihan layanan antar-jemput tidak valid.' };
    }
    const pickupAddress = pickupType === 'none' ? '' : String(body.pickupAddress || '').trim();
    if (pickupType !== 'none' && !pickupAddress) {
        return { error: 'Alamat layanan antar-jemput wajib diisi.' };
    }
    if (pickupAddress.length > 500) {
        return { error: 'Alamat layanan maksimal 500 karakter.' };
    }
    return { value: { pickupType, needPickup: pickupType !== 'none', pickupAddress } };
}

async function generateUniqueReservationId(conn) {
    for (let i = 0; i < 20; i++) {
        const id = `RES-${Math.floor(1000 + Math.random() * 9000)}`;
        const [rows] = await conn.query('SELECT 1 FROM reservations WHERE id = ? LIMIT 1', [id]);
        if (rows.length === 0) return id;
    }
    return `RES-${Date.now()}`;
}

// --- GET /api/reservations : daftar reservasi sesuai peran ---
router.get('/', authenticate, async (req, res) => {
    try {
        let rows;
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query('SELECT * FROM reservations ORDER BY check_in_date ASC, created_at ASC');
        } else if (req.user.role === 'customer') {
            [rows] = await pool.query(
                'SELECT * FROM reservations WHERE owner_id = ? ORDER BY check_in_date ASC, created_at ASC',
                [req.user.id]
            );
        } else {
            return res.json({ success: true, reservations: [] });
        }
        res.json({ success: true, reservations: rows.map(toReservation) });
    } catch (error) {
        console.error('Gagal memuat reservasi:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data reservasi.' });
    }
});

// --- GET /api/reservations/:id : satu reservasi ---
router.get('/:id', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
        }
        const reservation = rows[0];
        if (req.user.role === 'staff_driver' ||
            (req.user.role === 'customer' && reservation.owner_id !== req.user.id)) {
            return res.status(403).json({ success: false, message: 'Anda tidak berhak melihat reservasi ini.' });
        }
        res.json({ success: true, reservation: toReservation(reservation) });
    } catch (error) {
        console.error('Gagal memuat reservasi:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data reservasi.' });
    }
});

// --- POST /api/reservations : buat reservasi (owner / customer) ---
router.post('/', authenticate, async (req, res) => {
    if (!['owner', 'customer'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin membuat reservasi.' });
    }
    const input = validateReservationInput(req.body);
    if (input.error) {
        return res.status(400).json({ success: false, message: input.error });
    }
    const pickupCheck = validatePickup(req.body);
    if (pickupCheck.error) {
        return res.status(400).json({ success: false, message: pickupCheck.error });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [cats] = await conn.query(
            'SELECT id, name, owner_id, owner_name FROM cats WHERE id = ? LIMIT 1',
            [input.value.catId]
        );
        if (cats.length === 0) {
            return res.status(400).json({ success: false, message: 'Data kucing tidak ditemukan.' });
        }
        const cat = cats[0];
        if (req.user.role === 'customer' && cat.owner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Kucing tersebut bukan milik Anda.' });
        }

        const pickup = pickupCheck.value || { pickupType: 'none', needPickup: false, pickupAddress: '' };
        const id = await generateUniqueReservationId(conn);
        const createdAt = todayString();
        await conn.query(
            'INSERT INTO reservations ' +
            '(id, cat_id, cat_name, owner_id, owner_name, check_in_date, check_out_date, status,' +
            ' need_pickup, pickup_type, pickup_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id, cat.id, cat.name, cat.owner_id, cat.owner_name,
                input.value.checkInDate, input.value.checkOutDate, 'Menunggu Konfirmasi',
                pickup.needPickup ? 1 : 0, pickup.pickupType, pickup.pickupAddress, createdAt
            ]
        );

        res.status(201).json({
            success: true,
            reservation: {
                id, catId: cat.id, catName: cat.name, ownerId: cat.owner_id, ownerName: cat.owner_name,
                checkInDate: input.value.checkInDate, checkOutDate: input.value.checkOutDate,
                status: 'Menunggu Konfirmasi', needPickup: pickup.needPickup,
                pickupType: pickup.pickupType, pickupAddress: pickup.pickupAddress, createdAt
            }
        });
    } catch (error) {
        console.error('Gagal menyimpan reservasi:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan reservasi. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/reservations/:id : ubah reservasi (owner) ---
router.put('/:id', authenticate, requireRole('owner'), async (req, res) => {
    const input = validateReservationInput(req.body);
    if (input.error) {
        return res.status(400).json({ success: false, message: input.error });
    }
    const pickupCheck = validatePickup(req.body);
    if (pickupCheck.error) {
        return res.status(400).json({ success: false, message: pickupCheck.error });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM reservations WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
        }
        const existing = rows[0];
        if (!['Menunggu Konfirmasi', 'Dikonfirmasi'].includes(existing.status)) {
            return res.status(409).json({ success: false, message: 'Reservasi ini sudah tidak dapat diedit.' });
        }
        if (String(req.body.catId) !== existing.cat_id) {
            return res.status(400).json({ success: false, message: 'Kucing pada reservasi tidak dapat diganti.' });
        }

        const pickup = pickupCheck.value;
        await conn.query(
            'UPDATE reservations SET check_in_date = ?, check_out_date = ? WHERE id = ?',
            [input.value.checkInDate, input.value.checkOutDate, existing.id]
        );
        const updated = { ...existing, check_in_date: input.value.checkInDate, check_out_date: input.value.checkOutDate };
        if (pickup) {
            await conn.query(
                'UPDATE reservations SET need_pickup = ?, pickup_type = ?, pickup_address = ? WHERE id = ?',
                [pickup.needPickup ? 1 : 0, pickup.pickupType, pickup.pickupAddress, existing.id]
            );
            updated.need_pickup = pickup.needPickup ? 1 : 0;
            updated.pickup_type = pickup.pickupType;
            updated.pickup_address = pickup.pickupAddress;
        }

        res.json({ success: true, reservation: toReservation(updated) });
    } catch (error) {
        console.error('Gagal memperbarui reservasi:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan reservasi. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/reservations/:id/status : ubah status (owner) ---
router.put('/:id/status', authenticate, requireRole('owner'), async (req, res) => {
    const status = String(req.body.status || '');
    if (!['Dikonfirmasi', 'Dibatalkan'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status reservasi tidak valid.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM reservations WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
        }
        const existing = rows[0];
        const allowed =
            (existing.status === 'Menunggu Konfirmasi' && ['Dikonfirmasi', 'Dibatalkan'].includes(status)) ||
            (existing.status === 'Dikonfirmasi' && status === 'Dibatalkan');
        if (!allowed) {
            return res.status(409).json({ success: false, message: 'Perubahan status reservasi tidak diizinkan.' });
        }

        await conn.query('UPDATE reservations SET status = ? WHERE id = ?', [status, existing.id]);
        res.json({ success: true, reservation: toReservation({ ...existing, status }) });
    } catch (error) {
        console.error('Gagal memperbarui status reservasi:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memperbarui status reservasi.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;