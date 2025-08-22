<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class DiagnosisLookup
{
    function getAll()
    {
        include "connection.php";
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_diagnosis_lookup ORDER BY condition_name");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'conditions' => $rows];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch conditions: ' . $e->getMessage()];
        }
    }

    function add($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['condition_name'])) {
            return ['success' => false, 'message' => 'Condition name is required.'];
        }
        try {
            // unique (case-insensitive)
            $name = trim($data['condition_name']);
            $stmt = $conn->prepare("SELECT condition_id FROM tbl_diagnosis_lookup WHERE LOWER(TRIM(condition_name)) = LOWER(TRIM(:name))");
            $stmt->bindParam(":name", $name);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Condition already exists.'];
            }
            $stmt = $conn->prepare("INSERT INTO tbl_diagnosis_lookup (condition_name) VALUES (:name)");
            $stmt->bindParam(":name", $name);
            $stmt->execute();
            return ['success' => true, 'message' => 'Condition added successfully!'];
        } catch (PDOException $e) {
            $isDuplicate = isset($e->errorInfo[1]) && (int)$e->errorInfo[1] === 1062;
            if ($isDuplicate) return ['success' => false, 'message' => 'Condition already exists.'];
            return ['success' => false, 'message' => 'Failed to add condition: ' . $e->getMessage()];
        }
    }

    function delete($id)
    {
        include "connection.php";
        if (empty($id)) return ['success' => false, 'message' => 'Condition ID is required.'];
        try {
            $stmt = $conn->prepare("DELETE FROM tbl_diagnosis_lookup WHERE condition_id = :id");
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            return $stmt->rowCount() > 0
                ? ['success' => true, 'message' => 'Condition deleted successfully!']
                : ['success' => false, 'message' => 'Condition not found.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete condition: ' . $e->getMessage()];
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
    $id = $_GET['condition_id'] ?? '';
} else {
    $operation = $_POST['operation'] ?? '';
    $json = $_POST['json'] ?? '';
    $id = $_POST['condition_id'] ?? '';
}

$api = new DiagnosisLookup();
switch ($operation) {
    case 'getAll':
        echo json_encode($api->getAll());
        break;
    case 'add':
        echo json_encode($api->add($json));
        break;
    case 'delete':
        echo json_encode($api->delete($id));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
}

?>
