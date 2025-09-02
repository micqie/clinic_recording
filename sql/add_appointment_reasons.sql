-- Add appointment reason fields to tbl_appointments
ALTER TABLE `tbl_appointments`
ADD COLUMN `appointment_reason_id` INT NULL AFTER `status_id`,
ADD COLUMN `appointment_notes` TEXT NULL AFTER `appointment_reason_id`,
ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP AFTER `appointment_notes`,
ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Create table for appointment reasons
CREATE TABLE `tbl_appointment_reasons` (
  `reason_id` int(11) NOT NULL AUTO_INCREMENT,
  `reason_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reason_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert common appointment reasons
INSERT INTO `tbl_appointment_reasons` (`reason_name`, `description`) VALUES
('Fever & Cough', 'Common symptoms requiring medical attention'),
('Skin Allergy', 'Skin conditions and allergic reactions'),
('Check-up', 'Regular health examination'),
('Lab Results Review', 'Follow-up consultation for laboratory results'),
('Headache', 'Head pain and related symptoms'),
('Stomach Pain', 'Abdominal discomfort and digestive issues'),
('Back Pain', 'Spinal and back-related pain'),
('Dental Issues', 'Oral health problems'),
('Eye Problems', 'Vision and eye-related issues'),
('Follow-up', 'Follow-up appointment for previous consultation'),
('Vaccination', 'Immunization and vaccine administration'),
('Prenatal Care', 'Pregnancy-related healthcare'),
('Chronic Disease Management', 'Ongoing treatment for chronic conditions'),
('Emergency', 'Urgent medical attention required'),
('Other', 'Other medical concerns not listed above');

-- Add foreign key constraint
ALTER TABLE `tbl_appointments`
ADD CONSTRAINT `fk_appointment_reason`
FOREIGN KEY (`appointment_reason_id`) REFERENCES `tbl_appointment_reasons`(`reason_id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX `idx_appointment_reason` ON `tbl_appointments`(`appointment_reason_id`);
CREATE INDEX `idx_appointment_date_reason` ON `tbl_appointments`(`appointment_date`, `appointment_reason_id`);
