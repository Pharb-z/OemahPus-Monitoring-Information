-- ============================================================================
-- OMI Pet Hotel - Skema MySQL
-- Struktur tabel dibuat agar meniru model data pada frontend (localStorage).
-- File ini hanya berisi DDL tabel. Nama database diatur oleh setup.js
-- berdasarkan variabel DB_NAME pada file .env.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `billing_transactions`;
DROP TABLE IF EXISTS `billing_bills`;
DROP TABLE IF EXISTS `daily_reports`;
DROP TABLE IF EXISTS `boarding_stays`;
DROP TABLE IF EXISTS `pickups`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `cats`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- users : akun pengguna (owner, staf operasional, staf antar-jemput, pelanggan)
-- Pemetaan frontend: omi_users_data { id, name, email, phone, address, role }
-- Tambahan untuk autentikasi: username + password_hash
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`            VARCHAR(30)  NOT NULL,
  `username`      VARCHAR(50)  DEFAULT NULL,
  `email`         VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(100) NOT NULL,
  `name`          VARCHAR(100) NOT NULL,
  `phone`         VARCHAR(25)  NOT NULL DEFAULT '',
  `address`       VARCHAR(255) NOT NULL DEFAULT '',
  `role`          ENUM('owner','staff_ops','staff_driver','customer') NOT NULL,
  `created_at`    DATE         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- cats : data kucing + pemeriksaan awal kondisi fisik
-- Pemetaan frontend: omi_cats_data (initialCheck dipecah menjadi kolom)
-- ----------------------------------------------------------------------------
CREATE TABLE `cats` (
  `id`                         VARCHAR(30)  NOT NULL,
  `name`                       VARCHAR(100) NOT NULL,
  `breed`                      VARCHAR(100) NOT NULL,
  `gender`                     ENUM('Jantan','Betina') NOT NULL DEFAULT 'Jantan',
  `age`                        VARCHAR(30)  NOT NULL,
  `color`                      VARCHAR(100) NOT NULL,
  `owner_id`                   VARCHAR(30)  NOT NULL,
  `owner_name`                 VARCHAR(100) NOT NULL,
  `photo_url`                  VARCHAR(255) NOT NULL DEFAULT '',
  `initial_weight`             DECIMAL(5,2) NOT NULL DEFAULT 0,
  `initial_temperature`        DECIMAL(4,2) NOT NULL DEFAULT 0,
  `initial_parasites`          VARCHAR(255) NOT NULL DEFAULT 'Belum Dicatat',
  `initial_vaccination_status` VARCHAR(100) NOT NULL DEFAULT 'Belum Dicatat',
  `initial_notes`              TEXT,
  `created_at`                 DATE         NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cats_owner` (`owner_id`),
  CONSTRAINT `fk_cats_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- reservations : reservasi penitipan
-- Pemetaan frontend: omi_reservations_data
-- ----------------------------------------------------------------------------
CREATE TABLE `reservations` (
  `id`             VARCHAR(30)  NOT NULL,
  `cat_id`         VARCHAR(30)  NOT NULL,
  `cat_name`       VARCHAR(100) NOT NULL,
  `owner_id`       VARCHAR(30)  NOT NULL,
  `owner_name`     VARCHAR(100) NOT NULL,
  `check_in_date`  DATE         NOT NULL,
  `check_out_date` DATE         NOT NULL,
  `status`         ENUM('Menunggu Konfirmasi','Dikonfirmasi','Sedang Menginap','Selesai','Dibatalkan') NOT NULL DEFAULT 'Menunggu Konfirmasi',
  `need_pickup`    TINYINT(1)   NOT NULL DEFAULT 0,
  `pickup_type`    ENUM('none','pickup','delivery','both') NOT NULL DEFAULT 'none',
  `pickup_address` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at`     DATE         NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_res_cat` (`cat_id`),
  KEY `idx_res_owner` (`owner_id`),
  KEY `idx_res_dates` (`check_in_date`,`check_out_date`),
  CONSTRAINT `fk_res_cat` FOREIGN KEY (`cat_id`) REFERENCES `cats` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_res_dates` CHECK (`check_out_date` >= `check_in_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- boarding_stays : riwayat penitipan (check-in / check-out)
-- Pemetaan frontend: omi_boarding_stays_data
-- ----------------------------------------------------------------------------
CREATE TABLE `boarding_stays` (
  `id`                     VARCHAR(30)  NOT NULL,
  `reservation_id`         VARCHAR(30)  NOT NULL,
  `cat_id`                 VARCHAR(30)  NOT NULL,
  `cat_name`               VARCHAR(100) NOT NULL,
  `owner_id`               VARCHAR(30)  NOT NULL,
  `owner_name`             VARCHAR(100) NOT NULL,
  `kennel`                 VARCHAR(60)  NOT NULL DEFAULT '',
  `check_in_date`          DATE         NOT NULL,
  `planned_check_out_date` DATE         NOT NULL,
  `checked_in_at`          DATETIME     DEFAULT NULL,
  `checked_out_at`         DATETIME     DEFAULT NULL,
  `actual_check_out_date`  DATE         DEFAULT NULL,
  `status`                 ENUM('Sedang Dititipkan','Selesai') NOT NULL DEFAULT 'Sedang Dititipkan',
  `created_by`             VARCHAR(30)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stay_reservation` (`reservation_id`),
  KEY `idx_stay_cat` (`cat_id`),
  CONSTRAINT `fk_stay_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stay_cat` FOREIGN KEY (`cat_id`) REFERENCES `cats` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- daily_reports : laporan harian (5 catatan kondisi)
-- Pemetaan frontend: omi_daily_reports_data
-- ----------------------------------------------------------------------------
CREATE TABLE `daily_reports` (
  `id`               VARCHAR(30)  NOT NULL,
  `boarding_stay_id` VARCHAR(30)  NOT NULL,
  `reservation_id`   VARCHAR(30)  NOT NULL,
  `cat_id`           VARCHAR(30)  NOT NULL,
  `cat_name`         VARCHAR(100) NOT NULL,
  `date`             DATE         NOT NULL,
  `meal_intake`      VARCHAR(500) NOT NULL,
  `water_intake`     VARCHAR(500) NOT NULL,
  `urination`        VARCHAR(500) NOT NULL,
  `defecation`       VARCHAR(500) NOT NULL,
  `activity_and_mood` VARCHAR(500) NOT NULL,
  `recorded_by`      VARCHAR(100) NOT NULL,
  `recorded_at`      DATETIME     NOT NULL,
  `updated_at`       DATETIME     DEFAULT NULL,
  `updated_by`       VARCHAR(30)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_report_cat_date` (`cat_id`,`date`),
  KEY `idx_report_stay` (`boarding_stay_id`),
  CONSTRAINT `fk_report_stay` FOREIGN KEY (`boarding_stay_id`) REFERENCES `boarding_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- billing_bills : tagihan reservasi
-- Pemetaan frontend: omi_billing_bills_data (createdBy dipecah kolom)
-- ----------------------------------------------------------------------------
CREATE TABLE `billing_bills` (
  `id`                   VARCHAR(30)  NOT NULL,
  `reservation_id`       VARCHAR(30)  NOT NULL,
  `customer_id`          VARCHAR(30)  NOT NULL,
  `cat_id`               VARCHAR(30)  NOT NULL,
  `cat_name`             VARCHAR(100) NOT NULL,
  `customer_name`        VARCHAR(100) NOT NULL,
  `number_of_nights`     INT          NOT NULL,
  `period_start`         DATE         NOT NULL,
  `period_end_exclusive` DATE         NOT NULL,
  `unit_rate`            INT          NOT NULL,
  `total_amount`         INT          NOT NULL,
  `currency`             VARCHAR(8)   NOT NULL DEFAULT 'IDR',
  `created_at`           DATETIME     NOT NULL,
  `created_by_id`        VARCHAR(30)  NOT NULL,
  `created_by_name`      VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bill_reservation` (`reservation_id`),
  KEY `idx_bill_customer` (`customer_id`),
  CONSTRAINT `fk_bill_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bill_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- billing_transactions : transaksi pembayaran manual
-- Pemetaan frontend: omi_billing_transactions_data
-- ----------------------------------------------------------------------------
CREATE TABLE `billing_transactions` (
  `id`               VARCHAR(40)  NOT NULL,
  `idempotency_key`  VARCHAR(120) NOT NULL,
  `bill_id`          VARCHAR(30)  NOT NULL,
  `reservation_id`   VARCHAR(30)  NOT NULL,
  `customer_id`      VARCHAR(30)  NOT NULL,
  `amount`           INT          NOT NULL,
  `method`           ENUM('cash','transfer') NOT NULL,
  `status`           VARCHAR(20)  NOT NULL DEFAULT 'Diterima',
  `reference`        VARCHAR(120) NOT NULL DEFAULT '',
  `recorded_at`      DATETIME     NOT NULL,
  `recorded_by_id`   VARCHAR(30)  NOT NULL,
  `recorded_by_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tx_idempotency` (`idempotency_key`),
  KEY `idx_tx_bill` (`bill_id`),
  CONSTRAINT `fk_tx_bill` FOREIGN KEY (`bill_id`) REFERENCES `billing_bills` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- pickups : tugas antar-jemput
-- Pemetaan frontend: omi_pickups_data
-- ----------------------------------------------------------------------------
CREATE TABLE `pickups` (
  `id`             VARCHAR(30)  NOT NULL,
  `reservation_id` VARCHAR(30)  NOT NULL,
  `cat_id`         VARCHAR(30)  NOT NULL,
  `owner_id`       VARCHAR(30)  NOT NULL,
  `cat_name`       VARCHAR(100) NOT NULL,
  `owner_name`     VARCHAR(100) NOT NULL,
  `phone`          VARCHAR(25)  NOT NULL DEFAULT '',
  `type`           ENUM('Penjemputan','Pengantaran Kembali') NOT NULL,
  `address`        VARCHAR(500) NOT NULL,
  `scheduled_time` VARCHAR(30)  NOT NULL,
  `status`         ENUM('Terjadwal','Selesai') NOT NULL DEFAULT 'Terjadwal',
  `driver_id`      VARCHAR(30)  NOT NULL,
  `driver_name`    VARCHAR(100) NOT NULL,
  `notes`          VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pickup_res_type` (`reservation_id`,`type`),
  KEY `idx_pickup_driver` (`driver_id`),
  CONSTRAINT `fk_pickup_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pickup_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- settings : konfigurasi pet hotel (satu baris saja, id = 1)
-- Pemetaan frontend: omi_hotel_settings
-- ----------------------------------------------------------------------------
CREATE TABLE `settings` (
  `id`                  TINYINT      NOT NULL DEFAULT 1,
  `hotel_name`          VARCHAR(150) NOT NULL,
  `total_capacity`      INT          NOT NULL DEFAULT 10,
  `standard_daily_rate` INT          NOT NULL DEFAULT 0,
  `pickup_rate_flat`    INT          NOT NULL DEFAULT 0,
  `address`             VARCHAR(255) NOT NULL DEFAULT '',
  `contact_phone`       VARCHAR(30)  NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_settings_single` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
