<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class QueueManagement
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Get current queue status for a specific date
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
                sp.name AS specialization_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_date = :date
            AND s.status_name IN ('Confirmed', 'In Consultation', 'Completed')
            ORDER BY a.queue_number ASC
        ");

        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Find current consultation (In Consultation status)
        $currentConsultation = null;
        $nextInQueue = null;
        $completedCount = 0;

        foreach ($appointments as $apt) {
            if ($apt['appointment_status'] === 'In Consultation') {
                $currentConsultation = $apt;
            } elseif ($apt['appointment_status'] === 'Completed') {
                $completedCount++;
            } elseif ($apt['appointment_status'] === 'Confirmed' && !$nextInQueue) {
                $nextInQueue = $apt;
            }
        }

        echo json_encode([
            "success" => true,
            "date" => $date,
            "current_consultation" => $currentConsultation,
            "next_in_queue" => $nextInQueue,
            "completed_count" => $completedCount,
            "all_appointments" => $appointments
        ]);
    }

    // Get queue status for a specific doctor on a specific date
    public function get_doctor_queue_status($doctorId, $date = null)
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
                u.name AS patient_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.doctor_id = :doctor_id
            AND a.appointment_date = :date
            AND s.status_name IN ('Confirmed', 'In Consultation', 'Completed')
            ORDER BY a.queue_number ASC
        ");

        $stmt->bindParam(":doctor_id", $doctorId);
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Find current consultation and next in queue
        $currentConsultation = null;
        $nextInQueue = null;

        foreach ($appointments as $apt) {
            if ($apt['appointment_status'] === 'In Consultation') {
                $currentConsultation = $apt;
            } elseif ($apt['appointment_status'] === 'Confirmed' && !$nextInQueue) {
                $nextInQueue = $apt;
            }
        }

        echo json_encode([
            "success" => true,
            "doctor_id" => $doctorId,
            "date" => $date,
            "current_consultation" => $currentConsultation,
            "next_in_queue" => $nextInQueue,
            "all_appointments" => $appointments
        ]);
    }

    // Start consultation (change status to "In Consultation")
    public function start_consultation($appointmentId, $doctorId)
    {
        $inConsultationId = $this->getStatusId('In Consultation');
        if (!$inConsultationId) {
            echo json_encode(["success" => false, "message" => "In Consultation status not configured."]);
            return;
        }

        // Validate that the appointment belongs to the doctor and is Confirmed
        $check = $this->conn->prepare("
            SELECT a.appointment_id
            FROM tbl_appointments a
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_id = :appointment_id
              AND a.doctor_id = :doctor_id
              AND s.status_name = 'Confirmed'
            LIMIT 1
        ");
        $check->bindParam(":appointment_id", $appointmentId);
        $check->bindParam(":doctor_id", $doctorId);
        $check->execute();
        if (!$check->fetch()) {
            echo json_encode(["success" => false, "message" => "You are not allowed to start this consultation or it is not in Confirmed status."]);
            return;
        }

        $stmt = $this->conn->prepare("
            UPDATE tbl_appointments
            SET status_id = :status_id
            WHERE appointment_id = :appointment_id AND doctor_id = :doctor_id
        ");

        $stmt->bindParam(":status_id", $inConsultationId);
        $stmt->bindParam(":appointment_id", $appointmentId);
        $stmt->bindParam(":doctor_id", $doctorId);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Consultation started."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to start consultation."]);
        }
    }

    // Complete consultation (change status to "Completed")
    public function complete_consultation($appointmentId, $doctorId)
    {
        $completedId = $this->getStatusId('Completed');
        if (!$completedId) {
            echo json_encode(["success" => false, "message" => "Completed status not configured."]);
            return;
        }

        // Validate that the appointment belongs to the doctor and is In Consultation
        $check = $this->conn->prepare("
            SELECT a.appointment_id
            FROM tbl_appointments a
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_id = :appointment_id
              AND a.doctor_id = :doctor_id
              AND s.status_name = 'In Consultation'
            LIMIT 1
        ");
        $check->bindParam(":appointment_id", $appointmentId);
        $check->bindParam(":doctor_id", $doctorId);
        $check->execute();
        if (!$check->fetch()) {
            echo json_encode(["success" => false, "message" => "You are not allowed to complete this consultation or it is not In Consultation."]);
            return;
        }

        $stmt = $this->conn->prepare("
            UPDATE tbl_appointments
            SET status_id = :status_id
            WHERE appointment_id = :appointment_id AND doctor_id = :doctor_id
        ");

        $stmt->bindParam(":status_id", $completedId);
        $stmt->bindParam(":appointment_id", $appointmentId);
        $stmt->bindParam(":doctor_id", $doctorId);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Consultation completed."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to complete consultation."]);
        }
    }

    // Get patient's queue information
    public function get_patient_queue_info($patientId, $date = null)
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
                d.doctor_id,
                du.name AS doctor_name,
                sp.name AS specialization_name
            FROM tbl_appointments a
            JOIN tbl_status s ON a.status_id = s.status_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            WHERE a.patient_id = :patient_id
            AND a.appointment_date = :date
            AND s.status_name IN ('Confirmed', 'In Consultation')
            ORDER BY a.queue_number ASC
            LIMIT 1
        ");

        $stmt->bindParam(":patient_id", $patientId);
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$appointment) {
            echo json_encode(["success" => false, "message" => "No appointment found for today."]);
            return;
        }

        // Get current consultation info
        $currentStmt = $this->conn->prepare("
            SELECT
                a.queue_number,
                u.name AS patient_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_date = :date
            AND s.status_name = 'In Consultation'
            LIMIT 1
        ");

        $currentStmt->bindParam(":date", $date);
        $currentStmt->execute();
        $currentConsultation = $currentStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "patient_appointment" => $appointment,
            "current_consultation" => $currentConsultation,
            "estimated_wait_time" => $this->calculateEstimatedWaitTime($appointment['queue_number'], $currentConsultation ? $currentConsultation['queue_number'] : 0)
        ]);
    }

    // Calculate estimated wait time (rough estimate: 15 minutes per patient)
    private function calculateEstimatedWaitTime($patientQueue, $currentQueue)
    {
        if (!$patientQueue || !$currentQueue) {
            return "Unknown";
        }

        $patientsAhead = $patientQueue - $currentQueue;
        if ($patientsAhead <= 0) {
            return "Your turn now";
        }

        $estimatedMinutes = $patientsAhead * 15;
        if ($estimatedMinutes < 60) {
            return "~{$estimatedMinutes} minutes";
        } else {
            $hours = floor($estimatedMinutes / 60);
            $minutes = $estimatedMinutes % 60;
            return "~{$hours}h {$minutes}m";
        }
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

$svc = new QueueManagement();

switch ($operation) {
    case 'get_current_queue_status':
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_current_queue_status($date);
        break;
    case 'get_doctor_queue_status':
        $doctorId = $_GET['doctor_id'] ?? '';
        $date = $_GET['date'] ?? date('Y-m-d');
        if (!$doctorId) {
            echo json_encode(["success" => false, "message" => "doctor_id is required."]);
            break;
        }
        $svc->get_doctor_queue_status($doctorId, $date);
        break;
    case 'start_consultation':
        $data = json_decode($json ?: '{}', true);
        if (empty($data['appointment_id']) || empty($data['doctor_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and doctor_id are required."]);
            break;
        }
        $svc->start_consultation($data['appointment_id'], $data['doctor_id']);
        break;
    case 'complete_consultation':
        $data = json_decode($json ?: '{}', true);
        if (empty($data['appointment_id']) || empty($data['doctor_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and doctor_id are required."]);
            break;
        }
        $svc->complete_consultation($data['appointment_id'], $data['doctor_id']);
        break;
    case 'get_patient_queue_info':
        $patientId = $_GET['patient_id'] ?? '';
        $date = $_GET['date'] ?? date('Y-m-d');
        if (!$patientId) {
            echo json_encode(["success" => false, "message" => "patient_id is required."]);
            break;
        }
        $svc->get_patient_queue_info($patientId, $date);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>
