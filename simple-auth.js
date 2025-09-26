// Simple Admin Login System for separate login page
class SimpleAdminAuth {
    constructor() {
        this.sessionKey = 'bkktwin_admin_session';
        this.init();
    }

    init() {
        // Check if on login page
        if (window.location.pathname.includes('login.html')) {
            this.setupLoginPage();
        }
        
        // Check if on admin pages (reports.html)
        if (window.location.pathname.includes('reports.html')) {
            this.checkAuthForAdminPage();
        }
    }

    setupLoginPage() {
        // Check if already logged in
        if (this.isLoggedIn()) {
            window.location.href = 'reports.html';
            return;
        }

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    checkAuthForAdminPage() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
        }
    }

    isLoggedIn() {
        const session = localStorage.getItem(this.sessionKey);
        if (!session) return false;
        
        try {
            const sessionData = JSON.parse(session);
            const now = new Date().getTime();
            
            // Check if session expired (2 hours)
            if (now > sessionData.expires) {
                localStorage.removeItem(this.sessionKey);
                return false;
            }
            
            return sessionData.username && sessionData.role === 'admin';
        } catch (error) {
            localStorage.removeItem(this.sessionKey);
            return false;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        this.setLoading(true);
        this.hideError();

        try {
            // Hash password
            const hashedPassword = await this.hashPassword(password);
            
            // Get admin data from Firestore
            const adminDoc = await db.collection('admin_users').doc(username).get();
            
            if (!adminDoc.exists) {
                this.showError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                return;
            }

            const adminData = adminDoc.data();
            
            // Check if admin is active
            if (!adminData.isActive) {
                this.showError('บัญชีผู้ใช้นี้ถูกปิดการใช้งาน');
                return;
            }

            // Verify password
            if (adminData.passwordHash !== hashedPassword) {
                this.showError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                return;
            }

            // Update last login
            await db.collection('admin_users').doc(username).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create session
            const sessionData = {
                username: username,
                role: adminData.role,
                timestamp: new Date().getTime(),
                expires: new Date().getTime() + (2 * 60 * 60 * 1000) // 2 hours
            };
            
            localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            
            this.showToast('เข้าสู่ระบบสำเร็จ!');
            
            // Redirect to reports page
            setTimeout(() => {
                window.location.href = 'reports.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            this.showError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        } finally {
            this.setLoading(false);
        }
    }

    // Hash password using SHA-256
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'bkktwin_salt_2024'); // Salt
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    logout() {
        localStorage.removeItem(this.sessionKey);
        window.location.href = 'login.html';
    }

    getCurrentUser() {
        const session = localStorage.getItem(this.sessionKey);
        if (session) {
            try {
                return JSON.parse(session);
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    // UI Helper functions
    setLoading(loading) {
        const button = document.getElementById('loginButton');
        const buttonText = document.getElementById('loginButtonText');
        
        if (button && buttonText) {
            button.disabled = loading;
            buttonText.textContent = loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastText = document.getElementById('toastText');
        
        if (toast && toastText) {
            toastText.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }
    }
}

// Initialize the auth system
document.addEventListener('DOMContentLoaded', () => {
    window.simpleAdminAuth = new SimpleAdminAuth();
});

// Export for global access
window.SimpleAdminAuth = SimpleAdminAuth;
