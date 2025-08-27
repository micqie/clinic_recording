-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 26, 2025 at 10:02 AM
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
  `secretary_id` int(11) DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `queue_number` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_appointments`
--

INSERT INTO `tbl_appointments` (`appointment_id`, `patient_id`, `doctor_id`, `secretary_id`, `appointment_date`, `queue_number`, `status_id`) VALUES
(12, 9, 1, 1, '2025-08-29', 1, 7),
(15, 9, 1, 1, '2025-08-20', 3, 7),
(16, 13, 1, 1, '2025-08-26', 4, 9),
(17, 10, 2, 1, '2025-08-25', 1, 6),
(18, 3, 3, 2, '2025-08-27', 2, 7),
(19, 9, 2, NULL, '2025-08-16', 1, 7),
(20, 9, 3, NULL, '2025-08-08', 1, 7),
(21, 9, 2, NULL, '2025-08-21', 1, 7),
(22, 9, NULL, NULL, '2025-08-21', NULL, 6),
(23, 9, NULL, NULL, '2025-08-21', NULL, 6),
(24, 9, NULL, NULL, '2025-08-21', NULL, 6),
(25, 9, NULL, NULL, '2025-08-01', NULL, 6),
(26, 9, NULL, NULL, '2025-08-28', NULL, 6),
(27, 9, 1, NULL, '2025-08-24', 1, 7);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_consultations`
--

CREATE TABLE `tbl_consultations` (
  `consultation_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `diagnosis` varchar(255) NOT NULL,
  `consultation_notes` text DEFAULT NULL,
  `next_appointment_date` date DEFAULT NULL,
  `next_appointment_notes` text DEFAULT NULL,
  `consultation_status` enum('Active','Completed','Follow-up Required') DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_consultations`
--

INSERT INTO `tbl_consultations` (`consultation_id`, `appointment_id`, `doctor_id`, `patient_id`, `diagnosis`, `consultation_notes`, `next_appointment_date`, `next_appointment_notes`, `consultation_status`, `created_at`, `updated_at`) VALUES
(1, 12, 1, 9, 'Upper Respiratory Tract Infection', 'Patient presents with cough, sore throat, and mild fever. Prescribed antibiotics and rest.', '2025-08-25', 'Follow-up to check if symptoms improved', 'Completed', '2025-08-15 10:45:00', '2025-08-15 10:45:00'),
(3, 15, 1, 9, 'Type 2 Diabetes', 'Fasting blood sugar: 140 mg/dL. Diet and exercise plan prescribed. Patient needs regular monitoring.', '2025-08-30', 'Blood sugar check and medication adjustment', 'Follow-up Required', '2025-08-20 11:15:00', '2025-08-20 11:15:00'),
(4, 23, 1, 9, 'Common Cold', 'Mild symptoms, rest and fluids recommended', NULL, NULL, 'Completed', '2025-08-23 15:14:44', '2025-08-23 15:14:44'),
(7, 16, 1, 13, 'Cough', 'asd', NULL, '', 'Completed', '2025-08-26 15:32:03', '2025-08-26 15:32:03');

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
(1, '2025-08-26', 16, NULL, 11, '2025-08-26 14:38:46');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_diagnoses`
--

CREATE TABLE `tbl_diagnoses` (
  `diagnosis_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `condition_name` varchar(255) NOT NULL,
  `date_diagnosed` date NOT NULL,
  `severity` enum('Mild','Moderate','Severe','Critical') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_diagnoses`
--

INSERT INTO `tbl_diagnoses` (`diagnosis_id`, `appointment_id`, `doctor_id`, `patient_id`, `condition_name`, `date_diagnosed`, `severity`, `notes`, `created_at`, `updated_at`) VALUES
(1, 12, 1, 9, 'Upper Respiratory Tract Infection', '2025-08-15', 'Mild', 'Patient presents with cough, sore throat, and mild fever. Prescribed antibiotics and rest.', '2025-08-15 10:45:00', '2025-08-15 10:45:00'),
(3, 15, 1, 9, 'Type 2 Diabetes', '2025-08-20', 'Moderate', 'Fasting blood sugar: 140 mg/dL. Diet and exercise plan prescribed.', '2025-08-20 11:15:00', '2025-08-20 11:15:00'),
(4, 16, 1, 13, 'Fever', '2025-08-22', 'Mild', 'sfsdf', '2025-08-22 17:26:32', '2025-08-22 17:26:32');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_diagnosis_lookup`
--

CREATE TABLE `tbl_diagnosis_lookup` (
  `condition_id` int(11) NOT NULL,
  `condition_name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_diagnosis_lookup`
--

INSERT INTO `tbl_diagnosis_lookup` (`condition_id`, `condition_name`, `created_at`) VALUES
(1, 'Cough', '2025-08-22 09:13:31'),
(2, 'Common Cold', '2025-08-22 09:13:31'),
(3, 'Fever', '2025-08-22 09:13:31'),
(4, 'Hypertension', '2025-08-22 09:13:31'),
(5, 'Type 2 Diabetes', '2025-08-22 09:13:31'),
(6, 'Upper Respiratory Tract Infection', '2025-08-22 09:13:31'),
(7, 'Gastroenteritis', '2025-08-22 09:13:31'),
(8, 'AGAY', '2025-08-22 20:29:32');

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
(8, 44, 'aadsdqwe123123', 5, 2, '2025-08-25 14:59:12', '2025-08-25 14:59:12');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_doctor_availability`
--

CREATE TABLE `tbl_doctor_availability` (
  `availability_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=Available, 0=Not Available',
  `reason` varchar(255) DEFAULT NULL COMMENT 'Reason for unavailability',
  `created_by` int(11) DEFAULT NULL COMMENT 'User who set this availability',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(1, NULL, 1, 1, 9, 12, 1, 'Complete Blood Count (CBC) - Patient experiencing fatigue and weakness', 14, '2025-08-15 10:30:00', '2025-08-17 02:11:36'),
(5, NULL, 1, 1, 10, NULL, 5, 'Liver Function Test - Pre-surgery requirement', 16, '2025-08-19 16:30:00', '2025-08-17 02:11:36');

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
(3, 5, 10, 1, 'liver_function_2025_08_19.pdf', 'ALT: 25 U/L (Normal: 7-55)\nAST: 28 U/L (Normal: 8-48)\nAlkaline Phosphatase: 70 U/L (Normal: 44-147)\nTotal Bilirubin: 0.8 mg/dL (Normal: 0.3-1.2)\n\nResults: Normal liver function\n\nCleared for surgery.', 5, '2025-08-19 17:45:00', 15);

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
(1, 'Complete Blood Count (CBC)', 'Measures red/white cells, hemoglobin, etc.', 500.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(2, 'Blood Sugar Test', 'Measures glucose levels for diabetes screening/monitoring', 300.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(3, 'Urinalysis', 'Checks urine components to detect disorders', 250.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(4, 'Lipid Profile', 'Measures cholesterol and triglycerides', 600.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(5, 'Liver Function Test', 'Assesses liver enzymes and proteins', 800.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicines`
--

CREATE TABLE `tbl_medicines` (
  `medicine_id` int(11) NOT NULL,
  `medicine_name` varchar(255) NOT NULL,
  `strength` varchar(100) DEFAULT NULL,
  `form_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicines`
--

INSERT INTO `tbl_medicines` (`medicine_id`, `medicine_name`, `strength`, `form_id`, `price`, `created_at`, `updated_at`) VALUES
(1, 'Paracetamol', '500mg', 1, 50.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(2, 'Ibuprofen', '400mg', 1, 80.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(3, 'Amoxicillin', '500mg', 3, 120.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(5, 'Biogesic', '500mg', 1, 12.00, '2025-08-10 17:43:53', '2025-08-10 17:43:53'),
(8, 'Aspirin', '100mg', 1, 13.00, '2025-08-16 16:42:39', '2025-08-16 16:42:39'),
(9, 'Omeprazole', '20mg', 3, 25.00, '2025-08-16 16:42:39', '2025-08-16 16:42:39'),
(10, 'asdasd', '250mg', 4, 12.00, '2025-08-22 17:14:05', '2025-08-22 17:14:05'),
(14, 'asdasdasdasdasd', '10000mg', 3, 21.00, '2025-08-23 12:40:08', '2025-08-23 12:40:08'),
(15, 'Biogesic 2', '100mg', 3, 12.00, '2025-08-23 12:42:47', '2025-08-23 12:42:47'),
(16, 'Biogesic 2', '100mg', 3, 12.00, '2025-08-23 12:42:47', '2025-08-23 12:42:47');

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
(1, 'tablet', 'Individual tablet/piece', '2025-08-26 14:38:15'),
(2, 'blister pack', 'Strip of tablets in blister packaging', '2025-08-26 14:38:15'),
(3, 'box', 'Box containing multiple tablets/capsules', '2025-08-26 14:38:15'),
(4, 'bottle', 'Bottle for syrups, suspensions, or liquid medications', '2025-08-26 14:38:15'),
(5, 'tube', 'Tube for ointments, creams, or gels', '2025-08-26 14:38:15'),
(6, 'vial', 'Vial for injectable medications', '2025-08-26 14:38:15'),
(7, 'sachet', 'Individual sachet/packet', '2025-08-26 14:38:15'),
(8, 'strip', 'Strip of tablets or capsules', '2025-08-26 14:38:15');

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
-- Table structure for table `tbl_patients`
--

CREATE TABLE `tbl_patients` (
  `patient_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `contact_num` varchar(20) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_patients`
--

INSERT INTO `tbl_patients` (`patient_id`, `user_id`, `sex`, `contact_num`, `birthdate`, `address`, `created_at`, `updated_at`) VALUES
(2, 9, 'Female', '12312', '2025-08-19', 'asdasdasdasdasd', '2025-08-08 18:34:23', '2025-08-09 18:26:37'),
(3, 10, 'Male', '213219090909090', '2025-08-19', '213123', '2025-08-09 03:37:56', '2025-08-11 17:45:59'),
(4, 15, 'Female', '3223', '2025-08-15', 'qweqeasdasdas', '2025-08-09 10:00:37', '2025-08-09 10:24:46'),
(6, 18, 'Male', '123123123', '2025-08-21', 'asdasdasdasd', '2025-08-09 10:31:52', '2025-08-11 22:27:07'),
(9, 21, 'Male', '0921093012903123', '2025-08-21', 'wqeqweq', '2025-08-11 20:53:30', '2025-08-23 07:11:26'),
(10, 22, 'Female', '123123123', '2025-09-04', 'bulua', '2025-08-11 22:28:51', '2025-08-11 22:28:51'),
(12, 23, 'Male', '09187654321', '1985-12-03', 'Sample Address 2', '2025-08-16 00:53:24', '2025-08-16 00:53:24'),
(13, 24, 'Female', '09998887777', '1992-08-20', 'Sample Address 3', '2025-08-16 19:29:08', '2025-08-16 19:29:08'),
(14, 25, 'Female', '09111222333', '1988-03-10', 'Sample Address 4', '2025-08-16 20:00:10', '2025-08-16 20:00:10'),
(15, 27, 'Male', '12312334', '2025-08-06', 'Tablon', '2025-08-17 01:38:02', '2025-08-17 01:38:02');

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
(6, 16, 13, 13.00, '', 12, '2025-08-26 15:56:37', '2025-08-26 15:50:07', '2025-08-26 15:56:37');

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
(1, 6, 'Check', '213123', '2025-08-26 15:56:37');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_prescriptions`
--

CREATE TABLE `tbl_prescriptions` (
  `prescription_id` int(11) NOT NULL,
  `consultation_id` int(11) DEFAULT NULL,
  `diagnosis_id` int(11) DEFAULT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `dosage` varchar(100) NOT NULL,
  `frequency` varchar(100) NOT NULL,
  `duration` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `packaging_unit` varchar(50) DEFAULT 'tablet',
  `instructions` text DEFAULT NULL,
  `status` enum('Active','Completed','Cancelled') DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_prescriptions`
--

INSERT INTO `tbl_prescriptions` (`prescription_id`, `consultation_id`, `diagnosis_id`, `appointment_id`, `doctor_id`, `patient_id`, `medicine_id`, `dosage`, `frequency`, `duration`, `quantity`, `packaging_unit`, `instructions`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 1, 12, 1, 9, 3, '500mg', 'Every 8 hours', '7 days', 21, 'capsule', 'Take with food. Complete the full course even if symptoms improve.', 'Active', '2025-08-15 11:00:00', '2025-08-26 14:38:15'),
(2, NULL, 1, 12, 1, 9, 1, '500mg', 'Every 6 hours', '3 days', 12, 'tablet', 'Take for fever and pain relief. Do not exceed 4 doses per day.', 'Active', '2025-08-15 11:00:00', '2025-08-26 14:38:15'),
(4, NULL, 3, 15, 1, 9, 9, '20mg', 'Once daily', '90 days', 90, 'capsule', 'Take with meals. Regular blood sugar monitoring required.', 'Active', '2025-08-20 12:00:00', '2025-08-26 14:38:15'),
(5, 7, NULL, 16, 1, 13, 8, '500mg', '8 hours', '7 days', 1, 'tablet', 'asd', 'Active', '2025-08-26 15:32:03', '2025-08-26 15:32:03');

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
(3, 'patient');

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
(2, 11, '898989', '2025-08-09 11:38:12', '2025-08-09 11:38:12'),
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
(2, 'Family Medicine', 'Long-term care for individuals and families of all ages.'),
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
(18, 4, 'In Consultation'),
(19, 4, 'Completed'),
(20, 4, 'Confirmed');

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
(3, 'LabResult'),
(4, 'Appointment');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `name`, `email`, `password`, `role_id`, `must_change_password`, `created_at`) VALUES
(1, 'micah', 'micah@gmail.com', '$2y$10$8FWI3m/9qrJpvUxAdHPZEO7wP9xx5HC.GEl/Ft3FkPGloUzzqBMQ.', 2, 0, '2025-08-08 18:19:33'),
(2, 'John', 'john@gmail.com', '$2y$10$Zc4MZ7gMJ9sfwgpO4Kp66O/L5TcnaUceSv5fFiyrfpSPePR5rtaDO', 3, 0, '2025-08-08 18:23:47'),
(3, 'roberth', 'rob@gmail.com', '$2y$10$QPuk6MjWCBjbpWHCdI354OT3B/jottSnHN2r0P73qq3y54DEUH5UG', 3, 0, '2025-08-08 18:24:39'),
(4, 'yumi', 'yumi@gmail.com', '$2y$10$Zqlmv82NuXUFKCYgVJbnDeA4MLjUNb8zkSVmwKCJ6jNM9OrEYEulO', 3, 0, '2025-08-08 18:27:06'),
(5, 'secretary', 'secretary@gmail.com', '$2y$10$fzr/ZTmgUc/IfpzPcwXh3.uL.JggbyjTVTy9t5BNCi71IpE6.Z89a', 1, 0, '2025-08-08 18:28:42'),
(6, 'nor', 'nor@gmail.com', '$2y$10$O2kWQGzF5ivICBBZ6N1Bie2QX.hsczgOAXjlZiOu714Of8H6MtO.K', 3, 0, '2025-08-08 18:29:03'),
(7, '1234', '123@gmail.com', '$2y$10$SKWHlInXt9DtUAvaEGYqt.4lSiV.hto8rF93Bf84kgAlSGo6AZaAW', 3, 0, '2025-08-08 18:31:46'),
(8, 'huhu', 'huhu@gmail.com', '$2y$10$3qSuvL.MVFED5YeqKmht7etUepcKPtPAMaRc.8af2JYn8DMZ4emha', 3, 0, '2025-08-08 18:33:12'),
(9, 'haha', 'haha@gmail.com', '$2y$10$NvlynSBdXCwiaaF2YbE1p.XS0iLhsBiWGpebr7CXxiAOOJJ/oALVa', 3, 0, '2025-08-08 18:34:23'),
(10, 'asd', 'asd@gmail.com', '$2y$10$X1ko3vb/3ERZFuV0tO817OYLtEk4/DKUWPwd90w26YsqEtLMKt.iS', 3, 0, '2025-08-09 03:37:56'),
(11, 'miya ', 'miya@gmail.com', '$2y$10$K9N/NsZ6U3/YDt6e0AtYteKv7GloY95ykAvKPUBzkM3RYHKFnVsT.', 1, 0, '2025-08-09 03:38:12'),
(15, 'asdd', 'inzie@gmail.com', '', 3, 0, '2025-08-09 10:00:37'),
(16, 'asdasdasd', 'asdasdsasdasdasd@gmail.com', '', 3, 0, '2025-08-09 10:07:09'),
(18, 'Norelyn', 'norelyn@gmail.com', '$2y$10$9fgMutwHEJuCobqxEsfrHO01xggOwClk2bswm.6NAc8fgKvolAtbW', 3, 0, '2025-08-09 10:31:52'),
(19, 'Norelyn', 'asdasdSdasdasd@gmail.com', '$2y$10$oyotCJlUMnWnkCOsEuCON.eB2VNBKZQaqIljOaOPko2dG0eKWPUlq', 3, 0, '2025-08-09 10:31:52'),
(20, '', '', '$2y$10$pzsofR1PztfUbYBFLEquwO/fYExlcFrRue.i1OkerSVPYiAZLyAPC', 3, 0, '2025-08-09 10:31:52'),
(21, 'Jannah Macarambon', 'jannah@gmail.com', '$2y$10$IJtGgJbdPPt.xSxmCT0W8ugiC6JjDzb762OYJS7uBgaRn1PkveBEG', 3, 0, '2025-08-11 20:53:30'),
(22, 'shandi', 'shandi@gmail.com', '$2y$10$yDuVvcDuwtfRq5iZzz.8JOE6GwOSTZURsNtlv/EiPDEIgqdUkkD7y', 3, 0, '2025-08-11 22:28:51'),
(23, 'Sean ', 'sean@gmail.com', '$2y$10$DsLyM1L3/k2iMduqW2ZegOA5gbcbLv1xBngj/2HndmK4QlAU4Gvy6', 3, 0, '2025-08-16 00:53:24'),
(24, 'Mckenzie', 'mckenzie@gmail.com', '$2y$10$OFSl/JnOcUsxmNg.q60CoOjEGd2iRNIb0jofBJfEzCjTKa71vFVsa', 3, 0, '2025-08-16 19:29:08'),
(25, 'Laurice', 'laurice@gmail.com', '$2y$10$aQMsjAzelO6rpPbZuiJbU.2PRLnxHMjpk5MP57ia0ze2us8h/6RZm', 3, 0, '2025-08-16 20:00:10'),
(26, 'John Smith', 'smith@gmail.com', '$2y$10$9bpJzjplifMlEo.AD5WxruKwTrhIC3l5/vhq44PHMJEyY2ojliwI2', 2, 0, '2025-08-16 20:01:53'),
(27, 'Rel Lago', 'rel@gmail.com', '$2y$10$EmBpVbXvhXiomGHp225EXOY5tnw0PI90xBZKlZ3h5Q66juY77HuVq', 3, 0, '2025-08-17 01:38:02'),
(39, 'HENRY KING', 'henry@gmail.com', '$2y$10$.KKUt0UGc1z6bICWAvGcJ.kXexRuTtdonr.SpJNOO3pIO5Xyj0u8e', 2, 0, '2025-08-17 03:04:26'),
(44, 'ethel', 'ethel@gmail.com', '$2y$10$wMF82UcEGXeu.nnn0CNw7ePi2jr/Kk264pY2HG/GMZtHKO5hHtg2W', 2, 0, '2025-08-25 06:59:12');

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
  ADD KEY `status_id` (`status_id`);

--
-- Indexes for table `tbl_consultations`
--
ALTER TABLE `tbl_consultations`
  ADD PRIMARY KEY (`consultation_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`);

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
-- Indexes for table `tbl_diagnoses`
--
ALTER TABLE `tbl_diagnoses`
  ADD PRIMARY KEY (`diagnosis_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `tbl_diagnosis_lookup`
--
ALTER TABLE `tbl_diagnosis_lookup`
  ADD PRIMARY KEY (`condition_id`),
  ADD UNIQUE KEY `uq_condition_name` (`condition_name`);

--
-- Indexes for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD PRIMARY KEY (`doctor_id`),
  ADD UNIQUE KEY `license_number` (`license_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `specialization_id` (`specialization_id`);

--
-- Indexes for table `tbl_doctor_availability`
--
ALTER TABLE `tbl_doctor_availability`
  ADD PRIMARY KEY (`availability_id`),
  ADD UNIQUE KEY `unique_doctor_date` (`doctor_id`,`date`),
  ADD KEY `fk_availability_doctor` (`doctor_id`),
  ADD KEY `fk_availability_created_by` (`created_by`);

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
  ADD KEY `form_id` (`form_id`);

--
-- Indexes for table `tbl_medicine_forms`
--
ALTER TABLE `tbl_medicine_forms`
  ADD PRIMARY KEY (`form_id`);

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
  ADD KEY `diagnosis_id` (`diagnosis_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `medicine_id` (`medicine_id`),
  ADD KEY `idx_quantity` (`quantity`),
  ADD KEY `idx_packaging_unit` (`packaging_unit`);

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
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `tbl_consultations`
--
ALTER TABLE `tbl_consultations`
  MODIFY `consultation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_current_queue`
--
ALTER TABLE `tbl_current_queue`
  MODIFY `queue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_diagnoses`
--
ALTER TABLE `tbl_diagnoses`
  MODIFY `diagnosis_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_diagnosis_lookup`
--
ALTER TABLE `tbl_diagnosis_lookup`
  MODIFY `condition_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  MODIFY `doctor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_doctor_availability`
--
ALTER TABLE `tbl_doctor_availability`
  MODIFY `availability_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_lab_requests`
--
ALTER TABLE `tbl_lab_requests`
  MODIFY `lab_request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_lab_results`
--
ALTER TABLE `tbl_lab_results`
  MODIFY `result_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- AUTO_INCREMENT for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_payment_methods`
--
ALTER TABLE `tbl_payment_methods`
  MODIFY `method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_payment_references`
--
ALTER TABLE `tbl_payment_references`
  MODIFY `ref_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  MODIFY `prescription_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_secretaries`
--
ALTER TABLE `tbl_secretaries`
  MODIFY `secretary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_specializations`
--
ALTER TABLE `tbl_specializations`
  MODIFY `specialization_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_status`
--
ALTER TABLE `tbl_status`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `tbl_status_type`
--
ALTER TABLE `tbl_status_type`
  MODIFY `status_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  ADD CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_appointments_secretary` FOREIGN KEY (`secretary_id`) REFERENCES `tbl_secretaries` (`secretary_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_status` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`);

--
-- Constraints for table `tbl_consultations`
--
ALTER TABLE `tbl_consultations`
  ADD CONSTRAINT `fk_consultations_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_consultations_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_consultations_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_current_queue`
--
ALTER TABLE `tbl_current_queue`
  ADD CONSTRAINT `fk_queue_current_appointment` FOREIGN KEY (`current_appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_queue_next_appointment` FOREIGN KEY (`next_appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_queue_updated_by` FOREIGN KEY (`last_updated_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_diagnoses`
--
ALTER TABLE `tbl_diagnoses`
  ADD CONSTRAINT `fk_diagnoses_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_diagnoses_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_diagnoses_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD CONSTRAINT `fk_doctors_specialization` FOREIGN KEY (`specialization_id`) REFERENCES `tbl_specializations` (`specialization_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_doctors_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_doctor_availability`
--
ALTER TABLE `tbl_doctor_availability`
  ADD CONSTRAINT `fk_availability_created_by` FOREIGN KEY (`created_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_availability_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `fk_medicines_form` FOREIGN KEY (`form_id`) REFERENCES `tbl_medicine_forms` (`form_id`);

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
  ADD CONSTRAINT `fk_prescriptions_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_diagnosis` FOREIGN KEY (`diagnosis_id`) REFERENCES `tbl_diagnoses` (`diagnosis_id`) ON DELETE CASCADE,
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
