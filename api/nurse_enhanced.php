<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class NurseEnhanced {
    private $conn;

    public function __construct() {
        include "connection.php";
        $this->conn = $conn;
    }

    private function getAppointmentStatusId($statusName) {
        $stmt = $this->conn->prepare("SELECT s.status_id FROM tbl_status s JOIN tbl_status_type t ON s.status_type_id = t.status_type_id WHERE t.status_type_name = 'Appointment' AND s.status_name = :name LIMIT 1");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }

    // Get patients waiting for nurse assessment
    public function get_patients_waiting_for_nurse() {
        $date = date('Y-m-d');
        $waitingForNurseId = $this->getAppointmentStatusId('Waiting for Nurse');
        
        if (!$waitingForNurseId) {
            echo json_encode(["success"=>false, "message"=>"Waiting for Nurse status not configured"]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("
                SELECT
                    a.appointment_id,
                    a.queue_number,
                    a.appointment_date,
                    p.patient_id,
                    u.name AS patient_name,
                    u.email AS patient_email,
                    p.sex,
                    p.contact_num,
                    p.birthdate,
                    p.age,
                    p.address,
                    ar.reason_name,
                    a.appointment_notes,
                    a.created_at AS appointment_created_at
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                WHERE a.appointment_date = :date
                AND a.status_id = :status_id
                ORDER BY a.queue_number ASC
            ");
            $stmt->bindParam(":date", $date);
            $stmt->bindParam(":status_id", $waitingForNurseId);
            $stmt->execute();
            $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success"=>true, "data"=>$patients]);
        } catch (PDOException $e) {
            echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
        }
    }

    // Start nurse assessment
    public function start_nurse_assessment($data) {
        if (empty($data['appointment_id']) || empty($data['nurse_id'])) {
            echo json_encode(["success"=>false, "message"=>"appointment_id and nurse_id are required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Check if patient is waiting for nurse
            $waitingForNurseId = $this->getAppointmentStatusId('Waiting for Nurse');
            $nurseAssessmentId = $this->getAppointmentStatusId('Nurse Assessment');
            
            if (!$waitingForNurseId || !$nurseAssessmentId) {
                echo json_encode(["success"=>false, "message"=>"Required statuses not configured"]);
                return;
            }

            $checkStmt = $this->conn->prepare("
                SELECT a.appointment_id 
                FROM tbl_appointments a 
                WHERE a.appointment_id = :aid AND a.status_id = :status_id
            ");
            $checkStmt->bindParam(":aid", $data['appointment_id']);
            $checkStmt->bindParam(":status_id", $waitingForNurseId);
            $checkStmt->execute();
            
            if (!$checkStmt->fetch()) {
                echo json_encode(["success"=>false, "message"=>"Patient is not waiting for nurse assessment"]);
                return;
            }

            // Update appointment status to Nurse Assessment
            $updateStmt = $this->conn->prepare("
                UPDATE tbl_appointments 
                SET status_id = :status_id 
                WHERE appointment_id = :aid
            ");
            $updateStmt->bindParam(":status_id", $nurseAssessmentId);
            $updateStmt->bindParam(":aid", $data['appointment_id']);
            $updateStmt->execute();

            // Create nurse assessment record
            $assessmentStmt = $this->conn->prepare("
                INSERT INTO tbl_nurse_assessments (appointment_id, nurse_id, assessment_notes)
                VALUES (:aid, :nid, :notes)
            ");
            $assessmentStmt->bindParam(":aid", $data['appointment_id']);
            $assessmentStmt->bindParam(":nid", $data['nurse_id']);
            $assessmentStmt->bindParam(":notes", $data['assessment_notes'] ?? '');
            $assessmentStmt->execute();

            $this->conn->commit();
            echo json_encode(["success"=>true, "message"=>"Nurse assessment started"]);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(["success"=>false, "message"=>"Failed to start assessment: ".$e->getMessage()]);
        }
    }

    // Record vital signs
    public function record_vitals($data) {
        if (empty($data['appointment_id'])) {
            echo json_encode(["success"=>false, "message"=>"appointment_id is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Check if consultation exists, create if not
            $consultationStmt = $this->conn->prepare("
                SELECT consultation_id FROM tbl_consultations 
                WHERE appointment_id = :aid LIMIT 1
            ");
            $consultationStmt->bindParam(":aid", $data['appointment_id']);
            $consultationStmt->execute();
            $consultation = $consultationStmt->fetch(PDO::FETCH_ASSOC);

            $consultationId = null;
            if ($consultation) {
                $consultationId = $consultation['consultation_id'];
            } else {
                // Get patient_id from appointment
                $patientStmt = $this->conn->prepare("SELECT patient_id FROM tbl_appointments WHERE appointment_id = :aid LIMIT 1");
                $patientStmt->bindParam(":aid", $data['appointment_id']);
                $patientStmt->execute();
                $patientId = $patientStmt->fetchColumn();

                // Create consultation record
                $createConsultationStmt = $this->conn->prepare("
                    INSERT INTO tbl_consultations (appointment_id, doctor_id, patient_id, consultation_status) 
                    VALUES (:aid, NULL, :pid, 'Triage')
                ");
                $createConsultationStmt->bindParam(":aid", $data['appointment_id']);
                $createConsultationStmt->bindParam(":pid", $patientId);
                $createConsultationStmt->execute();
                $consultationId = $this->conn->lastInsertId();
            }

            // Insert/update vitals
            $vitalsStmt = $this->conn->prepare("
                INSERT INTO tbl_consultation_vitals (consultation_id, height_cm, weight_kg, blood_pressure_mmHg, heart_rate_bpm, spo2_percent)
                VALUES (:cid, :h, :w, :bp, :hr, :spo2)
                ON DUPLICATE KEY UPDATE
                    height_cm = VALUES(height_cm),
                    weight_kg = VALUES(weight_kg),
                    blood_pressure_mmHg = VALUES(blood_pressure_mmHg),
                    heart_rate_bpm = VALUES(heart_rate_bpm),
                    spo2_percent = VALUES(spo2_percent)
            ");
            $vitalsStmt->bindValue(":cid", $consultationId);
            $vitalsStmt->bindValue(":h", $data['height_cm'] !== '' ? $data['height_cm'] : null);
            $vitalsStmt->bindValue(":w", $data['weight_kg'] !== '' ? $data['weight_kg'] : null);
            $vitalsStmt->bindValue(":bp", $data['blood_pressure_mmHg'] ?? null);
            $vitalsStmt->bindValue(":hr", $data['heart_rate_bpm'] !== '' ? $data['heart_rate_bpm'] : null);
            $vitalsStmt->bindValue(":spo2", $data['spo2_percent'] !== '' ? $data['spo2_percent'] : null);
            $vitalsStmt->execute();

            // Update nurse assessment record
            $updateAssessmentStmt = $this->conn->prepare("
                UPDATE tbl_nurse_assessments 
                SET vitals_completed = 1 
                WHERE appointment_id = :aid
            ");
            $updateAssessmentStmt->bindParam(":aid", $data['appointment_id']);
            $updateAssessmentStmt->execute();

            $this->conn->commit();
            echo json_encode(["success"=>true, "message"=>"Vital signs recorded successfully"]);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(["success"=>false, "message"=>"Failed to record vitals: ".$e->getMessage()]);
        }
    }

    // Record medical history
    public function record_medical_history($data) {
        if (empty($data['appointment_id'])) {
            echo json_encode(["success"=>false, "message"=>"appointment_id is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Get consultation_id
            $consultationStmt = $this->conn->prepare("
                SELECT consultation_id FROM tbl_consultations 
                WHERE appointment_id = :aid LIMIT 1
            ");
            $consultationStmt->bindParam(":aid", $data['appointment_id']);
            $consultationStmt->execute();
            $consultation = $consultationStmt->fetch(PDO::FETCH_ASSOC);

            if (!$consultation) {
                echo json_encode(["success"=>false, "message"=>"Consultation not found"]);
                return;
            }

            $consultationId = $consultation['consultation_id'];

            // Insert/update medical history
            $historyStmt = $this->conn->prepare("
                INSERT INTO tbl_consultation_history (
                    consultation_id, present_illness, past_medical_history, 
                    past_surgical_history, family_history, social_history, current_medications
                ) VALUES (:cid, :present, :past_medical, :past_surgical, :family, :social, :medications)
                ON DUPLICATE KEY UPDATE
                    present_illness = VALUES(present_illness),
                    past_medical_history = VALUES(past_medical_history),
                    past_surgical_history = VALUES(past_surgical_history),
                    family_history = VALUES(family_history),
                    social_history = VALUES(social_history),
                    current_medications = VALUES(current_medications)
            ");
            $historyStmt->bindValue(":cid", $consultationId);
            $historyStmt->bindValue(":present", $data['present_illness'] ?? '');
            $historyStmt->bindValue(":past_medical", $data['past_medical_history'] ?? '');
            $historyStmt->bindValue(":past_surgical", $data['past_surgical_history'] ?? '');
            $historyStmt->bindValue(":family", $data['family_history'] ?? '');
            $historyStmt->bindValue(":social", $data['social_history'] ?? '');
            $historyStmt->bindValue(":medications", $data['current_medications'] ?? '');
            $historyStmt->execute();

            // Update nurse assessment record
            $updateAssessmentStmt = $this->conn->prepare("
                UPDATE tbl_nurse_assessments 
                SET history_completed = 1 
                WHERE appointment_id = :aid
            ");
            $updateAssessmentStmt->bindParam(":aid", $data['appointment_id']);
            $updateAssessmentStmt->execute();

            $this->conn->commit();
            echo json_encode(["success"=>true, "message"=>"Medical history recorded successfully"]);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(["success"=>false, "message"=>"Failed to record medical history: ".$e->getMessage()]);
        }
    }

    // Forward patient to doctor (complete nurse assessment)
    public function forward_to_doctor($data) {
        if (empty($data['appointment_id'])) {
            echo json_encode(["success"=>false, "message"=>"appointment_id is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Check if all required fields are completed
            $checkStmt = $this->conn->prepare("
                SELECT na.vitals_completed, na.history_completed, na.forwarded_to_doctor
                FROM tbl_nurse_assessments na
                WHERE na.appointment_id = :aid
            ");
            $checkStmt->bindParam(":aid", $data['appointment_id']);
            $checkStmt->execute();
            $assessment = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$assessment) {
                echo json_encode(["success"=>false, "message"=>"Nurse assessment not found"]);
                return;
            }

            if ($assessment['forwarded_to_doctor']) {
                echo json_encode(["success"=>false, "message"=>"Patient already forwarded to doctor"]);
                return;
            }

            if (!$assessment['vitals_completed'] || !$assessment['history_completed']) {
                echo json_encode(["success"=>false, "message"=>"Cannot forward patient. Vitals and medical history must be completed first."]);
                return;
            }

            // Update appointment status to "Waiting for Doctor"
            $waitingForDoctorId = $this->getAppointmentStatusId('Waiting for Doctor');
            if (!$waitingForDoctorId) {
                echo json_encode(["success"=>false, "message"=>"Waiting for Doctor status not configured"]);
                return;
            }

            $updateAppointmentStmt = $this->conn->prepare("
                UPDATE tbl_appointments 
                SET status_id = :status_id 
                WHERE appointment_id = :aid
            ");
            $updateAppointmentStmt->bindParam(":status_id", $waitingForDoctorId);
            $updateAppointmentStmt->bindParam(":aid", $data['appointment_id']);
            $updateAppointmentStmt->execute();

            // Update nurse assessment record
            $updateAssessmentStmt = $this->conn->prepare("
                UPDATE tbl_nurse_assessments 
                SET forwarded_to_doctor = 1, forwarded_at = NOW() 
                WHERE appointment_id = :aid
            ");
            $updateAssessmentStmt->bindParam(":aid", $data['appointment_id']);
            $updateAssessmentStmt->execute();

            $this->conn->commit();
            echo json_encode(["success"=>true, "message"=>"Patient forwarded to doctor successfully"]);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(["success"=>false, "message"=>"Failed to forward patient: ".$e->getMessage()]);
        }
    }

    // Get patient assessment details
    public function get_patient_assessment($appointmentId) {
        try {
            $stmt = $this->conn->prepare("
                SELECT
                    a.appointment_id,
                    a.queue_number,
                    p.patient_id,
                    u.name AS patient_name,
                    u.email AS patient_email,
                    p.sex,
                    p.contact_num,
                    p.birthdate,
                    p.age,
                    p.address,
                    ar.reason_name,
                    a.appointment_notes,
                    cv.height_cm,
                    cv.weight_kg,
                    cv.blood_pressure_mmHg,
                    cv.heart_rate_bpm,
                    cv.spo2_percent,
                    ch.present_illness,
                    ch.past_medical_history,
                    ch.past_surgical_history,
                    ch.family_history,
                    ch.social_history,
                    ch.current_medications,
                    na.assessment_notes,
                    na.vitals_completed,
                    na.history_completed,
                    na.forwarded_to_doctor,
                    na.forwarded_at
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                LEFT JOIN tbl_consultations c ON a.appointment_id = c.appointment_id
                LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
                LEFT JOIN tbl_consultation_history ch ON c.consultation_id = ch.consultation_id
                LEFT JOIN tbl_nurse_assessments na ON a.appointment_id = na.appointment_id
                WHERE a.appointment_id = :aid
            ");
            $stmt->bindParam(":aid", $appointmentId);
            $stmt->execute();
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$patient) {
                echo json_encode(["success"=>false, "message"=>"Patient not found"]);
                return;
            }

            echo json_encode(["success"=>true, "data"=>$patient]);
        } catch (PDOException $e) {
            echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
        }
    }

    // Get patients waiting for doctor
    public function get_patients_waiting_for_doctor() {
        $date = date('Y-m-d');
        $waitingForDoctorId = $this->getAppointmentStatusId('Waiting for Doctor');
        
        if (!$waitingForDoctorId) {
            echo json_encode(["success"=>false, "message"=>"Waiting for Doctor status not configured"]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("
                SELECT
                    a.appointment_id,
                    a.queue_number,
                    p.patient_id,
                    u.name AS patient_name,
                    u.email AS patient_email,
                    p.sex,
                    p.contact_num,
                    p.birthdate,
                    p.age,
                    p.address,
                    ar.reason_name,
                    a.appointment_notes,
                    cv.height_cm,
                    cv.weight_kg,
                    cv.blood_pressure_mmHg,
                    cv.heart_rate_bpm,
                    cv.spo2_percent,
                    ch.present_illness,
                    ch.past_medical_history,
                    ch.past_surgical_history,
                    ch.family_history,
                    ch.social_history,
                    ch.current_medications,
                    na.assessment_notes,
                    na.forwarded_at
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                LEFT JOIN tbl_consultations c ON a.appointment_id = c.appointment_id
                LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
                LEFT JOIN tbl_consultation_history ch ON c.consultation_id = ch.consultation_id
                LEFT JOIN tbl_nurse_assessments na ON a.appointment_id = na.appointment_id
                WHERE a.appointment_date = :date
                AND a.status_id = :status_id
                ORDER BY a.queue_number ASC
            ");
            $stmt->bindParam(":date", $date);
            $stmt->bindParam(":status_id", $waitingForDoctorId);
            $stmt->execute();
            $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success"=>true, "data"=>$patients]);
        } catch (PDOException $e) {
            echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
        }
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new NurseEnhanced();

switch ($operation) {
    case 'get_patients_waiting_for_nurse':
        $svc->get_patients_waiting_for_nurse();
        break;
    case 'start_nurse_assessment':
        $svc->start_nurse_assessment(json_decode($json ?: '{}', true));
        break;
    case 'record_vitals':
        $svc->record_vitals(json_decode($json ?: '{}', true));
        break;
    case 'record_medical_history':
        $svc->record_medical_history(json_decode($json ?: '{}', true));
        break;
    case 'forward_to_doctor':
        $svc->forward_to_doctor(json_decode($json ?: '{}', true));
        break;
    case 'get_patient_assessment':
        $appointmentId = $_GET['appointment_id'] ?? '';
        if (!$appointmentId) {
            echo json_encode(["success"=>false, "message"=>"appointment_id is required"]);
            break;
        }
        $svc->get_patient_assessment($appointmentId);
        break;
    case 'get_patients_waiting_for_doctor':
        $svc->get_patients_waiting_for_doctor();
        break;
    default:
        echo json_encode(["success"=>false, "message"=>"Invalid operation"]);
        break;
}
?>