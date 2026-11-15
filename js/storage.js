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
    BILLING_BILLS: 'omi_billing_bills_data',
    BILLING_TRANSACTIONS: 'omi_billing_transactions_data',
    PICKUPS: 'omi_pickups_data',
    SETTINGS: 'omi_hotel_settings'
};

const INITIAL_DATA_REQUIRED_KEYS = [
    StorageKeys.USERS,
    StorageKeys.CATS,
    StorageKeys.RESERVATIONS,
    StorageKeys.DAILY_REPORTS,
    StorageKeys.PICKUPS,
    StorageKeys.SETTINGS
];

const BOARDING_MIGRATION_JOURNAL_KEY = 'omi_boarding_migration_journal';
const BOARDING_MIGRATION_TARGET_KEYS = [
    StorageKeys.BOARDING_STAYS,
    StorageKeys.DAILY_REPORTS,
    StorageKeys.RESERVATIONS
];

const LEGACY_PICKUP_FIELDS = [
    'id',
    'reservationId',
    'catName',
    'ownerName',
    'phone',
    'type',
    'address',
    'scheduledTime',
    'status',
    'driverName',
    'notes'
];
const LEGACY_PICKUP_IDS = new Set(['PCK-401', 'PCK-402', 'PCK-403']);

class StoredDataReadError extends Error {
    constructor(key, cause) {
        super(`Data ${key} tidak dapat dibaca dari LocalStorage.`);
        this.name = 'StoredDataReadError';
        this.key = key;
        this.cause = cause;
    }
}

const throwStoredDataReadError = (key, cause) => {
    console.error(`Gagal membaca ${key} dari LocalStorage:`, cause);
    const readError = new StoredDataReadError(key, cause);
    if (typeof Utils !== 'undefined') Utils.showToast(readError.message, 'error');
    throw readError;
};

const readStoredData = (key) => {
    let data;
    try {
        data = localStorage.getItem(key);
    } catch (error) {
        throwStoredDataReadError(key, error);
    }
    if (data === null) {
        if (!INITIAL_DATA_REQUIRED_KEYS.includes(key)) return [];
        throwStoredDataReadError(key, new Error('Key wajib tidak tersedia.'));
    }
    try {
        return JSON.parse(data);
    } catch (error) {
        throwStoredDataReadError(key, error);
    }
};

const readStoredCollection = (key) => {
    try {
        const data = localStorage.getItem(key);
        if (data === null) return { success: true, value: [] };
        const value = JSON.parse(data);
        if (!Array.isArray(value)) {
            return { success: false, message: `Data ${key} bukan daftar yang valid.` };
        }
        return { success: true, value };
    } catch (error) {
        console.error(`Gagal membaca ${key} dari LocalStorage:`, error);
        return { success: false, message: `Data ${key} tidak dapat dibaca.` };
    }
};

const isStoredRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const readRequiredStoredCollection = key => {
    let raw;
    try {
        raw = localStorage.getItem(key);
    } catch (error) {
        console.error(`Gagal membaca ${key} dari LocalStorage:`, error);
        return { success: false, message: `Data ${key} tidak dapat dibaca.` };
    }
    if (raw === null) {
        return { success: false, message: `Data ${key} tidak tersedia.` };
    }
    try {
        const value = JSON.parse(raw);
        if (!Array.isArray(value) || !value.every(isStoredRecord)) {
            return { success: false, message: `Struktur data ${key} tidak valid.` };
        }
        return { success: true, value };
    } catch (error) {
        console.error(`Gagal membaca ${key} dari LocalStorage:`, error);
        return { success: false, message: `Data ${key} tidak dapat dibaca.` };
    }
};

const RESERVATION_PICKUP_TYPES = ['none', 'pickup', 'delivery', 'both'];
const RESERVATION_PICKUP_FIELDS = ['pickupType', 'needPickup', 'pickupAddress'];
const inspectReservationPickupConfiguration = reservation => {
    const presentFields = RESERVATION_PICKUP_FIELDS.filter(field =>
        Object.prototype.hasOwnProperty.call(reservation, field)
    );
    if (presentFields.length === 0) {
        return { state: 'unconfigured', message: 'Data lama belum memiliki konfigurasi layanan antar-jemput.' };
    }
    if (presentFields.length !== RESERVATION_PICKUP_FIELDS.length) {
        return { state: 'invalid', message: 'Data layanan antar-jemput lama tidak lengkap.' };
    }
    const { pickupType, needPickup, pickupAddress } = reservation;
    if (!RESERVATION_PICKUP_TYPES.includes(pickupType) ||
        typeof needPickup !== 'boolean' ||
        needPickup !== (pickupType !== 'none') ||
        typeof pickupAddress !== 'string' ||
        pickupAddress.length > 500 ||
        (pickupType === 'none' ? pickupAddress.trim() !== '' : !pickupAddress.trim())) {
        return { state: 'invalid', message: 'Data layanan antar-jemput lama tidak konsisten atau tidak valid.' };
    }
    return {
        state: 'valid',
        pickupType,
        needPickup,
        pickupAddress
    };
};

const isLegacyPickupRecord = pickup =>
    isStoredRecord(pickup) &&
    LEGACY_PICKUP_IDS.has(pickup.id) &&
    !Object.prototype.hasOwnProperty.call(pickup, 'driverId') &&
    Object.keys(pickup).length === LEGACY_PICKUP_FIELDS.length &&
    LEGACY_PICKUP_FIELDS.every(field => Object.prototype.hasOwnProperty.call(pickup, field)) &&
    typeof pickup.driverName === 'string' &&
    pickup.driverName.length > 0;

const readStoredDriverUsers = () => {
    const usersResult = readStoredCollection(StorageKeys.USERS);
    if (!usersResult.success || !usersResult.value.every(isStoredRecord)) {
        return {
            success: false,
            message: usersResult.message || 'Struktur data pengguna tidak valid.'
        };
    }
    return {
        success: true,
        value: usersResult.value.filter(user =>
            user.role === 'staff_driver' && typeof user.id === 'string' && user.id.length > 0
        )
    };
};

const isPickupAssignedToDriver = (pickup, user, drivers) => {
    if (Object.prototype.hasOwnProperty.call(pickup, 'driverId')) {
        return typeof pickup.driverId === 'string' && pickup.driverId === user.id;
    }
    if (!isLegacyPickupRecord(pickup)) return false;
    const matchingDrivers = drivers.filter(driver => driver.name === pickup.driverName);
    return matchingDrivers.length === 1 && matchingDrivers[0].id === user.id;
};

const PICKUP_SERVICE_TYPES = {
    pickup: ['Penjemputan'],
    delivery: ['Pengantaran Kembali'],
    both: ['Penjemputan', 'Pengantaran Kembali']
};
const PICKUP_SCHEDULABLE_RESERVATION_STATUSES = ['Dikonfirmasi', 'Sedang Menginap'];

const normalizePickupScheduledTime = value => {
    const match = typeof value === 'string'
        ? value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?: WIB)?$/)
        : null;
    if (!match) return null;
    const [, yearText, monthText, dayText, hourText, minuteText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const date = new Date(year, month - 1, day, hour, minute);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
        date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) {
        return null;
    }
    return `${yearText}-${monthText}-${dayText} ${hourText}:${minuteText} WIB`;
};

const readPickupOperationCollections = () => {
    const pickups = readStoredData(StorageKeys.PICKUPS);
    const reservations = readStoredData(StorageKeys.RESERVATIONS);
    const cats = readStoredData(StorageKeys.CATS);
    const users = readStoredData(StorageKeys.USERS);
    const collections = [
        [StorageKeys.PICKUPS, pickups],
        [StorageKeys.RESERVATIONS, reservations],
        [StorageKeys.CATS, cats],
        [StorageKeys.USERS, users]
    ];
    const invalid = collections.find(([key, value]) =>
        !Array.isArray(value) || !value.every(isStoredRecord)
    );
    if (invalid) {
        return { success: false, message: `Struktur data ${invalid[0]} tidak valid.` };
    }
    return { success: true, pickups, reservations, cats, users };
};

const getPickupReservationContext = (reservation, cats, users) => {
    if (!isStoredRecord(reservation) ||
        !PICKUP_SCHEDULABLE_RESERVATION_STATUSES.includes(reservation.status) ||
        reservation.needPickup !== true ||
        !Object.prototype.hasOwnProperty.call(PICKUP_SERVICE_TYPES, reservation.pickupType) ||
        typeof reservation.id !== 'string' || !reservation.id ||
        typeof reservation.catId !== 'string' || !reservation.catId ||
        typeof reservation.ownerId !== 'string' || !reservation.ownerId) {
        return { success: false, message: 'Reservasi tidak memenuhi syarat penjadwalan antar-jemput.' };
    }
    const catMatches = cats.filter(cat => cat.id === reservation.catId);
    const ownerMatches = users.filter(user => user.id === reservation.ownerId);
    if (catMatches.length !== 1 || catMatches[0].ownerId !== reservation.ownerId ||
        typeof catMatches[0].name !== 'string' || !catMatches[0].name.trim() ||
        ownerMatches.length !== 1 || ownerMatches[0].role !== 'customer' ||
        typeof ownerMatches[0].name !== 'string' || !ownerMatches[0].name.trim()) {
        return { success: false, message: 'Relasi kucing atau pemilik reservasi tidak valid.' };
    }
    const address = String(reservation.pickupAddress || '').trim();
    if (!address) {
        return { success: false, message: 'Alamat layanan belum tersedia pada reservasi.' };
    }
    return {
        success: true,
        reservation,
        cat: catMatches[0],
        owner: ownerMatches[0],
        address,
        serviceTypes: PICKUP_SERVICE_TYPES[reservation.pickupType]
    };
};

const writeVerifiedPickupCollection = pickups => {
    if (!writeStoredData(StorageKeys.PICKUPS, pickups)) return false;
    try {
        return localStorage.getItem(StorageKeys.PICKUPS) === JSON.stringify(pickups);
    } catch (error) {
        console.error(`Gagal memverifikasi ${StorageKeys.PICKUPS} setelah penyimpanan:`, error);
        return false;
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

const readBillingCollection = key => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return { success: true, value: [] };
        const value = JSON.parse(raw);
        if (!Array.isArray(value)) {
            return { success: false, message: `Data ${key} bukan daftar yang valid.` };
        }
        return { success: true, value };
    } catch (error) {
        console.error(`Gagal membaca ${key} dari LocalStorage:`, error);
        return { success: false, message: `Data ${key} tidak dapat dibaca.` };
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
            const storedValues = new Map(
                [...Object.values(StorageKeys), BOARDING_MIGRATION_JOURNAL_KEY]
                    .map(key => [key, localStorage.getItem(key)])
            );
            const hasStoredApplicationData = [...storedValues.values()].some(value => value !== null);
            if (!hasStoredApplicationData) {
                if (!this.seedAllData()) {
                    this.initializationError = 'Data awal OMI tidak dapat disiapkan.';
                    console.error(this.initializationError);
                    return false;
                }
            } else {
                const missingKeys = INITIAL_DATA_REQUIRED_KEYS.filter(key => storedValues.get(key) === null);
                if (missingKeys.length > 0) {
                    this.initializationError =
                        `Penyimpanan OMI tidak lengkap (${missingKeys.join(', ')} tidak tersedia). Data dipertahankan dan aplikasi dinonaktifkan.`;
                    console.error(this.initializationError);
                    return false;
                }

                const invalidCollectionKeys = [
                    StorageKeys.USERS,
                    StorageKeys.CATS,
                    StorageKeys.RESERVATIONS,
                    StorageKeys.DAILY_REPORTS,
                    StorageKeys.PICKUPS
                ].filter(key => {
                    try {
                        return !Array.isArray(JSON.parse(storedValues.get(key)));
                    } catch (error) {
                        return true;
                    }
                });
                const settings = (() => {
                    try {
                        return JSON.parse(storedValues.get(StorageKeys.SETTINGS));
                    } catch (error) {
                        return null;
                    }
                })();
                if (invalidCollectionKeys.length > 0 ||
                    !settings || typeof settings !== 'object' || Array.isArray(settings)) {
                    const invalidKeys = [
                        ...invalidCollectionKeys,
                        ...(!settings || typeof settings !== 'object' || Array.isArray(settings)
                            ? [StorageKeys.SETTINGS]
                            : [])
                    ];
                    this.initializationError =
                        `Struktur penyimpanan OMI tidak valid (${invalidKeys.join(', ')}). Data dipertahankan dan aplikasi dinonaktifkan.`;
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
        const existingKeys = [...Object.values(StorageKeys), BOARDING_MIGRATION_JOURNAL_KEY]
            .filter(key => localStorage.getItem(key) !== null);
        if (existingKeys.length > 0) {
            console.error(
                `Seed data demo ditolak karena penyimpanan OMI sudah berisi data (${existingKeys.join(', ')}).`
            );
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
                driverId: 'USR-DRIVER',
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
                driverId: 'USR-DRIVER',
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
                driverId: 'USR-DRIVER',
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

        const seedEntries = [
            [StorageKeys.USERS, initialUsers],
            [StorageKeys.CATS, initialCats],
            [StorageKeys.RESERVATIONS, initialReservations],
            [StorageKeys.DAILY_REPORTS, initialReports],
            [StorageKeys.PICKUPS, initialPickups],
            [StorageKeys.SETTINGS, initialSettings]
        ];
        for (const [key, value] of seedEntries) {
            if (!writeStoredData(key, value)) return false;
            try {
                if (localStorage.getItem(key) !== JSON.stringify(value)) {
                    console.error(`Verifikasi penyimpanan data awal ${key} gagal.`);
                    return false;
                }
            } catch (error) {
                console.error(`Verifikasi penyimpanan data awal ${key} gagal:`, error);
                return false;
            }
        }
        localStorage.removeItem(StorageKeys.BOARDING_STAYS);
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
        if (key === StorageKeys.BILLING_BILLS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role !== 'customer') return [];
            const reservationOwners = new Map(
                readStoredData(StorageKeys.RESERVATIONS).map(item => [item.id, item.ownerId])
            );
            return data.filter(item =>
                item.customerId === user.id && reservationOwners.get(item.reservationId) === user.id
            );
        }
        if (key === StorageKeys.BILLING_TRANSACTIONS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role !== 'customer') return [];
            const billIds = new Set(this.get(StorageKeys.BILLING_BILLS).map(item => item.id));
            return data.filter(item => item.customerId === user.id && billIds.has(item.billId));
        }
        if (key === StorageKeys.PICKUPS) {
            if (['owner', 'staff_ops'].includes(user.role)) return data;
            if (user.role === 'staff_driver') {
                if (!data.every(isStoredRecord)) {
                    throwStoredDataReadError(
                        StorageKeys.PICKUPS,
                        new Error('Struktur data antar-jemput tidak valid.')
                    );
                }
                const driversResult = readStoredDriverUsers();
                if (!driversResult.success) {
                    throwStoredDataReadError(
                        StorageKeys.USERS,
                        new Error(driversResult.message)
                    );
                }
                return data.filter(item => isPickupAssignedToDriver(item, user, driversResult.value));
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

    /**
     * Fase 2: selaraskan mirror LocalStorage dari server (sumber kebenaran).
     * Server tidak pernah dipanggil pada pembacaan; fungsi ini mengisi ulang
     * cermin agar getCats()/getCustomers() sinkron tetap berisi data terkini.
     */
    async loadFromServer() {
        if (typeof AppApi === 'undefined') return { success: false, message: 'API tidak tersedia.' };
        try {
            const catsData = await AppApi.request('/cats');
            writeStoredData(StorageKeys.CATS, catsData.cats || []);

            const reservationsData = await AppApi.request('/reservations');
            writeStoredData(StorageKeys.RESERVATIONS, reservationsData.reservations || []);

            const staysData = await AppApi.request('/boarding-stays');
            writeStoredData(StorageKeys.BOARDING_STAYS, staysData.stays || []);

            const reportsData = await AppApi.request('/daily-reports');
            writeStoredData(StorageKeys.DAILY_REPORTS, reportsData.reports || []);

            const pickupsData = await AppApi.request('/pickups');
            writeStoredData(StorageKeys.PICKUPS, pickupsData.pickups || []);

            const billsData = await AppApi.request('/bills');
            writeStoredData(StorageKeys.BILLING_BILLS, billsData.bills || []);

            const transactionsData = await AppApi.request('/billing-transactions');
            writeStoredData(StorageKeys.BILLING_TRANSACTIONS, transactionsData.transactions || []);

            const settingsData = await AppApi.request('/settings');
            if (settingsData.settings) writeStoredData(StorageKeys.SETTINGS, settingsData.settings);

            const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
            if (user && ['owner', 'staff_ops'].includes(user.role)) {
                const usersData = await AppApi.request('/customers');
                const customers = usersData.users || [];
                const existing = readStoredData(StorageKeys.USERS);
                const nonCustomers = existing.filter(item => item.role !== 'customer');
                writeStoredData(StorageKeys.USERS, [...nonCustomers, ...customers]);
            }
            return { success: true };
        } catch (error) {
            console.error('Gagal menyelaraskan data dari server:', error);
            return { success: false, message: error.message };
        }
    },

    getReservations() { return this.get(StorageKeys.RESERVATIONS); },
    getReservationPickupConfiguration(reservation) {
        return inspectReservationPickupConfiguration(reservation);
    },
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
    getBillingOverview() {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin melihat tagihan.' };
        }

        const billsResult = readBillingCollection(StorageKeys.BILLING_BILLS);
        const transactionsResult = readBillingCollection(StorageKeys.BILLING_TRANSACTIONS);
        if (!billsResult.success || !transactionsResult.success) {
            return {
                success: false,
                message: 'Data tagihan atau pembayaran tidak dapat dibaca. Data lokal dipertahankan.'
            };
        }

        const reservationsResult = readBillingCollection(StorageKeys.RESERVATIONS);
        const customersResult = readBillingCollection(StorageKeys.USERS);
        if (!reservationsResult.success || !customersResult.success) {
            return {
                success: false,
                message: 'Data reservasi atau pelanggan tidak valid; tagihan tidak dapat ditampilkan.'
            };
        }
        const reservations = reservationsResult.value;
        const customers = customersResult.value;
        const validReservations = reservations.every(item =>
            isStoredRecord(item) &&
            typeof item.id === 'string' && item.id &&
            typeof item.catId === 'string' && item.catId &&
            typeof item.ownerId === 'string' && item.ownerId &&
            typeof item.status === 'string' &&
            typeof item.checkInDate === 'string' &&
            typeof item.checkOutDate === 'string'
        );
        const validCustomers = customers.every(item =>
            isStoredRecord(item) &&
            typeof item.id === 'string' && item.id &&
            typeof item.role === 'string'
        );
        if (!validReservations || !validCustomers) {
            return {
                success: false,
                message: 'Struktur data reservasi atau pelanggan tidak valid; tagihan tidak dapat ditampilkan.'
            };
        }
        const reservationById = new Map();
        for (const reservation of reservations) {
            if (reservationById.has(reservation.id)) {
                return { success: false, message: 'Ditemukan ID reservasi duplikat; tagihan tidak dapat ditampilkan.' };
            }
            reservationById.set(reservation.id, reservation);
        }
        const billsById = new Map();
        const seenReservationIds = new Set();
        for (const bill of billsResult.value) {
            const reservation = bill && reservationById.get(bill.reservationId);
            const periodStartValid = bill && this.isValidIsoDate(bill.periodStart);
            const periodEndValid = bill && this.isValidIsoDate(bill.periodEndExclusive);
            const calculatedNights = periodStartValid && periodEndValid
                ? (Date.parse(`${bill.periodEndExclusive}T00:00:00Z`) -
                    Date.parse(`${bill.periodStart}T00:00:00Z`)) / 86400000
                : NaN;
            const validBill = bill && typeof bill.id === 'string' && bill.id &&
                typeof bill.reservationId === 'string' && bill.reservationId &&
                typeof bill.customerId === 'string' && bill.customerId &&
                typeof bill.catId === 'string' && bill.catId &&
                Number.isSafeInteger(bill.numberOfNights) && bill.numberOfNights > 0 &&
                periodStartValid && periodEndValid &&
                bill.periodEndExclusive > bill.periodStart &&
                Number.isSafeInteger(calculatedNights) &&
                bill.numberOfNights === calculatedNights &&
                Number.isSafeInteger(bill.unitRate) && bill.unitRate > 0 &&
                Number.isSafeInteger(bill.totalAmount) && bill.totalAmount > 0 &&
                bill.numberOfNights * bill.unitRate === bill.totalAmount &&
                bill.currency === 'IDR' && typeof bill.createdAt === 'string' &&
                bill.createdBy && typeof bill.createdBy.id === 'string' &&
                bill.periodStart === (reservation && reservation.checkInDate) &&
                bill.periodEndExclusive === (reservation && reservation.checkOutDate) &&
                bill.catId === (reservation && reservation.catId) &&
                reservation && reservation.status !== 'Dibatalkan' &&
                reservation && reservation.ownerId === bill.customerId &&
                !billsById.has(bill.id) && !seenReservationIds.has(bill.reservationId);
            if (!validBill) {
                return { success: false, message: 'Ditemukan data tagihan yang tidak konsisten. Hubungi Owner sebelum mencatat pembayaran.' };
            }
            const customer = customers.find(item =>
                item.id === bill.customerId && item.role === 'customer'
            );
            if (!customer) {
                return { success: false, message: 'Pemilik tagihan tidak valid. Data pembayaran tidak dapat ditampilkan.' };
            }
            billsById.set(bill.id, bill);
            seenReservationIds.add(bill.reservationId);
        }

        const transactionsByBillId = new Map();
        const seenTransactionIds = new Set();
        const seenRequestIds = new Set();
        for (const transaction of transactionsResult.value) {
            const bill = transaction && billsById.get(transaction.billId);
            const validTransaction = transaction && typeof transaction.id === 'string' && transaction.id &&
                typeof transaction.idempotencyKey === 'string' && transaction.idempotencyKey &&
                !seenTransactionIds.has(transaction.id) && !seenRequestIds.has(transaction.idempotencyKey) &&
                Number.isSafeInteger(transaction.amount) && transaction.amount > 0 &&
                ['cash', 'transfer'].includes(transaction.method) &&
                transaction.status === 'Diterima' && typeof transaction.recordedAt === 'string' &&
                transaction.recordedBy && typeof transaction.recordedBy.id === 'string' &&
                typeof transaction.recordedBy.name === 'string' && bill &&
                transaction.reservationId === bill.reservationId &&
                transaction.customerId === bill.customerId;
            if (!validTransaction) {
                return { success: false, message: 'Ditemukan data transaksi yang tidak konsisten. Hubungi Owner sebelum melanjutkan.' };
            }
            seenTransactionIds.add(transaction.id);
            seenRequestIds.add(transaction.idempotencyKey);
            const list = transactionsByBillId.get(bill.id) || [];
            list.push(transaction);
            transactionsByBillId.set(bill.id, list);
        }

        const visibleBills = billsResult.value.filter(bill =>
            user.role !== 'customer' || (
                bill.customerId === user.id &&
                reservationById.get(bill.reservationId).ownerId === user.id
            )
        );
        const visibleBillIds = new Set(visibleBills.map(bill => bill.id));
        const visibleTransactions = transactionsResult.value.filter(transaction =>
            visibleBillIds.has(transaction.billId)
        );
        const summaries = visibleBills.map(bill => {
            const billTransactions = transactionsByBillId.get(bill.id) || [];
            const totalPaid = billTransactions.reduce((sum, item) => sum + item.amount, 0);
            if (!Number.isSafeInteger(totalPaid) || totalPaid > bill.totalAmount) return null;
            return {
                ...bill,
                totalPaid,
                remainingAmount: bill.totalAmount - totalPaid,
                paymentStatus: totalPaid === 0
                    ? 'Belum Dibayar'
                    : totalPaid === bill.totalAmount
                        ? 'Lunas'
                        : 'Sebagian Dibayar',
                transactions: billTransactions.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
            };
        });
        if (summaries.some(item => !item)) {
            return { success: false, message: 'Total transaksi melebihi nilai tagihan. Data dipertahankan dan pembayaran dihentikan.' };
        }
        return {
            success: true,
            bills: summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            transactions: visibleTransactions.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        };
    },
    async createBillingBill(reservationId) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'staff_ops') {
            return { success: false, message: 'Hanya Staf Operasional yang dapat menyiapkan tagihan.' };
        }

        const overview = this.getBillingOverview();
        if (!overview.success) return overview;
        if (overview.bills.some(bill => bill.reservationId === reservationId)) {
            return { success: false, message: 'Tagihan untuk reservasi ini sudah tersedia.' };
        }

        const reservationsResult = readBillingCollection(StorageKeys.RESERVATIONS);
        const staysResult = readBillingCollection(StorageKeys.BOARDING_STAYS);
        if (!reservationsResult.success || !staysResult.success) {
            return { success: false, message: 'Data reservasi atau penitipan tidak valid; tagihan tidak dibuat.' };
        }
        const validReservations = reservationsResult.value.every(item =>
            isStoredRecord(item) &&
            typeof item.id === 'string' && item.id &&
            typeof item.catId === 'string' && item.catId &&
            typeof item.ownerId === 'string' && item.ownerId &&
            typeof item.status === 'string' &&
            typeof item.checkInDate === 'string' &&
            typeof item.checkOutDate === 'string'
        );
        const validStays = staysResult.value.every(item =>
            isStoredRecord(item) &&
            typeof item.reservationId === 'string' && item.reservationId &&
            typeof item.catId === 'string' && item.catId &&
            typeof item.ownerId === 'string' && item.ownerId &&
            typeof item.id === 'string' && item.id &&
            typeof item.status === 'string'
        );
        if (!validReservations || !validStays) {
            return { success: false, message: 'Struktur data reservasi atau penitipan tidak valid; tagihan tidak dibuat.' };
        }
        const reservation = reservationsResult.value.find(item => item.id === reservationId);
        const stay = staysResult.value.find(item => item.reservationId === reservationId);
        if (!reservation || reservation.status === 'Dibatalkan' ||
            (reservation.status !== 'Dikonfirmasi' && !stay)) {
            return { success: false, message: 'Tagihan hanya dapat dibuat untuk reservasi terkonfirmasi atau yang memiliki riwayat penitipan.' };
        }
        if (stay && (stay.catId !== reservation.catId || stay.ownerId !== reservation.ownerId)) {
            return { success: false, message: 'Relasi reservasi dan penitipan tidak konsisten.' };
        }
        if (!this.isValidIsoDate(reservation.checkInDate) ||
            !this.isValidIsoDate(reservation.checkOutDate) ||
            reservation.checkOutDate <= reservation.checkInDate) {
            return { success: false, message: 'Tanggal reservasi tidak valid untuk perhitungan tagihan.' };
        }

        const catsResult = readBillingCollection(StorageKeys.CATS);
        const customersResult = readBillingCollection(StorageKeys.USERS);
        if (!catsResult.success || !customersResult.success) {
            return { success: false, message: 'Data kucing atau pelanggan tidak valid; tagihan tidak dibuat.' };
        }
        const validCats = catsResult.value.every(item =>
            isStoredRecord(item) &&
            typeof item.id === 'string' && item.id &&
            typeof item.ownerId === 'string' && item.ownerId
        );
        const validCustomers = customersResult.value.every(item =>
            isStoredRecord(item) &&
            typeof item.id === 'string' && item.id &&
            typeof item.role === 'string'
        );
        if (!validCats || !validCustomers) {
            return { success: false, message: 'Struktur data kucing atau pelanggan tidak valid; tagihan tidak dibuat.' };
        }
        const cats = catsResult.value;
        const customers = customersResult.value;
        const cat = cats.find(item =>
            item.id === reservation.catId && item.ownerId === reservation.ownerId
        );
        const customer = customers.find(item =>
            item.id === reservation.ownerId && item.role === 'customer'
        );
        if (!cat || !customer) {
            return { success: false, message: 'Data kucing atau pelanggan pada reservasi tidak valid.' };
        }
        let settings;
        try {
            const rawSettings = localStorage.getItem(StorageKeys.SETTINGS);
            settings = rawSettings === null ? null : JSON.parse(rawSettings);
        } catch (error) {
            console.error('Konfigurasi tarif tidak dapat dibaca:', error);
            return { success: false, message: 'Konfigurasi tarif tidak dapat dibaca.' };
        }
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            return { success: false, message: 'Konfigurasi tarif hotel tidak valid.' };
        }
        const unitRate = Number(settings && settings.standardDailyRate);
        if (!Number.isSafeInteger(unitRate) || unitRate <= 0) {
            return { success: false, message: 'Tarif harian hotel belum dikonfigurasi sebagai nominal Rupiah bulat yang valid.' };
        }
        const start = new Date(`${reservation.checkInDate}T00:00:00Z`);
        const end = new Date(`${reservation.checkOutDate}T00:00:00Z`);
        const numberOfNights = (end.getTime() - start.getTime()) / 86400000;
        const totalAmount = numberOfNights * unitRate;
        if (!Number.isSafeInteger(numberOfNights) || numberOfNights <= 0 ||
            !Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
            return { success: false, message: 'Periode atau total tagihan tidak dapat dihitung dengan aman.' };
        }

        try {
            const data = await AppApi.request('/bills', {
                method: 'POST',
                body: { reservationId: reservation.id }
            });
            const mirror = readBillingCollection(StorageKeys.BILLING_BILLS);
            const bills = mirror.success ? mirror.value : [];
            bills.push(data.bill);
            writeStoredData(StorageKeys.BILLING_BILLS, bills);
            return { success: true, bill: data.bill };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan tagihan.' };
        }
    },

    /**
     * Fase 6: catat pembayaran manual melalui API server.
     */
    async recordManualPayment(paymentData = {}) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'staff_ops') {
            return { success: false, message: 'Hanya Staf Operasional yang dapat mencatat pembayaran.' };
        }
        if (!paymentData || typeof paymentData !== 'object') {
            return { success: false, message: 'Data pembayaran tidak valid.' };
        }
        const idempotencyKey = typeof paymentData.idempotencyKey === 'string'
            ? paymentData.idempotencyKey.trim()
            : '';
        if (!idempotencyKey || idempotencyKey.length > 120) {
            return { success: false, message: 'Identitas pengiriman pembayaran tidak valid.' };
        }
        const amountValue = paymentData.amount;
        const amountString = typeof amountValue === 'string' ? amountValue.trim() : '';
        const amount = typeof amountValue === 'number'
            ? amountValue
            : (/^\d+$/.test(amountString) ? Number(amountString) : NaN);
        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return { success: false, message: 'Nominal pembayaran harus berupa bilangan bulat Rupiah yang lebih besar dari nol.' };
        }
        if (!['cash', 'transfer'].includes(paymentData.method)) {
            return { success: false, message: 'Pilih metode tunai atau transfer.' };
        }
        const reference = typeof paymentData.reference === 'string' ? paymentData.reference.trim() : '';
        if (reference.length > 120) {
            return { success: false, message: 'Catatan atau referensi pembayaran maksimal 120 karakter.' };
        }

        try {
            const data = await AppApi.request('/billing-transactions', {
                method: 'POST',
                body: {
                    billId: paymentData.billId,
                    amount,
                    method: paymentData.method,
                    reference,
                    idempotencyKey
                }
            });
            const mirror = readBillingCollection(StorageKeys.BILLING_TRANSACTIONS);
            const transactions = mirror.success ? mirror.value : [];
            transactions.push(data.transaction);
            writeStoredData(StorageKeys.BILLING_TRANSACTIONS, transactions);
            return { success: true, transaction: data.transaction };
        } catch (error) {
            return { success: false, message: error.message || 'Pembayaran gagal disimpan.' };
        }
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
    async checkInReservation(request = {}) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin melakukan check-in.' };
        }
        if (!request || typeof request !== 'object') {
            return { success: false, message: 'Data check-in tidak valid.' };
        }
        const { reservationId, kennel } = request;

        const reservationsResult = readStoredCollection(StorageKeys.RESERVATIONS);
        const catsResult = readStoredCollection(StorageKeys.CATS);
        const staysResult = readStoredCollection(StorageKeys.BOARDING_STAYS);
        if (!reservationsResult.success || !catsResult.success || !staysResult.success ||
            ![reservationsResult, catsResult, staysResult]
                .every(result => result.value.every(isStoredRecord))) {
            return { success: false, message: 'Data reservasi, kucing, atau penitipan tidak dapat dibaca; check-in tidak disimpan.' };
        }
        const reservation = reservationsResult.value.find(item => item.id === reservationId);
        if (!reservation || reservation.status !== 'Dikonfirmasi') {
            return { success: false, message: 'Check-in hanya dapat dilakukan untuk reservasi yang telah dikonfirmasi.' };
        }
        if (staysResult.value.some(stay => stay.reservationId === reservation.id)) {
            return { success: false, message: 'Reservasi ini sudah memiliki riwayat penitipan dan tidak dapat check-in ulang.' };
        }

        const today = this.getLocalDateString(new Date());
        if (!this.isValidIsoDate(reservation.checkInDate) ||
            !this.isValidIsoDate(reservation.checkOutDate) ||
            today < reservation.checkInDate || today >= reservation.checkOutDate) {
            return { success: false, message: 'Check-in hanya dapat dilakukan dalam periode reservasi yang valid.' };
        }
        const cat = catsResult.value.find(item =>
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
        const activeStays = staysResult.value.filter(stay => stay.status === 'Sedang Dititipkan');
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

        try {
            const data = await AppApi.request('/boarding-stays', {
                method: 'POST',
                body: { reservationId: reservation.id, kennel: cleanKennel }
            });
            const staysResult2 = readStoredCollection(StorageKeys.BOARDING_STAYS);
            const stays = staysResult2.success ? staysResult2.value : [];
            stays.push(data.stay);
            writeStoredData(StorageKeys.BOARDING_STAYS, stays);
            return { success: true, stay: data.stay };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan check-in.' };
        }
    },
    isValidKennelIdentifier(value) {
        return typeof value === 'string' &&
            value.length >= 1 &&
            value.length <= 60 &&
            /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(value);
    },
    /**
     * Fase 4: check-out aktual melalui API server, lalu perbarui cermin lokal.
     */
    async checkOutBoardingStay(stayId) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin melakukan check-out.' };
        }
        const staysResult = readStoredCollection(StorageKeys.BOARDING_STAYS);
        if (!staysResult.success || !staysResult.value.every(isStoredRecord)) {
            return { success: false, message: 'Data penitipan tidak dapat dibaca; check-out tidak disimpan.' };
        }
        const current = staysResult.value.find(stay => stay.id === stayId);
        if (!current || current.status !== 'Sedang Dititipkan') {
            return { success: false, message: 'Hanya kucing yang sedang dititipkan dapat menjalani check-out.' };
        }

        try {
            const data = await AppApi.request(`/boarding-stays/${encodeURIComponent(stayId)}/checkout`, {
                method: 'PUT'
            });
            const stays = staysResult.value;
            const index = stays.findIndex(stay => stay.id === stayId);
            if (index >= 0) stays[index] = data.stay;
            writeStoredData(StorageKeys.BOARDING_STAYS, stays);
            return { success: true, stay: data.stay };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan check-out.' };
        }
    },
    async saveDailyReport(reportData = {}) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin menyimpan laporan harian.' };
        }
        if (!reportData || typeof reportData !== 'object') {
            return { success: false, message: 'Data laporan harian tidak valid.' };
        }
        const staysResult = readStoredCollection(StorageKeys.BOARDING_STAYS);
        const reservationsResult = readStoredCollection(StorageKeys.RESERVATIONS);
        const catsResult = readStoredCollection(StorageKeys.CATS);
        const reportsResult = readStoredCollection(StorageKeys.DAILY_REPORTS);
        if (!staysResult.success || !reservationsResult.success ||
            !catsResult.success || !reportsResult.success) {
            return { success: false, message: 'Data penitipan, reservasi, kucing, atau laporan tidak dapat dibaca; laporan tidak disimpan.' };
        }
        if (![staysResult, reservationsResult, catsResult, reportsResult]
            .every(result => result.value.every(isStoredRecord))) {
            return { success: false, message: 'Struktur data penitipan, reservasi, kucing, atau laporan tidak valid.' };
        }

        const stay = staysResult.value.find(item => item.id === reportData.boardingStayId);
        if (!stay || stay.status !== 'Sedang Dititipkan') {
            return { success: false, message: 'Laporan hanya dapat dibuat atau diperbarui untuk kucing yang sedang dititipkan.' };
        }
        const reservation = reservationsResult.value.find(item => item.id === stay.reservationId);
        const cat = catsResult.value.find(item =>
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

        const reports = reportsResult.value;
        const existing = reportData.id
            ? reports.find(report => report.id === reportData.id)
            : null;
        if (reportData.id && !existing) return { success: false, message: 'Laporan harian tidak ditemukan.' };
        if (existing && (existing.boardingStayId !== stay.id ||
            existing.catId !== stay.catId || existing.reservationId !== stay.reservationId)) {
            return { success: false, message: 'Laporan tidak terhubung dengan penitipan ini.' };
        }

        try {
            const data = await AppApi.request(
                existing ? `/daily-reports/${encodeURIComponent(existing.id)}` : '/daily-reports',
                {
                    method: existing ? 'PUT' : 'POST',
                    body: { boardingStayId: stay.id, date: reportData.date, ...values }
                }
            );
            const index = reports.findIndex(report => report.id === data.report.id);
            if (index >= 0) reports[index] = data.report;
            else reports.push(data.report);
            writeStoredData(StorageKeys.DAILY_REPORTS, reports);
            return { success: true, report: data.report, isNew: !existing };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan laporan harian.' };
        }
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
    /**
     * Fase 3: simpan reservasi melalui API server, lalu perbarui cermin lokal.
     * Validasi benturan/kapasitas tetap di klien (data penitipan & pengaturan
     * belum dimigrasi); server menyimpan permanen dan memvalidasi dasar.
     */
    async saveReservation(reservationData) {
        if (!reservationData || typeof reservationData !== 'object') {
            return { success: false, message: 'Data reservasi tidak valid.' };
        }
        const hasPickupConfiguration = RESERVATION_PICKUP_FIELDS.some(field =>
            Object.prototype.hasOwnProperty.call(reservationData, field)
        );
        if (hasPickupConfiguration &&
            !RESERVATION_PICKUP_FIELDS.every(field =>
                Object.prototype.hasOwnProperty.call(reservationData, field)
            )) {
            return { success: false, message: 'Konfigurasi layanan antar-jemput tidak lengkap.' };
        }
        let pickupConfiguration = null;
        if (hasPickupConfiguration) {
            pickupConfiguration = inspectReservationPickupConfiguration(reservationData);
            if (pickupConfiguration.state !== 'valid') {
                return {
                    success: false,
                    message: pickupConfiguration.message || 'Konfigurasi layanan antar-jemput tidak valid.'
                };
            }
            pickupConfiguration = {
                pickupType: pickupConfiguration.pickupType,
                needPickup: pickupConfiguration.needPickup,
                pickupAddress: pickupConfiguration.pickupType === 'none'
                    ? ''
                    : pickupConfiguration.pickupAddress.trim()
            };
        }
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin menyimpan reservasi.' };
        }

        const existingReservation = reservationData.id
            ? this.getReservationById(reservationData.id)
            : null;
        if (reservationData.id && !existingReservation) {
            return { success: false, message: 'Reservasi tidak ditemukan.' };
        }
        if (existingReservation && user.role === 'customer') {
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

        const staysResult = readStoredCollection(StorageKeys.BOARDING_STAYS);
        if (!staysResult.success || !staysResult.value.every(isStoredRecord)) {
            return { success: false, message: 'Data penitipan tidak dapat dibaca; reservasi tidak disimpan.' };
        }
        if (existingReservation && staysResult.value.some(stay => stay.reservationId === existingReservation.id)) {
            return { success: false, message: 'Reservasi yang sudah memiliki riwayat penitipan tidak dapat diedit.' };
        }
        if (existingReservation) {
            const billsResult = readBillingCollection(StorageKeys.BILLING_BILLS);
            if (!billsResult.success) {
                return { success: false, message: 'Data tagihan tidak dapat diperiksa; reservasi tidak diubah.' };
            }
            if (billsResult.value.some(bill => bill.reservationId === existingReservation.id)) {
                return { success: false, message: 'Reservasi yang sudah ditagihkan tidak dapat diedit.' };
            }
            const pickupsResult = readRequiredStoredCollection(StorageKeys.PICKUPS);
            if (!pickupsResult.success) {
                return {
                    success: false,
                    message: `${pickupsResult.message} Reservasi tidak diubah.`
                };
            }
            const relatedPickups = pickupsResult.value.filter(
                pickup => pickup.reservationId === existingReservation.id
            );
            if (hasPickupConfiguration) {
                const currentPickupConfiguration =
                    inspectReservationPickupConfiguration(existingReservation);
                if (currentPickupConfiguration.state !== 'valid') {
                    return {
                        success: false,
                        message: 'Data layanan antar-jemput lama belum lengkap atau tidak konsisten; konfigurasi tidak dapat diubah dari form reservasi.'
                    };
                }
                const configurationChanged =
                    pickupConfiguration.pickupType !== currentPickupConfiguration.pickupType ||
                    pickupConfiguration.needPickup !== currentPickupConfiguration.needPickup ||
                    pickupConfiguration.pickupAddress !== currentPickupConfiguration.pickupAddress.trim();
                if (configurationChanged && relatedPickups.length > 0) {
                    return {
                        success: false,
                        message: 'Layanan antar-jemput tidak dapat diubah dari form reservasi karena sudah memiliki tugas terkait.'
                    };
                }
            }
        }

        const cat = this.getCats().find(item => item.id === reservationData.catId);
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

        const payload = {
            catId: reservationData.catId,
            checkInDate: reservationData.checkInDate,
            checkOutDate: reservationData.checkOutDate
        };
        if (pickupConfiguration) Object.assign(payload, pickupConfiguration);

        try {
            const data = await AppApi.request(
                existingReservation
                    ? `/reservations/${encodeURIComponent(existingReservation.id)}`
                    : '/reservations',
                { method: existingReservation ? 'PUT' : 'POST', body: payload }
            );
            const mirror = readStoredCollection(StorageKeys.RESERVATIONS);
            const list = mirror.success ? mirror.value : [];
            const index = list.findIndex(item => item.id === data.reservation.id);
            if (index >= 0) list[index] = data.reservation;
            else list.push(data.reservation);
            writeStoredData(StorageKeys.RESERVATIONS, list);
            return { success: true, reservation: data.reservation, isNew: !existingReservation };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan reservasi.' };
        }
    },
    getPickupManagementData() {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin mengelola antar-jemput.' };
        }
        const data = readPickupOperationCollections();
        if (!data.success) return data;
        const drivers = data.users.filter(driver =>
            driver.role === 'staff_driver' &&
            typeof driver.id === 'string' && driver.id &&
            typeof driver.name === 'string' && driver.name.trim()
        );
        const reservations = data.reservations.flatMap(reservation => {
            const context = getPickupReservationContext(reservation, data.cats, data.users);
            if (!context.success) return [];
            const availableTypes = context.serviceTypes.filter(type =>
                !data.pickups.some(pickup =>
                    pickup.reservationId === reservation.id && pickup.type === type
                )
            );
            return availableTypes.length > 0
                ? [{ ...reservation, availablePickupTypes: availableTypes }]
                : [];
        });
        return { success: true, pickups: data.pickups, reservations, drivers };
    },
    getPickups() { return this.get(StorageKeys.PICKUPS); },
    /**
     * Fase 5: buat tugas antar-jemput melalui API server, perbarui cermin lokal.
     */
    async createPickup(pickupData) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin membuat tugas antar-jemput.' };
        }
        if (!isStoredRecord(pickupData) ||
            typeof pickupData.reservationId !== 'string' ||
            typeof pickupData.type !== 'string' ||
            typeof pickupData.driverId !== 'string' ||
            typeof pickupData.scheduledTime !== 'string') {
            return { success: false, message: 'Data tugas antar-jemput tidak valid.' };
        }

        try {
            const data = await AppApi.request('/pickups', {
                method: 'POST',
                body: {
                    reservationId: pickupData.reservationId,
                    type: pickupData.type,
                    driverId: pickupData.driverId,
                    address: String(pickupData.address || ''),
                    scheduledTime: pickupData.scheduledTime
                }
            });
            const mirror = readStoredCollection(StorageKeys.PICKUPS);
            const pickups = mirror.success ? mirror.value : [];
            pickups.push(data.pickup);
            writeStoredData(StorageKeys.PICKUPS, pickups);
            return { success: true, pickup: data.pickup };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan tugas antar-jemput.' };
        }
    },
    /**
     * Fase 5: ubah penugasan tugas antar-jemput melalui API server.
     */
    async updatePickupAssignment(pickupId, assignmentData) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin mengubah penugasan antar-jemput.' };
        }
        if (typeof pickupId !== 'string' || !isStoredRecord(assignmentData) ||
            typeof assignmentData.driverId !== 'string' ||
            typeof assignmentData.address !== 'string' ||
            typeof assignmentData.scheduledTime !== 'string') {
            return { success: false, message: 'Data penugasan antar-jemput tidak valid.' };
        }

        try {
            const data = await AppApi.request(`/pickups/${encodeURIComponent(pickupId)}`, {
                method: 'PUT',
                body: {
                    driverId: assignmentData.driverId,
                    address: assignmentData.address,
                    scheduledTime: assignmentData.scheduledTime
                }
            });
            const mirror = readStoredCollection(StorageKeys.PICKUPS);
            const pickups = mirror.success ? mirror.value : [];
            const index = pickups.findIndex(item => item.id === pickupId);
            if (index >= 0) pickups[index] = data.pickup;
            writeStoredData(StorageKeys.PICKUPS, pickups);
            return { success: true, pickup: data.pickup };
        } catch (error) {
            return { success: false, message: error.message || 'Perubahan tugas gagal disimpan.' };
        }
    },
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
        const usersResult = readStoredCollection(StorageKeys.USERS);
        if (!usersResult.success || !usersResult.value.every(isStoredRecord)) {
            return { success: false, message: 'Data pengguna tidak dapat dibaca; akun tidak disimpan.' };
        }
        const users = usersResult.value;
        const normalizedEmail = String(customer.email).trim().toLowerCase();
        if (users.some(user => String(user.email || '').toLowerCase() === normalizedEmail)) {
            return { success: false, message: 'Email sudah terdaftar.' };
        }
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
     * Fase 2: simpan kucing melalui API server, lalu perbarui cermin lokal.
     * Server memvalidasi & menyimpan permanen; mirror hanya cache baca.
     */
    async saveCat(catData) {
        if (!catData || typeof catData !== 'object') {
            return { success: false, message: 'Data kucing tidak valid.' };
        }
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin mengelola data kucing.' };
        }

        const isEdit = Boolean(catData.id);
        const payload = {
            name: String(catData.name || '').trim(),
            breed: String(catData.breed || '').trim(),
            gender: catData.gender || 'Jantan',
            age: String(catData.age || '').trim(),
            color: String(catData.color || '').trim(),
            ownerId: catData.ownerId || '',
            photoUrl: catData.photoUrl || '',
            initialCheck: catData.initialCheck
        };

        try {
            const data = await AppApi.request(
                isEdit ? `/cats/${encodeURIComponent(catData.id)}` : '/cats',
                { method: isEdit ? 'PUT' : 'POST', body: payload }
            );
            const catsResult = readStoredCollection(StorageKeys.CATS);
            const cats = catsResult.success ? catsResult.value : [];
            const index = cats.findIndex(cat => cat.id === data.cat.id);
            if (index >= 0) cats[index] = data.cat;
            else cats.push(data.cat);
            writeStoredData(StorageKeys.CATS, cats);
            return { success: true, cat: data.cat, isNew: !isEdit };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menyimpan data kucing.' };
        }
    },

    /**
     * Fase 2: hapus kucing melalui API server, lalu perbarui cermin lokal.
     * Server menolak (409) bila kucing masih memiliki riwayat.
     */
    async deleteCat(catId) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) {
            return { success: false, message: 'Anda tidak memiliki izin menghapus data kucing.' };
        }
        try {
            await AppApi.request(`/cats/${encodeURIComponent(catId)}`, { method: 'DELETE' });
            const catsResult = readStoredCollection(StorageKeys.CATS);
            if (catsResult.success) {
                writeStoredData(StorageKeys.CATS, catsResult.value.filter(cat => cat.id !== catId));
            }
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message || 'Gagal menghapus data kucing.' };
        }
    },

    /**
     * Memperbarui status tugas antar-jemput
     */
    /**
     * Fase 5: tandai tugas selesai melalui API server (khusus driver terkait).
     * Mengembalikan boolean seperti pemanggil lama.
     */
    async updatePickupStatus(pickupId, newStatus) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'staff_driver' || newStatus !== 'Selesai') return false;
        const pickupsResult = readStoredCollection(StorageKeys.PICKUPS);
        if (!pickupsResult.success || !pickupsResult.value.every(isStoredRecord)) return false;
        const pickups = pickupsResult.value;
        const index = pickups.findIndex(p => p.id === pickupId);
        if (index === -1 || pickups[index].status !== 'Terjadwal') return false;
        const driversResult = readStoredDriverUsers();
        if (!driversResult.success) return false;
        if (!isPickupAssignedToDriver(pickups[index], user, driversResult.value)) return false;

        try {
            const data = await AppApi.request(`/pickups/${encodeURIComponent(pickupId)}/status`, {
                method: 'PUT',
                body: { status: newStatus }
            });
            pickups[index] = data.pickup;
            writeStoredData(StorageKeys.PICKUPS, pickups);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Fase 3: ubah status reservasi (owner) melalui API server.
     * Pengaman lokal (riwayat penitipan/tagihan) dipertahankan karena modul
     * tersebut belum dimigrasi. Mengembalikan boolean seperti pemanggil lama.
     */
    async updateReservationStatus(reservationId, newStatus) {
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (!user || user.role !== 'owner' || !['Dikonfirmasi', 'Dibatalkan'].includes(newStatus)) return false;
        const reservationsResult = readStoredCollection(StorageKeys.RESERVATIONS);
        const staysResult = readStoredCollection(StorageKeys.BOARDING_STAYS);
        if (!reservationsResult.success || !staysResult.success ||
            ![reservationsResult, staysResult].every(result => result.value.every(isStoredRecord))) return false;
        const reservations = reservationsResult.value;
        const index = reservations.findIndex(r => r.id === reservationId);
        const hasBoardingStay = staysResult.value.some(stay => stay.reservationId === reservationId);
        const billsResult = readBillingCollection(StorageKeys.BILLING_BILLS);
        if (!billsResult.success) return false;
        const hasBillingBill = billsResult.value.some(bill => bill.reservationId === reservationId);
        const validTransition = index !== -1 &&
            !hasBoardingStay &&
            !(newStatus === 'Dibatalkan' && hasBillingBill) &&
            ((reservations[index].status === 'Menunggu Konfirmasi' && ['Dikonfirmasi', 'Dibatalkan'].includes(newStatus)) ||
                (reservations[index].status === 'Dikonfirmasi' && newStatus === 'Dibatalkan'));
        if (!validTransition) return false;

        try {
            const data = await AppApi.request(`/reservations/${encodeURIComponent(reservationId)}/status`, {
                method: 'PUT',
                body: { status: newStatus }
            });
            if (reservationsResult.success) {
                const mirror = reservationsResult.value;
                const mirrorIndex = mirror.findIndex(r => r.id === reservationId);
                if (mirrorIndex >= 0) mirror[mirrorIndex] = data.reservation;
                writeStoredData(StorageKeys.RESERVATIONS, mirror);
            }
            return true;
        } catch (error) {
            return false;
        }
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
