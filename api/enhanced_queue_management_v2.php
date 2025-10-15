<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class EnhancedQueueManagement
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Get current queue status for a specific date with Nurse workflow
    public function get_current_queue_status($date = null)
    {
        if (!$date) {
            $date = date('Y-m-d');
        }

        $stmt = $this->conn->prepare("
            SELECT
                a.appointment_id,
                a.queue_number,
                a.status_id,
                s.status_name AS appointment_status,
                p.patient_id,
                u.name AS patient_name,
                d.doctor_id,
                du.name AS doctor_name,
                n.nurse_id,
                nu.name AS nurse_name,
                sp.name AS specialization_name,
                nq.status AS nurse_queue_status,
                dq.status AS doctor_queue_status
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_nurses n ON a.nurse_id = n.nurse_id
            LEFT JOIN tbl_users nu ON n.user_id = nu.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            JOIN tbl_status s ON a.status_id = s.status_id
            LEFT JOIN tbl_nurse_queue nq ON a.appointment_id = nq.appointment_id
            LEFT JOIN tbl_doctor_queue dq ON a.appointment_id = dq.appointment_id
            WHERE a.appointment_date = :date
            AND s.status_name IN ('Confirmed', 'Ready for Nurse', 'With Nurse', 'Ready for Doctor', 'With Doctor', 'Completed')
            ORDER BY a.queue_number ASC
        ");

        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Organize queue by status
        $nurseQueue = [];
        $doctorQueue = [];
        $completed = [];

        foreach ($appointments as $apt) {
            switch ($apt['appointment_status']) {
                case 'Confirmed':
                case 'Ready for Nurse':
                    $nurseQueue[] = $apt;
                    break;
                case 'With Nurse':
                    $nurseQueue[] = $apt;
                    break;
                case 'Ready for Doctor':
                case 'With Doctor':
                    $doctorQueue[] = $apt;
                    break;
                case 'Completed':
                    $completed[] = $apt;
                    break;
            }
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "nurse_queue" => $nurseQueue,
                "doctor_queue" => $doctorQueue,
                "completed" => $completed,
                "date" => $date
            ]
        ]);
    }

    // Assign patient to nurse queue
    public function assign_to_nurse($data)
    {
        if (empty($data['appointment_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id is required."]);
            return;
        }

        $this->conn->beginTransaction();
        try {
            // Auto-select first active nurse if nurse_id not provided
            if (empty($data['nurse_id'])) {
                $pick = $this->conn->prepare("SELECT n.nurse_id FROM tbl_nurses n JOIN tbl_users u ON n.user_id = u.user_id WHERE u.is_active = 1 ORDER BY n.nurse_id ASC LIMIT 1");
                $pick->execute();
                $auto = $pick->fetch(PDO::FETCH_ASSOC);
                if (!$auto) {
                    throw new Exception('No nurse available');
                }
                $data['nurse_id'] = $auto['nurse_id'];
            }
            // Update appointment status to "Ready for Nurse"
            $readyForNurseId = $this->getStatusId('Ready for Nurse');
            $stmt = $this->conn->prepare("
                UPDATE tbl_appointments
                SET status_id = :status_id, nurse_id = :nurse_id
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":status_id", $readyForNurseId);
            $stmt->bindParam(":nurse_id", $data['nurse_id']);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Insert into nurse queue
            $stmt = $this->conn->prepare("
                INSERT INTO tbl_nurse_queue (appointment_id, nurse_id, status)
                VALUES (:appointment_id, :nurse_id, 'Waiting')
                ON DUPLICATE KEY UPDATE
                nurse_id = :nurse_id,
                status = 'Waiting',
                assigned_at = CURRENT_TIMESTAMP
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->bindParam(":nurse_id", $data['nurse_id']);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Patient assigned to nurse successfully."
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode([
                "success" => false,
                "message" => "Failed to assign patient to nurse: " . $e->getMessage()
            ]);
        }
    }

    // Start nurse consultation
    public function start_nurse_consultation($data)
    {
        if (empty($data['appointment_id']) || empty($data['nurse_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and nurse_id are required."]);
            return;
        }

        $this->conn->beginTransaction();
        try {
            // Update appointment status to "With Nurse"
            $withNurseId = $this->getStatusId('With Nurse');
            $stmt = $this->conn->prepare("
                UPDATE tbl_appointments
                SET status_id = :status_id
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":status_id", $withNurseId);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Update nurse queue status
            $stmt = $this->conn->prepare("
                UPDATE tbl_nurse_queue
                SET status = 'In Progress', started_at = NOW()
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Nurse consultation started successfully."
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode([
                "success" => false,
                "message" => "Failed to start nurse consultation: " . $e->getMessage()
            ]);
        }
    }

    // Complete nurse consultation and move to doctor queue
    public function complete_nurse_consultation($data)
    {
        if (empty($data['appointment_id']) || empty($data['nurse_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and nurse_id are required."]);
            return;
        }

        $this->conn->beginTransaction();
        try {
            // Get appointment details
            $stmt = $this->conn->prepare("
                SELECT a.doctor_id, a.patient_id
                FROM tbl_appointments a
                WHERE a.appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$appointment) {
                throw new Exception("Appointment not found");
            }

            // Update appointment status to "Ready for Doctor"
            $readyForDoctorId = $this->getStatusId('Ready for Doctor');
            $stmt = $this->conn->prepare("
                UPDATE tbl_appointments
                SET status_id = :status_id
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":status_id", $readyForDoctorId);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Update nurse queue status
            $stmt = $this->conn->prepare("
                UPDATE tbl_nurse_queue
                SET status = 'Completed', completed_at = NOW()
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Insert into doctor queue
            $stmt = $this->conn->prepare("
                INSERT INTO tbl_doctor_queue (appointment_id, doctor_id, status)
                VALUES (:appointment_id, :doctor_id, 'Waiting')
                ON DUPLICATE KEY UPDATE
                doctor_id = :doctor_id,
                status = 'Waiting',
                assigned_at = CURRENT_TIMESTAMP
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->bindParam(":doctor_id", $appointment['doctor_id']);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Nurse consultation completed. Patient moved to doctor queue."
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode([
                "success" => false,
                "message" => "Failed to complete nurse consultation: " . $e->getMessage()
            ]);
        }
    }

    // Start doctor consultation
    public function start_doctor_consultation($data)
    {
        if (empty($data['appointment_id']) || empty($data['doctor_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and doctor_id are required."]);
            return;
        }

        $this->conn->beginTransaction();
        try {
            // Update appointment status to "With Doctor"
            $withDoctorId = $this->getStatusId('With Doctor');
            $stmt = $this->conn->prepare("
                UPDATE tbl_appointments
                SET status_id = :status_id
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":status_id", $withDoctorId);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Update doctor queue status
            $stmt = $this->conn->prepare("
                UPDATE tbl_doctor_queue
                SET status = 'In Progress', started_at = NOW()
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Doctor consultation started successfully."
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode([
                "success" => false,
                "message" => "Failed to start doctor consultation: " . $e->getMessage()
            ]);
        }
    }

    // Complete doctor consultation
    public function complete_doctor_consultation($data)
    {
        if (empty($data['appointment_id']) || empty($data['doctor_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and doctor_id are required."]);
            return;
        }

        $this->conn->beginTransaction();
        try {
            // Update appointment status to "Completed"
            $completedId = $this->getStatusId('Completed');
            $stmt = $this->conn->prepare("
                UPDATE tbl_appointments
                SET status_id = :status_id
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":status_id", $completedId);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Update doctor queue status
            $stmt = $this->conn->prepare("
                UPDATE tbl_doctor_queue
                SET status = 'Completed', completed_at = NOW()
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Doctor consultation completed successfully."
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode([
                "success" => false,
                "message" => "Failed to complete doctor consultation: " . $e->getMessage()
            ]);
        }
    }

    // Get nurse queue status
    public function get_nurse_queue_status($nurseId = null, $date = null)
    {
        if (!$date) {
            $date = date('Y-m-d');
        }

        $whereClause = "WHERE a.appointment_date = :date";
        $params = [":date" => $date];

        if ($nurseId) {
            $whereClause .= " AND n.nurse_id = :nurse_id";
            $params[":nurse_id"] = $nurseId;
        }

        $stmt = $this->conn->prepare("
            SELECT
                a.appointment_id,
                a.queue_number,
                a.status_id,
                s.status_name AS appointment_status,
                p.patient_id,
                u.name AS patient_name,
                n.nurse_id,
                nu.name AS nurse_name,
                nq.status AS queue_status,
                nq.assigned_at,
                nq.started_at,
                nq.completed_at
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_nurses n ON a.nurse_id = n.nurse_id
            LEFT JOIN tbl_users nu ON n.user_id = nu.user_id
            JOIN tbl_status s ON a.status_id = s.status_id
            LEFT JOIN tbl_nurse_queue nq ON a.appointment_id = nq.appointment_id
            {$whereClause}
            AND s.status_name IN ('Ready for Nurse', 'With Nurse', 'Ready for Doctor')
            ORDER BY a.queue_number ASC
        ");

        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $value);
        }
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $appointments,
            "date" => $date
        ]);
    }

    // Get doctor queue status
    public function get_doctor_queue_status($doctorId = null, $date = null)
    {
        if (!$date) {
            $date = date('Y-m-d');
        }

        $whereClause = "WHERE a.appointment_date = :date";
        $params = [":date" => $date];

        if ($doctorId) {
            $whereClause .= " AND d.doctor_id = :doctor_id";
            $params[":doctor_id"] = $doctorId;
        }

        $stmt = $this->conn->prepare("
            SELECT
                a.appointment_id,
                a.queue_number,
                a.status_id,
                s.status_name AS appointment_status,
                p.patient_id,
                u.name AS patient_name,
                d.doctor_id,
                du.name AS doctor_name,
                sp.name AS specialization_name,
                dq.status AS queue_status,
                dq.assigned_at,
                dq.started_at,
                dq.completed_at
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            JOIN tbl_status s ON a.status_id = s.status_id
            LEFT JOIN tbl_doctor_queue dq ON a.appointment_id = dq.appointment_id
            {$whereClause}
            AND s.status_name IN ('Ready for Doctor', 'With Doctor', 'Completed')
            ORDER BY a.queue_number ASC
        ");

        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $value);
        }
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $appointments,
            "date" => $date
        ]);
    }

    // Helper to get status ID by status name
    private function getStatusId($statusName)
    {
        $stmt = $this->conn->prepare("
            SELECT s.status_id
            FROM tbl_status s
            JOIN tbl_status_type t ON s.status_type_id = t.status_type_id
            WHERE t.status_type_name = 'Appointment' AND s.status_name = :name
            LIMIT 1
        ");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new EnhancedQueueManagement();

switch ($operation) {
    case 'get_current_queue_status':
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_current_queue_status($date);
        break;
    case 'assign_to_nurse':
        $data = json_decode($json ?: '{}', true);
        $svc->assign_to_nurse($data);
        break;
    case 'start_nurse_consultation':
        $data = json_decode($json ?: '{}', true);
        $svc->start_nurse_consultation($data);
        break;
    case 'complete_nurse_consultation':
        $data = json_decode($json ?: '{}', true);
        $svc->complete_nurse_consultation($data);
        break;
    case 'start_doctor_consultation':
        $data = json_decode($json ?: '{}', true);
        $svc->start_doctor_consultation($data);
        break;
    case 'complete_doctor_consultation':
        $data = json_decode($json ?: '{}', true);
        $svc->complete_doctor_consultation($data);
        break;
    case 'get_nurse_queue_status':
        $nurseId = $_GET['nurse_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_nurse_queue_status($nurseId, $date);
        break;
    case 'get_doctor_queue_status':
        $doctorId = $_GET['doctor_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_doctor_queue_status($doctorId, $date);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation."]);
        break;
}
?>
