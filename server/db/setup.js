/**
 * OMI - OemahPus Monitoring and Information
 * File: server/db/setup.js
 * Deskripsi: Menyiapkan database MySQL (membuat database, menjalankan schema.sql,
 *            lalu mengisi data demo). Jalankan dengan: npm run db:setup
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'omidb_html';

/** Format sebuah Date menjadi 'YYYY-MM-DD' (waktu lokal). */
function isoDate(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

/** Tanggal hari ini digeser sejumlah hari (bisa negatif). */
function shiftDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return isoDate(date);
}

/** Tanggal + jam lokal dalam format 'YYYY-MM-DD HH:MM:SS'. */
function dateTime(days, hours, minutes) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hours, minutes, 0, 0);
    return `${isoDate(date)} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

/** Jam terjadwal tugas antar-jemput dalam format frontend: 'YYYY-MM-DD HH:MM WIB'. */
function scheduledTime(days, hours, minutes) {
    return `${shiftDate(days)} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} WIB`;
}

async function seed(conn) {
    const passwordHash = {
        owner: await bcrypt.hash('owner123', 10),
        ops: await bcrypt.hash('staf123', 10),
        driver: await bcrypt.hash('driver123', 10),
        budi: await bcrypt.hash('budi123', 10),
        anisa: await bcrypt.hash('anisa123', 10)
    };

    // 1. Pengguna
    await conn.query(
        'INSERT INTO `users` (`id`,`username`,`email`,`password_hash`,`name`,`phone`,`address`,`role`,`created_at`) VALUES ?',
        [[
            ['USR-OWNER', 'owner', 'owner@oemahpus.com', passwordHash.owner, 'Dr. Hendra (Owner)', '081234567890', '', 'owner', '2026-10-01'],
            ['USR-OPS', 'staf01', 'ops@oemahpus.com', passwordHash.ops, 'Siti Rahma', '081234567891', '', 'staff_ops', '2026-10-01'],
            ['USR-DRIVER', 'driver01', 'driver@oemahpus.com', passwordHash.driver, 'Doni Pratama', '081234567892', '', 'staff_driver', '2026-10-01'],
            ['USR-CUST-001', null, 'budi@gmail.com', passwordHash.budi, 'Budi Santoso', '081298765432', 'Jl. Rungkut Asri No. 12, Surabaya', 'customer', '2026-10-10'],
            ['USR-CUST-002', null, 'anisa@gmail.com', passwordHash.anisa, 'Anisa Maharani', '081377889900', 'Jl. Manyar Kertoarjo No. 45, Surabaya', 'customer', '2026-10-12']
        ]]
    );

    // 2. Kucing + pemeriksaan awal
    await conn.query(
        'INSERT INTO `cats` (`id`,`name`,`breed`,`gender`,`age`,`color`,`owner_id`,`owner_name`,`photo_url`,' +
        '`initial_weight`,`initial_temperature`,`initial_parasites`,`initial_vaccination_status`,`initial_notes`,`created_at`) VALUES ?',
        [[
            ['CAT-101', 'Mochi', 'Persia Medium', 'Jantan', '2 tahun', 'Putih Abu-abu', 'USR-CUST-001', 'Budi Santoso', 'assets/images/cat-mochi.svg',
                4.2, 38.6, 'Bebas Kutu & Jamur', 'Lengkap (Feline 4)', 'Kucing ramah dan suka dielus, agak pemalu di hari pertama.', '2026-10-10'],
            ['CAT-102', 'Luna', 'British Shorthair', 'Betina', '1.5 tahun', 'Abu-abu Solid', 'USR-CUST-001', 'Budi Santoso', 'assets/images/cat-luna.svg',
                3.8, 38.4, 'Bebas Kutu & Jamur', 'Lengkap', 'Nafsu makan tinggi, aktif bermain bola benang.', '2026-10-10'],
            ['CAT-103', 'Simba', 'Domestik / Mix Kampung', 'Jantan', '3 tahun', 'Oranye Putih', 'USR-CUST-002', 'Anisa Maharani', 'assets/images/cat-simba.svg',
                4.5, 38.8, 'Sedikit bekas garukan di telinga (sudah dibersihkan)', 'Lengkap', 'Sangat lincah, butuh porsi makan 3 kali sehari.', '2026-10-12']
        ]]
    );

    // 3. Reservasi (tanggal relatif hari ini agar demo tetap relevan)
    await conn.query(
        'INSERT INTO `reservations` (`id`,`cat_id`,`cat_name`,`owner_id`,`owner_name`,`check_in_date`,`check_out_date`,' +
        '`status`,`need_pickup`,`pickup_type`,`pickup_address`,`created_at`) VALUES ?',
        [[
            ['RES-2026-001', 'CAT-101', 'Mochi', 'USR-CUST-001', 'Budi Santoso', shiftDate(-3), shiftDate(1),
                'Dikonfirmasi', 1, 'both', 'Jl. Rungkut Asri No. 12, Surabaya', shiftDate(-5)],
            ['RES-2026-002', 'CAT-102', 'Luna', 'USR-CUST-001', 'Budi Santoso', shiftDate(1), shiftDate(5),
                'Dikonfirmasi', 0, 'none', '', shiftDate(-1)],
            ['RES-2026-003', 'CAT-103', 'Simba', 'USR-CUST-002', 'Anisa Maharani', shiftDate(-2), shiftDate(2),
                'Dikonfirmasi', 1, 'pickup', 'Jl. Manyar Kertoarjo No. 45, Surabaya', shiftDate(-4)]
        ]]
    );

    // 4. Riwayat penitipan (dua kucing sedang dititipkan)
    await conn.query(
        'INSERT INTO `boarding_stays` (`id`,`reservation_id`,`cat_id`,`cat_name`,`owner_id`,`owner_name`,`kennel`,' +
        '`check_in_date`,`planned_check_out_date`,`checked_in_at`,`checked_out_at`,`actual_check_out_date`,`status`,`created_by`) VALUES ?',
        [[
            ['STAY-RES-2026-001', 'RES-2026-001', 'CAT-101', 'Mochi', 'USR-CUST-001', 'Budi Santoso', 'Kandang A-01',
                shiftDate(-3), shiftDate(1), dateTime(-3, 9, 0), null, null, 'Sedang Dititipkan', 'USR-OPS'],
            ['STAY-RES-2026-003', 'RES-2026-003', 'CAT-103', 'Simba', 'USR-CUST-002', 'Anisa Maharani', 'Kandang B-01',
                shiftDate(-2), shiftDate(2), dateTime(-2, 10, 0), null, null, 'Sedang Dititipkan', 'USR-OPS']
        ]]
    );

    // 5. Laporan harian
    await conn.query(
        'INSERT INTO `daily_reports` (`id`,`boarding_stay_id`,`reservation_id`,`cat_id`,`cat_name`,`date`,' +
        '`meal_intake`,`water_intake`,`urination`,`defecation`,`activity_and_mood`,`recorded_by`,`recorded_at`,`updated_at`,`updated_by`) VALUES ?',
        [[
            ['REP-301', 'STAY-RES-2026-001', 'RES-2026-001', 'CAT-101', 'Mochi', shiftDate(-1),
                'Habis 1 porsi wet food + dry food Royal Canin', 'Normal (banyak minum)', 'Lancar (3x)', 'Normal, feses padat (1x)',
                'Mochi sudah mulai aktif bermain dengan mainan bulu, tidak stres dan mendengkur saat dielus.',
                'Siti Rahma (Staf Ops)', dateTime(-1, 16, 30), null, null],
            ['REP-302', 'STAY-RES-2026-003', 'RES-2026-003', 'CAT-103', 'Simba', shiftDate(-1),
                'Sangat lahap, makan 2 porsi', 'Normal', 'Lancar (2x)', 'Normal (1x)',
                'Simba beradaptasi sangat cepat, aktif mengeksplor kandang B-01.',
                'Siti Rahma (Staf Ops)', dateTime(-1, 17, 0), null, null]
        ]]
    );

    // 6. Tugas antar-jemput
    await conn.query(
        'INSERT INTO `pickups` (`id`,`reservation_id`,`cat_id`,`owner_id`,`cat_name`,`owner_name`,`phone`,`type`,' +
        '`address`,`scheduled_time`,`status`,`driver_id`,`driver_name`,`notes`) VALUES ?',
        [[
            ['PCK-401', 'RES-2026-001', 'CAT-101', 'USR-CUST-001', 'Mochi', 'Budi Santoso', '081298765432', 'Penjemputan',
                'Jl. Rungkut Asri No. 12, Surabaya', scheduledTime(-3, 9, 0), 'Selesai', 'USR-DRIVER', 'Doni Pratama',
                'Kucing telah dijemput dan tiba dengan aman di pet hotel.'],
            ['PCK-402', 'RES-2026-003', 'CAT-103', 'USR-CUST-002', 'Simba', 'Anisa Maharani', '081377889900', 'Penjemputan',
                'Jl. Manyar Kertoarjo No. 45, Surabaya', scheduledTime(-2, 10, 0), 'Selesai', 'USR-DRIVER', 'Doni Pratama',
                'Penjemputan tepat waktu.'],
            ['PCK-403', 'RES-2026-001', 'CAT-101', 'USR-CUST-001', 'Mochi', 'Budi Santoso', '081298765432', 'Pengantaran Kembali',
                'Jl. Rungkut Asri No. 12, Surabaya', scheduledTime(1, 15, 0), 'Terjadwal', 'USR-DRIVER', 'Doni Pratama',
                'Diantar saat check-out sore.']
        ]]
    );

    // 7. Konfigurasi pet hotel (satu baris)
    await conn.query(
        'INSERT INTO `settings` (`id`,`hotel_name`,`total_capacity`,`standard_daily_rate`,`pickup_rate_flat`,`address`,`contact_phone`) VALUES ?',
        [[[1, 'OemahPus Pet Hotel Surabaya', 10, 50000, 25000, 'Surabaya, Jawa Timur', '0812-3456-7890']]]
    );
}

async function main() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log(`Terhubung ke MySQL. Menyiapkan database "${DB_NAME}"...`);
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await conn.query(`USE \`${DB_NAME}\``);

        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await conn.query(schemaSql);
        console.log('Skema tabel berhasil dibuat.');

        await seed(conn);
        console.log('Data demo berhasil dimasukkan.');
        console.log('\nAkun demo:');
        console.log('  owner   / owner123  (Pemilik Pet Hotel)');
        console.log('  staf01  / staf123   (Staf Operasional)');
        console.log('  driver01/ driver123 (Staf Antar-Jemput)');
        console.log('  budi@gmail.com  / budi123   (Pelanggan)');
        console.log('  anisa@gmail.com / anisa123  (Pelanggan)');
        console.log('\nSelesai. Jalankan "npm start" untuk menjalankan server.');
    } catch (error) {
        console.error('\nGagal menyiapkan database:', error.message);
        process.exitCode = 1;
    } finally {
        if (conn) await conn.end();
    }
}

main();
