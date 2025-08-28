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
                SELECT m.*, f.form_name, g.generic_name
                FROM tbl_medicines m
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                JOIN tbl_medicine_generic_names g ON m.generic_id = g.generic_id
                ORDER BY g.generic_name, m.strength
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

        if (empty($data['generic_id']) || empty($data['form_id']) || !isset($data['price'])) {
            return ['success' => false, 'message' => 'Generic medicine name, form, and price are required.'];
        }

        try {
            // Check uniqueness on generic_id + strength + form_id combination
            $stmt = $conn->prepare("SELECT medicine_id FROM tbl_medicines WHERE generic_id = :generic_id AND strength = :strength AND form_id = :form_id");
            $stmt->bindParam(":generic_id", $data['generic_id']);
            $strengthParam = isset($data['strength']) && $data['strength'] !== '' ? $data['strength'] : null;
            $stmt->bindValue(":strength", $strengthParam, $strengthParam === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Medicine with this generic name, strength, and form already exists.'];
            }

            $sql = "INSERT INTO tbl_medicines (generic_id, strength, form_id, price)
                    VALUES (:generic_id, :strength, :form_id, :price)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":generic_id", $data['generic_id']);
            $stmt->bindValue(":strength", $strengthParam, $strengthParam === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(":form_id", $data['form_id']);
            $stmt->bindParam(":price", $data['price']);
            $stmt->execute();

            $newMedicineId = $conn->lastInsertId();

            // Optional packaging config
            if (isset($data['packaging']) && is_array($data['packaging'])) {
                $pkg = $data['packaging'];
                if (!empty($pkg['packaging_unit']) && !empty($pkg['quantity_per_package'])) {
                    $stmtPkg = $conn->prepare("INSERT INTO tbl_medicine_packaging_config (medicine_id, packaging_unit, quantity_per_package, unit_label) VALUES (:medicine_id, :unit, :qpp, :label)");
                    $stmtPkg->bindParam(":medicine_id", $newMedicineId);
                    $stmtPkg->bindParam(":unit", $pkg['packaging_unit']);
                    $stmtPkg->bindParam(":qpp", $pkg['quantity_per_package']);
                    $label = isset($pkg['unit_label']) && $pkg['unit_label'] !== '' ? $pkg['unit_label'] : null;
                    $stmtPkg->bindValue(":label", $label, $label === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $stmtPkg->execute();
                }
            }

            return ['success' => true, 'message' => 'Medicine added successfully!'];
        } catch (PDOException $e) {
            $isDuplicate = isset($e->errorInfo[1]) && (int)$e->errorInfo[1] === 1062;
            if ($isDuplicate) {
                return ['success' => false, 'message' => 'Medicine with this generic name, strength, and form already exists.'];
            }
            return ['success' => false, 'message' => 'Failed to add medicine: ' . $e->getMessage()];
        }
    }

    function updateMedicine($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['medicine_id']) || empty($data['generic_id']) || empty($data['form_id']) || !isset($data['price'])) {
            return ['success' => false, 'message' => 'Medicine ID, generic name, form, and price are required.'];
        }

        try {
            $sql = "UPDATE tbl_medicines
                    SET generic_id = :generic_id,
                        strength = :strength,
                        form_id = :form_id,
                        price = :price
                    WHERE medicine_id = :medicine_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":generic_id", $data['generic_id']);
            $strengthParam = isset($data['strength']) && $data['strength'] !== '' ? $data['strength'] : null;
            $stmt->bindValue(":strength", $strengthParam, $strengthParam === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
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

    // Packaging config endpoints
    function getPackagingConfigs($medicine_id)
    {
        include "connection.php";
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_medicine_packaging_config WHERE medicine_id = :medicine_id ORDER BY packaging_unit");
            $stmt->bindParam(":medicine_id", $medicine_id);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'configs' => $rows];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch packaging configs: ' . $e->getMessage()];
        }
    }

    function upsertPackagingConfig($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['medicine_id']) || empty($data['packaging_unit']) || empty($data['quantity_per_package'])) {
            return ['success' => false, 'message' => 'medicine_id, packaging_unit, and quantity_per_package are required.'];
        }
        try {
            // Check if exists
            $check = $conn->prepare("SELECT config_id FROM tbl_medicine_packaging_config WHERE medicine_id = :medicine_id AND packaging_unit = :packaging_unit");
            $check->bindParam(":medicine_id", $data['medicine_id']);
            $check->bindParam(":packaging_unit", $data['packaging_unit']);
            $check->execute();
            if ($row = $check->fetch(PDO::FETCH_ASSOC)) {
                $stmt = $conn->prepare("UPDATE tbl_medicine_packaging_config SET quantity_per_package = :qpp, unit_label = :unit_label WHERE config_id = :config_id");
                $stmt->bindParam(":qpp", $data['quantity_per_package']);
                $stmt->bindParam(":unit_label", $data['unit_label']);
                $stmt->bindParam(":config_id", $row['config_id']);
                $stmt->execute();
            } else {
                $stmt = $conn->prepare("INSERT INTO tbl_medicine_packaging_config (medicine_id, packaging_unit, quantity_per_package, unit_label) VALUES (:medicine_id, :packaging_unit, :qpp, :unit_label)");
                $stmt->bindParam(":medicine_id", $data['medicine_id']);
                $stmt->bindParam(":packaging_unit", $data['packaging_unit']);
                $stmt->bindParam(":qpp", $data['quantity_per_package']);
                $stmt->bindParam(":unit_label", $data['unit_label']);
                $stmt->execute();
            }
            return ['success' => true, 'message' => 'Packaging configuration saved.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to save packaging config: ' . $e->getMessage()];
        }
    }

    function deletePackagingConfig($config_id)
    {
        include "connection.php";
        if (empty($config_id)) {
            return ['success' => false, 'message' => 'config_id is required.'];
        }
        try {
            $stmt = $conn->prepare("DELETE FROM tbl_medicine_packaging_config WHERE config_id = :config_id");
            $stmt->bindParam(":config_id", $config_id);
            $stmt->execute();
            return $stmt->rowCount() > 0
                ? ['success' => true, 'message' => 'Packaging configuration deleted.']
                : ['success' => false, 'message' => 'Packaging configuration not found.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete packaging config: ' . $e->getMessage()];
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

    function getGenericMedicineNames()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_medicine_generic_names ORDER BY generic_name");
            $stmt->execute();
            $generics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'generics' => $generics];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch generic medicine names: ' . $e->getMessage()];
        }
    }

    function addGenericMedicineName($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['generic_name'])) {
            return ['success' => false, 'message' => 'Generic name is required.'];
        }

        try {
            // Check if generic name already exists
            $stmt = $conn->prepare("SELECT generic_id FROM tbl_medicine_generic_names WHERE generic_name = :generic_name");
            $stmt->bindParam(":generic_name", $data['generic_name']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Generic name already exists.'];
            }

            $sql = "INSERT INTO tbl_medicine_generic_names (generic_name, description) VALUES (:generic_name, :description)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":generic_name", $data['generic_name']);
            $description = isset($data['description']) ? $data['description'] : null;
            $stmt->bindValue(":description", $description, $description === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->execute();

            return ['success' => true, 'message' => 'Generic medicine name added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add generic medicine name: ' . $e->getMessage()];
        }
    }

    function updateGenericMedicineName($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['generic_id']) || empty($data['generic_name'])) {
            return ['success' => false, 'message' => 'Generic ID and generic name are required.'];
        }

        try {
            // Check if generic name already exists for other generics
            $stmt = $conn->prepare("SELECT generic_id FROM tbl_medicine_generic_names WHERE generic_name = :generic_name AND generic_id != :generic_id");
            $stmt->bindParam(":generic_name", $data['generic_name']);
            $stmt->bindParam(":generic_id", $data['generic_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                return ['success' => false, 'message' => 'Generic name already exists.'];
            }

            $sql = "UPDATE tbl_medicine_generic_names SET generic_name = :generic_name, description = :description WHERE generic_id = :generic_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":generic_name", $data['generic_name']);
            $description = isset($data['description']) ? $data['description'] : null;
            $stmt->bindValue(":description", $description, $description === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(":generic_id", $data['generic_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Generic medicine name updated successfully!'];
            } else {
                return ['success' => false, 'message' => 'Generic medicine name not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update generic medicine name: ' . $e->getMessage()];
        }
    }

    function deleteGenericMedicineName($generic_id)
    {
        include "connection.php";

        if (empty($generic_id)) {
            return ['success' => false, 'message' => 'Generic ID is required.'];
        }

        try {
            // Check if generic is being used by any medicines
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicines WHERE generic_id = :generic_id");
            $stmt->bindParam(":generic_id", $generic_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['count'] > 0) {
                return ['success' => false, 'message' => 'Cannot delete generic name. It is being used by existing medicines.'];
            }

            $stmt = $conn->prepare("DELETE FROM tbl_medicine_generic_names WHERE generic_id = :generic_id");
            $stmt->bindParam(":generic_id", $generic_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Generic medicine name deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Generic medicine name not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete generic medicine name: ' . $e->getMessage()];
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

                // Propagate new weight text into medicines table (schema now uses `strength`)
                $sql = "UPDATE tbl_medicines SET strength = :new_weight WHERE strength = :old_weight";
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
                $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicines WHERE strength = :weight_value");
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

    // Packaging units (global lookup) CRUD
    function getPackagingUnits()
    {
        include "connection.php";
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_medicine_packaging ORDER BY packaging_name");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'units' => $rows];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch packaging units: ' . $e->getMessage()];
        }
    }

    function addPackagingUnit($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['packaging_name'])) {
            return ['success' => false, 'message' => 'packaging_name is required.'];
        }
        try {
            // uniqueness by name
            $check = $conn->prepare("SELECT packaging_id FROM tbl_medicine_packaging WHERE packaging_name = :name");
            $check->bindParam(":name", $data['packaging_name']);
            $check->execute();
            if ($check->rowCount() > 0) {
                return ['success' => false, 'message' => 'Packaging name already exists.'];
            }
            $stmt = $conn->prepare("INSERT INTO tbl_medicine_packaging (packaging_name, description) VALUES (:name, :desc)");
            $stmt->bindParam(":name", $data['packaging_name']);
            $desc = isset($data['description']) ? $data['description'] : null;
            $stmt->bindValue(":desc", $desc, $desc === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->execute();
            return ['success' => true, 'message' => 'Packaging unit added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add packaging unit: ' . $e->getMessage()];
        }
    }

    function updatePackagingUnit($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['packaging_id']) || empty($data['packaging_name'])) {
            return ['success' => false, 'message' => 'packaging_id and packaging_name are required.'];
        }
        try {
            // ensure unique among others
            $check = $conn->prepare("SELECT packaging_id FROM tbl_medicine_packaging WHERE packaging_name = :name AND packaging_id != :id");
            $check->bindParam(":name", $data['packaging_name']);
            $check->bindParam(":id", $data['packaging_id']);
            $check->execute();
            if ($check->rowCount() > 0) {
                return ['success' => false, 'message' => 'Packaging name already exists.'];
            }
            $stmt = $conn->prepare("UPDATE tbl_medicine_packaging SET packaging_name = :name, description = :desc WHERE packaging_id = :id");
            $stmt->bindParam(":name", $data['packaging_name']);
            $desc = isset($data['description']) ? $data['description'] : null;
            $stmt->bindValue(":desc", $desc, $desc === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(":id", $data['packaging_id']);
            $stmt->execute();
            return ['success' => true, 'message' => 'Packaging unit updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update packaging unit: ' . $e->getMessage()];
        }
    }

    function deletePackagingUnit($packaging_id)
    {
        include "connection.php";
        if (empty($packaging_id)) {
            return ['success' => false, 'message' => 'packaging_id is required.'];
        }
        try {
            $stmt = $conn->prepare("DELETE FROM tbl_medicine_packaging WHERE packaging_id = :id");
            $stmt->bindParam(":id", $packaging_id);
            $stmt->execute();
            return $stmt->rowCount() > 0
                ? ['success' => true, 'message' => 'Packaging unit deleted successfully!']
                : ['success' => false, 'message' => 'Packaging unit not found.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete packaging unit: ' . $e->getMessage()];
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
    case "getGenericMedicineNames":
        echo json_encode($medicines->getGenericMedicineNames());
        break;
    case "addGenericMedicineName":
        echo json_encode($medicines->addGenericMedicineName($json));
        break;
    case "updateGenericMedicineName":
        echo json_encode($medicines->updateGenericMedicineName($json));
        break;
    case "deleteGenericMedicineName":
        echo json_encode($medicines->deleteGenericMedicineName($medicine_id));
        break;
    case "getPackagingConfigs":
        echo json_encode($medicines->getPackagingConfigs($medicine_id));
        break;
    case "upsertPackagingConfig":
        echo json_encode($medicines->upsertPackagingConfig($json));
        break;
    case "deletePackagingConfig":
        echo json_encode($medicines->deletePackagingConfig($medicine_id));
        break;
    case "getPackagingUnits":
        echo json_encode($medicines->getPackagingUnits());
        break;
    case "addPackagingUnit":
        echo json_encode($medicines->addPackagingUnit($json));
        break;
    case "updatePackagingUnit":
        echo json_encode($medicines->updatePackagingUnit($json));
        break;
    case "deletePackagingUnit":
        echo json_encode($medicines->deletePackagingUnit($medicine_id));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
