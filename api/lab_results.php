<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class LabResults
{
    function getById($result_id)
    {
        include "connection.php";
        if (empty($result_id)) {
            return ['success' => false, 'message' => 'Result ID is required.'];
        }
        try {
            $stmt = $conn->prepare("
                SELECT lr.*,
                       lreq.request_text,
                       ltt.type_name AS lab_test_type_name,
                       u.name as patient_name,
                       du.name as doctor_name,
                       up.name as uploaded_by_name,
                       st.status_name
                FROM tbl_lab_results lr
                JOIN tbl_lab_requests lreq ON lr.lab_request_id = lreq.lab_request_id
                LEFT JOIN tbl_lab_test_types ltt ON lreq.lab_test_type_id = ltt.lab_test_type_id
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                JOIN tbl_users up ON lr.uploaded_by = up.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                WHERE lr.result_id = :id
                LIMIT 1
            ");
            $stmt->bindParam(":id", $result_id);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) return ['success' => true, 'result' => $row];
            return ['success' => false, 'message' => 'Result not found.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch lab result: ' . $e->getMessage()];
        }
    }
    function getAllLabResults()
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT lr.*,
                       lreq.request_text,
                       lreq.status_id AS lab_request_status_id,
                       p.user_id as patient_user_id,
                       p.sex as patient_sex,
                       p.birthdate as patient_birthdate,
                       u.name as patient_name,
                       d.user_id as doctor_user_id,
                       du.name as doctor_name,
                       up.name as uploaded_by_name,
                       st.status_name,
                       ltt.type_name AS lab_test_type_name
                FROM tbl_lab_results lr
                JOIN tbl_lab_requests lreq ON lr.lab_request_id = lreq.lab_request_id
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                JOIN tbl_users up ON lr.uploaded_by = up.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                LEFT JOIN tbl_lab_test_types ltt ON lreq.lab_test_type_id = ltt.lab_test_type_id
                WHERE lreq.status_id = 16
                ORDER BY lr.uploaded_at DESC
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'results' => $results];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch lab results: ' . $e->getMessage()];
        }
    }

    function getLabResultsByPatient($patient_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT lr.*,
                       lreq.request_text,
                       d.user_id as doctor_user_id,
                       du.name as doctor_name,
                       up.name as uploaded_by_name,
                       st.status_name
                FROM tbl_lab_results lr
                JOIN tbl_lab_requests lreq ON lr.lab_request_id = lreq.lab_request_id
                LEFT JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                JOIN tbl_users up ON lr.uploaded_by = up.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                WHERE lr.patient_id = :patient_id
                ORDER BY lr.uploaded_at DESC
            ");
            $stmt->bindParam(":patient_id", $patient_id);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'results' => $results];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch lab results: ' . $e->getMessage()];
        }
    }

    function getLabResultsByDoctor($doctor_id)
    {
        include "connection.php";

        try {
            $stmt = $conn->prepare("
                SELECT lr.*,
                       lreq.request_text,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       up.name as uploaded_by_name,
                       st.status_name
                FROM tbl_lab_results lr
                JOIN tbl_lab_requests lreq ON lr.lab_request_id = lreq.lab_request_id
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                JOIN tbl_users up ON lr.uploaded_by = up.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                WHERE lr.doctor_id = :doctor_id
                ORDER BY lr.uploaded_at DESC
            ");
            $stmt->bindParam(":doctor_id", $doctor_id);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'results' => $results];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch lab results: ' . $e->getMessage()];
        }
    }

    function addLabResult($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['lab_request_id']) || empty($data['patient_id']) || empty($data['uploaded_by'])) {
            return ['success' => false, 'message' => 'Lab request ID, patient ID, and uploaded by are required.'];
        }

        try {
            $sql = "INSERT INTO tbl_lab_results (lab_request_id, patient_id, doctor_id, result_file, result_text, uploaded_by, status_id)
                    VALUES (:lab_request_id, :patient_id, :doctor_id, :result_file, :result_text, :uploaded_by, :status_id)";
            $stmt = $conn->prepare($sql);
            $stmt->bindValue(":lab_request_id", (int)$data['lab_request_id'], PDO::PARAM_INT);
            $stmt->bindValue(":patient_id", (int)$data['patient_id'], PDO::PARAM_INT);
            if (isset($data['doctor_id']) && $data['doctor_id'] !== '' && $data['doctor_id'] !== null) {
                $stmt->bindValue(":doctor_id", (int)$data['doctor_id'], PDO::PARAM_INT);
            } else {
                $stmt->bindValue(":doctor_id", null, PDO::PARAM_NULL);
            }
            $stmt->bindValue(":result_file", $data['result_file'] ?? null, $data['result_file'] ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(":result_text", $data['result_text'] ?? null, $data['result_text'] ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(":uploaded_by", (int)$data['uploaded_by'], PDO::PARAM_INT);
            $stmt->bindValue(":status_id", isset($data['status_id']) ? (int)$data['status_id'] : 15, PDO::PARAM_INT);
            $stmt->execute();

            // Update lab request status to Ready
            $updateSql = "UPDATE tbl_lab_requests SET status_id = 15 WHERE lab_request_id = :lab_request_id";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bindParam(":lab_request_id", $data['lab_request_id']);
            $updateStmt->execute();

            return ['success' => true, 'message' => 'Lab result added successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to add lab result: ' . $e->getMessage()];
        }
    }

    function updateLabResult($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        if (empty($data['result_id'])) {
            return ['success' => false, 'message' => 'Result ID is required.'];
        }

        try {
            $sql = "UPDATE tbl_lab_results SET
                    result_file = :result_file,
                    result_text = :result_text,
                    status_id = :status_id
                    WHERE result_id = :result_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindValue(":result_file", $data['result_file'] ?? null, $data['result_file'] ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(":result_text", $data['result_text'] ?? null, $data['result_text'] ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(":status_id", isset($data['status_id']) ? (int)$data['status_id'] : 15, PDO::PARAM_INT);
            $stmt->bindValue(":result_id", (int)$data['result_id'], PDO::PARAM_INT);
            $stmt->execute();

            return ['success' => true, 'message' => 'Lab result updated successfully!'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update lab result: ' . $e->getMessage()];
        }
    }

    function deleteLabResult($result_id)
    {
        include "connection.php";

        if (empty($result_id)) {
            return ['success' => false, 'message' => 'Result ID is required.'];
        }

        try {
            $stmt = $conn->prepare("DELETE FROM tbl_lab_results WHERE result_id = :result_id");
            $stmt->bindParam(":result_id", $result_id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Lab result deleted successfully!'];
            } else {
                return ['success' => false, 'message' => 'Lab result not found.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete lab result: ' . $e->getMessage()];
        }
    }

    function uploadLabResultFile($file, $result_id)
    {
        include "connection.php";

        if (empty($result_id) || empty($file)) {
            return ['success' => false, 'message' => 'Result ID and file are required.'];
        }

        try {
            $uploadDir = '../uploads/lab_results/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $fileName = time() . '_' . basename($file['name']);
            $targetPath = $uploadDir . $fileName;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $sql = "UPDATE tbl_lab_results SET result_file = :result_file WHERE result_id = :result_id";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":result_file", $fileName);
                $stmt->bindParam(":result_id", $result_id);
                $stmt->execute();

                return ['success' => true, 'message' => 'File uploaded successfully!', 'filename' => $fileName];
            } else {
                return ['success' => false, 'message' => 'Failed to upload file.'];
            }
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update lab result: ' . $e->getMessage()];
        }
    }
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
    $result_id = $_GET['result_id'] ?? "";
    $patient_id = $_GET['patient_id'] ?? "";
    $doctor_id = $_GET['doctor_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
    $result_id = $_POST['result_id'] ?? "";
    $patient_id = $_POST['patient_id'] ?? "";
    $doctor_id = $_POST['doctor_id'] ?? "";
}

$labResults = new LabResults();

switch ($operation) {
    case "getAll":
        echo json_encode($labResults->getAllLabResults());
        break;
    case "getById":
        echo json_encode($labResults->getById($result_id));
        break;
    case "getByPatient":
        echo json_encode($labResults->getLabResultsByPatient($patient_id));
        break;
    case "getByDoctor":
        echo json_encode($labResults->getLabResultsByDoctor($doctor_id));
        break;
    case "add":
        echo json_encode($labResults->addLabResult($json));
        break;
    case "update":
        echo json_encode($labResults->updateLabResult($json));
        break;
    case "delete":
        echo json_encode($labResults->deleteLabResult($result_id));
        break;
    case "uploadFile":
        if (isset($_FILES['file'])) {
            echo json_encode($labResults->uploadLabResultFile($_FILES['file'], $result_id));
        } else {
            echo json_encode(['success' => false, 'message' => 'No file uploaded.']);
        }
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
        break;
}
?>
