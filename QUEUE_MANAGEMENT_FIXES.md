# Queue Management Issues and Fixes

## Issues Identified

### 1. Date Defaulting Problem
**Problem**: The queue management page was defaulting to yesterday's date (2025-08-26) instead of today's date.

**Root Cause**: The JavaScript was using `toISOString()` which can cause timezone issues, potentially setting the date to the previous day.

**Fix Applied**: Modified the `setDefaultDate()` function in `js/secretary_queue_management.js` to use local timezone instead of UTC.

### 2. Database Status Table Issues
**Problem**: The status table had duplicate status types and inconsistent references.

**Issues Found**:
- Status type 1 and 4 were both "Appointment" (duplicate)
- "In Consultation" status existed in both types (17 and 18)
- This caused confusion in API queries

**Fix Applied**: Created `sql/fix_status_table.sql` to clean up the duplicate status types.

### 3. No Appointments for Today
**Problem**: There were no appointments in the database for today (2025-08-28), making it impossible to test the queue management.

**Root Cause**: All appointments in the database were for past dates or future dates.

**Fix Applied**: Created `sql/add_test_appointments.sql` to add test appointments for today.

### 4. API Status Lookup Issues
**Problem**: The enhanced queue management API had issues finding the correct status IDs.

**Fix Applied**: Improved the `getStatusId()` method to better handle status lookups and fallback to broader searches.

## How to Apply the Fixes

### Step 1: Fix the Database Status Table
Run the following SQL commands in your database:

```sql
-- Fix duplicate status types
UPDATE tbl_status SET status_type_id = 1 WHERE status_type_id = 4;
DELETE FROM tbl_status_type WHERE status_type_id = 4;
ALTER TABLE tbl_status_type AUTO_INCREMENT = 4;
```

### Step 2: Add Test Appointments for Today
Run the SQL script `sql/add_test_appointments.sql` to add test appointments for today.

### Step 3: Test the Queue Management
1. Refresh the queue management page
2. The date should now default to today (2025-08-28)
3. You should see the test appointments in the queue
4. Try starting a consultation to test the functionality

## Testing the Queue Management

### For Secretaries:
1. **Start Queue**: Use the "Start Queue" button to begin consultations
2. **Start Consultation**: Click "Start" on any confirmed appointment
3. **Complete Consultation**: Click "Complete" when a consultation is done
4. **Monitor Queue**: Watch the queue move as patients are processed

### For Doctors:
1. **View Consultations**: Doctors should now see patients in consultation
2. **Process Patients**: Complete consultations to move the queue forward
3. **Queue Status**: Monitor who is currently consulting and who is next

## Expected Behavior After Fixes

1. **Date Default**: Page should always default to today's date
2. **Appointments Display**: Should show confirmed appointments for today
3. **Queue Management**: Should be able to start, manage, and complete consultations
4. **Doctor Access**: Doctors should see patients available for consultation

## Troubleshooting

### If the date still defaults to yesterday:
- Check browser console for JavaScript errors
- Verify the `setDefaultDate()` function is being called
- Check if there are any other scripts overriding the date

### If no appointments appear:
- Verify the test appointments were added to the database
- Check the appointment dates match today's date
- Verify the status IDs are correct (7 = Confirmed)

### If consultations can't be started:
- Check the API responses in browser console
- Verify the status transitions are working
- Check database constraints and foreign keys

## Database Schema Notes

The queue management system uses these key tables:
- `tbl_appointments`: Stores appointment details and queue numbers
- `tbl_current_queue`: Tracks who is currently consulting
- `tbl_status`: Manages appointment statuses (Pending, Confirmed, In Consultation, Completed)
- `tbl_consultations`: Records consultation details when appointments are completed

## API Endpoints

The enhanced queue management uses these operations:
- `get_enhanced_queue_status`: Get current queue status for a date
- `set_current_consultation`: Start a consultation for a patient
- `complete_and_next`: Complete current consultation and move to next patient
- `get_doctor_queue_status`: Get queue status for a specific doctor

