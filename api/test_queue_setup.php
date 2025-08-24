<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

try {
    $results = [];

    // Check if tbl_current_queue exists
    $stmt = $conn->prepare("SHOW TABLES LIKE 'tbl_current_queue'");
    $stmt->execute();
    $results['tbl_current_queue_exists'] = $stmt->fetch() ? true : false;

    // Check if tbl_doctor_availability exists
    $stmt = $conn->prepare("SHOW TABLES LIKE 'tbl_doctor_availability'");
    $stmt->execute();
    $results['tbl_doctor_availability_exists'] = $stmt->fetch() ? true : false;

    // Check if required statuses exist
    $stmt = $conn->prepare("SELECT status_id, status_name FROM tbl_status WHERE status_name IN ('In Consultation', 'Completed', 'Confirmed')");
    $stmt->execute();
    $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results['required_statuses'] = $statuses;

    // Check if status_type exists
    $stmt = $conn->prepare("SELECT status_type_id, status_type_name FROM tbl_status_type WHERE status_type_name = 'Appointment'");
    $stmt->execute();
    $statusType = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['appointment_status_type'] = $statusType;

    // Check if there are any appointments
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_appointments");
    $stmt->execute();
    $appointmentCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['appointment_count'] = $appointmentCount['count'];

    // Check if there are any users with secretary role
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_users WHERE role = 'secretary'");
    $stmt->execute();
    $secretaryCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['secretary_count'] = $secretaryCount['count'];

    echo json_encode([
        "success" => true,
        "message" => "Database setup check completed",
        "results" => $results
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error checking database setup: " . $e->getMessage()
    ]);
}
?>
