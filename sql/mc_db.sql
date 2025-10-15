-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 15, 2025 at 09:01 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mc_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_appointments`
--

CREATE TABLE `tbl_appointments` (
  `appointment_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `nurse_id` int(11) DEFAULT NULL,
  `secretary_id` int(11) DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `queue_number` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `appointment_reason_id` int(11) DEFAULT NULL,
  `appointment_notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_appointments`
--

INSERT INTO `tbl_appointments` (`appointment_id`, `patient_id`, `doctor_id`, `nurse_id`, `secretary_id`, `appointment_date`, `queue_number`, `status_id`, `appointment_reason_id`, `appointment_notes`, `created_at`, `updated_at`) VALUES
(12, 9, 1, NULL, 1, '2025-08-29', 1, 9, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(15, 9, 1, NULL, 1, '2025-08-20', 3, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(16, 13, 1, NULL, 1, '2025-08-26', 4, 9, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(17, 10, 2, NULL, 1, '2025-08-25', 1, 6, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(19, 9, 2, NULL, NULL, '2025-08-16', 1, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(20, 9, 3, NULL, NULL, '2025-08-08', 1, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(21, 9, 2, NULL, NULL, '2025-08-21', 1, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(22, 9, NULL, NULL, NULL, '2025-08-21', NULL, 6, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(23, 9, NULL, NULL, NULL, '2025-08-21', NULL, 6, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(24, 9, NULL, NULL, NULL, '2025-08-21', NULL, 6, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(25, 9, NULL, NULL, NULL, '2025-08-01', NULL, 6, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(26, 9, NULL, NULL, NULL, '2025-08-28', NULL, 6, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(27, 9, 1, NULL, NULL, '2025-08-24', 1, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(28, 12, 3, NULL, NULL, '2025-08-26', 5, 9, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(29, 9, 1, NULL, 1, '2025-08-28', 1, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(30, 10, 2, NULL, 1, '2025-08-28', 2, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(31, 12, 3, NULL, 1, '2025-08-28', 3, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(32, 13, 1, NULL, 1, '2025-08-28', 4, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(33, 14, 2, NULL, 1, '2025-08-28', 5, 7, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(34, 19, 3, NULL, NULL, '2025-08-29', 2, 9, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(35, 19, 1, NULL, NULL, '2025-08-29', 3, 9, NULL, NULL, '2025-09-06 05:47:10', '2025-09-06 05:47:10'),
(36, 15, 2, NULL, NULL, '2025-09-06', 1, 9, 7, 'likod', '2025-09-06 06:23:02', '2025-09-06 06:56:27'),
(37, 15, 1, NULL, NULL, '2025-09-06', 2, 9, 3, NULL, '2025-09-06 06:56:51', '2025-09-06 07:04:53'),
(38, 10, 8, NULL, NULL, '2025-09-06', 3, 9, 3, NULL, '2025-09-06 07:04:35', '2025-09-06 08:39:15'),
(39, 6, 1, NULL, NULL, '2025-09-05', 1, 9, NULL, NULL, '2025-09-06 07:37:29', '2025-09-06 07:40:14'),
(40, 14, 2, NULL, NULL, '2025-09-06', 4, 9, 13, 'as', '2025-09-06 08:38:45', '2025-09-06 08:49:48'),
(41, 10, 2, NULL, NULL, '2025-09-06', 5, 9, 7, NULL, '2025-09-06 09:01:15', '2025-09-06 10:23:42'),
(42, 20, 1, NULL, NULL, '2025-09-06', 6, 9, 7, 'agay', '2025-09-06 11:06:49', '2025-09-06 11:14:48'),
(43, 22, 3, NULL, NULL, '2025-09-06', 7, 9, 3, NULL, '2025-09-06 15:06:42', '2025-09-06 15:24:35'),
(44, 15, 1, NULL, NULL, '2025-09-06', 8, 9, 7, 'likod', '2025-09-06 15:31:07', '2025-09-06 15:45:20'),
(45, 15, 2, NULL, NULL, '2025-09-06', 9, 9, 13, 'checkup', '2025-09-06 15:57:56', '2025-09-06 16:02:05'),
(46, 15, 2, NULL, NULL, '2025-09-06', 10, 9, 13, 'qwe', '2025-09-06 16:20:43', '2025-09-06 16:24:11'),
(47, 15, 2, NULL, NULL, '2025-09-06', 12, 9, 7, NULL, '2025-09-06 16:26:20', '2025-09-06 16:55:39'),
(48, 15, 2, NULL, NULL, '2025-09-06', 11, 9, 4, 'can i view', '2025-09-06 16:26:34', '2025-09-06 16:36:09'),
(49, 15, 1, NULL, NULL, '2025-09-06', 13, 9, 10, 'i want to follow uo', '2025-09-06 16:58:34', '2025-09-06 17:00:33'),
(50, 10, 3, NULL, NULL, '2025-09-06', 14, 9, 7, NULL, '2025-09-06 17:14:57', '2025-09-06 17:17:36'),
(51, 15, 2, NULL, NULL, '2025-09-11', 1, 9, 3, 'asd', '2025-09-11 18:07:42', '2025-09-11 18:09:41'),
(52, 15, 2, NULL, NULL, '2025-09-11', 2, 9, 3, 'check', '2025-09-11 21:00:11', '2025-09-11 21:05:11'),
(53, 15, 1, NULL, NULL, '2025-09-11', 3, 9, 3, NULL, '2025-09-11 22:02:17', '2025-09-11 23:10:32'),
(54, 15, 2, NULL, NULL, '2025-09-11', 4, 7, 8, NULL, '2025-09-11 23:08:12', '2025-09-11 23:08:23'),
(55, 23, NULL, NULL, NULL, '2025-09-16', NULL, 6, 5, 'fghcjgh', '2025-09-12 16:20:41', '2025-09-12 16:20:41'),
(56, 23, NULL, NULL, NULL, '2025-09-20', NULL, 6, 9, 'asdasdsas', '2025-09-12 16:21:15', '2025-09-12 16:21:15'),
(57, 23, 3, NULL, NULL, '2025-09-27', 1, 7, 3, 'sadas', '2025-09-12 16:21:25', '2025-09-12 16:23:40'),
(58, 23, NULL, NULL, NULL, '2025-11-12', NULL, 6, 3, 'asd', '2025-09-12 16:24:14', '2025-09-12 16:24:14'),
(59, 23, 1, NULL, NULL, '2025-09-12', 1, 9, 3, 'asd', '2025-09-12 16:24:30', '2025-09-12 18:37:39'),
(60, 15, 2, NULL, NULL, '2025-09-12', 2, 17, 3, 'vgvg', '2025-09-12 18:36:28', '2025-09-12 18:37:39'),
(61, 15, 3, NULL, NULL, '2025-09-13', 1, 9, 1, 'asd', '2025-09-13 13:13:33', '2025-09-13 13:17:26'),
(62, 10, 1, NULL, NULL, '2025-09-13', 2, 9, 3, 'asd', '2025-09-13 13:21:06', '2025-09-13 13:50:55'),
(63, 24, 2, NULL, NULL, '2025-09-13', 3, 9, 7, 'sakit likod :(', '2025-09-13 14:21:54', '2025-09-13 14:38:20'),
(64, 12, NULL, NULL, NULL, '2025-10-11', 1, 7, 3, 'Walk-in reason: dasd\n\nasd', '2025-10-11 15:16:19', '2025-10-11 15:16:19'),
(65, 15, 2, NULL, NULL, '2025-10-15', 1, 9, 10, 'HAHAHHA', '2025-10-15 13:21:41', '2025-10-15 14:15:16'),
(66, 15, 2, NULL, NULL, '2025-10-15', 4, 7, 12, 'asd', '2025-10-15 14:19:36', '2025-10-15 14:36:51'),
(67, 15, 2, NULL, NULL, '2025-10-15', 2, 9, 1, 'asd', '2025-10-15 14:19:43', '2025-10-15 14:24:57'),
(68, 13, 10, NULL, NULL, '2025-10-15', 3, 9, 4, '12ad', '2025-10-15 14:21:00', '2025-10-15 14:36:25');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_appointment_reasons`
--

CREATE TABLE `tbl_appointment_reasons` (
  `reason_id` int(11) NOT NULL,
  `reason_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_appointment_reasons`
--

INSERT INTO `tbl_appointment_reasons` (`reason_id`, `reason_name`, `description`, `is_active`, `created_at`) VALUES
(1, 'Fever & Cough', 'Common symptoms requiring medical attention', 1, '2025-09-06 05:47:10'),
(2, 'Skin Allergy', 'Skin conditions and allergic reactions', 1, '2025-09-06 05:47:10'),
(3, 'Check-up', 'Regular health examination', 1, '2025-09-06 05:47:10'),
(4, 'Lab Results Review', 'Follow-up consultation for laboratory results', 1, '2025-09-06 05:47:10'),
(5, 'Headache', 'Head pain and related symptoms', 1, '2025-09-06 05:47:10'),
(6, 'Stomach Pain', 'Abdominal discomfort and digestive issues', 1, '2025-09-06 05:47:10'),
(7, 'Back Pain', 'Spinal and back-related pain', 1, '2025-09-06 05:47:10'),
(8, 'Dental Issues', 'Oral health problems', 1, '2025-09-06 05:47:10'),
(9, 'Eye Problems', 'Vision and eye-related issues', 1, '2025-09-06 05:47:10'),
(10, 'Follow-up', 'Follow-up appointment for previous consultation', 1, '2025-09-06 05:47:10'),
(11, 'Vaccination', 'Immunization and vaccine administration', 1, '2025-09-06 05:47:10'),
(12, 'Prenatal Care', 'Pregnancy-related healthcare', 1, '2025-09-06 05:47:10'),
(13, 'Chronic Disease Management', 'Ongoing treatment for chronic conditions', 1, '2025-09-06 05:47:10'),
(14, 'Emergency', 'Urgent medical attention required', 1, '2025-09-06 05:47:10'),
(15, 'Other', 'Other medical concerns not listed above', 1, '2025-09-06 05:47:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_conditions`
--

CREATE TABLE `tbl_conditions` (
  `condition_id` int(11) NOT NULL,
  `condition_name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_conditions`
--

INSERT INTO `tbl_conditions` (`condition_id`, `condition_name`, `created_at`) VALUES
(1, 'Cough', '2025-08-22 09:13:31'),
(2, 'Common Cold', '2025-08-22 09:13:31'),
(3, 'Fever', '2025-08-22 09:13:31'),
(4, 'Hypertension', '2025-08-22 09:13:31'),
(5, 'Type 2 Diabetes', '2025-08-22 09:13:31'),
(6, 'Upper Respiratory Tract Infection', '2025-08-22 09:13:31'),
(7, 'Gastroenteritis', '2025-08-22 09:13:31'),
(8, 'AGAY', '2025-08-22 20:29:32'),
(9, 'as', '2025-09-06 10:00:24'),
(10, 'test123', '2025-09-06 11:12:23'),
(11, 'hehe', '2025-09-06 11:14:13'),
(12, 'hjhvj', '2025-09-06 15:39:54'),
(14, 'sakit', '2025-09-06 16:00:48'),
(15, 'Diabetes', '2025-09-11 17:44:27');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_consultations`
--

CREATE TABLE `tbl_consultations` (
  `consultation_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `nurse_id` int(11) DEFAULT NULL,
  `patient_id` int(11) NOT NULL,
  `diagnosis` varchar(255) NOT NULL,
  `consultation_notes` text DEFAULT NULL,
  `next_appointment_date` date DEFAULT NULL,
  `next_appointment_notes` text DEFAULT NULL,
  `consultation_status` enum('Active','Completed','Follow-up Required','Triage','Ready for Doctor') DEFAULT 'Active',
  `nurse_completed_at` datetime DEFAULT NULL,
  `patient_ready_for_doctor` tinyint(1) DEFAULT 0,
  `nurse_notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `illness_id` int(11) DEFAULT NULL,
  `condition_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_consultations`
--

INSERT INTO `tbl_consultations` (`consultation_id`, `appointment_id`, `doctor_id`, `nurse_id`, `patient_id`, `diagnosis`, `consultation_notes`, `next_appointment_date`, `next_appointment_notes`, `consultation_status`, `nurse_completed_at`, `patient_ready_for_doctor`, `nurse_notes`, `created_at`, `updated_at`, `illness_id`, `condition_id`) VALUES
(1, 12, 1, NULL, 9, 'Upper Respiratory Tract Infection', 'Patient presents with cough, sore throat, and mild fever. Prescribed antibiotics and rest.', '2025-08-25', 'Follow-up to check if symptoms improved', 'Completed', NULL, 0, NULL, '2025-08-15 10:45:00', '2025-08-15 10:45:00', NULL, NULL),
(3, 15, 1, NULL, 9, 'Type 2 Diabetes', 'Fasting blood sugar: 140 mg/dL. Diet and exercise plan prescribed. Patient needs regular monitoring.', '2025-08-30', 'Blood sugar check and medication adjustment', 'Follow-up Required', NULL, 0, NULL, '2025-08-20 11:15:00', '2025-08-20 11:15:00', NULL, NULL),
(4, 23, 1, NULL, 9, 'Common Cold', 'Mild symptoms, rest and fluids recommended', NULL, NULL, 'Completed', NULL, 0, NULL, '2025-08-23 15:14:44', '2025-08-23 15:14:44', NULL, NULL),
(7, 16, 1, NULL, 13, 'Cough', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-08-26 15:32:03', '2025-08-26 15:32:03', NULL, NULL),
(8, 28, 3, NULL, 12, 'Fever', 'fevah', NULL, '', 'Completed', NULL, 0, NULL, '2025-08-26 21:28:57', '2025-08-26 21:28:57', NULL, NULL),
(10, 12, 1, NULL, 9, 'Type 2 Diabetes', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-08-29 20:32:39', '2025-08-29 20:32:39', NULL, NULL),
(11, 35, 1, NULL, 19, 'Hypertension', 'as', NULL, '', 'Completed', NULL, 0, NULL, '2025-08-29 20:57:06', '2025-08-29 20:57:06', NULL, NULL),
(12, 34, 3, NULL, 19, 'Common Cold', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-08-29 20:58:11', '2025-08-29 20:58:11', NULL, NULL),
(13, 39, 1, NULL, 6, 'Hypertension', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 07:40:14', '2025-09-06 07:40:14', NULL, NULL),
(14, 40, 2, NULL, 14, 'Cough', 'ubo ', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 08:49:48', '2025-09-06 08:49:48', NULL, NULL),
(15, 41, 2, NULL, 10, 'Cough', 'as', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 10:23:42', '2025-09-06 10:23:42', NULL, NULL),
(16, 42, 1, NULL, 20, 'as', 'qwe', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 11:14:48', '2025-09-06 11:14:48', NULL, NULL),
(17, 43, 3, NULL, 22, 'Fever', 'lanat', '2025-09-09', 'lanat pa gyapon', 'Completed', NULL, 0, NULL, '2025-09-06 15:24:35', '2025-09-06 15:24:35', NULL, NULL),
(18, 44, 1, NULL, 15, 'AGAY, Cough', 'as', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 15:45:20', '2025-09-06 15:45:20', NULL, NULL),
(19, 45, 2, NULL, 15, 'AGAY, test123', 'as', '2025-09-07', 'please ', 'Completed', NULL, 0, NULL, '2025-09-06 16:02:05', '2025-09-06 16:02:05', NULL, NULL),
(20, 46, 2, NULL, 15, 'sakit', '12asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 16:24:11', '2025-09-06 16:24:11', NULL, NULL),
(21, 48, 2, NULL, 15, 'Common Cold', 'fever', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 16:36:09', '2025-09-06 16:36:09', NULL, NULL),
(22, 47, 2, NULL, 15, 'Upper Respiratory Tract Infection', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 16:55:39', '2025-09-06 16:55:39', NULL, NULL),
(23, 49, 1, NULL, 15, 'Common Cold', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 17:00:33', '2025-09-06 17:00:33', NULL, NULL),
(24, 50, 3, NULL, 10, 'Cough', 'b b', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-06 17:17:36', '2025-09-06 17:17:36', NULL, NULL),
(25, 51, 2, NULL, 15, 'Hypertension', 'hahays', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-11 18:09:41', '2025-09-11 18:09:41', NULL, NULL),
(26, 52, 2, NULL, 15, 'Diabetes', 'qeqwe', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-11 21:05:11', '2025-09-11 21:05:11', NULL, NULL),
(27, 53, 1, NULL, 15, 'Gastroenteritis', 'inom gaviscon ', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-11 23:10:31', '2025-09-11 23:10:31', 6, 7),
(29, 61, 3, NULL, 15, 'Type 2 Diabetes', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-13 13:17:26', '2025-09-13 13:17:26', NULL, NULL),
(30, 62, 1, NULL, 10, 'Hypertension', 'asd', NULL, '', 'Completed', NULL, 0, NULL, '2025-09-13 13:50:55', '2025-09-13 13:50:55', NULL, NULL),
(31, 63, 2, NULL, 24, 'Fever, AGAY', 'avoid agay', '2025-09-14', 'ugma dayun', 'Completed', NULL, 0, NULL, '2025-09-13 14:38:20', '2025-09-13 14:38:20', NULL, NULL),
(32, 66, 2, NULL, 15, '', NULL, NULL, NULL, 'Triage', NULL, 0, NULL, '2025-10-15 14:50:42', '2025-10-15 14:50:42', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_consultation_history`
--

CREATE TABLE `tbl_consultation_history` (
  `consultation_id` int(11) NOT NULL,
  `present_illness` text DEFAULT NULL,
  `past_medical_history` text DEFAULT NULL,
  `past_surgical_history` text DEFAULT NULL,
  `family_history` text DEFAULT NULL,
  `social_history` text DEFAULT NULL,
  `current_medications` text DEFAULT NULL,
  `nurse_assessment` text DEFAULT NULL,
  `chief_complaint` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_consultation_history`
--

INSERT INTO `tbl_consultation_history` (`consultation_id`, `present_illness`, `past_medical_history`, `past_surgical_history`, `family_history`, `social_history`, `current_medications`, `nurse_assessment`, `chief_complaint`, `created_at`, `updated_at`) VALUES
(26, 'as', 'asd', 'as', 'das', 'asd', 'asd', NULL, NULL, '2025-09-11 21:05:11', '2025-09-11 21:05:11'),
(27, 'Diarrhea, Abdominal Pain', 'None ', 'None ', 'None ', 'None ', 'none', NULL, NULL, '2025-09-11 23:10:31', '2025-09-11 23:10:31'),
(29, 'Headache, Fever', 'none', 'none', 'none ', 'none ', 'none ', NULL, NULL, '2025-09-13 13:17:26', '2025-09-13 13:17:26'),
(30, 'Common Cold', 'as', 'as', 'as', 'as', 'sa', NULL, NULL, '2025-09-13 13:50:55', '2025-09-13 13:50:55'),
(31, 'sakit likod', 'shrimp ', 'none ', 'none ', 'none', 'none', NULL, NULL, '2025-09-13 14:38:20', '2025-09-13 14:38:20'),
(32, NULL, 'asd', NULL, 'asd', 'asd', 'asd', NULL, 'asda', '2025-10-15 14:50:42', '2025-10-15 14:50:42');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_consultation_lifestyle`
--

CREATE TABLE `tbl_consultation_lifestyle` (
  `lifestyle_id` int(11) NOT NULL,
  `consultation_id` int(11) NOT NULL,
  `smoking_status` enum('Yes','No') DEFAULT NULL,
  `smoking_packs_per_day` varchar(10) DEFAULT NULL,
  `alcohol_use` enum('Yes','No') DEFAULT NULL,
  `alcohol_frequency` varchar(50) DEFAULT NULL,
  `sexual_activity` enum('Active','Not Active') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_consultation_lifestyle`
--

INSERT INTO `tbl_consultation_lifestyle` (`lifestyle_id`, `consultation_id`, `smoking_status`, `smoking_packs_per_day`, `alcohol_use`, `alcohol_frequency`, `sexual_activity`, `created_at`, `updated_at`) VALUES
(1, 26, 'Yes', '2', 'No', 'huwaw', 'Not Active', '2025-09-11 21:05:11', '2025-09-11 21:05:11'),
(2, 27, 'No', NULL, 'No', NULL, 'Not Active', '2025-09-11 23:10:31', '2025-09-11 23:10:31'),
(3, 29, 'No', NULL, 'No', NULL, 'Not Active', '2025-09-13 13:17:26', '2025-09-13 13:17:26'),
(4, 30, 'No', NULL, 'No', NULL, 'Not Active', '2025-09-13 13:50:55', '2025-09-13 13:50:55'),
(5, 31, 'No', NULL, 'No', NULL, 'Not Active', '2025-09-13 14:38:20', '2025-09-13 14:38:20');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_consultation_summary`
--

CREATE TABLE `tbl_consultation_summary` (
  `consultation_id` int(11) NOT NULL,
  `symptoms_text` text DEFAULT NULL,
  `final_diagnosis` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_consultation_summary`
--

INSERT INTO `tbl_consultation_summary` (`consultation_id`, `symptoms_text`, `final_diagnosis`, `created_at`, `updated_at`) VALUES
(26, 'wqeqweqwe', NULL, '2025-09-11 21:05:11', '2025-09-11 21:05:11'),
(27, NULL, 'ACID REFLUX', '2025-09-11 23:10:32', '2025-09-11 23:10:32'),
(29, NULL, 'diabetes', '2025-09-13 13:17:26', '2025-09-13 13:17:26'),
(30, NULL, 'ACIDE REFLUX', '2025-09-13 13:50:55', '2025-09-13 13:50:55'),
(31, NULL, 'The patient has Agay FEver', '2025-09-13 14:38:20', '2025-09-13 14:38:20');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_consultation_vitals`
--

CREATE TABLE `tbl_consultation_vitals` (
  `consultation_id` int(11) NOT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `blood_pressure_mmHg` varchar(15) DEFAULT NULL,
  `heart_rate_bpm` int(11) DEFAULT NULL,
  `spo2_percent` decimal(5,2) DEFAULT NULL,
  `temperature_celsius` decimal(4,2) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_consultation_vitals`
--

INSERT INTO `tbl_consultation_vitals` (`consultation_id`, `height_cm`, `weight_kg`, `blood_pressure_mmHg`, `heart_rate_bpm`, `spo2_percent`, `temperature_celsius`, `created_at`, `updated_at`) VALUES
(25, 120.00, 65.00, '80', 72, 85.00, NULL, '2025-09-11 18:09:41', '2025-09-11 18:09:41'),
(26, 12.00, 323.00, '23', 23, 23.00, NULL, '2025-09-11 21:05:11', '2025-09-11 21:05:11'),
(27, 152.00, 40.00, '80', 73, 98.00, NULL, '2025-09-11 23:10:31', '2025-09-11 23:10:31'),
(29, 156.00, 43.00, '222', 123, 123.00, NULL, '2025-09-13 13:17:26', '2025-09-13 13:17:26'),
(30, 156.00, 43.00, '222', 123, 123.00, NULL, '2025-09-13 13:50:55', '2025-09-13 13:50:55'),
(31, 155.00, 76.00, '80', 72, 12.00, NULL, '2025-09-13 14:38:20', '2025-09-13 14:38:20'),
(32, 170.00, 65.00, '21', 21, 23.00, NULL, '2025-10-15 14:50:42', '2025-10-15 14:50:42');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_current_queue`
--

CREATE TABLE `tbl_current_queue` (
  `queue_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `current_appointment_id` int(11) DEFAULT NULL COMMENT 'Currently being consulted',
  `next_appointment_id` int(11) DEFAULT NULL COMMENT 'Next in queue',
  `last_updated_by` int(11) DEFAULT NULL COMMENT 'Secretary who last updated',
  `last_updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_current_queue`
--

INSERT INTO `tbl_current_queue` (`queue_id`, `date`, `current_appointment_id`, `next_appointment_id`, `last_updated_by`, `last_updated_at`) VALUES
(1, '2025-08-26', 28, NULL, 11, '2025-08-26 21:28:01'),
(3, '2025-08-27', NULL, NULL, 11, '2025-08-27 10:13:45'),
(4, '2025-08-28', NULL, NULL, 11, '2025-08-29 20:20:15'),
(5, '2025-08-29', 34, NULL, 11, '2025-08-29 20:57:33'),
(8, '2025-09-06', 50, NULL, 11, '2025-09-06 17:16:05'),
(11, '2025-09-05', 39, NULL, 1, '2025-09-06 07:37:29'),
(23, '2025-09-11', 53, NULL, 11, '2025-09-11 22:02:48'),
(26, '2025-09-12', 60, NULL, 11, '2025-09-12 18:37:39'),
(28, '2025-09-13', 63, NULL, 11, '2025-09-13 14:27:27'),
(31, '2025-10-15', NULL, NULL, 11, '2025-10-15 14:36:25');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_doctors`
--

CREATE TABLE `tbl_doctors` (
  `doctor_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `license_number` varchar(100) NOT NULL,
  `specialization_id` int(11) DEFAULT NULL,
  `years_experience` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_doctors`
--

INSERT INTO `tbl_doctors` (`doctor_id`, `user_id`, `license_number`, `specialization_id`, `years_experience`, `created_at`, `updated_at`) VALUES
(1, 1, '12345', 1, 5, '2025-08-09 02:19:33', '2025-08-17 12:40:39'),
(2, 26, '67890', 2, 8, '2025-08-17 04:01:53', '2025-08-17 04:01:53'),
(3, 39, '11111', 3, 12, '2025-08-17 11:04:26', '2025-08-17 11:04:26'),
(8, 44, 'aadsdqwe123123', 5, 2, '2025-08-25 14:59:12', '2025-08-25 14:59:12'),
(9, 58, '292929', 7, 2, '2025-09-06 09:18:29', '2025-09-06 09:18:29'),
(10, 64, '654', 1, 2, '2025-09-13 12:34:26', '2025-09-13 12:34:26');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_doctor_queue`
--

CREATE TABLE `tbl_doctor_queue` (
  `queue_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `status` enum('Waiting','In Progress','Completed') DEFAULT 'Waiting',
  `assigned_at` datetime DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_illnesses`
--

CREATE TABLE `tbl_illnesses` (
  `illness_id` int(11) NOT NULL,
  `illness_name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_illnesses`
--

INSERT INTO `tbl_illnesses` (`illness_id`, `illness_name`, `created_at`) VALUES
(1, 'Cough', '2025-09-11 21:58:13'),
(2, 'Common Cold', '2025-09-11 21:58:13'),
(3, 'Fever', '2025-09-11 21:58:13'),
(4, 'Sore Throat', '2025-09-11 21:58:13'),
(5, 'Headache', '2025-09-11 21:58:13'),
(6, 'Abdominal Pain', '2025-09-11 21:58:13'),
(7, 'Nausea', '2025-09-11 21:58:13'),
(8, 'Vomiting', '2025-09-11 21:58:13'),
(9, 'Diarrhea', '2025-09-11 21:58:13'),
(10, 'Dizziness', '2025-09-11 21:58:13'),
(11, 'wqw', '2025-09-11 22:08:15'),
(12, 'qw', '2025-09-11 22:08:19'),
(13, 'asd', '2025-09-13 05:06:23'),
(14, 'sakit likod', '2025-09-13 14:27:07');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_lab_requests`
--

CREATE TABLE `tbl_lab_requests` (
  `lab_request_id` int(11) NOT NULL,
  `consultation_id` int(11) DEFAULT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `secretary_id` int(11) DEFAULT NULL,
  `patient_id` int(11) NOT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `lab_test_type_id` int(11) DEFAULT NULL,
  `request_text` text NOT NULL,
  `status_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lab_requests`
--

INSERT INTO `tbl_lab_requests` (`lab_request_id`, `consultation_id`, `doctor_id`, `secretary_id`, `patient_id`, `appointment_id`, `lab_test_type_id`, `request_text`, `status_id`, `created_at`, `updated_at`) VALUES
(1, NULL, 1, 1, 9, 12, 1, 'Complete Blood Count (CBC) - Patient experiencing fatigue and weakness', 15, '2025-08-15 10:30:00', '2025-09-06 16:16:36'),
(5, NULL, 1, 1, 10, NULL, 5, 'Liver Function Test - Pre-surgery requirement', 16, '2025-08-19 16:30:00', '2025-08-17 02:11:36'),
(6, NULL, 3, NULL, 12, 28, 3, 'asd', 15, '2025-08-26 21:28:57', '2025-09-06 17:23:42'),
(8, NULL, 3, NULL, 19, 34, 4, 'as', 15, '2025-08-29 20:58:11', '2025-09-06 17:20:12'),
(9, NULL, 1, NULL, 6, 39, 4, 'asd', 16, '2025-09-06 07:40:14', '2025-09-06 18:02:29'),
(10, NULL, 2, NULL, 14, 40, 2, 'blood', 16, '2025-09-06 08:49:48', '2025-09-06 09:10:11'),
(12, NULL, 2, NULL, 15, 45, 2, 'test 123', 15, '2025-09-06 16:02:05', '2025-09-06 16:12:35'),
(13, NULL, 2, NULL, 15, 46, 1, 'cbc  lang', 15, '2025-09-06 16:24:11', '2025-09-06 16:24:35'),
(14, NULL, 2, NULL, 15, 48, 5, 'asd', 15, '2025-09-06 16:36:09', '2025-09-06 16:44:57'),
(15, NULL, 2, NULL, 15, 47, 1, 'asd', 14, '2025-09-06 16:55:39', '2025-09-06 16:55:39'),
(16, NULL, 1, NULL, 15, 49, 2, 'sa', 15, '2025-09-06 17:00:33', '2025-09-06 17:00:44'),
(17, NULL, 3, NULL, 10, 50, 4, 'sad', 15, '2025-09-06 17:17:36', '2025-09-06 17:18:05'),
(18, NULL, 1, NULL, 10, 62, 4, 'asd', 16, '2025-09-13 13:50:55', '2025-09-13 13:55:42'),
(19, NULL, 2, NULL, 24, 63, 1, 'kay agay', 14, '2025-09-13 14:38:20', '2025-09-13 14:38:20');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_lab_results`
--

CREATE TABLE `tbl_lab_results` (
  `result_id` int(11) NOT NULL,
  `lab_request_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `result_file` varchar(255) DEFAULT NULL,
  `result_text` text DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `status_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lab_results`
--

INSERT INTO `tbl_lab_results` (`result_id`, `lab_request_id`, `patient_id`, `doctor_id`, `result_file`, `result_text`, `uploaded_by`, `uploaded_at`, `status_id`) VALUES
(3, 5, 10, 1, NULL, 'ALT: 25 U/L (Normal: 7-55)\nAST: 28 U/L (Normal: 8-48)\nAlkaline Phosphatase: 70 U/L (Normal: 44-147)\nTotal Bilirubin: 0.8 mg/dL (Normal: 0.3-1.2)\n\nResults: Normal liver function\n\nCleared for surgery', 5, '2025-08-19 17:45:00', 15),
(14, 10, 14, 2, NULL, 'result test\nasd', 26, '2025-09-06 09:05:59', 15),
(15, 10, 14, 2, NULL, 'result test\n', 26, '2025-09-06 09:05:59', 16),
(17, 10, 14, 2, NULL, 'result test\n', 26, '2025-09-06 09:06:04', 16),
(18, 12, 15, 2, NULL, 'asdasd', 26, '2025-09-06 16:12:35', 15),
(19, 12, 15, 2, NULL, 'asd', 26, '2025-09-06 16:12:35', 15),
(20, 9, 6, 1, NULL, 'aasd', 1, '2025-09-06 16:14:26', 16),
(21, 9, 6, 1, NULL, 'asd', 1, '2025-09-06 16:14:26', 15),
(22, 12, 15, 2, NULL, 'asd', 26, '2025-09-06 16:15:40', 15),
(23, 12, 15, 2, NULL, 'asd', 26, '2025-09-06 16:15:40', 15),
(24, 1, 9, 1, NULL, 'asd', 1, '2025-09-06 16:16:36', 15),
(25, 1, 9, 1, NULL, 'asd', 1, '2025-09-06 16:16:36', 15),
(26, 13, 15, 2, NULL, 'cbc result ', 26, '2025-09-06 16:24:35', 15),
(27, 13, 15, 2, NULL, 'cbc result ', 26, '2025-09-06 16:24:35', 15),
(28, 13, 15, 2, NULL, 'cbc result ', 26, '2025-09-06 16:26:03', 15),
(29, 13, 15, 2, NULL, 'cbc result ', 26, '2025-09-06 16:26:03', 15),
(30, 14, 15, 2, NULL, 'asd', 26, '2025-09-06 16:44:57', 15),
(31, 14, 15, 2, NULL, 'asd', 26, '2025-09-06 16:44:57', 15),
(32, 14, 15, 2, NULL, 'asd', 26, '2025-09-06 16:45:28', 15),
(33, 14, 15, 2, NULL, 'asd', 26, '2025-09-06 16:45:28', 15),
(34, 16, 15, 1, NULL, 'asd', 1, '2025-09-06 17:00:44', 15),
(35, 16, 15, 1, NULL, 'asd', 1, '2025-09-06 17:01:04', 15),
(36, 17, 10, 3, NULL, 'asdasdasda', 39, '2025-09-06 17:18:05', 15),
(37, 8, 19, 3, NULL, 'vvgvvtf', 39, '2025-09-06 17:20:12', 15),
(38, 8, 19, 3, NULL, 'vvgvvtf', 39, '2025-09-06 17:23:33', 15),
(39, 6, 12, 3, NULL, 'knjnjn', 39, '2025-09-06 17:23:42', 15),
(40, 18, 10, 1, NULL, 'result', 1, '2025-09-13 13:53:16', 16);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_lab_test_types`
--

CREATE TABLE `tbl_lab_test_types` (
  `lab_test_type_id` int(11) NOT NULL,
  `type_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lab_test_types`
--

INSERT INTO `tbl_lab_test_types` (`lab_test_type_id`, `type_name`, `description`, `price`, `created_at`, `updated_at`) VALUES
(1, 'Complete Blood Count (CBC)', 'Measures red/white cells, hemoglobin, etc.', 500.00, '2025-08-10 15:35:40', '2025-08-27 10:34:11'),
(2, 'Blood Sugar Test', 'Measures glucose levels for diabetes screening/monitoring', 300.00, '2025-08-10 15:35:40', '2025-08-27 10:34:11'),
(3, 'Urinalysis', 'Checks urine components to detect disorders', 250.00, '2025-08-10 15:35:40', '2025-08-27 10:34:11'),
(4, 'Lipid Profile', 'Measures cholesterol and triglycerides', 600.00, '2025-08-10 15:35:40', '2025-08-27 10:34:11'),
(5, 'Liver Function Test', 'Assesses liver enzymes and proteins', 800.00, '2025-08-10 15:35:40', '2025-08-27 10:34:11');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicines`
--

CREATE TABLE `tbl_medicines` (
  `medicine_id` int(11) NOT NULL,
  `generic_id` int(11) NOT NULL,
  `strength` varchar(100) DEFAULT NULL,
  `form_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicines`
--

INSERT INTO `tbl_medicines` (`medicine_id`, `generic_id`, `strength`, `form_id`, `price`, `created_at`, `updated_at`) VALUES
(1, 1, '500mg', 1, 50.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(2, 2, '400mg', 1, 80.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(3, 3, '250mg', 3, 120.00, '2025-08-10 15:35:40', '2025-08-31 22:40:28'),
(5, 6, '500mg', 1, 12.00, '2025-08-10 17:43:53', '2025-08-10 17:43:53'),
(8, 4, '100mg', 1, 13.00, '2025-08-16 16:42:39', '2025-08-16 16:42:39'),
(9, 5, '20mg', 3, 25.00, '2025-08-16 16:42:39', '2025-08-16 16:42:39'),
(10, 7, '250mg', 4, 12.00, '2025-08-22 17:14:05', '2025-08-22 17:14:05'),
(14, 8, '10000mg', 3, 21.00, '2025-08-23 12:40:08', '2025-08-23 12:40:08'),
(15, 6, '100mg', 3, 12.00, '2025-08-23 12:42:47', '2025-08-23 12:42:47'),
(16, 6, '100mg', 3, 12.00, '2025-08-23 12:42:47', '2025-08-23 12:42:47');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_forms`
--

CREATE TABLE `tbl_medicine_forms` (
  `form_id` int(11) NOT NULL,
  `form_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_forms`
--

INSERT INTO `tbl_medicine_forms` (`form_id`, `form_name`) VALUES
(1, 'tablet'),
(2, 'syrup'),
(3, 'capsule'),
(4, 'ointment'),
(5, 'injection');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_generic_names`
--

CREATE TABLE `tbl_medicine_generic_names` (
  `generic_id` int(11) NOT NULL,
  `generic_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_generic_names`
--

INSERT INTO `tbl_medicine_generic_names` (`generic_id`, `generic_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Paracetamol', 'Common pain reliever and fever reducer', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(2, 'Ibuprofen', 'Non-steroidal anti-inflammatory drug (NSAID)', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(3, 'Amoxicillin', 'Broad-spectrum antibiotic', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(4, 'Aspirin', 'Salicylate drug used to treat pain, fever, and inflammation', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(5, 'Omeprazole', 'Proton pump inhibitor used to treat acid reflux', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(6, 'Biogesic', 'Brand name for Paracetamol - pain reliever and fever reducer', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(7, 'Generic Medicine A', 'Generic medicine for testing purposes', '2025-08-28 00:00:00', '2025-08-29 12:19:33'),
(8, 'Generic Medicine B', 'Generic medicine for testing purposes', '2025-08-28 00:00:00', '2025-08-29 12:19:33');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_packaging`
--

CREATE TABLE `tbl_medicine_packaging` (
  `packaging_id` int(11) NOT NULL,
  `packaging_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_packaging`
--

INSERT INTO `tbl_medicine_packaging` (`packaging_id`, `packaging_name`, `description`, `created_at`) VALUES
(1, 'Strip', 'strip sa tambal \r\n', '2025-08-26 14:38:15'),
(4, 'bottle', 'Bottle for syrups, suspensions, or liquid medications', '2025-08-26 14:38:15');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_weights`
--

CREATE TABLE `tbl_medicine_weights` (
  `weight_id` int(11) NOT NULL,
  `weight_value` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_weights`
--

INSERT INTO `tbl_medicine_weights` (`weight_id`, `weight_value`) VALUES
(1, '100mg'),
(2, '250mg'),
(3, '500mg'),
(4, '10000mg'),
(5, '20mg'),
(6, '40mg'),
(7, '80mg'),
(8, '120mg');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_nurses`
--

CREATE TABLE `tbl_nurses` (
  `nurse_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `shift_schedule` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_nurses`
--

INSERT INTO `tbl_nurses` (`nurse_id`, `user_id`, `license_number`, `shift_schedule`, `created_at`, `updated_at`) VALUES
(1, 82, '123123', 'Day shift 9-10pm', '2025-10-02 23:24:53', '2025-10-02 23:24:53'),
(2, 83, 'NURSE-001', 'Day Shift 8AM-5PM', '2025-10-15 06:07:37', '2025-10-15 06:07:37');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_nurse_queue`
--

CREATE TABLE `tbl_nurse_queue` (
  `queue_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `nurse_id` int(11) DEFAULT NULL,
  `status` enum('Waiting','In Progress','Completed','Ready for Doctor') DEFAULT 'Waiting',
  `assigned_at` datetime DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_patients`
--

CREATE TABLE `tbl_patients` (
  `patient_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `contact_num` varchar(20) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_patients`
--

INSERT INTO `tbl_patients` (`patient_id`, `user_id`, `sex`, `contact_num`, `birthdate`, `age`, `address`, `created_at`, `updated_at`) VALUES
(6, 18, 'Male', '123123123', '2025-08-21', 0, 'asdasdasdasd', '2025-08-09 10:31:52', '2025-08-28 11:22:22'),
(9, 21, 'Male', '0921093012903123', '2025-08-21', 0, 'wqeqweq', '2025-08-11 20:53:30', '2025-08-28 11:22:22'),
(10, 22, 'Female', '123123123', '2025-09-04', 0, 'bulua', '2025-08-11 22:28:51', '2025-08-28 11:22:22'),
(12, 23, 'Male', '09187654321', '1985-12-03', 39, 'Sample Address 2', '2025-08-16 00:53:24', '2025-08-28 11:22:22'),
(13, 24, 'Female', '09998887777', '1992-08-20', 33, 'Sample Address 3', '2025-08-16 19:29:08', '2025-08-28 11:22:22'),
(14, 25, 'Female', '09111222333', '1988-03-10', 37, 'Sample Address 4', '2025-08-16 20:00:10', '2025-08-28 11:22:22'),
(15, 27, 'Male', '12312334', '2025-08-06', 0, 'Tablon', '2025-08-17 01:38:02', '2025-08-28 11:22:22'),
(19, 55, 'Male', '45345345', '2025-07-29', 34, 'muli', '2025-08-28 11:53:59', '2025-08-28 11:53:59'),
(20, 56, 'Female', 'asdasd', '2025-07-30', 21, 'asd', '2025-08-29 13:25:18', '2025-08-29 13:25:18'),
(22, 59, 'Male', '49465494845', '2025-06-10', 10, 'ilaya camren cdoc', '2025-09-06 07:05:28', '2025-09-06 07:05:28'),
(23, 63, 'Female', '0223240825', '2024-12-29', NULL, 'bontong\n', '2025-09-12 08:15:20', '2025-09-12 08:18:34'),
(24, 65, 'Female', '0909090909', '2004-09-20', 20, 'Calaanan', '2025-09-13 06:17:41', '2025-09-13 06:17:41'),
(25, 66, 'Female', '098304392', '2005-05-11', 20, 'Tablon', '2025-09-13 10:21:20', '2025-09-13 10:21:20'),
(26, 67, 'Female', '2131231232', '2009-01-15', 16, 'hello ', '2025-09-15 10:55:41', '2025-09-15 10:55:41'),
(27, 68, 'Female', '1231231231', '2002-06-05', 23, 'Calaanan', '2025-09-15 11:10:53', '2025-09-15 11:10:53'),
(28, 69, 'Female', '21312312321', '2020-06-25', 5, 'asd', '2025-09-15 11:24:59', '2025-09-15 11:24:59'),
(29, 70, 'Female', '12312312', '2025-09-02', 12, 'asdad', '2025-09-15 11:32:10', '2025-09-15 11:32:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payments`
--

CREATE TABLE `tbl_payments` (
  `payment_id` int(11) NOT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `patient_id` int(11) NOT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_method` enum('Online','Walk-in') DEFAULT 'Walk-in',
  `status_id` int(11) DEFAULT NULL,
  `payment_date` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payments`
--

INSERT INTO `tbl_payments` (`payment_id`, `appointment_id`, `patient_id`, `amount`, `payment_method`, `status_id`, `payment_date`, `created_at`, `updated_at`) VALUES
(1, 12, 9, 500.00, 'Walk-in', 12, '2025-08-15 09:30:00', '2025-08-15 09:30:00', '2025-08-15 09:30:00'),
(3, 15, 9, 600.00, 'Walk-in', 11, NULL, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(4, NULL, 10, 300.00, 'Online', 12, '2025-08-16 16:45:00', '2025-08-16 16:45:00', '2025-08-16 16:45:00'),
(6, 16, 13, 13.00, '', 12, '2025-08-26 15:56:37', '2025-08-26 15:50:07', '2025-08-26 15:56:37'),
(7, 28, 12, 12.00, '', 12, '2025-08-26 21:29:17', '2025-08-26 21:29:17', '2025-08-26 21:29:17'),
(8, 40, 14, 324.00, '', 12, '2025-09-06 09:09:45', '2025-09-06 08:51:52', '2025-09-06 09:09:45'),
(9, 35, 19, 13.00, 'Walk-in', 11, '2025-09-06 10:36:55', '2025-09-06 10:36:55', '2025-09-06 10:36:55'),
(10, 34, 19, 613.00, 'Walk-in', 11, '2025-09-06 10:36:55', '2025-09-06 10:36:55', '2025-09-06 10:36:55'),
(11, 51, 15, 120.00, '', 12, '2025-09-11 20:59:43', '2025-09-11 20:59:29', '2025-09-11 20:59:43'),
(12, 49, 15, 312.00, '', 12, '2025-09-13 12:21:22', '2025-09-11 20:59:29', '2025-09-13 12:21:22'),
(13, 48, 15, 813.00, 'Walk-in', 11, '2025-09-11 20:59:29', '2025-09-11 20:59:29', '2025-09-11 20:59:29'),
(14, 47, 15, 620.00, 'Walk-in', 11, '2025-09-11 20:59:29', '2025-09-11 20:59:29', '2025-09-11 20:59:29'),
(15, 46, 15, 513.00, 'Walk-in', 11, '2025-09-11 20:59:29', '2025-09-11 20:59:29', '2025-09-11 20:59:29'),
(16, 45, 15, 313.00, 'Walk-in', 11, '2025-09-11 20:59:29', '2025-09-11 20:59:29', '2025-09-11 20:59:29'),
(17, 44, 15, 13.00, 'Walk-in', 11, '2025-09-11 20:59:29', '2025-09-11 20:59:29', '2025-09-11 20:59:29'),
(18, 53, 15, 80.00, 'Walk-in', 11, '2025-09-13 05:05:07', '2025-09-13 05:05:07', '2025-09-13 05:05:07'),
(19, 52, 15, 13.00, 'Walk-in', 11, '2025-09-13 05:05:07', '2025-09-13 05:05:07', '2025-09-13 05:05:07'),
(20, 61, 15, 80.00, '', 12, '2025-09-13 13:19:34', '2025-09-13 13:17:50', '2025-09-13 13:19:34'),
(21, 63, 24, 642.00, 'Walk-in', 11, '2025-09-13 14:40:18', '2025-09-13 14:40:18', '2025-09-13 14:40:18');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_methods`
--

CREATE TABLE `tbl_payment_methods` (
  `method_id` int(11) NOT NULL,
  `method_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_methods`
--

INSERT INTO `tbl_payment_methods` (`method_id`, `method_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Cash', 'Physical cash payment at the clinic', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(2, 'Credit Card', 'Credit card payment (Visa, Mastercard, etc.)', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(3, 'Debit Card', 'Debit card payment from bank account', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(4, 'Bank Transfer', 'Direct bank transfer or online banking', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(5, 'Mobile Payment', 'Mobile wallet payments (GCash, PayMaya, etc.)', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(6, 'Insurance', 'Payment through health insurance provider', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(7, 'Check', 'Personal or company check payment', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00'),
(8, 'Online Payment', 'Online payment gateway (PayPal, Stripe, etc.)', 1, '2025-08-23 09:22:00', '2025-08-23 09:22:00');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_references`
--

CREATE TABLE `tbl_payment_references` (
  `ref_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `method_name` varchar(100) NOT NULL,
  `payer_account` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_references`
--

INSERT INTO `tbl_payment_references` (`ref_id`, `payment_id`, `method_name`, `payer_account`, `created_at`) VALUES
(1, 6, 'Check', '213123', '2025-08-26 15:56:37'),
(2, 8, 'Cash', '1000', '2025-09-06 09:09:45'),
(3, 11, 'Check', '1222', '2025-09-11 20:59:43'),
(4, 12, 'Cash', '121212', '2025-09-13 12:21:22');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_prescriptions`
--

CREATE TABLE `tbl_prescriptions` (
  `prescription_id` int(11) NOT NULL,
  `consultation_id` int(11) DEFAULT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `dosage` varchar(100) NOT NULL,
  `frequency` varchar(100) NOT NULL,
  `duration` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `packaging_unit` varchar(50) DEFAULT 'tablet',
  `packaging_unit_id` int(11) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `status` enum('Active','Completed','Cancelled') DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_prescriptions`
--

INSERT INTO `tbl_prescriptions` (`prescription_id`, `consultation_id`, `appointment_id`, `doctor_id`, `patient_id`, `medicine_id`, `dosage`, `frequency`, `duration`, `quantity`, `packaging_unit`, `packaging_unit_id`, `instructions`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 12, 1, 9, 3, '500mg', 'Every 8 hours', '7 days', 21, 'capsule', NULL, 'Take with food. Complete the full course even if symptoms improve.', 'Active', '2025-08-15 11:00:00', '2025-08-26 14:38:15'),
(2, NULL, 12, 1, 9, 1, '500mg', 'Every 6 hours', '3 days', 12, 'tablet', 1, 'Take for fever and pain relief. Do not exceed 4 doses per day.', 'Active', '2025-08-15 11:00:00', '2025-08-29 20:20:02'),
(4, NULL, 15, 1, 9, 9, '20mg', 'Once daily', '90 days', 90, 'capsule', NULL, 'Take with meals. Regular blood sugar monitoring required.', 'Active', '2025-08-20 12:00:00', '2025-08-26 14:38:15'),
(5, 7, 16, 1, 13, 8, '500mg', '8 hours', '7 days', 1, 'tablet', 1, 'asd', 'Active', '2025-08-26 15:32:03', '2025-08-29 20:20:02'),
(6, 8, 28, 3, 12, 5, '500 mg', '4 hours', '4 days ', 1, 'tablet', 1, 'before bed ', 'Active', '2025-08-26 21:28:57', '2025-08-29 20:20:02'),
(8, 10, 12, 1, 9, 8, 'N/A', '2', '23', 1, 'vial', NULL, 'as', 'Active', '2025-08-29 20:32:39', '2025-08-29 20:32:39'),
(9, 11, 35, 1, 19, 8, 'N/A', '3', '3', 1, 'vial', NULL, 'asd', 'Active', '2025-08-29 20:57:06', '2025-08-29 20:57:06'),
(10, 12, 34, 3, 19, 8, 'N/A', '32', '2', 1, 'mg', NULL, 'Sd', 'Active', '2025-08-29 20:58:11', '2025-08-29 20:58:11'),
(11, 13, 39, 1, 6, 8, 'N/A', '3', '2', 1, 'tablet', NULL, 'sa', 'Active', '2025-09-06 07:40:14', '2025-09-06 07:40:14'),
(12, 14, 40, 2, 14, 15, 'N/A', '5 hrs', '4 days', 2, 'capsule', NULL, 'take with food ', 'Active', '2025-09-06 08:49:48', '2025-09-06 08:49:48'),
(13, 15, 41, 2, 10, 8, 'N/A', '5 hrs', '4 days', 1, 'tube', NULL, 'take', 'Active', '2025-09-06 10:23:42', '2025-09-06 10:23:42'),
(14, 16, 42, 1, 20, 1, 'N/A', '3', '3r', 1, 'tablet', NULL, 'ta', 'Active', '2025-09-06 11:14:48', '2025-09-06 11:14:48'),
(15, 17, 43, 3, 22, 15, 'N/A', 'every 5 hours', '1 week', 5, 'tablet', NULL, 'kaon', 'Active', '2025-09-06 15:24:35', '2025-09-06 15:24:35'),
(16, 17, 43, 3, 22, 8, 'N/A', '8 hours', '2 weeks', 1, 'vial', NULL, 'kaon', 'Active', '2025-09-06 15:24:35', '2025-09-06 15:24:35'),
(17, 18, 44, 1, 15, 8, 'N/A', '4 hrs', '3 days', 1, 'tube', NULL, 'sa', 'Active', '2025-09-06 15:45:20', '2025-09-06 15:45:20'),
(18, 19, 45, 2, 15, 8, 'N/A', '2', '3', 1, 'tube', NULL, 'take with food ', 'Active', '2025-09-06 16:02:05', '2025-09-06 16:02:05'),
(19, 20, 46, 2, 15, 8, 'N/A', '4 hrs', '4 days', 1, 'blister pack', NULL, 'take a chance with me ', 'Active', '2025-09-06 16:24:11', '2025-09-06 16:24:11'),
(20, 21, 48, 2, 15, 8, 'N/A', '4 hrs ', '4 days ', 1, 'tablet', NULL, 'take ', 'Active', '2025-09-06 16:36:09', '2025-09-06 16:36:09'),
(21, 22, 47, 2, 15, 3, 'N/A', '4 hrs ', '4 days ', 1, 'box', NULL, 'take ', 'Active', '2025-09-06 16:55:39', '2025-09-06 16:55:39'),
(22, 23, 49, 1, 15, 16, 'N/A', '3', '2', 1, 'tablet', NULL, 'as', 'Active', '2025-09-06 17:00:33', '2025-09-06 17:00:33'),
(23, 24, 50, 3, 10, 5, 'N/A', '7', '5', 1, 'tablet', NULL, 'vghvh', 'Active', '2025-09-06 17:17:36', '2025-09-06 17:17:36'),
(24, 25, 51, 2, 15, 3, 'N/A', '2', 'asd', 1, 'box', NULL, 'as', 'Active', '2025-09-11 18:09:41', '2025-09-11 18:09:41'),
(25, 26, 52, 2, 15, 8, 'N/A', '2', '2', 1, 'tablet', NULL, '22a', 'Active', '2025-09-11 21:05:11', '2025-09-11 21:05:11'),
(26, 27, 53, 1, 15, 2, 'N/A', '3', '3', 1, 'tablet', NULL, 'take with food ', 'Active', '2025-09-11 23:10:32', '2025-09-11 23:10:32'),
(27, 29, 61, 3, 15, 2, 'N/A', '3', '3', 1, 'vial', NULL, 'sad', 'Active', '2025-09-13 13:17:26', '2025-09-13 13:17:26'),
(28, 30, 62, 1, 10, 8, 'N/A', '3', '3', 2, 'box', NULL, 'sad', 'Active', '2025-09-13 13:50:55', '2025-09-13 13:50:55'),
(29, 31, 63, 2, 24, 8, 'N/A', '4 hours', '7 days', 10, 'box', NULL, '', 'Active', '2025-09-13 14:38:20', '2025-09-13 14:38:20'),
(30, 31, 63, 2, 24, 15, 'N/A', '5 hours ', '5 days ', 1, 'box', NULL, 'agay', 'Active', '2025-09-13 14:38:20', '2025-09-13 14:38:20');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_roles`
--

CREATE TABLE `tbl_roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_roles`
--

INSERT INTO `tbl_roles` (`role_id`, `role_name`) VALUES
(1, 'secretary'),
(2, 'doctor'),
(3, 'patient'),
(4, 'Nurse');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_secretaries`
--

CREATE TABLE `tbl_secretaries` (
  `secretary_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_secretaries`
--

INSERT INTO `tbl_secretaries` (`secretary_id`, `user_id`, `employee_id`, `created_at`, `updated_at`) VALUES
(1, 5, '09870696', '2025-08-09 02:28:42', '2025-08-09 02:28:42'),
(3, 11, 'SEC-11', '2025-08-21 19:27:44', '2025-08-21 19:27:44');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_specializations`
--

CREATE TABLE `tbl_specializations` (
  `specialization_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_specializations`
--

INSERT INTO `tbl_specializations` (`specialization_id`, `name`, `description`) VALUES
(1, 'General Practitioner (GP)', 'Basic and broad healthcare for all age groups.'),
(2, 'Family Medicine', 'Long-term care for individuals and families of all ags.'),
(3, 'Internal Medicine', 'Adult diseases and internal organs.'),
(5, 'Pediatrics', 'Healthcare for infants, children, and adolescents.'),
(6, 'Obstetrics & Gynecology (OB-GYN)', 'Women\'s reproductive health and pregnancy.'),
(7, 'Otolaryngology (ENT)', 'Ear, nose, throat, and related head/neck conditions.');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_status`
--

CREATE TABLE `tbl_status` (
  `status_id` int(11) NOT NULL,
  `status_type_id` int(11) NOT NULL,
  `status_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_status`
--

INSERT INTO `tbl_status` (`status_id`, `status_type_id`, `status_name`) VALUES
(6, 1, 'Pending'),
(7, 1, 'Confirmed'),
(8, 1, 'Cancelled'),
(9, 1, 'Completed'),
(10, 1, 'No Show'),
(11, 2, 'Unpaid'),
(12, 2, 'Paid'),
(13, 2, 'Refunded'),
(14, 3, 'Processing'),
(15, 3, 'Ready'),
(16, 3, 'Delivered'),
(17, 1, 'In Consultation'),
(18, 1, 'In Consultation'),
(19, 1, 'Completed'),
(20, 1, 'Confirmed'),
(21, 1, 'Ready for Nurse'),
(22, 1, 'With Nurse'),
(23, 1, 'Ready for Doctor'),
(24, 1, 'With Doctor'),
(25, 1, 'Queued to Nurse');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_status_type`
--

CREATE TABLE `tbl_status_type` (
  `status_type_id` int(11) NOT NULL,
  `status_type_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_status_type`
--

INSERT INTO `tbl_status_type` (`status_type_id`, `status_type_name`) VALUES
(1, 'Appointment'),
(2, 'Payment'),
(3, 'LabResult');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `name`, `email`, `password`, `role_id`, `must_change_password`, `is_active`, `created_at`) VALUES
(1, 'micah', 'micah@gmail.com', '$2y$10$8FWI3m/9qrJpvUxAdHPZEO7wP9xx5HC.GEl/Ft3FkPGloUzzqBMQ.', 2, 0, 1, '2025-08-08 18:19:33'),
(2, 'John', 'john@gmail.com', '$2y$10$Zc4MZ7gMJ9sfwgpO4Kp66O/L5TcnaUceSv5fFiyrfpSPePR5rtaDO', 3, 0, 1, '2025-08-08 18:23:47'),
(3, 'roberth', 'rob@gmail.com', '$2y$10$QPuk6MjWCBjbpWHCdI354OT3B/jottSnHN2r0P73qq3y54DEUH5UG', 3, 0, 1, '2025-08-08 18:24:39'),
(4, 'yumi', 'yumi@gmail.com', '$2y$10$Zqlmv82NuXUFKCYgVJbnDeA4MLjUNb8zkSVmwKCJ6jNM9OrEYEulO', 3, 0, 1, '2025-08-08 18:27:06'),
(5, 'secretary', 'secretary@gmail.com', '$2y$10$fzr/ZTmgUc/IfpzPcwXh3.uL.JggbyjTVTy9t5BNCi71IpE6.Z89a', 1, 0, 0, '2025-08-08 18:28:42'),
(11, 'miya ', 'miya@gmail.com', '$2y$10$K9N/NsZ6U3/YDt6e0AtYteKv7GloY95ykAvKPUBzkM3RYHKFnVsT.', 1, 0, 1, '2025-08-09 03:38:12'),
(18, 'Norelyn', 'norelyn@gmail.com', '$2y$10$9fgMutwHEJuCobqxEsfrHO01xggOwClk2bswm.6NAc8fgKvolAtbW', 3, 0, 1, '2025-08-09 10:31:52'),
(21, 'Jannah Macarambon', 'jannah@gmail.com', '$2y$10$IJtGgJbdPPt.xSxmCT0W8ugiC6JjDzb762OYJS7uBgaRn1PkveBEG', 3, 0, 1, '2025-08-11 20:53:30'),
(22, 'shandi', 'shandi@gmail.com', '$2y$10$yDuVvcDuwtfRq5iZzz.8JOE6GwOSTZURsNtlv/EiPDEIgqdUkkD7y', 3, 0, 1, '2025-08-11 22:28:51'),
(23, 'Sean ', 'sean@gmail.com', '$2y$10$DsLyM1L3/k2iMduqW2ZegOA5gbcbLv1xBngj/2HndmK4QlAU4Gvy6', 3, 0, 1, '2025-08-16 00:53:24'),
(24, 'Mckenzie', 'mckenzie@gmail.com', '$2y$10$OFSl/JnOcUsxmNg.q60CoOjEGd2iRNIb0jofBJfEzCjTKa71vFVsa', 3, 0, 1, '2025-08-16 19:29:08'),
(25, 'Laurice', 'laurice@gmail.com', '$2y$10$aQMsjAzelO6rpPbZuiJbU.2PRLnxHMjpk5MP57ia0ze2us8h/6RZm', 3, 0, 1, '2025-08-16 20:00:10'),
(26, 'John Smith', 'smith@gmail.com', '$2y$10$9bpJzjplifMlEo.AD5WxruKwTrhIC3l5/vhq44PHMJEyY2ojliwI2', 2, 0, 1, '2025-08-16 20:01:53'),
(27, 'Rel Lago', 'rel@gmail.com', '$2y$10$EmBpVbXvhXiomGHp225EXOY5tnw0PI90xBZKlZ3h5Q66juY77HuVq', 3, 0, 1, '2025-08-17 01:38:02'),
(39, 'HENRY KING', 'henry@gmail.com', '$2y$10$.KKUt0UGc1z6bICWAvGcJ.kXexRuTtdonr.SpJNOO3pIO5Xyj0u8e', 2, 0, 1, '2025-08-17 03:04:26'),
(44, 'ethel', 'ethel@gmail.com', '$2y$10$wMF82UcEGXeu.nnn0CNw7ePi2jr/Kk264pY2HG/GMZtHKO5hHtg2W', 2, 0, 1, '2025-08-25 06:59:12'),
(49, 'moana', 'moana4@gmail.com', '$2y$10$AS6HJCOneASTy3vL767.MuE5MOWVjkLSPp55D01sLkanTMiN8h7sC', 3, 1, 1, '2025-08-28 11:29:02'),
(50, 'moana', 'moana23@gmail.com', '$2y$10$acsm.7Uy/LGDdWxD8YDm7uJK5W1zo.pTwFcC4SRtORPVZB0E67n1a', 3, 1, 1, '2025-08-28 11:35:17'),
(52, 'mika', 'mika@gmail.com', '$2y$10$lIQ8uDi622QBihQ9Use4qO2J/uAS7kAyT7uIN4HiCzTojITEsYYdm', 3, 0, 1, '2025-08-28 11:45:07'),
(55, 'ace', 'ace@gmail.com', '$2y$10$nTAqyA0nV8EWY7sAWLiYyehCrJkkFqoYECuITyArXeM7HWhmymZ7C', 3, 0, 1, '2025-08-28 11:53:59'),
(56, 'Micah Lago', 'micahlago2005@gmail.com', '$2y$10$ZGHJNY6W7.yat1Ku.lkn7uCR77JRgWKgFbCF48W0EGcDe1h0kwZV.', 3, 0, 1, '2025-08-29 13:25:18'),
(58, 'Regine Rugay', 'regine@gmail.com', '$2y$10$BNGJ7XQjK2SZ6zzvGL64b.2LHwLtf3iJkUuh0aZ3vagdRMJC6HqHe', 2, 1, 1, '2025-09-06 01:18:29'),
(59, 'joneil', 'joneil@gmail.com', '$2y$10$P7PLpb6dkB6bDBgGl6cfK.g8T/VBMy/YgYV6S/5AvHbY2kfvo/1kC', 3, 0, 1, '2025-09-06 07:05:28'),
(63, 'caduyac', 'lacl.caduyac.coc@phinmaed.com', '$2y$10$UNaQ2io7QgX3Kix04CYQQu8CDzaKvUcfne1ThITUUWmj22IHZLArS', 3, 0, 1, '2025-09-12 08:15:20'),
(64, 'Sean Jonei Pabilona', 'Seannyg@gmail.com', '$2y$10$cVK4sAnmCbA.t4uhbPpKveu9jlVnJc1aoa2sNUSiixS8kqfzsRIuC', 2, 0, 1, '2025-09-13 04:34:26'),
(65, 'Shennielyn Portugal', 'shenny@gmail.com', '$2y$10$k48MZKgPkt2ucEWWx77q7OpXKOC1ZizEnFDdVQQNbMSKpuJIkSIZ.', 3, 0, 1, '2025-09-13 06:17:41'),
(66, 'yuki', 'yuki@gmail.com', '$2y$10$OhqUOy8R5HINP56.r5uupOX3oYo.B9C6neOPypoCaSC8SUJ/eg9ki', 3, 1, 1, '2025-09-13 10:21:20'),
(67, 'Amoxicillin', 'amo@gmail.com', '$2y$10$JdfuN7Kvri08NnC85vn9Jup5mmPmjLII.17TMN0GmCmoietNHLvLu', 3, 0, 1, '2025-09-15 10:55:41'),
(68, 'idk', 'idk@gmail.com', '$2y$10$a9B2q5kpPw/uYyKlJFZi5OiM7u8Xk9BNO4vaSQtitGXJAtnq3APY.', 3, 1, 1, '2025-09-15 11:10:53'),
(69, 'bingo ', 'bin@gmail.com', '$2y$10$CzKTicSn4rPyQec7SXP8eeAA5fBtilCAloqEmUPVjgVyjlwtQAF8u', 3, 0, 1, '2025-09-15 11:24:59'),
(70, 'hayley', 'hay@gmail.com', '$2y$10$g66HZV0eeVBTRiqZpQXfNesvTb/0.GB8kqdHtOjlb21Ai7ogdaafK', 3, 1, 1, '2025-09-15 11:32:10'),
(82, 'nurse', 'nurse@gmail.com', '$2y$10$WuKMNCE8v.ubQgFVOA8huuPM2JfKQUNLxEVLtz2/35T0iVy1rEDSS', 4, 0, 1, '2025-10-02 23:24:53'),
(83, 'Test Nurse', 'nurse.test@clinic.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 0, 1, '2025-10-15 06:07:37');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `secretary_id` (`secretary_id`),
  ADD KEY `status_id` (`status_id`),
  ADD KEY `idx_appointment_reason` (`appointment_reason_id`),
  ADD KEY `idx_appointment_date_reason` (`appointment_date`,`appointment_reason_id`),
  ADD KEY `idx_nurse_appointments` (`nurse_id`,`appointment_date`);

--
-- Indexes for table `tbl_appointment_reasons`
--
ALTER TABLE `tbl_appointment_reasons`
  ADD PRIMARY KEY (`reason_id`);

--
-- Indexes for table `tbl_conditions`
--
ALTER TABLE `tbl_conditions`
  ADD PRIMARY KEY (`condition_id`),
  ADD UNIQUE KEY `uq_condition_name` (`condition_name`);

--
-- Indexes for table `tbl_consultations`
--
ALTER TABLE `tbl_consultations`
  ADD PRIMARY KEY (`consultation_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `fk_consultation_illness` (`illness_id`),
  ADD KEY `fk_consultation_condition` (`condition_id`),
  ADD KEY `idx_nurse_id` (`nurse_id`),
  ADD KEY `idx_nurse_completed` (`nurse_completed_at`),
  ADD KEY `idx_ready_for_doctor` (`patient_ready_for_doctor`);

--
-- Indexes for table `tbl_consultation_history`
--
ALTER TABLE `tbl_consultation_history`
  ADD PRIMARY KEY (`consultation_id`),
  ADD KEY `idx_nurse_assessment` (`nurse_assessment`(100)),
  ADD KEY `idx_chief_complaint` (`chief_complaint`(100));

--
-- Indexes for table `tbl_consultation_lifestyle`
--
ALTER TABLE `tbl_consultation_lifestyle`
  ADD PRIMARY KEY (`lifestyle_id`),
  ADD KEY `idx_lifestyle_consultation` (`consultation_id`);

--
-- Indexes for table `tbl_consultation_summary`
--
ALTER TABLE `tbl_consultation_summary`
  ADD PRIMARY KEY (`consultation_id`);

--
-- Indexes for table `tbl_consultation_vitals`
--
ALTER TABLE `tbl_consultation_vitals`
  ADD PRIMARY KEY (`consultation_id`);

--
-- Indexes for table `tbl_current_queue`
--
ALTER TABLE `tbl_current_queue`
  ADD PRIMARY KEY (`queue_id`),
  ADD UNIQUE KEY `unique_date_queue` (`date`),
  ADD KEY `fk_queue_current_appointment` (`current_appointment_id`),
  ADD KEY `fk_queue_next_appointment` (`next_appointment_id`),
  ADD KEY `fk_queue_updated_by` (`last_updated_by`);

--
-- Indexes for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD PRIMARY KEY (`doctor_id`),
  ADD UNIQUE KEY `license_number` (`license_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `specialization_id` (`specialization_id`);

--
-- Indexes for table `tbl_doctor_queue`
--
ALTER TABLE `tbl_doctor_queue`
  ADD PRIMARY KEY (`queue_id`),
  ADD KEY `fk_doctor_queue_appointment` (`appointment_id`),
  ADD KEY `fk_doctor_queue_doctor` (`doctor_id`),
  ADD KEY `idx_doctor_queue_status` (`status`);

--
-- Indexes for table `tbl_illnesses`
--
ALTER TABLE `tbl_illnesses`
  ADD PRIMARY KEY (`illness_id`),
  ADD UNIQUE KEY `uk_illness_name` (`illness_name`);

--
-- Indexes for table `tbl_lab_requests`
--
ALTER TABLE `tbl_lab_requests`
  ADD PRIMARY KEY (`lab_request_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `secretary_id` (`secretary_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `lab_test_type_id` (`lab_test_type_id`),
  ADD KEY `status_id` (`status_id`);

--
-- Indexes for table `tbl_lab_results`
--
ALTER TABLE `tbl_lab_results`
  ADD PRIMARY KEY (`result_id`),
  ADD KEY `lab_request_id` (`lab_request_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `status_id` (`status_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `tbl_lab_test_types`
--
ALTER TABLE `tbl_lab_test_types`
  ADD PRIMARY KEY (`lab_test_type_id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

--
-- Indexes for table `tbl_medicines`
--
ALTER TABLE `tbl_medicines`
  ADD PRIMARY KEY (`medicine_id`),
  ADD KEY `form_id` (`form_id`),
  ADD KEY `generic_id` (`generic_id`);

--
-- Indexes for table `tbl_medicine_forms`
--
ALTER TABLE `tbl_medicine_forms`
  ADD PRIMARY KEY (`form_id`);

--
-- Indexes for table `tbl_medicine_generic_names`
--
ALTER TABLE `tbl_medicine_generic_names`
  ADD PRIMARY KEY (`generic_id`),
  ADD UNIQUE KEY `generic_name` (`generic_name`);

--
-- Indexes for table `tbl_medicine_packaging`
--
ALTER TABLE `tbl_medicine_packaging`
  ADD PRIMARY KEY (`packaging_id`);

--
-- Indexes for table `tbl_medicine_weights`
--
ALTER TABLE `tbl_medicine_weights`
  ADD PRIMARY KEY (`weight_id`);

--
-- Indexes for table `tbl_nurses`
--
ALTER TABLE `tbl_nurses`
  ADD PRIMARY KEY (`nurse_id`),
  ADD UNIQUE KEY `unique_license` (`license_number`),
  ADD KEY `fk_nurse_user` (`user_id`);

--
-- Indexes for table `tbl_nurse_queue`
--
ALTER TABLE `tbl_nurse_queue`
  ADD PRIMARY KEY (`queue_id`),
  ADD KEY `fk_nurse_queue_appointment` (`appointment_id`),
  ADD KEY `fk_nurse_queue_nurse` (`nurse_id`),
  ADD KEY `idx_nurse_queue_status` (`status`);

--
-- Indexes for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  ADD PRIMARY KEY (`patient_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `status_id` (`status_id`);

--
-- Indexes for table `tbl_payment_methods`
--
ALTER TABLE `tbl_payment_methods`
  ADD PRIMARY KEY (`method_id`),
  ADD UNIQUE KEY `uq_method_name` (`method_name`);

--
-- Indexes for table `tbl_payment_references`
--
ALTER TABLE `tbl_payment_references`
  ADD PRIMARY KEY (`ref_id`),
  ADD KEY `payment_id` (`payment_id`);

--
-- Indexes for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  ADD PRIMARY KEY (`prescription_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `medicine_id` (`medicine_id`),
  ADD KEY `idx_quantity` (`quantity`),
  ADD KEY `idx_packaging_unit` (`packaging_unit`),
  ADD KEY `idx_prescription_packaging_unit` (`packaging_unit_id`);

--
-- Indexes for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tbl_secretaries`
--
ALTER TABLE `tbl_secretaries`
  ADD PRIMARY KEY (`secretary_id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_specializations`
--
ALTER TABLE `tbl_specializations`
  ADD PRIMARY KEY (`specialization_id`);

--
-- Indexes for table `tbl_status`
--
ALTER TABLE `tbl_status`
  ADD PRIMARY KEY (`status_id`),
  ADD KEY `status_type_id` (`status_type_id`);

--
-- Indexes for table `tbl_status_type`
--
ALTER TABLE `tbl_status_type`
  ADD PRIMARY KEY (`status_type_id`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `tbl_appointment_reasons`
--
ALTER TABLE `tbl_appointment_reasons`
  MODIFY `reason_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `tbl_conditions`
--
ALTER TABLE `tbl_conditions`
  MODIFY `condition_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `tbl_consultations`
--
ALTER TABLE `tbl_consultations`
  MODIFY `consultation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `tbl_consultation_lifestyle`
--
ALTER TABLE `tbl_consultation_lifestyle`
  MODIFY `lifestyle_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_current_queue`
--
ALTER TABLE `tbl_current_queue`
  MODIFY `queue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  MODIFY `doctor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `tbl_doctor_queue`
--
ALTER TABLE `tbl_doctor_queue`
  MODIFY `queue_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_illnesses`
--
ALTER TABLE `tbl_illnesses`
  MODIFY `illness_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_lab_requests`
--
ALTER TABLE `tbl_lab_requests`
  MODIFY `lab_request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `tbl_lab_results`
--
ALTER TABLE `tbl_lab_results`
  MODIFY `result_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `tbl_lab_test_types`
--
ALTER TABLE `tbl_lab_test_types`
  MODIFY `lab_test_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_medicines`
--
ALTER TABLE `tbl_medicines`
  MODIFY `medicine_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tbl_medicine_forms`
--
ALTER TABLE `tbl_medicine_forms`
  MODIFY `form_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_medicine_generic_names`
--
ALTER TABLE `tbl_medicine_generic_names`
  MODIFY `generic_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_medicine_packaging`
--
ALTER TABLE `tbl_medicine_packaging`
  MODIFY `packaging_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_medicine_weights`
--
ALTER TABLE `tbl_medicine_weights`
  MODIFY `weight_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_nurses`
--
ALTER TABLE `tbl_nurses`
  MODIFY `nurse_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_nurse_queue`
--
ALTER TABLE `tbl_nurse_queue`
  MODIFY `queue_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `tbl_payment_methods`
--
ALTER TABLE `tbl_payment_methods`
  MODIFY `method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_payment_references`
--
ALTER TABLE `tbl_payment_references`
  MODIFY `ref_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  MODIFY `prescription_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_secretaries`
--
ALTER TABLE `tbl_secretaries`
  MODIFY `secretary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_specializations`
--
ALTER TABLE `tbl_specializations`
  MODIFY `specialization_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_status`
--
ALTER TABLE `tbl_status`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `tbl_status_type`
--
ALTER TABLE `tbl_status_type`
  MODIFY `status_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  ADD CONSTRAINT `fk_appointment_reason` FOREIGN KEY (`appointment_reason_id`) REFERENCES `tbl_appointment_reasons` (`reason_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_nurse` FOREIGN KEY (`nurse_id`) REFERENCES `tbl_nurses` (`nurse_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_appointments_secretary` FOREIGN KEY (`secretary_id`) REFERENCES `tbl_secretaries` (`secretary_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_status` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`);

--
-- Constraints for table `tbl_consultations`
--
ALTER TABLE `tbl_consultations`
  ADD CONSTRAINT `fk_consultation_condition` FOREIGN KEY (`condition_id`) REFERENCES `tbl_conditions` (`condition_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_consultation_illness` FOREIGN KEY (`illness_id`) REFERENCES `tbl_illnesses` (`illness_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_consultations_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_consultations_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_consultations_nurse` FOREIGN KEY (`nurse_id`) REFERENCES `tbl_nurses` (`nurse_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_consultations_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_consultation_history`
--
ALTER TABLE `tbl_consultation_history`
  ADD CONSTRAINT `fk_history_consultation_simple` FOREIGN KEY (`consultation_id`) REFERENCES `tbl_consultations` (`consultation_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_consultation_lifestyle`
--
ALTER TABLE `tbl_consultation_lifestyle`
  ADD CONSTRAINT `fk_lifestyle_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `tbl_consultations` (`consultation_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_consultation_summary`
--
ALTER TABLE `tbl_consultation_summary`
  ADD CONSTRAINT `fk_summary_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `tbl_consultations` (`consultation_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_consultation_vitals`
--
ALTER TABLE `tbl_consultation_vitals`
  ADD CONSTRAINT `fk_vitals_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `tbl_consultations` (`consultation_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_current_queue`
--
ALTER TABLE `tbl_current_queue`
  ADD CONSTRAINT `fk_queue_current_appointment` FOREIGN KEY (`current_appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_queue_next_appointment` FOREIGN KEY (`next_appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_queue_updated_by` FOREIGN KEY (`last_updated_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD CONSTRAINT `fk_doctors_specialization` FOREIGN KEY (`specialization_id`) REFERENCES `tbl_specializations` (`specialization_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_doctors_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_doctor_queue`
--
ALTER TABLE `tbl_doctor_queue`
  ADD CONSTRAINT `fk_doctor_queue_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_doctor_queue_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_lab_requests`
--
ALTER TABLE `tbl_lab_requests`
  ADD CONSTRAINT `fk_lab_requests_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lab_requests_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lab_requests_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_lab_requests_secretary` FOREIGN KEY (`secretary_id`) REFERENCES `tbl_secretaries` (`secretary_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lab_requests_status` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lab_requests_test_type` FOREIGN KEY (`lab_test_type_id`) REFERENCES `tbl_lab_test_types` (`lab_test_type_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_lab_results`
--
ALTER TABLE `tbl_lab_results`
  ADD CONSTRAINT `fk_lab_results_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lab_results_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_lab_results_request` FOREIGN KEY (`lab_request_id`) REFERENCES `tbl_lab_requests` (`lab_request_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_lab_results_status` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lab_results_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `tbl_users` (`user_id`);

--
-- Constraints for table `tbl_medicines`
--
ALTER TABLE `tbl_medicines`
  ADD CONSTRAINT `fk_medicines_form` FOREIGN KEY (`form_id`) REFERENCES `tbl_medicine_forms` (`form_id`),
  ADD CONSTRAINT `fk_medicines_generic` FOREIGN KEY (`generic_id`) REFERENCES `tbl_medicine_generic_names` (`generic_id`);

--
-- Constraints for table `tbl_nurses`
--
ALTER TABLE `tbl_nurses`
  ADD CONSTRAINT `fk_nurse_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_nurse_queue`
--
ALTER TABLE `tbl_nurse_queue`
  ADD CONSTRAINT `fk_nurse_queue_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_nurse_queue_nurse` FOREIGN KEY (`nurse_id`) REFERENCES `tbl_nurses` (`nurse_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  ADD CONSTRAINT `fk_patients_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  ADD CONSTRAINT `fk_payments_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_payments_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payments_status` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  ADD CONSTRAINT `fk_prescription_packaging_unit` FOREIGN KEY (`packaging_unit_id`) REFERENCES `tbl_medicine_packaging` (`packaging_id`),
  ADD CONSTRAINT `fk_prescriptions_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `tbl_medicines` (`medicine_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_secretaries`
--
ALTER TABLE `tbl_secretaries`
  ADD CONSTRAINT `fk_secretaries_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_status`
--
ALTER TABLE `tbl_status`
  ADD CONSTRAINT `fk_status_status_type` FOREIGN KEY (`status_type_id`) REFERENCES `tbl_status_type` (`status_type_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
