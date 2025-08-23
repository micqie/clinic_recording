<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class PaymentMethods
{
    function getAll()
    {
        include "connection.php";
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_payment_methods WHERE is_active = 1 ORDER BY method_name");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'data' => $rows];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch payment methods: ' . $e->getMessage()];
        }
    }

    function get($id = null)
    {
        include "connection.php";
        try {
            if ($id === null) {
                $stmt = $conn->prepare("SELECT * FROM tbl_payment_methods ORDER BY method_name");
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                return ['success' => true, 'data' => $rows];
            } else {
                $stmt = $conn->prepare("SELECT * FROM tbl_payment_methods WHERE method_id = :method_id LIMIT 1");
                $stmt->bindParam(":method_id", $id);
                $stmt->execute();
                $data = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($data) {
                    return ['success' => true, 'data' => $data];
                } else {
                    return ['success' => false, 'message' => 'Payment method not found.'];
                }
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch payment method: ' . $e->getMessage()];
        }
    }

    function add($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['method_name'])) {
            return ['success' => false, 'message' => 'Method name is required.'];
        }

        try {
            $stmt = $conn->prepare("INSERT INTO tbl_payment_methods (method_name, description, is_active) VALUES (:method_name, :description, :is_active)");
            $stmt->bindParam(":method_name", $data['method_name']);
            $stmt->bindParam(":description", $data['description'] ?? null);
            $stmt->bindParam(":is_active", $data['is_active'] ?? 1);
            $stmt->execute();

            return ['success' => true, 'message' => 'Payment method added successfully.'];
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                return ['success' => false, 'message' => 'Payment method name already exists.'];
            }
            return ['success' => false, 'message' => 'Failed to add payment method: ' . $e->getMessage()];
        }
    }

    function update($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['method_id']) || empty($data['method_name'])) {
            return ['success' => false, 'message' => 'Method ID and name are required.'];
        }

        try {
            $stmt = $conn->prepare("UPDATE tbl_payment_methods SET method_name = :method_name, description = :description, is_active = :is_active WHERE method_id = :method_id");
            $stmt->bindParam(":method_name", $data['method_name']);
            $stmt->bindParam(":description", $data['description'] ?? null);
            $stmt->bindParam(":is_active", $data['is_active'] ?? 1);
            $stmt->bindParam(":method_id", $data['method_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Payment method updated successfully.'];
            } else {
                return ['success' => false, 'message' => 'Payment method not found or no changes made.'];
            }
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                return ['success' => false, 'message' => 'Payment method name already exists.'];
            }
            return ['success' => false, 'message' => 'Failed to update payment method: ' . $e->getMessage()];
        }
    }

    function delete($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['method_id'])) {
            return ['success' => false, 'message' => 'Method ID is required.'];
        }

        try {
            // Check if payment method is being used
            $checkStmt = $conn->prepare("SELECT COUNT(*) FROM tbl_payments WHERE payment_method = (SELECT method_name FROM tbl_payment_methods WHERE method_id = :method_id)");
            $checkStmt->bindParam(":method_id", $data['method_id']);
            $checkStmt->execute();
            $usageCount = $checkStmt->fetchColumn();

            if ($usageCount > 0) {
                // Soft delete - set is_active to 0
                $stmt = $conn->prepare("UPDATE tbl_payment_methods SET is_active = 0 WHERE method_id = :method_id");
                $stmt->bindParam(":method_id", $data['method_id']);
                $stmt->execute();
                return ['success' => true, 'message' => 'Payment method deactivated (in use by existing payments).'];
            } else {
                // Hard delete if not in use
                $stmt = $conn->prepare("DELETE FROM tbl_payment_methods WHERE method_id = :method_id");
                $stmt->bindParam(":method_id", $data['method_id']);
                $stmt->execute();
                return ['success' => true, 'message' => 'Payment method deleted successfully.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete payment method: ' . $e->getMessage()];
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
} else {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
}

$paymentMethods = new PaymentMethods();

switch ($operation) {
    case "get_all":
        echo json_encode($paymentMethods->getAll());
        break;
    case "get":
        $id = $_GET['id'] ?? null;
        echo json_encode($paymentMethods->get($id));
        break;
    case "add":
        echo json_encode($paymentMethods->add($json));
        break;
    case "update":
        echo json_encode($paymentMethods->update($json));
        break;
    case "delete":
        echo json_encode($paymentMethods->delete($json));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>

