<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

$op = $_POST['operation'] ?? $_GET['operation'] ?? '';

switch ($op) {
  case 'listReasons':
    try {
      $stmt = $conn->prepare("SELECT reason_id, reason_name, description FROM tbl_appointment_reasons WHERE is_active = 1 ORDER BY reason_name ASC");
      $stmt->execute();
      echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'getReasonById':
    $id = intval($_GET['reason_id'] ?? 0);
    if ($id <= 0) {
      echo json_encode(['success' => false, 'message' => 'Invalid reason ID']);
      break;
    }
    try {
      $stmt = $conn->prepare("SELECT reason_id, reason_name, description FROM tbl_appointment_reasons WHERE reason_id = :id AND is_active = 1");
      $stmt->bindParam(":id", $id, PDO::PARAM_INT);
      $stmt->execute();
      $reason = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($reason) {
        echo json_encode(['success' => true, 'data' => $reason]);
      } else {
        echo json_encode(['success' => false, 'message' => 'Reason not found']);
      }
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'addReason':
    $name = trim($_POST['reason_name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    if ($name === '') {
      echo json_encode(['success' => false, 'message' => 'Reason name is required']);
      break;
    }
    try {
      $stmt = $conn->prepare("INSERT INTO tbl_appointment_reasons (reason_name, description) VALUES (:n, :d)");
      $stmt->bindParam(":n", $name);
      $stmt->bindParam(":d", $description);
      $stmt->execute();
      echo json_encode(['success' => true, 'message' => 'Reason added successfully']);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'updateReason':
    $id = intval($_POST['reason_id'] ?? 0);
    $name = trim($_POST['reason_name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    if ($id <= 0 || $name === '') {
      echo json_encode(['success' => false, 'message' => 'Invalid input']);
      break;
    }
    try {
      $stmt = $conn->prepare("UPDATE tbl_appointment_reasons SET reason_name = :n, description = :d WHERE reason_id = :id");
      $stmt->bindParam(":n", $name);
      $stmt->bindParam(":d", $description);
      $stmt->bindParam(":id", $id, PDO::PARAM_INT);
      $stmt->execute();
      echo json_encode(['success' => true, 'message' => 'Reason updated successfully']);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'deleteReason':
    $id = intval($_POST['reason_id'] ?? 0);
    if ($id <= 0) {
      echo json_encode(['success' => false, 'message' => 'Invalid ID']);
      break;
    }
    try {
      // Soft delete - set is_active to 0
      $stmt = $conn->prepare("UPDATE tbl_appointment_reasons SET is_active = 0 WHERE reason_id = :id");
      $stmt->bindParam(":id", $id, PDO::PARAM_INT);
      $stmt->execute();
      echo json_encode(['success' => true, 'message' => 'Reason deleted successfully']);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  default:
    echo json_encode(['success' => false, 'message' => 'Invalid operation']);
    break;
}
?>
