<?php
include 'api/connection.php';

echo "=== Checking September 5, 2025 Appointments ===\n";

// Check appointments for September 5, 2025
$stmt = $conn->prepare('
    SELECT a.appointment_id, a.queue_number, s.status_name, u.name as patient_name,
           d.doctor_id, du.name as doctor_name, a.appointment_date
    FROM tbl_appointments a
    JOIN tbl_status s ON a.status_id = s.status_id
    JOIN tbl_patients p ON a.patient_id = p.patient_id
    JOIN tbl_users u ON p.user_id = u.user_id
    LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
    LEFT JOIN tbl_users du ON d.user_id = du.user_id
    WHERE a.appointment_date = "2025-09-05"
    ORDER BY a.queue_number
');
$stmt->execute();
$appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Appointments for September 5, 2025:\n";
if (empty($appointments)) {
    echo "No appointments found for September 5, 2025\n";
} else {
    foreach($appointments as $apt) {
        echo "ID: {$apt['appointment_id']}, Queue: {$apt['queue_number']}, Status: {$apt['status_name']}, Patient: {$apt['patient_name']}, Doctor: {$apt['doctor_name']}\n";
    }
}

// Check current timezone and date
echo "\nCurrent server timezone: " . date_default_timezone_get() . "\n";
echo "Current server date: " . date('Y-m-d H:i:s') . "\n";
echo "PHP date('Y-m-d'): " . date('Y-m-d') . "\n";
echo "MySQL CURDATE(): ";

$stmt = $conn->prepare('SELECT CURDATE() as current_date');
$stmt->execute();
$currentDate = $stmt->fetch(PDO::FETCH_ASSOC);
echo $currentDate['current_date'] . "\n";

// Create a test appointment for September 5, 2025 if none exist
if (empty($appointments)) {
    echo "\nCreating test appointment for September 5, 2025...\n";

    // Get a patient
    $stmt = $conn->prepare('SELECT patient_id FROM tbl_patients LIMIT 1');
    $stmt->execute();
    $patient = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get a doctor
    $stmt = $conn->prepare('SELECT doctor_id FROM tbl_doctors LIMIT 1');
    $stmt->execute();
    $doctor = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get "In Consultation" status ID
    $stmt = $conn->prepare('SELECT status_id FROM tbl_status WHERE status_name = "In Consultation" LIMIT 1');
    $stmt->execute();
    $status = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($patient && $doctor && $status) {
        // Create test appointment
        $stmt = $conn->prepare('
            INSERT INTO tbl_appointments (patient_id, doctor_id, appointment_date, queue_number, status_id, created_at)
            VALUES (?, ?, "2025-09-05", 1, ?, NOW())
        ');
        $stmt->execute([$patient['patient_id'], $doctor['doctor_id'], $status['status_id']]);
        $appointmentId = $conn->lastInsertId();

        echo "Created test appointment ID: $appointmentId\n";

        // Update current queue for September 5, 2025
        $stmt = $conn->prepare('
            INSERT INTO tbl_current_queue (date, current_appointment_id, last_updated_by, last_updated_at)
            VALUES ("2025-09-05", ?, 1, NOW())
            ON DUPLICATE KEY UPDATE
            current_appointment_id = ?, last_updated_by = 1, last_updated_at = NOW()
        ');
        $stmt->execute([$appointmentId, $appointmentId]);

        echo "Updated current queue for September 5, 2025\n";
    }
}
?>


