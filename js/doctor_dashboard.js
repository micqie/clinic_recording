document.addEventListener("DOMContentLoaded", () => {
  const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
  
  // Check if user is logged in and is a doctor
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (!user.id || user.role !== "doctor") {
    window.location.href = "../../index.html";
    return;
  }

  async function loadDashboardData() {
    try {
      // Load today's appointments count
      const appointmentsResponse = await axios.get(`${baseApiUrl}/appointments.php?operation=get_doctor_appointments&doctor_id=${user.id}`);
      if (appointmentsResponse.data.success) {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointmentsResponse.data.data.filter(apt => apt.appointment_date === today);
        document.getElementById("todayAppointmentsCount").textContent = todayAppointments.length;
      }

      // Load pending appointments count
      const pendingAppointments = appointmentsResponse.data.data.filter(apt => apt.status === "Pending");
      document.getElementById("pendingAppointmentsCount").textContent = pendingAppointments.length;

      // Load active prescriptions count
      const prescriptionsResponse = await axios.get(`${baseApiUrl}/prescriptions.php?operation=get_doctor_prescriptions&doctor_id=${user.id}`);
      if (prescriptionsResponse.data.success) {
        const activePrescriptions = prescriptionsResponse.data.data.filter(pres => pres.status === "Active");
        document.getElementById("activePrescriptionsCount").textContent = activePrescriptions.length;
      }

      // Load lab requests count
      const labRequestsResponse = await axios.get(`${baseApiUrl}/lab_requests.php?operation=get_doctor_requests&doctor_id=${user.id}`);
      if (labRequestsResponse.data.success) {
        document.getElementById("labRequestsCount").textContent = labRequestsResponse.data.data.length;
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Set default values if API calls fail
      document.getElementById("todayAppointmentsCount").textContent = "0";
      document.getElementById("pendingAppointmentsCount").textContent = "0";
      document.getElementById("activePrescriptionsCount").textContent = "0";
      document.getElementById("labRequestsCount").textContent = "0";
    }
  }

  // Load dashboard data on page load
  loadDashboardData();

  // Refresh data every 30 seconds
  setInterval(loadDashboardData, 30000);
});
