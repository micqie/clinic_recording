<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Prescription
{
    function get_all()
    {
        include "connection.php";

        $stmt = $conn->prepare("
            SELECT
                p.prescription_id,
                p.diagnosis_id,
                p.appointment_id,
                p.doctor_id,
                p.patient_id,
                p.medicine_id,
                p.dosage,
                p.frequency,
                p.duration,
                p.instructions,
                p.status,
                p.created_at,
                p.updated_at,
                u.name AS patient_name,
                doc.name AS doctor_name,
                m.name AS medicine_name,
                m.price AS medicine_price,
                d.condition_name,
                a.appointment_date
            FROM tbl_prescriptions p
            JOIN tbl_patients pat ON p.patient_id = pat.patient_id
            JOIN tbl_users u ON pat.user_id = u.user_id
            JOIN tbl_doctors doc_tbl ON p.doctor_id = doc_tbl.doctor_id
            JOIN tbl_users doc ON doc_tbl.user_id = doc.user_id
            JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
            JOIN tbl_diagnoses d ON p.diagnosis_id = d.diagnosis_id
            JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
            ORDER BY p.created_at DESC
        ");

        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    function get_by_diagnosis($diagnosis_id)
    {
        include "connection.php";

        $stmt = $conn->prepare("
            SELECT
                p.prescription_id,
                p.diagnosis_id,
                p.appointment_id,
                p.doctor_id,
                p.patient_id,
                p.medicine_id,
                p.dosage,
                p.frequency,
                p.duration,
                p.instructions,
                p.status,
                p.created_at,
                p.updated_at,
                m.name AS medicine_name,
                m.price AS medicine_price,
                mf.form_name AS medicine_form,
                mu.unit_name AS medicine_unit
            FROM tbl_prescriptions p
            JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
            JOIN tbl_medicine_forms mf ON m.form_id = mf.form_id
            JOIN tbl_medicine_units mu ON m.unit_id = mu.unit_id
            WHERE p.diagnosis_id = :diagnosis_id
            ORDER BY p.created_at DESC
        ");
        
        $stmt->bindParam(":diagnosis_id", $diagnosis_id);
        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    function get_by_appointment($appointment_id)
    {
        include "connection.php";

        $stmt = $conn->prepare("
            SELECT
                p.prescription_id,
                p.diagnosis_id,
                p.appointment_id,
                p.doctor_id,
                p.patient_id,
                p.medicine_id,
                p.dosage,
                p.frequency,
                p.duration,
                p.instructions,
                p.status,
                p.created_at,
                p.updated_at,
                m.name AS medicine_name,
                m.price AS medicine_price,
                d.condition_name
            FROM tbl_prescriptions p
            JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
            JOIN tbl_diagnoses d ON p.diagnosis_id = d.diagnosis_id
            WHERE p.appointment_id = :appointment_id
            ORDER BY p.created_at DESC
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
                p.prescription_id,
                p.diagnosis_id,
                p.appointment_id,
                p.doctor_id,
                p.patient_id,
                p.medicine_id,
                p.dosage,
                p.frequency,
                p.duration,
                p.instructions,
                p.status,
                p.created_at,
                p.updated_at,
                u.name AS patient_name,
                doc.name AS doctor_name,
                m.name AS medicine_name,
                m.price AS medicine_price,
                d.condition_name,
                a.appointment_date
            FROM tbl_prescriptions p
            JOIN tbl_patients pat ON p.patient_id = pat.patient_id
            JOIN tbl_users u ON pat.user_id = u.user_id
            JOIN tbl_doctors doc_tbl ON p.doctor_id = doc_tbl.doctor_id
            JOIN tbl_users doc ON doc_tbl.user_id = doc.user_id
            JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
            JOIN tbl_diagnoses d ON p.diagnosis_id = d.diagnosis_id
            JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
        ";

        if ($id === null) {
            $query .= "ORDER BY p.created_at DESC LIMIT 1";
            $stmt = $conn->prepare($query);
        } else {
            $query .= "WHERE p.prescription_id = :prescription_id LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(":prescription_id", $id);
        }

        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($data) {
            return ['success' => true, 'data' => $data];
        } else {
            return ['success' => false, 'message' => 'Prescription not found.'];
        }
    }

    function add($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['diagnosis_id']) || empty($data['appointment_id']) || empty($data['doctor_id']) || 
            empty($data['patient_id']) || empty($data['medicine_id']) || empty($data['dosage']) || 
            empty($data['frequency']) || empty($data['duration'])) {
            return ['success' => false, 'message' => 'All required fields must be provided.'];
        }

        try {
            $stmt = $conn->prepare("
                INSERT INTO tbl_prescriptions (diagnosis_id, appointment_id, doctor_id, patient_id, medicine_id, dosage, frequency, duration, instructions, status)
                VALUES (:diagnosis_id, :appointment_id, :doctor_id, :patient_id, :medicine_id, :dosage, :frequency, :duration, :instructions, :status)
            ");
            
            $status = $data['status'] ?? 'Active';
            
            $stmt->bindParam(':diagnosis_id', $data['diagnosis_id']);
            $stmt->bindParam(':appointment_id', $data['appointment_id']);
            $stmt->bindParam(':doctor_id', $data['doctor_id']);
            $stmt->bindParam(':patient_id', $data['patient_id']);
            $stmt->bindParam(':medicine_id', $data['medicine_id']);
            $stmt->bindParam(':dosage', $data['dosage']);
            $stmt->bindParam(':frequency', $data['frequency']);
            $stmt->bindParam(':duration', $data['duration']);
            $stmt->bindParam(':instructions', $data['instructions']);
            $stmt->bindParam(':status', $status);
            $stmt->execute();

            return ['success' => true, 'message' => 'Prescription added successfully.', 'prescription_id' => $conn->lastInsertId()];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to add prescription: ' . $e->getMessage()];
        }
    }

    function update($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['prescription_id'])) {
            return ['success' => false, 'message' => 'Prescription ID is required.'];
        }

        try {
            $fields = [];
            $params = [':prescription_id' => $data['prescription_id']];

            if (!empty($data['dosage'])) {
                $fields[] = "dosage = :dosage";
                $params[':dosage'] = $data['dosage'];
            }
            if (!empty($data['frequency'])) {
                $fields[] = "frequency = :frequency";
                $params[':frequency'] = $data['frequency'];
            }
            if (!empty($data['duration'])) {
                $fields[] = "duration = :duration";
                $params[':duration'] = $data['duration'];
            }
            if (isset($data['instructions'])) {
                $fields[] = "instructions = :instructions";
                $params[':instructions'] = $data['instructions'];
            }
            if (!empty($data['status'])) {
                $fields[] = "status = :status";
                $params[':status'] = $data['status'];
            }

            if (empty($fields)) {
                return ['success' => false, 'message' => 'No fields to update.'];
            }

            $sql = "UPDATE tbl_prescriptions SET " . implode(", ", $fields) . " WHERE prescription_id = :prescription_id";
            $stmt = $conn->prepare($sql);
            
            foreach ($params as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->execute();

            return ['success' => true, 'message' => 'Prescription updated successfully.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update prescription: ' . $e->getMessage()];
        }
    }

    function delete($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['prescription_id'])) {
            return ['success' => false, 'message' => 'Prescription ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_prescriptions WHERE prescription_id = :prescription_id");
            $stmt->bindParam(":prescription_id", $data['prescription_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Prescription deleted successfully.'];
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

$prescription = new Prescription();

switch ($operation) {
    case "get_all":
        echo json_encode($prescription->get_all());
        break;
    case "get":
        $id = $_GET['id'] ?? null;
        echo json_encode($prescription->get($id));
        break;
    case "get_by_diagnosis":
        $diagnosis_id = $_GET['diagnosis_id'] ?? null;
        if ($diagnosis_id) {
            echo json_encode($prescription->get_by_diagnosis($diagnosis_id));
        } else {
            echo json_encode(['success' => false, 'message' => 'Diagnosis ID is required.']);
        }
        break;
    case "get_by_appointment":
        $appointment_id = $_GET['appointment_id'] ?? null;
        if ($appointment_id) {
            echo json_encode($prescription->get_by_appointment($appointment_id));
        } else {
            echo json_encode(['success' => false, 'message' => 'Appointment ID is required.']);
        }
        break;
    case "add":
        echo json_encode($prescription->add($json));
        break;
    case "update":
        echo json_encode($prescription->update($json));
        break;
    case "delete":
        echo json_encode($prescription->delete($json));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
