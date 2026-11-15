/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/db.js
 * Deskripsi: Koneksi pool MySQL (mysql2/promise) berdasarkan konfigurasi .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'omidb_html',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Tanggal dikembalikan sebagai teks ('YYYY-MM-DD' / 'YYYY-MM-DD HH:MM:SS')
    // agar cocok dengan format yang dipakai frontend.
    dateStrings: true
});

module.exports = pool;
