/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/boarding.js
 * Deskripsi: API penitipan (check-in/check-out) dan laporan harian (Fase 4).
 *
 * Otorisasi:
 *  - owner / staff_ops : kelola semua penitipan & laporan.
 *  - customer          : lihat penitipan & laporan miliknya.
 *  - staff_driver      : tidak memiliki akses.
 */

const express = require('express');
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const KENNEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/;
const REPORT_FIELDS = [
    ['mealIntake', 'meal_intake'],
    ['waterIntake', 'water_intake'],
    ['urination', 'urination'],
    ['defecation', 'defecation'],
    ['activityAndMood', 'activity_and_mood']
];

const pad2 = n => String(n).padStart(2, '0');

function toDateString(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toDateTimeString(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
        `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function nowDateString() {
    return toDateString(new Date());
}

function todayDateTime() {
    return toDateTimeString(new Date());
}

function toStay(row) {
    return {
        id: row.id,
        reservationId: row.reservation_id,
        catId: row.cat_id,
        catName: row.cat_name,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        kennel: row.kennel || '',
        checkInDate: toDateString(row.check_in_date),
        plannedCheckOutDate: toDateString(row.planned_check_out_date),
        checkedInAt: toDateTimeString(row.checked_in_at),
        checkedOutAt: toDateTimeString(row.checked_out_at),
        actualCheckOutDate: toDateString(row.actual_check_out_date),
        status: row.status,
        createdBy: row.created_by || null
    };
}

function toReport(row) {
    return {
        id: row.id,
        boardingStayId: row.boarding_stay_id,
        reservationId: row.reservation_id,
        catId: row.cat_id,
        catName: row.cat_name,
        date: toDateString(row.date),
        mealIntake: row.meal_intake,
        waterIntake: row.water_intake,
        urination: row.urination,
        defecation: row.defecation,
        activityAndMood: row.activity_and_mood,
        recordedBy: row.recorded_by,
        recordedAt: toDateTimeString(row.recorded_at),
        updatedAt: toDateTimeString(row.updated_at),
        updatedBy: row.updated_by || null
    };
}

async function generateUniqueId(conn, table, prefix) {
    for (let i = 0; i < 20; i++) {
        const id = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        const [rows] = await conn.query(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [id]);
        if (rows.length === 0) return id;
    }
    return `${prefix}-${Date.now()}`;
}

/** Validasi 5 catatan harian. */
function validateReportFields(body) {
    const values = {};
    for (const [camel, column] of REPORT_FIELDS) {
        const value = typeof body[camel] === 'string' ? body[camel].trim() : '';
        if (!value) return { error: 'Semua catatan kondisi harian wajib diisi.' };
        if (value.length > 500) return { error: 'Setiap catatan maksimal 500 karakter.' };
        values[column] = value;
    }
    return { value: values };
}

// --- GET /api/boarding-stays : daftar penitipan sesuai peran ---
router.get('/boarding-stays', authenticate, async (req, res) => {
    try {
        let rows;
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query(
                'SELECT * FROM boarding_stays ORDER BY checked_in_at DESC, check_in_date DESC'
            );
        } else if (req.user.role === 'customer') {
            [rows] = await pool.query(
                'SELECT * FROM boarding_stays WHERE owner_id = ? ORDER BY checked_in_at DESC, check_in_date DESC',
                [req.user.id]
            );
        } else {
            return res.json({ success: true, stays: [] });
        }
        res.json({ success: true, stays: rows.map(toStay) });
    } catch (error) {
        console.error('Gagal memuat penitipan:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data penitipan.' });
    }
});

// --- POST /api/boarding-stays : check-in ---
router.post('/boarding-stays', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    const reservationId = String(req.body.reservationId || '').trim();
    const kennel = typeof req.body.kennel === 'string' ? req.body.kennel.trim() : '';

    if (!reservationId) {
        return res.status(400).json({ success: false, message: 'Reservasi tidak valid untuk check-in.' });
    }
    if (!KENNEL_PATTERN.test(kennel)) {
        return res.status(400).json({
            success: false,
            message: 'Identitas kandang wajib diawali huruf/angka dan hanya boleh berisi huruf, angka, spasi, titik, garis bawah, atau tanda hubung (maksimal 60 karakter).'
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [reservations] = await conn.query('SELECT * FROM reservations WHERE id = ? LIMIT 1', [reservationId]);
        if (reservations.length === 0) {
            return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
        }
        const reservation = reservations[0];
        if (reservation.status !== 'Dikonfirmasi') {
            return res.status(409).json({ success: false, message: 'Check-in hanya dapat dilakukan untuk reservasi yang telah dikonfirmasi.' });
        }

        const [existingStays] = await conn.query('SELECT 1 FROM boarding_stays WHERE reservation_id = ? LIMIT 1', [reservation.id]);
        if (existingStays.length > 0) {
            return res.status(409).json({ success: false, message: 'Reservasi ini sudah memiliki riwayat penitipan dan tidak dapat check-in ulang.' });
        }

        const today = nowDateString();
        const checkInDate = toDateString(reservation.check_in_date);
        const checkOutDate = toDateString(reservation.check_out_date);
        if (!checkInDate || !checkOutDate || today < checkInDate || today >= checkOutDate) {
            return res.status(409).json({ success: false, message: 'Check-in hanya dapat dilakukan dalam periode reservasi yang valid.' });
        }

        const [activeSameKennel] = await conn.query(
            "SELECT 1 FROM boarding_stays WHERE status = 'Sedang Dititipkan' AND LOWER(kennel) = LOWER(?) LIMIT 1",
            [kennel]
        );
        if (activeSameKennel.length > 0) {
            return res.status(409).json({ success: false, message: 'Kandang tersebut sedang digunakan kucing lain.' });
        }

        const id = await generateUniqueId(conn, 'boarding_stays', 'STAY');
        const checkedInAt = todayDateTime();
        await conn.query(
            'INSERT INTO boarding_stays ' +
            '(id, reservation_id, cat_id, cat_name, owner_id, owner_name, kennel, check_in_date,' +
            ' planned_check_out_date, checked_in_at, checked_out_at, actual_check_out_date, status, created_by)' +
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)',
            [
                id, reservation.id, reservation.cat_id, reservation.cat_name, reservation.owner_id,
                reservation.owner_name, kennel, today, checkOutDate, checkedInAt,
                'Sedang Dititipkan', req.user.id
            ]
        );

        res.status(201).json({
            success: true,
            stay: {
                id,
                reservationId: reservation.id,
                catId: reservation.cat_id,
                catName: reservation.cat_name,
                ownerId: reservation.owner_id,
                ownerName: reservation.owner_name,
                kennel,
                checkInDate: today,
                plannedCheckOutDate: checkOutDate,
                checkedInAt,
                checkedOutAt: null,
                actualCheckOutDate: '',
                status: 'Sedang Dititipkan',
                createdBy: req.user.id
            }
        });
    } catch (error) {
        console.error('Gagal menyimpan check-in:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan check-in. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/boarding-stays/:id/checkout : check-out aktual ---
router.put('/boarding-stays/:id/checkout', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM boarding_stays WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data penitipan tidak ditemukan.' });
        }
        const stay = rows[0];
        if (stay.status !== 'Sedang Dititipkan') {
            return res.status(409).json({ success: false, message: 'Hanya kucing yang sedang dititipkan dapat menjalani check-out.' });
        }

        const checkedOutAt = todayDateTime();
        const actualDate = nowDateString();
        await conn.query(
            "UPDATE boarding_stays SET status = 'Selesai', checked_out_at = ?, actual_check_out_date = ? WHERE id = ?",
            [checkedOutAt, actualDate, stay.id]
        );

        res.json({
            success: true,
            stay: toStay({ ...stay, status: 'Selesai', checked_out_at: checkedOutAt, actual_check_out_date: actualDate })
        });
    } catch (error) {
        console.error('Gagal menyimpan check-out:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan check-out. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- GET /api/daily-reports : daftar laporan harian sesuai peran ---
router.get('/daily-reports', authenticate, async (req, res) => {
    try {
        let rows;
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query('SELECT * FROM daily_reports ORDER BY date DESC, recorded_at DESC');
        } else if (req.user.role === 'customer') {
            [rows] = await pool.query(
                'SELECT dr.* FROM daily_reports dr ' +
                'JOIN reservations r ON r.id = dr.reservation_id ' +
                'WHERE r.owner_id = ? ORDER BY dr.date DESC, dr.recorded_at DESC',
                [req.user.id]
            );
        } else {
            return res.json({ success: true, reports: [] });
        }
        res.json({ success: true, reports: rows.map(toReport) });
    } catch (error) {
        console.error('Gagal memuat laporan harian:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat laporan harian.' });
    }
});

// --- POST /api/daily-reports : buat laporan harian ---
router.post('/daily-reports', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    const boardingStayId = String(req.body.boardingStayId || '').trim();
    const date = String(req.body.date || '').trim();
    if (!boardingStayId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Data laporan harian tidak valid.' });
    }
    const fields = validateReportFields(req.body);
    if (fields.error) {
        return res.status(400).json({ success: false, message: fields.error });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [stays] = await conn.query('SELECT * FROM boarding_stays WHERE id = ? LIMIT 1', [boardingStayId]);
        if (stays.length === 0) {
            return res.status(404).json({ success: false, message: 'Data penitipan tidak ditemukan.' });
        }
        const stay = stays[0];
        if (stay.status !== 'Sedang Dititipkan') {
            return res.status(409).json({ success: false, message: 'Laporan hanya dapat dibuat untuk kucing yang sedang dititipkan.' });
        }
        const checkInDate = toDateString(stay.check_in_date);
        const today = nowDateString();
        if (date < checkInDate || date > today) {
            return res.status(400).json({ success: false, message: 'Tanggal laporan harus berada pada masa penitipan yang sudah berjalan.' });
        }

        const id = await generateUniqueId(conn, 'daily_reports', 'REP');
        const recordedAt = todayDateTime();
        await conn.query(
            'INSERT INTO daily_reports ' +
            '(id, boarding_stay_id, reservation_id, cat_id, cat_name, date, meal_intake, water_intake,' +
            ' urination, defecation, activity_and_mood, recorded_by, recorded_at, updated_at, updated_by)' +
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)',
            [
                id, stay.id, stay.reservation_id, stay.cat_id, stay.cat_name, date,
                fields.value.meal_intake, fields.value.water_intake, fields.value.urination,
                fields.value.defecation, fields.value.activity_and_mood,
                req.user.name, recordedAt
            ]
        );

        res.status(201).json({
            success: true,
            report: {
                id,
                boardingStayId: stay.id,
                reservationId: stay.reservation_id,
                catId: stay.cat_id,
                catName: stay.cat_name,
                date,
                mealIntake: fields.value.meal_intake,
                waterIntake: fields.value.water_intake,
                urination: fields.value.urination,
                defecation: fields.value.defecation,
                activityAndMood: fields.value.activity_and_mood,
                recordedBy: req.user.name,
                recordedAt,
                updatedAt: null,
                updatedBy: null
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Laporan untuk kucing ini pada tanggal tersebut sudah ada. Gunakan fitur edit.' });
        }
        console.error('Gagal menyimpan laporan harian:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan laporan harian. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/daily-reports/:id : ubah laporan harian ---
router.put('/daily-reports/:id', authenticate, requireRole('owner', 'staff_ops'), async (req, res) => {
    const date = String(req.body.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Tanggal laporan tidak valid.' });
    }
    const fields = validateReportFields(req.body);
    if (fields.error) {
        return res.status(400).json({ success: false, message: fields.error });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [reports] = await conn.query('SELECT * FROM daily_reports WHERE id = ? LIMIT 1', [req.params.id]);
        if (reports.length === 0) {
            return res.status(404).json({ success: false, message: 'Laporan harian tidak ditemukan.' });
        }
        const report = reports[0];
        const [stays] = await conn.query('SELECT * FROM boarding_stays WHERE id = ? LIMIT 1', [report.boarding_stay_id]);
        if (stays.length === 0 || stays[0].status !== 'Sedang Dititipkan') {
            return res.status(409).json({ success: false, message: 'Laporan hanya dapat diubah selama penitipan masih aktif.' });
        }
        const stay = stays[0];
        const checkInDate = toDateString(stay.check_in_date);
        const today = nowDateString();
        if (date < checkInDate || date > today) {
            return res.status(400).json({ success: false, message: 'Tanggal laporan harus berada pada masa penitipan yang sudah berjalan.' });
        }

        const updatedAt = todayDateTime();
        await conn.query(
            'UPDATE daily_reports SET date = ?, meal_intake = ?, water_intake = ?, urination = ?,' +
            ' defecation = ?, activity_and_mood = ?, updated_at = ?, updated_by = ? WHERE id = ?',
            [
                date, fields.value.meal_intake, fields.value.water_intake, fields.value.urination,
                fields.value.defecation, fields.value.activity_and_mood, updatedAt, req.user.id, report.id
            ]
        );

        res.json({
            success: true,
            report: toReport({
                ...report,
                date,
                meal_intake: fields.value.meal_intake,
                water_intake: fields.value.water_intake,
                urination: fields.value.urination,
                defecation: fields.value.defecation,
                activity_and_mood: fields.value.activity_and_mood,
                updated_at: updatedAt,
                updated_by: req.user.id
            })
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Laporan untuk kucing ini pada tanggal tersebut sudah ada.' });
        }
        console.error('Gagal memperbarui laporan harian:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memperbarui laporan harian.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;