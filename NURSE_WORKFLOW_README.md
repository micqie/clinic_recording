# Enhanced Nurse-Patient Workflow Implementation

## Overview

This implementation adds a comprehensive nurse-patient workflow to the MCSTUFFIN's clinic recording system. The workflow ensures that patients are properly assessed by nurses before being forwarded to doctors for consultation.

## Key Features

### 1. **Patient Routing System**
- Patients are now routed to "Waiting for Nurse" status instead of directly to doctors
- Nurses must complete patient assessments before forwarding to doctors
- Automatic status updates throughout the workflow

### 2. **Nurse Assessment Process**
- **Vital Signs Recording**: Height, weight, blood pressure, heart rate, SpO₂
- **Medical History Collection**: Present illness, past medical history, surgical history, family history, social history, current medications
- **Assessment Notes**: Additional notes from the nurse
- **Validation Rules**: Ensures all required fields are completed before forwarding

### 3. **Doctor Consultation Enhancement**
- Doctors receive patients with complete nurse assessment data
- Read-only access to nurse-recorded vital signs and medical history
- Enhanced consultation interface with pre-populated patient data

## Database Changes

### New Statuses Added
```sql
INSERT INTO `tbl_status` (`status_id`, `status_type_id`, `status_name`) VALUES
(21, 1, 'Waiting for Nurse'),
(22, 1, 'Nurse Assessment'),
(23, 1, 'Waiting for Doctor');
```

### New Table: `tbl_nurse_assessments`
```sql
CREATE TABLE `tbl_nurse_assessments` (
  `assessment_id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `nurse_id` int(11) NOT NULL,
  `assessment_date` datetime DEFAULT current_timestamp(),
  `vitals_completed` tinyint(1) DEFAULT 0,
  `history_completed` tinyint(1) DEFAULT 0,
  `assessment_notes` text DEFAULT NULL,
  `forwarded_to_doctor` tinyint(1) DEFAULT 0,
  `forwarded_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assessment_id`),
  KEY `fk_assessment_appointment` (`appointment_id`),
  KEY `fk_assessment_nurse` (`nurse_id`),
  CONSTRAINT `fk_assessment_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointments` (`appointment_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessment_nurse` FOREIGN KEY (`nurse_id`) REFERENCES `tbl_nurses` (`nurse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## New Files Added

### API Files
- `api/nurse_enhanced.php` - Enhanced nurse API with complete workflow support
- `api/validation_rules.php` - Validation rules for patient forwarding

### HTML Files
- `html/nurse/nurse_enhanced_dashboard.html` - Enhanced nurse dashboard
- `html/doctor/doctor_enhanced_consultations.html` - Enhanced doctor consultations

### JavaScript Files
- `js/nurse_enhanced_dashboard.js` - Nurse dashboard functionality
- `js/doctor_enhanced_consultations.js` - Doctor consultation functionality

### SQL Files
- `sql/update_nurse_workflow.sql` - Database schema updates

### Test Files
- `test_nurse_workflow.php` - Comprehensive workflow testing

## Workflow Process

### 1. **Patient Queuing**
1. Secretary creates appointment → Status: "Waiting for Nurse"
2. Patient appears in nurse dashboard queue

### 2. **Nurse Assessment**
1. Nurse starts assessment → Status: "Nurse Assessment"
2. Nurse records vital signs (height, weight, blood pressure, heart rate, SpO₂)
3. Nurse records medical history (present illness, past medical history, etc.)
4. Nurse adds assessment notes
5. System validates all required fields are completed

### 3. **Patient Forwarding**
1. Nurse forwards patient to doctor → Status: "Waiting for Doctor"
2. Patient appears in doctor's enhanced consultation interface
3. Doctor can view all nurse assessment data (read-only)
4. Doctor conducts consultation with complete patient information

### 4. **Validation Rules**
- **Required Fields**: Vital signs and medical history must be completed
- **Essential Vitals**: Height, weight, blood pressure are mandatory
- **Medical History**: Present illness is mandatory
- **Abnormal Values**: System warns about abnormal vital signs
- **Completion Check**: Both vitals and history must be marked complete

## API Endpoints

### Nurse Enhanced API (`api/nurse_enhanced.php`)

#### Get Patients Waiting for Nurse
```
GET /api/nurse_enhanced.php?operation=get_patients_waiting_for_nurse
```

#### Start Nurse Assessment
```
POST /api/nurse_enhanced.php
{
  "operation": "start_nurse_assessment",
  "json": "{\"appointment_id\": 123, \"nurse_id\": 1}"
}
```

#### Record Vital Signs
```
POST /api/nurse_enhanced.php
{
  "operation": "record_vitals",
  "json": "{\"appointment_id\": 123, \"height_cm\": 170, \"weight_kg\": 65, ...}"
}
```

#### Record Medical History
```
POST /api/nurse_enhanced.php
{
  "operation": "record_medical_history",
  "json": "{\"appointment_id\": 123, \"present_illness\": \"...\", ...}"
}
```

#### Forward to Doctor
```
POST /api/nurse_enhanced.php
{
  "operation": "forward_to_doctor",
  "json": "{\"appointment_id\": 123}"
}
```

### Validation Rules API (`api/validation_rules.php`)

#### Validate Patient Forwarding
```
GET /api/validation_rules.php?operation=validate_patient_forwarding&appointment_id=123
```

#### Get Validation Summary
```
GET /api/validation_rules.php?operation=get_validation_summary&appointment_id=123
```

## Installation Instructions

### 1. **Database Setup**
```bash
# Run the SQL update script
mysql -u username -p database_name < sql/update_nurse_workflow.sql
```

### 2. **File Upload**
Upload all new files to their respective directories:
- API files to `api/`
- HTML files to `html/nurse/` and `html/doctor/`
- JavaScript files to `js/`
- SQL files to `sql/`

### 3. **Testing**
```bash
# Run the test script
php test_nurse_workflow.php
```

## Usage Instructions

### For Nurses

1. **Access Enhanced Dashboard**
   - Navigate to `html/nurse/nurse_enhanced_dashboard.html`
   - View patients waiting for nurse assessment
   - Start assessment for each patient

2. **Complete Patient Assessment**
   - Record vital signs (height, weight, blood pressure, heart rate, SpO₂)
   - Record medical history (present illness, past medical history, etc.)
   - Add assessment notes
   - Forward patient to doctor when complete

### For Doctors

1. **Access Enhanced Consultations**
   - Navigate to `html/doctor/doctor_enhanced_consultations.html`
   - View patients ready for consultation
   - Start consultation with complete patient data

2. **Review Nurse Assessment Data**
   - View read-only vital signs and medical history
   - Conduct consultation with complete patient information
   - Add diagnosis, prescriptions, and lab requests

## Security Considerations

- **Role-based Access**: Nurses can only edit patient data, doctors have read-only access
- **Validation**: Strict validation prevents incomplete patient forwarding
- **Audit Trail**: All assessments are logged with timestamps
- **Data Integrity**: Foreign key constraints ensure data consistency

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure database credentials are correct
   - Check if new tables were created successfully

2. **API Not Responding**
   - Verify file permissions
   - Check PHP error logs
   - Ensure all dependencies are installed

3. **Validation Failures**
   - Check if all required fields are completed
   - Verify status transitions are correct
   - Review validation rules

### Testing

Run the comprehensive test script:
```bash
php test_nurse_workflow.php
```

This will test:
- Database schema updates
- API connectivity
- File existence
- Workflow integration

## Future Enhancements

1. **Real-time Notifications**: Notify doctors when patients are ready
2. **Advanced Analytics**: Track assessment completion rates
3. **Mobile Support**: Mobile-friendly nurse interface
4. **Integration**: Connect with external medical devices
5. **Reporting**: Generate assessment reports

## Support

For technical support or questions about the nurse-patient workflow implementation, please refer to the system documentation or contact the development team.

---

**Note**: This implementation maintains backward compatibility with existing functionality while adding the new nurse-patient workflow. All existing features continue to work as before.
