<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class User
{
 function register($json)
{
    include "connection.php";
    $data = json_decode($json, true);

    // 1. Log raw payload for debugging
    file_put_contents("register_debug.log", date("Y-m-d H:i:s") . " | RAW JSON: " . $json . PHP_EOL, FILE_APPEND);

    // 2. Basic validation
    if (
        empty($data['name']) ||
        empty($data['email']) ||
        empty($data['password']) ||
        empty($data['role'])
    ) {
        return ['success' => false, 'message' => 'All fields are required.'];
    }

    // 3. Normalize role to lowercase to avoid case mismatch
    $roleName = strtolower(trim($data['role']));

    // 4. Get role_id from tbl_roles
    $stmt = $conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = :role_name");
    $stmt->bindParam(":role_name", $roleName);
    $stmt->execute();
    $role = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$role) {
        return ['success' => false, 'message' => "Invalid role selected: {$roleName}"];
    }
    $role_id = $role['role_id'];

    // 5. Role-specific required fields
    if ($roleName === 'doctor' && empty($data['license_number'])) {
        return ['success' => false, 'message' => 'License number is required for doctors.'];
    }
    if ($roleName === 'secretary' && empty($data['employee_id'])) {
        return ['success' => false, 'message' => 'Employee ID is required for secretaries.'];
    }

    // 6. Check if email exists
    $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
    $stmt->bindParam(":email", $data['email']);
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        return ['success' => false, 'message' => 'Email is already registered.'];
    }

    // 7. Insert into tbl_users
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
    $sql = "INSERT INTO tbl_users (name, email, password, role_id)
            VALUES (:name, :email, :password, :role_id)";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":name", $data['name']);
    $stmt->bindParam(":email", $data['email']);
    $stmt->bindParam(":password", $hashedPassword);
    $stmt->bindParam(":role_id", $role_id);

    if (!$stmt->execute()) {
        return ['success' => false, 'message' => 'Failed to insert user: ' . implode(" | ", $stmt->errorInfo())];
    }

    $user_id = $conn->lastInsertId();

    // 8. Role-specific inserts
    try {
        if ($roleName === 'doctor') {
            $sqlDoctor = "INSERT INTO tbl_doctors (user_id, license_number)
                          VALUES (:user_id, :license_number)";
            $stmt = $conn->prepare($sqlDoctor);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->execute();
        }
        if ($roleName === 'secretary') {
            $sqlSec = "INSERT INTO tbl_secretaries (user_id, employee_id)
                       VALUES (:user_id, :employee_id)";
            $stmt = $conn->prepare($sqlSec);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":employee_id", $data['employee_id']);
            $stmt->execute();
        }
        if ($roleName === 'patient') {
            $sqlPat = "INSERT INTO tbl_patients (user_id)
                       VALUES (:user_id)";
            $stmt = $conn->prepare($sqlPat);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
        }
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Role-specific insert failed: ' . $e->getMessage()];
    }

    return ['success' => true, 'message' => 'Registration successful!'];
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

        // Join with tbl_roles to get role_name
        $stmt = $conn->prepare("
            SELECT u.user_id, u.name, u.email, u.password, r.role_name
            FROM tbl_users u
            JOIN tbl_roles r ON u.role_id = r.role_id
            WHERE u.email = :email
        ");
        $stmt->bindParam(":email", $data['email']);
        $stmt->execute();

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($data['password'], $user['password'])) {
            return [
                'success' => true,
                'message' => 'Login successful!',
                'user' => [
                    'id' => $user['user_id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role_name']
                ]
            ];
        }
        return ['success' => false, 'message' => 'Invalid email or password.'];
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
    case "login":
        echo json_encode($user->login($json));
        break;
    case "profile":
        $uid = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
        echo json_encode($user->profile($uid));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
