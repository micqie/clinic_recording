-- Doctor Availability Management Tables
-- This file adds tables for managing doctor availability and schedules

-- Table for doctor availability/unavailability dates
CREATE TABLE `tbl_doctor_availability` (
  `availability_id` int(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=Available, 0=Not Available',
  `reason` varchar(255) DEFAULT NULL COMMENT 'Reason for unavailability',
  `created_by` int(11) DEFAULT NULL COMMENT 'User who set this availability',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`availability_id`),
  UNIQUE KEY `unique_doctor_date` (`doctor_id`, `date`),
  KEY `fk_availability_doctor` (`doctor_id`),
  KEY `fk_availability_created_by` (`created_by`),
  CONSTRAINT `fk_availability_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctors` (`doctor_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_availability_created_by` FOREIGN KEY (`created_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table for current queue status (managed by secretary)
CREATE TABLE `tbl_current_queue` (
  `queue_id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `current_appointment_id` int(11) DEFAULT NULL COMMENT 'Currently being consulted',
  `next_appointment_id` int(11) DEFAULT NULL COMMENT 'Next in queue',
  `last_updated_by` int(11) DEFAULT NULL COMMENT 'Secretary who last updated',
  `last_updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`queue_id`),
  UNIQUE KEY `unique_date_queue` (`date`),
  KEY `fk_queue_current_appointment` (`current_appointment_id`),
  KEY `fk_queue_next_appointment` (`next_appointment_id`),
  KEY `fk_queue_updated_by` (`last_updated_by`),
  CONSTRAINT `fk_queue_current_appointment` FOREIGN KEY (`current_appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_queue_next_appointment` FOREIGN KEY (`next_appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_queue_updated_by` FOREIGN KEY (`last_updated_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert some sample availability data (optional)
-- INSERT INTO `tbl_doctor_availability` (`doctor_id`, `date`, `is_available`, `reason`) VALUES
-- (1, '2025-08-25', 0, 'Vacation'),
-- (2, '2025-08-26', 0, 'Conference'),
-- (3, '2025-08-27', 0, 'Personal leave');
