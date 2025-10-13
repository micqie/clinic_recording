-- Update database schema to support nurse-patient workflow
-- This script adds new statuses and updates the system for nurse routing

-- Add new statuses for nurse workflow
INSERT INTO `tbl_status` (`status_id`, `status_type_id`, `status_name`) VALUES
(21, 1, 'Waiting for Nurse'),
(22, 1, 'Nurse Assessment'),
(23, 1, 'Waiting for Doctor');

-- Update existing statuses if needed (optional - for clarity)
-- The system will now have these appointment statuses:
-- 6: Pending
-- 7: Confirmed  
-- 9: Completed
-- 17: In Consultation
-- 21: Waiting for Nurse (NEW)
-- 22: Nurse Assessment (NEW) 
-- 23: Waiting for Doctor (NEW)

-- Add a new table to track nurse assessments
CREATE TABLE `tbl_nurse_assessments` (
  `assessment_id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `nurse_id` int(11) NOT NULL,
  `assessment_date` datetime DEFAULT current_timestamp(),
  `vitals_completed` tinyint(1) DEFAULT 0,
  `history_completed` tinyint(1) DEFAULT 0,
  `assessment_notes` text DEFAULT NULL,
  `forwarded_to_doctor` tinyint(1) DEFAULT 0,
  `forwarded_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assessment_id`),
  KEY `fk_assessment_appointment` (`appointment_id`),
  KEY `fk_assessment_nurse` (`nurse_id`),
  CONSTRAINT `fk_assessment_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessment_nurse` FOREIGN KEY (`nurse_id`) REFERENCES `tbl_nurses` (`nurse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add indexes for better performance
ALTER TABLE `tbl_nurse_assessments` ADD INDEX `idx_assessment_date` (`assessment_date`);
ALTER TABLE `tbl_nurse_assessments` ADD INDEX `idx_forwarded_status` (`forwarded_to_doctor`);

-- Update the consultation_status enum to include 'Triage' status
-- Note: This might require dropping and recreating the column if it's already in use
-- For now, we'll work with the existing 'Active' status for triage
