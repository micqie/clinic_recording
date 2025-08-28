<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Doctors
{
    private function hasActiveColumn($conn)
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        $sql = "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_users' AND COLUMN_NAME = 'is_active'";
        $stmt = $conn->query($sql);
        $cached = (bool)$stmt->fetchColumn();
        return $cached;
    }

    function getAllDoctors()
    {
        include "connection.php";

        try {
            $hasActive = $this->hasActiveColumn($conn);
            $stmt = $conn->prepare("
                SELECT d.*, u.name, u.email, u.created_at" . ($hasActive ? ", u.is_active" : "") . ", s.name AS specialization_name
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                ORDER BY u.name
            ");
            $stmt->execute();
            $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'doctors' => $doctors];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch doctors: ' . $e->getMessage()];
        }
    }

    function getDoctorByUserId($user_id)
    {
        include "connection.php";

        try {
            $hasActive = $this->hasActiveColumn($conn);
            $stmt = $conn->prepare("
                SELECT d.*, u.name, u.email, u.created_at" . ($hasActive ? ", u.is_active" : "") . ", s.name AS specialization_name
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                WHERE u.user_id = :user_id
                LIMIT 1
            ");
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
            $doctor = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($doctor) {
                return ['success' => true, 'doctor' => $doctor];
            } else {
                return ['success' => false, 'message' => 'Doctor not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch doctor: ' . $e->getMessage()];
        }
    }

    function getDoctorById($doctor_id)
    {
        include "connection.php";

        try {
            $hasActive = $this->hasActiveColumn($conn);
            $stmt = $conn->prepare("
                SELECT d.*, u.name, u.email, u.created_at" . ($hasActive ? ", u.is_active" : "") . ", s.name AS specialization_name
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                WHERE d.doctor_id = :doctor_id
                LIMIT 1
            ");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();
            $doctor = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($doctor) {
                return ['success' => true, 'doctor' => $doctor];
            } else {
                return ['success' => false, 'message' => 'Doctor not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch doctor: ' . $e->getMessage()];
        }
    }

    // ✅ Add new doctor (INSERT into tbl_users + tbl_doctors)
    function addDoctor($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['name']) || empty($data['email']) || empty($data['password']) ||
            empty($data['license_number']) || empty($data['specialization_id'])) {
            file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | VALIDATION FAIL" . PHP_EOL, FILE_APPEND);
            return ['success' => false, 'message' => 'Name, email, password, license number, and specialization are required.'];
        }

        try {
            $conn->beginTransaction();

            // Check email uniqueness
            $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
            $stmt->bindParam(":email", $data['email']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $conn->rollBack();
                file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | EMAIL EXISTS" . PHP_EOL, FILE_APPEND);
                return ['success' => false, 'message' => 'Email is already registered.'];
            }

            // Check license uniqueness
            $stmt = $conn->prepare("SELECT doctor_id FROM tbl_doctors WHERE license_number = :license_number");
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $conn->rollBack();
                file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | LICENSE EXISTS" . PHP_EOL, FILE_APPEND);
                return ['success' => false, 'message' => 'License number is already registered.'];
            }

            // Resolve doctor role_id
            $roleName = 'doctor';
            $roleStmt = $conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = :role_name LIMIT 1");
            $roleStmt->bindParam(":role_name", $roleName);
            $roleStmt->execute();
            $role = $roleStmt->fetch(PDO::FETCH_ASSOC);
            if (!$role) {
                $conn->rollBack();
                file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | ROLE MISSING" . PHP_EOL, FILE_APPEND);
                return ['success' => false, 'message' => 'Doctor role not found.'];
            }
            $role_id = $role['role_id'];

            // Insert into users (force password change on first login)
            $stmt = $conn->prepare("INSERT INTO tbl_users (name, email, password, role_id, must_change_password) VALUES (:name, :email, :password, :role_id, 1)");
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":password", $hashedPassword);
            $stmt->bindParam(":role_id", $role_id);
            if (!$stmt->execute()) {
                $conn->rollBack();
                file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | USERS INSERT ERROR: " . implode(" | ", $stmt->errorInfo()) . PHP_EOL, FILE_APPEND);
                return ['success' => false, 'message' => 'Failed to insert user.'];
            }
            $user_id = $conn->lastInsertId();

            // Insert into doctors
            $stmt = $conn->prepare("INSERT INTO tbl_doctors (user_id, license_number, specialization_id, years_experience)
                                    VALUES (:user_id, :license_number, :specialization_id, :years_experience)");
            $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->bindParam(":specialization_id", $data['specialization_id'], PDO::PARAM_INT);
            if (isset($data['years_experience']) && $data['years_experience'] !== '' && $data['years_experience'] !== null) {
                $years_experience = (int)$data['years_experience'];
                $stmt->bindParam(":years_experience", $years_experience, PDO::PARAM_INT);
            } else {
                $years_experience = null;
                $stmt->bindParam(":years_experience", $years_experience, PDO::PARAM_NULL);
            }
            if (!$stmt->execute()) {
                $conn->rollBack();
                file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | DOCTORS INSERT ERROR: " . implode(" | ", $stmt->errorInfo()) . PHP_EOL, FILE_APPEND);
                return ['success' => false, 'message' => 'Failed to insert doctor.'];
            }

            $conn->commit();
            return ['success' => true, 'message' => 'Doctor added successfully!'];
        } catch (PDOException $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | EXCEPTION: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
            return ['success' => false, 'message' => 'Failed to add doctor: ' . $e->getMessage()];
        }
    }

    function updateDoctor($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['doctor_id']) || empty($data['name']) || empty($data['email']) ||
            empty($data['license_number'])) {
            return ['success' => false, 'message' => 'Doctor ID, name, email, and license number are required.'];
        }

        try {
            $conn->beginTransaction();

            // Get user_id for the doctor
            $stmt = $conn->prepare("SELECT user_id FROM tbl_doctors WHERE doctor_id = :doctor_id");
            $stmt->bindParam(":doctor_id", $data['doctor_id']);
            $stmt->execute();
            $doctor = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$doctor) {
                $conn->rollBack();
                return ['success' => false, 'message' => 'Doctor not found.'];
            }

            $user_id = $doctor['user_id'];

            // Check email uniqueness
            $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email AND user_id != :user_id");
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $conn->rollBack();
                return ['success' => false, 'message' => 'Email is already registered by another user.'];
            }

            // Check license uniqueness
            $stmt = $conn->prepare("SELECT doctor_id FROM tbl_doctors WHERE license_number = :license_number AND doctor_id != :doctor_id");
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->bindParam(":doctor_id", $data['doctor_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $conn->rollBack();
                return ['success' => false, 'message' => 'License number is already registered by another doctor.'];
            }

            // Update user info
            $sql = "UPDATE tbl_users SET name = :name, email = :email WHERE user_id = :user_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();

            // Update doctor info
            $sql = "UPDATE tbl_doctors
                    SET license_number = :license_number, specialization_id = :specialization_id, years_experience = :years_experience
                    WHERE doctor_id = :doctor_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->bindParam(":specialization_id", $data['specialization_id']);
            if (isset($data['years_experience']) && $data['years_experience'] !== '' && $data['years_experience'] !== null) {
                $years_experience = (int)$data['years_experience'];
                $stmt->bindParam(":years_experience", $years_experience, PDO::PARAM_INT);
            } else {
                $years_experience = null;
                $stmt->bindParam(":years_experience", $years_experience, PDO::PARAM_NULL);
            }
            $stmt->bindParam(":doctor_id", $data['doctor_id']);
            $stmt->execute();

            $conn->commit();
            return ['success' => true, 'message' => 'Doctor updated successfully!'];
        } catch (PDOException $e) {
            $conn->rollBack();
            return ['success' => false, 'message' => 'Failed to update doctor: ' . $e->getMessage()];
        }
    }

    function deleteDoctor($doctor_id)
    {
        include "connection.php";

        if (empty($doctor_id)) {
            return ['success' => false, 'message' => 'Doctor ID is required.'];
        }

        try {
            $conn->beginTransaction();

            $stmt = $conn->prepare("SELECT user_id FROM tbl_doctors WHERE doctor_id = :doctor_id");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();
            $doctor = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$doctor) {
                $conn->rollBack();
                return ['success' => false, 'message' => 'Doctor not found.'];
            }

            $user_id = $doctor['user_id'];

            // Prevent delete if linked records exist (appointments, lab requests, etc.)
            $checkTables = [
                ["tbl_appointments", "doctor_id"],
                ["tbl_lab_requests", "doctor_id"],
                ["tbl_diagnoses", "doctor_id"],
                ["tbl_prescriptions", "doctor_id"]
            ];

            foreach ($checkTables as $check) {
                $stmt = $conn->prepare("SELECT COUNT(*) FROM {$check[0]} WHERE {$check[1]} = :doctor_id");
                $stmt->bindParam(":doctor_id", $doctor_id);
                $stmt->execute();
                if ($stmt->fetchColumn() > 0) {
                    $conn->rollBack();
                    return ['success' => false, 'message' => "Cannot delete doctor. They have existing records in {$check[0]}."];
                }
            }

            // Delete doctor record
            $stmt = $conn->prepare("DELETE FROM tbl_doctors WHERE doctor_id = :doctor_id");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();

            // Delete user record
            $stmt = $conn->prepare("DELETE FROM tbl_users WHERE user_id = :user_id");
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();

            $conn->commit();
            return ['success' => true, 'message' => 'Doctor deleted successfully!'];
        } catch (PDOException $e) {
            $conn->rollBack();
            return ['success' => false, 'message' => 'Failed to delete doctor: ' . $e->getMessage()];
        }
    }

    function getDoctorStatistics()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("SELECT COUNT(*) as total_doctors FROM tbl_doctors");
            $stmt->execute();
            $totalDoctors = $stmt->fetchColumn();

            $stmt = $conn->prepare("
                SELECT s.name AS specialization_name, COUNT(*) as count
                FROM tbl_doctors d
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                GROUP BY s.name
            ");
            $stmt->execute();
            $specializationStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmt = $conn->prepare("
                SELECT COUNT(*) as recent_doctors
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $stmt->execute();
            $recentDoctors = $stmt->fetchColumn();

            return [
                'success' => true,
                'statistics' => [
                    'total_doctors' => $totalDoctors,
                    'recent_doctors' => $recentDoctors,
                    'specialization_stats' => $specializationStats
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch doctor statistics: ' . $e->getMessage()];
        }
    }

    function getAllSpecializations()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("SELECT specialization_id, name FROM tbl_specializations ORDER BY name");
            $stmt->execute();
            $specializations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'specializations' => $specializations];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch specializations: ' . $e->getMessage()];
        }
    }

    function getDoctorsWithAppointments()
    {
        include "connection.php";
        try {
            $sql = "
                SELECT d.doctor_id, d.specialization_id, d.license_number, d.years_experience,
                       u.name, u.email, u.created_at, s.name AS specialization_name
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                WHERE d.doctor_id IN (
                    SELECT DISTINCT doctor_id FROM tbl_appointments WHERE doctor_id IS NOT NULL
                )
                ORDER BY u.name
            ";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'doctors' => $doctors];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch doctors with appointments: ' . $e->getMessage()];
        }
    }

    // New: Today overview based on appointments only
    function getTodayDoctorAppointments()
    {
        include "connection.php";
        try {
            $sql = "
                SELECT
                    d.doctor_id,
                    u.name AS doctor_name,
                    s.name AS specialization_name,
                    COUNT(a.appointment_id) AS patient_count
                FROM tbl_doctors d
                JOIN tbl_users u ON d.user_id = u.user_id
                LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                LEFT JOIN tbl_appointments a ON a.doctor_id = d.doctor_id AND a.appointment_date = CURDATE()
                WHERE d.doctor_id IN (
                    SELECT DISTINCT doctor_id FROM tbl_appointments WHERE doctor_id IS NOT NULL AND appointment_date = CURDATE()
                )
                GROUP BY d.doctor_id, u.name, s.name
                ORDER BY u.name
            ";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch patients per doctor for today
            $detailStmt = $conn->prepare("
                SELECT a.appointment_id, a.patient_id, a.queue_number, a.status_id,
                       pu.name AS patient_name
                FROM tbl_appointments a
                JOIN tbl_patients p ON a.patient_id = p.patient_id
                JOIN tbl_users pu ON p.user_id = pu.user_id
                WHERE a.doctor_id = :doctor_id AND a.appointment_date = CURDATE()
                ORDER BY COALESCE(a.queue_number, 9999), a.appointment_id
            ");

            foreach ($doctors as &$doc) {
                $detailStmt->bindParam(":doctor_id", $doc['doctor_id']);
                $detailStmt->execute();
                $doc['patients'] = $detailStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            return ['success' => true, 'today' => $doctors];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch today appointments: ' . $e->getMessage()];
        }
    }

    function toggle_active($doctor_id)
    {
        include "connection.php";
        if (empty($doctor_id)) {
            return ['success' => false, 'message' => 'Doctor ID is required.'];
        }
        if (!$this->hasActiveColumn($conn)) {
            return ['success' => false, 'message' => 'is_active column not found. Run migration.'];
        }
        try {
            $stmt = $conn->prepare("SELECT user_id FROM tbl_doctors WHERE doctor_id = :id LIMIT 1");
            $stmt->bindParam(":id", $doctor_id);
            $stmt->execute();
            $userId = $stmt->fetchColumn();
            if (!$userId) return ['success' => false, 'message' => 'Doctor not found.'];

            $stmt = $conn->prepare("UPDATE tbl_users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE user_id = :uid");
            $stmt->bindParam(":uid", $userId);
            $stmt->execute();
            return ['success' => true, 'message' => 'Status updated.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update status: ' . $e->getMessage()];
        }
    }
}


// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $doctor_id = $_GET['doctor_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $doctor_id = $_POST['doctor_id'] ?? "";
}

$doctors = new Doctors();

switch ($operation) {
    case "getAll":
        echo json_encode($doctors->getAllDoctors());
        break;
    case "getById":
        echo json_encode($doctors->getDoctorById($doctor_id));
        break;
    case "add": // ✅ new case
        echo json_encode($doctors->addDoctor($json));
        break;
    case "update":
        echo json_encode($doctors->updateDoctor($json));
        break;
    case "delete":
        echo json_encode($doctors->deleteDoctor($doctor_id));
        break;
    case "toggle_active":
        echo json_encode($doctors->toggle_active($doctor_id));
        break;
    case "getStatistics":
        echo json_encode($doctors->getDoctorStatistics());
        break;
    case "getSpecializations":
        echo json_encode($doctors->getAllSpecializations());
        break;
    case "getDoctorsWithAppointments":
        echo json_encode($doctors->getDoctorsWithAppointments());
        break;
    case "getByUserId":
        $uid = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        echo json_encode($doctors->getDoctorByUserId($uid));
        break;
    case "getSchedulesByDoctor":
        $did = $_GET['doctor_id'] ?? $_POST['doctor_id'] ?? '';
        echo json_encode($doctors->getSchedulesByDoctor($did));
        break;
    case "upsertSchedule":
        echo json_encode($doctors->upsertSchedule($json));
        break;
    case "deleteSchedule":
        $sid = $_GET['schedule_id'] ?? $_POST['schedule_id'] ?? '';
        echo json_encode($doctors->deleteSchedule($sid));
        break;
    case "getTodayDoctorAppointments":
        echo json_encode($doctors->getTodayDoctorAppointments());
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
