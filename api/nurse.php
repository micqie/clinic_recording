<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class NurseApi {
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

    // Record vital signs by creating/updating consultation with vitals
    public function upsert_vitals($data) {
        if (empty($data['appointment_id'])) {
            echo json_encode(["success"=>false,"message"=>"appointment_id is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Check if consultation already exists for this appointment
            $stmt = $this->conn->prepare("SELECT consultation_id FROM tbl_consultations WHERE appointment_id = :aid LIMIT 1");
            $stmt->bindParam(":aid", $data['appointment_id']);
            $stmt->execute();
            $consultation = $stmt->fetch(PDO::FETCH_ASSOC);

            $consultationId = null;
            if ($consultation) {
                // Update existing consultation
                $consultationId = $consultation['consultation_id'];
            } else {
                // Create new consultation record
                // Get patient_id and doctor_id from appointment
                $apptStmt = $this->conn->prepare("SELECT patient_id, doctor_id FROM tbl_appointments WHERE appointment_id = :aid LIMIT 1");
                $apptStmt->bindParam(":aid", $data['appointment_id']);
                $apptStmt->execute();
                $apptRow = $apptStmt->fetch(PDO::FETCH_ASSOC);
                $patientId = $apptRow['patient_id'] ?? null;
                $doctorId = $apptRow['doctor_id'] ?? null;

                // Insert new consultation using the appointment's doctor_id
                $stmt = $this->conn->prepare("INSERT INTO tbl_consultations (appointment_id, doctor_id, patient_id, consultation_status) VALUES (:aid, :did, :pid, 'Triage')");
                $stmt->bindParam(":aid", $data['appointment_id']);
                $stmt->bindParam(":did", $doctorId);
                $stmt->bindParam(":pid", $patientId);

                $stmt->execute();
                $consultationId = $this->conn->lastInsertId();
            }

            // Insert/update vitals in tbl_consultation_vitals
            $stmt = $this->conn->prepare("INSERT INTO tbl_consultation_vitals (consultation_id, height_cm, weight_kg, blood_pressure_mmHg, heart_rate_bpm, spo2_percent)
                VALUES (:cid, :h, :w, :bp, :hr, :spo2)
                ON DUPLICATE KEY UPDATE
                    height_cm = VALUES(height_cm),
                    weight_kg = VALUES(weight_kg),
                    blood_pressure_mmHg = VALUES(blood_pressure_mmHg),
                    heart_rate_bpm = VALUES(heart_rate_bpm),
                    spo2_percent = VALUES(spo2_percent)
            ");
            $stmt->bindValue(":cid", $consultationId);
            $stmt->bindValue(":h", $data['height_cm'] !== '' ? $data['height_cm'] : null);
            $stmt->bindValue(":w", $data['weight_kg'] !== '' ? $data['weight_kg'] : null);
            $stmt->bindValue(":bp", $data['blood_pressure_mmHg'] ?? null);
            $stmt->bindValue(":hr", $data['heart_rate_bpm'] !== '' ? $data['heart_rate_bpm'] : null);
            $stmt->bindValue(":spo2", $data['spo2_percent'] !== '' ? $data['spo2_percent'] : null);
            $stmt->execute();

            // Insert/update medical history in tbl_consultation_history
            $stmt = $this->conn->prepare("INSERT INTO tbl_consultation_history (consultation_id, chief_complaint, past_medical_history, current_medications, family_history, social_history)
                VALUES (:cid, :cc, :pmh, :meds, :fhx, :shx)
                ON DUPLICATE KEY UPDATE
                    chief_complaint = VALUES(chief_complaint),
                    past_medical_history = VALUES(past_medical_history),
                    current_medications = VALUES(current_medications),
                    family_history = VALUES(family_history),
                    social_history = VALUES(social_history)
            ");
            $stmt->bindValue(":cid", $consultationId);
            $stmt->bindValue(":cc", $data['chief_complaint'] ?? null);
            $stmt->bindValue(":pmh", $data['past_medical_history'] ?? null);
            $stmt->bindValue(":meds", $data['current_medications'] ?? null);
            $stmt->bindValue(":fhx", $data['family_history'] ?? null);
            $stmt->bindValue(":shx", $data['social_history'] ?? null);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode(["success"=>true, "message"=>"Vitals & history recorded successfully"]);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(["success"=>false, "message"=>"Failed to record vital signs: ".$e->getMessage()]);
        }
    }

    // Create walk-in appointment
    public function walk_in($data) {
        if (empty($data['patient_id'])) {
            echo json_encode(["success"=>false,"message"=>"patient_id is required"]);
            return;
        }

        $date = date('Y-m-d');
        $confirmedId = $this->getAppointmentStatusId('Confirmed');
        if (!$confirmedId) {
            echo json_encode(["success"=>false,"message"=>"Confirmed status not configured"]);
            return;
        }

        try {
            // Compute next queue number (exclude Cancelled)
            $cancelledId = $this->getAppointmentStatusId('Cancelled');
            $sqlMax = "SELECT COALESCE(MAX(queue_number), 0) FROM tbl_appointments WHERE appointment_date = :d" . ($cancelledId ? " AND status_id <> :cancelled" : "");
            $stmt = $this->conn->prepare($sqlMax);
            $stmt->bindParam(":d", $date);
            if ($cancelledId) { $stmt->bindParam(":cancelled", $cancelledId); }
            $stmt->execute();
            $nextQueue = intval($stmt->fetchColumn()) + 1;
            if ($nextQueue > 15) {
                echo json_encode(["success"=>false, "message"=>"Fully Booked"]);
                return;
            }

            // Check if appointment_reason_id and appointment_notes columns exist
            $hasReasonCol = false;
            $hasNotesCol = false;
            try {
                $db = $this->conn->query("SELECT DATABASE()")->fetchColumn();
                $col = $this->conn->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'tbl_appointments' AND COLUMN_NAME = 'appointment_reason_id'");
                $col->bindParam(":db", $db);
                $col->execute();
                $hasReasonCol = intval($col->fetchColumn()) > 0;

                $col = $this->conn->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'tbl_appointments' AND COLUMN_NAME = 'appointment_notes'");
                $col->bindParam(":db", $db);
                $col->execute();
                $hasNotesCol = intval($col->fetchColumn()) > 0;
            } catch (Exception $e) {}

            if ($hasReasonCol && $hasNotesCol) {
                $stmt = $this->conn->prepare("INSERT INTO tbl_appointments (patient_id, appointment_date, queue_number, status_id, appointment_reason_id, appointment_notes) VALUES (:pid, :d, :q, :sid, :rid, :notes)");
                $rid = $data['appointment_reason_id'] ?? null;
                if ($rid === '') $rid = null;
                $notes = $data['appointment_notes'] ?? '';
                if (!empty($data['other_reason_text'])) {
                    $notes = "Walk-in reason: ".$data['other_reason_text']."\n\n".$notes;
                }
                $stmt->bindParam(":pid", $data['patient_id']);
                $stmt->bindParam(":d", $date);
                $stmt->bindParam(":q", $nextQueue);
                $stmt->bindParam(":sid", $confirmedId);
                $stmt->bindParam(":rid", $rid);
                $stmt->bindParam(":notes", $notes);
            } else {
                $stmt = $this->conn->prepare("INSERT INTO tbl_appointments (patient_id, appointment_date, queue_number, status_id) VALUES (:pid, :d, :q, :sid)");
                $stmt->bindParam(":pid", $data['patient_id']);
                $stmt->bindParam(":d", $date);
                $stmt->bindParam(":q", $nextQueue);
                $stmt->bindParam(":sid", $confirmedId);
            }

            if ($stmt->execute()) {
                echo json_encode(["success"=>true, "message"=>"Walk-in appointment created", "queue_number"=>$nextQueue]);
            } else {
                $err = $stmt->errorInfo();
                echo json_encode(["success"=>false, "message"=>$err[2] ?? 'Failed to create walk-in appointment']);
            }
        } catch (PDOException $e) {
            echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
        }
    }

    // Get today's appointments for nurse triage
    public function get_today_appointments() {
        $date = date('Y-m-d');
        // Only show patients that have been explicitly sent to nurse
        $readyForNurseId = $this->getAppointmentStatusId('Ready for Nurse');
        $withNurseId = $this->getAppointmentStatusId('With Nurse');

        if (!$readyForNurseId && !$withNurseId) {
            echo json_encode(["success"=>false,"message"=>"Statuses for nurse workflow not configured"]);
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
                    d.doctor_id,
                    du.name AS doctor_name,
                    cv.height_cm,
                    cv.weight_kg,
                    cv.blood_pressure_mmHg,
                    cv.heart_rate_bpm,
                    cv.spo2_percent,
                    cv.created_at AS vitals_recorded_at,
                    c.consultation_id,
                    c.consultation_status
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_consultations c ON a.appointment_id = c.appointment_id
                LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
                WHERE a.appointment_date = :date
                AND a.status_id IN (:ready_for_nurse, :with_nurse)
                ORDER BY a.queue_number ASC
            ");
            $stmt->bindParam(":date", $date);
            $stmt->bindParam(":ready_for_nurse", $readyForNurseId);
            $stmt->bindParam(":with_nurse", $withNurseId);
            $stmt->execute();
            $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success"=>true, "data"=>$appointments]);
        } catch (PDOException $e) {
            echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
        }
    }

    // Get appointment reasons for walk-in dropdown
    public function get_appointment_reasons() {
        try {
            $stmt = $this->conn->prepare("SELECT reason_id, reason_name, description FROM tbl_appointment_reasons WHERE is_active = 1 ORDER BY reason_name ASC");
            $stmt->execute();
            $reasons = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success"=>true, "data"=>$reasons]);
        } catch (PDOException $e) {
            echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
        }
    }
}

$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';
$svc = new NurseApi();

switch ($operation) {
    case 'upsert_vitals':
        $svc->upsert_vitals(json_decode($json ?: '{}', true));
        break;
    case 'walk_in':
        $svc->walk_in(json_decode($json ?: '{}', true));
        break;
    case 'get_today_appointments':
        $svc->get_today_appointments();
        break;
    case 'get_appointment_reasons':
        $svc->get_appointment_reasons();
        break;
    default:
        echo json_encode(["success"=>false, "message"=>"Invalid operation"]);
        break;
}
?>
