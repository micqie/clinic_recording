<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class ValidationRules {
    private $conn;

    public function __construct() {
        include "connection.php";
        $this->conn = $conn;
    }

    // Validate if patient can be forwarded to doctor
    public function validate_patient_forwarding($appointmentId) {
        try {
            // Check if nurse assessment exists
            $stmt = $this->conn->prepare("
                SELECT 
                    na.vitals_completed, 
                    na.history_completed, 
                    na.forwarded_to_doctor,
                    a.appointment_id,
                    p.patient_name
                FROM tbl_nurse_assessments na
                JOIN tbl_appointments a ON na.appointment_id = a.appointment_id
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                WHERE na.appointment_id = :aid
            ");
            $stmt->bindParam(":aid", $appointmentId);
            $stmt->execute();
            $assessment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$assessment) {
                return [
                    "valid" => false,
                    "message" => "Nurse assessment not found for this patient",
                    "errors" => ["Nurse assessment record missing"]
                ];
            }

            if ($assessment['forwarded_to_doctor']) {
                return [
                    "valid" => false,
                    "message" => "Patient has already been forwarded to doctor",
                    "errors" => ["Patient already forwarded"]
                ];
            }

            $errors = [];
            $warnings = [];

            // Check vitals completion
            if (!$assessment['vitals_completed']) {
                $errors[] = "Vital signs must be recorded before forwarding to doctor";
            }

            // Check medical history completion
            if (!$assessment['history_completed']) {
                $errors[] = "Medical history must be completed before forwarding to doctor";
            }

            // Check if vital signs data exists
            $vitalsStmt = $this->conn->prepare("
                SELECT cv.*, c.consultation_id
                FROM tbl_consultations c
                LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
                WHERE c.appointment_id = :aid
            ");
            $vitalsStmt->bindParam(":aid", $appointmentId);
            $vitalsStmt->execute();
            $vitals = $vitalsStmt->fetch(PDO::FETCH_ASSOC);

            if ($vitals) {
                // Check if essential vitals are recorded
                $essentialVitals = ['height_cm', 'weight_kg', 'blood_pressure_mmHg'];
                $missingVitals = [];
                
                foreach ($essentialVitals as $vital) {
                    if (empty($vitals[$vital])) {
                        $missingVitals[] = $vital;
                    }
                }

                if (!empty($missingVitals)) {
                    $errors[] = "Essential vital signs missing: " . implode(', ', $missingVitals);
                }

                // Check for abnormal values (warnings)
                if (!empty($vitals['blood_pressure_mmHg'])) {
                    $bp = $vitals['blood_pressure_mmHg'];
                    if (preg_match('/(\d+)\/(\d+)/', $bp, $matches)) {
                        $systolic = intval($matches[1]);
                        $diastolic = intval($matches[2]);
                        
                        if ($systolic > 140 || $diastolic > 90) {
                            $warnings[] = "High blood pressure detected: {$bp}";
                        }
                        if ($systolic < 90 || $diastolic < 60) {
                            $warnings[] = "Low blood pressure detected: {$bp}";
                        }
                    }
                }

                if (!empty($vitals['heart_rate_bpm'])) {
                    $hr = intval($vitals['heart_rate_bpm']);
                    if ($hr > 100) {
                        $warnings[] = "Elevated heart rate: {$hr} bpm";
                    }
                    if ($hr < 60) {
                        $warnings[] = "Low heart rate: {$hr} bpm";
                    }
                }

                if (!empty($vitals['spo2_percent'])) {
                    $spo2 = floatval($vitals['spo2_percent']);
                    if ($spo2 < 95) {
                        $warnings[] = "Low oxygen saturation: {$spo2}%";
                    }
                }
            }

            // Check medical history data
            $historyStmt = $this->conn->prepare("
                SELECT ch.*, c.consultation_id
                FROM tbl_consultations c
                LEFT JOIN tbl_consultation_history ch ON c.consultation_id = ch.consultation_id
                WHERE c.appointment_id = :aid
            ");
            $historyStmt->bindParam(":aid", $appointmentId);
            $historyStmt->execute();
            $history = $historyStmt->fetch(PDO::FETCH_ASSOC);

            if ($history) {
                // Check if essential history fields are filled
                $essentialHistory = ['present_illness'];
                $missingHistory = [];
                
                foreach ($essentialHistory as $field) {
                    if (empty($history[$field])) {
                        $missingHistory[] = $field;
                    }
                }

                if (!empty($missingHistory)) {
                    $errors[] = "Essential medical history missing: " . implode(', ', $missingHistory);
                }
            }

            $isValid = empty($errors);

            return [
                "valid" => $isValid,
                "message" => $isValid ? "Patient can be forwarded to doctor" : "Patient cannot be forwarded due to missing requirements",
                "errors" => $errors,
                "warnings" => $warnings,
                "patient_name" => $assessment['patient_name']
            ];

        } catch (PDOException $e) {
            return [
                "valid" => false,
                "message" => "Database error during validation",
                "errors" => ["Database error: " . $e->getMessage()]
            ];
        }
    }

    // Get validation summary for a patient
    public function get_validation_summary($appointmentId) {
        try {
            $stmt = $this->conn->prepare("
                SELECT 
                    na.vitals_completed,
                    na.history_completed,
                    na.forwarded_to_doctor,
                    na.assessment_notes,
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
                    a.appointment_id,
                    p.patient_name
                FROM tbl_nurse_assessments na
                JOIN tbl_appointments a ON na.appointment_id = a.appointment_id
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_consultations c ON a.appointment_id = c.appointment_id
                LEFT JOIN tbl_consultation_vitals cv ON c.consultation_id = cv.consultation_id
                LEFT JOIN tbl_consultation_history ch ON c.consultation_id = ch.consultation_id
                WHERE na.appointment_id = :aid
            ");
            $stmt->bindParam(":aid", $appointmentId);
            $stmt->execute();
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return [
                    "success" => false,
                    "message" => "Patient assessment not found"
                ];
            }

            // Calculate completion percentage
            $totalFields = 8; // Total number of required fields
            $completedFields = 0;

            if ($data['vitals_completed']) $completedFields++;
            if ($data['history_completed']) $completedFields++;
            if (!empty($data['height_cm'])) $completedFields++;
            if (!empty($data['weight_kg'])) $completedFields++;
            if (!empty($data['blood_pressure_mmHg'])) $completedFields++;
            if (!empty($data['present_illness'])) $completedFields++;
            if (!empty($data['past_medical_history'])) $completedFields++;
            if (!empty($data['current_medications'])) $completedFields++;

            $completionPercentage = round(($completedFields / $totalFields) * 100);

            return [
                "success" => true,
                "data" => [
                    "patient_name" => $data['patient_name'],
                    "completion_percentage" => $completionPercentage,
                    "vitals_completed" => $data['vitals_completed'],
                    "history_completed" => $data['history_completed'],
                    "forwarded_to_doctor" => $data['forwarded_to_doctor'],
                    "assessment_notes" => $data['assessment_notes'],
                    "vital_signs" => [
                        "height_cm" => $data['height_cm'],
                        "weight_kg" => $data['weight_kg'],
                        "blood_pressure_mmHg" => $data['blood_pressure_mmHg'],
                        "heart_rate_bpm" => $data['heart_rate_bpm'],
                        "spo2_percent" => $data['spo2_percent']
                    ],
                    "medical_history" => [
                        "present_illness" => $data['present_illness'],
                        "past_medical_history" => $data['past_medical_history'],
                        "past_surgical_history" => $data['past_surgical_history'],
                        "family_history" => $data['family_history'],
                        "social_history" => $data['social_history'],
                        "current_medications" => $data['current_medications']
                    ]
                ]
            ];

        } catch (PDOException $e) {
            return [
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ];
        }
    }

    // Get all patients with validation status
    public function get_patients_validation_status() {
        try {
            $stmt = $this->conn->prepare("
                SELECT 
                    a.appointment_id,
                    a.queue_number,
                    p.patient_name,
                    na.vitals_completed,
                    na.history_completed,
                    na.forwarded_to_doctor,
                    na.forwarded_at,
                    CASE 
                        WHEN na.forwarded_to_doctor = 1 THEN 'Ready for Doctor'
                        WHEN na.vitals_completed = 1 AND na.history_completed = 1 THEN 'Ready to Forward'
                        WHEN na.vitals_completed = 1 OR na.history_completed = 1 THEN 'Partially Complete'
                        ELSE 'Incomplete'
                    END as validation_status
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_nurse_assessments na ON a.appointment_id = na.appointment_id
                WHERE a.appointment_date = CURDATE()
                AND a.status_id IN (
                    SELECT status_id FROM tbl_status 
                    WHERE status_name IN ('Waiting for Nurse', 'Nurse Assessment', 'Waiting for Doctor')
                )
                ORDER BY a.queue_number ASC
            ");
            $stmt->execute();
            $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                "success" => true,
                "data" => $patients
            ];

        } catch (PDOException $e) {
            return [
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ];
        }
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new ValidationRules();

switch ($operation) {
    case 'validate_patient_forwarding':
        $appointmentId = $_GET['appointment_id'] ?? '';
        if (!$appointmentId) {
            echo json_encode(["success" => false, "message" => "appointment_id is required"]);
            break;
        }
        $result = $svc->validate_patient_forwarding($appointmentId);
        echo json_encode($result);
        break;
    case 'get_validation_summary':
        $appointmentId = $_GET['appointment_id'] ?? '';
        if (!$appointmentId) {
            echo json_encode(["success" => false, "message" => "appointment_id is required"]);
            break;
        }
        $result = $svc->get_validation_summary($appointmentId);
        echo json_encode($result);
        break;
    case 'get_patients_validation_status':
        $result = $svc->get_patients_validation_status();
        echo json_encode($result);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>
