/**
 * OMI - OemahPus Monitoring and Information
 * File: js/storage.js
 * Deskripsi: Pengelola data lokal (LocalStorage) dan seed data demonstrasi awal
 */

const StorageKeys = {
    USERS: 'omi_users_data',
    CATS: 'omi_cats_data',
    RESERVATIONS: 'omi_reservations_data',
    BOARDING_STAYS: 'omi_boarding_stays_data',
    DAILY_REPORTS: 'omi_daily_reports_data',
    PICKUPS: 'omi_pickups_data',
    SETTINGS: 'omi_hotel_settings'
};

const BOARDING_MIGRATION_JOURNAL_KEY = 'omi_boarding_migration_journal';
const BOARDING_MIGRATION_TARGET_KEYS = [
    StorageKeys.BOARDING_STAYS,
    StorageKeys.DAILY_REPORTS,
    StorageKeys.RESERVATIONS
];

const readStoredData = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Gagal membaca ${key} dari LocalStorage:`, e);
        return [];
    }
};

const writeStoredData = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`Gagal menyimpan ${key} ke LocalStorage:`, e);
        return false;
    }
};

const getStoredSession = () => {
    try {
        return JSON.parse(sessionStorage.getItem('omi_active_session') || 'null');
    } catch (e) {
        return null;
    }
};

const StorageService = {
    initializationReady: false,
    initializationError: '',

    /**
     * Inisialisasi data awal (seed data) jika LocalStorage masih kosong
     */
    init() {
        this.initializationReady = false;
        this.initializationError = '';
        try {
            if (!localStorage.getItem(StorageKeys.USERS)) {
                if (!this.seedAllData()) {
                    this.initializationError = 'Data awal OMI tidak dapat disiapkan.';
                    console.error(this.initializationError);
                    return false;
                }
            }
            if (!this.migrateBoardingData()) return false;
            this.initializationReady = true;
            return true;
        } catch (error) {
            console.error('Inisialisasi LocalStorage OMI gagal:', error);
            this.initializationError = 'Penyimpanan browser tidak tersedia atau tidak dapat diakses.';
            return false;
        }
    },

    isReady() {
        return this.initializationReady;
    },

    getInitializationError() {
        return this.initializationError;
    },

    readMigrationArray(key) {
        let raw;
        try {
            raw = localStorage.getItem(key);
        } catch (error) {
            console.error(`Data ${key} tidak dapat dibaca untuk migrasi:`, error);
            return { success: false, message: `Data ${key} tidak dapat dibaca untuk migrasi.` };
        }
        if (raw === null) return { success: true, value: [], missing: true };
        try {
            const value = JSON.parse(raw);
            if (!Array.isArray(value)) {
                return { success: false, message: `Data ${key} bukan daftar yang valid.` };
            }
            return { success: true, value, missing: false };
        } catch (error) {
            console.error(`Data ${key} tidak dapat dibaca untuk migrasi:`, error);
            return { success: false, message: `Data ${key} tidak dapat dibaca untuk migrasi.` };
        }
    },

    failBoardingMigration(message) {
        this.initializationError = message;
        console.error(message);
        return false;
    },

    applyBoardingMigrationJournal(journal) {
        const validJournal = journal && journal.version === 1 &&
            journal.targets && typeof journal.targets === 'object' &&
            !Array.isArray(journal.targets) &&
            Object.keys(journal.targets).every(key =>
                BOARDING_MIGRATION_TARGET_KEYS.includes(key) &&
                Array.isArray(journal.targets[key])
            );
        if (!validJournal) {
            return this.failBoardingMigration(
                'Jurnal migrasi penitipan tidak valid. Data dipertahankan dan aplikasi dinonaktifkan.'
            );
        }

        for (const key of BOARDING_MIGRATION_TARGET_KEYS) {
            if (!Object.prototype.hasOwnProperty.call(journal.targets, key)) continue;
            if (!writeStoredData(key, journal.targets[key])) {
                return this.failBoardingMigration(
                    `Migrasi penitipan tertunda karena data ${key} gagal disimpan. Muat ulang aplikasi untuk mencoba pemulihan.`
                );
            }
        }

        try {
            localStorage.removeItem(BOARDING_MIGRATION_JOURNAL_KEY);
            if (localStorage.getItem(BOARDING_MIGRATION_JOURNAL_KEY) !== null) {
                return this.failBoardingMigration(
                    'Migrasi penitipan tersimpan, tetapi jurnal pemulihan belum dapat dibersihkan. Muat ulang aplikasi untuk mencoba kembali.'
                );
            }
        } catch (error) {
            console.error('Jurnal migrasi penitipan belum dapat dibersihkan:', error);
            return this.failBoardingMigration(
                'Migrasi penitipan tersimpan, tetapi jurnal pemulihan belum dapat dibersihkan. Muat ulang aplikasi untuk mencoba kembali.'
            );
        }
        return true;
    },

    migrateBoardingData() {
        let journalRaw;
        try {
            journalRaw = localStorage.getItem(BOARDING_MIGRATION_JOURNAL_KEY);
        } catch (error) {
            console.error('Jurnal migrasi penitipan tidak dapat dibaca:', error);
            return this.failBoardingMigration('Jurnal migrasi penitipan tidak dapat dibaca.');
        }
        if (journalRaw !== null) {
            let journal;
            try {
                journal = JSON.parse(journalRaw);
            } catch (error) {
                console.error('Jurnal migrasi penitipan tidak valid:', error);
                return this.failBoardingMigration(
                    'Jurnal migrasi penitipan tidak valid. Data dipertahankan dan aplikasi dinonaktifkan.'
                );
            }
            return this.applyBoardingMigrationJournal(journal);
        }

        const staysResult = this.readMigrationArray(StorageKeys.BOARDING_STAYS);
        const reservationsResult = this.readMigrationArray(StorageKeys.RESERVATIONS);
        const reportsResult = this.readMigrationArray(StorageKeys.DAILY_REPORTS);
        for (const result of [staysResult, reservationsResult, reportsResult]) {
            if (!result.success) return this.failBoardingMigration(result.message);
        }

        const stays = staysResult.value;
        const reservations = reservationsResult.value;
        const reports = reportsResult.value;
        let staysChanged = staysResult.missing;
        let reservationsChanged = false;
        let reportsChanged = false;
        const nextStays = [...stays];
        const nextReservations = reservations.map(reservation => ({ ...reservation }));
        const nextReports = reports.map(report => ({ ...report }));

        for (const reservation of nextReservations) {
            if (reservation.status !== 'Sedang Menginap') continue;
            const matchingStays = nextStays.filter(stay => stay.reservationId === reservation.id);
            if (matchingStays.length > 1) {
                return this.failBoardingMigration(
                    `Migrasi dihentikan: lebih dari satu catatan penitipan terkait reservasi ${reservation.id}.`
                );
            }
            let stay = matchingStays[0];
            if (!stay) {
                const stayId = `STAY-${reservation.id}`;
                if (nextStays.some(item => item.id === stayId)) {
                    return this.failBoardingMigration(
                        `Migrasi dihentikan: ID catatan penitipan ${stayId} sudah digunakan.`
                    );
                }
                stay = {
                    id: stayId,
                    reservationId: reservation.id,
                    catId: reservation.catId,
                    catName: reservation.catName,
                    ownerId: reservation.ownerId,
                    ownerName: reservation.ownerName,
                    kennel: reservation.roomNumber || '',
                    checkInDate: reservation.checkInDate,
                    plannedCheckOutDate: reservation.checkOutDate,
                    checkedInAt: null,
                    checkedOutAt: null,
                    actualCheckOutDate: null,
                    status: 'Sedang Dititipkan',
                    legacy: true,
                    legacyReservationStatus: reservation.status
                };
                nextStays.push(stay);
                staysChanged = true;
            } else if (!stay.legacyReservationStatus) {
                stay.legacyReservationStatus = reservation.status;
                staysChanged = true;
            }
            reservation.status = 'Dikonfirmasi';
            reservationsChanged = true;
        }

        const staysByReservationId = new Map();
        for (const stay of nextStays) {
            const relatedStays = staysByReservationId.get(stay.reservationId) || [];
            relatedStays.push(stay);
            staysByReservationId.set(stay.reservationId, relatedStays);
        }
        for (const report of nextReports) {
            if (report.boardingStayId || !report.reservationId) continue;
            const relatedStays = staysByReservationId.get(report.reservationId) || [];
            if (relatedStays.length > 1) {
                return this.failBoardingMigration(
                    `Migrasi dihentikan: laporan ${report.id || '(tanpa ID)'} memiliki lebih dari satu penitipan yang cocok.`
                );
            }
            if (relatedStays.length === 1) {
                report.boardingStayId = relatedStays[0].id;
                reportsChanged = true;
            }
        }

        const targets = {};
        if (staysChanged) targets[StorageKeys.BOARDING_STAYS] = nextStays;
        if (reportsChanged) targets[StorageKeys.DAILY_REPORTS] = nextReports;
        if (reservationsChanged) targets[StorageKeys.RESERVATIONS] = nextReservations;
        if (Object.keys(targets).length === 0) return true;

        const journal = { version: 1, targets };
        if (!writeStoredData(BOARDING_MIGRATION_JOURNAL_KEY, journal)) {
            return this.failBoardingMigration(
                'Jurnal migrasi penitipan gagal disimpan. Data lama tidak diubah.'
            );
        }
        return this.applyBoardingMigrationJournal(journal);
    },

    /**
     * Mengisi data contoh realistis OemahPus untuk demonstrasi lokal
     */
    seedAllData() {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (user && user.role !== 'owner') {
            console.error('Pengisian ulang data demo hanya diizinkan untuk Owner.');
            return false;
        }
        // 1. Akun Pengguna (Tanpa kata sandi - otentikasi demo terpisah)
        const initialUsers = [
            {
                id: 'USR-OWNER',
                name: 'Dr. Hendra (Owner)',
                email: 'owner@oemahpus.com',
                phone: '081234567890',
                role: 'owner',
                createdAt: '2026-10-01'
            },
            {
                id: 'USR-OPS',
                name: 'Siti Rahma',
                email: 'ops@oemahpus.com',
                phone: '081234567891',
                role: 'staff_ops',
                createdAt: '2026-10-01'
            },
            {
                id: 'USR-DRIVER',
                name: 'Doni Pratama',
                email: 'driver@oemahpus.com',
                phone: '081234567892',
                role: 'staff_driver',
                createdAt: '2026-10-01'
            },
            {
                id: 'USR-CUST-001',
                name: 'Budi Santoso',
                email: 'budi@gmail.com',
                phone: '081298765432',
                address: 'Jl. Rungkut Asri No. 12, Surabaya',
                role: 'customer',
                createdAt: '2026-10-10'
            },
            {
                id: 'USR-CUST-002',
                name: 'Anisa Maharani',
                email: 'anisa@gmail.com',
                phone: '081377889900',
                address: 'Jl. Manyar Kertoarjo No. 45, Surabaya',
                role: 'customer',
                createdAt: '2026-10-12'
            }
        ];

        // 2. Data Kucing & Pemeriksaan Awal Kondisi Fisik
        const initialCats = [
            {
                id: 'CAT-101',
                name: 'Mochi',
                breed: 'Persia Medium',
                gender: 'Jantan',
                age: '2 tahun',
                color: 'Putih Abu-abu',
                ownerId: 'USR-CUST-001',
                ownerName: 'Budi Santoso',
                photoUrl: 'assets/images/cat-mochi.svg',
                // Pemeriksaan Awal (Catatan kondisi intake fisik, BUKAN diagnosis medis)
                initialCheck: {
                    weight: 4.2, // kg
                    temperature: 38.6, // °C normal
                    parasites: 'Bebas Kutu & Jamur',
                    vaccinationStatus: 'Lengkap (Feline 4)',
                    notes: 'Kucing ramah dan suka dielus, agak pemalu di hari pertama.'
                }
            },
            {
                id: 'CAT-102',
                name: 'Luna',
                breed: 'British Shorthair',
                gender: 'Betina',
                age: '1.5 tahun',
                color: 'Abu-abu Solid',
                ownerId: 'USR-CUST-001',
                ownerName: 'Budi Santoso',
                photoUrl: 'assets/images/cat-luna.svg',
                initialCheck: {
                    weight: 3.8,
                    temperature: 38.4,
                    parasites: 'Bebas Kutu & Jamur',
                    vaccinationStatus: 'Lengkap',
                    notes: 'Nafsu makan tinggi, aktif bermain bola benang.'
                }
            },
            {
                id: 'CAT-103',
                name: 'Simba',
                breed: 'Domestik / Mix Kampung',
                gender: 'Jantan',
                age: '3 tahun',
                color: 'Oranye Putih',
                ownerId: 'USR-CUST-002',
                ownerName: 'Anisa Maharani',
                photoUrl: 'assets/images/cat-simba.svg',
                initialCheck: {
                    weight: 4.5,
                    temperature: 38.8,
                    parasites: 'Sedikit bekas garukan di telinga (sudah dibersihkan)',
                    vaccinationStatus: 'Lengkap',
                    notes: 'Sangat lincah, butuh porsi makan 3 kali sehari.'
                }
            }
        ];

        // 3. Data Reservasi Penitipan
        const initialReservations = [
            {
                id: 'RES-2026-001',
                catId: 'CAT-101',
                catName: 'Mochi',
                ownerId: 'USR-CUST-001',
                ownerName: 'Budi Santoso',
                checkInDate: '2026-10-22',
                checkOutDate: '2026-10-26',
                needPickup: true,
                pickupType: 'both', // 'pickup', 'delivery', 'both'
                pickupAddress: 'Jl. Rungkut Asri No. 12, Surabaya',
                // Status reservasi: 'Menunggu Konfirmasi', 'Dikonfirmasi', 'Sedang Menginap', 'Selesai', 'Dibatalkan'
                status: 'Sedang Menginap',
                roomNumber: 'Kandang A-01',
                dailyRate: 50000,
                totalDays: 4,
                estimatedCost: 200000,
                pickupCost: 50000,
                paymentStatus: 'DP Terbayar', // 'Belum Bayar', 'DP Terbayar', 'Lunas'
                createdAt: '2026-10-20'
            },
            {
                id: 'RES-2026-002',
                catId: 'CAT-102',
                catName: 'Luna',
                ownerId: 'USR-CUST-001',
                ownerName: 'Budi Santoso',
                checkInDate: '2026-10-24',
                checkOutDate: '2026-10-28',
                needPickup: false,
                pickupType: 'none',
                pickupAddress: '',
                status: 'Dikonfirmasi',
                roomNumber: 'Kandang A-02',
                dailyRate: 50000,
                totalDays: 4,
                estimatedCost: 200000,
                pickupCost: 0,
                paymentStatus: 'Belum Bayar',
                createdAt: '2026-10-21'
            },
            {
                id: 'RES-2026-003',
                catId: 'CAT-103',
                catName: 'Simba',
                ownerId: 'USR-CUST-002',
                ownerName: 'Anisa Maharani',
                checkInDate: '2026-10-23',
                checkOutDate: '2026-10-27',
                needPickup: true,
                pickupType: 'pickup',
                pickupAddress: 'Jl. Manyar Kertoarjo No. 45, Surabaya',
                status: 'Sedang Menginap',
                roomNumber: 'Kandang B-01',
                dailyRate: 50000,
                totalDays: 4,
                estimatedCost: 200000,
                pickupCost: 25000,
                paymentStatus: 'Lunas',
                createdAt: '2026-10-22'
            }
        ];

        // 4. Laporan Harian (Daily Report)
        const initialReports = [
            {
                id: 'REP-301',
                reservationId: 'RES-2026-001',
                catId: 'CAT-101',
                catName: 'Mochi',
                date: '2026-10-23',
                mealIntake: 'Habis 1 porsi wet food + dry food Royal Canin',
                waterIntake: 'Normal (banyak minum)',
                urination: 'Lancar (3x)',
                defecation: 'Normal, feses padat (1x)',
                activityAndMood: 'Mochi sudah mulai aktif bermain dengan mainan bulu, tidak stres dan mendengkur saat dielus.',
                recordedBy: 'Siti Rahma (Staf Ops)',
                recordedAt: '2026-10-23 16:30'
            },
            {
                id: 'REP-302',
                reservationId: 'RES-2026-003',
                catId: 'CAT-103',
                catName: 'Simba',
                date: '2026-10-23',
                mealIntake: 'Sangat lahap, makan 2 porsi',
                waterIntake: 'Normal',
                urination: 'Lancar (2x)',
                defecation: 'Normal (1x)',
                activityAndMood: 'Simba beradaptasi sangat cepat, aktif mengeksplor kandang B-01.',
                recordedBy: 'Siti Rahma (Staf Ops)',
                recordedAt: '2026-10-23 17:00'
            }
        ];

        // 5. Jadwal Layanan Antar Jemput
        const initialPickups = [
            {
                id: 'PCK-401',
                reservationId: 'RES-2026-001',
                catName: 'Mochi',
                ownerName: 'Budi Santoso',
                phone: '081298765432',
                type: 'Penjemputan',
                address: 'Jl. Rungkut Asri No. 12, Surabaya',
                scheduledTime: '2026-10-22 09:00 WIB',
                status: 'Selesai',
                driverName: 'Doni Pratama',
                notes: 'Kucing telah dijemput dan tiba dengan aman di pet hotel.'
            },
            {
                id: 'PCK-402',
                reservationId: 'RES-2026-003',
                catName: 'Simba',
                ownerName: 'Anisa Maharani',
                phone: '081377889900',
                type: 'Penjemputan',
                address: 'Jl. Manyar Kertoarjo No. 45, Surabaya',
                scheduledTime: '2026-10-23 10:00 WIB',
                status: 'Selesai',
                driverName: 'Doni Pratama',
                notes: 'Penjemputan tepat waktu.'
            },
            {
                id: 'PCK-403',
                reservationId: 'RES-2026-001',
                catName: 'Mochi',
                ownerName: 'Budi Santoso',
                phone: '081298765432',
                type: 'Pengantaran Kembali',
                address: 'Jl. Rungkut Asri No. 12, Surabaya',
                scheduledTime: '2026-10-26 15:00 WIB',
                status: 'Terjadwal',
                driverName: 'Doni Pratama',
                notes: 'Diantar saat check-out sore.'
            }
        ];

        // 6. Konfigurasi Pet Hotel
        const initialSettings = {
            hotelName: 'OemahPus Pet Hotel Surabaya',
            totalCapacity: 10, // Kapasitas 10 kandang
            standardDailyRate: 50000,
            pickupRateFlat: 25000,
            address: 'Surabaya, Jawa Timur',
            contactPhone: '0812-3456-7890'
        };

        localStorage.setItem(StorageKeys.USERS, JSON.stringify(initialUsers));
        localStorage.setItem(StorageKeys.CATS, JSON.stringify(initialCats));
        localStorage.setItem(StorageKeys.RESERVATIONS, JSON.stringify(initialReservations));
        localStorage.removeItem(StorageKeys.BOARDING_STAYS);
        localStorage.setItem(StorageKeys.DAILY_REPORTS, JSON.stringify(initialReports));
        localStorage.setItem(StorageKeys.PICKUPS, JSON.stringify(initialPickups));
        localStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(initialSettings));
        return true;
    },

    // Getter generik tetap menerapkan batas data berdasarkan sesi aktif.
    get(key) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        const data = readStoredData(key);

        if (!user) return [];
        if (key === StorageKeys.USERS) {
            return user.role === 'owner' ? data : data.filter(item => item.id === user.id);
        }
        if (key === StorageKeys.CATS) {
            return ['owner', 'staff_ops'].includes(user.role)
                ? data
                : user.role === 'customer'
                    ? data.filter(item => item.ownerId === user.id)
                    : [];
        }
        if (key === StorageKeys.RESERVATIONS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role !== 'customer') return [];
            const catIds = this.getCats().map(cat => cat.id);
            return data.filter(item => catIds.includes(item.catId));
        }
        if (key === StorageKeys.BOARDING_STAYS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role !== 'customer') return [];
            const catIds = this.getCats().map(cat => cat.id);
            return data.filter(item => catIds.includes(item.catId));
        }
        if (key === StorageKeys.DAILY_REPORTS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role !== 'customer') return [];
            const catIds = this.getCats().map(cat => cat.id);
            return data.filter(item => catIds.includes(item.catId));
        }
        if (key === StorageKeys.PICKUPS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role === 'staff_driver') {
                return data.filter(item => item.driverName === user.name);
            }
            if (user.role === 'customer') {
                const reservationIds = this.getReservations().map(item => item.id);
                return data.filter(item => reservationIds.includes(item.reservationId));
            }
            return [];
        }
        if (key === StorageKeys.SETTINGS) {
            return ['owner', 'staff_ops'].includes(user.role) ? data : {};
        }
        return data;
    },

    set(key, value) {
        if (Object.values(StorageKeys).includes(key)) {
            console.error(`Penulisan langsung ke ${key} ditolak; gunakan operasi entitas yang terotorisasi.`);
            return false;
        }
        return writeStoredData(key, value);
    },

    // Helper entitas spesifik
    getUsers() { return this.get(StorageKeys.USERS); },
    getCustomers() {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) return [];
        return readStoredData(StorageKeys.USERS).filter(u => u.role === 'customer');
    },
    getCats() { return this.get(StorageKeys.CATS); },
    getReservations() { return this.get(StorageKeys.RESERVATIONS); },
    getReservationById(reservationId) {
        return this.getReservations().find(reservation => reservation.id === reservationId) || null;
    },
    getBoardingStays() { return this.get(StorageKeys.BOARDING_STAYS); },
    getActiveBoardingStays() {
        return this.getBoardingStays().filter(stay => stay.status === 'Sedang Dititipkan');
    },
    getBoardingStayById(stayId) {
        return this.getBoardingStays().find(stay => stay.id === stayId) || null;
    },
    getBoardingStayByReservationId(reservationId) {
        return this.getBoardingStays().find(stay => stay.reservationId === reservationId) || null;
    },
    getDailyReports() { return this.get(StorageKeys.DAILY_REPORTS); },
    getDailyReportById(reportId) {
        return this.getDailyReports().find(report => report.id === reportId) || null;
    },
    isValidIsoDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day;
    },
    getLocalDateString(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');
    },
    getNextLocalDateString(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return this.getLocalDateString(new Date(year, month - 1, day + 1));
    },
    generateUniqueRecordId(prefix, records) {
        const existingIds = new Set(records.map(record => record.id));
        let id;
        let attempts = 0;
        do {
            id = attempts < 20
                ? Utils.generateId(prefix)
                : `${prefix}-${Date.now()}-${attempts}`;
            attempts++;
        } while (existingIds.has(id));
        return id;
    },
    getReservationCapacityOccupancies() {
        const today = this.getLocalDateString(new Date());
        const staysByReservationId = new Map(
            readStoredData(StorageKeys.BOARDING_STAYS).map(stay => [stay.reservationId, stay])
        );
        return readStoredData(StorageKeys.RESERVATIONS)
            .filter(reservation => {
                const stay = staysByReservationId.get(reservation.id);
                if (stay) return ['Sedang Dititipkan', 'Selesai'].includes(stay.status);
                return !['Dibatalkan', 'Selesai'].includes(reservation.status);
            })
            .map(reservation => {
                const stay = staysByReservationId.get(reservation.id);
                if (!stay) {
                    return {
                        ...reservation,
                        occupancyStart: reservation.checkInDate,
                        occupancyEnd: reservation.checkOutDate
                    };
                }
                const occupancyStart = stay.checkInDate ||
                    (stay.checkedInAt ? this.getLocalDateString(new Date(stay.checkedInAt)) : reservation.checkInDate);
                const active = stay.status === 'Sedang Dititipkan';
                const plannedEnd = stay.plannedCheckOutDate || reservation.checkOutDate;
                const occupancyEnd = active
                    ? (plannedEnd > today ? plannedEnd : null)
                    : (stay.actualCheckOutDate || reservation.checkOutDate);
                return { ...reservation, occupancyStart, occupancyEnd };
            });
    },
    checkInReservation(request = {}) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin melakukan check-in.' };
        }
        if (!request || typeof request !== 'object') {
            return { success: false, message: 'Data check-in tidak valid.' };
        }
        const { reservationId, kennel } = request;

        const reservation = readStoredData(StorageKeys.RESERVATIONS)
            .find(item => item.id === reservationId);
        if (!reservation || reservation.status !== 'Dikonfirmasi') {
            return { success: false, message: 'Check-in hanya dapat dilakukan untuk reservasi yang telah dikonfirmasi.' };
        }
        if (this.getBoardingStayByReservationId(reservation.id)) {
            return { success: false, message: 'Reservasi ini sudah memiliki riwayat penitipan dan tidak dapat check-in ulang.' };
        }

        const today = this.getLocalDateString(new Date());
        if (!this.isValidIsoDate(reservation.checkInDate) ||
            !this.isValidIsoDate(reservation.checkOutDate) ||
            today < reservation.checkInDate || today >= reservation.checkOutDate) {
            return { success: false, message: 'Check-in hanya dapat dilakukan dalam periode reservasi yang valid.' };
        }
        const cat = readStoredData(StorageKeys.CATS).find(item =>
            item.id === reservation.catId && item.ownerId === reservation.ownerId
        );
        if (!cat) {
            return { success: false, message: 'Data kucing atau pemilik pada reservasi tidak valid.' };
        }

        const cleanKennel = typeof kennel === 'string' ? kennel.trim() : '';
        if (!this.isValidKennelIdentifier(cleanKennel)) {
            return {
                success: false,
                message: 'Identitas kandang wajib diawali huruf/angka dan hanya boleh berisi huruf, angka, spasi, titik, garis bawah, atau tanda hubung (maksimal 60 karakter).'
            };
        }
        const activeStays = readStoredData(StorageKeys.BOARDING_STAYS)
            .filter(stay => stay.status === 'Sedang Dititipkan');
        if (activeStays.some(stay =>
            typeof stay.kennel === 'string' && stay.kennel.trim().toLowerCase() === cleanKennel.toLowerCase()
        )) {
            return { success: false, message: 'Kandang tersebut sedang digunakan kucing lain.' };
        }

        const availability = this.checkReservationAvailability({
            catId: cat.id,
            checkInDate: today,
            checkOutDate: this.getNextLocalDateString(today),
            reservationId: reservation.id
        });
        if (!availability.available) return { success: false, message: availability.message };

        const stays = readStoredData(StorageKeys.BOARDING_STAYS);
        const stay = {
            id: this.generateUniqueRecordId('STAY', stays),
            reservationId: reservation.id,
            catId: cat.id,
            catName: cat.name,
            ownerId: cat.ownerId,
            ownerName: reservation.ownerName,
            kennel: cleanKennel,
            checkInDate: today,
            plannedCheckOutDate: reservation.checkOutDate,
            checkedInAt: new Date().toISOString(),
            checkedOutAt: null,
            actualCheckOutDate: null,
            status: 'Sedang Dititipkan',
            createdBy: user.id
        };
        stays.push(stay);
        if (!writeStoredData(StorageKeys.BOARDING_STAYS, stays)) {
            return { success: false, message: 'Gagal menyimpan check-in. Periksa ruang penyimpanan browser.' };
        }
        return { success: true, stay };
    },
    isValidKennelIdentifier(value) {
        return typeof value === 'string' &&
            value.length >= 1 &&
            value.length <= 60 &&
            /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(value);
    },
    checkOutBoardingStay(stayId) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin melakukan check-out.' };
        }
        const stays = readStoredData(StorageKeys.BOARDING_STAYS);
        const index = stays.findIndex(stay => stay.id === stayId);
        if (index < 0 || stays[index].status !== 'Sedang Dititipkan') {
            return { success: false, message: 'Hanya kucing yang sedang dititipkan dapat menjalani check-out.' };
        }
        const checkedOutAt = new Date();
        stays[index] = {
            ...stays[index],
            status: 'Selesai',
            checkedOutAt: checkedOutAt.toISOString(),
            actualCheckOutDate: this.getLocalDateString(checkedOutAt)
        };
        if (!writeStoredData(StorageKeys.BOARDING_STAYS, stays)) {
            return { success: false, message: 'Gagal menyimpan check-out. Periksa ruang penyimpanan browser.' };
        }
        return { success: true, stay: stays[index] };
    },
    saveDailyReport(reportData = {}) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin menyimpan laporan harian.' };
        }
        if (!reportData || typeof reportData !== 'object') {
            return { success: false, message: 'Data laporan harian tidak valid.' };
        }
        const stay = this.getBoardingStayById(reportData.boardingStayId);
        if (!stay || stay.status !== 'Sedang Dititipkan') {
            return { success: false, message: 'Laporan hanya dapat dibuat atau diperbarui untuk kucing yang sedang dititipkan.' };
        }
        const reservation = readStoredData(StorageKeys.RESERVATIONS)
            .find(item => item.id === stay.reservationId);
        const cat = readStoredData(StorageKeys.CATS).find(item =>
            item.id === stay.catId && item.ownerId === stay.ownerId
        );
        if (!reservation || !cat || reservation.catId !== stay.catId) {
            return { success: false, message: 'Data penitipan, reservasi, atau kucing tidak valid.' };
        }
        if (!this.isValidIsoDate(reportData.date)) {
            return { success: false, message: 'Tanggal laporan tidak valid.' };
        }
        const today = this.getLocalDateString(new Date());
        const checkInDate = stay.checkInDate ||
            (stay.checkedInAt ? this.getLocalDateString(new Date(stay.checkedInAt)) : reservation.checkInDate);
        if (reportData.date < checkInDate || reportData.date > today) {
            return { success: false, message: 'Tanggal laporan harus berada pada masa penitipan yang sudah berjalan.' };
        }

        const fields = ['mealIntake', 'waterIntake', 'urination', 'defecation', 'activityAndMood'];
        const values = {};
        for (const field of fields) {
            const value = typeof reportData[field] === 'string' ? reportData[field].trim() : '';
            if (!value) return { success: false, message: 'Semua catatan kondisi harian wajib diisi.' };
            if (value.length > 500) return { success: false, message: 'Setiap catatan maksimal 500 karakter.' };
            values[field] = value;
        }

        const reports = readStoredData(StorageKeys.DAILY_REPORTS);
        const index = reportData.id ? reports.findIndex(report => report.id === reportData.id) : -1;
        const existing = index >= 0 ? reports[index] : null;
        if (reportData.id && !existing) return { success: false, message: 'Laporan harian tidak ditemukan.' };
        if (existing && (existing.boardingStayId !== stay.id ||
            existing.catId !== stay.catId || existing.reservationId !== stay.reservationId)) {
            return { success: false, message: 'Laporan tidak terhubung dengan penitipan ini.' };
        }
        if (reports.some(report =>
            report.id !== reportData.id && report.catId === stay.catId && report.date === reportData.date
        )) {
            return { success: false, message: 'Laporan untuk kucing ini pada tanggal tersebut sudah ada. Gunakan fitur edit.' };
        }

        const report = {
            ...(existing || {}),
            ...values,
            id: existing ? existing.id : this.generateUniqueRecordId('REP', reports),
            boardingStayId: stay.id,
            reservationId: stay.reservationId,
            catId: stay.catId,
            catName: stay.catName,
            date: reportData.date,
            recordedBy: existing ? existing.recordedBy : user.name,
            recordedAt: existing ? existing.recordedAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: user.id
        };
        if (existing) reports[index] = report;
        else reports.push(report);
        if (!writeStoredData(StorageKeys.DAILY_REPORTS, reports)) {
            return { success: false, message: 'Gagal menyimpan laporan harian. Periksa ruang penyimpanan browser.' };
        }
        return { success: true, report, isNew: !existing };
    },
    checkReservationAvailability(request = {}) {
        const { catId, checkInDate, checkOutDate, reservationId = null } = request;
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            return { available: false, message: 'Anda tidak memiliki izin memeriksa ketersediaan.' };
        }

        if (!this.isValidIsoDate(checkInDate) || !this.isValidIsoDate(checkOutDate)) {
            return { available: false, message: 'Tanggal check-in dan check-out harus valid.' };
        }
        if (checkOutDate <= checkInDate) {
            return { available: false, message: 'Tanggal check-out harus setelah tanggal check-in.' };
        }

        const today = new Date();
        const todayDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0')
        ].join('-');
        if (checkInDate < todayDate) {
            return { available: false, message: 'Tanggal check-in tidak boleh sebelum hari ini.' };
        }

        const cat = readStoredData(StorageKeys.CATS).find(item => item.id === catId);
        if (!cat || (user.role === 'customer' && cat.ownerId !== user.id)) {
            return { available: false, message: 'Kucing tidak ditemukan atau bukan milik Anda.' };
        }

        const settings = readStoredData(StorageKeys.SETTINGS);
        const capacity = Number(settings && settings.totalCapacity);
        if (!Number.isInteger(capacity) || capacity < 1) {
            return { available: false, message: 'Kapasitas kandang belum dikonfigurasi dengan benar.' };
        }

        const reservations = this.getReservationCapacityOccupancies().filter(reservation =>
            reservation.id !== reservationId && reservation.occupancyStart
        );
        const sameCatConflict = reservations.find(reservation =>
            reservation.catId === catId &&
            reservation.occupancyStart < checkOutDate &&
            (reservation.occupancyEnd === null || checkInDate < reservation.occupancyEnd)
        );
        if (sameCatConflict) {
            return {
                available: false,
                message: `Kucing ini sudah memiliki reservasi pada periode tersebut (${sameCatConflict.id}).`
            };
        }

        for (let day = checkInDate; day < checkOutDate; ) {
            const occupied = reservations.filter(reservation =>
                reservation.occupancyStart <= day &&
                (reservation.occupancyEnd === null || day < reservation.occupancyEnd)
            ).length;
            if (occupied >= capacity) {
                return {
                    available: false,
                    message: `Kapasitas kandang penuh pada ${day} (${occupied}/${capacity}).`
                };
            }
            day = this.getNextLocalDateString(day);
        }

        return { available: true, message: 'Kapasitas tersedia.', capacity };
    },
    saveReservation(reservationData) {
        if (!reservationData || typeof reservationData !== 'object') {
            return { success: false, message: 'Data reservasi tidak valid.' };
        }
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin menyimpan reservasi.' };
        }

        const reservations = readStoredData(StorageKeys.RESERVATIONS);
        const index = reservationData.id
            ? reservations.findIndex(reservation => reservation.id === reservationData.id)
            : -1;
        const existingReservation = index >= 0 ? reservations[index] : null;
        if (reservationData.id && !existingReservation) {
            return { success: false, message: 'Reservasi tidak ditemukan.' };
        }
        if (user.role === 'customer' && existingReservation) {
            return { success: false, message: 'Pemilik kucing hanya dapat membuat dan melihat reservasi.' };
        }
        if (existingReservation && user.role !== 'owner') {
            return { success: false, message: 'Hanya Owner yang dapat mengedit reservasi.' };
        }
        if (existingReservation && !['Menunggu Konfirmasi', 'Dikonfirmasi'].includes(existingReservation.status)) {
            return { success: false, message: 'Reservasi ini sudah tidak dapat diedit.' };
        }
        if (existingReservation && reservationData.catId !== existingReservation.catId) {
            return { success: false, message: 'Kucing pada reservasi tidak dapat diganti.' };
        }
        if (existingReservation && readStoredData(StorageKeys.BOARDING_STAYS)
            .some(stay => stay.reservationId === existingReservation.id)) {
            return { success: false, message: 'Reservasi yang sudah memiliki riwayat penitipan tidak dapat diedit.' };
        }

        const cat = readStoredData(StorageKeys.CATS).find(item => item.id === reservationData.catId);
        if (!cat || (user.role === 'customer' && cat.ownerId !== user.id)) {
            return { success: false, message: 'Pilih kucing milik akun Anda.' };
        }

        const availability = this.checkReservationAvailability({
            catId: cat.id,
            checkInDate: reservationData.checkInDate,
            checkOutDate: reservationData.checkOutDate,
            reservationId: existingReservation ? existingReservation.id : null
        });
        if (!availability.available) {
            return { success: false, message: availability.message };
        }

        let reservationId = existingReservation && existingReservation.id;
        if (!reservationId) {
            const ids = new Set(reservations.map(reservation => reservation.id));
            let attempts = 0;
            do {
                reservationId = attempts < 20
                    ? Utils.generateId('RES')
                    : `RES-${Date.now()}-${attempts}`;
                attempts++;
            } while (ids.has(reservationId));
        }

        const owner = readStoredData(StorageKeys.USERS).find(item => item.id === cat.ownerId);
        const reservation = {
            ...(existingReservation || {}),
            id: reservationId,
            catId: cat.id,
            catName: cat.name,
            ownerId: cat.ownerId,
            ownerName: owner ? owner.name : cat.ownerName,
            checkInDate: reservationData.checkInDate,
            checkOutDate: reservationData.checkOutDate,
            needPickup: existingReservation ? existingReservation.needPickup : false,
            pickupType: existingReservation ? existingReservation.pickupType : 'none',
            pickupAddress: existingReservation ? existingReservation.pickupAddress : '',
            status: existingReservation ? existingReservation.status : 'Menunggu Konfirmasi',
            createdAt: existingReservation ? existingReservation.createdAt : new Date().toISOString().split('T')[0]
        };
        if (existingReservation) reservations[index] = reservation;
        else reservations.push(reservation);
        if (!writeStoredData(StorageKeys.RESERVATIONS, reservations)) {
            return { success: false, message: 'Gagal menyimpan reservasi. Periksa ruang penyimpanan browser.' };
        }
        return { success: true, reservation, isNew: !existingReservation };
    },
    getPickups() { return this.get(StorageKeys.PICKUPS); },
    getSettings() {
        const settings = this.get(StorageKeys.SETTINGS);
        return settings && !Array.isArray(settings) ? settings : { totalCapacity: 10 };
    },
    getReservationCapacity() {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) return null;
        const settings = readStoredData(StorageKeys.SETTINGS);
        const capacity = Number(settings && settings.totalCapacity);
        return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
    },

    findUserByEmail(email) {
        if (getStoredSession()) return null;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        return readStoredData(StorageKeys.USERS).find(user =>
            String(user.email || '').toLowerCase() === normalizedEmail
        ) || null;
    },

    findDemoUser(role) {
        if (getStoredSession()) return null;
        return readStoredData(StorageKeys.USERS).find(user => user.role === role) || null;
    },

    findUserById(userId) {
        const session = getStoredSession();
        if (!session || (userId !== session.id && session.role !== 'owner')) return null;
        return readStoredData(StorageKeys.USERS).find(user => user.id === userId) || null;
    },

    emailExists(email) {
        return this.findUserByEmail(email) !== null;
    },

    createCustomer(customer) {
        if (typeof AuthService !== 'undefined' && AuthService.getCurrentUser()) {
            return { success: false, message: 'Keluar dari sesi aktif sebelum membuat akun baru.' };
        }
        if (!customer || customer.role !== 'customer' || !customer.name || !customer.email || !customer.phone) {
            return { success: false, message: 'Data akun customer tidak lengkap atau tidak valid.' };
        }
        if (this.emailExists(customer.email)) {
            return { success: false, message: 'Email sudah terdaftar.' };
        }

        const users = readStoredData(StorageKeys.USERS);
        users.push(customer);
        if (!writeStoredData(StorageKeys.USERS, users)) {
            return { success: false, message: 'Gagal menyimpan akun. Periksa ruang penyimpanan browser.' };
        }
        return { success: true, customer };
    },

    /**
     * Mengambil data kucing berdasarkan ID
     */
    getCatById(catId) {
        const cats = this.getCats();
        return cats.find(c => c.id === catId) || null;
    },

    /**
     * Menyimpan data kucing baru atau memperbarui data kucing yang ada
     */
    saveCat(catData) {
        if (!catData || typeof catData !== 'object') {
            return { success: false, message: 'Data kucing tidak valid.' };
        }
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin mengelola data kucing.' };
        }

        const cats = readStoredData(StorageKeys.CATS);
        const index = catData.id ? cats.findIndex(cat => cat.id === catData.id) : -1;
        const existingCat = index >= 0 ? cats[index] : null;
        if (catData.id && !existingCat) {
            return { success: false, message: 'Data kucing tidak ditemukan.' };
        }
        if (user.role === 'customer' && existingCat && existingCat.ownerId !== user.id) {
            return { success: false, message: 'Anda tidak berhak mengubah data kucing ini.' };
        }

        const isNew = !existingCat;
        let ownerId;
        let ownerName;
        if (user.role === 'customer') {
            ownerId = user.id;
            ownerName = user.name;
        } else {
            ownerId = catData.ownerId || (existingCat && existingCat.ownerId);
            const owner = readStoredData(StorageKeys.USERS).find(item =>
                item.id === ownerId && item.role === 'customer'
            );
            if (!owner) {
                return { success: false, message: 'Pilih pemilik kucing yang terdaftar.' };
            }
            ownerName = owner.name;
        }

        const cat = {
            ...(existingCat || {}),
            id: existingCat ? existingCat.id : Utils.generateId('CAT'),
            name: String(catData.name || '').trim(),
            breed: String(catData.breed || '').trim(),
            gender: catData.gender || (existingCat && existingCat.gender) || 'Jantan',
            age: String(catData.age || '').trim(),
            color: String(catData.color || '').trim(),
            ownerId,
            ownerName,
            photoUrl: existingCat ? existingCat.photoUrl || '' : catData.photoUrl || '',
            createdAt: existingCat ? existingCat.createdAt : new Date().toISOString().split('T')[0]
        };

        if (!cat.name || !cat.breed || !cat.age || !cat.color) {
            return { success: false, message: 'Lengkapi seluruh data identitas kucing.' };
        }

        if (user.role === 'customer') {
            cat.initialCheck = existingCat ? existingCat.initialCheck : {
                weight: 0,
                temperature: 0,
                parasites: 'Belum Dicatat',
                vaccinationStatus: 'Belum Dicatat',
                notes: ''
            };
        } else {
            const initialCheck = catData.initialCheck || {
                weight: catData.weight,
                temperature: catData.temperature,
                parasites: catData.parasites,
                vaccinationStatus: catData.vaccinationStatus,
                notes: catData.notes
            };
            const weight = Number(initialCheck.weight);
            const temperature = Number(initialCheck.temperature);
            if (!Number.isFinite(weight) || weight < 0.5 || weight > 25) {
                return { success: false, message: 'Berat badan harus berada pada rentang 0.5–25 kg.' };
            }
            if (!Number.isInteger(weight * 10)) {
                return { success: false, message: 'Berat badan harus menggunakan kelipatan 0.1 kg.' };
            }
            if (!Number.isFinite(temperature) || temperature < 35 || temperature > 42.5) {
                return { success: false, message: 'Suhu harus berada pada rentang 35–42.5 °C.' };
            }
            if (!Number.isInteger(temperature * 10)) {
                return { success: false, message: 'Suhu harus menggunakan kelipatan 0.1 °C.' };
            }
            if (!String(initialCheck.parasites || '').trim()) {
                return { success: false, message: 'Kondisi kulit dan parasit wajib dicatat.' };
            }
            cat.initialCheck = {
                weight,
                temperature,
                parasites: String(initialCheck.parasites).trim(),
                vaccinationStatus: String(initialCheck.vaccinationStatus || 'Belum Dicatat').trim(),
                notes: String(initialCheck.notes || '').trim()
            };
        }

        if (isNew) cats.push(cat);
        else cats[index] = cat;
        if (!writeStoredData(StorageKeys.CATS, cats)) {
            return { success: false, message: 'Gagal menyimpan data kucing. Periksa ruang penyimpanan browser.' };
        }
        return { success: true, cat, isNew };
    },

    /**
     * Menghapus kucing dari data
     */
    deleteCat(catId) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin menghapus data kucing.' };
        }
        const cats = readStoredData(StorageKeys.CATS);
        const cat = cats.find(item => item.id === catId);
        if (!cat || (user.role === 'customer' && cat.ownerId !== user.id)) {
            return { success: false, message: 'Data kucing tidak ditemukan atau bukan milik Anda.' };
        }
        const hasReservationHistory = readStoredData(StorageKeys.RESERVATIONS)
            .some(reservation => reservation.catId === catId);
        const hasBoardingHistory = readStoredData(StorageKeys.BOARDING_STAYS)
            .some(stay => stay.catId === catId);
        const hasReportHistory = readStoredData(StorageKeys.DAILY_REPORTS)
            .some(report => report.catId === catId);
        if (hasReservationHistory || hasBoardingHistory || hasReportHistory) {
            return {
                success: false,
                message: 'Data kucing tidak dapat dihapus karena memiliki reservasi, riwayat penitipan, atau laporan. Riwayat tersebut perlu dipertahankan.'
            };
        }
        const filtered = cats.filter(c => c.id !== catId);
        if (filtered.length !== cats.length) {
            if (!writeStoredData(StorageKeys.CATS, filtered)) {
                return { success: false, message: 'Data kucing gagal dihapus. Periksa ruang penyimpanan browser.' };
            }
            return { success: true };
        }
        return { success: false, message: 'Data kucing tidak ditemukan.' };
    },

    /**
     * Memperbarui status tugas antar-jemput
     */
    updatePickupStatus(pickupId, newStatus) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'staff_driver' || newStatus !== 'Selesai') return false;
        const pickups = readStoredData(StorageKeys.PICKUPS);
        const index = pickups.findIndex(p => p.id === pickupId);
        if (index !== -1 && pickups[index].driverName === user.name) {
            pickups[index].status = newStatus;
            return writeStoredData(StorageKeys.PICKUPS, pickups);
        }
        return false;
    },

    /**
     * Memperbarui status reservasi
     */
    updateReservationStatus(reservationId, newStatus) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'owner' || !['Dikonfirmasi', 'Dibatalkan'].includes(newStatus)) return false;
        const reservations = readStoredData(StorageKeys.RESERVATIONS);
        const index = reservations.findIndex(r => r.id === reservationId);
        const hasBoardingStay = readStoredData(StorageKeys.BOARDING_STAYS)
            .some(stay => stay.reservationId === reservationId);
        const validTransition = index !== -1 &&
            !hasBoardingStay &&
            ((reservations[index].status === 'Menunggu Konfirmasi' && ['Dikonfirmasi', 'Dibatalkan'].includes(newStatus)) ||
                (reservations[index].status === 'Dikonfirmasi' && newStatus === 'Dibatalkan'));
        if (validTransition) {
            reservations[index].status = newStatus;
            return writeStoredData(StorageKeys.RESERVATIONS, reservations);
        }
        return false;
    },

    /**
     * Mengambil feed log aktivitas terkini dari seluruh operasional pet hotel
     */
    getRecentActivities() {
        const activities = [];
        const reservations = this.getReservations();
        const boardingStays = this.getActiveBoardingStays();
        const reports = this.getDailyReports();
        const pickups = this.getPickups();

        // 1. Aktivitas Reservasi
        reservations.forEach(r => {
            if (r.status === 'Menunggu Konfirmasi') {
                activities.push({
                    icon: '⏳',
                    title: `Pengajuan Reservasi: ${r.catName}`,
                    desc: `Reservasi baru menunggu konfirmasi untuk ${r.checkInDate} s/d ${r.checkOutDate}.`,
                    time: r.createdAt || r.checkInDate,
                    sortDate: new Date(r.createdAt || r.checkInDate).getTime()
                });
            } else if (r.status === 'Dikonfirmasi') {
                activities.push({
                    icon: '✅',
                    title: `Reservasi Dikonfirmasi: ${r.catName}`,
                    desc: `Dijadwalkan check-in pada ${r.checkInDate}.`,
                    time: r.createdAt || r.checkInDate,
                    sortDate: new Date(r.createdAt || r.checkInDate).getTime()
                });
            }
        });

        boardingStays.forEach(stay => {
            activities.push({
                icon: '🏨',
                title: `Kucing Menginap: ${stay.catName}`,
                desc: `Telah check-in di ${stay.kennel || 'Kandang'} atas nama ${stay.ownerName}.`,
                time: stay.checkedInAt || stay.checkInDate,
                sortDate: new Date(stay.checkedInAt || stay.checkInDate).getTime()
            });
        });

        // 2. Aktivitas Laporan Harian
        reports.forEach(rep => {
            activities.push({
                icon: '📝',
                title: `Daily Report: ${rep.catName}`,
                desc: `${rep.recordedBy}: Pakan & minum normal, kondisi aktif.`,
                time: rep.recordedAt || rep.date,
                sortDate: new Date(rep.recordedAt || rep.date).getTime()
            });
        });

        // 3. Aktivitas Antar-Jemput
        pickups.forEach(p => {
            activities.push({
                icon: '🚗',
                title: `Layanan ${p.type}: ${p.catName}`,
                desc: `Driver: ${p.driverName} — Status: ${p.status} (${p.address}).`,
                time: p.scheduledTime,
                sortDate: new Date().getTime() - 3600000 // perkiraan waktu
            });
        });

        // Urutkan dari yang paling baru
        return activities.slice(0, 5);
    },

    /**
     * Reset data kembali ke kondisi default (berguna untuk demo/testing)
     */
    resetData() {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'owner') {
            console.error('Reset data hanya diizinkan untuk Owner.');
            return false;
        }
        this.initializationReady = false;
        this.initializationError = '';
        Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
        localStorage.removeItem(BOARDING_MIGRATION_JOURNAL_KEY);
        const seeded = this.seedAllData();
        if (!seeded || !this.migrateBoardingData()) return false;
        this.initializationReady = true;
        return true;
    }
};

// Pastikan inisialisasi dijalankan saat file dimuat
StorageService.init();
