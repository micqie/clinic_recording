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
        ORDER BY p.created_at DESC
    ");

    $stmt->execute();
    return ['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
}

    function get($id = null)
    {
        include "connection.php";

        if ($id === null) {
            // No ID provided — return latest patient (or first one)
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
                ORDER BY p.created_at DESC
                LIMIT 1
            ");
            $stmt->execute();
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($data) {
                return ['success' => true, 'data' => $data];
            } else {
                return ['success' => false, 'message' => 'No patients found.'];
            }
        } else {
            // ID provided — get patient by ID
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
                WHERE p.patient_id = :patient_id
                LIMIT 1
            ");
            $stmt->bindParam(":patient_id", $id);
            $stmt->execute();
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($data) {
                return ['success' => true, 'data' => $data];
            } else {
                return ['success' => false, 'message' => 'Patient not found.'];
            }
        }
    }

function add($json) {
    include "connection.php";
    $data = json_decode($json, true);

    if (empty($data['full_name']) || empty($data['email'])) {
        return ['success' => false, 'message' => 'Full name and email are required.'];
    }

    $defaultRoleId = 3; // Set the appropriate role id for patients

    $conn->beginTransaction();

    try {
        $stmtUser = $conn->prepare("INSERT INTO tbl_users (name, email, role_id) VALUES (:name, :email, :role_id)");
        $stmtUser->bindParam(':name', $data['full_name']);
        $stmtUser->bindParam(':email', $data['email']);
        $stmtUser->bindParam(':role_id', $defaultRoleId);
        $stmtUser->execute();

        $userId = $conn->lastInsertId();

        $stmtPatient = $conn->prepare("INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, address)
                                       VALUES (:user_id, :sex, :contact_num, :birthdate, :address)");
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

    try {
        // Start transaction to update both user and patient data safely
        $conn->beginTransaction();

        // 1) Update tbl_patients
        $stmtPatient = $conn->prepare("UPDATE tbl_patients SET
                                        sex = :sex,
                                        contact_num = :contact_num,
                                        birthdate = :birthdate,
                                        address = :address
                                        WHERE patient_id = :patient_id");

        $stmtPatient->bindParam(":sex", $data['sex']);
        $stmtPatient->bindParam(":contact_num", $data['contact_num']);
        $stmtPatient->bindParam(":birthdate", $data['birthdate']);
        $stmtPatient->bindParam(":address", $data['address']);
        $stmtPatient->bindParam(":patient_id", $data['patient_id']);
        $stmtPatient->execute();

        // 2) Update tbl_users for full_name and email if present in payload
        if (!empty($data['full_name']) || !empty($data['email'])) {
            // First, get user_id from tbl_patients by patient_id
            $stmtUserId = $conn->prepare("SELECT user_id FROM tbl_patients WHERE patient_id = :patient_id");
            $stmtUserId->bindParam(":patient_id", $data['patient_id']);
            $stmtUserId->execute();
            $userId = $stmtUserId->fetchColumn();

            if ($userId) {
                $updateFields = [];
                $params = [];

                if (!empty($data['full_name'])) {
                    $updateFields[] = "name = :full_name";
                    $params[':full_name'] = $data['full_name'];
                }
                if (!empty($data['email'])) {
                    $updateFields[] = "email = :email";
                    $params[':email'] = $data['email'];
                }

                if ($updateFields) {
                    $sqlUser = "UPDATE tbl_users SET " . implode(", ", $updateFields) . " WHERE user_id = :user_id";
                    $stmtUser = $conn->prepare($sqlUser);
                    foreach ($params as $key => $val) {
                        $stmtUser->bindValue($key, $val);
                    }
                    $stmtUser->bindValue(':user_id', $userId);
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

        $stmt = $conn->prepare("DELETE FROM tbl_patients WHERE patient_id = :patient_id");
        $stmt->bindParam(":patient_id", $data['patient_id']);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Patient deleted successfully.'];
        }

        return ['success' => false, 'message' => 'Failed to delete patient.'];
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
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
