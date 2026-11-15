/**
 * OMI - OemahPus Monitoring and Information
 * File: server/src/config.js
 * Deskripsi: Memuat variabel .env sekali dan menyediakan konfigurasi bersama.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
    port: Number(process.env.PORT) || 3000,
    jwtSecret: process.env.JWT_SECRET || 'omi-dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h'
};
