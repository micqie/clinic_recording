-- Sample Data for MCSTUFFIN's Clinic Recording System
-- This file contains sample data for tables that need display data

-- Sample Lab Requests
INSERT INTO `tbl_lab_requests` (`lab_request_id`, `doctor_id`, `secretary_id`, `patient_id`, `appointment_id`, `request_text`, `status_id`, `created_at`) VALUES
(1, 1, 1, 9, 12, 'Complete Blood Count (CBC) - Patient experiencing fatigue and weakness', 14, '2025-08-15 10:30:00'),
(2, NULL, 1, 10, NULL, 'Blood Sugar Test - Routine check for diabetes monitoring', 15, '2025-08-16 14:20:00'),
(3, 1, 1, 11, NULL, 'Urinalysis - Patient complaining of frequent urination', 14, '2025-08-17 09:15:00'),
(4, NULL, 1, 9, NULL, 'Lipid Profile - Annual health check', 15, '2025-08-18 11:45:00'),
(5, 1, 1, 10, NULL, 'Liver Function Test - Pre-surgery requirement', 16, '2025-08-19 16:30:00');

-- Sample Lab Results
INSERT INTO `tbl_lab_results` (`result_id`, `lab_request_id`, `patient_id`, `doctor_id`, `result_file`, `result_text`, `uploaded_by`, `uploaded_at`, `status_id`) VALUES
(1, 2, 10, NULL, 'blood_sugar_test_2025_08_16.pdf', 'Blood Sugar Level: 95 mg/dL (Normal Range: 70-100 mg/dL)\n\nResults: Normal\n\nRecommendations: Continue current diet and exercise routine.', 5, '2025-08-16 15:30:00', 15),
(2, 4, 9, NULL, 'lipid_profile_2025_08_18.pdf', 'Total Cholesterol: 180 mg/dL (Normal: <200)\nHDL: 55 mg/dL (Normal: >40)\nLDL: 100 mg/dL (Normal: <100)\nTriglycerides: 120 mg/dL (Normal: <150)\n\nResults: All values within normal range', 5, '2025-08-18 13:20:00', 15),
(3, 5, 10, 1, 'liver_function_2025_08_19.pdf', 'ALT: 25 U/L (Normal: 7-55)\nAST: 28 U/L (Normal: 8-48)\nAlkaline Phosphatase: 70 U/L (Normal: 44-147)\nTotal Bilirubin: 0.8 mg/dL (Normal: 0.3-1.2)\n\nResults: Normal liver function\n\nCleared for surgery.', 5, '2025-08-19 17:45:00', 15);

-- Sample Payments (only using existing appointment IDs: 12, 14, 15)
INSERT INTO `tbl_payments` (`payment_id`, `appointment_id`, `patient_id`, `amount`, `payment_method`, `status_id`, `payment_date`, `created_at`, `updated_at`) VALUES
(1, 12, 9, 500.00, 'Walk-in', 12, '2025-08-15 09:30:00', '2025-08-15 09:30:00', '2025-08-15 09:30:00'),
(2, 14, 11, 750.00, 'Online', 12, '2025-08-14 14:15:00', '2025-08-14 14:15:00', '2025-08-14 14:15:00'),
(3, 15, 9, 600.00, 'Walk-in', 11, NULL, '2025-08-20 10:00:00', '2025-08-20 10:00:00');

-- Sample Diagnoses (only using existing appointment IDs: 12, 14, 15)
INSERT INTO `tbl_diagnoses` (`diagnosis_id`, `appointment_id`, `doctor_id`, `patient_id`, `condition_name`, `date_diagnosed`, `severity`, `notes`, `created_at`, `updated_at`) VALUES
(1, 12, 1, 9, 'Upper Respiratory Tract Infection', '2025-08-15', 'Mild', 'Patient presents with cough, sore throat, and mild fever. Prescribed antibiotics and rest.', '2025-08-15 10:45:00', '2025-08-15 10:45:00'),
(2, 14, 1, 11, 'Hypertension', '2025-08-14', 'Moderate', 'Blood pressure reading: 150/95 mmHg. Lifestyle modifications recommended along with medication.', '2025-08-14 15:30:00', '2025-08-14 15:30:00'),
(3, 15, 1, 9, 'Type 2 Diabetes', '2025-08-20', 'Moderate', 'Fasting blood sugar: 140 mg/dL. Diet and exercise plan prescribed.', '2025-08-20 11:15:00', '2025-08-20 11:15:00');

-- Sample Prescriptions (only using existing appointment IDs: 12, 14, 15)
INSERT INTO `tbl_prescriptions` (`prescription_id`, `diagnosis_id`, `appointment_id`, `doctor_id`, `patient_id`, `medicine_id`, `dosage`, `frequency`, `duration`, `instructions`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 12, 1, 9, 3, '500mg', 'Every 8 hours', '7 days', 'Take with food. Complete the full course even if symptoms improve.', 'Active', '2025-08-15 11:00:00', '2025-08-15 11:00:00'),
(2, 1, 12, 1, 9, 1, '500mg', 'Every 6 hours', '3 days', 'Take for fever and pain relief. Do not exceed 4 doses per day.', 'Active', '2025-08-15 11:00:00', '2025-08-15 11:00:00'),
(3, 2, 14, 1, 11, 9, '20mg', 'Once daily', '30 days', 'Take in the morning before breakfast. Monitor blood pressure regularly.', 'Active', '2025-08-14 16:00:00', '2025-08-14 16:00:00'),
(4, 3, 15, 1, 9, 9, '20mg', 'Once daily', '90 days', 'Take with meals. Regular blood sugar monitoring required.', 'Active', '2025-08-20 12:00:00', '2025-08-20 12:00:00');

-- Additional Sample Medicines
INSERT INTO `tbl_medicines` (`medicine_id`, `medicine_name`, `weight`, `form_id`, `price`, `created_at`, `updated_at`) VALUES
(10, 'Cetirizine', '10mg', 1, 35.00, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(11, 'Loratadine', '10mg', 1, 40.00, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(12, 'Metformin', '500mg', 1, 25.00, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(13, 'Losartan', '50mg', 1, 45.00, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(14, 'Simvastatin', '20mg', 1, 55.00, '2025-08-20 10:00:00', '2025-08-20 10:00:00'),
(15, 'Amlodipine', '5mg', 1, 30.00, '2025-08-20 10:00:00', '2025-08-20 10:00:00');

-- Additional Sample Appointments
INSERT INTO `tbl_appointments` (`appointment_id`, `patient_id`, `doctor_id`, `secretary_id`, `appointment_date`, `queue_number`, `status_id`) VALUES
(16, 10, 1, 1, '2025-08-25', 2, 7),
(17, 11, 1, 1, '2025-08-26', 1, 6),
(18, 9, 1, 1, '2025-08-27', 3, 6),
(19, 10, NULL, 1, '2025-08-28', NULL, 6),
(20, 11, 1, 1, '2025-08-29', 2, 7);

-- Additional Sample Payments (using the new appointment IDs)
INSERT INTO `tbl_payments` (`payment_id`, `appointment_id`, `patient_id`, `amount`, `payment_method`, `status_id`, `payment_date`, `created_at`, `updated_at`) VALUES
(4, 16, 10, 300.00, 'Online', 12, '2025-08-25 16:45:00', '2025-08-25 16:45:00', '2025-08-25 16:45:00'),
(5, 17, 11, 450.00, 'Walk-in', 11, NULL, '2025-08-26 11:20:00', '2025-08-26 11:20:00'),
(6, 18, 9, 550.00, 'Online', 12, '2025-08-27 14:30:00', '2025-08-27 14:30:00', '2025-08-27 14:30:00'),
(7, 19, 10, 400.00, 'Walk-in', 11, NULL, '2025-08-28 09:15:00', '2025-08-28 09:15:00'),
(8, 20, 11, 650.00, 'Online', 12, '2025-08-29 13:45:00', '2025-08-29 13:45:00', '2025-08-29 13:45:00');
