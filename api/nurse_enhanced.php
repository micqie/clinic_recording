<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class EnhancedNurseApi {
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

    // Get triage queue (patients waiting for nurse or with nurse)
    public function get_triage_queue() {
        $date = date('Y-m-d');
        $waitingForNurseId = $this->getAppointmentStatusId('Waiting for Nurse');
        $withNurseId = $this->getAppointmentStatusId('With Nurse');
        $nurseCompleteId = $this->getAppointmentStatusId('Nurse Complete');

        if (!$waitingForNurseId || !$withNurseId || !$nurseCompleteId) {
            echo json_encode(["success" => false, "message" => "Required statuses not configured"]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("
                SELECT
                    a.appointment_id,
                    a.queue_number,
                    a.appointment_date,
                    a.status_id,
                    s.status_name,
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
                    c.consultation_id,
                    c.nurse_completed_at,
                    c.patient_ready_for_doctor
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                LEFT JOIN tbl_consultations c ON a.appointment_id = c.appointment_id
                JOIN tbl_status s ON a.status_id = s.status_id
                WHERE a.appointment_date = :date
                AND a.status_id IN (:waiting_for_nurse, :with_nurse, :nurse_complete)
                ORDER BY a.queue_number ASC
            ");
            $stmt->bindParam(":date", $date);
            $stmt->bindParam(":waiting_for_nurse", $waitingForNurseId);
            $stmt->bindParam(":with_nurse", $withNurseId);
            $stmt->bindParam(":nurse_complete", $nurseCompleteId);
            $stmt->execute();
            $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Find current patient (With Nurse status)
            $currentPatient = null;
            foreach ($appointments as $apt) {
                if ($apt['status_name'] === 'With Nurse') {
                    $currentPatient = $apt;
                    break;
                }
            }

            echo json_encode([
                "success" => true,
                "data" => $appointments,
                "current_patient" => $currentPatient
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Complete triage (comprehensive data recording)
    public function complete_triage($data) {
        if (empty($data['appointment_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Get patient_id from appointment
            $stmt = $this->conn->prepare("SELECT patient_id FROM tbl_appointments WHERE appointment_id = :aid LIMIT 1");
            $stmt->bindParam(":aid", $data['appointment_id']);
            $stmt->execute();
            $patientId = $stmt->fetchColumn();

            if (!$patientId) {
                throw new Exception("Appointment not found");
            }

            // Check if consultation already exists
            $stmt = $this->conn->prepare("SELECT consultation_id FROM tbl_consultations WHERE appointment_id = :aid LIMIT 1");
            $stmt->bindParam(":aid", $data['appointment_id']);
            $stmt->execute();
            $consultation = $stmt->fetch(PDO::FETCH_ASSOC);

            $consultationId = null;
            if ($consultation) {
                // Update existing consultation
                $consultationId = $consultation['consultation_id'];
                $stmt = $this->conn->prepare("
                    UPDATE tbl_consultations
                    SET nurse_id = :nurse_id,
                        nurse_completed_at = NOW(),
                        patient_ready_for_doctor = :ready,
                        nurse_notes = :nurse_notes
                    WHERE consultation_id = :consultation_id
                ");
                $stmt->bindParam(":nurse_id", $data['recorded_by_nurse_id']);
                $stmt->bindParam(":ready", $data['patient_ready_for_doctor'], PDO::PARAM_BOOL);
                $stmt->bindParam(":nurse_notes", $data['nurse_notes']);
                $stmt->bindParam(":consultation_id", $consultationId);
                $stmt->execute();
            } else {
                // Create new consultation record
                $stmt = $this->conn->prepare("
                    INSERT INTO tbl_consultations (
                        appointment_id, doctor_id, patient_id, nurse_id,
                        consultation_status, nurse_completed_at,
                        patient_ready_for_doctor, nurse_notes
                    ) VALUES (
                        :appointment_id, NULL, :patient_id, :nurse_id,
                        'Triage', NOW(), :ready, :nurse_notes
                    )
                ");
                $stmt->bindParam(":appointment_id", $data['appointment_id']);
                $stmt->bindParam(":patient_id", $patientId);
                $stmt->bindParam(":nurse_id", $data['recorded_by_nurse_id']);
                $stmt->bindParam(":ready", $data['patient_ready_for_doctor'], PDO::PARAM_BOOL);
                $stmt->bindParam(":nurse_notes", $data['nurse_notes']);
                $stmt->execute();
                $consultationId = $this->conn->lastInsertId();
            }

            // Insert/update vitals
            $this->upsertVitals($consultationId, $data);

            // Insert/update medical history
            $this->upsertHistory($consultationId, $data);

            // Insert/update lifestyle information
            $this->upsertLifestyle($consultationId, $data);

            // Insert selected illnesses
            if (!empty($data['selected_illnesses'])) {
                $this->insertIllnesses($consultationId, $data['selected_illnesses']);
            }

            // Check for abnormal vitals and create alerts
            $alerts = $this->checkAbnormalVitals($consultationId, $data);

            // Update appointment status
            $nurseCompleteId = $this->getAppointmentStatusId('Nurse Complete');
            if ($nurseCompleteId) {
                $stmt = $this->conn->prepare("UPDATE tbl_appointments SET status_id = :status_id WHERE appointment_id = :appointment_id");
                $stmt->bindParam(":status_id", $nurseCompleteId);
                $stmt->bindParam(":appointment_id", $data['appointment_id']);
                $stmt->execute();
            }

            $this->conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Triage completed successfully",
                "alerts" => $alerts
            ]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // Upsert vitals data
    private function upsertVitals($consultationId, $data) {
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
    private function upsertHistory($consultationId, $data) {
        $stmt = $this->conn->prepare("
            INSERT INTO tbl_consultation_history (
                consultation_id, past_medical_history, past_surgical_history,
                family_history, social_history, current_medications
            ) VALUES (
                :consultation_id, :past_medical_history, :past_surgical_history,
                :family_history, :social_history, :current_medications
            )
            ON DUPLICATE KEY UPDATE
                past_medical_history = VALUES(past_medical_history),
                past_surgical_history = VALUES(past_surgical_history),
                family_history = VALUES(family_history),
                social_history = VALUES(social_history),
                current_medications = VALUES(current_medications)
        ");

        $stmt->bindParam(":consultation_id", $consultationId);
        $stmt->bindParam(":past_medical_history", $data['past_medical_history']);
        $stmt->bindParam(":past_surgical_history", $data['past_surgical_history']);
        $stmt->bindParam(":family_history", $data['family_history']);
        $stmt->bindParam(":social_history", $data['social_history']);
        $stmt->bindParam(":current_medications", $data['current_medications']);
        $stmt->execute();
    }

    // Upsert lifestyle information
    private function upsertLifestyle($consultationId, $data) {
        $stmt = $this->conn->prepare("
            INSERT INTO tbl_consultation_lifestyle (
                consultation_id, smoking_status, smoking_packs_per_day,
                alcohol_use, alcohol_frequency, sexual_activity
            ) VALUES (
                :consultation_id, :smoking_status, :smoking_packs_per_day,
                :alcohol_use, :alcohol_frequency, :sexual_activity
            )
            ON DUPLICATE KEY UPDATE
                smoking_status = VALUES(smoking_status),
                smoking_packs_per_day = VALUES(smoking_packs_per_day),
                alcohol_use = VALUES(alcohol_use),
                alcohol_frequency = VALUES(alcohol_frequency),
                sexual_activity = VALUES(sexual_activity)
        ");

        $stmt->bindParam(":consultation_id", $consultationId);
        $stmt->bindParam(":smoking_status", $data['smoking_status']);
        $stmt->bindParam(":smoking_packs_per_day", $data['smoking_packs_per_day']);
        $stmt->bindParam(":alcohol_use", $data['alcohol_use']);
        $stmt->bindParam(":alcohol_frequency", $data['alcohol_frequency']);
        $stmt->bindParam(":sexual_activity", $data['sexual_activity']);
        $stmt->execute();
    }

    // Insert selected illnesses
    private function insertIllnesses($consultationId, $illnesses) {
        // First, delete existing illness associations
        $stmt = $this->conn->prepare("DELETE FROM tbl_consultation_illnesses WHERE consultation_id = :consultation_id");
        $stmt->bindParam(":consultation_id", $consultationId);
        $stmt->execute();

        // Insert new illness associations
        if (!empty($illnesses)) {
            $stmt = $this->conn->prepare("INSERT INTO tbl_consultation_illnesses (consultation_id, illness_id) VALUES (:consultation_id, :illness_id)");
            foreach ($illnesses as $illness) {
                $stmt->bindParam(":consultation_id", $consultationId);
                $stmt->bindParam(":illness_id", $illness['id']);
                $stmt->execute();
            }
        }
    }

    // Check for abnormal vitals and create alerts
    private function checkAbnormalVitals($consultationId, $data) {
        $alerts = [];

        // Blood pressure check (systolic/diastolic)
        if (!empty($data['blood_pressure_mmHg'])) {
            $bp = explode('/', $data['blood_pressure_mmHg']);
            if (count($bp) === 2) {
                $systolic = intval($bp[0]);
                $diastolic = intval($bp[1]);

                if ($systolic > 140 || $diastolic > 90) {
                    $severity = ($systolic > 180 || $diastolic > 110) ? 'critical' : 'high';
                    $alerts[] = [
                        'vital_type' => 'blood_pressure',
                        'recorded_value' => $data['blood_pressure_mmHg'],
                        'normal_range' => '90-140/60-90 mmHg',
                        'severity' => $severity
                    ];
                }
            }
        }

        // Heart rate check
        if (!empty($data['heart_rate_bpm'])) {
            $hr = intval($data['heart_rate_bpm']);
            if ($hr < 60 || $hr > 100) {
                $severity = ($hr < 50 || $hr > 120) ? 'critical' : 'moderate';
                $alerts[] = [
                    'vital_type' => 'heart_rate',
                    'recorded_value' => $data['heart_rate_bpm'],
                    'normal_range' => '60-100 bpm',
                    'severity' => $severity
                ];
            }
        }

        // Temperature check
        if (!empty($data['temperature_celsius'])) {
            $temp = floatval($data['temperature_celsius']);
            if ($temp < 36.0 || $temp > 37.5) {
                $severity = ($temp < 35.0 || $temp > 39.0) ? 'critical' : 'moderate';
                $alerts[] = [
                    'vital_type' => 'temperature',
                    'recorded_value' => $data['temperature_celsius'],
                    'normal_range' => '36.0-37.5°C',
                    'severity' => $severity
                ];
            }
        }

        // SpO2 check
        if (!empty($data['spo2_percent'])) {
            $spo2 = floatval($data['spo2_percent']);
            if ($spo2 < 95) {
                $severity = ($spo2 < 90) ? 'critical' : 'moderate';
                $alerts[] = [
                    'vital_type' => 'spo2',
                    'recorded_value' => $data['spo2_percent'],
                    'normal_range' => '95-100%',
                    'severity' => $severity
                ];
            }
        }

        // Insert alerts into database
        if (!empty($alerts)) {
            $stmt = $this->conn->prepare("
                INSERT INTO tbl_abnormal_vitals_alerts (
                    consultation_id, vital_type, recorded_value, normal_range, severity
                ) VALUES (
                    :consultation_id, :vital_type, :recorded_value, :normal_range, :severity
                )
            ");

            foreach ($alerts as $alert) {
                $stmt->bindParam(":consultation_id", $consultationId);
                $stmt->bindParam(":vital_type", $alert['vital_type']);
                $stmt->bindParam(":recorded_value", $alert['recorded_value']);
                $stmt->bindParam(":normal_range", $alert['normal_range']);
                $stmt->bindParam(":severity", $alert['severity']);
                $stmt->execute();
            }
        }

        return $alerts;
    }

    // Get triage data for viewing
    public function get_triage_data($appointmentId) {
        try {
            $stmt = $this->conn->prepare("
                SELECT
                    a.appointment_id, a.queue_number, a.appointment_date,
                    p.patient_id, u.name AS patient_name, u.email AS patient_email,
                    p.sex, p.contact_num, p.birthdate, p.age, p.address,
                    ar.reason_name, a.appointment_notes,
                    c.consultation_id, c.nurse_id, c.nurse_completed_at,
                    c.patient_ready_for_doctor, c.nurse_notes,
                    cv.height_cm, cv.weight_kg, cv.blood_pressure_mmHg,
                    cv.heart_rate_bpm, cv.temperature_celsius, cv.spo2_percent,
                    ch.past_medical_history, ch.past_surgical_history,
                    ch.family_history, ch.social_history, ch.current_medications,
                    cl.smoking_status, cl.smoking_packs_per_day,
                    cl.alcohol_use, cl.alcohol_frequency, cl.sexual_activity
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                LEFT JOIN tbl_consultations c ON a.appointment_id = c.appointment_id
                LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
                LEFT JOIN tbl_consultation_history ch ON c.consultation_id = ch.consultation_id
                LEFT JOIN tbl_consultation_lifestyle cl ON c.consultation_id = cl.consultation_id
                WHERE a.appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $appointmentId);
            $stmt->execute();
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($data) {
                echo json_encode(["success" => true, "data" => $data]);
            } else {
                echo json_encode(["success" => false, "message" => "Triage data not found"]);
            }
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Start triage (update status to "With Nurse")
    public function start_triage($appointmentId) {
        try {
            $withNurseId = $this->getAppointmentStatusId('With Nurse');
            if (!$withNurseId) {
                echo json_encode(["success" => false, "message" => "With Nurse status not configured"]);
                return;
            }

            $stmt = $this->conn->prepare("UPDATE tbl_appointments SET status_id = :status_id WHERE appointment_id = :appointment_id");
            $stmt->bindParam(":status_id", $withNurseId);
            $stmt->bindParam(":appointment_id", $appointmentId);
            $stmt->execute();

            echo json_encode(["success" => true, "message" => "Triage started"]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Get appointment reasons (existing method)
    public function get_appointment_reasons() {
        try {
            $stmt = $this->conn->prepare("SELECT reason_id, reason_name, description FROM tbl_appointment_reasons WHERE is_active = 1 ORDER BY reason_name ASC");
            $stmt->execute();
            $reasons = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => $reasons]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Create walk-in appointment (existing method)
    public function walk_in($data) {
        if (empty($data['patient_id'])) {
            echo json_encode(["success" => false, "message" => "patient_id is required"]);
            return;
        }

        $date = date('Y-m-d');
        $waitingForNurseId = $this->getAppointmentStatusId('Waiting for Nurse');
        if (!$waitingForNurseId) {
            echo json_encode(["success" => false, "message" => "Waiting for Nurse status not configured"]);
            return;
        }

        try {
            // Compute next queue number
            $stmt = $this->conn->prepare("SELECT COALESCE(MAX(queue_number), 0) FROM tbl_appointments WHERE appointment_date = :date");
            $stmt->bindParam(":date", $date);
            $stmt->execute();
            $nextQueue = intval($stmt->fetchColumn()) + 1;

            if ($nextQueue > 15) {
                echo json_encode(["success" => false, "message" => "Fully Booked"]);
                return;
            }

            // Insert appointment with "Waiting for Nurse" status
            $stmt = $this->conn->prepare("
                INSERT INTO tbl_appointments (
                    patient_id, appointment_date, queue_number, status_id,
                    appointment_reason_id, appointment_notes
                ) VALUES (
                    :patient_id, :appointment_date, :queue_number, :status_id,
                    :appointment_reason_id, :appointment_notes
                )
            ");

            $reasonId = !empty($data['appointment_reason_id']) ? $data['appointment_reason_id'] : null;
            $notes = $data['appointment_notes'] ?? '';
            if (!empty($data['other_reason_text'])) {
                $notes = "Walk-in reason: " . $data['other_reason_text'] . "\n\n" . $notes;
            }

            $stmt->bindParam(":patient_id", $data['patient_id']);
            $stmt->bindParam(":appointment_date", $date);
            $stmt->bindParam(":queue_number", $nextQueue);
            $stmt->bindParam(":status_id", $waitingForNurseId);
            $stmt->bindParam(":appointment_reason_id", $reasonId);
            $stmt->bindParam(":appointment_notes", $notes);
            $stmt->execute();

            echo json_encode([
                "success" => true,
                "message" => "Walk-in appointment created",
                "queue_number" => $nextQueue
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }
}

// Handle requests
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$nurse = new EnhancedNurseApi();

switch ($operation) {
    case 'get_triage_queue':
        $nurse->get_triage_queue();
        break;
    case 'complete_triage':
        $data = json_decode($json ?: '{}', true);
        $nurse->complete_triage($data);
        break;
    case 'get_triage_data':
        $appointmentId = $_GET['appointment_id'] ?? '';
        $nurse->get_triage_data($appointmentId);
        break;
    case 'start_triage':
        $appointmentId = $_GET['appointment_id'] ?? $_POST['appointment_id'] ?? '';
        $nurse->start_triage($appointmentId);
        break;
    case 'get_appointment_reasons':
        $nurse->get_appointment_reasons();
        break;
    case 'walk_in':
        $data = json_decode($json ?: '{}', true);
        $nurse->walk_in($data);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>
