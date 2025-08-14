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
            echo json_encode(["success" => false, "message" => "doctor_id, patient_id and request_text are required."]); 
            return;
        }
        
        $statusId = $this->getLabStatusId('Processing');
        if (!$statusId) {
            echo json_encode(["success" => false, "message" => "Lab status 'Processing' not found."]); 
            return;
        }
        
        $stmt = $this->conn->prepare("INSERT INTO tbl_lab_requests (doctor_id, patient_id, appointment_id, request_text, status_id, created_at) VALUES (:doc, :pid, :aid, :txt, :sid, NOW())");
        $stmt->bindParam(":doc", $data['doctor_id']);
        $stmt->bindParam(":pid", $data['patient_id']);
        $stmt->bindParam(":aid", $data['appointment_id']);
        $stmt->bindParam(":txt", $data['request_text']);
        $stmt->bindParam(":sid", $statusId);
        
        if ($stmt->execute()) { 
            echo json_encode(["success" => true, "message" => "Lab request created successfully."]); 
            return; 
        }
        echo json_encode(["success" => false, "message" => "Failed to create lab request."]);        
    }

    public function update_status($data)
    {
        if (empty($data['lab_request_id']) || empty($data['status'])) {
            echo json_encode(["success" => false, "message" => "lab_request_id and status are required."]); 
            return;
        }
        
        $statusId = $this->getLabStatusId($data['status']);
        if (!$statusId) {
            echo json_encode(["success" => false, "message" => "Status '{$data['status']}' not found."]); 
            return;
        }
        
        $stmt = $this->conn->prepare("UPDATE tbl_lab_requests SET status_id = :sid, updated_at = NOW() WHERE lab_request_id = :id");
        $stmt->bindParam(":sid", $statusId);
        $stmt->bindParam(":id", $data['lab_request_id']);
        
        if ($stmt->execute()) { 
            echo json_encode(["success" => true, "message" => "Lab request status updated."]); 
            return; 
        }
        echo json_encode(["success" => false, "message" => "Failed to update status."]);        
    }

    public function get_all()
    {
        try {
            $stmt = $this->conn->prepare("
                SELECT lr.lab_request_id, lr.request_text, lr.created_at, lr.updated_at,
                       s.status_name, s.status_id,
                       du.name AS doctor_name, d.license_number,
                       u.name AS patient_name, p.patient_id,
                       a.appointment_date, a.queue_number
                FROM tbl_lab_requests lr
                JOIN tbl_status s ON lr.status_id = s.status_id
                JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointments a ON lr.appointment_id = a.appointment_id
                ORDER BY lr.created_at DESC, lr.lab_request_id DESC
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($results)) {
                echo json_encode(["success" => true, "data" => [], "message" => "No lab requests found"]);
            } else {
                echo json_encode(["success" => true, "data" => $results]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function get_by_doctor($doctorId)
    {
        if (empty($doctorId)) { 
            echo json_encode(["success" => false, "message" => "doctor_id required."]); 
            return; 
        }
        
        try {
            $stmt = $this->conn->prepare("
                SELECT lr.lab_request_id, lr.request_text, lr.created_at, lr.updated_at,
                       s.status_name, s.status_id,
                       u.name AS patient_name, p.patient_id,
                       a.appointment_date, a.queue_number
                FROM tbl_lab_requests lr
                JOIN tbl_status s ON lr.status_id = s.status_id
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointments a ON lr.appointment_id = a.appointment_id
                WHERE lr.doctor_id = :doc
                ORDER BY lr.created_at DESC, lr.lab_request_id DESC
            ");
            $stmt->bindParam(":doc", $doctorId);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($results)) {
                echo json_encode(["success" => true, "data" => [], "message" => "No lab requests found for this doctor"]);
            } else {
                echo json_encode(["success" => true, "data" => $results]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function get_by_patient($patientId)
    {
        if (empty($patientId)) { 
            echo json_encode(["success" => false, "message" => "patient_id required."]); 
            return; 
        }
        
        try {
            $stmt = $this->conn->prepare("
                SELECT lr.lab_request_id, lr.request_text, lr.created_at, lr.updated_at,
                       s.status_name, s.status_id,
                       du.name AS doctor_name, d.license_number,
                       a.appointment_date, a.queue_number
                FROM tbl_lab_requests lr
                JOIN tbl_status s ON lr.status_id = s.status_id
                JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_appointments a ON lr.appointment_id = a.appointment_id
                WHERE lr.patient_id = :pid
                ORDER BY lr.created_at DESC, lr.lab_request_id DESC
            ");
            $stmt->bindParam(":pid", $patientId);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($results)) {
                echo json_encode(["success" => true, "data" => [], "message" => "No lab requests found for this patient"]);
            } else {
                echo json_encode(["success" => true, "data" => $results]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function get_by_id($labRequestId)
    {
        if (empty($labRequestId)) { 
            echo json_encode(["success" => false, "message" => "lab_request_id required."]); 
            return; 
        }
        
        $stmt = $this->conn->prepare("
            SELECT lr.lab_request_id, lr.request_text, lr.created_at, lr.updated_at,
                   s.status_name, s.status_id,
                   du.name AS doctor_name, d.license_number,
                   u.name AS patient_name, p.patient_id,
                   a.appointment_date, a.queue_number
            FROM tbl_lab_requests lr
            JOIN tbl_status s ON lr.status_id = s.status_id
            JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
            JOIN tbl_users du ON d.user_id = du.user_id
            JOIN tbl_patients p ON lr.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_appointments a ON lr.appointment_id = a.appointment_id
            WHERE lr.lab_request_id = :id
            LIMIT 1
        ");
        $stmt->bindParam(":id", $labRequestId);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            echo json_encode(["success" => true, "data" => $result]);
        } else {
            echo json_encode(["success" => false, "message" => "Lab request not found."]);
        }
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
    case 'update_status':
        $data = json_decode($json ?: '{}', true);
        $svc->update_status($data);
        break;
    case 'get_by_patient':
        $pid = $_GET['patient_id'] ?? '';
        $svc->get_by_patient($pid);
        break;
    case 'get_by_doctor':
        $doc = $_GET['doctor_id'] ?? '';
        $svc->get_by_doctor($doc);
        break;
    case 'get_all':
        $svc->get_all();
        break;
    case 'get_by_id':
        $id = $_GET['lab_request_id'] ?? '';
        $svc->get_by_id($id);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>


