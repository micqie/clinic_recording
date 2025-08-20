<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class LabRequests
{
	function getAllLabRequests()
	{
		include "connection.php";

		try {
			$stmt = $conn->prepare("
				SELECT lr.*,
				       p.user_id as patient_user_id,
				       u.name as patient_name,
				       d.user_id as doctor_user_id,
				       du.name as doctor_name,
				       s.user_id as secretary_user_id,
				       su.name as secretary_name,
				       st.status_name,
				       ltt.type_name AS lab_test_type_name
				FROM tbl_lab_requests lr
				JOIN tbl_patients p ON lr.patient_id = p.patient_id
				JOIN tbl_users u ON p.user_id = u.user_id
				LEFT JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
				LEFT JOIN tbl_users du ON d.user_id = du.user_id
				LEFT JOIN tbl_secretaries s ON lr.secretary_id = s.secretary_id
				LEFT JOIN tbl_users su ON s.user_id = su.user_id
				LEFT JOIN tbl_status st ON lr.status_id = st.status_id
				LEFT JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
				ORDER BY lr.created_at DESC
			");
			$stmt->execute();
			$requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

			return ['success' => true, 'requests' => $requests];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to fetch lab requests: ' . $e->getMessage()];
		}
	}

	function getLabRequestById($lab_request_id)
	{
		include "connection.php";

		if (empty($lab_request_id)) {
			return ['success' => false, 'message' => 'Lab request ID is required.'];
		}

		try {
			$stmt = $conn->prepare("
                SELECT lr.*,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       d.user_id as doctor_user_id,
                       du.name as doctor_name,
                       s.user_id as secretary_user_id,
                       su.name as secretary_name,
                       st.status_name,
                       ltt.type_name AS lab_test_type_name
                FROM tbl_lab_requests lr
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_secretaries s ON lr.secretary_id = s.secretary_id
                LEFT JOIN tbl_users su ON s.user_id = su.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                LEFT JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
                WHERE lr.lab_request_id = :id
                LIMIT 1
            ");
			$stmt->bindParam(":id", $lab_request_id);
			$stmt->execute();
			$request = $stmt->fetch(PDO::FETCH_ASSOC);

			if ($request) {
				return ['success' => true, 'request' => $request];
			}
			return ['success' => false, 'message' => 'Lab request not found.'];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to fetch lab request: ' . $e->getMessage()];
		}
	}

	function getLabRequestsByPatient($patient_id)
	{
		include "connection.php";

		try {
			$stmt = $conn->prepare("
                SELECT lr.*,
                       d.user_id as doctor_user_id,
                       du.name as doctor_name,
                       s.user_id as secretary_user_id,
                       su.name as secretary_name,
                       st.status_name,
                       ltt.type_name AS lab_test_type_name
                FROM tbl_lab_requests lr
                LEFT JOIN tbl_doctors d ON lr.doctor_id = d.doctor_id
                LEFT JOIN tbl_users du ON d.user_id = du.user_id
                LEFT JOIN tbl_secretaries s ON lr.secretary_id = s.secretary_id
                LEFT JOIN tbl_users su ON s.user_id = su.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                LEFT JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
                WHERE lr.patient_id = :patient_id
                ORDER BY lr.created_at DESC
            ");
			$stmt->bindParam(":patient_id", $patient_id);
			$stmt->execute();
			$requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

			return ['success' => true, 'requests' => $requests];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to fetch lab requests: ' . $e->getMessage()];
		}
	}

	function getLabRequestsByDoctor($doctor_id)
	{
		include "connection.php";

		try {
			$stmt = $conn->prepare("
                SELECT lr.*,
                       p.user_id as patient_user_id,
                       u.name as patient_name,
                       st.status_name,
                       ltt.type_name AS lab_test_type_name
                FROM tbl_lab_requests lr
                JOIN tbl_patients p ON lr.patient_id = p.patient_id
                JOIN tbl_users u ON p.user_id = u.user_id
                LEFT JOIN tbl_status st ON lr.status_id = st.status_id
                LEFT JOIN tbl_lab_test_types ltt ON lr.lab_test_type_id = ltt.lab_test_type_id
                WHERE lr.doctor_id = :doctor_id
                ORDER BY lr.created_at DESC
            ");
			$stmt->bindParam(":doctor_id", $doctor_id);
			$stmt->execute();
			$requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

			return ['success' => true, 'requests' => $requests];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to fetch lab requests: ' . $e->getMessage()];
		}
	}

	function addLabRequest($json)
	{
		include "connection.php";
		$data = json_decode($json, true);

		if (empty($data['patient_id']) || empty($data['request_text'])) {
			return ['success' => false, 'message' => 'Patient ID and request text are required.'];
		}

		try {
			$sql = "INSERT INTO tbl_lab_requests (doctor_id, secretary_id, patient_id, appointment_id, lab_test_type_id, request_text, status_id)
					VALUES (:doctor_id, :secretary_id, :patient_id, :appointment_id, :lab_test_type_id, :request_text, :status_id)";
			$stmt = $conn->prepare($sql);
			$stmt->bindParam(":doctor_id", $data['doctor_id'] ?? null);
			$stmt->bindParam(":secretary_id", $data['secretary_id'] ?? null);
			$stmt->bindParam(":patient_id", $data['patient_id']);
			$stmt->bindParam(":appointment_id", $data['appointment_id'] ?? null);
			$stmt->bindParam(":lab_test_type_id", $data['lab_test_type_id'] ?? null);
			$stmt->bindParam(":request_text", $data['request_text']);
			$stmt->bindParam(":status_id", $data['status_id'] ?? 14); // Default to Processing
			$stmt->execute();

			return ['success' => true, 'message' => 'Lab request added successfully!'];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to add lab request: ' . $e->getMessage()];
		}
	}

	function updateLabRequest($json)
	{
		include "connection.php";
		$data = json_decode($json, true);

		if (empty($data['lab_request_id']) || empty($data['request_text'])) {
			return ['success' => false, 'message' => 'Lab request ID and request text are required.'];
		}

		try {
			$sql = "UPDATE tbl_lab_requests SET
					doctor_id = :doctor_id,
					secretary_id = :secretary_id,
					patient_id = :patient_id,
					appointment_id = :appointment_id,
					lab_test_type_id = :lab_test_type_id,
					request_text = :request_text,
					status_id = :status_id
					WHERE lab_request_id = :lab_request_id";
			$stmt = $conn->prepare($sql);
			$stmt->bindParam(":doctor_id", $data['doctor_id'] ?? null);
			$stmt->bindParam(":secretary_id", $data['secretary_id'] ?? null);
			$stmt->bindParam(":patient_id", $data['patient_id']);
			$stmt->bindParam(":appointment_id", $data['appointment_id'] ?? null);
			$stmt->bindParam(":lab_test_type_id", $data['lab_test_type_id'] ?? null);
			$stmt->bindParam(":request_text", $data['request_text']);
			$stmt->bindParam(":status_id", $data['status_id'] ?? 14);
			$stmt->bindParam(":lab_request_id", $data['lab_request_id']);
			$stmt->execute();

			return ['success' => true, 'message' => 'Lab request updated successfully!'];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to update lab request: ' . $e->getMessage()];
		}
	}

	function deleteLabRequest($lab_request_id)
	{
		include "connection.php";

		if (empty($lab_request_id)) {
			return ['success' => false, 'message' => 'Lab request ID is required.'];
		}

		try {
			$stmt = $conn->prepare("DELETE FROM tbl_lab_requests WHERE lab_request_id = :lab_request_id");
			$stmt->bindParam(":lab_request_id", $lab_request_id);
			$stmt->execute();

			if ($stmt->rowCount() > 0) {
				return ['success' => true, 'message' => 'Lab request deleted successfully!'];
			} else {
				return ['success' => false, 'message' => 'Lab request not found.'];
			}
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to delete lab request: ' . $e->getMessage()];
		}
	}

	function updateLabRequestStatus($json)
	{
		include "connection.php";
		$data = json_decode($json, true);

		if (empty($data['lab_request_id']) || empty($data['status_id'])) {
			return ['success' => false, 'message' => 'Lab request ID and status ID are required.'];
		}

		try {
			$sql = "UPDATE tbl_lab_requests SET status_id = :status_id WHERE lab_request_id = :lab_request_id";
			$stmt = $conn->prepare($sql);
			$stmt->bindParam(":status_id", $data['status_id']);
			$stmt->bindParam(":lab_request_id", $data['lab_request_id']);
			$stmt->execute();

			return ['success' => true, 'message' => 'Lab request status updated successfully!'];
		} catch (PDOException $e) {
			return ['success' => false, 'message' => 'Failed to update lab request status: ' . $e->getMessage()];
		}
	}
}

// Handle incoming request
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
	$operation = $_GET['operation'] ?? "";
	$json = $_GET['json'] ?? "";
	$lab_request_id = $_GET['lab_request_id'] ?? "";
	$patient_id = $_GET['patient_id'] ?? "";
	$doctor_id = $_GET['doctor_id'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	$operation = $_POST['operation'] ?? "";
	$json = $_POST['json'] ?? "";
	$lab_request_id = $_POST['lab_request_id'] ?? "";
	$patient_id = $_POST['patient_id'] ?? "";
	$doctor_id = $_POST['doctor_id'] ?? "";
}

$labRequests = new LabRequests();

switch ($operation) {
	case "getAll":
		echo json_encode($labRequests->getAllLabRequests());
		break;
	case "getById":
		echo json_encode($labRequests->getLabRequestById($lab_request_id));
		break;
	case "getByPatient":
		echo json_encode($labRequests->getLabRequestsByPatient($patient_id));
		break;
	case "getByDoctor":
		echo json_encode($labRequests->getLabRequestsByDoctor($doctor_id));
		break;
	case "add":
		echo json_encode($labRequests->addLabRequest($json));
		break;
	case "update":
		echo json_encode($labRequests->updateLabRequest($json));
		break;
	case "delete":
		echo json_encode($labRequests->deleteLabRequest($lab_request_id));
		break;
	case "updateStatus":
		echo json_encode($labRequests->updateLabRequestStatus($json));
		break;
	default:
		echo json_encode(['success' => false, 'message' => 'Invalid operation.']);
		break;
}
?>
