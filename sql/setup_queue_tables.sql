-- Queue Management System Database Setup
-- Run this script to ensure all required tables exist

-- Check and create tbl_current_queue if it doesn't exist
CREATE TABLE IF NOT EXISTS `tbl_current_queue` (
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

-- Check and create tbl_doctor_availability if it doesn't exist
CREATE TABLE IF NOT EXISTS `tbl_doctor_availability` (
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

-- Ensure required appointment statuses exist
INSERT IGNORE INTO `tbl_status` (`status_name`, `status_type_id`)
SELECT 'In Consultation', st.status_type_id
FROM `tbl_status_type` st
WHERE st.status_type_name = 'Appointment'
AND NOT EXISTS (
    SELECT 1 FROM `tbl_status` s
    WHERE s.status_name = 'In Consultation'
    AND s.status_type_id = st.status_type_id
);

INSERT IGNORE INTO `tbl_status` (`status_name`, `status_type_id`)
SELECT 'Completed', st.status_type_id
FROM `tbl_status_type` st
WHERE st.status_type_name = 'Appointment'
AND NOT EXISTS (
    SELECT 1 FROM `tbl_status` s
    WHERE s.status_name = 'Completed'
    AND s.status_type_id = st.status_type_id
);

INSERT IGNORE INTO `tbl_status` (`status_name`, `status_type_id`)
SELECT 'Confirmed', st.status_type_id
FROM `tbl_status_type` st
WHERE st.status_type_name = 'Appointment'
AND NOT EXISTS (
    SELECT 1 FROM `tbl_status` s
    WHERE s.status_name = 'Confirmed'
    AND s.status_type_id = st.status_type_id
);

-- If status_type doesn't exist, create it
INSERT IGNORE INTO `tbl_status_type` (`status_type_name`) VALUES ('Appointment');

-- Then ensure the statuses exist (in case status_type was just created)
INSERT IGNORE INTO `tbl_status` (`status_name`, `status_type_id`)
SELECT 'In Consultation', st.status_type_id
FROM `tbl_status_type` st
WHERE st.status_type_name = 'Appointment'
AND NOT EXISTS (
    SELECT 1 FROM `tbl_status` s
    WHERE s.status_name = 'In Consultation'
    AND s.status_type_id = st.status_type_id
);

INSERT IGNORE INTO `tbl_status` (`status_name`, `status_type_id`)
SELECT 'Completed', st.status_type_id
FROM `tbl_status_type` st
WHERE st.status_type_name = 'Appointment'
AND NOT EXISTS (
    SELECT 1 FROM `tbl_status` s
    WHERE s.status_name = 'Completed'
    AND s.status_type_id = st.status_type_id
);

INSERT IGNORE INTO `tbl_status` (`status_name`, `status_type_id`)
SELECT 'Confirmed', st.status_type_id
FROM `tbl_status_type` st
WHERE st.status_type_name = 'Appointment'
AND NOT EXISTS (
    SELECT 1 FROM `tbl_status` s
    WHERE s.status_name = 'Confirmed'
    AND s.status_type_id = st.status_type_id
);

-- Show confirmation
SELECT 'Queue management tables setup completed successfully!' as message;
