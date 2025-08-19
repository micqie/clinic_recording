<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Doctors
{
    function getAllDoctors()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT d.*, u.name, u.email, u.created_at, s.name AS specialization_name
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

    function getDoctorById($doctor_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT d.*, u.name, u.email, u.created_at, s.name AS specialization_name
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
        file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | RAW JSON: " . $json . PHP_EOL, FILE_APPEND);

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

            // Insert into users
            $stmt = $conn->prepare("INSERT INTO tbl_users (name, email, password, role_id) VALUES (:name, :email, :password, :role_id)");
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
            file_put_contents("add_doctor_debug.log", date("Y-m-d H:i:s") . " | SUCCESS user_id=" . $user_id . PHP_EOL, FILE_APPEND);
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

    // =============== Doctor Schedules ===============
    function getSchedulesByDoctor($doctor_id)
    {
        include "connection.php";
        if (empty($doctor_id)) {
            return ['success' => false, 'message' => 'doctor_id is required.'];
        }
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_doctor_schedules WHERE doctor_id = :doctor_id ORDER BY day_of_week, start_time");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'schedules' => $rows];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch schedules: ' . $e->getMessage()];
        }
    }

    function upsertSchedule($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['doctor_id']) || !isset($data['day_of_week']) || empty($data['start_time']) || empty($data['end_time'])) {
            return ['success' => false, 'message' => 'doctor_id, day_of_week, start_time, end_time are required.'];
        }
        $is_available = isset($data['is_available']) ? (int)$data['is_available'] : 1;
        try {
            // Try update by unique key
            $sql = "INSERT INTO tbl_doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available)
                    VALUES (:doctor_id, :day_of_week, :start_time, :end_time, :is_available)
                    ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), start_time = VALUES(start_time), end_time = VALUES(end_time)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":doctor_id", $data['doctor_id']);
            $stmt->bindParam(":day_of_week", $data['day_of_week']);
            $stmt->bindParam(":start_time", $data['start_time']);
            $stmt->bindParam(":end_time", $data['end_time']);
            $stmt->bindParam(":is_available", $is_available);
            $stmt->execute();
            return ['success' => true, 'message' => 'Schedule saved'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to save schedule: ' . $e->getMessage()];
        }
    }

    function deleteSchedule($schedule_id)
    {
        include "connection.php";
        if (empty($schedule_id)) {
            return ['success' => false, 'message' => 'schedule_id is required.'];
        }
        try {
            $stmt = $conn->prepare("DELETE FROM tbl_doctor_schedules WHERE schedule_id = :sid");
            $stmt->bindParam(":sid", $schedule_id);
            $stmt->execute();
            return ['success' => true, 'message' => 'Schedule deleted'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete schedule: ' . $e->getMessage()];
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
    case "getStatistics":
        echo json_encode($doctors->getDoctorStatistics());
        break;
    case "getSpecializations":
        echo json_encode($doctors->getAllSpecializations());
        break;
    case "getDoctorsWithAppointments":
        echo json_encode($doctors->getDoctorsWithAppointments());
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
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
