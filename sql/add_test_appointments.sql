-- Add test appointments for today (2025-08-28) to test queue management
-- This script adds sample appointments that can be used for testing

-- First, let's add some test appointments for today
INSERT INTO tbl_appointments (patient_id, doctor_id, secretary_id, appointment_date, queue_number, status_id) VALUES
-- Patient 9 (Jannah) with Doctor 1 (micah) - Confirmed
(9, 1, 1, '2025-08-28', 1, 7),
-- Patient 10 (shandi) with Doctor 2 (John Smith) - Confirmed
(10, 2, 1, '2025-08-28', 2, 7),
-- Patient 12 (Sean) with Doctor 3 (HENRY KING) - Confirmed
(12, 3, 1, '2025-08-28', 3, 7),
-- Patient 13 (Mckenzie) with Doctor 1 (micah) - Confirmed
(13, 1, 1, '2025-08-28', 4, 7),
-- Patient 14 (Laurice) with Doctor 2 (John Smith) - Confirmed
(14, 2, 1, '2025-08-28', 5, 7);

-- Verify the appointments were added
SELECT
    a.appointment_id,
    a.queue_number,
    a.appointment_date,
    p.patient_id,
    u.name AS patient_name,
    d.doctor_id,
    du.name AS doctor_name,
    s.status_name
FROM tbl_appointments a
JOIN tbl_patients p ON a.patient_id = p.patient_id
JOIN tbl_users u ON p.user_id = u.user_id
LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
LEFT JOIN tbl_users du ON d.user_id = du.user_id
JOIN tbl_status s ON a.status_id = s.status_id
WHERE a.appointment_date = '2025-08-28'
ORDER BY a.queue_number;

-- Add a current queue entry for today (optional - can be set via the interface)
INSERT INTO tbl_current_queue (date, current_appointment_id, next_appointment_id, last_updated_by) VALUES
('2025-08-28', NULL, NULL, 11)
ON DUPLICATE KEY UPDATE
last_updated_at = CURRENT_TIMESTAMP;

