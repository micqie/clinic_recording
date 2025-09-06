<?php
include 'api/connection.php';

echo "=== Creating Test Appointment for September 5, 2025 ===\n";

// Check current timezone and date
echo "Current server timezone: " . date_default_timezone_get() . "\n";
echo "Current server date: " . date('Y-m-d H:i:s') . "\n";
echo "PHP date('Y-m-d'): " . date('Y-m-d') . "\n";

// Get a patient
$stmt = $conn->prepare('SELECT patient_id, p.user_id, u.name FROM tbl_patients p JOIN tbl_users u ON p.user_id = u.user_id LIMIT 1');
$stmt->execute();
$patient = $stmt->fetch(PDO::FETCH_ASSOC);

// Get a doctor
$stmt = $conn->prepare('SELECT doctor_id, d.user_id, u.name FROM tbl_doctors d JOIN tbl_users u ON d.user_id = u.user_id LIMIT 1');
$stmt->execute();
$doctor = $stmt->fetch(PDO::FETCH_ASSOC);

// Get "In Consultation" status ID
$stmt = $conn->prepare('SELECT status_id FROM tbl_status WHERE status_name = "In Consultation" LIMIT 1');
$stmt->execute();
$status = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Patient: {$patient['name']} (ID: {$patient['patient_id']})\n";
echo "Doctor: {$doctor['name']} (ID: {$doctor['doctor_id']})\n";
echo "Status ID: {$status['status_id']}\n";

if ($patient && $doctor && $status) {
    // Create test appointment for September 5, 2025
    $stmt = $conn->prepare('
        INSERT INTO tbl_appointments (patient_id, doctor_id, appointment_date, queue_number, status_id, created_at)
        VALUES (?, ?, "2025-09-05", 1, ?, NOW())
    ');
    $result = $stmt->execute([$patient['patient_id'], $doctor['doctor_id'], $status['status_id']]);

    if ($result) {
        $appointmentId = $conn->lastInsertId();
        echo "\n✓ Created test appointment ID: $appointmentId\n";

        // Update current queue for September 5, 2025
        $stmt = $conn->prepare('
            INSERT INTO tbl_current_queue (date, current_appointment_id, last_updated_by, last_updated_at)
            VALUES ("2025-09-05", ?, 1, NOW())
            ON DUPLICATE KEY UPDATE
            current_appointment_id = ?, last_updated_by = 1, last_updated_at = NOW()
        ');
        $result2 = $stmt->execute([$appointmentId, $appointmentId]);

        if ($result2) {
            echo "✓ Updated current queue for September 5, 2025\n";
        } else {
            echo "✗ Failed to update current queue\n";
        }

        // Test the API for September 5, 2025
        echo "\n=== Testing API for September 5, 2025 ===\n";
        $url = "http://localhost/clinic_recording/api/enhanced_queue_management.php?operation=get_doctor_queue_status&doctor_id={$doctor['doctor_id']}&date=2025-09-05";
        $response = file_get_contents($url);
        $data = json_decode($response, true);

        if ($data && $data['success']) {
            echo "✓ API call successful\n";
            echo "Current consultation: " . ($data['current_consultation'] ? $data['current_consultation']['patient_name'] : 'None') . "\n";
            echo "Next in queue: " . ($data['next_in_queue'] ? $data['next_in_queue']['patient_name'] : 'None') . "\n";
            echo "Completed count: {$data['completed_count']}\n";
        } else {
            echo "✗ API call failed\n";
            echo "Response: $response\n";
        }

    } else {
        echo "✗ Failed to create appointment\n";
    }
} else {
    echo "✗ Missing required data (patient, doctor, or status)\n";
}
?>


