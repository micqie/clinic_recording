<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

$op = $_POST['operation'] ?? $_GET['operation'] ?? '';

switch ($op) {
  case 'listSpecializations':
    try {
      $stmt = $conn->prepare("SELECT specialization_id, name, description FROM tbl_specializations ORDER BY name ASC");
      $stmt->execute();
      echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'addSpecialization':
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    if ($name === '') { echo json_encode(['success' => false, 'message' => 'Name is required']); break; }
    try {
      $stmt = $conn->prepare("INSERT INTO tbl_specializations (name, description) VALUES (:n, :d)");
      $stmt->bindParam(":n", $name);
      $stmt->bindParam(":d", $description);
      $stmt->execute();
      echo json_encode(['success' => true]);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'updateSpecialization':
    $id = intval($_POST['specialization_id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    if ($id <= 0 || $name === '') { echo json_encode(['success' => false, 'message' => 'Invalid input']); break; }
    try {
      $stmt = $conn->prepare("UPDATE tbl_specializations SET name = :n, description = :d WHERE specialization_id = :id");
      $stmt->bindParam(":n", $name);
      $stmt->bindParam(":d", $description);
      $stmt->bindParam(":id", $id, PDO::PARAM_INT);
      $stmt->execute();
      echo json_encode(['success' => true]);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'deleteSpecialization':
    $id = intval($_POST['specialization_id'] ?? 0);
    if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'Invalid id']); break; }
    try {
      $stmt = $conn->prepare("DELETE FROM tbl_specializations WHERE specialization_id = :id");
      $stmt->bindParam(":id", $id, PDO::PARAM_INT);
      $stmt->execute();
      echo json_encode(['success' => true]);
    } catch (PDOException $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  default:
    echo json_encode(['success' => false, 'message' => 'Invalid operation']);
    break;
}
?>
