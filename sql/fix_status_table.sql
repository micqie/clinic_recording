-- Fix duplicate status types and clean up status table
-- This script fixes the issues in the status table

-- First, let's see what we have
SELECT * FROM tbl_status ORDER BY status_type_id, status_id;

-- Remove duplicate status type 4 (Appointment) since type 1 already exists
-- Update statuses that reference type 4 to use type 1 instead
UPDATE tbl_status SET status_type_id = 1 WHERE status_type_id = 4;

-- Now remove the duplicate status type
DELETE FROM tbl_status_type WHERE status_type_id = 4;

-- Verify the fix
SELECT * FROM tbl_status ORDER BY status_type_id, status_id;
SELECT * FROM tbl_status_type ORDER BY status_type_id;

-- Reset auto-increment for status_type table
ALTER TABLE tbl_status_type AUTO_INCREMENT = 4;

