<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Medicines
{
    function getAllMedicines()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT m.*, f.form_name, w.weight_value
                FROM tbl_medicines m
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                LEFT JOIN tbl_medicine_weights w ON m.weight = w.weight_value
                ORDER BY m.medicine_name
            ");
            $stmt->execute();
            $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'medicines' => $medicines];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch medicines: ' . $e->getMessage()];
        }
    }

    function addMedicine($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['medicine_name']) || empty($data['form_id']) || !isset($data['price'])) {
            return ['success' => false, 'message' => 'Medicine name, form, and price are required.'];
        }

        try {
            // Check if medicine name already exists
            $stmt = $conn->prepare("SELECT medicine_id FROM tbl_medicines WHERE medicine_name = :medicine_name");
            $stmt->bindParam(":medicine_name", $data['medicine_name']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Medicine name already exists.'];
            }

            $sql = "INSERT INTO tbl_medicines (medicine_name, weight, form_id, price)
                    VALUES (:medicine_name, :weight, :form_id, :price)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":medicine_name", $data['medicine_name']);
            $stmt->bindParam(":weight", $data['weight'] ?? null);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->bindParam(":price", $data['price']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Medicine added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add medicine: ' . $e->getMessage()];
        }
    }

    function updateMedicine($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['medicine_id']) || empty($data['medicine_name']) || empty($data['form_id']) || !isset($data['price'])) {
            return ['success' => false, 'message' => 'Medicine ID, name, form, and price are required.'];
        }

        try {
            // Check if medicine name already exists for other medicines
            $stmt = $conn->prepare("SELECT medicine_id FROM tbl_medicines WHERE medicine_name = :medicine_name AND medicine_id != :medicine_id");
            $stmt->bindParam(":medicine_name", $data['medicine_name']);
            $stmt->bindParam(":medicine_id", $data['medicine_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Medicine name already exists.'];
            }

            $sql = "UPDATE tbl_medicines SET medicine_name = :medicine_name, weight = :weight, form_id = :form_id, price = :price
                    WHERE medicine_id = :medicine_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":medicine_name", $data['medicine_name']);
            $stmt->bindParam(":weight", $data['weight'] ?? null);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->bindParam(":price", $data['price']);
            $stmt->bindParam(":medicine_id", $data['medicine_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Medicine updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update medicine: ' . $e->getMessage()];
        }
    }

    function deleteMedicine($medicine_id)
    {
        include "connection.php";

        if (empty($medicine_id)) {
            return ['success' => false, 'message' => 'Medicine ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_medicines WHERE medicine_id = :medicine_id");
            $stmt->bindParam(":medicine_id", $medicine_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Medicine deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Medicine not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete medicine: ' . $e->getMessage()];
        }
    }

    function getMedicineForms()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_medicine_forms ORDER BY form_name");
            $stmt->execute();
            $forms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'forms' => $forms];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch medicine forms: ' . $e->getMessage()];
        }
    }

    function getMedicineWeights()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_medicine_weights ORDER BY weight_value");
            $stmt->execute();
            $weights = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'weights' => $weights];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch medicine weights: ' . $e->getMessage()];
        }
    }

    function addMedicineForm($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['form_name'])) {
            return ['success' => false, 'message' => 'Form name is required.'];
        }

        try {
            // Check if form name already exists
            $stmt = $conn->prepare("SELECT form_id FROM tbl_medicine_forms WHERE form_name = :form_name");
            $stmt->bindParam(":form_name", $data['form_name']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Form name already exists.'];
            }

            $sql = "INSERT INTO tbl_medicine_forms (form_name) VALUES (:form_name)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":form_name", $data['form_name']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Medicine form added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add medicine form: ' . $e->getMessage()];
        }
    }

    function addMedicineWeight($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['weight_value'])) {
            return ['success' => false, 'message' => 'Weight value is required.'];
        }

        try {
            // Check if weight value already exists
            $stmt = $conn->prepare("SELECT weight_id FROM tbl_medicine_weights WHERE weight_value = :weight_value");
            $stmt->bindParam(":weight_value", $data['weight_value']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Weight value already exists.'];
            }

            $sql = "INSERT INTO tbl_medicine_weights (weight_value) VALUES (:weight_value)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":weight_value", $data['weight_value']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Medicine weight added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add medicine weight: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $medicine_id = $_GET['medicine_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $medicine_id = $_POST['medicine_id'] ?? "";
}

$medicines = new Medicines();

switch ($operation) {
    case "getAll":
        echo json_encode($medicines->getAllMedicines());
        break;
    case "add":
        echo json_encode($medicines->addMedicine($json));
        break;
    case "update":
        echo json_encode($medicines->updateMedicine($json));
        break;
    case "delete":
        echo json_encode($medicines->deleteMedicine($medicine_id));
        break;
    case "getMedicineForms":
        echo json_encode($medicines->getMedicineForms());
        break;
    case "getMedicineWeights":
        echo json_encode($medicines->getMedicineWeights());
        break;
    case "addMedicineForm":
        echo json_encode($medicines->addMedicineForm($json));
        break;
    case "addMedicineWeight":
        echo json_encode($medicines->addMedicineWeight($json));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
