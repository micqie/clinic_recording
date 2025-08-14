<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Patient
{
    function get_all()
    {
        include "connection.php";

        $stmt = $conn->prepare("
            SELECT
                p.patient_id,
                p.sex,
                p.contact_num,
                p.birthdate,
                p.address,
                p.created_at,
                p.updated_at,
                u.user_id,
                u.name AS full_name,
                u.email
            FROM tbl_patients p
            JOIN tbl_users u ON p.user_id = u.user_id
            WHERE u.role_id = 3
            ORDER BY p.created_at DESC
        ");

        $stmt->execute();
        return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    function get($id = null)
    {
        include "connection.php";

        $query = "
            SELECT
                p.patient_id,
                p.sex,
                p.contact_num,
                p.birthdate,
                p.address,
                p.created_at,
                p.updated_at,
                u.user_id,
                u.name AS full_name,
                u.email
            FROM tbl_patients p
            JOIN tbl_users u ON p.user_id = u.user_id
            WHERE u.role_id = 3
        ";

        if ($id === null) {
            $query .= "ORDER BY p.created_at DESC LIMIT 1";
            $stmt = $conn->prepare($query);
        } else {
            $query .= "AND p.patient_id = :patient_id LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(":patient_id", $id);
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

        $defaultRoleId = 3; // Patient role

        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

        $conn->beginTransaction();

        try {
            // Insert into users
            $stmtUser = $conn->prepare("
                INSERT INTO tbl_users (name, email, password, role_id)
                VALUES (:name, :email, :password, :role_id)
            ");
            $stmtUser->bindParam(':name', $data['full_name']);
            $stmtUser->bindParam(':email', $data['email']);
            $stmtUser->bindParam(':password', $passwordHash);
            $stmtUser->bindParam(':role_id', $defaultRoleId);
            $stmtUser->execute();

            $userId = $conn->lastInsertId();

            // Insert into patients
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
            // Update patient info
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
                        $fields[] = "email = :email";
                        $params[':email'] = $data['email'];
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
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
