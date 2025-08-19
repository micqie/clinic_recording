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

        if (empty($data['name']) || empty($data['email']) || empty($data['password']) ||
            empty($data['license_number'])) {
            return ['success' => false, 'message' => 'Name, email, password, and license number are required.'];
        }

        try {
            $conn->beginTransaction();

            // Check email uniqueness
            $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
            $stmt->bindParam(":email", $data['email']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $conn->rollBack();
                return ['success' => false, 'message' => 'Email is already registered.'];
            }

            // Check license uniqueness
            $stmt = $conn->prepare("SELECT doctor_id FROM tbl_doctors WHERE license_number = :license_number");
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $conn->rollBack();
                return ['success' => false, 'message' => 'License number is already registered.'];
            }

            // Insert into users
            $stmt = $conn->prepare("INSERT INTO tbl_users (name, email, password, role) VALUES (:name, :email, :password, 'doctor')");
            $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":password", $hashedPassword);
            $stmt->execute();
            $user_id = $conn->lastInsertId();

            // Insert into doctors
            $stmt = $conn->prepare("
                INSERT INTO tbl_doctors (user_id, license_number, specialization_id, years_experience)
                VALUES (:user_id, :license_number, :specialization_id, :years_experience)
            ");
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->bindParam(":specialization_id", $data['specialization_id']);
            $stmt->bindParam(":years_experience", $data['years_experience']);
            $stmt->execute();

            $conn->commit();
            return ['success' => true, 'message' => 'Doctor added successfully!'];
        } catch (PDOException $e) {
            $conn->rollBack();
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
            $stmt->bindParam(":years_experience", $data['years_experience']);
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
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
