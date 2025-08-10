<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class Medicines
{
    private $conn;

    public function __construct()
    {
        include "connection.php";
        $this->conn = $conn;
    }

    // Get all medicines with form name and unit name
    public function get_all()
    {
        $stmt = $this->conn->prepare("
            SELECT m.medicine_id,
                   m.name,
                   m.price,
                   m.quantity,          -- amount per unit (e.g., 100)
                   m.stock,             -- stock available
                   u.unit_name AS unit, -- unit name from units table
                   f.form_name AS form,
                   m.created_at,
                   m.updated_at
            FROM tbl_medicines m
            JOIN tbl_medicine_forms f ON m.form_id = f.form_id
            JOIN tbl_medicine_units u ON m.unit_id = u.unit_id
            ORDER BY m.medicine_id DESC
        ");
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    // Add new medicine
    public function add($data)
    {
        $stmt = $this->conn->prepare("
            INSERT INTO tbl_medicines (name, price, quantity, unit_id, stock, form_id)
            VALUES (:name, :price, :quantity, :unit_id, :stock, :form_id)
        ");
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":price", $data['price']);
        $stmt->bindParam(":quantity", $data['quantity']);
        $stmt->bindParam(":unit_id", $data['unit_id']);
        $stmt->bindParam(":stock", $data['stock']);
        $stmt->bindParam(":form_id", $data['form_id']);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Medicine added successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to add medicine"]);
        }
    }

    // Get medicine forms
    public function get_forms()
    {
        $stmt = $this->conn->prepare("SELECT form_id, form_name FROM tbl_medicine_forms ORDER BY form_name ASC");
        $stmt->execute();
        $forms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["forms" => $forms]);
    }

    // Get medicine units
    public function get_units()
    {
        $stmt = $this->conn->prepare("SELECT unit_id, unit_name FROM tbl_medicine_units ORDER BY unit_name ASC");
        $stmt->execute();
        $units = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["units" => $units]);
    }

    // Update medicine
    public function update($data)
    {
        $stmt = $this->conn->prepare("
            UPDATE tbl_medicines
            SET name = :name, price = :price, quantity = :quantity,
                unit_id = :unit_id, stock = :stock, form_id = :form_id
            WHERE medicine_id = :medicine_id
        ");
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":price", $data['price']);
        $stmt->bindParam(":quantity", $data['quantity']);
        $stmt->bindParam(":unit_id", $data['unit_id']);
        $stmt->bindParam(":stock", $data['stock']);
        $stmt->bindParam(":form_id", $data['form_id']);
        $stmt->bindParam(":medicine_id", $data['medicine_id']);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Medicine updated successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to update medicine"]);
        }
    }

    // Delete medicine
    public function delete($medicine_id)
    {
        $stmt = $this->conn->prepare("DELETE FROM tbl_medicines WHERE medicine_id = :medicine_id");
        $stmt->bindParam(":medicine_id", $medicine_id);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Medicine deleted successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to delete medicine"]);
        }
    }
}

// Handle request
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';

$medicines = new Medicines();

switch ($operation) {
    case 'get_all':
        $medicines->get_all();
        break;

    case 'get_forms':
        $medicines->get_forms();
        break;

    case 'get_units':
        $medicines->get_units();
        break;

    case 'add':
        $data = json_decode($_POST['json'] ?? '{}', true);
        $medicines->add($data);
        break;

    case 'update':
        $data = json_decode($_POST['json'] ?? '{}', true);
        $medicines->update($data);
        break;

    case 'delete':
        $medicine_id = $_POST['medicine_id'] ?? $_GET['medicine_id'] ?? null;
        $medicines->delete($medicine_id);
        break;

    default:
        echo json_encode(["success" => false, "message" => "Invalid operation"]);
        break;
}
