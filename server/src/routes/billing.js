/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/billing.js
 * Deskripsi: API tagihan (billing) dan pencatatan pembayaran manual (Fase 6).
 *
 * Otorisasi:
 *  - owner / staff_ops : lihat semua tagihan & transaksi.
 *  - staff_ops         : buat tagihan & catat pembayaran.
 *  - customer          : lihat tagihan & transaksi miliknya.
 *  - staff_driver      : tidak memiliki akses.
 */

const express = require('express');
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

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

function nowDateTime() {
    return toDateTimeString(new Date());
}

function isValidIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toBill(row) {
    const numberOfNights = Number(row.number_of_nights);
    const unitRate = Number(row.unit_rate);
    return {
        id: row.id,
        reservationId: row.reservation_id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        catId: row.cat_id,
        catName: row.cat_name,
        boardingStayId: row.boarding_stay_id || null,
        currency: row.currency,
        periodStart: toDateString(row.period_start),
        periodEndExclusive: toDateString(row.period_end_exclusive),
        numberOfNights,
        unitRate,
        lineItems: [{
            description: `Penitipan kucing (${numberOfNights} malam)`,
            quantity: numberOfNights,
            unitRate,
            amount: numberOfNights * unitRate
        }],
        totalAmount: Number(row.total_amount),
        createdAt: toDateTimeString(row.created_at),
        createdBy: { id: row.created_by_id, name: row.created_by_name }
    };
}

function toTransaction(row) {
    return {
        id: row.id,
        billId: row.bill_id,
        reservationId: row.reservation_id,
        customerId: row.customer_id,
        amount: Number(row.amount),
        method: row.method,
        status: row.status,
        recordedAt: toDateTimeString(row.recorded_at),
        recordedBy: { id: row.recorded_by_id, name: row.recorded_by_name },
        reference: row.reference || '',
        idempotencyKey: row.idempotency_key
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

// --- GET /api/bills : daftar tagihan sesuai peran ---
router.get('/bills', authenticate, async (req, res) => {
    try {
        let rows;
        const base = 'SELECT b.*, s.id AS boarding_stay_id FROM billing_bills b ' +
            'LEFT JOIN boarding_stays s ON s.reservation_id = b.reservation_id ';
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query(base + 'ORDER BY b.created_at DESC');
        } else if (req.user.role === 'customer') {
            [rows] = await pool.query(
                base + 'WHERE b.customer_id = ? ORDER BY b.created_at DESC',
                [req.user.id]
            );
        } else {
            return res.json({ success: true, bills: [] });
        }
        res.json({ success: true, bills: rows.map(toBill) });
    } catch (error) {
        console.error('Gagal memuat tagihan:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data tagihan.' });
    }
});

// --- POST /api/bills : buat tagihan dari reservasi (Staf Ops) ---
router.post('/bills', authenticate, requireRole('staff_ops'), async (req, res) => {
    const reservationId = String(req.body.reservationId || '').trim();
    if (!reservationId) {
        return res.status(400).json({ success: false, message: 'Reservasi tidak valid untuk pembuatan tagihan.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [reservations] = await conn.query('SELECT * FROM reservations WHERE id = ? LIMIT 1', [reservationId]);
        if (reservations.length === 0) {
            return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
        }
        const reservation = reservations[0];
        const [stays] = await conn.query('SELECT * FROM boarding_stays WHERE reservation_id = ? LIMIT 1', [reservation.id]);
        const stay = stays.length ? stays[0] : null;

        if (reservation.status === 'Dibatalkan' ||
            (reservation.status !== 'Dikonfirmasi' && !stay)) {
            return res.status(409).json({
                success: false,
                message: 'Tagihan hanya dapat dibuat untuk reservasi terkonfirmasi atau yang memiliki riwayat penitipan.'
            });
        }
        if (stay && (stay.cat_id !== reservation.cat_id || stay.owner_id !== reservation.owner_id)) {
            return res.status(409).json({ success: false, message: 'Relasi reservasi dan penitipan tidak konsisten.' });
        }

        const checkInDate = toDateString(reservation.check_in_date);
        const checkOutDate = toDateString(reservation.check_out_date);
        if (!isValidIsoDate(checkInDate) || !isValidIsoDate(checkOutDate) || checkOutDate <= checkInDate) {
            return res.status(400).json({ success: false, message: 'Tanggal reservasi tidak valid untuk perhitungan tagihan.' });
        }

        const [cats] = await conn.query('SELECT * FROM cats WHERE id = ? AND owner_id = ? LIMIT 1', [reservation.cat_id, reservation.owner_id]);
        if (cats.length === 0) {
            return res.status(409).json({ success: false, message: 'Data kucing pada reservasi tidak valid.' });
        }
        const cat = cats[0];
        const [customers] = await conn.query("SELECT id, name FROM users WHERE id = ? AND role = 'customer' LIMIT 1", [reservation.owner_id]);
        if (customers.length === 0) {
            return res.status(409).json({ success: false, message: 'Data pelanggan pada reservasi tidak valid.' });
        }
        const customer = customers[0];

        const [settingsRows] = await conn.query('SELECT standard_daily_rate FROM settings WHERE id = 1 LIMIT 1');
        const unitRate = settingsRows.length ? Number(settingsRows[0].standard_daily_rate) : NaN;
        if (!Number.isSafeInteger(unitRate) || unitRate <= 0) {
            return res.status(409).json({ success: false, message: 'Tarif harian hotel belum dikonfigurasi sebagai nominal Rupiah bulat yang valid.' });
        }

        const numberOfNights = (Date.parse(`${checkOutDate}T00:00:00Z`) - Date.parse(`${checkInDate}T00:00:00Z`)) / 86400000;
        const totalAmount = numberOfNights * unitRate;
        if (!Number.isSafeInteger(numberOfNights) || numberOfNights <= 0 ||
            !Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Periode atau total tagihan tidak dapat dihitung dengan aman.' });
        }

        const [existingBills] = await conn.query('SELECT 1 FROM billing_bills WHERE reservation_id = ? LIMIT 1', [reservation.id]);
        if (existingBills.length > 0) {
            return res.status(409).json({ success: false, message: 'Tagihan untuk reservasi ini sudah tersedia.' });
        }

        const id = await generateUniqueId(conn, 'billing_bills', 'BILL');
        const createdAt = nowDateTime();
        await conn.query(
            'INSERT INTO billing_bills ' +
            '(id, reservation_id, customer_id, cat_id, cat_name, customer_name, number_of_nights,' +
            ' period_start, period_end_exclusive, unit_rate, total_amount, currency, created_at,' +
            ' created_by_id, created_by_name)' +
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?)",
            [
                id, reservation.id, customer.id, cat.id, cat.name, customer.name, numberOfNights,
                checkInDate, checkOutDate, unitRate, totalAmount, createdAt, req.user.id, req.user.name
            ]
        );

        res.status(201).json({
            success: true,
            bill: {
                id,
                reservationId: reservation.id,
                customerId: customer.id,
                customerName: customer.name,
                catId: cat.id,
                catName: cat.name,
                boardingStayId: stay ? stay.id : null,
                currency: 'IDR',
                periodStart: checkInDate,
                periodEndExclusive: checkOutDate,
                numberOfNights,
                unitRate,
                lineItems: [{
                    description: `Penitipan kucing (${numberOfNights} malam)`,
                    quantity: numberOfNights,
                    unitRate,
                    amount: totalAmount
                }],
                totalAmount,
                createdAt,
                createdBy: { id: req.user.id, name: req.user.name }
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Tagihan untuk reservasi ini sudah tersedia.' });
        }
        console.error('Gagal menyimpan tagihan:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan tagihan. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- GET /api/billing-transactions : daftar transaksi sesuai peran ---
router.get('/billing-transactions', authenticate, async (req, res) => {
    try {
        let rows;
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query('SELECT * FROM billing_transactions ORDER BY recorded_at DESC');
        } else if (req.user.role === 'customer') {
            [rows] = await pool.query(
                'SELECT * FROM billing_transactions WHERE customer_id = ? ORDER BY recorded_at DESC',
                [req.user.id]
            );
        } else {
            return res.json({ success: true, transactions: [] });
        }
        res.json({ success: true, transactions: rows.map(toTransaction) });
    } catch (error) {
        console.error('Gagal memuat transaksi pembayaran:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data transaksi.' });
    }
});

// --- POST /api/billing-transactions : catat pembayaran manual (Staf Ops) ---
router.post('/billing-transactions', authenticate, requireRole('staff_ops'), async (req, res) => {
    const billId = String(req.body.billId || '').trim();
    const idempotencyKey = typeof req.body.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
    const method = String(req.body.method || '');
    const reference = typeof req.body.reference === 'string' ? req.body.reference.trim() : '';
    const amountValue = req.body.amount;
    const amountString = typeof amountValue === 'string' ? amountValue.trim() : '';
    const amount = typeof amountValue === 'number'
        ? amountValue
        : (/^\d+$/.test(amountString) ? Number(amountString) : NaN);

    if (!idempotencyKey || idempotencyKey.length > 120) {
        return res.status(400).json({ success: false, message: 'Identitas pengiriman pembayaran tidak valid.' });
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Nominal pembayaran harus berupa bilangan bulat Rupiah yang lebih besar dari nol.' });
    }
    if (!['cash', 'transfer'].includes(method)) {
        return res.status(400).json({ success: false, message: 'Pilih metode tunai atau transfer.' });
    }
    if (reference.length > 120) {
        return res.status(400).json({ success: false, message: 'Catatan atau referensi pembayaran maksimal 120 karakter.' });
    }
    if (!billId) {
        return res.status(400).json({ success: false, message: 'Tagihan tidak ditemukan atau tidak valid.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [dupes] = await conn.query('SELECT 1 FROM billing_transactions WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
        if (dupes.length > 0) {
            return res.status(409).json({ success: false, message: 'Pengiriman ini sudah pernah dicatat.' });
        }

        const [bills] = await conn.query('SELECT * FROM billing_bills WHERE id = ? LIMIT 1', [billId]);
        if (bills.length === 0) {
            return res.status(404).json({ success: false, message: 'Tagihan tidak ditemukan atau tidak valid.' });
        }
        const bill = bills[0];
        const [paidRows] = await conn.query(
            "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM billing_transactions WHERE bill_id = ? AND status = 'Diterima'",
            [bill.id]
        );
        const totalPaid = Number(paidRows[0].total_paid);
        const remainingAmount = Number(bill.total_amount) - totalPaid;
        if (amount > remainingAmount) {
            return res.status(409).json({ success: false, message: 'Nominal pembayaran melebihi sisa tagihan.' });
        }

        const id = await generateUniqueId(conn, 'billing_transactions', 'PAY');
        const recordedAt = nowDateTime();
        await conn.query(
            'INSERT INTO billing_transactions ' +
            '(id, idempotency_key, bill_id, reservation_id, customer_id, amount, method, status,' +
            ' reference, recorded_at, recorded_by_id, recorded_by_name)' +
            " VALUES (?, ?, ?, ?, ?, ?, ?, 'Diterima', ?, ?, ?, ?)",
            [
                id, idempotencyKey, bill.id, bill.reservation_id, bill.customer_id, amount, method,
                reference, recordedAt, req.user.id, req.user.name
            ]
        );

        res.status(201).json({
            success: true,
            transaction: {
                id,
                billId: bill.id,
                reservationId: bill.reservation_id,
                customerId: bill.customer_id,
                amount,
                method,
                status: 'Diterima',
                recordedAt,
                recordedBy: { id: req.user.id, name: req.user.name },
                reference,
                idempotencyKey
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Pengiriman ini sudah pernah dicatat.' });
        }
        console.error('Gagal menyimpan pembayaran:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan pembayaran. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
