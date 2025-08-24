# Page Consistency Guide - MCSTUFFIN's Clinic Recording System

## Overview
This document outlines the consistent structure and styling that has been implemented across all pages in the MCSTUFFIN's Clinic Recording System to ensure a uniform user experience across secretary, doctor, and patient roles.

## Standard Page Structure

### 1. HTML Head Section
All pages follow this consistent head structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCSTUFFIN's [Role] - [Page Name]</title>

    <!-- CSS Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css" rel="stylesheet">

    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Custom Scripts -->
    <script src="../../js/logout.js" defer></script>

    <!-- Custom CSS -->
    <link rel="stylesheet" href="../../css/dashboard.css">
    <link rel="stylesheet" href="../../css/table.css">

    <!-- Favicon -->
    <link rel="icon" href="../../logo/apple-touch-icon.png" type="image/x-icon" />
</head>
```

### 2. Navigation Bar Structure
All pages use a consistent top navigation bar:

```html
<nav class="navbar navbar-expand-lg navbar-light fixed-top shadow-sm" id="main-navbar">
    <div class="container-fluid">
        <!-- Brand -->
        <a class="navbar-brand d-flex align-items-center" href="#">
            <i class="fas fa-stethoscope me-2 fs-3 text-primary"></i>
            <span class="fs-4 fw-bold text-primary">MCSTUFFIN's</span>
        </a>

        <!-- User Dropdown -->
        <div class="dropdown ms-auto">
            <a class="d-flex align-items-center text-decoration-none dropdown-toggle" href="#" id="adminDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-user-circle fa-2x text-primary me-2"></i>
                <span class="fw-semibold">[Role]</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="adminDropdown">
                <li>
                    <button type="button" class="dropdown-item text-danger" id="logoutBtn">
                        <i class="fas fa-sign-out-alt me-2"></i> Logout
                    </button>
                </li>
            </ul>
        </div>
    </div>
</nav>
```

**Role-specific variations:**
- **Secretary**: `<span class="fw-semibold">Secretary</span>`
- **Doctor**: `<span class="fw-semibold">Doctor</span>`
- **Patient**:
  ```html
  <div class="d-flex align-items-center">
      <!-- Mobile Toggle Button -->
      <button class="btn btn-primary d-lg-none me-2" type="button" id="sidebarToggle">
          <i class="fas fa-bars"></i>
      </button>
      <!-- User Dropdown -->
      <div class="dropdown">
          <a class="d-flex align-items-center text-decoration-none dropdown-toggle" href="#" id="patientDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="fas fa-user-circle fa-2x text-primary me-2"></i>
              <span class="fw-semibold d-none d-sm-inline">Patient</span>
          </a>
          <!-- ... dropdown menu ... -->
      </div>
  </div>
  ```

### 3. Main Layout Structure
All pages use this consistent main layout:

```html
<div class="d-flex">
    <!-- Sidebar Navigation -->
    <nav id="sidebar-wrapper" role="navigation" aria-label="Sidebar menu" tabindex="0">
        <div class="list-group list-group-flush">
            <!-- Navigation items -->
        </div>
    </nav>

    <!-- Main Content -->
    <main id="page-content-wrapper" class="pt-5" tabindex="-1">
        <button class="btn btn-primary d-lg-none offcanvas-toggle-btn" type="button" aria-label="Toggle menu">
            <i class="fas fa-bars"></i>
        </button>

        <div class="content-container mt-5 p-4">
            <!-- Page content -->
        </div>
    </main>
</div>
```

### 4. Sidebar Navigation Structure

#### Secretary Sidebar
```html
<div class="list-group list-group-flush">
    <a href="secretary_dashboard.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-tachometer-alt me-2" aria-hidden="true"></i>Dashboard
    </a>
    <a href="secretary_patients.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-people-group me-2" aria-hidden="true"></i>Registered Patients
    </a>

    <!-- Doctors Dropdown -->
    <a class="list-group-item list-group-item-action py-3 ripple" data-bs-toggle="collapse" href="#doctorSubmenu" role="button" aria-expanded="false" aria-controls="doctorSubmenu">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <i class="fa-solid fa-user-doctor me-2" aria-hidden="true"></i>Doctors
            </div>
            <i class="fas fa-chevron-down fa-xs"></i>
        </div>
    </a>
    <div class="collapse" id="doctorSubmenu">
        <div class="list-group list-group-flush">
            <a href="secretary_doctors.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-list me-2" aria-hidden="true"></i>Doctor List
            </a>
            <a href="secretary_doctor_specialization.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-star me-2" aria-hidden="true"></i>Specializations
            </a>
            <a href="secretary_doctor_availability.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-calendar-times me-2" aria-hidden="true"></i>Doctor Availability
            </a>
        </div>
    </div>

    <!-- Medicines Dropdown -->
    <a class="list-group-item list-group-item-action py-3 ripple" data-bs-toggle="collapse" href="#medicineSubmenu" role="button" aria-expanded="false" aria-controls="medicineSubmenu">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <i class="fa-solid fa-pills me-2" aria-hidden="true"></i>Medicines
            </div>
            <i class="fas fa-chevron-down fa-xs"></i>
        </div>
    </a>
    <div class="collapse" id="medicineSubmenu">
        <div class="list-group list-group-flush">
            <a href="secretary_medicine.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-list me-2" aria-hidden="true"></i>Medicine List
            </a>
            <a href="secretary_medicine_forms.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-tablets me-2" aria-hidden="true"></i>Medicine Forms
            </a>
            <a href="secretary_medicine_weights.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-weight-scale me-2" aria-hidden="true"></i>Medicine Weights
            </a>
        </div>
    </div>

    <!-- Appointments Dropdown -->
    <a class="list-group-item list-group-item-action py-3 ripple" data-bs-toggle="collapse" href="#appointmentsSubmenu" role="button" aria-expanded="false" aria-controls="appointmentsSubmenu">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <i class="fa-solid fa-calendar-check me-2" aria-hidden="true"></i>Appointments
            </div>
            <i class="fas fa-chevron-down fa-xs"></i>
        </div>
    </a>
    <div class="collapse" id="appointmentsSubmenu">
        <div class="list-group list-group-flush">
            <a href="secretary_appointments.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-list me-2" aria-hidden="true"></i>All Appointments
            </a>
            <a href="secretary_appointments_pending.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-clock me-2" aria-hidden="true"></i>Pending
            </a>
            <a href="secretary_appointments_confirmed.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-square-check me-2" aria-hidden="true"></i>Confirmed
            </a>
            <a href="secretary_queue_management.html" class="list-group-item list-group-item-action py-2 ripple ps-4">
                <i class="fa-solid fa-list-ol me-2" aria-hidden="true"></i>Queue Management
            </a>
        </div>
    </div>

    <a href="secretary_consultations.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-stethoscope me-2" aria-hidden="true"></i>Consultations
    </a>
    <a href="secretary_payments.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-credit-card me-2" aria-hidden="true"></i>Payments
    </a>
    <a href="secretary_lab_requests.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-flask me-2" aria-hidden="true"></i>Lab Requests
    </a>
    <a href="secretary_lab_results.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-file-medical me-2" aria-hidden="true"></i>Lab Results
    </a>
    <a href="secretary_medicine.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-pills me-2" aria-hidden="true"></i>Medicines
    </a>
    <a href="#" onclick="logout()" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-sign-out-alt me-2" aria-hidden="true"></i>Logout
    </a>
</div>
```

#### Doctor Sidebar
```html
<div class="list-group list-group-flush">
    <a href="doctor_dashboard.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-tachometer-alt me-2" aria-hidden="true"></i>Dashboard
    </a>
    <a href="doctor_appointments.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-calendar-check me-2" aria-hidden="true"></i>My Appointments
    </a>
    <a href="doctor_consultations.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-user-doctor me-2" aria-hidden="true"></i>Consultations
    </a>
    <a href="doctor_patients.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-people-group me-2" aria-hidden="true"></i>My Patients
    </a>
    <a href="doctor_prescriptions.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-pills me-2" aria-hidden="true"></i>Prescriptions
    </a>
    <a href="doctor_lab_requests.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-flask me-2" aria-hidden="true"></i>Lab Requests
    </a>
    <a href="#" onclick="logout()" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-sign-out-alt me-2" aria-hidden="true"></i>Logout
    </a>
</div>
```

#### Patient Sidebar
```html
<div class="list-group list-group-flush">
    <a href="patient_dashboard.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-tachometer-alt me-2" aria-hidden="true"></i>Dashboard
    </a>
    <a href="patient_profile.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-user-edit me-2" aria-hidden="true"></i>My Profile
    </a>
    <a href="patient_appointments.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-calendar-check me-2" aria-hidden="true"></i>My Appointments
    </a>
    <a href="patient_queue_status.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-list-ol me-2" aria-hidden="true"></i>Queue Status
    </a>
    <a href="patient_prescriptions.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-pills me-2" aria-hidden="true"></i>My Prescriptions
    </a>
    <a href="patient_lab_results.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-flask me-2" aria-hidden="true"></i>Lab Results
    </a>
    <a href="patient_payments.html" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fa-solid fa-credit-card me-2" aria-hidden="true"></i>Payments
    </a>
    <a href="#" onclick="logout()" class="list-group-item list-group-item-action py-3 ripple">
        <i class="fas fa-sign-out-alt me-2" aria-hidden="true"></i>Logout
    </a>
</div>
```

### 5. Page Header Structure
All pages use a consistent header structure:

```html
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">
        <i class="fas fa-[icon] me-2"></i>
        [Page Title]
    </h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <!-- Action buttons -->
    </div>
</div>
```

### 6. Scripts Section
All pages end with this consistent scripts section:

```html
<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="../../js/logout.js"></script>
<script src="../../js/[page-specific-script].js"></script>
</body>
</html>
```

## Page Title Convention
All pages follow this title convention:
- **Secretary pages**: `MCSTUFFIN's Secretary - [Page Name]`
- **Doctor pages**: `MCSTUFFIN's Doctor - [Page Name]`
- **Patient pages**: `MCSTUFFIN's Patient - [Page Name]`

## Active Navigation States
- Use `active` class for the current page's navigation item
- Use `aria-current="page"` for the active navigation item
- For dropdown menus, use `show` class to keep the relevant submenu expanded

## Responsive Design
- All pages are responsive and work on mobile devices
- Mobile toggle button is included for sidebar navigation
- Bootstrap 5 responsive classes are used throughout

## Color Scheme
- **Primary**: Bootstrap primary blue
- **Success**: Green for completed/positive actions
- **Warning**: Yellow/Orange for pending/waiting states
- **Danger**: Red for errors/delete actions
- **Info**: Blue for informational content
- **Secondary**: Gray for neutral content

## Icons
- Font Awesome 6.4.0 is used consistently
- Icons are placed before text with `me-2` class for spacing
- Consistent icon usage across similar functions

## Updated Pages
The following pages have been updated to follow this consistent structure:

### Secretary Pages
- ✅ `secretary_dashboard.html`
- ✅ `secretary_appointments.html`
- ✅ `secretary_queue_management.html` (new)
- ✅ `secretary_doctor_availability.html` (new)
- ✅ All other secretary pages

### Doctor Pages
- ✅ `doctor_dashboard.html`
- ✅ `doctor_consultations.html`
- ✅ `doctor_appointments.html`
- ✅ All other doctor pages

### Patient Pages
- ✅ `patient_dashboard.html`
- ✅ `patient_appointments.html`
- ✅ `patient_queue_status.html` (new)
- ✅ All other patient pages

## Benefits of Consistent Structure
1. **User Experience**: Users can easily navigate between pages without confusion
2. **Maintainability**: Consistent code structure makes updates easier
3. **Accessibility**: Proper ARIA labels and semantic HTML
4. **Responsive Design**: Works consistently across all device sizes
5. **Brand Consistency**: Uniform appearance reinforces the MCSTUFFIN's brand

## Future Development Guidelines
When creating new pages, follow this structure to maintain consistency:
1. Use the standard HTML head section
2. Implement the consistent navigation bar
3. Follow the sidebar structure for the appropriate role
4. Use the standard page header format
5. Include the required scripts section
6. Follow the naming conventions for titles and files
