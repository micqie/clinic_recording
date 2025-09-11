/**
 * Auto-Logout System for MCSTUFFIN's Clinic
 * Handles automatic logout based on user inactivity
 */

// Prevent duplicate class declaration and initialization
if (typeof window.AutoLogoutManager === 'undefined') {
window.AutoLogoutManager = class AutoLogoutManager {
    constructor() {
        this.timeoutId = null;
        this.warningTimeoutId = null;
        this.warningShown = false;
        this.lastActivity = Date.now();
        this.userRole = this.getUserRole();
        this.timeoutMinutes = this.getTimeoutMinutes();
        this.warningMinutes = this.timeoutMinutes - 1;

        this.init();
    }

    getUserRole() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            return (user.role || '').toLowerCase();
        } catch (e) {
            return 'patient';
        }
    }

    getTimeoutMinutes() {
        switch (this.userRole) {
            case 'secretary':
            case 'admin':
            case 'doctor':
                return 10;
            case 'patient':
                return 15;
            default:
                return 10;
        }
    }

    init() {
        if (!this.userRole) {
            console.log('Auto-logout: No user role detected, system disabled');
            return;
        }

        console.log(`Auto-logout: Initialized for ${this.userRole} with ${this.timeoutMinutes} minute timeout`);

        this.setupActivityListeners();
        this.resetTimer();
        this.setupSessionValidation();
    }

    setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, () => this.resetTimer(), { passive: true });
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.resetTimer();
            }
        });
    }

    resetTimer() {
        this.lastActivity = Date.now();

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if (this.warningTimeoutId) {
            clearTimeout(this.warningTimeoutId);
        }

        this.warningShown = false;

        this.warningTimeoutId = setTimeout(() => {
            this.showWarning();
        }, (this.warningMinutes * 60 * 1000));

        this.timeoutId = setTimeout(() => {
            this.forceLogout();
        }, (this.timeoutMinutes * 60 * 1000));
    }

    showWarning() {
        if (this.warningShown) return;

        this.warningShown = true;

        const remainingSeconds = 60;
        let countdown = remainingSeconds;

        Swal.fire({
            title: 'Session Timeout Warning',
            html: `
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                    <p class="mb-3">You will be logged out in <strong id="countdown">${countdown}</strong> seconds due to inactivity.</p>
                    <p class="text-muted small">Click "Stay Logged In" to continue your session.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Stay Logged In',
            cancelButtonText: 'Logout Now',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            allowOutsideClick: false,
            allowEscapeKey: false,
            timer: remainingSeconds * 1000,
            timerProgressBar: true,
            didOpen: () => {
                const countdownElement = document.getElementById('countdown');
                const timer = setInterval(() => {
                    countdown--;
                    if (countdownElement) {
                        countdownElement.textContent = countdown;
                    }
                    if (countdown <= 0) {
                        clearInterval(timer);
                    }
                }, 1000);
            },
            willClose: () => {
                if (this.warningShown) {
                    this.forceLogout();
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.resetTimer();
                Swal.fire({
                    icon: 'success',
                    title: 'Session Extended',
                    text: 'Your session has been extended. Stay active to avoid automatic logout.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else if (result.dismiss === Swal.DismissReason.timer) {
                this.forceLogout();
            } else {
                this.forceLogout();
            }
        });
    }

    forceLogout() {
        console.log('Auto-logout: Forcing logout due to inactivity');

        if (this.timeoutId) clearTimeout(this.timeoutId);
        if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);

        Swal.fire({
            title: 'Session Expired',
            text: 'You have been logged out due to inactivity.',
            icon: 'info',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            this.performLogout();
        });
    }

    async performLogout() {
        try {
            const baseApiUrl = sessionStorage.getItem("baseAPIUrl") || "http://localhost/clinic_recording/api";
            await axios.post(`${baseApiUrl}/logout.php`);
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            sessionStorage.clear();
            window.location.href = '/clinic_recording/index.html';
        }
    }

    setupSessionValidation() {
        setInterval(() => {
            const user = sessionStorage.getItem('user');
            if (!user) {
                console.log('Auto-logout: No user session found, redirecting to login');
                window.location.href = '/clinic_recording/index.html';
            }
        }, 5 * 60 * 1000);
    }

    extendSession() {
        this.resetTimer();
        console.log('Auto-logout: Session manually extended');
    }

    destroy() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.removeEventListener(event, () => this.resetTimer());
        });

        console.log('Auto-logout: Manager destroyed');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure all other scripts are loaded
    setTimeout(() => {
        if (sessionStorage.getItem('user') && !window.autoLogoutManager) {
            try {
                window.autoLogoutManager = new window.AutoLogoutManager();
                console.log('AutoLogoutManager initialized successfully');
            } catch (error) {
                console.error('Error initializing AutoLogoutManager:', error);
            }
        }
    }, 100);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AutoLogoutManager;
}
}
