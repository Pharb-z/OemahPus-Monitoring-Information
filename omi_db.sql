CREATE DATABASE  IF NOT EXISTS `omidb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `omidb`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: omidb
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cages`
--

DROP TABLE IF EXISTS `cages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cages` (
  `cage_id` int NOT NULL AUTO_INCREMENT,
  `cage_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_cm` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '100x80',
  `status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tersedia',
  PRIMARY KEY (`cage_id`),
  UNIQUE KEY `cage_code` (`cage_code`),
  CONSTRAINT `chk_cages_status` CHECK ((`status` in (_utf8mb4'Tersedia',_utf8mb4'Terisi',_utf8mb4'Perawatan')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cages`
--

LOCK TABLES `cages` WRITE;
/*!40000 ALTER TABLE `cages` DISABLE KEYS */;
INSERT INTO `cages` VALUES (1,'K01','100x80','Tersedia'),(2,'K02','100x80','Tersedia'),(3,'K03','100x80','Tersedia'),(4,'K04','100x80','Tersedia'),(5,'K05','100x80','Tersedia');
/*!40000 ALTER TABLE `cages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cat_examinations`
--

DROP TABLE IF EXISTS `cat_examinations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_examinations` (
  `examination_id` int NOT NULL AUTO_INCREMENT,
  `cat_id` int NOT NULL,
  `examined_by` int NOT NULL,
  `examination_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `weight` decimal(5,2) NOT NULL,
  `body_temperature` decimal(4,2) NOT NULL,
  `parasite_finding` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `health_notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`examination_id`),
  KEY `fk_examinations_cats` (`cat_id`),
  KEY `fk_examinations_users` (`examined_by`),
  CONSTRAINT `fk_examinations_cats` FOREIGN KEY (`cat_id`) REFERENCES `cats` (`cat_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_examinations_users` FOREIGN KEY (`examined_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_examinations_temperature` CHECK ((`body_temperature` > 0)),
  CONSTRAINT `chk_examinations_weight` CHECK ((`weight` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_examinations`
--

LOCK TABLES `cat_examinations` WRITE;
/*!40000 ALTER TABLE `cat_examinations` DISABLE KEYS */;
INSERT INTO `cat_examinations` VALUES (1,4,1,'2026-11-03 13:00:00',4.20,38.30,'Belum Diperiksa','Pemeriksaan fisik awal, pemeriksaan parasit belum dilakukan'),(2,1,1,'2026-11-01 09:00:00',4.50,38.50,'Tidak Ditemukan','Kondisi kesehatan baik dan tidak ditemukan parasit'),(3,2,1,'2026-11-02 10:30:00',3.80,39.00,'Ditemukan','Ditemukan indikasi parasit, perlu pemeriksaan lanjutan'),(4,5,1,'2026-11-12 12:34:59',2.00,38.00,'Tidak Ditemukan','Normal');
/*!40000 ALTER TABLE `cat_examinations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cats`
--

DROP TABLE IF EXISTS `cats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cats` (
  `cat_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `cat_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `breed` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fur_color` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `birth_date` date DEFAULT NULL,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_vaccinated` tinyint(1) NOT NULL DEFAULT '0',
  `last_vaccine_date` date DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`cat_id`),
  UNIQUE KEY `uq_cats_customer_cat` (`customer_id`,`cat_id`),
  CONSTRAINT `fk_cats_customers` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_cats_gender` CHECK ((`gender` in (_utf8mb4'Jantan',_utf8mb4'Betina')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cats`
--

LOCK TABLES `cats` WRITE;
/*!40000 ALTER TABLE `cats` DISABLE KEYS */;
INSERT INTO `cats` VALUES (1,1,'Milo','Persia',NULL,'Jantan','2023-04-12',NULL,1,'2025-08-10','Kucing aktif dan jinak'),(2,1,'Luna','Anggora',NULL,'Betina','2022-11-20',NULL,1,'2025-07-15','Menyukai makanan basah'),(3,3,'Oyen','Domestic Shorthair',NULL,'Jantan','2024-02-05',NULL,0,NULL,'Kucing aktif dan suka bermain'),(4,3,'Mochi','Persia',NULL,'Betina','2023-09-17',NULL,1,'2025-09-01','Memiliki bulu tebal'),(5,4,'Chiko','Maine Coon',NULL,'Jantan','2022-06-25',NULL,1,'2025-06-20','Ukuran tubuh cukup besar'),(6,4,'Cleo','Domestic Shorthair',NULL,'Betina','2024-01-10',NULL,0,NULL,'Kucing masih muda');
/*!40000 ALTER TABLE `cats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_customers_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,NULL,'Faril Akmal','0821882773772','farilakmal@gmail.com','Surabaya','2026-11-08 10:58:24'),(3,NULL,'Bernardinus Ravanelo','08237671231723','beravalenos@gmail.com','Surabaya','2026-11-12 12:27:50'),(4,NULL,'Muhammad Bhinar','0821371263273','mbhinar@gmail.com','Surabaya','2026-11-12 12:31:33');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_reports`
--

DROP TABLE IF EXISTS `daily_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `report_no` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stay_id` int NOT NULL,
  `reported_by` int NOT NULL,
  `report_date` date NOT NULL DEFAULT (curdate()),
  `session` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sehat',
  `eating_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activity_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `report_no` (`report_no`),
  UNIQUE KEY `uq_report_session` (`stay_id`,`report_date`,`session`),
  KEY `fk_rpt_usr` (`reported_by`),
  KEY `idx_reports_stay_date` (`stay_id`,`report_date`),
  CONSTRAINT `fk_rpt_stay` FOREIGN KEY (`stay_id`) REFERENCES `stay_records` (`stay_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rpt_usr` FOREIGN KEY (`reported_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_report_condition` CHECK ((`condition_status` in (_utf8mb4'Sehat',_utf8mb4'Perlu Perhatian',_utf8mb4'Sakit'))),
  CONSTRAINT `chk_report_session` CHECK ((`session` in (_utf8mb4'Pagi',_utf8mb4'Sore')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_reports`
--

LOCK TABLES `daily_reports` WRITE;
/*!40000 ALTER TABLE `daily_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `deliveries`
--

DROP TABLE IF EXISTS `deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deliveries` (
  `delivery_id` int NOT NULL AUTO_INCREMENT,
  `delivery_no` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reservation_id` int NOT NULL,
  `assigned_to` int DEFAULT NULL,
  `delivery_type` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `schedule_at` datetime NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Dijadwalkan',
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`delivery_id`),
  UNIQUE KEY `delivery_no` (`delivery_no`),
  KEY `fk_dlv_res` (`reservation_id`),
  KEY `fk_dlv_usr` (`assigned_to`),
  CONSTRAINT `fk_dlv_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dlv_usr` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_dlv_status` CHECK ((`status` in (_utf8mb4'Dijadwalkan',_utf8mb4'Dalam Perjalanan',_utf8mb4'Selesai',_utf8mb4'Dibatalkan'))),
  CONSTRAINT `chk_dlv_type` CHECK ((`delivery_type` in (_utf8mb4'Jemput',_utf8mb4'Antar')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deliveries`
--

LOCK TABLES `deliveries` WRITE;
/*!40000 ALTER TABLE `deliveries` DISABLE KEYS */;
/*!40000 ALTER TABLE `deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `number_sequences`
--

DROP TABLE IF EXISTS `number_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `number_sequences` (
  `prefix` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seq_date` date NOT NULL,
  `last_number` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`prefix`,`seq_date`),
  CONSTRAINT `chk_sequences_number` CHECK ((`last_number` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `number_sequences`
--

LOCK TABLES `number_sequences` WRITE;
/*!40000 ALTER TABLE `number_sequences` DISABLE KEYS */;
/*!40000 ALTER TABLE `number_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `payment_no` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reservation_id` int NOT NULL,
  `payment_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Menunggu',
  `proof_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `payment_no` (`payment_no`),
  KEY `fk_pay_usr` (`verified_by`),
  KEY `idx_pay_res` (`reservation_id`),
  CONSTRAINT `fk_pay_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pay_usr` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_pay_amount` CHECK ((`amount` > 0)),
  CONSTRAINT `chk_pay_method` CHECK ((`method` in (_utf8mb4'QRIS',_utf8mb4'Transfer',_utf8mb4'Tunai'))),
  CONSTRAINT `chk_pay_status` CHECK ((`status` in (_utf8mb4'Menunggu',_utf8mb4'Valid',_utf8mb4'Tidak Valid'))),
  CONSTRAINT `chk_pay_type` CHECK ((`payment_type` in (_utf8mb4'DP',_utf8mb4'Pelunasan')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation_details`
--

DROP TABLE IF EXISTS `reservation_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_details` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `service_id` int NOT NULL,
  `qty` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `subtotal` decimal(14,2) GENERATED ALWAYS AS ((`qty` * `unit_price`)) STORED,
  PRIMARY KEY (`detail_id`),
  KEY `fk_det_res` (`reservation_id`),
  KEY `fk_det_srv` (`service_id`),
  CONSTRAINT `fk_det_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_det_srv` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_det_price` CHECK ((`unit_price` >= 0)),
  CONSTRAINT `chk_det_qty` CHECK ((`qty` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation_details`
--

LOCK TABLES `reservation_details` WRITE;
/*!40000 ALTER TABLE `reservation_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `reservation_id` int NOT NULL AUTO_INCREMENT,
  `reservation_no` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int NOT NULL,
  `cat_id` int NOT NULL,
  `cage_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `reservation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `need_pickup` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Menunggu',
  `dp_amount` decimal(12,2) NOT NULL DEFAULT '100000.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  UNIQUE KEY `reservation_no` (`reservation_no`),
  KEY `fk_res_customer_cat` (`customer_id`,`cat_id`),
  KEY `fk_res_cages` (`cage_id`),
  KEY `fk_res_users` (`created_by`),
  KEY `idx_res_dates` (`check_in_date`,`check_out_date`),
  KEY `idx_res_status` (`status`),
  CONSTRAINT `fk_res_cages` FOREIGN KEY (`cage_id`) REFERENCES `cages` (`cage_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_customer_cat` FOREIGN KEY (`customer_id`, `cat_id`) REFERENCES `cats` (`customer_id`, `cat_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_customers` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_users` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_res_amounts` CHECK (((`dp_amount` >= 0) and (`total_amount` >= 0))),
  CONSTRAINT `chk_res_dates` CHECK ((`check_out_date` >= `check_in_date`)),
  CONSTRAINT `chk_res_status` CHECK ((`status` in (_utf8mb4'Menunggu',_utf8mb4'Dikonfirmasi',_utf8mb4'Ditolak',_utf8mb4'CheckIn',_utf8mb4'Selesai',_utf8mb4'Dibatalkan')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `service_id` int NOT NULL AUTO_INCREMENT,
  `service_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'per layanan',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`service_id`),
  CONSTRAINT `chk_services_price` CHECK ((`price` >= 0)),
  CONSTRAINT `chk_services_type` CHECK ((`service_type` in (_utf8mb4'Penitipan',_utf8mb4'Antar Jemput')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Penitipan Kucing','Penitipan',75000.00,'per hari',1),(2,'Antar Jemput','Antar Jemput',60000.00,'per layanan',1),(3,'Mandi Busa','Penitipan',70000.00,'Paket',0);
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stay_records`
--

DROP TABLE IF EXISTS `stay_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_records` (
  `stay_id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `checked_in_by` int NOT NULL,
  `checkin_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `weight_kg` decimal(5,2) NOT NULL,
  `temperature_c` decimal(4,1) NOT NULL,
  `parasite_found` tinyint(1) NOT NULL DEFAULT '0',
  `health_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_at` datetime DEFAULT NULL,
  `checked_out_by` int DEFAULT NULL,
  PRIMARY KEY (`stay_id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  KEY `fk_stay_in` (`checked_in_by`),
  KEY `fk_stay_out` (`checked_out_by`),
  CONSTRAINT `fk_stay_in` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stay_out` FOREIGN KEY (`checked_out_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stay_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_stay_weight` CHECK ((`weight_kg` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stay_records`
--

LOCK TABLES `stay_records` WRITE;
/*!40000 ALTER TABLE `stay_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `stay_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  CONSTRAINT `chk_users_role` CHECK ((`role` in (_utf8mb4'Owner',_utf8mb4'StafOperasional',_utf8mb4'StafAntarJemput',_utf8mb4'Pelanggan')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'owner','$2a$11$2fYyscurJLeEaxTtixPmveKvz8oW82b99VvUNlorQh5h.8gTZcUtO','Owner OemahPus','Owner',1,'2026-10-29 16:53:29'),(2,'staf01','GANTI_DENGAN_HASH','Staf Operasional 1','StafOperasional',1,'2026-10-29 16:53:29'),(3,'driver01','GANTI_DENGAN_HASH','Staf Antar Jemput 1','StafAntarJemput',1,'2026-10-29 16:53:29');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'omidb'
--

--
-- Dumping routines for database 'omidb'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_generate_number` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generate_number`(
    IN p_prefix VARCHAR(5),
    OUT p_result VARCHAR(25)
)
BEGIN
    DECLARE v_today DATE;
    DECLARE v_number INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_today = CURRENT_DATE;

    START TRANSACTION;

    -- Membuat baris awal jika belum ada.
    -- Jika sudah ada, baris yang sama tetap digunakan.
    INSERT IGNORE INTO number_sequences (
        prefix,
        seq_date,
        last_number
    )
    VALUES (
        p_prefix,
        v_today,
        0
    );

    -- Menambah nomor secara aman untuk baris tersebut.
    UPDATE number_sequences
    SET last_number = last_number + 1
    WHERE prefix = p_prefix
      AND seq_date = v_today;

    SELECT last_number
    INTO v_number
    FROM number_sequences
    WHERE prefix = p_prefix
      AND seq_date = v_today;

    COMMIT;

    SET p_result = CONCAT(
        p_prefix, '-',
        DATE_FORMAT(v_today, '%Y%m%d'), '-',
        LPAD(v_number, 4, '0')
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-15 15:29:32
