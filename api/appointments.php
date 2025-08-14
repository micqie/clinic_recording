<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Appointments
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Helper to fetch status_id by status_name within Appointment status type
    private function getAppointmentStatusId($statusName)
    {
        $stmt = $this->conn->prepare("SELECT s.status_id FROM tbl_status s JOIN tbl_status_type t ON s.status_type_id = t.status_type_id WHERE t.status_type_name = 'Appointment' AND s.status_name = :name LIMIT 1");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }

    // Count booked for a specific date (excludes Cancelled)
    public function get_booked_count($date)
    {
        $cancelledId = $this->getAppointmentStatusId('Cancelled');
        $stmt = $this->conn->prepare("SELECT COUNT(*) AS cnt FROM tbl_appointments WHERE appointment_date = :d " . ($cancelledId ? "AND status_id <> :cancelled" : ""));
        $stmt->bindParam(":d", $date);
        if ($cancelledId) {
            $stmt->bindParam(":cancelled", $cancelledId);
        }
        $stmt->execute();
        $cnt = intval($stmt->fetchColumn());
        echo json_encode(["success" => true, "date" => $date, "count" => $cnt]);
    }

    // Secretary: list all appointments with patient, doctor, statuses (appointment + payment if any)
    public function get_all($page = 1, $limit = 50)
    {
        $offset = max(0, ($page - 1) * $limit);
        $stmt = $this->conn->prepare("
            SELECT a.appointment_id,
                   a.patient_id,
                   a.doctor_id,
                   a.secretary_id,
                   a.appointment_date,
                   a.queue_number,
                   a.status_id AS appointment_status_id,
                   sa.status_name AS appointment_status,
                   u.name AS patient_name,
                   du.name AS doctor_name,
                   pmt.payment_id,
                   pmt.amount,
                   pmt.method AS payment_method,
                   pmt.payment_date,
                   pmt.status_id AS payment_status_id,
                   sp.status_name AS payment_status
            FROM tbl_appointments a
            JOIN tbl_patients pt ON a.patient_id = pt.patient_id
            JOIN tbl_users u ON pt.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_payments pmt ON pmt.appointment_id = a.appointment_id
            LEFT JOIN tbl_status sa ON a.status_id = sa.status_id
            LEFT JOIN tbl_status sp ON pmt.status_id = sp.status_id
            ORDER BY a.appointment_date DESC, a.queue_number ASC, a.appointment_id DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(":limit", intval($limit), PDO::PARAM_INT);
        $stmt->bindValue(":offset", intval($offset), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $rows]);
    }

    // Patient: request a new appointment for a date (no time)
    public function request($data)
    {
        if (empty($data['patient_id']) || empty($data['appointment_date'])) {
            echo json_encode(["success" => false, "message" => "patient_id and appointment_date are required."]); return;
        }
        $date = $data['appointment_date'];

        // Enforce max 15 per day (excluding Cancelled)
        $cancelledId = $this->getAppointmentStatusId('Cancelled');
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_appointments WHERE appointment_date = :d " . ($cancelledId ? "AND status_id <> :cancelled" : ""));
        $stmt->bindParam(":d", $date);
        if ($cancelledId) { $stmt->bindParam(":cancelled", $cancelledId); }
        $stmt->execute();
        $count = intval($stmt->fetchColumn());
        if ($count >= 15) {
            echo json_encode(["success" => false, "message" => "Fully Booked"]); return;
        }

        $pendingId = $this->getAppointmentStatusId('Pending');
        if (!$pendingId) { echo json_encode(["success" => false, "message" => "Pending status not configured."]); return; }

        $stmt = $this->conn->prepare("INSERT INTO tbl_appointments (patient_id, appointment_date, status_id) VALUES (:pid, :d, :sid)");
        $stmt->bindParam(":pid", $data['patient_id']);
        $stmt->bindParam(":d", $date);
        $stmt->bindParam(":sid", $pendingId);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Appointment request submitted."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to request appointment."]);
        }
    }

    // Secretary: approve (assign doctor, queue number, set status Confirmed)
    public function approve($data)
    {
        if (empty($data['appointment_id']) || empty($data['doctor_id']) || empty($data['queue_number'])) {
            echo json_encode(["success" => false, "message" => "appointment_id, doctor_id, queue_number are required."]); return;
        }

        // Ensure queue number is unique per date
        $stmt = $this->conn->prepare("SELECT appointment_date FROM tbl_appointments WHERE appointment_id = :aid LIMIT 1");
        $stmt->bindParam(":aid", $data['appointment_id']);
        $stmt->execute();
        $date = $stmt->fetchColumn();
        if (!$date) { echo json_encode(["success" => false, "message" => "Appointment not found."]); return; }

        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_appointments WHERE appointment_date = :d AND queue_number = :q AND appointment_id <> :aid");
        $stmt->bindParam(":d", $date);
        $stmt->bindParam(":q", $data['queue_number']);
        $stmt->bindParam(":aid", $data['appointment_id']);
        $stmt->execute();
        if (intval($stmt->fetchColumn()) > 0) {
            echo json_encode(["success" => false, "message" => "Queue number already used for this date."]); return;
        }

        $confirmedId = $this->getAppointmentStatusId('Confirmed');
        if (!$confirmedId) { echo json_encode(["success" => false, "message" => "Confirmed status not configured."]); return; }

        $stmt = $this->conn->prepare("UPDATE tbl_appointments SET doctor_id = :doc, queue_number = :q, status_id = :sid WHERE appointment_id = :aid");
        $stmt->bindParam(":doc", $data['doctor_id']);
        $stmt->bindParam(":q", $data['queue_number']);
        $stmt->bindParam(":sid", $confirmedId);
        $stmt->bindParam(":aid", $data['appointment_id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Appointment approved."]);
        } else {
            echo json_encode(["success" => false, "message" => "Approval failed."]);
        }
    }

    // Update appointment status (Completed/Cancelled/etc.)
    public function set_status($data)
    {
        if (empty($data['appointment_id']) || empty($data['status_name'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and status_name are required."]); return;
        }
        $statusId = $this->getAppointmentStatusId($data['status_name']);
        if (!$statusId) { echo json_encode(["success" => false, "message" => "Invalid status_name."]); return; }
        $stmt = $this->conn->prepare("UPDATE tbl_appointments SET status_id = :sid WHERE appointment_id = :aid");
        $stmt->bindParam(":sid", $statusId);
        $stmt->bindParam(":aid", $data['appointment_id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Status updated."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to update status."]);
        }
    }

    // Doctor: list appointments assigned to doctor
    public function get_by_doctor($doctorId)
    {
        if (empty($doctorId)) { echo json_encode(["success" => false, "message" => "doctor_id required."]); return; }
        $stmt = $this->conn->prepare("
            SELECT a.appointment_id,
                   a.appointment_date,
                   a.queue_number,
                   s.status_name AS appointment_status,
                   u.name AS patient_name,
                   p.patient_id
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.doctor_id = :doc
            ORDER BY a.appointment_date ASC, a.queue_number ASC
        ");
        $stmt->bindParam(":doc", $doctorId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Patient: list appointments for a patient
    public function get_by_patient($patientId)
    {
        if (empty($patientId)) { echo json_encode(["success" => false, "message" => "patient_id required."]); return; }
        $stmt = $this->conn->prepare("
            SELECT a.appointment_id,
                   a.appointment_date,
                   a.queue_number,
                   s.status_name AS appointment_status,
                   du.name AS doctor_name
            FROM tbl_appointments a
            JOIN tbl_status s ON a.status_id = s.status_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            WHERE a.patient_id = :pid
            ORDER BY a.appointment_date DESC, a.queue_number ASC
        ");
        $stmt->bindParam(":pid", $patientId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Utility: list doctors for dropdowns
    public function list_doctors()
    {
        $stmt = $this->conn->prepare("SELECT d.doctor_id, u.name AS doctor_name FROM tbl_doctors d JOIN tbl_users u ON d.user_id = u.user_id ORDER BY u.name ASC");
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new Appointments();

switch ($operation) {
    case 'get_all':
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 50);
        $svc->get_all($page, $limit);
        break;
    case 'get_booked_count':
        $date = $_GET['date'] ?? '';
        $svc->get_booked_count($date);
        break;
    case 'request':
        $data = json_decode($json ?: '{}', true);
        $svc->request($data);
        break;
    case 'approve':
        $data = json_decode($json ?: '{}', true);
        $svc->approve($data);
        break;
    case 'set_status':
        $data = json_decode($json ?: '{}', true);
        $svc->set_status($data);
        break;
    case 'get_by_doctor':
        $doctorId = $_GET['doctor_id'] ?? '';
        $svc->get_by_doctor($doctorId);
        break;
    case 'get_by_patient':
        $patientId = $_GET['patient_id'] ?? '';
        $svc->get_by_patient($patientId);
        break;
    case 'list_doctors':
        $svc->list_doctors();
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>


