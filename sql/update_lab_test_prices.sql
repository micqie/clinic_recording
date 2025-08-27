-- Migration script to add price column to lab test types and update prices
-- Run this script on your existing database

-- Add price column to tbl_lab_test_types
ALTER TABLE `tbl_lab_test_types`
ADD COLUMN `price` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `description`;

-- Update existing lab test types with appropriate pricing
UPDATE `tbl_lab_test_types` SET `price` = 500.00 WHERE `type_name` LIKE '%Complete Blood Count%' OR `type_name` LIKE '%CBC%';
UPDATE `tbl_lab_test_types` SET `price` = 300.00 WHERE `type_name` LIKE '%Blood Sugar%' OR `type_name` LIKE '%Glucose%';
UPDATE `tbl_lab_test_types` SET `price` = 250.00 WHERE `type_name` LIKE '%Urinalysis%' OR `type_name` LIKE '%Urine%';
UPDATE `tbl_lab_test_types` SET `price` = 600.00 WHERE `type_name` LIKE '%Lipid%' OR `type_name` LIKE '%Cholesterol%';
UPDATE `tbl_lab_test_types` SET `price` = 800.00 WHERE `type_name` LIKE '%Liver%' OR `type_name` LIKE '%Hepatic%';

-- Set default price for any remaining lab tests
UPDATE `tbl_lab_test_types` SET `price` = 400.00 WHERE `price` = 0.00;

