-- Seed sample data for development
-- Run: mysql -u root -p mcstuffins2 < sql/seed_sample_data.sql

START TRANSACTION;

-- Roles
INSERT IGNORE INTO tbl_roles (role_id, role_name) VALUES (1,'secretary'),(2,'doctor'),(3,'patient');

-- Status Types and Statuses (only if missing)
INSERT IGNORE INTO tbl_status_type (status_type_id, status_type_name) VALUES (1,'Appointment'),(2,'Payment'),(3,'LabResult');
INSERT IGNORE INTO tbl_status (status_id, status_type_id, status_name) VALUES
 (6,1,'Pending'),(7,1,'Confirmed'),(8,1,'Cancelled'),(9,1,'Completed'),(10,1,'No Show'),
 (11,2,'Unpaid'),(12,2,'Paid'),(13,2,'Refunded'),
 (14,3,'Processing'),(15,3,'Ready'),(16,3,'Delivered');

-- Users (secretary, doctor, two patients) - passwords are 'password'
INSERT INTO tbl_users (user_id, name, email, password, role_id) VALUES
 (1001,'Secretary One','sec1@example.com', PASSWORD('password'), 1),
 (1002,'Dr. Smith','doc1@example.com', PASSWORD('password'), 2),
 (1003,'Alice Patient','alice@example.com', PASSWORD('password'), 3),
 (1004,'Bob Patient','bob@example.com', PASSWORD('password'), 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Secretary/Doctor/Patients
INSERT IGNORE INTO tbl_secretaries (secretary_id, user_id, employee_id) VALUES (100,1001,'SEC-100');
INSERT IGNORE INTO tbl_doctors (doctor_id, user_id, license_number, specialization_id, years_experience) VALUES (100,1002,'LIC-100',1,8);
INSERT IGNORE INTO tbl_patients (patient_id, user_id, sex, contact_num, birthdate, address) VALUES
 (100,1003,'Female','09171234567','1991-04-12','Sample City'),
 (101,1004,'Male','09991234567','1988-10-23','Sample Town');

-- Lab Test Types
INSERT IGNORE INTO tbl_lab_test_types (lab_test_type_id, type_name, description) VALUES
 (100,'Complete Blood Count (CBC)','Measures RBC/WBC/Hb'),
 (101,'Comprehensive Metabolic Panel (CMP)','Electrolytes, kidney, liver'),
 (102,'Lipid Panel','Cholesterol and triglycerides');

-- Appointments (Confirmed)
INSERT INTO tbl_appointments (appointment_id, patient_id, doctor_id, secretary_id, appointment_date, queue_number, status_id) VALUES
 (100,100,100,100,'2025-08-20',1,7),
 (101,101,100,100,'2025-08-21',1,7)
ON DUPLICATE KEY UPDATE appointment_date=VALUES(appointment_date);

-- Lab Requests (one Delivered, one Ready)
INSERT INTO tbl_lab_requests (lab_request_id, doctor_id, secretary_id, patient_id, appointment_id, lab_test_type_id, request_text, status_id, created_at)
VALUES
 (100,100,100,100,100,100,'CBC due to fatigue',16,NOW()),
 (101,100,100,101,101,102,'Lipid panel annual check',15,NOW())
ON DUPLICATE KEY UPDATE status_id=VALUES(status_id);

-- Lab Results (for Delivered request)
INSERT INTO tbl_lab_results (result_id, lab_request_id, patient_id, doctor_id, result_text, uploaded_by, status_id)
VALUES
 (100,100,100,100,'Hemoglobin 11.8 g/dL (12-16) L\nWBC 7.2 x10^9/L (4-11)\nPlatelets 210 x10^9/L (150-450)',1001,15)
ON DUPLICATE KEY UPDATE result_text=VALUES(result_text);

COMMIT;
