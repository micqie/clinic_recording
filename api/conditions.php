<?php
require_once 'connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$operation = $_GET['operation'] ?? $_POST['operation'] ?? '';

try {
    switch ($operation) {
        case 'getAll':
            getAllConditions($conn);
            break;
        case 'get':
            getCondition($conn);
            break;
        case 'add':
            addCondition($conn);
            break;
        case 'update':
            updateCondition($conn);
            break;
        case 'delete':
            deleteCondition($conn);
            break;
        default:
            throw new Exception('Invalid operation');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function getAllConditions($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT condition_id, condition_name, created_at
            FROM tbl_conditions
            ORDER BY condition_name ASC
        ");
        $stmt->execute();
        $conditions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'conditions' => $conditions,
            'count' => count($conditions)
        ]);
    } catch (Exception $e) {
        throw new Exception('Failed to fetch conditions: ' . $e->getMessage());
    }
}

function getCondition($conn) {
    $conditionId = $_GET['id'] ?? '';

    if (empty($conditionId)) {
        throw new Exception('Condition ID is required');
    }

    try {
        $stmt = $conn->prepare("
            SELECT condition_id, condition_name, created_at
            FROM tbl_conditions
            WHERE condition_id = :condition_id
        ");
        $stmt->bindParam(':condition_id', $conditionId);
        $stmt->execute();
        $condition = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$condition) {
            throw new Exception('Condition not found');
        }

        echo json_encode([
            'success' => true,
            'condition' => $condition
        ]);
    } catch (Exception $e) {
        throw new Exception('Failed to fetch condition: ' . $e->getMessage());
    }
}

function addCondition($conn) {
    // Get condition name from different possible sources
    $conditionName = '';

    // Try from JSON data first
    if (isset($_POST['json']) && !empty($_POST['json'])) {
        $data = json_decode($_POST['json'], true);
        $conditionName = $data['condition_name'] ?? '';
    }

    // Try from direct POST data
    if (empty($conditionName) && isset($_POST['condition_name'])) {
        $conditionName = $_POST['condition_name'];
    }

    // Try from raw input
    if (empty($conditionName)) {
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            $data = json_decode($rawInput, true);
            $conditionName = $data['condition_name'] ?? '';
        }
    }

    if (empty($conditionName)) {
        throw new Exception('Condition name is required');
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO tbl_conditions (condition_name)
            VALUES (:condition_name)
        ");
        $stmt->bindParam(':condition_name', $conditionName);
        $stmt->execute();

        $conditionId = $conn->lastInsertId();

        echo json_encode([
            'success' => true,
            'message' => 'Condition added successfully',
            'condition_id' => $conditionId
        ]);
    } catch (Exception $e) {
        throw new Exception('Failed to add condition: ' . $e->getMessage());
    }
}

function updateCondition($conn) {
    $data = json_decode($_POST['json'] ?? '{}', true);

    if (empty($data['condition_id']) || empty($data['condition_name'])) {
        throw new Exception('Condition ID and name are required');
    }

    try {
        $stmt = $conn->prepare("
            UPDATE tbl_conditions
            SET condition_name = :condition_name
            WHERE condition_id = :condition_id
        ");
        $stmt->bindParam(':condition_name', $data['condition_name']);
        $stmt->bindParam(':condition_id', $data['condition_id']);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            throw new Exception('Condition not found or no changes made');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Condition updated successfully'
        ]);
    } catch (Exception $e) {
        throw new Exception('Failed to update condition: ' . $e->getMessage());
    }
}

function deleteCondition($conn) {
    $conditionId = $_GET['id'] ?? '';

    if (empty($conditionId)) {
        throw new Exception('Condition ID is required');
    }

    try {
        $stmt = $conn->prepare("
            DELETE FROM tbl_conditions
            WHERE condition_id = :condition_id
        ");
        $stmt->bindParam(':condition_id', $conditionId);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            throw new Exception('Condition not found');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Condition deleted successfully'
        ]);
    } catch (Exception $e) {
        throw new Exception('Failed to delete condition: ' . $e->getMessage());
    }
}
?>
