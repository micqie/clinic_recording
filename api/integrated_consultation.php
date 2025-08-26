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
            // Log the incoming data for debugging
            error_log("Creating consultation with data: " . json_encode($data));

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

            $consultationStmt->bindValue(":appointment_id", $data['appointment_id']);
            $consultationStmt->bindValue(":doctor_id", $data['doctor_id']);
            $consultationStmt->bindValue(":patient_id", $data['patient_id']);
            $consultationStmt->bindValue(":diagnosis", $data['diagnosis']);

            // Ensure these are proper variables for bindParam
            $consultationNotes = $data['consultation_notes'] ?? '';
            $nextAppointmentDate = $data['next_appointment_date'] ?? null;
            $nextAppointmentNotes = $data['next_appointment_notes'] ?? '';
            $consultationStatus = $data['consultation_status'] ?? 'Active';

            $consultationStmt->bindParam(":consultation_notes", $consultationNotes);
            $consultationStmt->bindParam(":next_appointment_date", $nextAppointmentDate);
            $consultationStmt->bindParam(":next_appointment_notes", $nextAppointmentNotes);
            $consultationStmt->bindParam(":consultation_status", $consultationStatus);

            if (!$consultationStmt->execute()) {
                $errorInfo = $consultationStmt->errorInfo();
                error_log("Failed to create consultation: " . json_encode($errorInfo));
                throw new Exception("Failed to create consultation: " . ($errorInfo[2] ?? 'Unknown error'));
            }

            $consultationId = $this->conn->lastInsertId();
            error_log("Created consultation with ID: " . $consultationId);

            // Create prescriptions if provided
            if (!empty($data['prescriptions']) && is_array($data['prescriptions'])) {
                error_log("Creating " . count($data['prescriptions']) . " prescriptions");
                foreach ($data['prescriptions'] as $prescription) {
                    $prescriptionStmt = $this->conn->prepare("
                        INSERT INTO tbl_prescriptions (
                            consultation_id, appointment_id, doctor_id, patient_id,
                            medicine_id, dosage, frequency, duration, quantity, packaging_unit, instructions, status
                        ) VALUES (
                            :consultation_id, :appointment_id, :doctor_id, :patient_id,
                            :medicine_id, :dosage, :frequency, :duration, :quantity, :packaging_unit, :instructions, 'Active'
                        )
                    ");

                    $prescriptionStmt->bindParam(":consultation_id", $consultationId);
                    $prescriptionStmt->bindValue(":appointment_id", $data['appointment_id']);
                    $prescriptionStmt->bindValue(":doctor_id", $data['doctor_id']);
                    $prescriptionStmt->bindValue(":patient_id", $data['patient_id']);
                    $prescriptionStmt->bindValue(":medicine_id", $prescription['medicine_id']);
                    $prescriptionStmt->bindValue(":dosage", $prescription['dosage']);
                    $prescriptionStmt->bindValue(":frequency", $prescription['frequency']);
                    $prescriptionStmt->bindValue(":duration", $prescription['duration']);
                    $prescriptionStmt->bindValue(":quantity", isset($prescription['quantity']) ? (int)$prescription['quantity'] : 1, PDO::PARAM_INT);
                    $prescriptionStmt->bindValue(":packaging_unit", $prescription['packaging_unit'] ?? 'tablet');

                    // Ensure instructions is a proper variable for bindParam
                    $instructions = $prescription['instructions'] ?? '';
                    $prescriptionStmt->bindParam(":instructions", $instructions);

                    if (!$prescriptionStmt->execute()) {
                        $errorInfo = $prescriptionStmt->errorInfo();
                        error_log("Failed to create prescription: " . json_encode($errorInfo));
                        throw new Exception("Failed to create prescription: " . ($errorInfo[2] ?? 'Unknown error'));
                    }
                }
            }

            // Create lab requests if provided
            if (!empty($data['lab_requests']) && is_array($data['lab_requests'])) {
                error_log("Creating " . count($data['lab_requests']) . " lab requests");
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

                    $labRequestStmt->bindValue(":doctor_id", $data['doctor_id']);
                    $labRequestStmt->bindValue(":patient_id", $data['patient_id']);
                    $labRequestStmt->bindValue(":appointment_id", $data['appointment_id']);
                    $labRequestStmt->bindValue(":lab_test_type_id", $labRequest['lab_test_type_id']);
                    $labRequestStmt->bindValue(":request_text", $labRequest['request_text']);

                    // Ensure status_id is a proper variable for bindParam
                    $statusId = $labRequest['status_id'] ?? 14; // Default to Processing
                    $labRequestStmt->bindParam(":status_id", $statusId);

                    if (!$labRequestStmt->execute()) {
                        $errorInfo = $labRequestStmt->errorInfo();
                        error_log("Failed to create lab request: " . json_encode($errorInfo));
                        throw new Exception("Failed to create lab request: " . ($errorInfo[2] ?? 'Unknown error'));
                    }
                }
            }

            // Update appointment status to completed
            $completedStatusId = $this->getStatusId('Completed');
            error_log("Completed status ID: " . ($completedStatusId ?? 'null'));

            if ($completedStatusId) {
                $updateAppointmentStmt = $this->conn->prepare("
                    UPDATE tbl_appointments
                    SET status_id = :status_id
                    WHERE appointment_id = :appointment_id
                ");
                $updateAppointmentStmt->bindParam(":status_id", $completedStatusId);
                $updateAppointmentStmt->bindValue(":appointment_id", $data['appointment_id']);

                if (!$updateAppointmentStmt->execute()) {
                    $errorInfo = $updateAppointmentStmt->errorInfo();
                    error_log("Failed to update appointment status: " . json_encode($errorInfo));
                    throw new Exception("Failed to update appointment status: " . ($errorInfo[2] ?? 'Unknown error'));
                }
                error_log("Appointment status updated successfully");
            } else {
                error_log("Warning: Could not find 'Completed' status ID");
            }

            $this->conn->commit();
            error_log("Transaction committed successfully for consultation ID: " . $consultationId);

            $response = [
                "success" => true,
                "message" => "Consultation created successfully",
                "consultation_id" => $consultationId
            ];

            error_log("Sending response: " . json_encode($response));
            echo json_encode($response);

        } catch (Exception $e) {
            error_log("Error in create_consultation: " . $e->getMessage());
            $this->conn->rollBack();
            error_log("Transaction rolled back");
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
                SELECT p.*, m.medicine_name, m.strength, f.form_name
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
            // Base consultations for patient
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

            // For each consultation, compute prescription counts, totals, and packaging summary
            foreach ($consultations as &$c) {
                $pstmt = $this->conn->prepare("
                    SELECT p.quantity, p.packaging_unit, m.price
                    FROM tbl_prescriptions p
                    JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                    WHERE p.consultation_id = :cid
                ");
                $pstmt->bindParam(":cid", $c['consultation_id']);
                $pstmt->execute();
                $rows = $pstmt->fetchAll(PDO::FETCH_ASSOC);

                $prescriptionCount = count($rows);
                $estimatedTotal = 0.0;
                $unitToQty = [];
                foreach ($rows as $r) {
                    $qty = isset($r['quantity']) && $r['quantity'] !== null ? (int)$r['quantity'] : 1;
                    $unit = $r['packaging_unit'] ?? 'unit';
                    $estimatedTotal += ((float)$r['price']) * $qty;
                    if (!isset($unitToQty[$unit])) $unitToQty[$unit] = 0;
                    $unitToQty[$unit] += $qty;
                }

                // Build packaging summary like: "2 tablets, 1 box"
                $parts = [];
                foreach ($unitToQty as $unit => $qty) {
                    $label = $unit;
                    if ($qty !== 1) { $label = $unit; } // keep as-is; units already pluralized in lookup
                    $parts[] = $qty . ' ' . $label;
                }
                $packagingSummary = count($parts) ? implode(', ', $parts) : '0 medicines';

                $c['prescription_count'] = $prescriptionCount;
                $c['estimated_total'] = (float)number_format($estimatedTotal, 2, '.', '');
                $c['packaging_summary'] = $packagingSummary;
            }

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
        try {
            error_log("Looking for status: '$statusName'");

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

            error_log("Status lookup result: " . json_encode($row));

            if (!$row) {
                error_log("No status found for: '$statusName'");
                // Let's also check what statuses are available
                $checkStmt = $this->conn->prepare("
                    SELECT s.status_id, s.status_name, t.status_type_name
                    FROM tbl_status s
                    JOIN tbl_status_type t ON s.status_type_id = t.status_type_id
                    WHERE t.status_type_name = 'Appointment'
                ");
                $checkStmt->execute();
                $availableStatuses = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("Available appointment statuses: " . json_encode($availableStatuses));
            }

            return $row ? intval($row['status_id']) : null;
        } catch (Exception $e) {
            error_log("Error in getStatusId: " . $e->getMessage());
            return null;
        }
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
