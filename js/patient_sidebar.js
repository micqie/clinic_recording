document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar-wrapper');
  if (!sidebar) return;

  // Apply saved state
  try {
    const savedState = localStorage.getItem('patientSidebarOpen');
    const shouldOpen = savedState === '1';
    if (shouldOpen) {
      sidebar.classList.add('show');
      document.body.classList.add('sidebar-open');
    } else {
      sidebar.classList.remove('show');
      document.body.classList.remove('sidebar-open');
    }
  } catch (e) {
    // ignore storage errors
  }

  const syncAndSave = () => {
    const isOpen = sidebar.classList.contains('show');
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    try {
      localStorage.setItem('patientSidebarOpen', isOpen ? '1' : '0');
    } catch (e) {
      // ignore storage errors
    }
  };

  // Observe class changes to persist state and keep body in sync
  const observer = new MutationObserver(syncAndSave);
  observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });

  // Safety: initial sync in case markup already had the class set
  syncAndSave();
});
