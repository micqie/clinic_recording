# Queue Management Troubleshooting Guide

## Issue: Error when starting consultation

If you're getting an error when trying to start a consultation, follow these steps to identify and fix the issue:

### Step 1: Check Database Setup

First, run the database setup script to ensure all required tables exist:

1. Open your database management tool (phpMyAdmin, MySQL Workbench, etc.)
2. Run the SQL script: `sql/setup_queue_tables.sql`
3. This will create the required tables and statuses

### Step 2: Test Database Setup

Visit this URL in your browser to check if everything is set up correctly:
```
http://localhost/clinic_recording/api/test_queue_setup.php
```

This will show you:
- Whether required tables exist
- Whether required statuses exist
- How many appointments and secretaries are in the system

### Step 3: Check Browser Console

1. Open the Queue Management page
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Try to start a consultation
5. Look for any error messages in the console

### Step 4: Common Issues and Solutions

#### Issue 1: "In Consultation status not found"
**Solution**: Run the database setup script to create the required statuses.

#### Issue 2: "Table doesn't exist" error
**Solution**: Run the database setup script to create the required tables.

#### Issue 3: "Appointment not found" error
**Solution**: Make sure you have confirmed appointments in the system.

#### Issue 4: "Secretary ID not found" error
**Solution**: Make sure you're logged in as a secretary user.

#### Issue 5: "Invalid operation" error
**Solution**: This usually means the API endpoint is not accessible or there's a path issue.

**Debugging Steps for "Invalid operation":**

1. **Test API Accessibility:**
   Visit this URL in your browser:
   ```
   http://localhost/clinic_recording/api/test_enhanced_queue.php
   ```
   You should see a JSON response confirming the API is accessible.

2. **Check API File Exists:**
   Verify that the file `api/enhanced_queue_management.php` exists in your project.

3. **Check Browser Console:**
   Look for the API URL being logged in the console. It should be:
   ```
   http://localhost/clinic_recording/api/enhanced_queue_management.php
   ```

4. **Check Server Error Logs:**
   Look in your server's error log (usually in `/var/log/apache2/error.log` or similar) for any PHP errors.

5. **Test Direct API Call:**
   Try visiting the API directly with a GET parameter:
   ```
   http://localhost/clinic_recording/api/enhanced_queue_management.php?operation=get_enhanced_queue_status&date=2025-08-25
   ```

6. **Check File Permissions:**
   Make sure the PHP file has proper read permissions.

### Step 5: Manual Database Check

If the automatic setup doesn't work, manually check these in your database:

1. **Check if tbl_current_queue exists:**
   ```sql
   SHOW TABLES LIKE 'tbl_current_queue';
   ```

2. **Check if required statuses exist:**
   ```sql
   SELECT status_id, status_name FROM tbl_status
   WHERE status_name IN ('In Consultation', 'Completed', 'Confirmed');
   ```

3. **Check if status_type exists:**
   ```sql
   SELECT * FROM tbl_status_type WHERE status_type_name = 'Appointment';
   ```

4. **Create missing status_type if needed:**
   ```sql
   INSERT INTO tbl_status_type (status_type_name) VALUES ('Appointment');
   ```

5. **Create missing statuses if needed:**
   ```sql
   INSERT INTO tbl_status (status_name, status_type_id)
   SELECT 'In Consultation', status_type_id
   FROM tbl_status_type
   WHERE status_type_name = 'Appointment';

   INSERT INTO tbl_status (status_name, status_type_id)
   SELECT 'Completed', status_type_id
   FROM tbl_status_type
   WHERE status_type_name = 'Appointment';

   INSERT INTO tbl_status (status_name, status_type_id)
   SELECT 'Confirmed', status_type_id
   FROM tbl_status_type
   WHERE status_type_name = 'Appointment';
   ```

### Step 6: Test the Fix

After running the setup:

1. Refresh the Queue Management page
2. Try to start a consultation again
3. Check the browser console for any remaining errors

### Step 7: If Still Having Issues

If you're still experiencing problems:

1. Check the browser console for specific error messages
2. Check your server's error logs (usually in `/var/log/apache2/error.log` or similar)
3. Make sure your database connection is working
4. Verify that the API endpoints are accessible

### Debug Information

The enhanced error handling will now show you:
- The appointment ID being processed
- The secretary ID being used
- The API response details
- Specific error messages from the server

This should help identify exactly what's causing the issue.

### Quick Fix Commands

If you have command line access to your database:

```bash
# Connect to your database
mysql -u your_username -p your_database_name

# Run the setup script
source /path/to/clinic_recording/sql/setup_queue_tables.sql
```

Or if using phpMyAdmin:
1. Go to the SQL tab
2. Copy and paste the contents of `sql/setup_queue_tables.sql`
3. Click "Go" to execute
