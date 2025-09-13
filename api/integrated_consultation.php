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

            // Create consultation (core fields only)
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

            // Collect new history and vitals fields (to be stored in separate tables)
            $presentIllness = $data['present_illness'] ?? null;
            $pastMedical = $data['past_medical_history'] ?? null;
            $pastSurgical = $data['past_surgical_history'] ?? null;
            $familyHistory = $data['family_history'] ?? null;
            $socialHistory = $data['social_history'] ?? null;
            $currentMeds = $data['current_medications'] ?? null;

            $heightCm = isset($data['height_cm']) && $data['height_cm'] !== '' ? $data['height_cm'] : null;
            $weightKg = isset($data['weight_kg']) && $data['weight_kg'] !== '' ? $data['weight_kg'] : null;
            $bp = $data['blood_pressure_mmHg'] ?? null;
            $hr = isset($data['heart_rate_bpm']) && $data['heart_rate_bpm'] !== '' ? $data['heart_rate_bpm'] : null;
            $spo2 = isset($data['spo2_percent']) && $data['spo2_percent'] !== '' ? $data['spo2_percent'] : null;
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

            // Insert history if any provided
            $hasHistory = $presentIllness || $pastMedical || $pastSurgical || $familyHistory || $socialHistory || $currentMeds;
            if ($hasHistory) {
                $histStmt = $this->conn->prepare("
                    INSERT INTO tbl_consultation_history (
                        consultation_id, present_illness, past_medical_history, past_surgical_history, family_history,
                        social_history, current_medications
                    ) VALUES (
                        :consultation_id, :present_illness, :past_medical_history, :past_surgical_history, :family_history,
                        :social_history, :current_medications
                    )
                ");
                $histStmt->bindValue(":consultation_id", $consultationId);
                $histStmt->bindValue(":present_illness", $presentIllness);
                $histStmt->bindValue(":past_medical_history", $pastMedical);
                $histStmt->bindValue(":past_surgical_history", $pastSurgical);
                $histStmt->bindValue(":family_history", $familyHistory);
                $histStmt->bindValue(":social_history", $socialHistory);
                $histStmt->bindValue(":current_medications", $currentMeds);
                if (!$histStmt->execute()) {
                    $errorInfo = $histStmt->errorInfo();
                    throw new Exception("Failed to insert consultation history: " . ($errorInfo[2] ?? 'Unknown error'));
                }
            }

            // Insert lifestyle if provided
            $smokingStatus = $data['smoking_status'] ?? null;
            $smokingPPD = $data['smoking_packs_per_day'] ?? null;
            $alcoholUse = $data['alcohol_use'] ?? null;
            $alcoholFreq = $data['alcohol_frequency'] ?? null;
            $sexualActivity = $data['sexual_activity'] ?? null;
            if ($smokingStatus !== null || $smokingPPD !== null || $alcoholUse !== null || $alcoholFreq !== null || $sexualActivity !== null) {
                $lifeStmt = $this->conn->prepare("
                    INSERT INTO tbl_consultation_lifestyle (consultation_id, smoking_status, smoking_packs_per_day, alcohol_use, alcohol_frequency, sexual_activity)
                    VALUES (:cid, :smoking_status, :smoking_packs_per_day, :alcohol_use, :alcohol_frequency, :sexual_activity)
                ");
                $lifeStmt->bindValue(":cid", $consultationId);
                $lifeStmt->bindValue(":smoking_status", $smokingStatus);
                $lifeStmt->bindValue(":smoking_packs_per_day", $smokingPPD);
                $lifeStmt->bindValue(":alcohol_use", $alcoholUse);
                $lifeStmt->bindValue(":alcohol_frequency", $alcoholFreq);
                $lifeStmt->bindValue(":sexual_activity", $sexualActivity);
                if (!$lifeStmt->execute()) {
                    $errorInfo = $lifeStmt->errorInfo();
                    throw new Exception("Failed to insert lifestyle: " . ($errorInfo[2] ?? 'Unknown error'));
                }
            }

            // Insert vitals if any provided
            $hasVitals = $heightCm !== null || $weightKg !== null || $bp !== null || $hr !== null || $spo2 !== null;
            if ($hasVitals) {
                $vitStmt = $this->conn->prepare("
                    INSERT INTO tbl_consultation_vitals (
                        consultation_id, height_cm, weight_kg, blood_pressure_mmHg, heart_rate_bpm, spo2_percent
                    ) VALUES (
                        :consultation_id, :height_cm, :weight_kg, :blood_pressure_mmHg, :heart_rate_bpm, :spo2_percent
                    )
                ");
                $vitStmt->bindValue(":consultation_id", $consultationId);
                $vitStmt->bindValue(":height_cm", $heightCm);
                $vitStmt->bindValue(":weight_kg", $weightKg);
                $vitStmt->bindValue(":blood_pressure_mmHg", $bp);
                $vitStmt->bindValue(":heart_rate_bpm", $hr);
                $vitStmt->bindValue(":spo2_percent", $spo2);
                if (!$vitStmt->execute()) {
                    $errorInfo = $vitStmt->errorInfo();
                    throw new Exception("Failed to insert consultation vitals: " . ($errorInfo[2] ?? 'Unknown error'));
                }
            }

            // Insert clinical summary if provided
            $symptomsText = $data['symptoms_text'] ?? null;
            $finalDiagnosis = $data['final_diagnosis'] ?? null;
            if ($symptomsText !== null || $finalDiagnosis !== null) {
                $sumStmt = $this->conn->prepare("
                    INSERT INTO tbl_consultation_summary (consultation_id, symptoms_text, final_diagnosis)
                    VALUES (:cid, :symptoms_text, :final_diagnosis)
                ");
                $sumStmt->bindValue(":cid", $consultationId);
                $sumStmt->bindValue(":symptoms_text", $symptomsText);
                $sumStmt->bindValue(":final_diagnosis", $finalDiagnosis);
                if (!$sumStmt->execute()) {
                    $errorInfo = $sumStmt->errorInfo();
                    throw new Exception("Failed to insert consultation summary: " . ($errorInfo[2] ?? 'Unknown error'));
                }
            }

            // Create prescriptions if provided
            if (!empty($data['prescriptions']) && is_array($data['prescriptions'])) {
                error_log("Creating " . count($data['prescriptions']) . " prescriptions");
                foreach ($data['prescriptions'] as $prescription) {
                    // Validate required prescription fields
                    if (empty($prescription['medicine_id']) || empty($prescription['quantity']) || empty($prescription['packaging_unit']) || empty($prescription['frequency']) || empty($prescription['duration'])) {
                        throw new Exception("Missing required prescription fields: medicine_id, quantity, packaging_unit, frequency, duration");
                    }

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
                    $prescriptionStmt->bindValue(":dosage", $prescription['dosage'] ?? 'N/A');
                    $prescriptionStmt->bindValue(":frequency", $prescription['frequency']);
                    $prescriptionStmt->bindValue(":duration", $prescription['duration']);
                    $prescriptionStmt->bindValue(":quantity", (int)$prescription['quantity'], PDO::PARAM_INT);
                    $prescriptionStmt->bindValue(":packaging_unit", $prescription['packaging_unit']);

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

            // Create lab results if provided
            if (!empty($data['lab_results']) && is_array($data['lab_results'])) {
                error_log("Creating " . count($data['lab_results']) . " lab results");
                foreach ($data['lab_results'] as $labResult) {
                    // Validate required lab result fields
                    if (empty($labResult['lab_request_id']) || empty($labResult['result_text']) || empty($labResult['status_id'])) {
                        throw new Exception("Missing required lab result fields: lab_request_id, result_text, status_id");
                    }

                    $labResultStmt = $this->conn->prepare("
                        INSERT INTO tbl_lab_results (
                            lab_request_id, patient_id, doctor_id, result_text, uploaded_by, status_id
                        ) VALUES (
                            :lab_request_id, :patient_id, :doctor_id, :result_text, :uploaded_by, :status_id
                        )
                    ");

                    $labResultStmt->bindValue(":lab_request_id", $labResult['lab_request_id']);
                    $labResultStmt->bindValue(":patient_id", $data['patient_id']);
                    $labResultStmt->bindValue(":doctor_id", $data['doctor_id']);
                    $labResultStmt->bindValue(":result_text", $labResult['result_text']);
                    $labResultStmt->bindValue(":uploaded_by", $data['doctor_id']); // Doctor is uploading the result
                    $labResultStmt->bindValue(":status_id", $labResult['status_id']);

                    if (!$labResultStmt->execute()) {
                        $errorInfo = $labResultStmt->errorInfo();
                        error_log("Failed to create lab result: " . json_encode($errorInfo));
                        throw new Exception("Failed to create lab result: " . ($errorInfo[2] ?? 'Unknown error'));
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
                SELECT c.*, a.appointment_date, u.name AS patient_name, du.name AS doctor_name,
                       h.present_illness, h.past_medical_history, h.past_surgical_history, h.family_history,
                       h.social_history, h.current_medications,
                       v.height_cm, v.weight_kg, v.blood_pressure_mmHg, v.heart_rate_bpm, v.spo2_percent,
                       s.symptoms_text, s.final_diagnosis,
                       lf.smoking_status, lf.smoking_packs_per_day, lf.alcohol_use, lf.alcohol_frequency, lf.sexual_activity
                FROM tbl_consultations c
                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id
                JOIN tbl_patients p ON c.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_consultation_history h ON h.consultation_id = c.consultation_id
                LEFT JOIN tbl_consultation_vitals v ON v.consultation_id = c.consultation_id
                LEFT JOIN tbl_consultation_summary s ON s.consultation_id = c.consultation_id
                LEFT JOIN tbl_consultation_lifestyle lf ON lf.consultation_id = c.consultation_id
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
                SELECT p.*, g.generic_name, m.strength, f.form_name, m.price,
                       mp.packaging_name, mp.description as packaging_description
                FROM tbl_prescriptions p
                JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                JOIN tbl_medicine_generic_names g ON m.generic_id = g.generic_id
                JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                LEFT JOIN tbl_medicine_packaging mp ON p.packaging_unit_id = mp.packaging_id
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
                    SELECT p.quantity, p.packaging_unit, m.price, mp.packaging_name, mp.description as packaging_description
                    FROM tbl_prescriptions p
                    JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                    LEFT JOIN tbl_medicine_packaging mp ON p.packaging_unit_id = mp.packaging_id
                    WHERE p.consultation_id = :cid
                ");
                $pstmt->bindParam(":cid", $c['consultation_id']);
                $pstmt->execute();
                $rows = $pstmt->fetchAll(PDO::FETCH_ASSOC);

                $prescriptionCount = count($rows);
                $prescriptionSubtotal = 0.0;
                $unitToQty = [];
                foreach ($rows as $r) {
                    $qty = isset($r['quantity']) && $r['quantity'] !== null ? (int)$r['quantity'] : 1;
                    $unit = $r['packaging_unit'] ?? 'unit';
                    $packagingName = $r['packaging_name'] ?? $unit;
                    // Apply standardized multipliers by packaging unit (no config table)
                    $multiplier = 1.0;
                    switch ($unit) {
                        case 'box':
                            $multiplier = 1.20; break;
                        case 'bottle':
                            $multiplier = 1.15; break;
                        case 'blister pack':
                        case 'strip':
                            $multiplier = 1.10; break;
                        case 'sachet':
                            $multiplier = 1.05; break;
                        case 'vial':
                            $multiplier = 1.15; break;
                        case 'tube':
                            $multiplier = 1.10; break;
                        default:
                            $multiplier = 1.0;
                    }
                    $prescriptionSubtotal += ((float)$r['price']) * $qty * $multiplier;
                    if (!isset($unitToQty[$packagingName])) $unitToQty[$packagingName] = 0;
                    $unitToQty[$packagingName] += $qty;
                }

                // Compute lab subtotal for this consultation (based on appointment)
                $labSubtotal = 0.0;
                $lstmt = $this->conn->prepare("
                    SELECT COALESCE(ltt.price,
                           CASE
                               WHEN ltt.type_name LIKE '%Blood%' THEN 500.00
                               WHEN ltt.type_name LIKE '%Urine%' THEN 300.00
                               WHEN ltt.type_name LIKE '%Liver%' THEN 800.00
                               WHEN ltt.type_name LIKE '%Lipid%' THEN 600.00
                               ELSE 400.00
                           END
                       ) as price
                    FROM tbl_lab_requests lr
                    JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
                    WHERE lr.appointment_id = :aid
                ");
                $lstmt->bindParam(":aid", $c['appointment_id']);
                $lstmt->execute();
                $lrows = $lstmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($lrows as $lr) {
                    $labSubtotal += (float)$lr['price'];
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
                $c['prescription_subtotal'] = (float)number_format($prescriptionSubtotal, 2, '.', '');
                $c['lab_subtotal'] = (float)number_format($labSubtotal, 2, '.', '');
                $c['estimated_total'] = (float)number_format(($prescriptionSubtotal + $labSubtotal), 2, '.', '');
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
            // Update core consultation fields
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
            $stmt->execute();

            // Upsert history table
            $histUpsert = $this->conn->prepare("
                INSERT INTO tbl_consultation_history (
                    consultation_id, present_illness, past_medical_history, past_surgical_history, family_history,
                    social_history, current_medications
                ) VALUES (
                    :consultation_id, :present_illness, :past_medical_history, :past_surgical_history, :family_history,
                    :social_history, :current_medications
                )
                ON DUPLICATE KEY UPDATE
                    present_illness = VALUES(present_illness),
                    past_medical_history = VALUES(past_medical_history),
                    past_surgical_history = VALUES(past_surgical_history),
                    family_history = VALUES(family_history),
                    social_history = VALUES(social_history),
                    current_medications = VALUES(current_medications)
            ");
            $histUpsert->bindValue(":consultation_id", $consultationId);
            $histUpsert->bindValue(":present_illness", $data['present_illness'] ?? null);
            $histUpsert->bindValue(":past_medical_history", $data['past_medical_history'] ?? null);
            $histUpsert->bindValue(":past_surgical_history", $data['past_surgical_history'] ?? null);
            $histUpsert->bindValue(":family_history", $data['family_history'] ?? null);
            $histUpsert->bindValue(":social_history", $data['social_history'] ?? null);
            $histUpsert->bindValue(":current_medications", $data['current_medications'] ?? null);
            $histUpsert->execute();

            // Upsert lifestyle table
            $lifeUpsert = $this->conn->prepare("
                INSERT INTO tbl_consultation_lifestyle (
                    consultation_id, smoking_status, smoking_packs_per_day, alcohol_use, alcohol_frequency, sexual_activity
                ) VALUES (
                    :consultation_id, :smoking_status, :smoking_packs_per_day, :alcohol_use, :alcohol_frequency, :sexual_activity
                )
                ON DUPLICATE KEY UPDATE
                    smoking_status = VALUES(smoking_status),
                    smoking_packs_per_day = VALUES(smoking_packs_per_day),
                    alcohol_use = VALUES(alcohol_use),
                    alcohol_frequency = VALUES(alcohol_frequency),
                    sexual_activity = VALUES(sexual_activity)
            ");
            $lifeUpsert->bindValue(":consultation_id", $consultationId);
            $lifeUpsert->bindValue(":smoking_status", $data['smoking_status'] ?? null);
            $lifeUpsert->bindValue(":smoking_packs_per_day", $data['smoking_packs_per_day'] ?? null);
            $lifeUpsert->bindValue(":alcohol_use", $data['alcohol_use'] ?? null);
            $lifeUpsert->bindValue(":alcohol_frequency", $data['alcohol_frequency'] ?? null);
            $lifeUpsert->bindValue(":sexual_activity", $data['sexual_activity'] ?? null);
            $lifeUpsert->execute();

            // Upsert vitals table
            $vitUpsert = $this->conn->prepare("
                INSERT INTO tbl_consultation_vitals (
                    consultation_id, height_cm, weight_kg, blood_pressure_mmHg, heart_rate_bpm, spo2_percent
                ) VALUES (
                    :consultation_id, :height_cm, :weight_kg, :blood_pressure_mmHg, :heart_rate_bpm, :spo2_percent
                )
                ON DUPLICATE KEY UPDATE
                    height_cm = VALUES(height_cm),
                    weight_kg = VALUES(weight_kg),
                    blood_pressure_mmHg = VALUES(blood_pressure_mmHg),
                    heart_rate_bpm = VALUES(heart_rate_bpm),
                    spo2_percent = VALUES(spo2_percent)
            ");
            $vitUpsert->bindValue(":consultation_id", $consultationId);
            $vitUpsert->bindValue(":height_cm", isset($data['height_cm']) && $data['height_cm'] !== '' ? $data['height_cm'] : null);
            $vitUpsert->bindValue(":weight_kg", isset($data['weight_kg']) && $data['weight_kg'] !== '' ? $data['weight_kg'] : null);
            $vitUpsert->bindValue(":blood_pressure_mmHg", $data['blood_pressure_mmHg'] ?? null);
            $vitUpsert->bindValue(":heart_rate_bpm", isset($data['heart_rate_bpm']) && $data['heart_rate_bpm'] !== '' ? $data['heart_rate_bpm'] : null);
            $vitUpsert->bindValue(":spo2_percent", isset($data['spo2_percent']) && $data['spo2_percent'] !== '' ? $data['spo2_percent'] : null);
            $vitUpsert->execute();

            // Upsert summary table
            $sumUpsert = $this->conn->prepare("
                INSERT INTO tbl_consultation_summary (consultation_id, symptoms_text, final_diagnosis)
                VALUES (:cid, :symptoms_text, :final_diagnosis)
                ON DUPLICATE KEY UPDATE
                    symptoms_text = VALUES(symptoms_text),
                    final_diagnosis = VALUES(final_diagnosis)
            ");
            $sumUpsert->bindValue(":cid", $consultationId);
            $sumUpsert->bindValue(":symptoms_text", $data['symptoms_text'] ?? null);
            $sumUpsert->bindValue(":final_diagnosis", $data['final_diagnosis'] ?? null);
            $sumUpsert->execute();

            echo json_encode([
                "success" => true,
                "message" => "Consultation updated successfully"
            ]);

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
