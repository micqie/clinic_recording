<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include "connection.php";

$op = $_POST['operation'] ?? $_GET['operation'] ?? '';

try {
  switch ($op) {
    case 'getAll':
      $stmt = $conn->prepare("SELECT illness_id, illness_name, created_at FROM tbl_illnesses ORDER BY illness_name ASC");
      $stmt->execute();
      echo json_encode(['success' => true, 'illnesses' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
      break;
    case 'add':
      $name = trim($_POST['illness_name'] ?? '');
      if ($name === '') { echo json_encode(['success'=>false,'message'=>'illness_name is required']); break; }
      try {
        $ins = $conn->prepare("INSERT INTO tbl_illnesses (illness_name) VALUES (:n)");
        $ins->bindParam(":n", $name);
        $ins->execute();
        echo json_encode(['success'=>true,'message'=>'Illness added','illness_id'=>$conn->lastInsertId()]);
      } catch (PDOException $e) {
        // Handle duplicate illness_name (unique key)
        if (strpos($e->getCode(), '23000') === 0) {
          echo json_encode(['success'=>false,'message'=>'Illness already exists']);
        } else {
          echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
        }
      }
      break;
    case 'delete':
      $id = intval($_GET['id'] ?? 0);
      if ($id <= 0) { echo json_encode(['success'=>false,'message'=>'invalid id']); break; }
      $del = $conn->prepare("DELETE FROM tbl_illnesses WHERE illness_id = :id");
      $del->bindParam(":id", $id, PDO::PARAM_INT);
      $del->execute();
      echo json_encode(['success'=>true]);
      break;
    // No consultation mapping operations required; present_illness is stored as text in history
    default:
      echo json_encode(['success'=>false,'message'=>'Invalid operation']);
  }
} catch (PDOException $e) {
  if ($conn->inTransaction()) $conn->rollBack();
  echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
?>
