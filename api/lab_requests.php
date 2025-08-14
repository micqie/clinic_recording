<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class LabRequests
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    private function getLabStatusId($statusName)
    {
        $stmt = $this->conn->prepare("SELECT s.status_id FROM tbl_status s JOIN tbl_status_type t ON s.status_type_id = t.status_type_id WHERE t.status_type_name = 'LabResult' AND s.status_name = :name LIMIT 1");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }

    public function create($data)
    {
        if (empty($data['doctor_id']) || empty($data['patient_id']) || empty($data['request_text'])) {
            echo json_encode(["success" => false, "message" => "doctor_id, patient_id and request_text are required."]); return;
        }
        $statusId = $this->getLabStatusId('Processing');
        $stmt = $this->conn->prepare("INSERT INTO tbl_lab_requests (doctor_id, patient_id, appointment_id, request_text, status_id, created_at) VALUES (:doc, :pid, :aid, :txt, :sid, NOW())");
        $stmt->bindParam(":doc", $data['doctor_id']);
        $stmt->bindParam(":pid", $data['patient_id']);
        $stmt->bindParam(":aid", $data['appointment_id']);
        $stmt->bindParam(":txt", $data['request_text']);
        $stmt->bindParam(":sid", $statusId);
        if ($stmt->execute()) { echo json_encode(["success" => true, "message" => "Lab request created."]); return; }
        echo json_encode(["success" => false, "message" => "Failed to create lab request."]);        
    }

    public function get_by_patient($patientId)
    {
        if (empty($patientId)) { echo json_encode(["success" => false, "message" => "patient_id required."]); return; }
        $stmt = $this->conn->prepare("
            SELECT lr.lab_request_id, lr.request_text, lr.created_at, s.status_name, du.name AS doctor_name
            FROM tbl_lab_requests lr
            JOIN tbl_status s ON lr.status_id = s.status_id
            JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
            JOIN tbl_users du ON d.user_id = du.user_id
            WHERE lr.patient_id = :pid
            ORDER BY lr.created_at DESC, lr.lab_request_id DESC
        ");
        $stmt->bindParam(":pid", $patientId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function get_by_doctor($doctorId)
    {
        if (empty($doctorId)) { echo json_encode(["success" => false, "message" => "doctor_id required."]); return; }
        $stmt = $this->conn->prepare("
            SELECT lr.lab_request_id, lr.request_text, lr.created_at, s.status_name, u.name AS patient_name
            FROM tbl_lab_requests lr
            JOIN tbl_status s ON lr.status_id = s.status_id
            JOIN tbl_patients p ON lr.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            WHERE lr.doctor_id = :doc
            ORDER BY lr.created_at DESC, lr.lab_request_id DESC
        ");
        $stmt->bindParam(":doc", $doctorId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}

$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new LabRequests();

switch ($operation) {
    case 'create':
        $data = json_decode($json ?: '{}', true);
        $svc->create($data);
        break;
    case 'get_by_patient':
        $pid = $_GET['patient_id'] ?? '';
        $svc->get_by_patient($pid);
        break;
    case 'get_by_doctor':
        $doc = $_GET['doctor_id'] ?? '';
        $svc->get_by_doctor($doc);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>


