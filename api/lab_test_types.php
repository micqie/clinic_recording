<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class LabTestTypes
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    public function getAll()
    {
        try {
            $stmt = $this->conn->prepare("SELECT lab_test_type_id, type_name, description FROM tbl_lab_test_types ORDER BY type_name ASC");
            $stmt->execute();
            return ['success' => true, 'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch lab test types: ' . $e->getMessage()];
        }
    }

    public function add($json)
    {
        $data = json_decode($json ?: '{}', true);
        if (empty($data['type_name'])) {
            return ['success' => false, 'message' => 'type_name is required.'];
        }
        try {
            $stmt = $this->conn->prepare("INSERT INTO tbl_lab_test_types (type_name, description) VALUES (:name, :description)");
            $stmt->bindParam(":name", $data['type_name']);
            $stmt->bindParam(":description", $data['description']);
            $stmt->execute();
            return ['success' => true, 'message' => 'Lab test type added successfully.'];
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                return ['success' => false, 'message' => 'Lab test type already exists.'];
            }
            return ['success' => false, 'message' => 'Failed to add lab test type: ' . $e->getMessage()];
        }
    }

    public function update($json)
    {
        $data = json_decode($json ?: '{}', true);
        if (empty($data['lab_test_type_id']) || empty($data['type_name'])) {
            return ['success' => false, 'message' => 'lab_test_type_id and type_name are required.'];
        }
        try {
            $stmt = $this->conn->prepare("UPDATE tbl_lab_test_types SET type_name = :name, description = :description WHERE lab_test_type_id = :id");
            $stmt->bindParam(":name", $data['type_name']);
            $stmt->bindParam(":description", $data['description']);
            $stmt->bindParam(":id", $data['lab_test_type_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Lab test type updated successfully.'];
            }
            return ['success' => false, 'message' => 'Lab test type not found.'];
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                return ['success' => false, 'message' => 'Lab test type name already exists.'];
            }
            return ['success' => false, 'message' => 'Failed to update lab test type: ' . $e->getMessage()];
        }
    }

    public function delete($id)
    {
        if (empty($id)) { return ['success' => false, 'message' => 'lab_test_type_id is required.']; }
        try {
            // Prevent delete if used by existing lab requests
            $check = $this->conn->prepare("SELECT COUNT(*) FROM tbl_lab_requests WHERE lab_test_type_id = :id");
            $check->bindParam(":id", $id);
            $check->execute();
            if (intval($check->fetchColumn()) > 0) {
                return ['success' => false, 'message' => 'Cannot delete. This type is used by lab requests.'];
            }

            $stmt = $this->conn->prepare("DELETE FROM tbl_lab_test_types WHERE lab_test_type_id = :id");
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Lab test type deleted successfully.'];
            }
            return ['success' => false, 'message' => 'Lab test type not found.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete: ' . $e->getMessage()];
        }
    }
}

$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';
$id = $_POST['lab_test_type_id'] ?? $_GET['lab_test_type_id'] ?? '';

$svc = new LabTestTypes();

switch ($operation) {
    case 'getAll':
        echo json_encode($svc->getAll());
        break;
    case 'add':
        echo json_encode($svc->add($json));
        break;
    case 'update':
        echo json_encode($svc->update($json));
        break;
    case 'delete':
        echo json_encode($svc->delete($id));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}

?>
