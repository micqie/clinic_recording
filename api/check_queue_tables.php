<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

try {
    $tables = ['tbl_current_queue', 'tbl_doctor_availability', 'tbl_status', 'tbl_status_type'];
    $results = [];

    foreach ($tables as $table) {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        $exists = $stmt->fetch() ? true : false;

        if ($exists) {
            // Get table structure
            $stmt = $conn->prepare("DESCRIBE $table");
            $stmt->execute();
            $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get row count
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM $table");
            $stmt->execute();
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            $results[$table] = [
                'exists' => true,
                'row_count' => $count,
                'structure' => $structure
            ];
        } else {
            $results[$table] = [
                'exists' => false,
                'row_count' => 0,
                'structure' => []
            ];
        }
    }

    // Check appointment statuses
    $stmt = $conn->prepare("
        SELECT s.status_id, s.status_name, st.status_type_name
        FROM tbl_status s
        JOIN tbl_status_type st ON s.status_type_id = st.status_type_id
        WHERE st.status_type_name = 'Appointment'
        ORDER BY s.status_name
    ");
    $stmt->execute();
    $appointmentStatuses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "tables" => $results,
        "appointment_statuses" => $appointmentStatuses,
        "message" => "Database check completed"
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database check failed: " . $e->getMessage(),
        "error" => $e->getMessage()
    ]);
}
?>
