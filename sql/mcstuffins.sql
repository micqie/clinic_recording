-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 09, 2025 at 07:19 PM
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
-- Database: `mcstuffins`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_doctors`
--

CREATE TABLE `tbl_doctors` (
  `doctor_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `license_number` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_doctors`
--

INSERT INTO `tbl_doctors` (`doctor_id`, `user_id`, `license_number`) VALUES
(1, 1, '12345');

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
(1, 7, 'Male', '', '0000-00-00', '', '2025-08-09 02:31:46', '2025-08-09 02:31:46'),
(2, 9, NULL, NULL, NULL, NULL, '2025-08-09 02:34:23', '2025-08-09 02:34:23'),
(3, 10, NULL, NULL, NULL, NULL, '2025-08-09 11:37:56', '2025-08-09 11:37:56');

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
  `employee_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_secretaries`
--

INSERT INTO `tbl_secretaries` (`secretary_id`, `user_id`, `employee_id`) VALUES
(1, 5, '09870696'),
(2, 11, '898989');

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
(11, 'miya ', 'miya@gmail.com', '$2y$10$K9N/NsZ6U3/YDt6e0AtYteKv7GloY95ykAvKPUBzkM3RYHKFnVsT.', 1, '2025-08-09 11:38:12');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD PRIMARY KEY (`doctor_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  ADD PRIMARY KEY (`patient_id`),
  ADD KEY `user_id` (`user_id`);

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
-- AUTO_INCREMENT for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  MODIFY `doctor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_doctors`
--
ALTER TABLE `tbl_doctors`
  ADD CONSTRAINT `tbl_doctors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_patients`
--
ALTER TABLE `tbl_patients`
  ADD CONSTRAINT `tbl_patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_secretaries`
--
ALTER TABLE `tbl_secretaries`
  ADD CONSTRAINT `tbl_secretaries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD CONSTRAINT `tbl_users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
