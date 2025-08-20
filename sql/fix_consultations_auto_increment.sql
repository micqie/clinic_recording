-- Fix consultations table auto-increment issue
-- This script adds AUTO_INCREMENT to the consultation_id column

USE mcstuffins2;

-- First, check current data
SELECT 'Current consultations:' as info;
SELECT consultation_id, patient_id, summary FROM tbl_consultations ORDER BY consultation_id;

-- Create a backup table with the current data
CREATE TABLE tbl_consultations_backup AS SELECT * FROM tbl_consultations;

-- Drop the original table
DROP TABLE tbl_consultations;

-- Recreate the table with proper AUTO_INCREMENT
CREATE TABLE `tbl_consultations` (
  `consultation_id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `summary` text NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`consultation_id`),
  KEY `appointment_id` (`appointment_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `patient_id` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Restore the data (this will auto-assign new IDs)
INSERT INTO tbl_consultations (appointment_id, doctor_id, patient_id, summary, notes, created_at, updated_at)
SELECT appointment_id, doctor_id, patient_id, summary, notes, created_at, updated_at
FROM tbl_consultations_backup;

-- Drop the backup table
DROP TABLE tbl_consultations_backup;

-- Verify the change
SHOW CREATE TABLE tbl_consultations;

-- Check final data
SELECT 'Final consultations:' as info;
SELECT consultation_id, patient_id, summary FROM tbl_consultations ORDER BY consultation_id;
