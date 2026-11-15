/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/routes/cats.js
 * Deskripsi: API data kucing + pemeriksaan awal (Fase 2).
 *
 * Otorisasi:
 *  - owner / staff_ops : melihat & mengelola semua kucing.
 *  - customer          : hanya kucing miliknya (ownerId = dirinya).
 *  - staff_driver      : tidak memiliki akses data kucing.
 */

const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CAT_INSERT_SQL =
    'INSERT INTO cats (id, name, breed, gender, age, color, owner_id, owner_name, photo_url,' +
    ' initial_weight, initial_temperature, initial_parasites, initial_vaccination_status, initial_notes, created_at)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

const CAT_UPDATE_SQL =
    'UPDATE cats SET name = ?, breed = ?, gender = ?, age = ?, color = ?, owner_id = ?, owner_name = ?,' +
    ' photo_url = ?, initial_weight = ?, initial_temperature = ?, initial_parasites = ?,' +
    ' initial_vaccination_status = ?, initial_notes = ? WHERE id = ?';

/** Baris MySQL -> objek kucing sesuai bentuk frontend. */
function toCat(row) {
    return {
        id: row.id,
        name: row.name,
        breed: row.breed,
        gender: row.gender,
        age: row.age,
        color: row.color,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        photoUrl: row.photo_url || '',
        initialCheck: {
            weight: Number(row.initial_weight),
            temperature: Number(row.initial_temperature),
            parasites: row.initial_parasites,
            vaccinationStatus: row.initial_vaccination_status,
            notes: row.initial_notes || ''
        },
        createdAt: row.created_at
    };
}

function todayString() {
    const d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
}

function isMultipleOfTenth(value) {
    return Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;
}

function validateCatIdentity(body) {
    const name = String(body.name || '').trim();
    const breed = String(body.breed || '').trim();
    const gender = String(body.gender || '').trim();
    const age = String(body.age || '').trim();
    const color = String(body.color || '').trim();

    if (!name || !breed || !age || !color) {
        return { error: 'Lengkapi seluruh data identitas kucing.' };
    }
    if (!['Jantan', 'Betina'].includes(gender)) {
        return { error: 'Jenis kelamin kucing tidak valid.' };
    }
    if (name.length > 100 || breed.length > 100 || age.length > 30 || color.length > 100) {
        return { error: 'Panjang data identitas kucing melebihi batas.' };
    }
    return { value: { name, breed, gender, age, color } };
}

function validateInitialCheck(raw) {
    const source = raw || {};
    const weight = Number(source.weight);
    const temperature = Number(source.temperature);
    const parasites = String(source.parasites || '').trim();
    const vaccinationStatus = String(source.vaccinationStatus || '').trim() || 'Belum Dicatat';
    const notes = String(source.notes || '').trim();

    if (!Number.isFinite(weight) || weight < 0.5 || weight > 25 || !isMultipleOfTenth(weight)) {
        return { error: 'Berat badan harus 0.5–25 kg dengan kelipatan 0.1 kg.' };
    }
    if (!Number.isFinite(temperature) || temperature < 35 || temperature > 42.5 || !isMultipleOfTenth(temperature)) {
        return { error: 'Suhu harus 35–42.5 °C dengan kelipatan 0.1 °C.' };
    }
    if (!parasites) {
        return { error: 'Kondisi kulit dan parasit wajib dicatat.' };
    }
    if (parasites.length > 255 || vaccinationStatus.length > 100) {
        return { error: 'Panjang catatan pemeriksaan melebihi batas.' };
    }
    return { value: { weight, temperature, parasites, vaccinationStatus, notes } };
}

async function generateUniqueCatId(conn) {
    for (let i = 0; i < 20; i++) {
        const id = `CAT-${Math.floor(1000 + Math.random() * 9000)}`;
        const [rows] = await conn.query('SELECT 1 FROM cats WHERE id = ? LIMIT 1', [id]);
        if (rows.length === 0) return id;
    }
    return `CAT-${Date.now()}`;
}

async function fetchCatById(id) {
    const [rows] = await pool.query('SELECT * FROM cats WHERE id = ? LIMIT 1', [id]);
    return rows.length ? rows[0] : null;
}

// --- GET /api/cats : daftar kucing sesuai peran ---
router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'staff_driver') {
            return res.json({ success: true, cats: [] });
        }
        let rows;
        if (['owner', 'staff_ops'].includes(req.user.role)) {
            [rows] = await pool.query('SELECT * FROM cats ORDER BY created_at ASC, id ASC');
        } else {
            [rows] = await pool.query(
                'SELECT * FROM cats WHERE owner_id = ? ORDER BY created_at ASC, id ASC',
                [req.user.id]
            );
        }
        res.json({ success: true, cats: rows.map(toCat) });
    } catch (error) {
        console.error('Gagal memuat data kucing:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data kucing dari server.' });
    }
});

// --- GET /api/cats/:id : satu kucing ---
router.get('/:id', authenticate, async (req, res) => {
    try {
        const cat = await fetchCatById(req.params.id);
        if (!cat) {
            return res.status(404).json({ success: false, message: 'Data kucing tidak ditemukan.' });
        }
        if (req.user.role === 'customer' && cat.owner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Kucing ini bukan milik Anda.' });
        }
        if (req.user.role === 'staff_driver') {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses data kucing.' });
        }
        res.json({ success: true, cat: toCat(cat) });
    } catch (error) {
        console.error('Gagal memuat kucing:', error.message);
        res.status(500).json({ success: false, message: 'Gagal memuat data kucing dari server.' });
    }
});

// --- POST /api/cats : tambah kucing ---
router.post('/', authenticate, async (req, res) => {
    if (!['owner', 'staff_ops', 'customer'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin mengelola data kucing.' });
    }
    const identity = validateCatIdentity(req.body);
    if (identity.error) {
        return res.status(400).json({ success: false, message: identity.error });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        let ownerId;
        let ownerName;
        let initialCheck;

        if (req.user.role === 'customer') {
            ownerId = req.user.id;
            ownerName = req.user.name;
            initialCheck = {
                weight: 0, temperature: 0,
                parasites: 'Belum Dicatat', vaccinationStatus: 'Belum Dicatat', notes: ''
            };
        } else {
            ownerId = String(req.body.ownerId || '').trim();
            const [owners] = await conn.query(
                "SELECT id, name FROM users WHERE id = ? AND role = 'customer' LIMIT 1",
                [ownerId]
            );
            if (owners.length === 0) {
                return res.status(400).json({ success: false, message: 'Pilih pemilik kucing yang terdaftar.' });
            }
            ownerName = owners[0].name;
            const check = validateInitialCheck(req.body.initialCheck || req.body);
            if (check.error) {
                return res.status(400).json({ success: false, message: check.error });
            }
            initialCheck = check.value;
        }

        const id = await generateUniqueCatId(conn);
        const photoUrl = String(req.body.photoUrl || '').trim();
        await conn.query(CAT_INSERT_SQL, [
            id, identity.value.name, identity.value.breed, identity.value.gender,
            identity.value.age, identity.value.color, ownerId, ownerName, photoUrl,
            initialCheck.weight, initialCheck.temperature, initialCheck.parasites,
            initialCheck.vaccinationStatus, initialCheck.notes, todayString()
        ]);

        const cat = {
            id, ...identity.value, ownerId, ownerName, photoUrl,
            initialCheck, createdAt: todayString()
        };
        res.status(201).json({ success: true, cat });
    } catch (error) {
        console.error('Gagal menyimpan kucing:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan data kucing. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- PUT /api/cats/:id : ubah kucing ---
router.put('/:id', authenticate, async (req, res) => {
    if (!['owner', 'staff_ops', 'customer'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin mengelola data kucing.' });
    }
    const identity = validateCatIdentity(req.body);
    if (identity.error) {
        return res.status(400).json({ success: false, message: identity.error });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM cats WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data kucing tidak ditemukan.' });
        }
        const existing = rows[0];
        if (req.user.role === 'customer' && existing.owner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Anda tidak berhak mengubah data kucing ini.' });
        }

        let ownerId = existing.owner_id;
        let ownerName = existing.owner_name;
        let initialCheck = {
            weight: Number(existing.initial_weight),
            temperature: Number(existing.initial_temperature),
            parasites: existing.initial_parasites,
            vaccinationStatus: existing.initial_vaccination_status,
            notes: existing.initial_notes || ''
        };

        if (req.user.role !== 'customer') {
            ownerId = String(req.body.ownerId || existing.owner_id).trim();
            const [owners] = await conn.query(
                "SELECT id, name FROM users WHERE id = ? AND role = 'customer' LIMIT 1",
                [ownerId]
            );
            if (owners.length === 0) {
                return res.status(400).json({ success: false, message: 'Pilih pemilik kucing yang terdaftar.' });
            }
            ownerName = owners[0].name;
            const check = validateInitialCheck(req.body.initialCheck || req.body);
            if (check.error) {
                return res.status(400).json({ success: false, message: check.error });
            }
            initialCheck = check.value;
        }

        const photoUrl = String(req.body.photoUrl !== undefined ? req.body.photoUrl : existing.photo_url || '').trim();
        await conn.query(CAT_UPDATE_SQL, [
            identity.value.name, identity.value.breed, identity.value.gender,
            identity.value.age, identity.value.color, ownerId, ownerName, photoUrl,
            initialCheck.weight, initialCheck.temperature, initialCheck.parasites,
            initialCheck.vaccinationStatus, initialCheck.notes, existing.id
        ]);

        const cat = {
            id: existing.id, ...identity.value, ownerId, ownerName, photoUrl,
            initialCheck, createdAt: existing.created_at
        };
        res.json({ success: true, cat });
    } catch (error) {
        console.error('Gagal memperbarui kucing:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan data kucing. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

// --- DELETE /api/cats/:id : hapus kucing (bila tanpa riwayat) ---
router.delete('/:id', authenticate, async (req, res) => {
    if (!['owner', 'staff_ops', 'customer'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin menghapus data kucing.' });
    }
    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT id, owner_id, name FROM cats WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data kucing tidak ditemukan.' });
        }
        const cat = rows[0];
        if (req.user.role === 'customer' && cat.owner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Data kucing ini bukan milik Anda.' });
        }

        const [[resCount]] = await conn.query('SELECT COUNT(*) AS n FROM reservations WHERE cat_id = ?', [cat.id]);
        const [[stayCount]] = await conn.query('SELECT COUNT(*) AS n FROM boarding_stays WHERE cat_id = ?', [cat.id]);
        const [[reportCount]] = await conn.query('SELECT COUNT(*) AS n FROM daily_reports WHERE cat_id = ?', [cat.id]);
        if (resCount.n > 0 || stayCount.n > 0 || reportCount.n > 0) {
            return res.status(409).json({
                success: false,
                message: 'Data kucing tidak dapat dihapus karena memiliki reservasi, riwayat penitipan, atau laporan. Riwayat tersebut perlu dipertahankan.'
            });
        }

        await conn.query('DELETE FROM cats WHERE id = ?', [cat.id]);
        res.json({ success: true, message: `Kucing ${cat.name} berhasil dihapus.` });
    } catch (error) {
        console.error('Gagal menghapus kucing:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus data kucing. Coba lagi.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
