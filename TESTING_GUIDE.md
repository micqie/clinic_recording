# Clinic Recording System - Enhanced Nurse Workflow Integration Test

## Overview
This document outlines the testing procedures for the enhanced clinic recording system with dedicated Nurse role workflow.

## New Workflow
1. **Secretary** approves appointments and manages patient queue
2. **Secretary** assigns patients to nurses
3. **Nurse** records vital signs and medical history
4. **Nurse** completes assessment and forwards patient to doctor queue
5. **Doctor** conducts consultation (no longer enters vitals/history)
6. **Doctor** completes consultation

## Database Schema Updates

### 1. Run Database Migration
```sql
-- Execute the SQL script to update database schema
SOURCE sql/update_nurse_workflow.sql;
```

### 2. Verify New Tables Created
- `tbl_nurse_queue` - Tracks nurse queue workflow
- `tbl_doctor_queue` - Tracks doctor queue workflow

### 3. Verify New Statuses Added
- `Ready for Nurse` (status_id: 21)
- `With Nurse` (status_id: 22)
- `Ready for Doctor` (status_id: 23)
- `With Doctor` (status_id: 24)

## API Endpoints Testing

### 1. Enhanced Queue Management API
**File:** `api/enhanced_queue_management_v2.php`

**Test Endpoints:**
- `GET get_current_queue_status` - Get overall queue status
- `POST assign_to_nurse` - Assign patient to nurse
- `POST start_nurse_consultation` - Start nurse consultation
- `POST complete_nurse_consultation` - Complete nurse assessment
- `POST start_doctor_consultation` - Start doctor consultation
- `POST complete_doctor_consultation` - Complete doctor consultation
- `GET get_nurse_queue_status` - Get nurse queue
- `GET get_doctor_queue_status` - Get doctor queue

### 2. Enhanced Nurse API
**File:** `api/nurse_enhanced_v2.php`

**Test Endpoints:**
- `POST save_nurse_assessment` - Save nurse assessment
- `GET get_nurse_assessment` - Get nurse assessment data
- `GET get_all_nurses` - Get all active nurses

## User Interface Testing

### 1. Secretary Interface
**File:** `html/secretary/secretary_enhanced_queue_management.html`

**Test Scenarios:**
1. Login as secretary
2. View enhanced queue management dashboard
3. Assign patients to nurses
4. Monitor nurse and doctor queues
5. View completed appointments

### 2. Nurse Interface
**File:** `html/nurse/nurse_enhanced_dashboard.html`

**Test Scenarios:**
1. Login as nurse
2. View nurse queue dashboard
3. Start nurse consultation
4. Record vital signs and medical history
5. Complete nurse assessment
6. Forward patient to doctor queue

### 3. Doctor Interface
**File:** `html/doctor/doctor_enhanced_consultations.html`

**Test Scenarios:**
1. Login as doctor
2. View doctor queue dashboard
3. Start doctor consultation
4. Review nurse assessment data (read-only)
5. Conduct consultation
6. Complete consultation

## Complete Workflow Test

### Test Case 1: Complete Patient Journey
1. **Secretary Login**
   - Navigate to enhanced queue management
   - Verify workflow overview is displayed
   - Check queue statistics

2. **Create/Approve Appointment**
   - Create new appointment or approve existing
   - Assign patient to nurse
   - Verify patient appears in nurse queue

3. **Nurse Assessment**
   - Login as nurse
   - View assigned patients
   - Start nurse consultation
   - Record vital signs (height, weight, temperature, BP, HR, SpO2)
   - Record medical history (past medical, current medications, family history, social history)
   - Record chief complaint
   - Complete nurse assessment
   - Verify patient moves to doctor queue

4. **Doctor Consultation**
   - Login as doctor
   - View patients ready for consultation
   - Start doctor consultation
   - Review nurse assessment data (should be read-only)
   - Conduct consultation
   - Add diagnosis and consultation notes
   - Add prescriptions if needed
   - Complete consultation
   - Verify patient appears in completed appointments

5. **Secretary Verification**
   - Return to secretary dashboard
   - Verify patient appears in completed appointments
   - Check queue statistics updated correctly

### Test Case 2: Data Integrity
1. Verify nurse assessment data is properly stored
2. Verify doctor can access nurse data but cannot modify vitals/history
3. Verify queue status transitions correctly
4. Verify all timestamps are recorded properly

### Test Case 3: Error Handling
1. Test with invalid appointment IDs
2. Test with missing required fields
3. Test database transaction rollbacks
4. Test concurrent user access

## Performance Testing
1. Test with multiple concurrent users
2. Test queue refresh performance
3. Test database query performance
4. Test API response times

## Security Testing
1. Verify user role-based access control
2. Test SQL injection prevention
3. Test XSS prevention
4. Verify session management

## Browser Compatibility
Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsiveness
Test on:
- Mobile devices (iOS/Android)
- Tablets
- Different screen sizes

## Rollback Plan
If issues are found:
1. Revert login routing in `js/index.js`
2. Use original queue management system
3. Restore original consultation interfaces
4. Database changes can remain (they're additive)

## Success Criteria
- [ ] All new API endpoints working correctly
- [ ] Complete workflow from secretary → nurse → doctor functioning
- [ ] Data integrity maintained throughout workflow
- [ ] User interfaces responsive and intuitive
- [ ] No regression in existing functionality
- [ ] Performance acceptable under normal load
- [ ] Security measures in place

## Post-Deployment Monitoring
1. Monitor error logs
2. Track user adoption of new workflow
3. Monitor system performance
4. Collect user feedback
5. Plan for any necessary adjustments
