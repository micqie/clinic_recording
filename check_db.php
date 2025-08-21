<?php
// Simple database check script
echo "<h1>Database Check</h1>";

try {
    include "api/connection.php";
    echo "<p style='color: green;'>✓ Database connection successful</p>";

    // Check if medicines table exists
    $stmt = $conn->prepare("SHOW TABLES LIKE 'tbl_medicines'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        echo "<p style='color: green;'>✓ tbl_medicines table exists</p>";

        // Check table structure
        $stmt = $conn->prepare("DESCRIBE tbl_medicines");
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "<h3>Table Structure:</h3><ul>";
        foreach ($columns as $column) {
            echo "<li><strong>{$column['Field']}</strong> - {$column['Type']} - {$column['Null']} - {$column['Key']}</li>";
        }
        echo "</ul>";

        // Check if table has data
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicines");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "<p>Medicines count: <strong>{$result['count']}</strong></p>";

        if ($result['count'] > 0) {
            // Show sample data
            $stmt = $conn->prepare("SELECT * FROM tbl_medicines LIMIT 3");
            $stmt->execute();
            $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo "<h3>Sample Medicines:</h3><ul>";
            foreach ($medicines as $med) {
                echo "<li>ID: {$med['medicine_id']}, Name: {$med['medicine_name']}, Weight: {$med['weight']}, Form: {$med['form_id']}, Price: {$med['price']}</li>";
            }
            echo "</ul>";
        }

    } else {
        echo "<p style='color: red;'>✗ tbl_medicines table does not exist</p>";
    }

    // Check medicine_forms table
    $stmt = $conn->prepare("SHOW TABLES LIKE 'tbl_medicine_forms'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        echo "<p style='color: green;'>✓ tbl_medicine_forms table exists</p>";

        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicine_forms");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "<p>Medicine forms count: <strong>{$result['count']}</strong></p>";
    } else {
        echo "<p style='color: red;'>✗ tbl_medicine_forms table does not exist</p>";
    }

    // Check medicine_weights table
    $stmt = $conn->prepare("SHOW TABLES LIKE 'tbl_medicine_weights'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        echo "<p style='color: green;'>✓ tbl_medicine_weights table exists</p>";

        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_medicine_weights");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "<p>Medicine weights count: <strong>{$result['count']}</strong></p>";
    } else {
        echo "<p style='color: red;'>✗ tbl_medicine_weights table does not exist</p>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>✗ Error: " . $e->getMessage() . "</p>";
}
?>
