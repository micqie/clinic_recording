<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class IntegratedConsultation
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Create a complete consultation with optional prescriptions and lab requests
    public function create_consultation($data)
    {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            if (empty($data['appointment_id']) || empty($data['doctor_id']) || empty($data['patient_id']) || empty($data['diagnosis'])) {
                throw new Exception("Missing required fields: appointment_id, doctor_id, patient_id, diagnosis");
            }

            // Create consultation
            $consultationStmt = $this->conn->prepare("
                INSERT INTO tbl_consultations (
                    appointment_id, doctor_id, patient_id, diagnosis,
                    consultation_notes, next_appointment_date, next_appointment_notes,
                    consultation_status
                ) VALUES (
                    :appointment_id, :doctor_id, :patient_id, :diagnosis,
                    :consultation_notes, :next_appointment_date, :next_appointment_notes,
                    :consultation_status
                )
            ");

            $consultationStmt->bindParam(":appointment_id", $data['appointment_id']);
            $consultationStmt->bindParam(":doctor_id", $data['doctor_id']);
            $consultationStmt->bindParam(":patient_id", $data['patient_id']);
            $consultationStmt->bindParam(":diagnosis", $data['diagnosis']);
            $consultationStmt->bindParam(":consultation_notes", $data['consultation_notes'] ?? '');
            $consultationStmt->bindParam(":next_appointment_date", $data['next_appointment_date'] ?? null);
            $consultationStmt->bindParam(":next_appointment_notes", $data['next_appointment_notes'] ?? '');
            $consultationStmt->bindParam(":consultation_status", $data['consultation_status'] ?? 'Active');

            if (!$consultationStmt->execute()) {
                throw new Exception("Failed to create consultation");
            }

            $consultationId = $this->conn->lastInsertId();

            // Create prescriptions if provided
            if (!empty($data['prescriptions']) && is_array($data['prescriptions'])) {
                foreach ($data['prescriptions'] as $prescription) {
                    $prescriptionStmt = $this->conn->prepare("
                        INSERT INTO tbl_prescriptions (
                            consultation_id, appointment_id, doctor_id, patient_id,
                            medicine_id, dosage, frequency, duration, instructions, status
                        ) VALUES (
                            :consultation_id, :appointment_id, :doctor_id, :patient_id,
                            :medicine_id, :dosage, :frequency, :duration, :instructions, 'Active'
                        )
                    ");

                    $prescriptionStmt->bindParam(":consultation_id", $consultationId);
                    $prescriptionStmt->bindParam(":appointment_id", $data['appointment_id']);
                    $prescriptionStmt->bindParam(":doctor_id", $data['doctor_id']);
                    $prescriptionStmt->bindParam(":patient_id", $data['patient_id']);
                    $prescriptionStmt->bindParam(":medicine_id", $prescription['medicine_id']);
                    $prescriptionStmt->bindParam(":dosage", $prescription['dosage']);
                    $prescriptionStmt->bindParam(":frequency", $prescription['frequency']);
                    $prescriptionStmt->bindParam(":duration", $prescription['duration']);
                    $prescriptionStmt->bindParam(":instructions", $prescription['instructions'] ?? '');

                    if (!$prescriptionStmt->execute()) {
                        throw new Exception("Failed to create prescription");
                    }
                }
            }

            // Create lab requests if provided
            if (!empty($data['lab_requests']) && is_array($data['lab_requests'])) {
                foreach ($data['lab_requests'] as $labRequest) {
                    $labRequestStmt = $this->conn->prepare("
                        INSERT INTO tbl_lab_requests (
                            doctor_id, patient_id, appointment_id, lab_test_type_id,
                            request_text, status_id
                        ) VALUES (
                            :doctor_id, :patient_id, :appointment_id, :lab_test_type_id,
                            :request_text, :status_id
                        )
                    ");

                    $labRequestStmt->bindParam(":doctor_id", $data['doctor_id']);
                    $labRequestStmt->bindParam(":patient_id", $data['patient_id']);
                    $labRequestStmt->bindParam(":appointment_id", $data['appointment_id']);
                    $labRequestStmt->bindParam(":lab_test_type_id", $labRequest['lab_test_type_id']);
                    $labRequestStmt->bindParam(":request_text", $labRequest['request_text']);
                    $labRequestStmt->bindParam(":status_id", $labRequest['status_id'] ?? 14); // Default to Processing

                    if (!$labRequestStmt->execute()) {
                        throw new Exception("Failed to create lab request");
                    }
                }
            }

            // Update appointment status to completed
            $completedStatusId = $this->getStatusId('Completed');
            if ($completedStatusId) {
                $updateAppointmentStmt = $this->conn->prepare("
                    UPDATE tbl_appointments
                    SET status_id = :status_id
                    WHERE appointment_id = :appointment_id
                ");
                $updateAppointmentStmt->bindParam(":status_id", $completedStatusId);
                $updateAppointmentStmt->bindParam(":appointment_id", $data['appointment_id']);
                $updateAppointmentStmt->execute();
            }

            $this->conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Consultation created successfully",
                "consultation_id" => $consultationId
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
        }
    }

    // Get consultation details with prescriptions and lab requests
    public function get_consultation_details($consultationId)
    {
        try {
            // Get consultation
            $consultationStmt = $this->conn->prepare("
                SELECT c.*, a.appointment_date, u.name AS patient_name, du.name AS doctor_name
                FROM tbl_consultations c
                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id
                JOIN tbl_patients p ON c.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                WHERE c.consultation_id = :consultation_id
            ");
            $consultationStmt->bindParam(":consultation_id", $consultationId);
            $consultationStmt->execute();
            $consultation = $consultationStmt->fetch(PDO::FETCH_ASSOC);

            if (!$consultation) {
                echo json_encode(["success" => false, "message" => "Consultation not found"]);
                return;
            }

            // Get prescriptions
            $prescriptionStmt = $this->conn->prepare("
                SELECT p.*, m.medicine_name, m.weight, f.form_name
                FROM tbl_prescriptions p
                JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                WHERE p.consultation_id = :consultation_id
            ");
            $prescriptionStmt->bindParam(":consultation_id", $consultationId);
            $prescriptionStmt->execute();
            $prescriptions = $prescriptionStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get lab requests
            $labRequestStmt = $this->conn->prepare("
                SELECT lr.*, ltt.type_name, s.status_name
                FROM tbl_lab_requests lr
                JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
                JOIN tbl_status s ON lr.status_id = s.status_id
                WHERE lr.appointment_id = :appointment_id
            ");
            $labRequestStmt->bindParam(":appointment_id", $consultation['appointment_id']);
            $labRequestStmt->execute();
            $labRequests = $labRequestStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "consultation" => $consultation,
                "prescriptions" => $prescriptions,
                "lab_requests" => $labRequests
            ]);

        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
        }
    }

    // Get consultations by doctor
    public function get_consultations_by_doctor($doctorId, $date = null)
    {
        try {
            $sql = "
                SELECT c.*, a.appointment_date, a.queue_number, u.name AS patient_name
                FROM tbl_consultations c
                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id
                JOIN tbl_patients p ON c.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                WHERE c.doctor_id = :doctor_id
            ";

            if ($date) {
                $sql .= " AND a.appointment_date = :date";
            }

            $sql .= " ORDER BY a.appointment_date DESC, a.queue_number ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(":doctor_id", $doctorId);
            if ($date) {
                $stmt->bindParam(":date", $date);
            }

            $stmt->execute();
            $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $consultations
            ]);

        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
        }
    }

    // Get consultations by patient
    public function get_consultations_by_patient($patientId)
    {
        try {
            $stmt = $this->conn->prepare("
                SELECT c.*, a.appointment_date, a.queue_number, du.name AS doctor_name, sp.name AS specialization_name
                FROM tbl_consultations c
                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id
                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
                WHERE c.patient_id = :patient_id
                ORDER BY a.appointment_date DESC, a.queue_number ASC
            ");

            $stmt->bindParam(":patient_id", $patientId);
            $stmt->execute();
            $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $consultations
            ]);

        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
        }
    }

    // Update consultation
    public function update_consultation($consultationId, $data)
    {
        try {
            $stmt = $this->conn->prepare("
                UPDATE tbl_consultations
                SET diagnosis = :diagnosis,
                    consultation_notes = :consultation_notes,
                    next_appointment_date = :next_appointment_date,
                    next_appointment_notes = :next_appointment_notes,
                    consultation_status = :consultation_status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE consultation_id = :consultation_id
            ");

            $stmt->bindParam(":consultation_id", $consultationId);
            $stmt->bindParam(":diagnosis", $data['diagnosis']);
            $stmt->bindParam(":consultation_notes", $data['consultation_notes'] ?? '');
            $stmt->bindParam(":next_appointment_date", $data['next_appointment_date'] ?? null);
            $stmt->bindParam(":next_appointment_notes", $data['next_appointment_notes'] ?? '');
            $stmt->bindParam(":consultation_status", $data['consultation_status'] ?? 'Active');

            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Consultation updated successfully"
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "Failed to update consultation"
                ]);
            }

        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
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

$svc = new IntegratedConsultation();

switch ($operation) {
    case 'create':
        $data = json_decode($json ?: '{}', true);
        $svc->create_consultation($data);
        break;
    case 'get_details':
        $consultationId = $_GET['consultation_id'] ?? '';
        if (!$consultationId) {
            echo json_encode(["success" => false, "message" => "consultation_id is required."]);
            break;
        }
        $svc->get_consultation_details($consultationId);
        break;
    case 'get_by_doctor':
        $doctorId = $_GET['doctor_id'] ?? '';
        $date = $_GET['date'] ?? null;
        if (!$doctorId) {
            echo json_encode(["success" => false, "message" => "doctor_id is required."]);
            break;
        }
        $svc->get_consultations_by_doctor($doctorId, $date);
        break;
    case 'get_by_patient':
        $patientId = $_GET['patient_id'] ?? '';
        if (!$patientId) {
            echo json_encode(["success" => false, "message" => "patient_id is required."]);
            break;
        }
        $svc->get_consultations_by_patient($patientId);
        break;
    case 'update':
        $data = json_decode($json ?: '{}', true);
        if (empty($data['consultation_id'])) {
            echo json_encode(["success" => false, "message" => "consultation_id is required."]);
            break;
        }
        $consultationId = $data['consultation_id'];
        unset($data['consultation_id']);
        $svc->update_consultation($consultationId, $data);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>

