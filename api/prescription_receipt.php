<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class PrescriptionReceipt
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Get prescription receipt for a specific consultation
    public function get_prescription_receipt($consultationId, $patientId)
    {
        try {
            // Debug logging
            error_log("Getting prescription receipt for consultation_id: $consultationId, patient_id: $patientId");

            if (empty($consultationId) || empty($patientId)) {
                echo json_encode(["success" => false, "message" => "Consultation ID and Patient ID are required"]);
                return;
            }
            // Get consultation details
            $consultationStmt = $this->conn->prepare("
                SELECT c.*, a.appointment_date, a.queue_number,
                       u.name AS patient_name, u.email AS patient_email,
                       du.name AS doctor_name, sp.name AS specialization_name,
                       pay.payment_method, pay.payment_date,
                       pref.payer_account
                FROM tbl_consultations c
                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id
                JOIN tbl_patients p ON c.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
                LEFT JOIN tbl_payments pay ON pay.appointment_id = a.appointment_id
                LEFT JOIN (
                    SELECT pr.payment_id, pr.payer_account
                    FROM tbl_payment_references pr
                    JOIN (
                        SELECT payment_id, MAX(ref_id) AS max_ref
                        FROM tbl_payment_references
                        GROUP BY payment_id
                    ) latest ON pr.payment_id = latest.payment_id AND pr.ref_id = latest.max_ref
                ) pref ON pref.payment_id = pay.payment_id
                WHERE c.consultation_id = :consultation_id AND c.patient_id = :patient_id
            ");
            $consultationStmt->bindParam(":consultation_id", $consultationId);
            $consultationStmt->bindParam(":patient_id", $patientId);
            $consultationStmt->execute();
            $consultation = $consultationStmt->fetch(PDO::FETCH_ASSOC);

            if (!$consultation) {
                echo json_encode(["success" => false, "message" => "Consultation not found or access denied"]);
                return;
            }

            // Get prescriptions with medicine details and pricing
            $prescriptionStmt = $this->conn->prepare("
                SELECT p.*, g.generic_name, m.strength, m.price,
                       f.form_name, mp.packaging_name, mp.description as packaging_description
                FROM tbl_prescriptions p
                JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                JOIN tbl_medicine_generic_names g ON m.generic_id = g.generic_id
                LEFT JOIN tbl_medicine_forms f ON m.form_id = f.form_id
                LEFT JOIN tbl_medicine_packaging mp ON p.packaging_unit_id = mp.packaging_id
                WHERE p.consultation_id = :consultation_id
            ");
            $prescriptionStmt->bindParam(":consultation_id", $consultationId);
            $prescriptionStmt->execute();
            $prescriptions = $prescriptionStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get lab requests with pricing from database (with fallback pricing)
            $labRequestStmt = $this->conn->prepare("
                SELECT lr.*, ltt.type_name, ltt.description,
                       COALESCE(ltt.price,
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
                WHERE lr.appointment_id = :appointment_id
            ");
            $labRequestStmt->bindParam(":appointment_id", $consultation['appointment_id']);
            $labRequestStmt->execute();
            $labRequests = $labRequestStmt->fetchAll(PDO::FETCH_ASSOC);

            // Debug logging
            error_log("Found " . count($labRequests) . " lab requests for appointment_id: " . $consultation['appointment_id']);

            // Calculate total cost for prescriptions
            $totalPrescriptionCost = 0;
            $prescriptionDetails = [];

            foreach ($prescriptions as $prescription) {
                $quantity = $prescription['quantity'] ?? 1; // Default to 1 if not specified
                // Apply standardized multipliers by packaging unit (no config table)
                $unit = isset($prescription['packaging_unit']) ? $prescription['packaging_unit'] : 'unit';
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
                $cost = ((float)$prescription['price']) * (int)$quantity * $multiplier;
                $totalPrescriptionCost += $cost;

                $prescriptionDetails[] = [
                    'generic_name' => $prescription['generic_name'],
                    'strength' => $prescription['strength'] ?? ($prescription['weight'] ?? 'N/A'),
                    'form' => $prescription['form_name'] ?? 'N/A',
                    'dosage' => $prescription['dosage'],
                    'frequency' => $prescription['frequency'],
                    'duration' => $prescription['duration'],
                    'packaging_unit' => $prescription['packaging_unit'] ?? 'tablet',
                    'packaging_name' => $prescription['packaging_name'] ?? 'tablet',
                    'packaging_description' => $prescription['packaging_description'] ?? 'Individual tablet/piece',
                    'instructions' => $prescription['instructions'],
                    'unit_price' => floatval($prescription['price']),
                    'quantity' => intval($quantity),
                    'total_cost' => floatval($cost)
                ];
            }

            // Calculate total cost for lab requests
            $totalLabCost = 0;
            $labRequestDetails = [];

            foreach ($labRequests as $labRequest) {
                $totalLabCost += $labRequest['price'];
                $labRequestDetails[] = [
                    'type_name' => $labRequest['type_name'],
                    'description' => $labRequest['description'],
                    'request_text' => $labRequest['request_text'],
                    'price' => floatval($labRequest['price'])
                ];
            }

            // Total cost (prescriptions + lab requests)
            $totalCost = $totalPrescriptionCost + $totalLabCost;

            // Generate receipt number
            $receiptNumber = 'RX-' . date('Ymd') . '-' . str_pad($consultationId, 4, '0', STR_PAD_LEFT);

            $receipt = [
                'receipt_number' => $receiptNumber,
                'consultation_date' => $consultation['appointment_date'],
                'patient_name' => $consultation['patient_name'],
                'patient_email' => $consultation['patient_email'],
                'doctor_name' => $consultation['doctor_name'],
                'specialization' => $consultation['specialization_name'],
                'diagnosis' => $consultation['diagnosis'],
                'consultation_notes' => $consultation['consultation_notes'],
                'appointment_date' => $consultation['appointment_date'],
                'payment_method' => $consultation['payment_method'] ?? null,
                'payer_account' => $consultation['payer_account'] ?? null,
                'prescriptions' => $prescriptionDetails,
                'lab_requests' => $labRequestDetails,
                'prescription_subtotal' => floatval($totalPrescriptionCost),
                'lab_subtotal' => floatval($totalLabCost),
                'total_amount' => floatval($totalCost),
                'generated_date' => date('Y-m-d H:i:s')
            ];

            echo json_encode([
                "success" => true,
                "receipt" => $receipt
            ]);

        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
        }
    }

    // Get all prescription receipts for a patient
    public function get_patient_receipts($patientId)
    {
        try {
            $stmt = $this->conn->prepare("
                SELECT DISTINCT c.consultation_id, c.appointment_id, c.diagnosis,
                       a.appointment_date, a.queue_number,
                       du.name AS doctor_name, sp.name AS specialization_name,
                       COUNT(p.prescription_id) as prescription_count,
                       SUM(m.price) as estimated_total
                FROM tbl_consultations c
                JOIN tbl_appointments a ON c.appointment_id = a.appointment_id
                JOIN tbl_doctors d ON c.doctor_id = d.doctor_id
                JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
                LEFT JOIN tbl_prescriptions p ON c.consultation_id = p.consultation_id
                LEFT JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                WHERE c.patient_id = :patient_id
                GROUP BY c.consultation_id
                ORDER BY a.appointment_date DESC
            ");
            $stmt->bindParam(":patient_id", $patientId);
            $stmt->execute();
            $receipts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "receipts" => $receipts
            ]);

        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => $e->getMessage()
            ]);
        }
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$consultationId = $_GET['consultation_id'] ?? '';
$patientId = $_GET['patient_id'] ?? '';

$svc = new PrescriptionReceipt();

switch ($operation) {
    case 'get_receipt':
        if (!$consultationId || !$patientId) {
            echo json_encode(["success" => false, "message" => "consultation_id and patient_id are required."]);
            break;
        }
        $svc->get_prescription_receipt($consultationId, $patientId);
        break;
    case 'get_patient_receipts':
        if (!$patientId) {
            echo json_encode(["success" => false, "message" => "patient_id is required."]);
            break;
        }
        $svc->get_patient_receipts($patientId);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>
