<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Payments
{
    private function getStatusId($conn, $statusName, $typeName)
    {
        $stmt = $conn->prepare("SELECT s.status_id FROM tbl_status s JOIN tbl_status_type t ON s.status_type_id = t.status_type_id WHERE s.status_name = :name AND t.status_type_name = :type LIMIT 1");
        $stmt->bindParam(":name", $statusName);
        $stmt->bindParam(":type", $typeName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }

    // Ensure there is an Unpaid payment per appointment for any open charges (prescriptions + lab requests).
    // Returns a summary of created/updated pending payments for the patient.
    function ensurePendingForPatient($patient_id)
    {
        include "connection.php";
        if (empty($patient_id)) {
            return ['success' => false, 'message' => 'patient_id is required'];
        }
        try {
            $unpaidId = $this->getStatusId($conn, 'Unpaid', 'Payment');
            if (!$unpaidId) { return ['success' => false, 'message' => 'Unpaid status missing']; }

            // Pull appointments (Confirmed/Completed) for the patient with any billable items
            $sql = "
                SELECT a.appointment_id, a.appointment_date
                FROM tbl_appointments a
                JOIN tbl_status st ON a.status_id = st.status_id
                WHERE a.patient_id = :pid
                  AND st.status_name IN ('Confirmed','Completed')
                  AND (
                      EXISTS (
                          SELECT 1 FROM tbl_prescriptions pr WHERE pr.appointment_id = a.appointment_id
                      ) OR EXISTS (
                          SELECT 1 FROM tbl_lab_requests lr WHERE lr.appointment_id = a.appointment_id
                      )
                  )
                ORDER BY a.appointment_date DESC, a.appointment_id DESC";
            $a = $conn->prepare($sql);
            $a->bindParam(":pid", $patient_id);
            $a->execute();
            $appointments = $a->fetchAll(PDO::FETCH_ASSOC);

            $created = 0; $updated = 0; $items = [];

            foreach ($appointments as $row) {
                $aid = $row['appointment_id'];
                // Prescriptions subtotal
                $pstmt = $conn->prepare("SELECT COALESCE(SUM(m.price * COALESCE(p.quantity,1)),0)
                                         FROM tbl_prescriptions p JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                                         WHERE p.appointment_id = :aid");
                $pstmt->bindParam(":aid", $aid);
                $pstmt->execute();
                $prescSubtotal = (float)$pstmt->fetchColumn();

                // Lab requests subtotal
                $lstmt = $conn->prepare("SELECT COALESCE(SUM(tt.price),0)
                                         FROM tbl_lab_requests lr
                                         LEFT JOIN tbl_lab_test_types tt ON lr.lab_test_type_id = tt.lab_test_type_id
                                         WHERE lr.appointment_id = :aid");
                $lstmt->bindParam(":aid", $aid);
                $lstmt->execute();
                $labSubtotal = (float)$lstmt->fetchColumn();

                $total = $prescSubtotal + $labSubtotal; // consultation fee optional; 0 by default
                if ($total <= 0) { continue; }

                // Check latest payment for this appointment
                $find = $conn->prepare("SELECT payment_id, amount, status_id FROM tbl_payments WHERE appointment_id = :aid AND patient_id = :pid ORDER BY payment_id DESC LIMIT 1");
                $find->bindParam(":aid", $aid);
                $find->bindParam(":pid", $patient_id);
                $find->execute();
                $existing = $find->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    // If paid, skip; if unpaid and amount differs, update
                    if ((int)$existing['status_id'] === $unpaidId) {
                        if ((float)$existing['amount'] !== $total) {
                            $upd = $conn->prepare("UPDATE tbl_payments SET amount = :amt WHERE payment_id = :pid");
                            $upd->bindParam(":amt", $total);
                            $upd->bindParam(":pid", $existing['payment_id']);
                            $upd->execute();
                            $updated++;
                            $items[] = ['appointment_id' => $aid, 'payment_id' => $existing['payment_id'], 'action' => 'updated', 'amount' => $total];
                        }
                    }
                } else {
                    // Insert new Unpaid payment
                    $ins = $conn->prepare("INSERT INTO tbl_payments (appointment_id, patient_id, amount, payment_method, status_id) VALUES (:aid, :pid, :amt, 'Walk-in', :sid)");
                    $ins->bindParam(":aid", $aid);
                    $ins->bindParam(":pid", $patient_id);
                    $ins->bindParam(":amt", $total);
                    $ins->bindParam(":sid", $unpaidId);
                    $ins->execute();
                    $created++;
                    $items[] = ['appointment_id' => $aid, 'payment_id' => $conn->lastInsertId(), 'action' => 'created', 'amount' => $total];
                }
            }

            return ['success' => true, 'created' => $created, 'updated' => $updated, 'items' => $items];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to ensure pending payments: ' . $e->getMessage()];
        }
    }
    function getAllPayments()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT p.*,
                       a.appointment_date,
                       a.queue_number,
                       pat.user_id as patient_user_id,
                       u.name as patient_name,
                       d.doctor_id,
                       du.name as doctor_name,
                       st.status_name
                FROM tbl_payments p
                LEFT JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
                LEFT JOIN tbl_patients pat ON p.patient_id = pat.patient_id
                LEFT JOIN tbl_users u ON pat.user_id = u.user_id
                LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_status st ON p.status_id = st.status_id
                ORDER BY p.payment_date DESC
            ");
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'payments' => $payments];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch payments: ' . $e->getMessage()];
        }
    }

    function getPaymentsByPatient($patient_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT p.*,
                       a.appointment_date,
                       a.queue_number,
                       st.status_name,
                       d.doctor_id,
                       du.name AS doctor_name
                FROM tbl_payments p
                JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
                LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_status st ON p.status_id = st.status_id
                WHERE p.patient_id = :patient_id
                ORDER BY p.payment_date DESC
            ");
            $stmt->bindParam(":patient_id", $patient_id);
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'payments' => $payments];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch payments: ' . $e->getMessage()];
        }
    }

    function getPaymentsByAppointment($appointment_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT p.*,
                       pat.user_id as patient_user_id,
                       u.name as patient_name,
                       st.status_name
                FROM tbl_payments p
                JOIN tbl_patients pat ON p.patient_id = pat.patient_id
                JOIN tbl_users u ON pat.user_id = u.user_id
                LEFT JOIN tbl_status st ON p.status_id = st.status_id
                WHERE p.appointment_id = :appointment_id
                ORDER BY p.payment_date DESC
            ");
            $stmt->bindParam(":appointment_id", $appointment_id);
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'payments' => $payments];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch payments: ' . $e->getMessage()];
        }
    }

    function addPayment($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['appointment_id']) || empty($data['patient_id']) || !isset($data['amount'])) {
            return ['success' => false, 'message' => 'Appointment ID, patient ID, and amount are required.'];
        }

        try {
            $sql = "INSERT INTO tbl_payments (appointment_id, patient_id, amount, payment_method, status_id)
                    VALUES (:appointment_id, :patient_id, :amount, :payment_method, :status_id)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":appointment_id", $data['appointment_id']);
            $stmt->bindParam(":patient_id", $data['patient_id']);
            $stmt->bindParam(":amount", $data['amount']);
            $stmt->bindParam(":payment_method", $data['payment_method'] ?? 'Walk-in');
            $stmt->bindParam(":status_id", $data['status_id'] ?? 11); // Default to Unpaid
            $stmt->execute();

            return ['success' => true, 'message' => 'Payment added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add payment: ' . $e->getMessage()];
        }
    }

    function updatePayment($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['payment_id'])) {
            return ['success' => false, 'message' => 'Payment ID is required.'];
        }

        try {
            $sql = "UPDATE tbl_payments SET
                    amount = :amount,
                    payment_method = :payment_method,
                    status_id = :status_id
                    WHERE payment_id = :payment_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":amount", $data['amount']);
            $stmt->bindParam(":payment_method", $data['payment_method']);
            $stmt->bindParam(":status_id", $data['status_id']);
            $stmt->bindParam(":payment_id", $data['payment_id']);
            $stmt->execute();

            return ['success' => true, 'message' => 'Payment updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update payment: ' . $e->getMessage()];
        }
    }

    function deletePayment($payment_id)
    {
        include "connection.php";

        if (empty($payment_id)) {
            return ['success' => false, 'message' => 'Payment ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_payments WHERE payment_id = :payment_id");
            $stmt->bindParam(":payment_id", $payment_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Payment deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Payment not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete payment: ' . $e->getMessage()];
        }
    }

    function processOnlinePayment($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['payment_id'])) {
            return ['success' => false, 'message' => 'Payment ID is required.'];
        }

        try {
            // Simulate online payment processing
            // In a real application, this would integrate with a payment gateway

            $sql = "UPDATE tbl_payments SET
                    status_id = 12,
                    payment_method = 'Online',
                    payment_date = NOW()
                    WHERE payment_id = :payment_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":payment_id", $data['payment_id']);
            $stmt->execute();

            // Get payment details for notification
            $stmt = $conn->prepare("
                SELECT p.*,
                       pat.user_id as patient_user_id,
                       u.name as patient_name,
                       a.appointment_date
                FROM tbl_payments p
                JOIN tbl_patients pat ON p.patient_id = pat.patient_id
                JOIN tbl_users u ON pat.user_id = u.user_id
                JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
                WHERE p.payment_id = :payment_id
            ");
            $stmt->bindParam(":payment_id", $data['payment_id']);
            $stmt->execute();
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'message' => 'Online payment processed successfully!',
                'payment' => $payment
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to process online payment: ' . $e->getMessage()];
        }
    }

    // Mark an appointment's latest Unpaid payment as Paid (patient flow from Payments page)
    function markAppointmentPaid($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        $appointment_id = $data['appointment_id'] ?? null;
        $patient_id = $data['patient_id'] ?? null;
        $method_name = $data['method_name'] ?? 'Online';
        $payer_account = $data['payer_account'] ?? null;
        $payment_id_input = $data['payment_id'] ?? null;
        if ((!$appointment_id && !$payment_id_input) || !$patient_id) {
            return ['success' => false, 'message' => 'appointment_id or payment_id and patient_id are required.'];
        }
        try {
            $paidId = $this->getStatusId($conn, 'Paid', 'Payment');
            $unpaidId = $this->getStatusId($conn, 'Unpaid', 'Payment');
            if (!$paidId || !$unpaidId) { return ['success' => false, 'message' => 'Payment statuses not configured']; }

            if ($payment_id_input) {
                $find = $conn->prepare("SELECT payment_id, amount FROM tbl_payments WHERE payment_id = :id AND patient_id = :pid AND status_id = :sid LIMIT 1");
                $find->bindParam(":id", $payment_id_input);
                $find->bindParam(":pid", $patient_id);
                $find->bindParam(":sid", $unpaidId);
                $find->execute();
                $row = $find->fetch(PDO::FETCH_ASSOC);
            } else {
                // Find latest Unpaid for appointment/patient
                $find = $conn->prepare("SELECT payment_id, amount FROM tbl_payments WHERE appointment_id = :aid AND patient_id = :pid AND status_id = :sid ORDER BY payment_id DESC LIMIT 1");
                $find->bindParam(":aid", $appointment_id);
                $find->bindParam(":pid", $patient_id);
                $find->bindParam(":sid", $unpaidId);
                $find->execute();
                $row = $find->fetch(PDO::FETCH_ASSOC);
            }
            if (!$row) { return ['success' => false, 'message' => 'No pending payment found']; }

            $upd = $conn->prepare("UPDATE tbl_payments SET status_id = :paid, payment_method = :m, payment_date = NOW() WHERE payment_id = :id");
            $upd->bindParam(":paid", $paidId);
            $upd->bindParam(":m", $method_name);
            $upd->bindParam(":id", $row['payment_id']);
            $upd->execute();

            if ($payer_account) {
                $conn->prepare("CREATE TABLE IF NOT EXISTS tbl_payment_references (ref_id INT AUTO_INCREMENT PRIMARY KEY, payment_id INT NOT NULL, method_name VARCHAR(100) NOT NULL, payer_account VARCHAR(100) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX(payment_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")->execute();
                $log = $conn->prepare("INSERT INTO tbl_payment_references (payment_id, method_name, payer_account) VALUES (:pid, :m, :acct)");
                $log->bindParam(":pid", $row['payment_id']);
                $log->bindParam(":m", $method_name);
                $log->bindParam(":acct", $payer_account);
                $log->execute();
            }

            return ['success' => true, 'message' => 'Payment marked as Paid', 'payment_id' => $row['payment_id']];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to mark paid: ' . $e->getMessage()];
        }
    }

    // Patient online payment for a consultation: computes prescription subtotal and marks Paid
    function processOnlineConsultationPayment($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        $consultation_id = $data['consultation_id'] ?? null;
        $patient_id = $data['patient_id'] ?? null;
        $method_name = $data['method_name'] ?? 'Online';
        $payer_account = $data['payer_account'] ?? null; // e.g., GCash number, PayMaya number, bank account

        if (empty($consultation_id) || empty($patient_id)) {
            return ['success' => false, 'message' => 'consultation_id and patient_id are required.'];
        }

        try {
            // Pull appointment_id and compute prescriptions subtotal only (lab is optional)
            $cstmt = $conn->prepare("SELECT appointment_id FROM tbl_consultations WHERE consultation_id = :cid AND patient_id = :pid");
            $cstmt->bindParam(":cid", $consultation_id);
            $cstmt->bindParam(":pid", $patient_id);
            $cstmt->execute();
            $crow = $cstmt->fetch(PDO::FETCH_ASSOC);
            if (!$crow) {
                return ['success' => false, 'message' => 'Consultation not found or access denied.'];
            }
            $appointment_id = $crow['appointment_id'];

            $pstmt = $conn->prepare("SELECT SUM(m.price * COALESCE(p.quantity,1)) AS subtotal
                                      FROM tbl_prescriptions p
                                      JOIN tbl_medicines m ON p.medicine_id = m.medicine_id
                                      WHERE p.consultation_id = :cid");
            $pstmt->bindParam(":cid", $consultation_id);
            $pstmt->execute();
            $subtotal = (float)($pstmt->fetchColumn() ?: 0);

            if ($subtotal <= 0) {
                return ['success' => false, 'message' => 'No billable prescriptions found for this consultation.'];
            }

            // If there is an existing Unpaid payment for this appointment, update it; else insert new Paid payment
            $find = $conn->prepare("SELECT payment_id FROM tbl_payments WHERE appointment_id = :aid AND patient_id = :pid ORDER BY payment_id DESC LIMIT 1");
            $find->bindParam(":aid", $appointment_id);
            $find->bindParam(":pid", $patient_id);
            $find->execute();
            $existing = $find->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $upd = $conn->prepare("UPDATE tbl_payments SET amount = :amount, payment_method = :pmethod, status_id = 12, payment_date = NOW() WHERE payment_id = :pid");
                $upd->bindParam(":amount", $subtotal);
                $upd->bindParam(":pmethod", $method_name);
                $upd->bindParam(":pid", $existing['payment_id']);
                $upd->execute();
                $payment_id = $existing['payment_id'];
            } else {
                $ins = $conn->prepare("INSERT INTO tbl_payments (appointment_id, patient_id, amount, payment_method, status_id, payment_date) VALUES (:aid, :pid, :amount, :pmethod, 12, NOW())");
                $ins->bindParam(":aid", $appointment_id);
                $ins->bindParam(":pid", $patient_id);
                $ins->bindParam(":amount", $subtotal);
                $ins->bindParam(":pmethod", $method_name);
                $ins->execute();
                $payment_id = $conn->lastInsertId();
            }

            // Optionally store payer account reference in a log table for audit
            if ($payer_account) {
                $conn->prepare("CREATE TABLE IF NOT EXISTS tbl_payment_references (
                    ref_id INT AUTO_INCREMENT PRIMARY KEY,
                    payment_id INT NOT NULL,
                    method_name VARCHAR(100) NOT NULL,
                    payer_account VARCHAR(100) NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX(payment_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")->execute();
                $log = $conn->prepare("INSERT INTO tbl_payment_references (payment_id, method_name, payer_account) VALUES (:pid, :m, :acct)");
                $log->bindParam(":pid", $payment_id);
                $log->bindParam(":m", $method_name);
                $log->bindParam(":acct", $payer_account);
                $log->execute();
            }

            return [
                'success' => true,
                'message' => 'Payment completed successfully.',
                'payment_id' => $payment_id,
                'amount' => $subtotal,
                'appointment_id' => $appointment_id
            ];

        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to process online payment: ' . $e->getMessage()];
        }
    }

    function getPaymentStatistics()
    {
        include "connection.php";

        try {
            // Total payments
            $stmt = $conn->prepare("SELECT COUNT(*) as total_payments FROM tbl_payments");
            $stmt->execute();
            $totalPayments = $stmt->fetchColumn();

            // Total amount
            $stmt = $conn->prepare("SELECT SUM(amount) as total_amount FROM tbl_payments WHERE status_id = 12");
            $stmt->execute();
            $totalAmount = $stmt->fetchColumn();

            // Pending payments
            $stmt = $conn->prepare("SELECT COUNT(*) as pending_payments FROM tbl_payments WHERE status_id = 11");
            $stmt->execute();
            $pendingPayments = $stmt->fetchColumn();

            // Online vs Walk-in payments
            $stmt = $conn->prepare("
                SELECT payment_method, COUNT(*) as count, SUM(amount) as total
                FROM tbl_payments
                WHERE status_id = 12
                GROUP BY payment_method
            ");
            $stmt->execute();
            $paymentMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'statistics' => [
                    'total_payments' => $totalPayments,
                    'total_amount' => $totalAmount,
                    'pending_payments' => $pendingPayments,
                    'payment_methods' => $paymentMethods
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch payment statistics: ' . $e->getMessage()];
        }
    }

    function checkPatientPaymentStatus($patient_id)
    {
        include "connection.php";

        if (empty($patient_id)) {
            return ['success' => false, 'message' => 'Patient ID is required.'];
        }

        try {
            // Check if patient has any paid consultations
            $stmt = $conn->prepare("
                SELECT COUNT(*) as paid_count
                FROM tbl_payments p
                JOIN tbl_appointments a ON p.appointment_id = a.appointment_id
                WHERE p.patient_id = :patient_id
                AND p.status_id = 12
                AND a.appointment_status = 'Completed'
            ");
            $stmt->bindParam(":patient_id", $patient_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $hasPaidConsultation = intval($result['paid_count']) > 0;

            return [
                'success' => true,
                'has_paid_consultation' => $hasPaidConsultation,
                'paid_consultations_count' => intval($result['paid_count'])
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to check payment status: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $payment_id = $_GET['payment_id'] ?? "";
    $patient_id = $_GET['patient_id'] ?? "";
    $appointment_id = $_GET['appointment_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $payment_id = $_POST['payment_id'] ?? "";
    $patient_id = $_POST['patient_id'] ?? "";
    $appointment_id = $_POST['appointment_id'] ?? "";
}

$payments = new Payments();

switch ($operation) {
    case "getAll":
        echo json_encode($payments->getAllPayments());
        break;
    case "getByPatient":
        echo json_encode($payments->getPaymentsByPatient($patient_id));
        break;
    case "ensurePendingForPatient":
        echo json_encode($payments->ensurePendingForPatient($patient_id));
        break;
    case "getByAppointment":
        echo json_encode($payments->getPaymentsByAppointment($appointment_id));
        break;
    case "add":
        echo json_encode($payments->addPayment($json));
        break;
    case "update":
        echo json_encode($payments->updatePayment($json));
        break;
    case "delete":
        echo json_encode($payments->deletePayment($payment_id));
        break;
    case "processOnline":
        echo json_encode($payments->processOnlinePayment($json));
        break;
    case "processOnlineConsultation":
        echo json_encode($payments->processOnlineConsultationPayment($json));
        break;
    case "markAppointmentPaid":
        echo json_encode($payments->markAppointmentPaid($json));
        break;
    case "getStatistics":
        echo json_encode($payments->getPaymentStatistics());
        break;
    case "checkPatientPaymentStatus":
        echo json_encode($payments->checkPatientPaymentStatus($patient_id));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
