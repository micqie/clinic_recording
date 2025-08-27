<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

try {
    // Test 1: Check if lab test types have prices
    $stmt = $conn->prepare("SELECT lab_test_type_id, type_name, price FROM tbl_lab_test_types");
    $stmt->execute();
    $labTests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "message" => "Lab test pricing test",
        "lab_tests" => $labTests,
        "total_tests" => count($labTests)
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>

