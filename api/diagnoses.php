<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Diagnoses
{
    function getAllDiagnoses()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT d.*,
                       a.appointment_date,
                       a.queue_number,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       doc.user_id as doctor_user_id,
                       du.name as doctor_name
                FROM tbl_diagnoses d
                JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
                JOIN tbl_patients p ON d.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors doc ON d.doctor_id = doc.doctor_id
                JOIN tbl_users du ON doc.user_id = du.user_id
                ORDER BY d.date_diagnosed DESC, d.created_at DESC
            ");
            $stmt->execute();
            $diagnoses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'diagnoses' => $diagnoses];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch diagnoses: ' . $e->getMessage()];
        }
    }

    function getDiagnosesByPatient($patient_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT d.*,
                       a.appointment_date,
                       a.queue_number,
                       doc.user_id as doctor_user_id,
                       du.name as doctor_name
                FROM tbl_diagnoses d
                JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
                JOIN tbl_doctors doc ON d.doctor_id = doc.doctor_id
                JOIN tbl_users du ON doc.user_id = du.user_id
                WHERE d.patient_id = :patient_id
                ORDER BY d.date_diagnosed DESC, d.created_at DESC
            ");
            $stmt->bindParam(":patient_id", $patient_id);
            $stmt->execute();
            $diagnoses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'diagnoses' => $diagnoses];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch diagnoses: ' . $e->getMessage()];
        }
    }

    function getDiagnosesByDoctor($doctor_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT d.*,
                       a.appointment_date,
                       a.queue_number,
                       p.user_id as patient_user_id,
                       u.name as patient_name
                FROM tbl_diagnoses d
                JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
                JOIN tbl_patients p ON d.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                WHERE d.doctor_id = :doctor_id
                ORDER BY d.date_diagnosed DESC, d.created_at DESC
            ");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();
            $diagnoses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'diagnoses' => $diagnoses];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch diagnoses: ' . $e->getMessage()];
        }
    }

    function getDiagnosisById($diagnosis_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT d.*,
                       a.appointment_date,
                       a.queue_number,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       doc.user_id as doctor_user_id,
                       du.name as doctor_name
                FROM tbl_diagnoses d
                JOIN tbl_appointments a ON d.appointment_id = a.appointment_id
                JOIN tbl_patients p ON d.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors doc ON d.doctor_id = doc.doctor_id
                JOIN tbl_users du ON doc.user_id = du.user_id
                WHERE d.diagnosis_id = :diagnosis_id
                LIMIT 1
            ");
            $stmt->bindParam(":diagnosis_id", $diagnosis_id);
            $stmt->execute();
            $diagnosis = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($diagnosis) {
                return ['success' => true, 'diagnosis' => $diagnosis];
            } else {
                return ['success' => false, 'message' => 'Diagnosis not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch diagnosis: ' . $e->getMessage()];
        }
    }

    function addDiagnosis($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['appointment_id']) || empty($data['doctor_id']) || empty($data['patient_id']) ||
            empty($data['condition_name']) || empty($data['severity'])) {
            return ['success' => false, 'message' => 'All fields are required.'];
        }

        try {
            $sql = "INSERT INTO tbl_diagnoses (appointment_id, doctor_id, patient_id, condition_name, date_diagnosed, severity, notes)
                    VALUES (:appointment_id, :doctor_id, :patient_id, :condition_name, :date_diagnosed, :severity, :notes)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->bindParam(":doctor_id", $data['doctor_id']);
            $stmt->bindParam(":patient_id", $data['patient_id']);
            $stmt->bindParam(":condition_name", $data['condition_name']);
            $dateDiagnosed = isset($data['date_diagnosed']) && $data['date_diagnosed'] !== '' ? $data['date_diagnosed'] : date('Y-m-d');
            $stmt->bindValue(":date_diagnosed", $dateDiagnosed);
            $stmt->bindParam(":severity", $data['severity']);
            $notesValue = isset($data['notes']) && $data['notes'] !== '' ? $data['notes'] : null;
            $stmt->bindValue(":notes", $notesValue, $notesValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->execute();

            $diagnosis_id = $conn->lastInsertId();

            return ['success' => true, 'message' => 'Diagnosis added successfully!', 'diagnosis_id' => $diagnosis_id];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add diagnosis: ' . $e->getMessage()];
        }
    }

    function updateDiagnosis($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['diagnosis_id'])) {
            return ['success' => false, 'message' => 'Diagnosis ID is required.'];
        }

        try {
            $sql = "UPDATE tbl_diagnoses SET
                    condition_name = :condition_name,
                    date_diagnosed = :date_diagnosed,
                    severity = :severity,
                    notes = :notes
                    WHERE diagnosis_id = :diagnosis_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":condition_name", $data['condition_name']);
            $stmt->bindParam(":date_diagnosed", $data['date_diagnosed']);
            $stmt->bindParam(":severity", $data['severity']);
            $notesValue = isset($data['notes']) && $data['notes'] !== '' ? $data['notes'] : null;
            $stmt->bindValue(":notes", $notesValue, $notesValue === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindParam(":diagnosis_id", $data['diagnosis_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Diagnosis updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update diagnosis: ' . $e->getMessage()];
        }
    }

    function deleteDiagnosis($diagnosis_id)
    {
        include "connection.php";

        if (empty($diagnosis_id)) {
            return ['success' => false, 'message' => 'Diagnosis ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_diagnoses WHERE diagnosis_id = :diagnosis_id");
            $stmt->bindParam(":diagnosis_id", $diagnosis_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Diagnosis deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Diagnosis not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete diagnosis: ' . $e->getMessage()];
        }
    }

    function getDiagnosisStatistics()
    {
        include "connection.php";

        try {
            // Total diagnoses
            $stmt = $conn->prepare("SELECT COUNT(*) as total_diagnoses FROM tbl_diagnoses");
            $stmt->execute();
            $totalDiagnoses = $stmt->fetchColumn();

            // Diagnoses by severity
            $stmt = $conn->prepare("
                SELECT severity, COUNT(*) as count
                FROM tbl_diagnoses
                GROUP BY severity
            ");
            $stmt->execute();
            $severityStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Recent diagnoses (last 30 days)
            $stmt = $conn->prepare("
                SELECT COUNT(*) as recent_diagnoses
                FROM tbl_diagnoses
                WHERE date_diagnosed >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ");
            $stmt->execute();
            $recentDiagnoses = $stmt->fetchColumn();

            return [
                'success' => true,
                'statistics' => [
                    'total_diagnoses' => $totalDiagnoses,
                    'recent_diagnoses' => $recentDiagnoses,
                    'severity_stats' => $severityStats
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch diagnosis statistics: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $diagnosis_id = $_GET['diagnosis_id'] ?? "";
    $patient_id = $_GET['patient_id'] ?? "";
    $doctor_id = $_GET['doctor_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $diagnosis_id = $_POST['diagnosis_id'] ?? "";
    $patient_id = $_POST['patient_id'] ?? "";
    $doctor_id = $_POST['doctor_id'] ?? "";
}

$diagnoses = new Diagnoses();

switch ($operation) {
    case "getAll":
        echo json_encode($diagnoses->getAllDiagnoses());
        break;
    case "getByPatient":
        echo json_encode($diagnoses->getDiagnosesByPatient($patient_id));
        break;
    case "getByDoctor":
        echo json_encode($diagnoses->getDiagnosesByDoctor($doctor_id));
        break;
    case "getById":
        echo json_encode($diagnoses->getDiagnosisById($diagnosis_id));
        break;
    case "add":
        echo json_encode($diagnoses->addDiagnosis($json));
        break;
    case "update":
        echo json_encode($diagnoses->updateDiagnosis($json));
        break;
    case "delete":
        echo json_encode($diagnoses->deleteDiagnosis($diagnosis_id));
        break;
    case "getStatistics":
        echo json_encode($diagnoses->getDiagnosisStatistics());
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
