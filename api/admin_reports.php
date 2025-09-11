<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class AdminReports
{
    function summary($from, $to)
    {
        include "connection.php";
        try {
            // Date filters
            $whereAppt = [];
            if (!empty($from)) { $whereAppt[] = "a.appointment_date >= :from"; }
            if (!empty($to)) { $whereAppt[] = "a.appointment_date <= :to"; }
            $whereApptSql = $whereAppt ? ("WHERE " . implode(" AND ", $whereAppt)) : "";

            $wherePay = [];
            if (!empty($from)) { $wherePay[] = "p.payment_date >= :from"; }
            if (!empty($to)) { $wherePay[] = "p.payment_date <= :to"; }
            $wherePaySql = $wherePay ? ("WHERE " . implode(" AND ", $wherePay)) : "";

            $whereLab = [];
            if (!empty($from)) { $whereLab[] = "lr.uploaded_at >= :from"; }
            if (!empty($to)) { $whereLab[] = "lr.uploaded_at <= :to"; }
            $whereLabSql = $whereLab ? ("WHERE " . implode(" AND ", $whereLab)) : "";

            // KPIs
            $kpiSql = "SELECT
                        (SELECT COUNT(*) FROM tbl_appointments a $whereApptSql) AS total_appointments,
                        (SELECT COUNT(*) FROM tbl_appointments a JOIN tbl_status s ON a.status_id=s.status_id $whereApptSql AND s.status_name='Completed') AS completed_appointments,
                        (SELECT COALESCE(SUM(p.amount),0) FROM tbl_payments p $wherePaySql) AS total_revenue,
                        (SELECT COUNT(*) FROM tbl_lab_results lr $whereLabSql) AS total_lab_results";
            $stmt = $conn->prepare($kpiSql);
            if (!empty($from)) $stmt->bindParam(":from", $from);
            if (!empty($to)) $stmt->bindParam(":to", $to);
            $stmt->execute();
            $kpis = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            // Top doctors by appointments
            $sqlTopDocs = "SELECT du.name AS doctor_name, COUNT(*) AS appts
                           FROM tbl_appointments a
                           JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                           JOIN tbl_users du ON d.user_id = du.user_id
                           $whereApptSql
                           GROUP BY du.name
                           ORDER BY appts DESC
                           LIMIT 5";
            $st1 = $conn->prepare($sqlTopDocs);
            if (!empty($from)) $st1->bindParam(":from", $from);
            if (!empty($to)) $st1->bindParam(":to", $to);
            $st1->execute();
            $topDoctors = $st1->fetchAll(PDO::FETCH_ASSOC);

            // Top conditions (from diagnoses table)
            $sqlTopCond = "SELECT condition_name, COUNT(*) AS cnt
                           FROM tbl_diagnoses
                           GROUP BY condition_name
                           ORDER BY cnt DESC
                           LIMIT 5";
            $st2 = $conn->prepare($sqlTopCond);
            $st2->execute();
            $topConditions = $st2->fetchAll(PDO::FETCH_ASSOC);

            // Payment methods breakdown (top 5 by amount)
            $sqlPay = "SELECT COALESCE(p.payment_method,'Walk-in') AS method, COUNT(*) AS cnt, COALESCE(SUM(p.amount),0) AS amount
                       FROM tbl_payments p $wherePaySql
                       GROUP BY COALESCE(p.payment_method,'Walk-in')
                       ORDER BY amount DESC
                       LIMIT 5";
            $st3 = $conn->prepare($sqlPay);
            if (!empty($from)) $st3->bindParam(":from", $from);
            if (!empty($to)) $st3->bindParam(":to", $to);
            $st3->execute();
            $paymentMethods = $st3->fetchAll(PDO::FETCH_ASSOC);

            // Lab test types breakdown (top 5)
            $sqlLab = "SELECT ltt.type_name, COUNT(*) AS cnt
                       FROM tbl_lab_results lr
                       JOIN tbl_lab_requests lreq ON lr.lab_request_id = lreq.lab_request_id
                       LEFT JOIN tbl_lab_test_types ltt ON lreq.lab_test_type_id = ltt.lab_test_type_id
                       $whereLabSql
                       GROUP BY ltt.type_name
                       ORDER BY cnt DESC
                       LIMIT 5";
            $st4 = $conn->prepare($sqlLab);
            if (!empty($from)) $st4->bindParam(":from", $from);
            if (!empty($to)) $st4->bindParam(":to", $to);
            $st4->execute();
            $labTypes = $st4->fetchAll(PDO::FETCH_ASSOC);

            return [ 'success' => true, 'kpis' => $kpis, 'top_doctors' => $topDoctors, 'top_conditions' => $topConditions, 'payment_methods' => $paymentMethods, 'lab_types' => $labTypes ];
        } catch (PDOException $e) {
            return [ 'success' => false, 'message' => 'Failed to build summary: ' . $e->getMessage() ];
        }
    }
    function appointmentsSummary($from, $to)
    {
        include "connection.php";
        try {
            $where = [];
            if (!empty($from)) { $where[] = "a.appointment_date >= :from"; }
            if (!empty($to)) { $where[] = "a.appointment_date <= :to"; }
            $whereSql = $where ? ("WHERE " . implode(" AND ", $where)) : "";

            $sql = "SELECT
                        COUNT(*) AS total,
                        SUM(a.status_id = (SELECT status_id FROM tbl_status WHERE status_name='Confirmed' LIMIT 1)) AS confirmed,
                        SUM(a.status_id = (SELECT status_id FROM tbl_status WHERE status_name='Completed' LIMIT 1)) AS completed,
                        SUM(a.status_id = (SELECT status_id FROM tbl_status WHERE status_name='Cancelled' LIMIT 1)) AS cancelled
                    FROM tbl_appointments a $whereSql";
            $stmt = $conn->prepare($sql);
            if (!empty($from)) $stmt->bindParam(":from", $from);
            if (!empty($to)) $stmt->bindParam(":to", $to);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            // By specialization
            $sql2 = "SELECT sp.name AS specialization, COUNT(*) AS total
                     FROM tbl_appointments a
                     JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                     LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
                     $whereSql
                     GROUP BY sp.name
                     ORDER BY total DESC";
            $stmt2 = $conn->prepare($sql2);
            if (!empty($from)) $stmt2->bindParam(":from", $from);
            if (!empty($to)) $stmt2->bindParam(":to", $to);
            $stmt2->execute();
            $bySpec = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            return [ 'success' => true, 'summary' => $row, 'by_specialization' => $bySpec ];
        } catch (PDOException $e) {
            return [ 'success' => false, 'message' => 'Failed to build appointments summary: ' . $e->getMessage() ];
        }
    }

    function paymentsSummary($from, $to)
    {
        include "connection.php";
        try {
            $where = [];
            if (!empty($from)) { $where[] = "p.payment_date >= :from"; }
            if (!empty($to)) { $where[] = "p.payment_date <= :to"; }
            $whereSql = $where ? ("WHERE " . implode(" AND ", $where)) : "";

            $sql = "SELECT
                        COUNT(*) AS total_payments,
                        COALESCE(SUM(p.amount),0) AS total_amount
                    FROM tbl_payments p $whereSql";
            $stmt = $conn->prepare($sql);
            if (!empty($from)) $stmt->bindParam(":from", $from);
            if (!empty($to)) $stmt->bindParam(":to", $to);
            $stmt->execute();
            $sum = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            // By method
            $sql2 = "SELECT COALESCE(p.payment_method, 'Walk-in') AS method, COUNT(*) AS cnt, COALESCE(SUM(p.amount),0) AS amount
                     FROM tbl_payments p $whereSql
                     GROUP BY COALESCE(p.payment_method, 'Walk-in')
                     ORDER BY amount DESC";
            $stmt2 = $conn->prepare($sql2);
            if (!empty($from)) $stmt2->bindParam(":from", $from);
            if (!empty($to)) $stmt2->bindParam(":to", $to);
            $stmt2->execute();
            $byMethod = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            return [ 'success' => true, 'summary' => $sum, 'by_method' => $byMethod ];
        } catch (PDOException $e) {
            return [ 'success' => false, 'message' => 'Failed to build payments summary: ' . $e->getMessage() ];
        }
    }

    function labResultsSummary($from, $to)
    {
        include "connection.php";
        try {
            $where = [];
            if (!empty($from)) { $where[] = "lr.uploaded_at >= :from"; }
            if (!empty($to)) { $where[] = "lr.uploaded_at <= :to"; }
            $whereSql = $where ? ("WHERE " . implode(" AND ", $where)) : "";

            $sql = "SELECT COUNT(*) AS total_results
                    FROM tbl_lab_results lr $whereSql";
            $stmt = $conn->prepare($sql);
            if (!empty($from)) $stmt->bindParam(":from", $from);
            if (!empty($to)) $stmt->bindParam(":to", $to);
            $stmt->execute();
            $sum = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

            $sql2 = "SELECT ltt.type_name, COUNT(*) AS cnt
                     FROM tbl_lab_results lr
                     JOIN tbl_lab_requests lreq ON lr.lab_request_id = lreq.lab_request_id
                     LEFT JOIN tbl_lab_test_types ltt ON lreq.lab_test_type_id = ltt.lab_test_type_id
                     $whereSql
                     GROUP BY ltt.type_name
                     ORDER BY cnt DESC";
            $stmt2 = $conn->prepare($sql2);
            if (!empty($from)) $stmt2->bindParam(":from", $from);
            if (!empty($to)) $stmt2->bindParam(":to", $to);
            $stmt2->execute();
            $byType = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            return [ 'success' => true, 'summary' => $sum, 'by_test_type' => $byType ];
        } catch (PDOException $e) {
            return [ 'success' => false, 'message' => 'Failed to build lab results summary: ' . $e->getMessage() ];
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $from = $_GET['from'] ?? '';
    $to = $_GET['to'] ?? '';
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? '';
    $from = $_POST['from'] ?? '';
    $to = $_POST['to'] ?? '';
}

$api = new AdminReports();

switch ($operation) {
    case 'report_summary':
        echo json_encode($api->summary($from, $to));
        break;
    case 'report_appointments':
        echo json_encode($api->appointmentsSummary($from, $to));
        break;
    case 'report_payments':
        echo json_encode($api->paymentsSummary($from, $to));
        break;
    case 'report_lab_results':
        echo json_encode($api->labResultsSummary($from, $to));
        break;
    default:
        echo json_encode([ 'success' => false, 'message' => 'Invalid operation.' ]);
        break;
}
?>
