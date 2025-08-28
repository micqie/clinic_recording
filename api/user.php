<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class User
{
 function register($json)
{
   include "connection.php";
   $data = json_decode($json, true);

   // 1. (debug logging removed)

   // 2. Basic validation
   if (
       empty($data['name']) ||
       empty($data['email']) ||
       empty($data['password'])
   ) {
       return ['success' => false, 'message' => 'All fields are required.'];
   }

   // 3. Restrict registration to patients only
   $roleName = 'patient';

   // 4. Get role_id from tbl_roles
   $stmt = $conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = :role_name");
   $stmt->bindParam(":role_name", $roleName);
   $stmt->execute();
   $role = $stmt->fetch(PDO::FETCH_ASSOC);

   if (!$role) {
       return ['success' => false, 'message' => "Invalid role selected: {$roleName}"];
   }
   $role_id = $role['role_id'];

   // 5. Check if email exists
   $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
   $stmt->bindParam(":email", $data['email']);
   $stmt->execute();
   if ($stmt->rowCount() > 0) {
       return ['success' => false, 'message' => 'Email is already registered.'];
   }

   try {
       $conn->beginTransaction();

       // 6. Insert into tbl_users (force password change on first login)
       $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
       $sql = "INSERT INTO tbl_users (name, email, password, role_id, must_change_password)
               VALUES (:name, :email, :password, :role_id, 1)";
       $stmt = $conn->prepare($sql);
       $stmt->bindParam(":name", $data['name']);
       $stmt->bindParam(":email", $data['email']);
       $stmt->bindParam(":password", $hashedPassword);
       $stmt->bindParam(":role_id", $role_id);

       if (!$stmt->execute()) {
           $err = $stmt->errorInfo();
           $conn->rollBack();
           return ['success' => false, 'message' => 'Failed to insert user: ' . implode(" | ", $err)];
       }

       $user_id = $conn->lastInsertId();

       // 7. Insert into tbl_patients (conditionally include age)
       $hasAge = (bool)$conn->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_patients' AND COLUMN_NAME = 'age'")->fetchColumn();
       if ($hasAge) {
           $sqlPat = "INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, age, address)
                      VALUES (:user_id, :sex, :contact_num, :birthdate, :age, :address)";
       } else {
           $sqlPat = "INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, address)
                      VALUES (:user_id, :sex, :contact_num, :birthdate, :address)";
       }
       $stmt = $conn->prepare($sqlPat);

       $sex = $data['sex'] ?? null; if ($sex === '') $sex = null;
       $contact = $data['contact_num'] ?? null; if ($contact === '') $contact = null;
       $birthdate = $data['birthdate'] ?? null; if ($birthdate === '') $birthdate = null;
       $age = $data['age'] ?? null; if ($age === '') $age = null; if ($age !== null) $age = (int)$age;
       $address = $data['address'] ?? null; if ($address === '') $address = null;

       $stmt->bindParam(":user_id", $user_id);
       $stmt->bindParam(":sex", $sex);
       $stmt->bindParam(":contact_num", $contact);
       $stmt->bindParam(":birthdate", $birthdate);
       if ($hasAge) {
           if ($age === null) {
               $stmt->bindValue(":age", null, PDO::PARAM_NULL);
           } else {
               $stmt->bindValue(":age", $age, PDO::PARAM_INT);
           }
       }
       $stmt->bindParam(":address", $address);

       if (!$stmt->execute()) {
           $err = $stmt->errorInfo();
           $conn->rollBack();
           return ['success' => false, 'message' => 'Failed to insert patient: ' . implode(" | ", $err)];
       }

       $conn->commit();
       return ['success' => true, 'message' => 'Registration successful!'];
   } catch (PDOException $e) {
       if ($conn->inTransaction()) {
           $conn->rollBack();
       }
       return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
   }
}

function registerDoctor($json)
{
    include "connection.php";
    $data = json_decode($json, true);

    // 1. Basic validation
    if (
        empty($data['name']) ||
        empty($data['email']) ||
        empty($data['password']) ||
        empty($data['license_number']) ||
        empty($data['specialization_id'])
    ) {
        return ['success' => false, 'message' => 'Name, email, password, license, and specialization are required.'];
    }

    // 2. Set role to doctor
    $roleName = 'doctor';

    // 3. Get role_id from tbl_roles
    $stmt = $conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = :role_name");
    $stmt->bindParam(":role_name", $roleName);
    $stmt->execute();
    $role = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$role) {
        return ['success' => false, 'message' => "Invalid role selected: {$roleName}"];
    }
    $role_id = $role['role_id'];

    // 4. Check if email exists
    $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
    $stmt->bindParam(":email", $data['email']);
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        return ['success' => false, 'message' => 'Email is already registered.'];
    }

    try {
        $conn->beginTransaction();

        // 6. Insert into tbl_users (force password change on first login)
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $sql = "INSERT INTO tbl_users (name, email, password, role_id, must_change_password)
                VALUES (:name, :email, :password, :role_id, 1)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":role_id", $role_id);
        if (!$stmt->execute()) {
            $conn->rollBack();
            $err = $stmt->errorInfo();
            return ['success' => false, 'message' => 'Failed to insert user: ' . implode(" | ", $err)];
        }

        $user_id = $conn->lastInsertId();

        // 7. Insert into tbl_doctors (use specialization_id)
        $sqlDoctor = "INSERT INTO tbl_doctors (user_id, license_number, specialization_id, years_experience)
                      VALUES (:user_id, :license_number, :specialization_id, :years_experience)";
        $stmt = $conn->prepare($sqlDoctor);
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
            $err = $stmt->errorInfo();
            return ['success' => false, 'message' => 'Doctor insert failed: ' . implode(" | ", $err)];
        }

        $conn->commit();
        return ['success' => true, 'message' => 'Doctor registration successful!'];
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
    }
}

function registerPatient($json)
{
    include "connection.php";
    $data = json_decode($json, true);

    // 1. Basic validation
    if (
        empty($data['name']) ||
        empty($data['email']) ||
        empty($data['password'])
    ) {
        return ['success' => false, 'message' => 'All fields are required.'];
    }

    // 2. Set role to patient
    $roleName = 'patient';

    // 3. Get role_id from tbl_roles
    $stmt = $conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = :role_name");
    $stmt->bindParam(":role_name", $roleName);
    $stmt->execute();
    $role = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$role) {
        return ['success' => false, 'message' => "Invalid role selected: {$roleName}"];
    }
    $role_id = $role['role_id'];

    // 4. Check if email exists
    $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
    $stmt->bindParam(":email", $data['email']);
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        return ['success' => false, 'message' => 'Email is already registered.'];
    }

    try {
        $conn->beginTransaction();

        // 5. Insert into tbl_users (force password change on first login)
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $sql = "INSERT INTO tbl_users (name, email, password, role_id, must_change_password)
                VALUES (:name, :email, :password, :role_id, 1)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":role_id", $role_id);

        if (!$stmt->execute()) {
            $err = $stmt->errorInfo();
            $conn->rollBack();
            return ['success' => false, 'message' => 'Failed to insert user: ' . implode(" | ", $err)];
        }

        $user_id = $conn->lastInsertId();

        // 6. Insert into tbl_patients (conditionally include age)
        $hasAge = (bool)$conn->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_patients' AND COLUMN_NAME = 'age'")->fetchColumn();
        if ($hasAge) {
            $sqlPat = "INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, age, address)
                       VALUES (:user_id, :sex, :contact_num, :birthdate, :age, :address)";
        } else {
            $sqlPat = "INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, address)
                       VALUES (:user_id, :sex, :contact_num, :birthdate, :address)";
        }
        $stmt = $conn->prepare($sqlPat);

        $sex = $data['sex'] ?? null; if ($sex === '') $sex = null;
        $contact = $data['contact_num'] ?? null; if ($contact === '') $contact = null;
        $birthdate = $data['birthdate'] ?? null; if ($birthdate === '') $birthdate = null;
        $age = $data['age'] ?? null; if ($age === '') $age = null; if ($age !== null) $age = (int)$age;
        $address = $data['address'] ?? null; if ($address === '') $address = null;

        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":sex", $sex);
        $stmt->bindParam(":contact_num", $contact);
        $stmt->bindParam(":birthdate", $birthdate);
        if ($hasAge) {
            if ($age === null) {
                $stmt->bindValue(":age", null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(":age", $age, PDO::PARAM_INT);
            }
        }
        $stmt->bindParam(":address", $address);

        if (!$stmt->execute()) {
            $err = $stmt->errorInfo();
            $conn->rollBack();
            return ['success' => false, 'message' => 'Failed to insert patient: ' . implode(" | ", $err)];
        }

        $conn->commit();
        return ['success' => true, 'message' => 'Patient registration successful!'];
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
    }
}

    function profile($user_id)
    {
        include "connection.php";
        if (empty($user_id)) {
            return ['success' => false, 'message' => 'user_id is required.'];
        }
        $stmt = $conn->prepare("SELECT u.user_id, u.name, u.email, r.role_name FROM tbl_users u JOIN tbl_roles r ON u.role_id = r.role_id WHERE u.user_id = :uid LIMIT 1");
        $stmt->bindParam(":uid", $user_id);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            return ['success' => false, 'message' => 'User not found.'];
        }
        $role = $user['role_name'];
        $ctx = [];
        if ($role === 'patient') {
            $q = $conn->prepare("SELECT patient_id FROM tbl_patients WHERE user_id = :uid LIMIT 1");
            $q->bindParam(":uid", $user_id);
            $q->execute();
            $ctx['patient_id'] = $q->fetchColumn();
        } else if ($role === 'doctor') {
            $q = $conn->prepare("SELECT doctor_id FROM tbl_doctors WHERE user_id = :uid LIMIT 1");
            $q->bindParam(":uid", $user_id);
            $q->execute();
            $ctx['doctor_id'] = $q->fetchColumn();
        } else if ($role === 'secretary') {
            $q = $conn->prepare("SELECT secretary_id FROM tbl_secretaries WHERE user_id = :uid LIMIT 1");
            $q->bindParam(":uid", $user_id);
            $q->execute();
            $ctx['secretary_id'] = $q->fetchColumn();
        }
        return ['success' => true, 'user' => $user, 'context' => $ctx];
    }

    function login($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['email']) || empty($data['password'])) {
            return ['success' => false, 'message' => 'Email and password are required.'];
        }

        // Detect is_active column
        $hasActive = (bool)$conn->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_users' AND COLUMN_NAME = 'is_active'")->fetchColumn();

        // Join with tbl_roles to get role_name
        $stmt = $conn->prepare("
            SELECT u.user_id, u.name, u.email, u.password, u.must_change_password, r.role_name" . ($hasActive ? ", u.is_active" : "") . "
            FROM tbl_users u
            JOIN tbl_roles r ON u.role_id = r.role_id
            WHERE u.email = :email
        ");
        $stmt->bindParam(":email", $data['email']);
        $stmt->execute();

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($data['password'], $user['password'])) {
            if ($hasActive && isset($user['is_active']) && (int)$user['is_active'] === 0) {
                return ['success' => false, 'message' => 'Account is deactivated. Please contact the administrator.'];
            }
            return [
                'success' => true,
                'message' => 'Login successful!',
                'user' => [
                    'id' => $user['user_id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role_name'],
                    'must_change_password' => (int)($user['must_change_password'] ?? 0)
                ]
            ];
        }
        return ['success' => false, 'message' => 'Invalid email or password.'];
    }

    function changePassword($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['user_id']) || empty($data['current_password']) || empty($data['new_password'])) {
            return ['success' => false, 'message' => 'User ID, current password, and new password are required.'];
        }

        try {
            // Verify current password
            $stmt = $conn->prepare("SELECT password FROM tbl_users WHERE user_id = :user_id LIMIT 1");
            $stmt->bindParam(":user_id", $data['user_id']);
            $stmt->execute();

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) {
                return ['success' => false, 'message' => 'User not found.'];
            }

            if (!password_verify($data['current_password'], $user['password'])) {
                return ['success' => false, 'message' => 'Current password is incorrect.'];
            }

            // Hash new password and update
            $newPasswordHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
            $updateStmt = $conn->prepare("UPDATE tbl_users SET password = :password, must_change_password = 0 WHERE user_id = :user_id");
            $updateStmt->bindParam(":password", $newPasswordHash);
            $updateStmt->bindParam(":user_id", $data['user_id']);
            $updateStmt->execute();

            return ['success' => true, 'message' => 'Password changed successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to change password: ' . $e->getMessage()];
        }
    }

    function get_patient_appointment($patientId, $date)
    {
        include "connection.php";

        if (empty($patientId) || empty($date)) {
            return ['success' => false, 'message' => 'Patient ID and date are required.'];
        }

        try {
            $stmt = $conn->prepare("
                SELECT
                    a.appointment_id,
                    a.queue_number,
                    a.appointment_date,
                    s.status_name AS appointment_status,
                    d.doctor_id,
                    du.name AS doctor_name,
                    sp.name AS specialization_name
                FROM tbl_appointments a
                JOIN tbl_status s ON a.status_id = s.status_id
                LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_specializations sp ON d.specialization_id = sp.specialization_id
                WHERE a.patient_id = :patient_id
                AND a.appointment_date = :date
                AND s.status_name IN ('Confirmed', 'In Consultation', 'Completed')
                ORDER BY a.queue_number ASC
                LIMIT 1
            ");
            $stmt->bindParam(":patient_id", $patientId);
            $stmt->bindParam(":date", $date);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result) {
                return ['success' => true, 'appointment' => $result];
            } else {
                return ['success' => false, 'message' => 'No appointment found for this date'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to get appointment: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
}

$user = new User();

switch ($operation) {
    case "register":
        echo json_encode($user->register($json));
        break;
    case "registerDoctor":
        echo json_encode($user->registerDoctor($json));
        break;
    case "registerPatient":
        echo json_encode($user->registerPatient($json));
        break;
    case "login":
        echo json_encode($user->login($json));
        break;
    case "profile":
        $uid = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        echo json_encode($user->profile($uid));
        break;
    case "get_patient_appointment":
        $patientId = $_GET['patient_id'] ?? $_POST['patient_id'] ?? '';
        $date = $_GET['date'] ?? $_POST['date'] ?? '';
        echo json_encode($user->get_patient_appointment($patientId, $date));
        break;
    case "changePassword":
        echo json_encode($user->changePassword($json));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
