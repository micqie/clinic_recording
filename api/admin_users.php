<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class AdminUsers
{
    function listUsers()
    {
        include "connection.php";
        try {
            $roleFilter = $_GET['role'] ?? '';
            $hasRole = in_array(strtolower($roleFilter), ['admin','secretary','doctor','patient']);
            $role = $hasRole ? strtolower($roleFilter) : '';

            // Build role-specific SELECT for richer UI tables
            if ($role === 'patient') {
                $sql = "SELECT u.user_id, u.name, u.email, u.is_active, r.role_name AS role,
                               p.patient_id, p.sex, p.contact_num, p.birthdate, p.age, p.address,
                               DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                               DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
                        FROM tbl_users u
                        JOIN tbl_roles r ON u.role_id = r.role_id
                        LEFT JOIN tbl_patients p ON p.user_id = u.user_id
                        WHERE LOWER(r.role_name) = :role
                        ORDER BY u.user_id DESC";
            } else if ($role === 'doctor') {
                $sql = "SELECT u.user_id, u.name, u.email, u.is_active, r.role_name AS role,
                               d.doctor_id, d.license_number, d.years_experience,
                               s.name AS specialization_name, s.specialization_id
                        FROM tbl_users u
                        JOIN tbl_roles r ON u.role_id = r.role_id
                        LEFT JOIN tbl_doctors d ON d.user_id = u.user_id
                        LEFT JOIN tbl_specializations s ON d.specialization_id = s.specialization_id
                        WHERE LOWER(r.role_name) = :role
                        ORDER BY u.user_id DESC";
            } else if ($role === 'secretary') {
                $sql = "SELECT u.user_id, u.name, u.email, u.is_active, r.role_name AS role,
                               sct.secretary_id, sct.employee_id
                        FROM tbl_users u
                        JOIN tbl_roles r ON u.role_id = r.role_id
                        LEFT JOIN tbl_secretaries sct ON sct.user_id = u.user_id
                        WHERE LOWER(r.role_name) = :role
                        ORDER BY u.user_id DESC";
            } else {
                $sql = "SELECT u.user_id, u.name, u.email, u.is_active, r.role_name AS role
                        FROM tbl_users u
                        JOIN tbl_roles r ON u.role_id = r.role_id"
                        . ($hasRole ? " WHERE LOWER(r.role_name) = :role" : "") .
                        " ORDER BY u.user_id DESC";
            }
            $stmt = $conn->prepare($sql);
            if ($hasRole) {
                $stmt->bindParam(":role", $role);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [ 'success' => true, 'users' => $rows ];
        } catch (PDOException $e) {
            return [ 'success' => false, 'message' => 'Failed to list users: ' . $e->getMessage() ];
        }
    }

    function setActive($json)
    {
        include "connection.php";
        $data = json_decode($json, true);
        if (empty($data['user_id']) || !isset($data['is_active'])) {
            return [ 'success' => false, 'message' => 'user_id and is_active are required.' ];
        }
        try {
            $stmt = $conn->prepare("UPDATE tbl_users SET is_active = :active WHERE user_id = :uid");
            $active = (int)$data['is_active'] ? 1 : 0;
            $stmt->bindParam(":active", $active, PDO::PARAM_INT);
            $stmt->bindParam(":uid", $data['user_id'], PDO::PARAM_INT);
            $stmt->execute();
            return [ 'success' => true, 'message' => 'User status updated.' ];
        } catch (PDOException $e) {
            return [ 'success' => false, 'message' => 'Failed to update status: ' . $e->getMessage() ];
        }
    }

    function createUser($json)
    {
        include "connection.php";
        $data = json_decode($json, true);

        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = (string)($data['password'] ?? '');
        $role = strtolower(trim($data['role'] ?? ''));

        if ($name === '' || $email === '' || $password === '' || !in_array($role, ['secretary','doctor','patient'])) {
            return [ 'success' => false, 'message' => 'name, email, password, and valid role are required.' ];
        }

        try {
            // get role_id
            $stmt = $conn->prepare("SELECT role_id FROM tbl_roles WHERE LOWER(role_name) = :r LIMIT 1");
            $stmt->bindParam(":r", $role);
            $stmt->execute();
            $roleRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$roleRow) return [ 'success' => false, 'message' => 'Role not found.' ];
            $role_id = (int)$roleRow['role_id'];

            // ensure unique email
            $check = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = :e LIMIT 1");
            $check->bindParam(":e", $email);
            $check->execute();
            if ($check->fetchColumn()) return [ 'success' => false, 'message' => 'Email already exists.' ];

            $conn->beginTransaction();

            // temporarily allow plaintext seed; login will upgrade hash
            $sql = "INSERT INTO tbl_users (name, email, password, role_id, must_change_password, is_active)
                    VALUES (:n, :e, :p, :rid, 1, 1)";
            $ins = $conn->prepare($sql);
            $ins->bindParam(":n", $name);
            $ins->bindParam(":e", $email);
            $ins->bindParam(":p", $password);
            $ins->bindParam(":rid", $role_id, PDO::PARAM_INT);
            $ins->execute();
            $user_id = (int)$conn->lastInsertId();

            if ($role === 'doctor') {
                $license = trim($data['license_number'] ?? '');
                $specialization_id = isset($data['specialization_id']) ? (int)$data['specialization_id'] : null;
                if ($license === '') { $conn->rollBack(); return [ 'success' => false, 'message' => 'license_number is required for doctor.' ]; }
                $doc = $conn->prepare("INSERT INTO tbl_doctors (user_id, license_number, specialization_id, years_experience) VALUES (:uid, :lic, :sid, :yrs)");
                $yrs = isset($data['years_experience']) && $data['years_experience'] !== '' ? (int)$data['years_experience'] : null;
                $doc->bindParam(":uid", $user_id, PDO::PARAM_INT);
                $doc->bindParam(":lic", $license);
                if ($specialization_id === null) { $doc->bindValue(":sid", null, PDO::PARAM_NULL); } else { $doc->bindValue(":sid", $specialization_id, PDO::PARAM_INT); }
                if ($yrs === null) { $doc->bindValue(":yrs", null, PDO::PARAM_NULL); } else { $doc->bindValue(":yrs", $yrs, PDO::PARAM_INT); }
                $doc->execute();
            } else if ($role === 'patient') {
                $sex = $data['sex'] ?? null; if ($sex === '') $sex = null;
                $contact = $data['contact_num'] ?? null; if ($contact === '') $contact = null;
                $birthdate = $data['birthdate'] ?? null; if ($birthdate === '') $birthdate = null;
                $age = $data['age'] ?? null; if ($age === '') $age = null; if ($age !== null) $age = (int)$age;
                $address = $data['address'] ?? null; if ($address === '') $address = null;
                $hasAge = (bool)$conn->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_patients' AND COLUMN_NAME = 'age'")->fetchColumn();
                $sqlPat = $hasAge ?
                    "INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, age, address) VALUES (:uid, :sex, :contact, :bdate, :age, :addr)"
                    : "INSERT INTO tbl_patients (user_id, sex, contact_num, birthdate, address) VALUES (:uid, :sex, :contact, :bdate, :addr)";
                $pat = $conn->prepare($sqlPat);
                $pat->bindParam(":uid", $user_id, PDO::PARAM_INT);
                $pat->bindParam(":sex", $sex);
                $pat->bindParam(":contact", $contact);
                $pat->bindParam(":bdate", $birthdate);
                if ($hasAge) {
                    if ($age === null) { $pat->bindValue(":age", null, PDO::PARAM_NULL); } else { $pat->bindValue(":age", $age, PDO::PARAM_INT); }
                }
                $pat->bindParam(":addr", $address);
                $pat->execute();
            } else if ($role === 'secretary') {
                // create secretary row
                $employee_id = trim($data['employee_id'] ?? ''); if ($employee_id === '') $employee_id = 'SEC-' . $user_id;
                $sec = $conn->prepare("INSERT INTO tbl_secretaries (user_id, employee_id) VALUES (:uid, :emp)");
                $sec->bindParam(":uid", $user_id, PDO::PARAM_INT);
                $sec->bindParam(":emp", $employee_id);
                $sec->execute();
            }

            $conn->commit();
            return [ 'success' => true, 'message' => 'User created successfully.' ];
        } catch (PDOException $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            return [ 'success' => false, 'message' => 'Create failed: ' . $e->getMessage() ];
        }
    }
}

// Router
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? "";
    $json = $_GET['json'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? "";
    $json = $_POST['json'] ?? "";
}

$api = new AdminUsers();

switch ($operation) {
    case 'list_users':
        echo json_encode($api->listUsers());
        break;
    case 'set_active':
        echo json_encode($api->setActive($json));
        break;
    case 'create_user':
        echo json_encode($api->createUser($json));
        break;
    default:
        echo json_encode([ 'success' => false, 'message' => 'Invalid operation.' ]);
        break;
}
?>
