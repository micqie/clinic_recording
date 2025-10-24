<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Nurses {
    private $conn;

    public function __construct() {
        include "connection.php";
        $this->conn = $conn;
    }

    // Create nurse profile row for an existing user if missing
    public function create_if_missing($data) {
        if (empty($data['user_id'])) {
            echo json_encode(["success" => false, "message" => "user_id is required"]);
            return;
        }
        try {
            // Verify user exists (allow any role for nurse profile creation)
            $u = $this->conn->prepare("SELECT u.user_id, r.role_name FROM tbl_users u JOIN tbl_roles r ON u.role_id = r.role_id WHERE u.user_id = :id LIMIT 1");
            $u->bindParam(":id", $data['user_id']);
            $u->execute();
            $row = $u->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                echo json_encode(["success" => false, "message" => "User not found"]);
                return;
            }
            // Check if nurse profile exists
            $c = $this->conn->prepare("SELECT nurse_id FROM tbl_nurses WHERE user_id = :id LIMIT 1");
            $c->bindParam(":id", $data['user_id']);
            $c->execute();
            $exists = $c->fetch(PDO::FETCH_ASSOC);
            if ($exists) {
                echo json_encode(["success" => true, "nurse_id" => $exists['nurse_id'], "message" => "Profile exists"]);
                return;
            }
            // Create a minimal nurse profile
            $lic = 'AUTO-' . strtoupper(substr(md5($data['user_id'] . time()), 0, 8));
            $ins = $this->conn->prepare("INSERT INTO tbl_nurses (user_id, license_number, shift_schedule) VALUES (:id, :lic, 'Day Shift 8AM-5PM')");
            $ins->bindParam(":id", $data['user_id']);
            $ins->bindParam(":lic", $lic);
            $ins->execute();
            echo json_encode(["success" => true, "nurse_id" => $this->conn->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }
    // Get all nurses with user details
    public function get_all() {
        try {
            $stmt = $this->conn->prepare("
                SELECT
                    n.nurse_id,
                    n.user_id,
                    n.license_number,
                    n.shift_schedule,
                    n.created_at,
                    n.updated_at,
                    u.name,
                    u.email,
                    u.is_active
                FROM tbl_nurses n
                JOIN tbl_users u ON n.user_id = u.user_id
                ORDER BY u.name ASC
            ");
            $stmt->execute();
            $nurses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => $nurses]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Add new nurse
    public function add($data) {
        if (empty($data['name']) || empty($data['email']) || empty($data['password']) || empty($data['license_number'])) {
            echo json_encode(["success" => false, "message" => "Name, email, password, and license number are required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Get nurse role ID
            $stmt = $this->conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = 'nurse' LIMIT 1");
            $stmt->execute();
            $role = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$role) {
                throw new Exception("Nurse role not found");
            }
            $roleId = $role['role_id'];

            // Check if email already exists
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email");
            $stmt->bindParam(":email", $data['email']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                throw new Exception("Email already exists");
            }

            // Check if license number already exists
            $stmt = $this->conn->prepare("SELECT nurse_id FROM tbl_nurses WHERE license_number = :license");
            $stmt->bindParam(":license", $data['license_number']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                throw new Exception("License number already exists");
            }

            // Insert user
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $this->conn->prepare("INSERT INTO tbl_users (name, email, password, role_id, must_change_password, is_active) VALUES (:name, :email, :password, :role_id, 1, 1)");
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":password", $hashedPassword);
            $stmt->bindParam(":role_id", $roleId);
            $stmt->execute();
            $userId = $this->conn->lastInsertId();

            // Insert nurse details
            $shiftSchedule = $data['shift_schedule'] ?? null;
            $stmt = $this->conn->prepare("INSERT INTO tbl_nurses (user_id, license_number, shift_schedule) VALUES (:user_id, :license_number, :shift_schedule)");
            $stmt->bindParam(":user_id", $userId);
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->bindParam(":shift_schedule", $shiftSchedule);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Nurse added successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // Update nurse
    public function update($data) {
        if (empty($data['nurse_id']) || empty($data['name']) || empty($data['email']) || empty($data['license_number'])) {
            echo json_encode(["success" => false, "message" => "Nurse ID, name, email, and license number are required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Get nurse user_id
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_nurses WHERE nurse_id = :nurse_id LIMIT 1");
            $stmt->bindParam(":nurse_id", $data['nurse_id']);
            $stmt->execute();
            $nurse = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$nurse) {
                throw new Exception("Nurse not found");
            }
            $userId = $nurse['user_id'];

            // Check if email already exists (excluding current nurse)
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE email = :email AND user_id != :user_id");
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                throw new Exception("Email already exists");
            }

            // Check if license number already exists (excluding current nurse)
            $stmt = $this->conn->prepare("SELECT nurse_id FROM tbl_nurses WHERE license_number = :license AND nurse_id != :nurse_id");
            $stmt->bindParam(":license", $data['license_number']);
            $stmt->bindParam(":nurse_id", $data['nurse_id']);
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                throw new Exception("License number already exists");
            }

            // Update user
            $stmt = $this->conn->prepare("UPDATE tbl_users SET name = :name, email = :email WHERE user_id = :user_id");
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();

            // Update nurse details
            $shiftSchedule = $data['shift_schedule'] ?? null;
            $stmt = $this->conn->prepare("UPDATE tbl_nurses SET license_number = :license_number, shift_schedule = :shift_schedule WHERE nurse_id = :nurse_id");
            $stmt->bindParam(":license_number", $data['license_number']);
            $stmt->bindParam(":shift_schedule", $shiftSchedule);
            $stmt->bindParam(":nurse_id", $data['nurse_id']);
            $stmt->execute();

            // Update password if provided
            if (!empty($data['password'])) {
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                $stmt = $this->conn->prepare("UPDATE tbl_users SET password = :password, must_change_password = 1 WHERE user_id = :user_id");
                $stmt->bindParam(":password", $hashedPassword);
                $stmt->bindParam(":user_id", $userId);
                $stmt->execute();
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Nurse updated successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // Delete nurse
    public function delete($nurseId) {
        if (empty($nurseId)) {
            echo json_encode(["success" => false, "message" => "Nurse ID is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Get user_id from nurse
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_nurses WHERE nurse_id = :nurse_id LIMIT 1");
            $stmt->bindParam(":nurse_id", $nurseId);
            $stmt->execute();
            $nurse = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$nurse) {
                throw new Exception("Nurse not found");
            }
            $userId = $nurse['user_id'];

            // Delete nurse record (will cascade to user due to foreign key)
            $stmt = $this->conn->prepare("DELETE FROM tbl_nurses WHERE nurse_id = :nurse_id");
            $stmt->bindParam(":nurse_id", $nurseId);
            $stmt->execute();

            // Delete user record
            $stmt = $this->conn->prepare("DELETE FROM tbl_users WHERE user_id = :user_id");
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Nurse deleted successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // Toggle nurse active status
    public function toggle_status($nurseId) {
        if (empty($nurseId)) {
            echo json_encode(["success" => false, "message" => "Nurse ID is required"]);
            return;
        }

        try {
            // Get user_id from nurse
            $stmt = $this->conn->prepare("SELECT u.user_id, u.is_active FROM tbl_nurses n JOIN tbl_users u ON n.user_id = u.user_id WHERE n.nurse_id = :nurse_id LIMIT 1");
            $stmt->bindParam(":nurse_id", $nurseId);
            $stmt->execute();
            $nurse = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$nurse) {
                throw new Exception("Nurse not found");
            }

            $newStatus = $nurse['is_active'] ? 0 : 1;
            $stmt = $this->conn->prepare("UPDATE tbl_users SET is_active = :status WHERE user_id = :user_id");
            $stmt->bindParam(":status", $newStatus);
            $stmt->bindParam(":user_id", $nurse['user_id']);
            $stmt->execute();

            echo json_encode(["success" => true, "message" => "Nurse status updated", "new_status" => $newStatus]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }
}

// Handle requests
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';
$json = $_POST['json'] ?? $_GET['json'] ?? '';

$nurses = new Nurses();

switch ($operation) {
    case 'get_all':
        $nurses->get_all();
        break;
    case 'add':
        $data = json_decode($json ?: '{}', true);
        $nurses->add($data);
        break;
    case 'create_if_missing':
        $data = json_decode($json ?: '{}', true);
        $nurses->create_if_missing($data);
        break;
    case 'update':
        $data = json_decode($json ?: '{}', true);
        $nurses->update($data);
        break;
    case 'delete':
        $nurseId = $_GET['nurse_id'] ?? $_POST['nurse_id'] ?? '';
        $nurses->delete($nurseId);
        break;
    case 'toggle_status':
        $nurseId = $_GET['nurse_id'] ?? $_POST['nurse_id'] ?? '';
        $nurses->toggle_status($nurseId);
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
?>
