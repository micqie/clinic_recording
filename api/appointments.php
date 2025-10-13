<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Appointments
{
    private $conn;
    private $dbName;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
        // cache current database name for INFORMATION_SCHEMA queries
        try {
            $stmt = $this->conn->query("SELECT DATABASE()");
            $this->dbName = $stmt->fetchColumn();
        } catch (Exception $e) {
            $this->dbName = null;
        }
    }

    // Helper to fetch status_id by status_name within Appointment status type
    private function getAppointmentStatusId($statusName)
    {
        $stmt = $this->conn->prepare("SELECT s.status_id FROM tbl_status s JOIN tbl_status_type t ON s.status_type_id = t.status_type_id WHERE t.status_type_name = 'Appointment' AND s.status_name = :name LIMIT 1");
        $stmt->bindParam(":name", $statusName);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? intval($row['status_id']) : null;
    }

    // Helper: check if a column exists on a table in this database
    private function hasColumn($tableName, $columnName)
    {
        try {
            if (!$this->dbName) return false;
            $sql = "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl AND COLUMN_NAME = :col";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(":db", $this->dbName);
            $stmt->bindParam(":tbl", $tableName);
            $stmt->bindParam(":col", $columnName);
            $stmt->execute();
            return intval($stmt->fetchColumn()) > 0;
        } catch (Exception $e) {
            return false;
        }
    }

    // Count booked for a specific date (excludes Cancelled)
    public function get_booked_count($date)
    {
        $cancelledId = $this->getAppointmentStatusId('Cancelled');
        $stmt = $this->conn->prepare("SELECT COUNT(*) AS cnt FROM tbl_appointments WHERE appointment_date = :d " . ($cancelledId ? "AND status_id <> :cancelled" : ""));
        $stmt->bindParam(":d", $date);
        if ($cancelledId) {
            $stmt->bindParam(":cancelled", $cancelledId);
        }
        $stmt->execute();
        $cnt = intval($stmt->fetchColumn());
        echo json_encode(["success" => true, "date" => $date, "count" => $cnt]);
    }

    // Secretary: list all appointments with patient, doctor, statuses (appointment + payment if any)
    public function get_all($page = 1, $limit = 50)
    {
        $offset = max(0, ($page - 1) * $limit);
        $stmt = $this->conn->prepare("
            SELECT a.appointment_id,
                   a.patient_id,
                   a.doctor_id,
                   a.secretary_id,
                   a.appointment_date,
                   a.queue_number,
                   a.status_id AS appointment_status_id,
                   sa.status_name AS appointment_status,
                   u.name AS patient_name,
                   du.name AS doctor_name,
                   pmt.payment_id,
                   pmt.amount,
                   pmt.payment_method,
                   pmt.payment_date,
                   pmt.status_id AS payment_status_id,
                   sp.status_name AS payment_status
            FROM tbl_appointments a
            JOIN tbl_patients pt ON a.patient_id = pt.patient_id
            JOIN tbl_users u ON pt.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_payments pmt ON pmt.appointment_id = a.appointment_id
            LEFT JOIN tbl_status sa ON a.status_id = sa.status_id
            LEFT JOIN tbl_status sp ON pmt.status_id = sp.status_id
            ORDER BY a.appointment_date DESC, a.queue_number ASC, a.appointment_id DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(":limit", intval($limit), PDO::PARAM_INT);
        $stmt->bindValue(":offset", intval($offset), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $rows]);
    }

    // Patient: request a new appointment for a date (no time)
    public function request($data)
    {
        if (empty($data['patient_id']) || empty($data['appointment_date'])) {
            echo json_encode(["success" => false, "message" => "patient_id and appointment_date are required."]); return;
        }
        $date = $data['appointment_date'];

        // Validate date - cannot book for past dates
        $today = date('Y-m-d');
        if ($date < $today) {
            echo json_encode(["success" => false, "message" => "Cannot book appointments for past dates."]); return;
        }

        // Enforce max 15 per day (excluding Cancelled)
        $cancelledId = $this->getAppointmentStatusId('Cancelled');
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_appointments WHERE appointment_date = :d " . ($cancelledId ? "AND status_id <> :cancelled" : ""));
        $stmt->bindParam(":d", $date);
        if ($cancelledId) { $stmt->bindParam(":cancelled", $cancelledId); }
        $stmt->execute();
        $count = intval($stmt->fetchColumn());
        if ($count >= 15) {
            echo json_encode(["success" => false, "message" => "Fully Booked"]); return;
        }

        $pendingId = $this->getAppointmentStatusId('Pending');
        if (!$pendingId) { echo json_encode(["success" => false, "message" => "Pending status not configured."]); return; }

        $hasReasonCol = $this->hasColumn('tbl_appointments', 'appointment_reason_id');
        $hasNotesCol = $this->hasColumn('tbl_appointments', 'appointment_notes');

        // Combine other reason text with notes if "Other" is selected (only if notes column exists)
        $combinedNotes = $hasNotesCol ? ($data['appointment_notes'] ?? '') : null;
        if ($hasNotesCol && !empty($data['other_reason_text'])) {
            $combinedNotes = "Reason: " . $data['other_reason_text'] . "\n\n" . $combinedNotes;
        }

        try {
            if ($hasReasonCol && $hasNotesCol) {
                $stmt = $this->conn->prepare("INSERT INTO tbl_appointments (patient_id, appointment_date, status_id, appointment_reason_id, appointment_notes) VALUES (:pid, :d, :sid, :rid, :notes)");
                $stmt->bindParam(":pid", $data['patient_id']);
                $stmt->bindParam(":d", $date);
                $stmt->bindParam(":sid", $pendingId);
                $rid = $data['appointment_reason_id'] ?? null;
                if ($rid === '') { $rid = null; }
                $stmt->bindParam(":rid", $rid);
                $notesParam = $combinedNotes ?: null;
                $stmt->bindParam(":notes", $notesParam);
            } else if ($hasReasonCol && !$hasNotesCol) {
                $stmt = $this->conn->prepare("INSERT INTO tbl_appointments (patient_id, appointment_date, status_id, appointment_reason_id) VALUES (:pid, :d, :sid, :rid)");
                $stmt->bindParam(":pid", $data['patient_id']);
                $stmt->bindParam(":d", $date);
                $stmt->bindParam(":sid", $pendingId);
                $rid = $data['appointment_reason_id'] ?? null;
                if ($rid === '') { $rid = null; }
                $stmt->bindParam(":rid", $rid);
            } else {
                // Legacy schema: no reason/notes columns
                $stmt = $this->conn->prepare("INSERT INTO tbl_appointments (patient_id, appointment_date, status_id) VALUES (:pid, :d, :sid)");
                $stmt->bindParam(":pid", $data['patient_id']);
                $stmt->bindParam(":d", $date);
                $stmt->bindParam(":sid", $pendingId);
            }
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Appointment request submitted."]);
            } else {
                $err = $stmt->errorInfo();
                echo json_encode(["success" => false, "message" => ($err[2] ?? 'Failed to request appointment.')]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // Secretary: approve (assign doctor, auto-generate queue number, set status Confirmed)
    public function approve($data)
    {
        if (empty($data['appointment_id']) || empty($data['doctor_id'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and doctor_id are required."]); return;
        }

        // Find appointment date
        $stmt = $this->conn->prepare("SELECT appointment_date FROM tbl_appointments WHERE appointment_id = :aid LIMIT 1");
        $stmt->bindParam(":aid", $data['appointment_id']);
        $stmt->execute();
        $date = $stmt->fetchColumn();
        if (!$date) { echo json_encode(["success" => false, "message" => "Appointment not found."]); return; }

        // Availability check intentionally skipped to allow straightforward approvals

        // Compute next queue number (exclude Cancelled)
        $cancelledId = $this->getAppointmentStatusId('Cancelled');
        $sqlMax = "SELECT COALESCE(MAX(queue_number), 0) FROM tbl_appointments WHERE appointment_date = :d" . ($cancelledId ? " AND status_id <> :cancelled" : "");
        $stmt = $this->conn->prepare($sqlMax);
        $stmt->bindParam(":d", $date);
        if ($cancelledId) { $stmt->bindParam(":cancelled", $cancelledId); }
        $stmt->execute();
        $nextQueue = intval($stmt->fetchColumn()) + 1;
        if ($nextQueue > 15) { echo json_encode(["success" => false, "message" => "Fully Booked"]); return; }

        $waitingForNurseId = $this->getAppointmentStatusId('Waiting for Nurse');
        if (!$waitingForNurseId) { echo json_encode(["success" => false, "message" => "Waiting for Nurse status not configured."]); return; }

        try {
            $stmt = $this->conn->prepare("UPDATE tbl_appointments SET doctor_id = :doc, queue_number = :q, status_id = :sid WHERE appointment_id = :aid");
            $stmt->bindParam(":doc", $data['doctor_id']);
            $stmt->bindParam(":q", $nextQueue);
            $stmt->bindParam(":sid", $waitingForNurseId);
            $stmt->bindParam(":aid", $data['appointment_id']);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Appointment approved. Patient will be routed to nurse first.", "queue_number" => $nextQueue]);
            } else {
                $err = $stmt->errorInfo();
                echo json_encode(["success" => false, "message" => ($err[2] ?? 'Approval failed.')]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // Update appointment status (Completed/Cancelled/etc.)
    public function set_status($data)
    {
        if (empty($data['appointment_id']) || empty($data['status_name'])) {
            echo json_encode(["success" => false, "message" => "appointment_id and status_name are required."]); return;
        }
        $statusId = $this->getAppointmentStatusId($data['status_name']);
        if (!$statusId) { echo json_encode(["success" => false, "message" => "Invalid status_name."]); return; }
        $stmt = $this->conn->prepare("UPDATE tbl_appointments SET status_id = :sid WHERE appointment_id = :aid");
        $stmt->bindParam(":sid", $statusId);
        $stmt->bindParam(":aid", $data['appointment_id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Status updated."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to update status."]);
        }
    }

    // Doctor: list appointments assigned to doctor
    public function get_by_doctor($doctorId)
    {
        if (empty($doctorId)) { echo json_encode(["success" => false, "message" => "doctor_id required."]); return; }
        $stmt = $this->conn->prepare("
            SELECT a.appointment_id,
                   a.appointment_date,
                   a.queue_number,
                   s.status_name AS appointment_status,
                   u.name AS patient_name,
                   p.patient_id
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.doctor_id = :doc
            ORDER BY a.appointment_date ASC, a.queue_number ASC
        ");
        $stmt->bindParam(":doc", $doctorId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Patient: list appointments for a patient
    public function get_by_patient($patientId)
    {
        if (empty($patientId)) { echo json_encode(["success" => false, "message" => "patient_id required."]); return; }
        $hasReasonCol = $this->hasColumn('tbl_appointments', 'appointment_reason_id');
        $hasNotesCol = $this->hasColumn('tbl_appointments', 'appointment_notes');

        $select = "SELECT a.appointment_id, a.appointment_date, a.queue_number, s.status_name AS appointment_status, du.name AS doctor_name";
        if ($hasReasonCol) { $select .= ", a.appointment_reason_id"; } else { $select .= ", NULL AS appointment_reason_id"; }
        if ($hasNotesCol) { $select .= ", a.appointment_notes"; } else { $select .= ", NULL AS appointment_notes"; }
        // reason_name joins only if column exists
        $joinReasons = $hasReasonCol ? " LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id " : "";
        $select .= $hasReasonCol ? ", ar.reason_name" : ", NULL AS reason_name";

        $sql = $select . " FROM tbl_appointments a
            JOIN tbl_status s ON a.status_id = s.status_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            " . $joinReasons . "
            WHERE a.patient_id = :pid
            ORDER BY a.appointment_date DESC, a.queue_number ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":pid", $patientId);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Utility: list doctors for dropdowns
    public function list_doctors()
    {
        $stmt = $this->conn->prepare("SELECT d.doctor_id, u.name AS doctor_name, d.specialization_id, s.name AS specialization_name FROM tbl_doctors d JOIN tbl_users u ON d.user_id = u.user_id LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id ORDER BY u.name ASC");
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Utility: list all specializations
    public function list_specializations()
    {
        $stmt = $this->conn->prepare("SELECT specialization_id, name AS specialization_name FROM tbl_specializations ORDER BY name ASC");
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Get available doctors for a specific date
    public function get_available_doctors($date)
    {
        $stmt = $this->conn->prepare("
            SELECT
                d.doctor_id,
                u.name AS doctor_name,
                s.name AS specialization_name
            FROM tbl_doctors d
            JOIN tbl_users u ON d.user_id = u.user_id
            LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
            WHERE d.doctor_id NOT IN (
                SELECT doctor_id
                FROM tbl_doctor_availability
                WHERE date = :date AND is_available = 0
            )
            ORDER BY u.name ASC
        ");
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Get confirmed appointments for a specific date
    public function get_confirmed_appointments($date)
    {
        $stmt = $this->conn->prepare("
            SELECT
                a.appointment_id,
                a.queue_number,
                p.patient_id,
                u.name AS patient_name,
                d.doctor_id,
                du.name AS doctor_name,
                sp.name AS specialization_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users u ON p.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
            JOIN tbl_status s ON a.status_id = s.status_id
            WHERE a.appointment_date = :date
            AND s.status_name = 'Confirmed'
            ORDER BY a.queue_number ASC
        ");
        $stmt->bindParam(":date", $date);
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // New: per-doctor overview for a date, including specialization and patients, with fallback to latest date
    public function get_doctor_day_overview($date)
    {
        if (empty($date)) {
            // Leave empty; we will fallback later if no data for today
            $stmt = $this->conn->prepare("SELECT CURDATE()");
            $stmt->execute();
            $date = $stmt->fetchColumn();
        }
        $doctors = $this->fetch_doctor_overview_for_date($date);
        if (empty($doctors)) {
            // Fallback to most recent date that has any doctor appointments
            $q = $this->conn->prepare("SELECT MAX(appointment_date) FROM tbl_appointments WHERE doctor_id IS NOT NULL");
            $q->execute();
            $latest = $q->fetchColumn();
            if ($latest) {
                $date = $latest;
                $doctors = $this->fetch_doctor_overview_for_date($date);
            }
        }
        echo json_encode(["success" => true, "date" => $date, "data" => $doctors]);
    }

    private function fetch_doctor_overview_for_date($date)
    {
        // Doctors who have appointments on the date
        $stmt = $this->conn->prepare("
            SELECT d.doctor_id, du.name AS doctor_name, s.name AS specialization_name, COUNT(a.appointment_id) AS patient_count
            FROM tbl_doctors d
            JOIN tbl_users du ON d.user_id = du.user_id
            LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
            JOIN tbl_appointments a ON a.doctor_id = d.doctor_id AND a.appointment_date = :d
            JOIN tbl_status st ON a.status_id = st.status_id AND st.status_name = 'Confirmed'
            GROUP BY d.doctor_id, du.name, s.name
            ORDER BY du.name ASC
        ");
        $stmt->bindParam(":d", $date);
        $stmt->execute();
        $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Patients per doctor on the date
        $detail = $this->conn->prepare("
            SELECT a.appointment_id, a.queue_number, st.status_name AS appointment_status, pu.name AS patient_name
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users pu ON p.user_id = pu.user_id
            JOIN tbl_status st ON a.status_id = st.status_id
            WHERE a.doctor_id = :doc AND a.appointment_date = :d AND st.status_name = 'Confirmed'
            ORDER BY COALESCE(a.queue_number, 9999), a.appointment_id
        ");

        foreach ($doctors as &$doc) {
            $detail->bindParam(":doc", $doc['doctor_id']);
            $detail->bindParam(":d", $date);
            $detail->execute();
            $doc['patients'] = $detail->fetchAll(PDO::FETCH_ASSOC);
            $doc['date'] = $date;
        }
        return $doctors;
    }

    // New: patients list for a specific doctor (date optional; only Confirmed)
    public function get_doctor_patients_on_date($doctorId, $date)
    {
        if (empty($doctorId)) { echo json_encode(["success" => false, "message" => "doctor_id is required."]); return; }
        $filterByDate = !empty($date);
        $sql = "
            SELECT
                a.appointment_id,
                a.appointment_date,
                a.queue_number,
                st.status_name AS appointment_status,
                pu.name AS patient_name,
                (
                    SELECT GROUP_CONCAT(DISTINCT a2.appointment_date ORDER BY a2.appointment_date SEPARATOR ', ')
                    FROM tbl_appointments a2
                    JOIN tbl_status st2 ON a2.status_id = st2.status_id AND st2.status_name = 'Confirmed'
                    WHERE a2.patient_id = a.patient_id
                ) AS confirmed_dates,
                (
                    SELECT COUNT(*)
                    FROM tbl_appointments a3
                    JOIN tbl_status st3 ON a3.status_id = st3.status_id AND st3.status_name = 'Confirmed'
                    WHERE a3.patient_id = a.patient_id
                ) AS confirmed_count
            FROM tbl_appointments a
            JOIN tbl_patients p ON a.patient_id = p.patient_id
            JOIN tbl_users pu ON p.user_id = pu.user_id
            JOIN tbl_status st ON a.status_id = st.status_id
            WHERE a.doctor_id = :doc " . ($filterByDate ? "AND a.appointment_date = :d " : "") . "AND st.status_name = 'Confirmed'
            ORDER BY a.appointment_date DESC, COALESCE(a.queue_number, 9999), a.appointment_id
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":doc", $doctorId);
        if ($filterByDate) { $stmt->bindParam(":d", $date); }
        $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // Get available doctors by specialization for a specific appointment reason
    public function get_doctors_by_specialization($reasonId, $date)
    {
        if (empty($reasonId)) {
            echo json_encode(["success" => false, "message" => "reason_id is required."]);
            return;
        }

        try {
            // First, get the appointment reason to understand what type of specialist is needed
            $stmt = $this->conn->prepare("
                SELECT reason_name, description
                FROM tbl_appointment_reasons
                WHERE reason_id = :reason_id AND is_active = 1
            ");
            $stmt->bindParam(":reason_id", $reasonId);
            $stmt->execute();
            $reason = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$reason) {
                echo json_encode(["success" => false, "message" => "Appointment reason not found."]);
                return;
            }

            // Get doctors by specialization, prioritizing exact matches
            $stmt = $this->conn->prepare("
                SELECT
                    d.doctor_id,
                    d.user_id,
                    d.license_number,
                    d.specialization_id,
                    d.years_experience,
                    u.name AS doctor_name,
                    u.email,
                    s.name AS specialization_name,
                    s.description AS specialization_description,
                    CASE
                        WHEN s.name LIKE '%General%' OR s.name LIKE '%Family%' THEN 3
                        WHEN s.name LIKE '%Internal%' THEN 2
                        ELSE 1
                    END AS priority
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                WHERE u.is_active = 1
                ORDER BY priority ASC, d.years_experience DESC, u.name ASC
            ");
            $stmt->execute();
            $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Check availability for each doctor on the specified date
            $availableDoctors = [];
            foreach ($doctors as $doctor) {
                // Check if doctor is available on this date
                $stmt = $this->conn->prepare("
                    SELECT COUNT(*) FROM tbl_doctor_availability
                    WHERE doctor_id = :doctor_id AND date = :date AND is_available = 0
                ");
                $stmt->bindParam(":doctor_id", $doctor['doctor_id']);
                $stmt->bindParam(":date", $date);
                $stmt->execute();
                $isUnavailable = intval($stmt->fetchColumn()) > 0;

                if (!$isUnavailable) {
                    // Check current appointment load for this doctor on this date
                    $stmt = $this->conn->prepare("
                        SELECT COUNT(*) FROM tbl_appointments
                        WHERE doctor_id = :doctor_id AND appointment_date = :date
                        AND status_id NOT IN (SELECT status_id FROM tbl_status WHERE status_name = 'Cancelled')
                    ");
                    $stmt->bindParam(":doctor_id", $doctor['doctor_id']);
                    $stmt->bindParam(":date", $date);
                    $stmt->execute();
                    $currentLoad = intval($stmt->fetchColumn());

                    $doctor['current_load'] = $currentLoad;
                    $doctor['max_load'] = 15; // Assuming max 15 patients per doctor per day
                    $doctor['available_slots'] = max(0, $doctor['max_load'] - $doctor['current_load']);

                    $availableDoctors[] = $doctor;
                }
            }

            echo json_encode([
                "success" => true,
                "data" => $availableDoctors,
                "reason" => $reason,
                "message" => count($availableDoctors) > 0 ?
                    "Found " . count($availableDoctors) . " available doctor(s)" :
                    "No doctors available for this appointment reason on the selected date"
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Get appointment details including reason and notes
    public function get_appointment_details($appointmentId)
    {
        if (empty($appointmentId)) {
            echo json_encode(["success" => false, "message" => "appointment_id is required."]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("
                SELECT
                    a.*,
                    ar.reason_name,
                    ar.description AS reason_description,
                    p.user_id AS patient_user_id,
                    pu.name AS patient_name,
                    pu.email AS patient_email,
                    d.doctor_id,
                    du.name AS doctor_name,
                    s.name AS doctor_specialization,
                    st.status_name AS appointment_status
                FROM tbl_appointments a
                LEFT JOIN tbl_appointment_reasons ar ON a.appointment_reason_id = ar.reason_id
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users pu ON p.user_id = pu.user_id
                LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                LEFT JOIN tbl_status st ON a.status_id = st.status_id
                WHERE a.appointment_id = :appointment_id
            ");
            $stmt->bindParam(":appointment_id", $appointmentId);
            $stmt->execute();
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($appointment) {
                echo json_encode(["success" => true, "data" => $appointment]);
            } else {
                echo json_encode(["success" => false, "message" => "Appointment not found."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }
}

// Router
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$svc = new Appointments();

switch ($operation) {
    case 'get_all':
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 50);
        $svc->get_all($page, $limit);
        break;
    case 'get_booked_count':
        $date = $_GET['date'] ?? '';
        $svc->get_booked_count($date);
        break;
    case 'request':
        $data = json_decode($json ?: '{}', true);
        $svc->request($data);
        break;
    case 'approve':
        $data = json_decode($json ?: '{}', true);
        $svc->approve($data);
        break;
    case 'set_status':
        $data = json_decode($json ?: '{}', true);
        $svc->set_status($data);
        break;
    case 'get_by_doctor':
        $doctorId = $_GET['doctor_id'] ?? '';
        $svc->get_by_doctor($doctorId);
        break;
    case 'get_by_patient':
        $patientId = $_GET['patient_id'] ?? '';
        $svc->get_by_patient($patientId);
        break;
    case 'list_doctors':
        $svc->list_doctors();
        break;
    case 'list_specializations':
        $svc->list_specializations();
        break;
    case 'get_available_doctors':
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_available_doctors($date);
        break;
    case 'get_confirmed_appointments':
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_confirmed_appointments($date);
        break;
    case 'get_doctor_day_overview':
        $date = $_GET['date'] ?? '';
        $svc->get_doctor_day_overview($date);
        break;
    case 'get_doctor_patients_on_date':
        $doctorId = $_GET['doctor_id'] ?? '';
        $date = $_GET['date'] ?? '';
        $svc->get_doctor_patients_on_date($doctorId, $date);
        break;
    case 'get_doctors_by_specialization':
        $reasonId = $_GET['reason_id'] ?? '';
        $date = $_GET['date'] ?? date('Y-m-d');
        $svc->get_doctors_by_specialization($reasonId, $date);
        break;
    case 'get_appointment_details':
        $appointmentId = $_GET['appointment_id'] ?? '';
        $svc->get_appointment_details($appointmentId);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>
