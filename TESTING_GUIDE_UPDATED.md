# Testing Guide for Updated Clinic Recording System

## Overview
This guide covers testing the updated clinic recording system with the new Nurse role and enhanced queue management workflow.

## Prerequisites
1. **Database Setup**: Run the SQL scripts in order:
   - `sql/mc_db.sql` (if not already set up)
   - `sql/update_nurse_workflow.sql` (adds new statuses)
   - `sql/create_test_nurse.sql` (creates test nurse user)

2. **Test Users Available**:
   - **Secretary**: Use existing secretary account
   - **Doctor**: Use existing doctor account  
   - **Nurse**: `nurse_test` / `nurse123`
   - **Patient**: Use existing patient account

## Testing Workflow

### 1. Secretary Testing

#### Login as Secretary
- Navigate to the login page
- Login with secretary credentials
- Should be redirected to `secretary_queue_management.html`

#### Test Nurse Assignment
1. **Send Patient to Nurse Queue**:
   - In the "Send to Nurse Queue" section
   - Select a patient from the dropdown (shows Confirmed/Pending appointments)
   - Select a nurse from the dropdown
   - Click "Send to Nurse Queue"
   - Verify success message appears
   - Check that patient status changes to "Queued to Nurse"

2. **Verify Queue Status**:
   - Refresh the queue status
   - Verify patient appears in "Queued to Nurse" section
   - Check that nurse assignment is recorded

### 2. Nurse Testing

#### Login as Nurse
- Login with `nurse_test` / `nurse123`
- Should be redirected to `nurse_enhanced_dashboard.html`

#### Test Nurse Workflow
1. **View Assigned Patients**:
   - Check "Today's Appointments" section
   - Verify patients assigned to nurse appear in the list
   - Patients should show status "Queued to Nurse"

2. **Record Vitals and History**:
   - Click "Record Vitals and History" for a patient
   - Fill in the vitals form:
     - Height, Weight, Temperature, Blood Pressure, Heart Rate, SpO2
   - Fill in medical history:
     - Chief Complaint, Past Medical History, Current Medications
     - Family History, Social History
   - Add nurse assessment notes
   - Click "Save Vitals and History"
   - Verify success message

3. **Complete Triage**:
   - After saving vitals, click "Complete Triage"
   - Verify patient is automatically sent to doctor queue
   - Check that patient status changes to "Queued to Doctor"

### 3. Doctor Testing

#### Login as Doctor
- Login with doctor credentials
- Should be redirected to `doctor_consultations.html` (updated version)

#### Test Doctor Workflow
1. **View Nurse Assessment**:
   - When a patient is "In Consultation"
   - Verify nurse assessment data is displayed in read-only fields:
     - Chief Complaint
     - Vital Signs (Height, Weight, Temperature, BP, HR, SpO2)
     - Medical History (Past Medical, Current Meds, Family, Social)
     - Nurse Assessment Notes

2. **Complete Consultation**:
   - Add diagnosis and consultation notes
   - Add prescriptions if needed
   - Add lab requests if needed
   - Click "Complete Consultation"
   - Verify patient status changes to "Completed"

### 4. End-to-End Workflow Testing

#### Complete Patient Journey
1. **Secretary**: Send patient to nurse queue
2. **Nurse**: Record vitals and history, complete triage
3. **Secretary**: Verify patient moved to doctor queue
4. **Doctor**: Complete consultation with nurse data visible
5. **Verify**: Patient status is "Completed"

## Expected Behavior

### Queue Status Flow
1. **Pending** → **Confirmed** (Secretary approves)
2. **Confirmed** → **Queued to Nurse** (Secretary assigns to nurse)
3. **Queued to Nurse** → **In Triage** (Nurse starts assessment)
4. **In Triage** → **Queued to Doctor** (Nurse completes triage)
5. **Queued to Doctor** → **In Consultation** (Doctor starts consultation)
6. **In Consultation** → **Completed** (Doctor completes consultation)

### Data Visibility
- **Nurse**: Can only see patients assigned to them
- **Doctor**: Can see nurse assessment data in read-only format
- **Secretary**: Can see all queue statuses and manage assignments

## Troubleshooting

### Common Issues
1. **Nurse not appearing in dropdown**: Check if nurse user exists in database
2. **Patient not moving to doctor queue**: Verify nurse completed triage
3. **Doctor not seeing nurse data**: Check if nurse assessment was saved
4. **Queue status not updating**: Refresh page or check API responses

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API endpoints are responding correctly
3. Check database for correct status updates
4. Ensure all required fields are filled

## Success Criteria
- [ ] Secretary can assign patients to nurses
- [ ] Nurse can record vitals and history
- [ ] Nurse can complete triage and send to doctor
- [ ] Doctor can see nurse assessment data
- [ ] Doctor can complete consultation
- [ ] Queue status updates correctly throughout workflow
- [ ] All user roles work as expected

## Notes
- The system maintains backward compatibility with existing workflows
- All existing functionality should continue to work
- New nurse workflow is additive, not replacing existing features
- Test with multiple patients and different scenarios
