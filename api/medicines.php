<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Medicines
{
    function getAllMedicines()
    {
        include "connection.php";

        try {
            // ✅ Use `weight` column as weight_value (temporary fix)
            $stmt = $conn->prepare("
                SELECT m.*, f.form_name, m.weight AS weight_value
                FROM tbl_medicines m
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                ORDER BY m.medicine_name
            ");
            $stmt->execute();
            $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("Medicines query executed successfully. Found " . count($medicines) . " medicines");
            if (count($medicines) > 0) {
                error_log("First medicine: " . json_encode($medicines[0]));
            }

            return ['success' => true, 'medicines' => $medicines];
        } catch (PDOException $e) {
            error_log("Error in getAllMedicines: " . $e->getMessage());
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
            // ✅ Check uniqueness only on medicine_name
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
            $weightParam = isset($data['weight']) && $data['weight'] !== '' ? $data['weight'] : null;
            $stmt->bindValue(":weight", $weightParam, $weightParam === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->bindParam(":price", $data['price']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Medicine added successfully!'];
        } catch (PDOException $e) {
            $isDuplicate = isset($e->errorInfo[1]) && (int)$e->errorInfo[1] === 1062;
            if ($isDuplicate) {
                return ['success' => false, 'message' => 'Medicine name already exists.'];
            }
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
            $sql = "UPDATE tbl_medicines
                    SET medicine_name = :medicine_name,
                        weight = :weight,
                        form_id = :form_id,
                        price = :price
                    WHERE medicine_id = :medicine_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":medicine_name", $data['medicine_name']);
            $weightParam = isset($data['weight']) && $data['weight'] !== '' ? $data['weight'] : null;
            $stmt->bindValue(":weight", $weightParam, $weightParam === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
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

            return $stmt->rowCount() > 0
                ? ['success' => true, 'message' => 'Medicine deleted successfully!']
                : ['success' => false, 'message' => 'Medicine not found.'];
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

    function updateMedicineForm($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['form_id']) || empty($data['form_name'])) {
            return ['success' => false, 'message' => 'Form ID and form name are required.'];
        }

        try {
            // Check if form name already exists for other forms
            $stmt = $conn->prepare("SELECT form_id FROM tbl_medicine_forms WHERE form_name = :form_name AND form_id != :form_id");
            $stmt->bindParam(":form_name", $data['form_name']);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Form name already exists.'];
            }

            $sql = "UPDATE tbl_medicine_forms SET form_name = :form_name WHERE form_id = :form_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":form_name", $data['form_name']);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Medicine form updated successfully!'];
            } else {
                return ['success' => false, 'message' => 'Medicine form not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update medicine form: ' . $e->getMessage()];
        }
    }

    function updateMedicineWeight($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['weight_id']) || empty($data['weight_value'])) {
            return ['success' => false, 'message' => 'Weight ID and weight value are required.'];
        }

        try {
            // Check if weight value already exists for other weights
            $stmt = $conn->prepare("SELECT weight_id FROM tbl_medicine_weights WHERE weight_value = :weight_value AND weight_id != :weight_id");
            $stmt->bindParam(":weight_value", $data['weight_value']);
            $stmt->bindParam(":weight_id", $data['weight_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Weight value already exists.'];
            }

            // Get the old weight value to update medicines that use it
            $stmt = $conn->prepare("SELECT weight_value FROM tbl_medicine_weights WHERE weight_id = :weight_id");
            $stmt->bindParam(":weight_id", $data['weight_id']);
            $stmt->execute();
            $oldWeight = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($oldWeight) {
                // Update the weight value in weights table
                $sql = "UPDATE tbl_medicine_weights SET weight_value = :weight_value WHERE weight_id = :weight_id";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":weight_value", $data['weight_value']);
                $stmt->bindParam(":weight_id", $data['weight_id']);
                $stmt->execute();

                // Propagate new weight text into medicines table (current schema uses text column `weight`)
                $sql = "UPDATE tbl_medicines SET weight = :new_weight WHERE weight = :old_weight";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":new_weight", $data['weight_value']);
                $stmt->bindParam(":old_weight", $oldWeight['weight_value']);
                $stmt->execute();

                return ['success' => true, 'message' => 'Medicine weight updated successfully!'];
            } else {
                return ['success' => false, 'message' => 'Medicine weight not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update medicine weight: ' . $e->getMessage()];
        }
    }

    function deleteMedicineForm($form_id)
    {
        include "connection.php";

        if (empty($form_id)) {
            return ['success' => false, 'message' => 'Form ID is required.'];
        }

        try {
            // Check if form is being used by any medicines
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicines WHERE form_id = :form_id");
            $stmt->bindParam(":form_id", $form_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['count'] > 0) {
                return ['success' => false, 'message' => 'Cannot delete form. It is being used by existing medicines.'];
            }

            $stmt = $conn->prepare("DELETE FROM tbl_medicine_forms WHERE form_id = :form_id");
            $stmt->bindParam(":form_id", $form_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Medicine form deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Medicine form not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete medicine form: ' . $e->getMessage()];
        }
    }

    function deleteMedicineWeight($weight_id)
    {
        include "connection.php";

        if (empty($weight_id)) {
            return ['success' => false, 'message' => 'Weight ID is required.'];
        }

        try {
            // Check if weight is being used by any medicines
            $stmt = $conn->prepare("SELECT weight_value FROM tbl_medicine_weights WHERE weight_id = :weight_id");
            $stmt->bindParam(":weight_id", $weight_id);
            $stmt->execute();
            $weight = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($weight) {
                $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicines WHERE weight = :weight_value");
                $stmt->bindParam(":weight_value", $weight['weight_value']);
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result['count'] > 0) {
                    return ['success' => false, 'message' => 'Cannot delete weight. It is being used by existing medicines.'];
                }
            }

            $stmt = $conn->prepare("DELETE FROM tbl_medicine_weights WHERE weight_id = :weight_id");
            $stmt->bindParam(":weight_id", $weight_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Medicine weight deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Medicine weight not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete medicine weight: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $medicine_id = $_GET['medicine_id'] ?? "";
    $form_id = $_GET['form_id'] ?? "";
    $weight_id = $_GET['weight_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $medicine_id = $_POST['medicine_id'] ?? "";
    $form_id = $_POST['form_id'] ?? "";
    $weight_id = $_POST['weight_id'] ?? "";
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
    case "updateMedicineForm":
        echo json_encode($medicines->updateMedicineForm($json));
        break;
    case "updateMedicineWeight":
        echo json_encode($medicines->updateMedicineWeight($json));
        break;
    case "deleteMedicineForm":
        echo json_encode($medicines->deleteMedicineForm($form_id));
        break;
    case "deleteMedicineWeight":
        echo json_encode($medicines->deleteMedicineWeight($weight_id));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
