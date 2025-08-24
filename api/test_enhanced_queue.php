<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

echo json_encode([
    "success" => true,
    "message" => "Enhanced Queue Management API is accessible",
    "timestamp" => date('Y-m-d H:i:s'),
    "post_data" => $_POST,
    "get_data" => $_GET
]);
?>
