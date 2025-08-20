<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Consultations
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    public function add($json)
    {
        $data = json_decode($json ?: '{}', true);
        if (empty($data['patient_id']) || empty($data['doctor_id']) || empty($data['appointment_id']) || empty($data['summary'])) {
            return ['success' => false, 'message' => 'patient_id, doctor_id, appointment_id, and summary are required.'];
        }

        try {
            // Don't specify consultation_id - let database auto-increment handle it
            $stmt = $this->conn->prepare("INSERT INTO tbl_consultations (appointment_id, doctor_id, patient_id, summary, notes) VALUES (:aid, :did, :pid, :summary, :notes)");
            $stmt->bindParam(":aid", $data['appointment_id']);
            $stmt->bindParam(":did", $data['doctor_id']);
            $stmt->bindParam(":pid", $data['patient_id']);
            $stmt->bindParam(":summary", $data['summary']);
            $stmt->bindParam(":notes", $data['notes']);
            $stmt->execute();
            return ['success' => true, 'message' => 'Consultation saved successfully.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to save consultation: ' . $e->getMessage()];
        }
    }

    public function get_all()
    {
        try {
            $stmt = $this->conn->prepare("\n                SELECT c.*, a.appointment_date, pu.name AS patient_name, du.name AS doctor_name\n                FROM tbl_consultations c\n                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id\n                JOIN tbl_patients p ON c.patient_id = p.patient_id\n                JOIN tbl_users pu ON p.user_id = pu.user_id\n                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id\n                JOIN tbl_users du ON d.user_id = du.user_id\n                ORDER BY c.created_at DESC\n            ");
            $stmt->execute();
            return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch consultations: ' . $e->getMessage()];
        }
    }

    public function get_by_id($id)
    {
        if (empty($id)) { return ['success' => false, 'message' => 'id is required.']; }
        try {
            $stmt = $this->conn->prepare("\n                SELECT c.*, a.appointment_date, pu.name AS patient_name, du.name AS doctor_name\n                FROM tbl_consultations c\n                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id\n                JOIN tbl_patients p ON c.patient_id = p.patient_id\n                JOIN tbl_users pu ON p.user_id = pu.user_id\n                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id\n                JOIN tbl_users du ON d.user_id = du.user_id\n                WHERE c.consultation_id = :id\n                LIMIT 1\n            ");
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) { return ['success' => true, 'consultation' => $row]; }
            return ['success' => false, 'message' => 'Consultation not found.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch: ' . $e->getMessage()];
        }
    }

    public function get_by_doctor($doctorId)
    {
        if (empty($doctorId)) { return ['success' => false, 'message' => 'doctor_id is required.']; }
        try {
            $stmt = $this->conn->prepare("\n                SELECT c.*, a.appointment_date, pu.name AS patient_name\n                FROM tbl_consultations c\n                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id\n                JOIN tbl_patients p ON c.patient_id = p.patient_id\n                JOIN tbl_users pu ON p.user_id = pu.user_id\n                WHERE c.doctor_id = :doc\n                ORDER BY c.created_at DESC\n            ");
            $stmt->bindParam(":doc", $doctorId);
            $stmt->execute();
            return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch: ' . $e->getMessage()];
        }
    }

    public function get_by_patient($patientId)
    {
        if (empty($patientId)) { return ['success' => false, 'message' => 'patient_id is required.']; }
        try {
            $stmt = $this->conn->prepare("\n                SELECT c.*, a.appointment_date, du.name AS doctor_name\n                FROM tbl_consultations c\n                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id\n                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id\n                JOIN tbl_users du ON d.user_id = du.user_id\n                WHERE c.patient_id = :pid\n                ORDER BY c.created_at DESC\n            ");
            $stmt->bindParam(":pid", $patientId);
            $stmt->execute();
            return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch: ' . $e->getMessage()];
        }
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';
$id = $_POST['id'] ?? $_GET['id'] ?? '';
$doctorId = $_POST['doctor_id'] ?? $_GET['doctor_id'] ?? '';
$patientId = $_POST['patient_id'] ?? $_GET['patient_id'] ?? '';

$svc = new Consultations();

switch ($operation) {
    case 'add':
        echo json_encode($svc->add($json));
        break;
    case 'getAll':
        echo json_encode($svc->get_all());
        break;
    case 'getById':
        echo json_encode($svc->get_by_id($id));
        break;
    case 'getByDoctor':
        echo json_encode($svc->get_by_doctor($doctorId));
        break;
    case 'getByPatient':
        echo json_encode($svc->get_by_patient($patientId));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}

?>
