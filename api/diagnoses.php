<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Diagnosis
{
    function get_all()
    {
        include "connection.php";

        $stmt = $conn->prepare("
            SELECT
                d.diagnosis_id,
                d.condition_name,
                d.date_diagnosed,
                d.severity,
                d.notes,
                d.created_at,
                d.updated_at,
                d.appointment_id,
                d.doctor_id,
                d.patient_id,
                u.name AS patient_name,
                doc.name AS doctor_name,
                a.appointment_date
            FROM tbl_diagnoses d
            JOIN tbl_patients p ON d.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_doctors doc_tbl ON d.doctor_id = doc_tbl.doctor_id
            JOIN tbl_users doc ON doc_tbl.user_id = doc.user_id
            JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
            ORDER BY d.created_at DESC
        ");

        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    function get_by_appointment($appointment_id)
    {
        include "connection.php";

        $stmt = $conn->prepare("
            SELECT
                d.diagnosis_id,
                d.condition_name,
                d.date_diagnosed,
                d.severity,
                d.notes,
                d.created_at,
                d.updated_at,
                d.appointment_id,
                d.doctor_id,
                d.patient_id,
                u.name AS patient_name,
                doc.name AS doctor_name,
                a.appointment_date
            FROM tbl_diagnoses d
            JOIN tbl_patients p ON d.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_doctors doc_tbl ON d.doctor_id = doc_tbl.doctor_id
            JOIN tbl_users doc ON doc_tbl.user_id = doc.user_id
            JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
            WHERE d.appointment_id = :appointment_id
            ORDER BY d.created_at DESC
        ");
        
        $stmt->bindParam(":appointment_id", $appointment_id);
        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    function get($id = null)
    {
        include "connection.php";

        $query = "
            SELECT
                d.diagnosis_id,
                d.condition_name,
                d.date_diagnosed,
                d.severity,
                d.notes,
                d.created_at,
                d.updated_at,
                d.appointment_id,
                d.doctor_id,
                d.patient_id,
                u.name AS patient_name,
                doc.name AS doctor_name,
                a.appointment_date
            FROM tbl_diagnoses d
            JOIN tbl_patients p ON d.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_doctors doc_tbl ON d.doctor_id = doc_tbl.doctor_id
            JOIN tbl_users doc ON doc_tbl.user_id = doc.user_id
            JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
        ";

        if ($id === null) {
            $query .= "ORDER BY d.created_at DESC LIMIT 1";
            $stmt = $conn->prepare($query);
        } else {
            $query .= "WHERE d.diagnosis_id = :diagnosis_id LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(":diagnosis_id", $id);
        }

        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($data) {
            return ['success' => true, 'data' => $data];
        } else {
            return ['success' => false, 'message' => 'Diagnosis not found.'];
        }
    }

    function add($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['appointment_id']) || empty($data['doctor_id']) || empty($data['patient_id']) || 
            empty($data['condition_name']) || empty($data['date_diagnosed']) || empty($data['severity'])) {
            return ['success' => false, 'message' => 'All required fields must be provided.'];
        }

        try {
            $stmt = $conn->prepare("
                INSERT INTO tbl_diagnoses (appointment_id, doctor_id, patient_id, condition_name, date_diagnosed, severity, notes)
                VALUES (:appointment_id, :doctor_id, :patient_id, :condition_name, :date_diagnosed, :severity, :notes)
            ");
            
            $stmt->bindParam(':appointment_id', $data['appointment_id']);
            $stmt->bindParam(':doctor_id', $data['doctor_id']);
            $stmt->bindParam(':patient_id', $data['patient_id']);
            $stmt->bindParam(':condition_name', $data['condition_name']);
            $stmt->bindParam(':date_diagnosed', $data['date_diagnosed']);
            $stmt->bindParam(':severity', $data['severity']);
            $stmt->bindParam(':notes', $data['notes']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Diagnosis added successfully.', 'diagnosis_id' => $conn->lastInsertId()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to add diagnosis: ' . $e->getMessage()];
        }
    }

    function update($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['diagnosis_id'])) {
            return ['success' => false, 'message' => 'Diagnosis ID is required.'];
        }

        try {
            $fields = [];
            $params = [':diagnosis_id' => $data['diagnosis_id']];

            if (!empty($data['condition_name'])) {
                $fields[] = "condition_name = :condition_name";
                $params[':condition_name'] = $data['condition_name'];
            }
            if (!empty($data['date_diagnosed'])) {
                $fields[] = "date_diagnosed = :date_diagnosed";
                $params[':date_diagnosed'] = $data['date_diagnosed'];
            }
            if (!empty($data['severity'])) {
                $fields[] = "severity = :severity";
                $params[':severity'] = $data['severity'];
            }
            if (isset($data['notes'])) {
                $fields[] = "notes = :notes";
                $params[':notes'] = $data['notes'];
            }

            if (empty($fields)) {
                return ['success' => false, 'message' => 'No fields to update.'];
            }

            $sql = "UPDATE tbl_diagnoses SET " . implode(", ", $fields) . " WHERE diagnosis_id = :diagnosis_id";
            $stmt = $conn->prepare($sql);
            
            foreach ($params as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->execute();

            return ['success' => true, 'message' => 'Diagnosis updated successfully.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update diagnosis: ' . $e->getMessage()];
        }
    }

    function delete($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['diagnosis_id'])) {
            return ['success' => false, 'message' => 'Diagnosis ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_diagnoses WHERE diagnosis_id = :diagnosis_id");
            $stmt->bindParam(":diagnosis_id", $data['diagnosis_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Diagnosis deleted successfully.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Delete failed: ' . $e->getMessage()];
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

$diagnosis = new Diagnosis();

switch ($operation) {
    case "get_all":
        echo json_encode($diagnosis->get_all());
        break;
    case "get":
        $id = $_GET['id'] ?? null;
        echo json_encode($diagnosis->get($id));
        break;
    case "get_by_appointment":
        $appointment_id = $_GET['appointment_id'] ?? null;
        if ($appointment_id) {
            echo json_encode($diagnosis->get_by_appointment($appointment_id));
        } else {
            echo json_encode(['success' => false, 'message' => 'Appointment ID is required.']);
        }
        break;
    case "add":
        echo json_encode($diagnosis->add($json));
        break;
    case "update":
        echo json_encode($diagnosis->update($json));
        break;
    case "delete":
        echo json_encode($diagnosis->delete($json));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
