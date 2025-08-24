<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Debug logging
error_log("=== Enhanced Queue Test API Debug ===");
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("POST data: " . print_r($_POST, true));
error_log("GET data: " . print_r($_GET, true));
error_log("Raw input: " . file_get_contents('php://input'));

$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

error_log("Operation: " . $operation);
error_log("JSON: " . $json);

if (empty($operation)) {
    echo json_encode([
        "success" => false,
        "message" => "No operation specified",
        "debug" => [
            "post_data" => $_POST,
            "get_data" => $_GET,
            "raw_input" => file_get_contents('php://input')
        ]
    ]);
    exit;
}

// Include the actual API
include "enhanced_queue_management.php";
?>
