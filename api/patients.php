<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Patient
{
    private function hasAgeColumn($conn)
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        $sql = "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_patients' AND COLUMN_NAME = 'age'";
        $stmt = $conn->query($sql);
        $cached = (bool)$stmt->fetchColumn();
        return $cached;
    }

    private function hasActiveColumn($conn)
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        $sql = "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_users' AND COLUMN_NAME = 'is_active'";
        $stmt = $conn->query($sql);
        $cached = (bool)$stmt->fetchColumn();
        return $cached;
    }

    function get_all()
    {
        include "connection.php";

        $hasActive = $this->hasActiveColumn($conn);
        $hasAge = $this->hasAgeColumn($conn);
        $sql = "
            SELECT
                p.patient_id,
                p.sex,
                p.contact_num,
                p.birthdate,
                " . ($hasAge ? "p.age,\n                " : "") . "
                p.address,
                p.created_at,
                p.updated_at,
                u.user_id,
                u.name AS full_name,
                u.email" . ($hasActive ? ", u.is_active" : "") . "
            FROM tbl_patients p
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_roles r ON u.role_id = r.role_id
            WHERE LOWER(r.role_name) = 'patient'
            ORDER BY p.created_at DESC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    function get($id = null)
    {
        include "connection.php";

        $hasActive = $this->hasActiveColumn($conn);
        $hasAge = $this->hasAgeColumn($conn);
        $query = "
            SELECT
                p.patient_id,
                p.sex,
                p.contact_num,
                p.birthdate,
                " . ($hasAge ? "p.age,\n                " : "") . "
                p.address,
                p.created_at,
                p.updated_at,
                u.user_id,
                u.name AS full_name,
                u.email" . ($hasActive ? ", u.is_active" : "") . "
            FROM tbl_patients p
            JOIN tbl_users u ON p.user_id = u.user_id
            JOIN tbl_roles r ON u.role_id = r.role_id
            WHERE LOWER(r.role_name) = 'patient'
        ";

        if ($id === null) {
            $query .= "ORDER BY p.created_at DESC LIMIT 1";
            $stmt = $conn->prepare($query);
        } else {
            // Try to find by patient_id first, then by user_id
            $query .= "AND (p.patient_id = :id OR u.user_id = :id) LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(":id", $id);
        }

        $stmt->execute();
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($data) {
            return ['success' => true, 'data' => $data];
        } else {
            return ['success' => false, 'message' => 'Patient not found.'];
        }
    }

    function add($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['full_name']) || empty($data['email']) || empty($data['password'])) {
            return ['success' => false, 'message' => 'Full name, email, and password are required.'];
        }

        // Validate email format strictly
        $data['email'] = trim($data['email']);
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Invalid email format.'];
        }

        $defaultRoleId = 3; // Patient role

        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

        $conn->beginTransaction();

        try {
            // Insert into users
            $stmtUser = $conn->prepare("
                INSERT INTO tbl_users (name, email, password, role_id, must_change_password)
                VALUES (:name, :email, :password, :role_id, 1)
            ");
            $stmtUser->bindParam(':name', $data['full_name']);
            $stmtUser->bindParam(':email', $data['email']);
            $stmtUser->bindParam(':password', $passwordHash);
            $stmtUser->bindParam(':role_id', $defaultRoleId);
            $stmtUser->execute();

            $userId = $conn->lastInsertId();

            // Insert into patients (conditionally include age)
            if ($this->hasAgeColumn($conn)) {
                $stmtPatient = $conn->prepare("
                    INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, age, address)
                    VALUES (:user_id, :sex, :contact_num, :birthdate, :age, :address)
                ");
                $stmtPatient->bindParam(':user_id', $userId);
                $stmtPatient->bindParam(':sex', $data['sex']);
                $stmtPatient->bindParam(':contact_num', $data['contact_num']);
                $stmtPatient->bindParam(':birthdate', $data['birthdate']);
                $ageVal = isset($data['age']) && $data['age'] !== '' ? (int)$data['age'] : null;
                if ($ageVal === null) {
                    $stmtPatient->bindValue(':age', null, PDO::PARAM_NULL);
                } else {
                    $stmtPatient->bindValue(':age', $ageVal, PDO::PARAM_INT);
                }
                $stmtPatient->bindParam(':address', $data['address']);
                $stmtPatient->execute();
            } else {
                $stmtPatient = $conn->prepare("
                    INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, address)
                    VALUES (:user_id, :sex, :contact_num, :birthdate, :address)
                ");
                $stmtPatient->bindParam(':user_id', $userId);
                $stmtPatient->bindParam(':sex', $data['sex']);
                $stmtPatient->bindParam(':contact_num', $data['contact_num']);
                $stmtPatient->bindParam(':birthdate', $data['birthdate']);
                $stmtPatient->bindParam(':address', $data['address']);
                $stmtPatient->execute();
            }

            $conn->commit();

            return ['success' => true, 'message' => 'Patient added successfully.'];
        } catch (Exception $e) {
            $conn->rollBack();
            return ['success' => false, 'message' => 'Failed to add patient: ' . $e->getMessage()];
        }
    }

    function update($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['patient_id'])) {
            return ['success' => false, 'message' => 'Patient ID is required.'];
        }

        $conn->beginTransaction();

        try {
            // Update patient info (conditionally include age)
            if ($this->hasAgeColumn($conn)) {
                $stmtPatient = $conn->prepare("UPDATE tbl_patients SET
                    sex = :sex,
                    contact_num = :contact_num,
                    birthdate = :birthdate,
                    age = :age,
                    address = :address,
                    updated_at = NOW()
                    WHERE patient_id = :patient_id
                ");
                $stmtPatient->bindParam(":sex", $data['sex']);
                $stmtPatient->bindParam(":contact_num", $data['contact_num']);
                $stmtPatient->bindParam(":birthdate", $data['birthdate']);
                $ageVal = isset($data['age']) && $data['age'] !== '' ? (int)$data['age'] : null;
                if ($ageVal === null) {
                    $stmtPatient->bindValue(":age", null, PDO::PARAM_NULL);
                } else {
                    $stmtPatient->bindValue(":age", $ageVal, PDO::PARAM_INT);
                }
                $stmtPatient->bindParam(":address", $data['address']);
                $stmtPatient->bindParam(":patient_id", $data['patient_id']);
                $stmtPatient->execute();
            } else {
                $stmtPatient = $conn->prepare("UPDATE tbl_patients SET
                    sex = :sex,
                    contact_num = :contact_num,
                    birthdate = :birthdate,
                    address = :address,
                    updated_at = NOW()
                    WHERE patient_id = :patient_id
                ");
                $stmtPatient->bindParam(":sex", $data['sex']);
                $stmtPatient->bindParam(":contact_num", $data['contact_num']);
                $stmtPatient->bindParam(":birthdate", $data['birthdate']);
                $stmtPatient->bindParam(":address", $data['address']);
                $stmtPatient->bindParam(":patient_id", $data['patient_id']);
                $stmtPatient->execute();
            }

            // Update user info if provided
            if (!empty($data['full_name']) || !empty($data['email'])) {
                $userId = $data['user_id'] ?? null;

                // If not provided, fetch from patient table
                if (!$userId) {
                    $stmtUserId = $conn->prepare("SELECT user_id FROM tbl_patients WHERE patient_id = :patient_id");
                    $stmtUserId->bindParam(":patient_id", $data['patient_id']);
                    $stmtUserId->execute();
                    $userId = $stmtUserId->fetchColumn();
                }

                if ($userId) {
                    $fields = [];
                    $params = [':user_id' => $userId];

                    if (!empty($data['full_name'])) {
                        $fields[] = "name = :full_name";
                        $params[':full_name'] = $data['full_name'];
                    }
                    if (!empty($data['email'])) {
                        // Validate email format if provided
                        $emailTrimmed = trim($data['email']);
                        if (!filter_var($emailTrimmed, FILTER_VALIDATE_EMAIL)) {
                            throw new Exception('Invalid email format.');
                        }
                        $fields[] = "email = :email";
                        $params[':email'] = $emailTrimmed;
                    }

                    if ($fields) {
                        $sql = "UPDATE tbl_users SET " . implode(", ", $fields) . " WHERE user_id = :user_id";
                        $stmtUser = $conn->prepare($sql);
                        foreach ($params as $key => $val) {
                            $stmtUser->bindValue($key, $val);
                        }
                        $stmtUser->execute();
                    }
                }
            }

            $conn->commit();
            return ['success' => true, 'message' => 'Patient updated successfully.'];
        } catch (Exception $e) {
            $conn->rollBack();
            return ['success' => false, 'message' => 'Failed to update patient: ' . $e->getMessage()];
        }
    }

    function toggle_active($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['patient_id'])) {
            return ['success' => false, 'message' => 'Patient ID is required.'];
        }
        if (!$this->hasActiveColumn($conn)) {
            return ['success' => false, 'message' => 'is_active column not found. Run migration.'];
        }
        try {
            $stmt = $conn->prepare("SELECT user_id FROM tbl_patients WHERE patient_id = :pid LIMIT 1");
            $stmt->bindParam(":pid", $data['patient_id']);
            $stmt->execute();
            $userId = $stmt->fetchColumn();
            if (!$userId) return ['success' => false, 'message' => 'Patient not found.'];

            $stmt = $conn->prepare("UPDATE tbl_users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE user_id = :uid");
            $stmt->bindParam(":uid", $userId);
            $stmt->execute();
            return ['success' => true, 'message' => 'Status updated.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update status: ' . $e->getMessage()];
        }
    }

    function delete($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['patient_id'])) {
            return ['success' => false, 'message' => 'Patient ID is required.'];
        }

        try {
            $conn->beginTransaction();

            // Get user ID before deleting patient
            $stmt = $conn->prepare("SELECT user_id FROM tbl_patients WHERE patient_id = :patient_id");
            $stmt->bindParam(":patient_id", $data['patient_id']);
            $stmt->execute();
            $userId = $stmt->fetchColumn();

            // Delete patient
            $stmtDelPatient = $conn->prepare("DELETE FROM tbl_patients WHERE patient_id = :patient_id");
            $stmtDelPatient->bindParam(":patient_id", $data['patient_id']);
            $stmtDelPatient->execute();

            // Optionally delete user (to avoid orphaned user records)
            if ($userId) {
                $stmtDelUser = $conn->prepare("DELETE FROM tbl_users WHERE user_id = :user_id");
                $stmtDelUser->bindParam(":user_id", $userId);
                $stmtDelUser->execute();
            }

            $conn->commit();
            return ['success' => true, 'message' => 'Patient deleted successfully.'];
        } catch (Exception $e) {
            $conn->rollBack();
            return ['success' => false, 'message' => 'Delete failed: ' . $e->getMessage()];
        }
    }

    function cleanup_orphaned_patients()
    {
        include "connection.php";

        try {
            $conn->beginTransaction();

            // Delete patient records where the user is not actually a patient (role_id != 3)
            $stmt = $conn->prepare("
                DELETE p FROM tbl_patients p
                JOIN tbl_users u ON p.user_id = u.user_id
                WHERE u.role_id != 3
            ");
            $stmt->execute();
            $deletedCount = $stmt->rowCount();

            $conn->commit();
            return ['success' => true, 'message' => "Cleaned up {$deletedCount} orphaned patient records."];
        } catch (Exception $e) {
            $conn->rollBack();
            return ['success' => false, 'message' => 'Cleanup failed: ' . $e->getMessage()];
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
} else {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
}

$patient = new Patient();

switch ($operation) {
    case "get_all":
        echo json_encode($patient->get_all());
        break;
    case "get":
        $id = $_GET['id'] ?? null;
        echo json_encode($patient->get($id));
        break;
    case "add":
        echo json_encode($patient->add($json));
        break;
    case "update":
        echo json_encode($patient->update($json));
        break;
    case "delete":
        echo json_encode($patient->delete($json));
        break;
    case "cleanup":
        echo json_encode($patient->cleanup_orphaned_patients());
        break;
    case "toggle_active":
        echo json_encode($patient->toggle_active($json));
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
