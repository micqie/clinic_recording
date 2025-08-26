<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Prescriptions
{
    function getAllPrescriptions()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT pr.*,
                       d.condition_name,
                       a.appointment_date,
                       a.queue_number,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       doc.user_id as doctor_user_id,
                       du.name as doctor_name,
                       m.medicine_name,
                       m.strength,
                       f.form_name
                FROM tbl_prescriptions pr
                JOIN tbl_diagnoses d ON pr.diagnosis_id = d.diagnosis_id
                JOIN tbl_appointments a ON pr.appointment_id = a.appointment_id
                JOIN tbl_patients p ON pr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors doc ON pr.doctor_id = doc.doctor_id
                JOIN tbl_users du ON doc.user_id = du.user_id
                JOIN tbl_medicines m ON pr.medicine_id = m.medicine_id
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                ORDER BY pr.created_at DESC
            ");
            $stmt->execute();
            $prescriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'prescriptions' => $prescriptions];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch prescriptions: ' . $e->getMessage()];
        }
    }

    function getPrescriptionsByPatient($patient_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT pr.*,
                       d.condition_name,
                       a.appointment_date,
                       a.queue_number,
                       doc.user_id as doctor_user_id,
                       du.name as doctor_name,
                       m.medicine_name,
                       m.strength,
                       f.form_name
                FROM tbl_prescriptions pr
                JOIN tbl_diagnoses d ON pr.diagnosis_id = d.diagnosis_id
                JOIN tbl_appointments a ON pr.appointment_id = a.appointment_id
                JOIN tbl_doctors doc ON pr.doctor_id = doc.doctor_id
                JOIN tbl_users du ON doc.user_id = du.user_id
                JOIN tbl_medicines m ON pr.medicine_id = m.medicine_id
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                WHERE pr.patient_id = :patient_id
                ORDER BY pr.created_at DESC
            ");
            $stmt->bindParam(":patient_id", $patient_id);
            $stmt->execute();
            $prescriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'prescriptions' => $prescriptions];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch prescriptions: ' . $e->getMessage()];
        }
    }

    function getPrescriptionsByDoctor($doctor_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT pr.*,
                       d.condition_name,
                       a.appointment_date,
                       a.queue_number,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       m.medicine_name,
                       m.strength,
                       f.form_name
                FROM tbl_prescriptions pr
                JOIN tbl_diagnoses d ON pr.diagnosis_id = d.diagnosis_id
                JOIN tbl_appointments a ON pr.appointment_id = a.appointment_id
                JOIN tbl_patients p ON pr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_medicines m ON pr.medicine_id = m.medicine_id
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                WHERE pr.doctor_id = :doctor_id
                ORDER BY pr.created_at DESC
            ");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();
            $prescriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'prescriptions' => $prescriptions];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch prescriptions: ' . $e->getMessage()];
        }
    }

    function getPrescriptionById($prescription_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT pr.*,
                       d.condition_name,
                       a.appointment_date,
                       a.queue_number,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       doc.user_id as doctor_user_id,
                       du.name as doctor_name,
                       m.medicine_name,
                       m.strength,
                       f.form_name
                FROM tbl_prescriptions pr
                JOIN tbl_diagnoses d ON pr.diagnosis_id = d.diagnosis_id
                JOIN tbl_appointments a ON pr.appointment_id = a.appointment_id
                JOIN tbl_patients p ON pr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors doc ON pr.doctor_id = doc.doctor_id
                JOIN tbl_users du ON doc.user_id = du.user_id
                JOIN tbl_medicines m ON pr.medicine_id = m.medicine_id
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                WHERE pr.prescription_id = :prescription_id
                LIMIT 1
            ");
            $stmt->bindParam(":prescription_id", $prescription_id);
            $stmt->execute();
            $prescription = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($prescription) {
                return ['success' => true, 'prescription' => $prescription];
            } else {
                return ['success' => false, 'message' => 'Prescription not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch prescription: ' . $e->getMessage()];
        }
    }

    function addPrescription($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['diagnosis_id']) || empty($data['appointment_id']) || empty($data['doctor_id']) ||
            empty($data['patient_id']) || empty($data['medicine_id']) || empty($data['dosage']) ||
            empty($data['frequency']) || empty($data['duration']) || empty($data['quantity'])) {
            return ['success' => false, 'message' => 'All required fields must be provided.'];
        }

        try {
            $sql = "INSERT INTO tbl_prescriptions (diagnosis_id, appointment_id, doctor_id, patient_id, medicine_id, dosage, frequency, duration, quantity, packaging_unit, instructions, status)
                    VALUES (:diagnosis_id, :appointment_id, :doctor_id, :patient_id, :medicine_id, :dosage, :frequency, :duration, :quantity, :packaging_unit, :instructions, :status)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":diagnosis_id", $data['diagnosis_id']);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->bindParam(":doctor_id", $data['doctor_id']);
            $stmt->bindParam(":patient_id", $data['patient_id']);
            $stmt->bindParam(":medicine_id", $data['medicine_id']);
            $stmt->bindParam(":dosage", $data['dosage']);
            $stmt->bindParam(":frequency", $data['frequency']);
            $stmt->bindParam(":duration", $data['duration']);
            $stmt->bindParam(":quantity", $data['quantity']);
            $stmt->bindParam(":packaging_unit", $data['packaging_unit'] ?? 'tablet');
            $stmt->bindParam(":instructions", $data['instructions'] ?? null);
            $stmt->bindParam(":status", $data['status'] ?? 'Active');
            $stmt->execute();

            $prescription_id = $conn->lastInsertId();

            return ['success' => true, 'message' => 'Prescription added successfully!', 'prescription_id' => $prescription_id];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add prescription: ' . $e->getMessage()];
        }
    }

    function updatePrescription($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['prescription_id'])) {
            return ['success' => false, 'message' => 'Prescription ID is required.'];
        }

        try {
            $sql = "UPDATE tbl_prescriptions SET
                    medicine_id = :medicine_id,
                    dosage = :dosage,
                    frequency = :frequency,
                    duration = :duration,
                    instructions = :instructions,
                    status = :status
                    WHERE prescription_id = :prescription_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":medicine_id", $data['medicine_id']);
            $stmt->bindParam(":dosage", $data['dosage']);
            $stmt->bindParam(":frequency", $data['frequency']);
            $stmt->bindParam(":duration", $data['duration']);
            $stmt->bindParam(":instructions", $data['instructions'] ?? null);
            $stmt->bindParam(":status", $data['status']);
            $stmt->bindParam(":prescription_id", $data['prescription_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Prescription updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update prescription: ' . $e->getMessage()];
        }
    }

    function deletePrescription($prescription_id)
    {
        include "connection.php";

        if (empty($prescription_id)) {
            return ['success' => false, 'message' => 'Prescription ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_prescriptions WHERE prescription_id = :prescription_id");
            $stmt->bindParam(":prescription_id", $prescription_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Prescription deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Prescription not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete prescription: ' . $e->getMessage()];
        }
    }

    function updatePrescriptionStatus($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['prescription_id']) || empty($data['status'])) {
            return ['success' => false, 'message' => 'Prescription ID and status are required.'];
        }

        try {
            $sql = "UPDATE tbl_prescriptions SET status = :status WHERE prescription_id = :prescription_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":status", $data['status']);
            $stmt->bindParam(":prescription_id", $data['prescription_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Prescription status updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update prescription status: ' . $e->getMessage()];
        }
    }

    function getPrescriptionStatistics()
    {
        include "connection.php";

        try {
            // Total prescriptions
            $stmt = $conn->prepare("SELECT COUNT(*) as total_prescriptions FROM tbl_prescriptions");
            $stmt->execute();
            $totalPrescriptions = $stmt->fetchColumn();

            // Prescriptions by status
            $stmt = $conn->prepare("
                SELECT status, COUNT(*) as count
                FROM tbl_prescriptions
                GROUP BY status
            ");
            $stmt->execute();
            $statusStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Recent prescriptions (last 30 days)
            $stmt = $conn->prepare("
                SELECT COUNT(*) as recent_prescriptions
                FROM tbl_prescriptions
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $stmt->execute();
            $recentPrescriptions = $stmt->fetchColumn();

            return [
                'success' => true,
                'statistics' => [
                    'total_prescriptions' => $totalPrescriptions,
                    'recent_prescriptions' => $recentPrescriptions,
                    'status_stats' => $statusStats
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch prescription statistics: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $prescription_id = $_GET['prescription_id'] ?? "";
    $patient_id = $_GET['patient_id'] ?? "";
    $doctor_id = $_GET['doctor_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $prescription_id = $_POST['prescription_id'] ?? "";
    $patient_id = $_POST['patient_id'] ?? "";
    $doctor_id = $_POST['doctor_id'] ?? "";
}

$prescriptions = new Prescriptions();

switch ($operation) {
    case "getAll":
        echo json_encode($prescriptions->getAllPrescriptions());
        break;
    case "getByPatient":
        echo json_encode($prescriptions->getPrescriptionsByPatient($patient_id));
        break;
    case "getByDoctor":
        echo json_encode($prescriptions->getPrescriptionsByDoctor($doctor_id));
        break;
    case "getById":
        echo json_encode($prescriptions->getPrescriptionById($prescription_id));
        break;
    case "add":
        echo json_encode($prescriptions->addPrescription($json));
        break;
    case "update":
        echo json_encode($prescriptions->updatePrescription($json));
        break;
    case "delete":
        echo json_encode($prescriptions->deletePrescription($prescription_id));
        break;
    case "updateStatus":
        echo json_encode($prescriptions->updatePrescriptionStatus($json));
        break;
    case "getStatistics":
        echo json_encode($prescriptions->getPrescriptionStatistics());
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
