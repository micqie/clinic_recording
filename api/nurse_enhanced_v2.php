<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class NurseEnhanced
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Save nurse assessment
    public function save_nurse_assessment($data)
    {
        if (empty($data['appointment_id']) || empty($data['nurse_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and nurse_id are required."]);
            return;
        }

        $this->conn->beginTransaction();
        try {
            // Get patient ID and doctor ID from appointment
            $stmt = $this->conn->prepare("SELECT patient_id, doctor_id FROM tbl_appointments WHERE appointment_id = :appointment_id LIMIT 1");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$appointment) {
                throw new Exception("Appointment not found");
            }

            $patientId = $appointment['patient_id'];
            $doctorId = $appointment['doctor_id'];

            // Check if consultation exists
            $stmt = $this->conn->prepare("
                SELECT consultation_id FROM tbl_consultations 
                WHERE appointment_id = :appointment_id LIMIT 1
            ");
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->execute();
            $consultationId = $stmt->fetchColumn();

            if ($consultationId) {
                // Update existing consultation
                $stmt = $this->conn->prepare("
                    UPDATE tbl_consultations 
                    SET nurse_id = :nurse_id, 
                        nurse_completed_at = NOW(),
                        patient_ready_for_doctor = :ready,
                        nurse_notes = :nurse_notes,
                        consultation_status = 'Triage'
                    WHERE consultation_id = :consultation_id
                ");
                $stmt->bindParam(":consultation_id", $consultationId);
                $stmt->bindParam(":nurse_id", $data['nurse_id']);
                $stmt->bindParam(":ready", $data['patient_ready_for_doctor'], PDO::PARAM_BOOL);
                $stmt->bindParam(":nurse_notes", $data['nurse_assessment']);
                $stmt->execute();
            } else {
                // Create new consultation record
                $stmt = $this->conn->prepare("
                    INSERT INTO tbl_consultations (
                        appointment_id, doctor_id, patient_id, nurse_id,
                        consultation_status, nurse_completed_at,
                        patient_ready_for_doctor, nurse_notes, diagnosis
                    ) VALUES (
                        :appointment_id, :doctor_id, :patient_id, :nurse_id,
                        'Triage', NOW(), :ready, :nurse_notes, 'Pending'
                    )
                ");
                $stmt->bindParam(":appointment_id", $data['appointment_id']);
                $stmt->bindParam(":doctor_id", $doctorId);
                $stmt->bindParam(":patient_id", $patientId);
                $stmt->bindParam(":nurse_id", $data['nurse_id']);
                $stmt->bindParam(":ready", $data['patient_ready_for_doctor'], PDO::PARAM_BOOL);
                $stmt->bindParam(":nurse_notes", $data['nurse_assessment']);
                $stmt->execute();
                $consultationId = $this->conn->lastInsertId();
            }

            // Insert/update vitals
            $this->upsertVitals($consultationId, $data);

            // Insert/update medical history
            $this->upsertHistory($consultationId, $data);

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Nurse assessment saved successfully.",
                "consultation_id" => $consultationId
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("Nurse assessment save error: " . $e->getMessage());
            echo json_encode([
                "success" => false,
                "message" => "Failed to save nurse assessment: " . $e->getMessage()
            ]);
        }
    }

    // Get nurse assessment
    public function get_nurse_assessment($appointmentId)
    {
        $stmt = $this->conn->prepare("
            SELECT 
                c.consultation_id,
                c.nurse_id,
                c.nurse_completed_at,
                c.patient_ready_for_doctor,
                c.nurse_notes,
                cv.height_cm,
                cv.weight_kg,
                cv.temperature_celsius,
                cv.blood_pressure_mmHg,
                cv.heart_rate_bpm,
                cv.spo2_percent,
                ch.chief_complaint,
                ch.past_medical_history,
                ch.current_medications,
                ch.family_history,
                ch.social_history,
                ch.nurse_assessment
            FROM tbl_consultations c
            LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
            LEFT JOIN tbl_consultation_history ch ON c.consultation_id = ch.consultation_id
            WHERE c.appointment_id = :appointment_id
            LIMIT 1
        ");
        $stmt->bindParam(":appointment_id", $appointmentId);
        $stmt->execute();
        $assessment = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($assessment) {
            echo json_encode([
                "success" => true,
                "data" => $assessment
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "No nurse assessment found for this appointment."
            ]);
        }
    }

    // Upsert vitals
    private function upsertVitals($consultationId, $data)
    {
        $stmt = $this->conn->prepare("
            INSERT INTO tbl_consultation_vitals (
                consultation_id, height_cm, weight_kg, blood_pressure_mmHg, 
                heart_rate_bpm, temperature_celsius, spo2_percent
            ) VALUES (
                :consultation_id, :height_cm, :weight_kg, :blood_pressure_mmHg,
                :heart_rate_bpm, :temperature_celsius, :spo2_percent
            )
            ON DUPLICATE KEY UPDATE
                height_cm = VALUES(height_cm),
                weight_kg = VALUES(weight_kg),
                blood_pressure_mmHg = VALUES(blood_pressure_mmHg),
                heart_rate_bpm = VALUES(heart_rate_bpm),
                temperature_celsius = VALUES(temperature_celsius),
                spo2_percent = VALUES(spo2_percent)
        ");

        $heightCm = !empty($data['height_cm']) ? $data['height_cm'] : null;
        $weightKg = !empty($data['weight_kg']) ? $data['weight_kg'] : null;
        $bloodPressure = !empty($data['blood_pressure_mmHg']) ? $data['blood_pressure_mmHg'] : null;
        $heartRate = !empty($data['heart_rate_bpm']) ? $data['heart_rate_bpm'] : null;
        $temperature = !empty($data['temperature_celsius']) ? $data['temperature_celsius'] : null;
        $spo2 = !empty($data['spo2_percent']) ? $data['spo2_percent'] : null;

        $stmt->bindParam(":consultation_id", $consultationId);
        $stmt->bindParam(":height_cm", $heightCm);
        $stmt->bindParam(":weight_kg", $weightKg);
        $stmt->bindParam(":blood_pressure_mmHg", $bloodPressure);
        $stmt->bindParam(":heart_rate_bpm", $heartRate);
        $stmt->bindParam(":temperature_celsius", $temperature);
        $stmt->bindParam(":spo2_percent", $spo2);
        $stmt->execute();
    }

    // Upsert medical history
    private function upsertHistory($consultationId, $data)
    {
        $stmt = $this->conn->prepare("
            INSERT INTO tbl_consultation_history (
                consultation_id, chief_complaint, past_medical_history, 
                current_medications, family_history, social_history, nurse_assessment
            ) VALUES (
                :consultation_id, :chief_complaint, :past_medical_history,
                :current_medications, :family_history, :social_history, :nurse_assessment
            )
            ON DUPLICATE KEY UPDATE
                chief_complaint = VALUES(chief_complaint),
                past_medical_history = VALUES(past_medical_history),
                current_medications = VALUES(current_medications),
                family_history = VALUES(family_history),
                social_history = VALUES(social_history),
                nurse_assessment = VALUES(nurse_assessment)
        ");

        $stmt->bindParam(":consultation_id", $consultationId);
        $stmt->bindParam(":chief_complaint", $data['chief_complaint']);
        $stmt->bindParam(":past_medical_history", $data['past_medical_history']);
        $stmt->bindParam(":current_medications", $data['current_medications']);
        $stmt->bindParam(":family_history", $data['family_history']);
        $stmt->bindParam(":social_history", $data['social_history']);
        $stmt->bindParam(":nurse_assessment", $data['nurse_assessment']);
        $stmt->execute();
    }

    // Get all nurses
    public function get_all_nurses()
    {
        $stmt = $this->conn->prepare("
            SELECT n.nurse_id, u.name, n.license_number, n.shift_schedule
            FROM tbl_nurses n
            JOIN tbl_users u ON n.user_id = u.user_id
            WHERE u.is_active = 1
            ORDER BY u.name
        ");
        $stmt->execute();
        $nurses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $nurses
        ]);
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new NurseEnhanced();

switch ($operation) {
    case 'save_nurse_assessment':
        $data = json_decode($json ?: '{}', true);
        $svc->save_nurse_assessment($data);
        break;
    case 'get_nurse_assessment':
        $appointmentId = $_GET['appointment_id'] ?? '';
        if (!$appointmentId) {
            echo json_encode(["success" => false, "message" => "appointment_id is required."]);
            break;
        }
        $svc->get_nurse_assessment($appointmentId);
        break;
    case 'get_all_nurses':
        $svc->get_all_nurses();
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation."]);
        break;
}
?>
