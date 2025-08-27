<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

try {
    // Test 1: Check if lab test types table has price column
    $stmt = $conn->prepare("DESCRIBE tbl_lab_test_types");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $hasPriceColumn = false;
    foreach ($columns as $column) {
        if ($column['Field'] === 'price') {
            $hasPriceColumn = true;
            break;
        }
    }

    // Test 2: Check lab test types with prices
    $stmt = $conn->prepare("SELECT lab_test_type_id, type_name, price FROM tbl_lab_test_types LIMIT 5");
    $stmt->execute();
    $labTests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Test 3: Check if there are any consultations
    $stmt = $conn->prepare("SELECT consultation_id, patient_id, appointment_id FROM tbl_consultations LIMIT 3");
    $stmt->execute();
    $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Test 4: Check if there are any lab requests
    $stmt = $conn->prepare("SELECT lr.lab_request_id, lr.appointment_id, ltt.type_name, ltt.price
                           FROM tbl_lab_requests lr
                           JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
                           LIMIT 3");
    $stmt->execute();
    $labRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "debug_info" => [
            "has_price_column" => $hasPriceColumn,
            "lab_tests_sample" => $labTests,
            "consultations_sample" => $consultations,
            "lab_requests_sample" => $labRequests
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ]);
}
?>
