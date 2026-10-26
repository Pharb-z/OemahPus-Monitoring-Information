/**
 * OMI - OemahPus Monitoring and Information
 * File: js/storage.js
 * Deskripsi: Pengelola data lokal (LocalStorage) dan seed data demonstrasi awal
 */

const StorageKeys = {
    USERS: 'omi_users_data',
    CATS: 'omi_cats_data',
    RESERVATIONS: 'omi_reservations_data',
    DAILY_REPORTS: 'omi_daily_reports_data',
    PICKUPS: 'omi_pickups_data',
    SETTINGS: 'omi_hotel_settings'
};

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
    /**
     * Inisialisasi data awal (seed data) jika LocalStorage masih kosong
     */
    init() {
        if (!localStorage.getItem(StorageKeys.USERS)) {
            this.seedAllData();
        }
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
    getDailyReports() { return this.get(StorageKeys.DAILY_REPORTS); },
    getPickups() { return this.get(StorageKeys.PICKUPS); },
    getSettings() {
        const settings = this.get(StorageKeys.SETTINGS);
        return settings && !Array.isArray(settings) ? settings : { totalCapacity: 10 };
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
        if (!user || !['owner', 'staff_ops', 'customer'].includes(user.role)) return false;
        const cats = readStoredData(StorageKeys.CATS);
        const cat = cats.find(item => item.id === catId);
        if (!cat || (user.role === 'customer' && cat.ownerId !== user.id)) return false;
        const filtered = cats.filter(c => c.id !== catId);
        if (filtered.length !== cats.length) {
            return writeStoredData(StorageKeys.CATS, filtered);
        }
        return false;
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
        if (!user || user.role !== 'owner' || newStatus !== 'Dikonfirmasi') return false;
        const reservations = readStoredData(StorageKeys.RESERVATIONS);
        const index = reservations.findIndex(r => r.id === reservationId);
        if (index !== -1 && reservations[index].status === 'Menunggu Konfirmasi') {
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
        const reports = this.getDailyReports();
        const pickups = this.getPickups();

        // 1. Aktivitas Reservasi
        reservations.forEach(r => {
            if (r.status === 'Sedang Menginap') {
                activities.push({
                    icon: '🏨',
                    title: `Kucing Menginap: ${r.catName}`,
                    desc: `Telah check-in di ${r.roomNumber || 'Kandang'} atas nama ${r.ownerName}.`,
                    time: r.checkInDate,
                    sortDate: new Date(r.checkInDate).getTime()
                });
            } else if (r.status === 'Menunggu Konfirmasi') {
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
        Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
        return this.seedAllData();
    }
};

// Pastikan inisialisasi dijalankan saat file dimuat
StorageService.init();
