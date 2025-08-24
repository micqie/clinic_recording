# Enhanced Queue Management and Doctor Availability System

## Overview
This enhancement adds a comprehensive queue management system and doctor availability tracking to the clinic recording system. The secretary can now manage the current queue, and patients cannot book appointments for past dates or with unavailable doctors.

## New Features

### 1. Enhanced Queue Management
- **Secretary Control**: Secretaries can set who is currently being consulted
- **Real-time Updates**: Queue status is reflected on both secretary and doctor dashboards
- **Complete & Next**: One-click action to complete current consultation and move to next patient
- **Queue Tracking**: Shows current consultation, next in queue, and completion statistics

### 2. Doctor Availability Management
- **Availability Setting**: Secretaries can mark doctors as available/unavailable for specific dates
- **Reason Tracking**: Optional reason field for unavailability
- **Date Validation**: Prevents appointment booking with unavailable doctors
- **Availability History**: Track who set availability and when

### 3. Enhanced Appointment System
- **Past Date Prevention**: Patients cannot book appointments for past dates
- **Doctor Availability Check**: Only available doctors appear in appointment approval dropdown
- **Real-time Validation**: Immediate feedback on date selection

## Database Changes

### New Tables
1. **tbl_doctor_availability**
   - Tracks doctor availability/unavailability for specific dates
   - Includes reason and audit trail

2. **tbl_current_queue**
   - Tracks current consultation status
   - Links to appointments and tracks who updated the queue

### SQL Setup
Run the following SQL file to create the new tables:
```sql
-- Execute: sql/doctor_availability.sql
```

## API Endpoints

### Enhanced Queue Management (`api/enhanced_queue_management.php`)

#### Queue Operations
- `set_current_consultation` - Set who is currently being consulted
- `complete_and_next` - Complete current consultation and move to next patient
- `get_enhanced_queue_status` - Get detailed queue status with audit info

#### Doctor Availability
- `set_doctor_availability` - Set doctor availability for a date
- `get_doctor_availability` - Get availability for a date range
- `get_available_doctors` - Get list of available doctors for a date
- `get_availability_list` - Get availability records with filters
- `delete_doctor_availability` - Remove availability setting

### Enhanced Appointments (`api/appointments.php`)
- `get_available_doctors` - Get available doctors for appointment approval
- Enhanced `request` method with past date validation
- Enhanced `approve` method with doctor availability check

## User Interface

### Secretary Dashboard
- **Queue Management Panel**: Shows current consultation, next patient, and completion stats
- **Queue Control Buttons**: Start consultation, complete & next
- **Real-time Updates**: Queue status refreshes automatically

### Doctor Consultation Page
- **Current Queue Display**: Shows who is currently being consulted
- **Patient Information**: Displays current patient details
- **Queue Status**: Real-time updates from secretary actions

### Doctor Availability Management
- **Availability Table**: View all availability settings with filters
- **Set Availability Modal**: Mark doctors as available/unavailable
- **Filter Options**: By doctor, date, and status

### Patient Appointment Booking
- **Date Validation**: Prevents selection of past dates
- **Real-time Feedback**: Immediate error messages for invalid dates

## Usage Instructions

### For Secretaries

#### Managing the Queue
1. Go to **Appointments** page
2. View the **Queue Management** panel
3. Click **"Start Consultation"** for the next patient
4. Use **"Complete & Next"** to finish current consultation and move to next patient

#### Setting Doctor Availability
1. Go to **Doctors > Doctor Availability**
2. Click **"Set Availability"**
3. Select doctor, date, and status
4. Add optional reason for unavailability
5. Save the setting

#### Approving Appointments
1. Go to **Appointments** page
2. Click **"Approve"** on a pending appointment
3. Only available doctors will appear in the dropdown
4. Select doctor and approve

### For Doctors

#### Viewing Current Queue
1. Go to **Consultations** page
2. View the **Current Queue Status** panel
3. See who is currently being consulted
4. Refresh to get latest updates

### For Patients

#### Booking Appointments
1. Go to **Appointments** page
2. Select a future date (past dates are blocked)
3. Submit appointment request
4. Wait for secretary approval

## Technical Implementation

### Frontend Changes
- Enhanced JavaScript files with new API calls
- Real-time queue status updates
- Date validation and availability checking
- Modal forms for availability management

### Backend Changes
- New API endpoints for queue and availability management
- Enhanced appointment validation
- Database transaction handling for queue operations
- Audit trail for availability changes

### Security Features
- User role validation for all operations
- Secretary-only access to queue management
- Doctor availability tracking with user attribution
- Input validation and sanitization

## Error Handling
- Graceful fallbacks when APIs are unavailable
- User-friendly error messages
- Validation feedback for invalid inputs
- Transaction rollback on failures

## Future Enhancements
- Email notifications for queue changes
- Mobile app integration
- Advanced scheduling algorithms
- Integration with external calendar systems
- Bulk availability setting
- Recurring availability patterns

## Troubleshooting

### Common Issues
1. **Queue not updating**: Check if secretary is logged in and has proper permissions
2. **Doctor not appearing in dropdown**: Verify doctor availability for the selected date
3. **Past date booking**: Ensure date validation is working properly
4. **API errors**: Check database connection and table existence

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API endpoints are accessible
3. Confirm database tables exist and have proper structure
4. Check user permissions and session data
