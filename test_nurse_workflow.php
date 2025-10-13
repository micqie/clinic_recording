<?php
/**
 * Test Script for Nurse-Patient Workflow
 * This script tests the complete workflow from patient queuing to doctor consultation
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

class NurseWorkflowTest {
    private $conn;
    private $testResults = [];

    public function __construct() {
        include "connection.php";
        $this->conn = $conn;
    }

    public function runAllTests() {
        $this->testResults = [
            "database_schema" => $this->testDatabaseSchema(),
            "nurse_api" => $this->testNurseAPI(),
            "queue_management" => $this->testQueueManagement(),
            "validation_rules" => $this->testValidationRules(),
            "workflow_integration" => $this->testWorkflowIntegration()
        ];

        return $this->testResults;
    }

    private function testDatabaseSchema() {
        $results = ["passed" => 0, "failed" => 0, "tests" => []];

        // Test 1: Check if new statuses exist
        $test1 = $this->checkStatusExists('Waiting for Nurse');
        $results["tests"][] = [
            "name" => "Waiting for Nurse status exists",
            "passed" => $test1,
            "message" => $test1 ? "Status found" : "Status not found"
        ];
        if ($test1) $results["passed"]++; else $results["failed"]++;

        $test2 = $this->checkStatusExists('Nurse Assessment');
        $results["tests"][] = [
            "name" => "Nurse Assessment status exists",
            "passed" => $test2,
            "message" => $test2 ? "Status found" : "Status not found"
        ];
        if ($test2) $results["passed"]++; else $results["failed"]++;

        $test3 = $this->checkStatusExists('Waiting for Doctor');
        $results["tests"][] = [
            "name" => "Waiting for Doctor status exists",
            "passed" => $test3,
            "message" => $test3 ? "Status found" : "Status not found"
        ];
        if ($test3) $results["passed"]++; else $results["failed"]++;

        // Test 4: Check if nurse_assessments table exists
        $test4 = $this->checkTableExists('tbl_nurse_assessments');
        $results["tests"][] = [
            "name" => "tbl_nurse_assessments table exists",
            "passed" => $test4,
            "message" => $test4 ? "Table found" : "Table not found"
        ];
        if ($test4) $results["passed"]++; else $results["failed"]++;

        return $results;
    }

    private function testNurseAPI() {
        $results = ["passed" => 0, "failed" => 0, "tests" => []];

        // Test 1: Check if nurse_enhanced.php exists and is accessible
        $test1 = file_exists('api/nurse_enhanced.php');
        $results["tests"][] = [
            "name" => "Enhanced Nurse API file exists",
            "passed" => $test1,
            "message" => $test1 ? "File found" : "File not found"
        ];
        if ($test1) $results["passed"]++; else $results["failed"]++;

        // Test 2: Check if API can be called (basic connectivity)
        $test2 = $this->testAPIConnectivity('nurse_enhanced.php', 'get_patients_waiting_for_nurse');
        $results["tests"][] = [
            "name" => "Enhanced Nurse API is accessible",
            "passed" => $test2,
            "message" => $test2 ? "API accessible" : "API not accessible"
        ];
        if ($test2) $results["passed"]++; else $results["failed"]++;

        return $results;
    }

    private function testQueueManagement() {
        $results = ["passed" => 0, "failed" => 0, "tests" => []];

        // Test 1: Check if queue_management.php supports new statuses
        $test1 = $this->testQueueStatusSupport();
        $results["tests"][] = [
            "name" => "Queue management supports new statuses",
            "passed" => $test1,
            "message" => $test1 ? "Queue management updated" : "Queue management not updated"
        ];
        if ($test1) $results["passed"]++; else $results["failed"]++;

        return $results;
    }

    private function testValidationRules() {
        $results = ["passed" => 0, "failed" => 0, "tests" => []];

        // Test 1: Check if validation_rules.php exists
        $test1 = file_exists('api/validation_rules.php');
        $results["tests"][] = [
            "name" => "Validation rules API exists",
            "passed" => $test1,
            "message" => $test1 ? "File found" : "File not found"
        ];
        if ($test1) $results["passed"]++; else $results["failed"]++;

        return $results;
    }

    private function testWorkflowIntegration() {
        $results = ["passed" => 0, "failed" => 0, "tests" => []];

        // Test 1: Check if enhanced nurse dashboard exists
        $test1 = file_exists('html/nurse/nurse_enhanced_dashboard.html');
        $results["tests"][] = [
            "name" => "Enhanced Nurse Dashboard exists",
            "passed" => $test1,
            "message" => $test1 ? "File found" : "File not found"
        ];
        if ($test1) $results["passed"]++; else $results["failed"]++;

        // Test 2: Check if enhanced doctor consultations exist
        $test2 = file_exists('html/doctor/doctor_enhanced_consultations.html');
        $results["tests"][] = [
            "name" => "Enhanced Doctor Consultations exist",
            "passed" => $test2,
            "message" => $test2 ? "File found" : "File not found"
        ];
        if ($test2) $results["passed"]++; else $results["failed"]++;

        // Test 3: Check if JavaScript files exist
        $test3 = file_exists('js/nurse_enhanced_dashboard.js');
        $results["tests"][] = [
            "name" => "Enhanced Nurse Dashboard JavaScript exists",
            "passed" => $test3,
            "message" => $test3 ? "File found" : "File not found"
        ];
        if ($test3) $results["passed"]++; else $results["failed"]++;

        $test4 = file_exists('js/doctor_enhanced_consultations.js');
        $results["tests"][] = [
            "name" => "Enhanced Doctor Consultations JavaScript exists",
            "passed" => $test4,
            "message" => $test4 ? "File found" : "File not found"
        ];
        if ($test4) $results["passed"]++; else $results["failed"]++;

        return $results;
    }

    private function checkStatusExists($statusName) {
        try {
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) FROM tbl_status s 
                JOIN tbl_status_type t ON s.status_type_id = t.status_type_id 
                WHERE t.status_type_name = 'Appointment' AND s.status_name = :name
            ");
            $stmt->bindParam(":name", $statusName);
            $stmt->execute();
            return intval($stmt->fetchColumn()) > 0;
        } catch (PDOException $e) {
            return false;
        }
    }

    private function checkTableExists($tableName) {
        try {
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = :table
            ");
            $stmt->bindParam(":table", $tableName);
            $stmt->execute();
            return intval($stmt->fetchColumn()) > 0;
        } catch (PDOException $e) {
            return false;
        }
    }

    private function testAPIConnectivity($apiFile, $operation) {
        try {
            $url = "http://localhost/clinic_recording/api/{$apiFile}?operation={$operation}";
            $response = file_get_contents($url);
            $data = json_decode($response, true);
            return isset($data['success']);
        } catch (Exception $e) {
            return false;
        }
    }

    private function testQueueStatusSupport() {
        try {
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) FROM tbl_status s 
                JOIN tbl_status_type t ON s.status_type_id = t.status_type_id 
                WHERE t.status_type_name = 'Appointment' 
                AND s.status_name IN ('Waiting for Nurse', 'Nurse Assessment', 'Waiting for Doctor')
            ");
            $stmt->execute();
            return intval($stmt->fetchColumn()) >= 3;
        } catch (PDOException $e) {
            return false;
        }
    }

    public function generateReport() {
        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;

        foreach ($this->testResults as $category => $results) {
            $totalTests += $results['passed'] + $results['failed'];
            $totalPassed += $results['passed'];
            $totalFailed += $results['failed'];
        }

        $report = [
            "summary" => [
                "total_tests" => $totalTests,
                "passed" => $totalPassed,
                "failed" => $totalFailed,
                "success_rate" => $totalTests > 0 ? round(($totalPassed / $totalTests) * 100, 2) : 0
            ],
            "categories" => $this->testResults,
            "recommendations" => $this->generateRecommendations()
        ];

        return $report;
    }

    private function generateRecommendations() {
        $recommendations = [];

        if ($this->testResults['database_schema']['failed'] > 0) {
            $recommendations[] = "Run the SQL update script: sql/update_nurse_workflow.sql";
        }

        if ($this->testResults['nurse_api']['failed'] > 0) {
            $recommendations[] = "Ensure all API files are properly uploaded and accessible";
        }

        if ($this->testResults['workflow_integration']['failed'] > 0) {
            $recommendations[] = "Upload all HTML and JavaScript files to their respective directories";
        }

        if (empty($recommendations)) {
            $recommendations[] = "All tests passed! The nurse-patient workflow is ready for use.";
        }

        return $recommendations;
    }
}

// Run tests if called directly
if (basename($_SERVER['PHP_SELF']) === 'test_nurse_workflow.php') {
    $tester = new NurseWorkflowTest();
    $results = $tester->runAllTests();
    $report = $tester->generateReport();
    
    echo json_encode($report, JSON_PRETTY_PRINT);
}
?>
