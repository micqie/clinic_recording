-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 17, 2025 at 07:01 AM
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
-- Database: `mcstuffins2`
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
(12, 9, 1, NULL, '2025-08-29', 1, 7),
(14, 11, NULL, NULL, '2025-08-14', NULL, 6),
(15, 9, NULL, NULL, '2025-08-20', NULL, 6),
(16, 13, NULL, NULL, '2025-08-26', NULL, 6);

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
(2, 14, 1, 11, 'Hypertension', '2025-08-14', 'Moderate', 'Blood pressure reading: 150/95 mmHg. Lifestyle modifications recommended along with medication.', '2025-08-14 15:30:00', '2025-08-14 15:30:00'),
(3, 15, 1, 9, 'Type 2 Diabetes', '2025-08-20', 'Moderate', 'Fasting blood sugar: 140 mg/dL. Diet and exercise plan prescribed.', '2025-08-20 11:15:00', '2025-08-20 11:15:00');

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
(1, 1, '12345', NULL, 5, '2025-08-09 02:19:33', '2025-08-17 12:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_lab_requests`
--

CREATE TABLE `tbl_lab_requests` (
  `lab_request_id` int(11) NOT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `secretary_id` int(11) DEFAULT NULL,
  `patient_id` int(11) NOT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `request_text` text NOT NULL,
  `status_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lab_requests`
--

INSERT INTO `tbl_lab_requests` (`lab_request_id`, `doctor_id`, `secretary_id`, `patient_id`, `appointment_id`, `request_text`, `status_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 9, 12, 'Complete Blood Count (CBC) - Patient experiencing fatigue and weakness', 14, '2025-08-15 10:30:00', '2025-08-17 02:11:36'),
(2, NULL, 1, 10, NULL, 'Blood Sugar Test - Routine check for diabetes monitoring', 15, '2025-08-16 14:20:00', '2025-08-17 02:11:36'),
(3, 1, 1, 11, NULL, 'Urinalysis - Patient complaining of frequent urination', 14, '2025-08-17 09:15:00', '2025-08-17 02:11:36'),
(4, NULL, 1, 9, NULL, 'Lipid Profile - Annual health check', 15, '2025-08-18 11:45:00', '2025-08-17 02:11:36'),
(5, 1, 1, 10, NULL, 'Liver Function Test - Pre-surgery requirement', 16, '2025-08-19 16:30:00', '2025-08-17 02:11:36');

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
(1, 2, 10, NULL, 'blood_sugar_test_2025_08_16.pdf', 'Blood Sugar Level: 95 mg/dL (Normal Range: 70-100 mg/dL)\n\nResults: Normal\n\nRecommendations: Continue current diet and exercise routine.', 5, '2025-08-16 15:30:00', 15),
(2, 4, 9, NULL, 'lipid_profile_2025_08_18.pdf', 'Total Cholesterol: 180 mg/dL (Normal: <200)\nHDL: 55 mg/dL (Normal: >40)\nLDL: 100 mg/dL (Normal: <100)\nTriglycerides: 120 mg/dL (Normal: <150)\n\nResults: All values within normal range', 5, '2025-08-18 13:20:00', 15),
(3, 5, 10, 1, 'liver_function_2025_08_19.pdf', 'ALT: 25 U/L (Normal: 7-55)\nAST: 28 U/L (Normal: 8-48)\nAlkaline Phosphatase: 70 U/L (Normal: 44-147)\nTotal Bilirubin: 0.8 mg/dL (Normal: 0.3-1.2)\n\nResults: Normal liver function\n\nCleared for surgery.', 5, '2025-08-19 17:45:00', 15);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicines`
--

CREATE TABLE `tbl_medicines` (
  `medicine_id` int(11) NOT NULL,
  `medicine_name` varchar(255) NOT NULL,
  `weight` varchar(100) DEFAULT NULL,
  `form_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicines`
--

INSERT INTO `tbl_medicines` (`medicine_id`, `medicine_name`, `weight`, `form_id`, `price`, `created_at`, `updated_at`) VALUES
(1, 'Paracetamol', '500mg', 1, 50.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(2, 'Ibuprofen', '400mg', 1, 80.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(3, 'Amoxicillin', '500mg', 3, 120.00, '2025-08-10 15:35:40', '2025-08-10 15:35:40'),
(5, 'Biogesic', '500mg', 1, 12.00, '2025-08-10 17:43:53', '2025-08-10 17:43:53'),
(8, 'Aspirin', '100mg', 1, 13.00, '2025-08-16 16:42:39', '2025-08-16 16:42:39'),
(9, 'Omeprazole', '20mg', 3, 25.00, '2025-08-16 16:42:39', '2025-08-16 16:42:39');

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
(3, 'capsule'),
(5, 'injection'),
(4, 'ointment'),
(2, 'syrup'),
(1, 'tablet');

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
(4, '1000mg'),
(1, '100mg'),
(8, '120mg'),
(5, '20mg'),
(2, '250mg'),
(6, '40mg'),
(3, '500mg'),
(7, '80mg');

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
(2, 9, 'Female', '12312', '2025-08-19', 'asdasdasdasdasd', '2025-08-09 02:34:23', '2025-08-10 02:26:37'),
(3, 10, 'Male', '213219090909090', '2025-08-19', '213123', '2025-08-09 11:37:56', '2025-08-12 01:45:59'),
(4, 15, 'Female', '3223', '2025-08-15', 'qweqeasdasdas', '2025-08-09 18:00:37', '2025-08-09 18:24:46'),
(6, 18, 'Male', '123123123', '2025-08-21', 'asdasdasdasd', '2025-08-09 18:31:52', '2025-08-12 06:27:07'),
(9, 21, 'Female', '0921093012903123', '2025-08-21', 'wqeqweq', '2025-08-12 04:53:30', '2025-08-12 06:18:50'),
(10, 22, 'Female', '123123123', '2025-09-04', 'bulua', '2025-08-12 06:28:51', '2025-08-12 06:28:51'),
(11, 11, NULL, NULL, NULL, NULL, '2025-08-13 19:12:20', '2025-08-13 19:12:20'),
(12, 23, NULL, NULL, NULL, NULL, '2025-08-16 08:53:24', '2025-08-16 08:53:24'),
(13, 24, NULL, NULL, NULL, NULL, '2025-08-17 03:29:08', '2025-08-17 03:29:08'),
(14, 25, NULL, NULL, NULL, NULL, '2025-08-17 04:00:10', '2025-08-17 04:00:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payments`
--

CREATE TABLE `tbl_payments` (
  `payment_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
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
(2, 14, 11, 750.00, 'Online', 12, '2025-08-14 14:15:00', '2025-08-14 14:15:00', '2025-08-14 14:15:00'),
(3, 15, 9, 600.00, 'Walk-in', 11, NULL, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(4, 0, 10, 300.00, 'Online', 12, '2025-08-16 16:45:00', '2025-08-16 16:45:00', '2025-08-16 16:45:00'),
(5, 0, 11, 450.00, 'Walk-in', 11, NULL, '2025-08-17 11:20:00', '2025-08-17 11:20:00');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_prescriptions`
--

CREATE TABLE `tbl_prescriptions` (
  `prescription_id` int(11) NOT NULL,
  `diagnosis_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `dosage` varchar(100) NOT NULL,
  `frequency` varchar(100) NOT NULL,
  `duration` varchar(100) NOT NULL,
  `instructions` text DEFAULT NULL,
  `status` enum('Active','Completed','Cancelled') DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_prescriptions`
--

INSERT INTO `tbl_prescriptions` (`prescription_id`, `diagnosis_id`, `appointment_id`, `doctor_id`, `patient_id`, `medicine_id`, `dosage`, `frequency`, `duration`, `instructions`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 12, 1, 9, 3, '500mg', 'Every 8 hours', '7 days', 'Take with food. Complete the full course even if symptoms improve.', 'Active', '2025-08-15 11:00:00', '2025-08-15 11:00:00'),
(2, 1, 12, 1, 9, 1, '500mg', 'Every 6 hours', '3 days', 'Take for fever and pain relief. Do not exceed 4 doses per day.', 'Active', '2025-08-15 11:00:00', '2025-08-15 11:00:00'),
(3, 2, 14, 1, 11, 9, '20mg', 'Once daily', '30 days', 'Take in the morning before breakfast. Monitor blood pressure regularly.', 'Active', '2025-08-14 16:00:00', '2025-08-14 16:00:00'),
(4, 3, 15, 1, 9, 9, '20mg', 'Once daily', '90 days', 'Take with meals. Regular blood sugar monitoring required.', 'Active', '2025-08-20 12:00:00', '2025-08-20 12:00:00');

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
(2, 11, '898989', '2025-08-09 11:38:12', '2025-08-09 11:38:12');

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
(4, 'General Medicine', 'Non-specialized outpatient care for adults.'),
(5, 'Pediatrics', 'Healthcare for infants, children, and adolescents.'),
(6, 'Obstetrics & Gynecology (OB-GYN)', 'Women’s reproductive health and pregnancy.'),
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
(16, 3, 'Delivered');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `name`, `email`, `password`, `role_id`, `created_at`) VALUES
(1, 'micah', 'micah@gmail.com', '$2y$10$8FWI3m/9qrJpvUxAdHPZEO7wP9xx5HC.GEl/Ft3FkPGloUzzqBMQ.', 2, '2025-08-09 02:19:33'),
(2, 'John', 'john@gmail.com', '$2y$10$Zc4MZ7gMJ9sfwgpO4Kp66O/L5TcnaUceSv5fFiyrfpSPePR5rtaDO', 3, '2025-08-09 02:23:47'),
(3, 'roberth', 'rob@gmail.com', '$2y$10$QPuk6MjWCBjbpWHCdI354OT3B/jottSnHN2r0P73qq3y54DEUH5UG', 3, '2025-08-09 02:24:39'),
(4, 'yumi', 'yumi@gmail.com', '$2y$10$Zqlmv82NuXUFKCYgVJbnDeA4MLjUNb8zkSVmwKCJ6jNM9OrEYEulO', 3, '2025-08-09 02:27:06'),
(5, 'secretary', 'secretary@gmail.com', '$2y$10$fzr/ZTmgUc/IfpzPcwXh3.uL.JggbyjTVTy9t5BNCi71IpE6.Z89a', 1, '2025-08-09 02:28:42'),
(6, 'nor', 'nor@gmail.com', '$2y$10$O2kWQGzF5ivICBBZ6N1Bie2QX.hsczgOAXjlZiOu714Of8H6MtO.K', 3, '2025-08-09 02:29:03'),
(7, '1234', '123@gmail.com', '$2y$10$SKWHlInXt9DtUAvaEGYqt.4lSiV.hto8rF93Bf84kgAlSGo6AZaAW', 3, '2025-08-09 02:31:46'),
(8, 'huhu', 'huhu@gmail.com', '$2y$10$3qSuvL.MVFED5YeqKmht7etUepcKPtPAMaRc.8af2JYn8DMZ4emha', 3, '2025-08-09 02:33:12'),
(9, 'haha', 'haha@gmail.com', '$2y$10$NvlynSBdXCwiaaF2YbE1p.XS0iLhsBiWGpebr7CXxiAOOJJ/oALVa', 3, '2025-08-09 02:34:23'),
(10, 'asd', 'asd@gmail.com', '$2y$10$X1ko3vb/3ERZFuV0tO817OYLtEk4/DKUWPwd90w26YsqEtLMKt.iS', 3, '2025-08-09 11:37:56'),
(11, 'miya ', 'miya@gmail.com', '$2y$10$K9N/NsZ6U3/YDt6e0AtYteKv7GloY95ykAvKPUBzkM3RYHKFnVsT.', 1, '2025-08-09 11:38:12'),
(15, 'asdd', 'inzie@gmail.com', '', 3, '2025-08-09 18:00:37'),
(16, 'asdasdasd', 'asdasdsasdasdasd@gmail.com', '', 3, '2025-08-09 18:07:09'),
(18, 'Norelyn', 'norelyn@gmail.com', '$2y$10$9fgMutwHEJuCobqxEsfrHO01xggOwClk2bswm.6NAc8fgKvolAtbW', 3, '2025-08-09 18:31:52'),
(19, 'Norelyn', 'asdasdSdasdasd@gmail.com', '$2y$10$oyotCJlUMnWnkCOsEuCON.eB2VNBKZQaqIljOaOPko2dG0eKWPUlq', 3, '2025-08-09 18:31:52'),
(20, '', '', '$2y$10$pzsofR1PztfUbYBFLEquwO/fYExlcFrRue.i1OkerSVPYiAZLyAPC', 3, '2025-08-09 18:31:52'),
(21, 'jannah', 'jannah@gmail.com', '$2y$10$54SA/1mTO5ZJ2U.Y.hOimOHgVzWbP/2dZChcawFwrlYiwWUfx9x/G', 3, '2025-08-12 04:53:30'),
(22, 'shandi', 'shandi@gmail.com', '$2y$10$yDuVvcDuwtfRq5iZzz.8JOE6GwOSTZURsNtlv/EiPDEIgqdUkkD7y', 3, '2025-08-12 06:28:51'),
(23, 'Sean ', 'sean@gmail.com', '$2y$10$DsLyM1L3/k2iMduqW2ZegOA5gbcbLv1xBngj/2HndmK4QlAU4Gvy6', 3, '2025-08-16 08:53:24'),
(24, 'Mckenzie', 'mckenzie@gmail.com', '$2y$10$OFSl/JnOcUsxmNg.q60CoOjEGd2iRNIb0jofBJfEzCjTKa71vFVsa', 3, '2025-08-17 03:29:08'),
(25, 'Laurice', 'laurice@gmail.com', '$2y$10$aQMsjAzelO6rpPbZuiJbU.2PRLnxHMjpk5MP57ia0ze2us8h/6RZm', 3, '2025-08-17 04:00:10'),
(26, 'John Smith', 'smith@gmail.com', '$2y$10$9bpJzjplifMlEo.AD5WxruKwTrhIC3l5/vhq44PHMJEyY2ojliwI2', 2, '2025-08-17 04:01:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `status_id` (`status_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `secretary_id` (`secretary_id`);

--
-- Indexes for table `tbl_diagnoses`
--
ALTER TABLE `tbl_diagnoses`
  ADD PRIMARY KEY (`diagnosis_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD PRIMARY KEY (`doctor_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_doctor_specialization` (`specialization_id`);

--
-- Indexes for table `tbl_lab_requests`
--
ALTER TABLE `tbl_lab_requests`
  ADD PRIMARY KEY (`lab_request_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `status_id` (`status_id`),
  ADD KEY `secretary_id` (`secretary_id`);

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
-- Indexes for table `tbl_medicines`
--
ALTER TABLE `tbl_medicines`
  ADD PRIMARY KEY (`medicine_id`),
  ADD UNIQUE KEY `medicine_name` (`medicine_name`),
  ADD KEY `form_id` (`form_id`);

--
-- Indexes for table `tbl_medicine_forms`
--
ALTER TABLE `tbl_medicine_forms`
  ADD PRIMARY KEY (`form_id`),
  ADD UNIQUE KEY `form_name` (`form_name`);

--
-- Indexes for table `tbl_medicine_weights`
--
ALTER TABLE `tbl_medicine_weights`
  ADD PRIMARY KEY (`weight_id`),
  ADD UNIQUE KEY `weight_value` (`weight_value`);

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
  ADD KEY `status_id` (`status_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  ADD PRIMARY KEY (`prescription_id`),
  ADD KEY `diagnosis_id` (`diagnosis_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `medicine_id` (`medicine_id`);

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
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_diagnoses`
--
ALTER TABLE `tbl_diagnoses`
  MODIFY `diagnosis_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  MODIFY `doctor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- AUTO_INCREMENT for table `tbl_medicines`
--
ALTER TABLE `tbl_medicines`
  MODIFY `medicine_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tbl_medicine_forms`
--
ALTER TABLE `tbl_medicine_forms`
  MODIFY `form_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_medicine_weights`
--
ALTER TABLE `tbl_medicine_weights`
  MODIFY `weight_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  MODIFY `prescription_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_secretaries`
--
ALTER TABLE `tbl_secretaries`
  MODIFY `secretary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_specializations`
--
ALTER TABLE `tbl_specializations`
  MODIFY `specialization_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_status`
--
ALTER TABLE `tbl_status`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_status_type`
--
ALTER TABLE `tbl_status_type`
  MODIFY `status_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_appointments`
--
ALTER TABLE `tbl_appointments`
  ADD CONSTRAINT `tbl_appointments_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`),
  ADD CONSTRAINT `tbl_appointments_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`),
  ADD CONSTRAINT `tbl_appointments_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`),
  ADD CONSTRAINT `tbl_appointments_ibfk_4` FOREIGN KEY (`secretary_id`) REFERENCES `tbl_secretaries` (`secretary_id`);

--
-- Constraints for table `tbl_diagnoses`
--
ALTER TABLE `tbl_diagnoses`
  ADD CONSTRAINT `tbl_diagnoses_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_diagnoses_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_diagnoses_ibfk_3` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD CONSTRAINT `fk_doctor_specialization` FOREIGN KEY (`specialization_id`) REFERENCES `tbl_specializations` (`specialization_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_doctors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_lab_requests`
--
ALTER TABLE `tbl_lab_requests`
  ADD CONSTRAINT `tbl_lab_requests_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_lab_requests_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_lab_requests_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_lab_requests_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`),
  ADD CONSTRAINT `tbl_lab_requests_ibfk_5` FOREIGN KEY (`secretary_id`) REFERENCES `tbl_secretaries` (`secretary_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_lab_results`
--
ALTER TABLE `tbl_lab_results`
  ADD CONSTRAINT `tbl_lab_results_ibfk_1` FOREIGN KEY (`lab_request_id`) REFERENCES `tbl_lab_requests` (`lab_request_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_lab_results_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_lab_results_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_lab_results_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `tbl_status` (`status_id`),
  ADD CONSTRAINT `tbl_lab_results_ibfk_5` FOREIGN KEY (`uploaded_by`) REFERENCES `tbl_users` (`user_id`);

--
-- Constraints for table `tbl_medicines`
--
ALTER TABLE `tbl_medicines`
  ADD CONSTRAINT `tbl_medicines_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `tbl_medicine_forms` (`form_id`);

--
-- Constraints for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  ADD CONSTRAINT `tbl_patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_prescriptions`
--
ALTER TABLE `tbl_prescriptions`
  ADD CONSTRAINT `tbl_prescriptions_ibfk_1` FOREIGN KEY (`diagnosis_id`) REFERENCES `tbl_diagnoses` (`diagnosis_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_prescriptions_ibfk_2` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_prescriptions_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_prescriptions_ibfk_4` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_prescriptions_ibfk_5` FOREIGN KEY (`medicine_id`) REFERENCES `tbl_medicines` (`medicine_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
