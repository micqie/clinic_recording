document.getElementById('logoutBtn').addEventListener('click', function() {
    Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of your session.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, logout'
    }).then((result) => {
        if (result.isConfirmed) {
            // Show loading alert
            Swal.fire({
                title: 'Logging out...',
                text: 'Please wait a moment.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";

            axios.post(`${baseApiUrl}/logout.php`)
                .then(function(response) {
                    if (response.data.success) {
                        sessionStorage.clear();
                        window.location.href = '/clinic_recording/index.html';
                    } else {
                        Swal.fire('Error', response.data.message || 'Logout failed.', 'error');
                    }
                })
                .catch(function(error) {
                    console.error(error);
                    Swal.fire('Error', 'An error occurred while logging out.', 'error');
                });
        }
    });
});
