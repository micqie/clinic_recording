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

    // Secretary: Set current consultation (who is currently being consulted)
    public function set_current_consultation($data)
    {
        if (empty($data['appointment_id']) || empty($data['secretary_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and secretary_id are required."]);
            return;
        }

        // Get appointment details
        $stmt = $this->conn->prepare("
            SELECT appointment_date, queue_number, patient_id, doctor_id
            FROM tbl_appointments
            WHERE appointment_id = :appointment_id
        ");
        $stmt->bindParam(":appointment_id", $data['appointment_id']);
        $stmt->execute();
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$appointment) {
            echo json_encode(["success" => false, "message" => "Appointment not found."]);
            return;
        }

        // Update appointment status to "In Consultation"
        $inConsultationId = $this->getStatusId('In Consultation');
        if (!$inConsultationId) {
            // Try to find the status without the type filter first
            $stmt = $this->conn->prepare("
                SELECT status_id FROM tbl_status WHERE status_name = :name LIMIT 1
            ");
            $stmt->bindParam(":name", 'In Consultation');
            $stmt->execute();
            $inConsultationId = $stmt->fetchColumn();

            if (!$inConsultationId) {
                echo json_encode(["success" => false, "message" => "In Consultation status not found. Please check if the status exists in the database."]);
                return;
            }
        }

        $this->conn->beginTransaction();
        try {
            // Update appointment status
            $stmt = $this->conn->prepare("
                UPDATE tbl_appointments
                SET status_id = :status_id
                WHERE appointment_id = :appointment_id
            ");
            $stmt->bindParam(":status_id", $inConsultationId);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();

            // Check if tbl_current_queue table exists
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'tbl_current_queue'");
            $stmt->execute();
            $tableExists = $stmt->fetch();

            if ($tableExists) {
                // Update or insert current queue record
                $stmt = $this->conn->prepare("
                    INSERT INTO tbl_current_queue (date, current_appointment_id, last_updated_by)
                    VALUES (:date, :appointment_id, :secretary_id)
                    ON DUPLICATE KEY UPDATE
                    current_appointment_id = :appointment_id,
                    last_updated_by = :secretary_id,
                    last_updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->bindParam(":date", $appointment['appointment_date']);
                $stmt->bindParam(":appointment_id", $data['appointment_id']);
                $stmt->bindParam(":secretary_id", $data['secretary_id']);
                $stmt->execute();
            } else {
                // If table doesn't exist, just log it but don't fail
                error_log("tbl_current_queue table does not exist. Queue tracking will be limited.");
            }

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Current consultation set successfully.",
                "queue_number" => $appointment['queue_number']
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode(["success" => false, "message" => "Failed to set current consultation: " . $e->getMessage()]);
        }
    }

    // Secretary: Complete current consultation and move to next
    public function complete_and_next($data)
    {
        if (empty($data['secretary_id'])) {
            echo json_encode(["success" => false, "message" => "secretary_id is required."]);
            return;
        }

        $date = $data['date'] ?? date('Y-m-d');

        $this->conn->beginTransaction();
        try {
            // Get current queue status
            $stmt = $this->conn->prepare("
                SELECT current_appointment_id
                FROM tbl_current_queue
                WHERE date = :date
            ");
            $stmt->bindParam(":date", $date);
            $stmt->execute();
            $currentQueue = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($currentQueue && $currentQueue['current_appointment_id']) {
                // Complete current consultation
                $completedId = $this->getStatusId('Completed');
                if (!$completedId) {
                    echo json_encode(["success" => false, "message" => "Completed status not configured."]);
                    return;
                }

                $stmt = $this->conn->prepare("
                    UPDATE tbl_appointments
                    SET status_id = :status_id
                    WHERE appointment_id = :appointment_id
                ");
                $stmt->bindParam(":status_id", $completedId);
                $stmt->bindParam(":appointment_id", $currentQueue['current_appointment_id']);
                $stmt->execute();
            }

            // Find next appointment in queue
            $stmt = $this->conn->prepare("
                SELECT appointment_id, queue_number
                FROM tbl_appointments
                WHERE appointment_date = :date
                AND status_id = :confirmed_status
                ORDER BY queue_number ASC
                LIMIT 1
            ");
            $confirmedId = $this->getStatusId('Confirmed');
            $stmt->bindParam(":date", $date);
            $stmt->bindParam(":confirmed_status", $confirmedId);
            $stmt->execute();
            $nextAppointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($nextAppointment) {
                // Set next appointment as current
                $inConsultationId = $this->getStatusId('In Consultation');
                $stmt = $this->conn->prepare("
                    UPDATE tbl_appointments
                    SET status_id = :status_id
                    WHERE appointment_id = :appointment_id
                ");
                $stmt->bindParam(":status_id", $inConsultationId);
                $stmt->bindParam(":appointment_id", $nextAppointment['appointment_id']);
                $stmt->execute();

                // Update current queue
                $stmt = $this->conn->prepare("
                    INSERT INTO tbl_current_queue (date, current_appointment_id, last_updated_by)
                    VALUES (:date, :appointment_id, :secretary_id)
                    ON DUPLICATE KEY UPDATE
                    current_appointment_id = :appointment_id,
                    last_updated_by = :secretary_id,
                    last_updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->bindParam(":date", $date);
                $stmt->bindParam(":appointment_id", $nextAppointment['appointment_id']);
                $stmt->bindParam(":secretary_id", $data['secretary_id']);
                $stmt->execute();

                $this->conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "Moved to next patient in queue.",
                    "next_queue_number" => $nextAppointment['queue_number']
                ]);
            } else {
                // No more patients in queue
                $stmt = $this->conn->prepare("
                    UPDATE tbl_current_queue
                    SET current_appointment_id = NULL,
                        last_updated_by = :secretary_id,
                        last_updated_at = CURRENT_TIMESTAMP
                    WHERE date = :date
                ");
                $stmt->bindParam(":secretary_id", $data['secretary_id']);
                $stmt->bindParam(":date", $date);
                $stmt->execute();

                $this->conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "All consultations completed for today."
                ]);
            }
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode(["success" => false, "message" => "Failed to complete and move to next: " . $e->getMessage()]);
        }
    }

    // Get enhanced queue status with current consultation info
    public function get_enhanced_queue_status($date = null)
    {
        if (!$date) {
            $date = date('Y-m-d');
        }

        // Get current queue status
        $stmt = $this->conn->prepare("
            SELECT
                cq.current_appointment_id,
                cq.last_updated_at,
                u.name AS updated_by_name
            FROM tbl_current_queue cq
            LEFT JOIN tbl_users u ON cq.last_updated_by = u.user_id
            WHERE cq.date = :date
        ");
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $currentQueue = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get all appointments for the date
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
                sp.name AS specialization_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_date = :date
            AND s.status_name IN ('Confirmed', 'Ready for Doctor', 'With Doctor', 'In Consultation', 'Completed')
            ORDER BY a.queue_number ASC
        ");
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Find current consultation and next in queue
        $currentConsultation = null;
        $nextInQueue = null;
        $completedCount = 0;
        $confirmedCount = 0;

        foreach ($appointments as $apt) {
            if ($apt['appointment_status'] === 'In Consultation' || $apt['appointment_status'] === 'With Doctor') {
                $currentConsultation = $apt;
            } elseif ($apt['appointment_status'] === 'Completed') {
                $completedCount++;
            } elseif ($apt['appointment_status'] === 'Ready for Doctor' || $apt['appointment_status'] === 'Confirmed') {
                $confirmedCount++;
                // Prefer Ready for Doctor over Confirmed when choosing next
                if (!$nextInQueue || ($apt['appointment_status'] === 'Ready for Doctor' && $nextInQueue['appointment_status'] !== 'Ready for Doctor')) {
                    $nextInQueue = $apt;
                }
            }
        }

        echo json_encode([
            "success" => true,
            "date" => $date,
            "current_consultation" => $currentConsultation,
            "next_in_queue" => $nextInQueue,
            "completed_count" => $completedCount,
            "confirmed_count" => $confirmedCount,
            "all_appointments" => $appointments,
            "queue_updated_by" => $currentQueue ? $currentQueue['updated_by_name'] : null,
            "queue_updated_at" => $currentQueue ? $currentQueue['last_updated_at'] : null
        ]);
    }

    // Get doctor-specific queue status
    public function get_doctor_queue_status($doctorId, $date = null)
    {
        if (!$date) {
            $date = date('Y-m-d');
        }

        if (!$doctorId) {
            echo json_encode(["success" => false, "message" => "doctor_id is required."]);
            return;
        }

        // Get current queue status
        $stmt = $this->conn->prepare("
            SELECT
                cq.current_appointment_id,
                cq.last_updated_at,
                u.name AS updated_by_name
            FROM tbl_current_queue cq
            LEFT JOIN tbl_users u ON cq.last_updated_by = u.user_id
            WHERE cq.date = :date
        ");
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $currentQueue = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get appointments for the specific doctor on the date
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
                sp.name AS specialization_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_date = :date
            AND a.doctor_id = :doctor_id
            AND s.status_name IN ('Confirmed', 'Ready for Doctor', 'With Doctor', 'In Consultation', 'Completed')
            ORDER BY a.queue_number ASC
        ");
        $stmt->bindParam(":date", $date);
        $stmt->bindParam(":doctor_id", $doctorId);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Find current consultation and next in queue for this doctor
        $currentConsultation = null;
        $nextInQueue = null;
        $completedCount = 0;
        $confirmedCount = 0;

        foreach ($appointments as $apt) {
            if ($apt['appointment_status'] === 'In Consultation' || $apt['appointment_status'] === 'With Doctor') {
                $currentConsultation = $apt;
            } elseif ($apt['appointment_status'] === 'Completed') {
                $completedCount++;
            } elseif ($apt['appointment_status'] === 'Ready for Doctor' || $apt['appointment_status'] === 'Confirmed') {
                $confirmedCount++;
                if (!$nextInQueue || ($apt['appointment_status'] === 'Ready for Doctor' && $nextInQueue['appointment_status'] !== 'Ready for Doctor')) {
                    $nextInQueue = $apt;
                }
            }
        }

        echo json_encode([
            "success" => true,
            "date" => $date,
            "doctor_id" => $doctorId,
            "current_consultation" => $currentConsultation,
            "next_in_queue" => $nextInQueue,
            "completed_count" => $completedCount,
            "confirmed_count" => $confirmedCount,
            "all_appointments" => $appointments,
            "queue_updated_by" => $currentQueue ? $currentQueue['updated_by_name'] : null,
            "queue_updated_at" => $currentQueue ? $currentQueue['last_updated_at'] : null
        ]);
    }

    // Doctor availability management
    public function set_doctor_availability($data)
    {
        if (empty($data['doctor_id']) || !isset($data['is_available']) || empty($data['date'])) {
            echo json_encode(["success" => false, "message" => "doctor_id, is_available, and date are required."]);
            return;
        }

        $stmt = $this->conn->prepare("
            INSERT INTO tbl_doctor_availability (doctor_id, date, is_available, reason, created_by)
            VALUES (:doctor_id, :date, :is_available, :reason, :created_by)
            ON DUPLICATE KEY UPDATE
            is_available = :is_available,
            reason = :reason,
            created_by = :created_by,
            updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->bindParam(":doctor_id", $data['doctor_id']);
        $stmt->bindParam(":date", $data['date']);
        $stmt->bindParam(":is_available", $data['is_available']);
        $stmt->bindParam(":reason", $data['reason']);
        $stmt->bindParam(":created_by", $data['created_by']);

        if ($stmt->execute()) {
            $status = $data['is_available'] ? 'available' : 'unavailable';
            echo json_encode(["success" => true, "message" => "Doctor marked as {$status} for {$data['date']}."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to update doctor availability."]);
        }
    }

    // Get doctor availability for a date range
    public function get_doctor_availability($doctorId, $startDate, $endDate)
    {
        $stmt = $this->conn->prepare("
            SELECT date, is_available, reason, created_at
            FROM tbl_doctor_availability
            WHERE doctor_id = :doctor_id
            AND date BETWEEN :start_date AND :end_date
            ORDER BY date ASC
        ");
        $stmt->bindParam(":doctor_id", $doctorId);
        $stmt->bindParam(":start_date", $startDate);
        $stmt->bindParam(":end_date", $endDate);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    // Get available doctors for a specific date
    public function get_available_doctors($date)
    {
        $stmt = $this->conn->prepare("
            SELECT
                d.doctor_id,
                u.name AS doctor_name,
                s.name AS specialization_name
            FROM tbl_doctors d
            JOIN tbl_users u ON d.user_id = u.user_id
            LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
            WHERE d.doctor_id NOT IN (
                SELECT doctor_id
                FROM tbl_doctor_availability
                WHERE date = :date AND is_available = 0
            )
            ORDER BY u.name ASC
        ");
        $stmt->bindParam(":date", $date);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    // Get availability list with filters
    public function get_availability_list($doctorId = null, $date = null, $isAvailable = null)
    {
        $whereConditions = [];
        $params = [];

        if ($doctorId) {
            $whereConditions[] = "da.doctor_id = :doctor_id";
            $params[':doctor_id'] = $doctorId;
        }

        if ($date) {
            $whereConditions[] = "da.date = :date";
            $params[':date'] = $date;
        }

        if ($isAvailable !== null) {
            $whereConditions[] = "da.is_available = :is_available";
            $params[':is_available'] = $isAvailable;
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

        $stmt = $this->conn->prepare("
            SELECT
                da.availability_id,
                da.doctor_id,
                da.date,
                da.is_available,
                da.reason,
                da.created_at,
                u.name AS doctor_name,
                s.name AS specialization_name,
                cu.name AS created_by_name
            FROM tbl_doctor_availability da
            JOIN tbl_doctors d ON da.doctor_id = d.doctor_id
            JOIN tbl_users u ON d.user_id = u.user_id
            LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
            LEFT JOIN tbl_users cu ON da.created_by = cu.user_id
            {$whereClause}
            ORDER BY da.date DESC, u.name ASC
        ");

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    // Delete doctor availability
    public function delete_doctor_availability($data)
    {
        if (empty($data['availability_id'])) {
            echo json_encode(["success" => false, "message" => "availability_id is required."]);
            return;
        }

        $stmt = $this->conn->prepare("
            DELETE FROM tbl_doctor_availability
            WHERE availability_id = :availability_id
        ");
        $stmt->bindParam(":availability_id", $data['availability_id']);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Availability setting deleted successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to delete availability setting."]);
        }
    }

    // Helper to get status ID by status name
    private function getStatusId($statusName)
    {
        // First try to find the status with type 1 (Appointment)
        $stmt = $this->conn->prepare("
            SELECT s.status_id
            FROM tbl_status s
            JOIN tbl_status_type t ON s.status_type_id = t.status_type_id
            WHERE t.status_type_name = 'Appointment'
            AND s.status_name = :name
            LIMIT 1
        ");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $statusId = $stmt->fetchColumn();

        if (!$statusId) {
            // If not found, try to find the status without the type filter
            $stmt = $this->conn->prepare("
                SELECT status_id FROM tbl_status WHERE status_name = :name LIMIT 1
            ");
            $stmt->bindParam(":name", $statusName);
            $stmt->execute();
            $statusId = $stmt->fetchColumn();
        }

        return $statusId;
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

// Debug logging
error_log("=== Enhanced Queue Management API Debug ===");
error_log("Enhanced Queue Management API called");
error_log("Operation received: " . $operation);
error_log("JSON received: " . $json);
error_log("POST data: " . print_r($_POST, true));
error_log("GET data: " . print_r($_GET, true));
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("Raw input: " . file_get_contents('php://input'));
error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
error_log("All server variables: " . print_r($_SERVER, true));

// Check if operation is empty
if (empty($operation)) {
    error_log("ERROR: No operation specified");
    echo json_encode([
        "success" => false,
        "message" => "No operation specified. Please provide an operation parameter.",
        "debug" => [
            "post_data" => $_POST,
            "get_data" => $_GET,
            "method" => $_SERVER['REQUEST_METHOD']
        ]
    ]);
    exit;
}

$svc = new EnhancedQueueManagement();

switch ($operation) {
    case 'set_current_consultation':
        error_log("Processing set_current_consultation");
        $data = json_decode($json ?: '{}', true);
        $svc->set_current_consultation($data);
        break;
    case 'complete_and_next':
        error_log("Processing complete_and_next");
        $data = json_decode($json ?: '{}', true);
        $svc->complete_and_next($data);
        break;
    case 'get_enhanced_queue_status':
        error_log("Processing get_enhanced_queue_status");
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_enhanced_queue_status($date);
        break;
    case 'get_doctor_queue_status':
        error_log("Processing get_doctor_queue_status");
        $doctorId = $_GET['doctor_id'] ?? '';
        $date = $_GET['date'] ?? date('Y-m-d');
        if (!$doctorId) {
            echo json_encode(["success" => false, "message" => "doctor_id is required."]);
            break;
        }
        $svc->get_doctor_queue_status($doctorId, $date);
        break;
    case 'set_doctor_availability':
        error_log("Processing set_doctor_availability");
        $data = json_decode($json ?: '{}', true);
        $svc->set_doctor_availability($data);
        break;
    case 'get_doctor_availability':
        error_log("Processing get_doctor_availability");
        $doctorId = $_GET['doctor_id'] ?? '';
        $startDate = $_GET['start_date'] ?? '';
        $endDate = $_GET['end_date'] ?? '';
        if (!$doctorId || !$startDate || !$endDate) {
            echo json_encode(["success" => false, "message" => "doctor_id, start_date, and end_date are required."]);
            break;
        }
        $svc->get_doctor_availability($doctorId, $startDate, $endDate);
        break;
    case 'get_available_doctors':
        error_log("Processing get_available_doctors");
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_available_doctors($date);
        break;
    case 'get_availability_list':
        error_log("Processing get_availability_list");
        $doctorId = $_GET['doctor_id'] ?? null;
        $date = $_GET['date'] ?? null;
        $isAvailable = $_GET['is_available'] ?? null;
        $svc->get_availability_list($doctorId, $date, $isAvailable);
        break;
    case 'delete_doctor_availability':
        error_log("Processing delete_doctor_availability");
        $data = json_decode($json ?: '{}', true);
        $svc->delete_doctor_availability($data);
        break;
    default:
        error_log("Invalid operation received: " . $operation);
        echo json_encode(["success" => false, "message" => "Invalid operation: " . $operation]);
        break;
}
?>
