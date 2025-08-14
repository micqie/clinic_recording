<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Payments
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    private function getPaymentStatusId($statusName)
    {
        $stmt = $this->conn->prepare("SELECT s.status_id FROM tbl_status s JOIN tbl_status_type t ON s.status_type_id = t.status_type_id WHERE t.status_type_name = 'Payment' AND s.status_name = :name LIMIT 1");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }

    public function get_all()
    {
        $stmt = $this->conn->prepare("
            SELECT p.payment_id, p.appointment_id, p.amount, p.method, p.payment_date, p.status_id,
                   s.status_name AS payment_status,
                   a.appointment_date,
                   u.name AS patient_name,
                   du.name AS doctor_name
            FROM tbl_payments p
            JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
            JOIN tbl_patients pt ON a.patient_id = pt.patient_id
            JOIN tbl_users u ON pt.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_status s ON p.status_id = s.status_id
            ORDER BY p.payment_date DESC, p.payment_id DESC
        ");
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Create or update payment for an appointment
    public function set_status($data)
    {
        if (empty($data['appointment_id']) || empty($data['status_name'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and status_name are required."]); return;
        }
        $statusId = $this->getPaymentStatusId($data['status_name']);
        if (!$statusId) { echo json_encode(["success" => false, "message" => "Invalid payment status."]); return; }

        $amount = isset($data['amount']) ? $data['amount'] : null;
        $method = isset($data['method']) ? $data['method'] : null;

        // Upsert logic
        $stmt = $this->conn->prepare("SELECT payment_id FROM tbl_payments WHERE appointment_id = :aid LIMIT 1");
        $stmt->bindParam(":aid", $data['appointment_id']);
        $stmt->execute();
        $existingId = $stmt->fetchColumn();

        if ($existingId) {
            $stmt = $this->conn->prepare("UPDATE tbl_payments SET amount = :amount, method = :method, status_id = :sid, payment_date = CASE WHEN :sidPaid = :sid THEN NOW() ELSE payment_date END WHERE appointment_id = :aid");
            $stmt->bindParam(":amount", $amount);
            $stmt->bindParam(":method", $method);
            $stmt->bindParam(":sid", $statusId);
            $stmt->bindParam(":sidPaid", $statusId);
            $stmt->bindParam(":aid", $data['appointment_id']);
            $ok = $stmt->execute();
        } else {
            $stmt = $this->conn->prepare("INSERT INTO tbl_payments (appointment_id, amount, method, status_id, payment_date) VALUES (:aid, :amount, :method, :sid, CASE WHEN :sidPaid = :sid THEN NOW() ELSE NULL END)");
            $stmt->bindParam(":aid", $data['appointment_id']);
            $stmt->bindParam(":amount", $amount);
            $stmt->bindParam(":method", $method);
            $stmt->bindParam(":sid", $statusId);
            $stmt->bindParam(":sidPaid", $statusId);
            $ok = $stmt->execute();
        }

        if ($ok) {
            echo json_encode(["success" => true, "message" => "Payment updated."]); return;
        }
        echo json_encode(["success" => false, "message" => "Failed to update payment."]);
    }

    public function get_by_patient($patientId)
    {
        if (empty($patientId)) { echo json_encode(["success" => false, "message" => "patient_id required."]); return; }
        $stmt = $this->conn->prepare("
            SELECT p.payment_id, p.appointment_id, p.amount, p.method, p.payment_date, s.status_name AS payment_status,
                   a.appointment_date
            FROM tbl_payments p
            JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
            JOIN tbl_status s ON p.status_id = s.status_id
            WHERE a.patient_id = :pid
            ORDER BY p.payment_date DESC, p.payment_id DESC
        ");
        $stmt->bindParam(":pid", $patientId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function get_by_appointment($appointmentId)
    {
        if (empty($appointmentId)) { echo json_encode(["success" => false, "message" => "appointment_id required."]); return; }
        $stmt = $this->conn->prepare("SELECT p.*, s.status_name AS payment_status FROM tbl_payments p LEFT JOIN tbl_status s ON p.status_id = s.status_id WHERE p.appointment_id = :aid LIMIT 1");
        $stmt->bindParam(":aid", $appointmentId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
    }
}

$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new Payments();

switch ($operation) {
    case 'get_all':
        $svc->get_all();
        break;
    case 'set_status':
        $data = json_decode($json ?: '{}', true);
        $svc->set_status($data);
        break;
    case 'get_by_patient':
        $pid = $_GET['patient_id'] ?? '';
        $svc->get_by_patient($pid);
        break;
    case 'get_by_appointment':
        $aid = $_GET['appointment_id'] ?? '';
        $svc->get_by_appointment($aid);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>


