// Import Firebase auth functions
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    FacebookAuthProvider, 
    signInWithPopup,
  updateProfile,
  sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
  deleteUser,
  db,
  doc,
  getDoc,
  setDoc
} from './firebase-config.js';

// Import role management functions
import {
  ROLES,
  setUserRole,
  getUserRole,
  redirectBasedOnRole
} from './firebase-roles.js';

// Create predefined users function
async function createPredefinedUsers() {
  try {
    // Admin credentials
    const adminEmail = 'bunny@admin.com';
    const adminPassword = '123456789A';
    const adminName = 'Admin User';

    // Teacher credentials
    const teacherEmail = 'bunny@teachers.com';
    const teacherPassword = '123456789T';
    const teacherName = 'Teacher User';

    // Student credentials
    const studentEmail = 'bunny@student.com';
    const studentPassword = '123456789S';
    const studentName = 'Student User';

    // Helper function to check if user exists
    const checkIfUserExists = async (email) => {
      try {
        const userRef = doc(db, "userEmails", email);
        const userDoc = await getDoc(userRef);
        return userDoc.exists();
      } catch (error) {
        console.error("Error checking if user exists:", error);
        return false;
      }
    };

    // Helper function to create a user with a specific role
    const createUserWithRole = async (email, password, name, role) => {
      const userExists = await checkIfUserExists(email);
      
      if (!userExists) {
        try {
          // Create the user account
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const userId = userCredential.user.uid;
          
          // Add the user's email to userEmails collection for easier querying
          await setDoc(doc(db, "userEmails", email), {
            uid: userId,
            role: role
          });
          
          // Update profile with name
          await updateProfile(userCredential.user, { displayName: name });
          
          // Set user role
          await setUserRole(userId, role);
          
          console.log(`Created ${role} user: ${email}`);
          return true;
        } catch (error) {
          console.error(`Error creating ${role} user:`, error);
          return false;
        }
      } else {
        console.log(`${role} user already exists: ${email}`);
        return true;
      }
    };

    // Create the users with their respective roles
    await createUserWithRole(adminEmail, adminPassword, adminName, ROLES.ADMIN);
    await createUserWithRole(teacherEmail, teacherPassword, teacherName, ROLES.TEACHER);
    await createUserWithRole(studentEmail, studentPassword, studentName, ROLES.STUDENT);

    console.log("Predefined users setup completed");
    return true;
  } catch (error) {
    console.error("Error in createPredefinedUsers:", error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("Auth.js loaded");
    
    // Create predefined users
    createPredefinedUsers()
      .then(() => console.log("Predefined users checked/created"))
      .catch(error => console.error("Error setting up predefined users:", error));
    
    // Tab switching functionality for login/signup
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    
    // Ensure only login form is visible initially
    authForms.forEach(form => {
        if (form.id === 'loginForm') {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
    
    // Set up tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding form
            const tabId = this.getAttribute('data-tab');
            authForms.forEach(form => {
                if ((tabId === 'login' && form.id === 'loginForm') || 
                    (tabId === 'signup' && form.id === 'signupForm')) {
                    form.classList.add('active');
                } else {
                    form.classList.remove('active');
                }
            });
        });
    });
    
    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    if (darkModeToggle) {
        // Check for saved dark mode preference
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.documentElement.setAttribute('data-theme', 'dark');
            darkModeToggle.checked = true;
        }

        darkModeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('darkMode', 'enabled');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('darkMode', 'disabled');
            }
        });
    }

    // Check if we're on the auth page
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
        console.log("Auth container found");
        
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log("Login form found");
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                
                try {
                    // Attempt to sign in with email and password
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    
                    // Login successful
                    showAlert('Login successful! Redirecting...', 'success');
                    
                    // Check user role to determine redirect
                    try {
                        const userRole = await getUserRole(userCredential.user.uid);
                        
                        // Save user data to localStorage for persistence
                        localStorage.setItem('user', JSON.stringify({
                            uid: userCredential.user.uid,
                            email: userCredential.user.email,
                            displayName: userCredential.user.displayName || email.split('@')[0],
                            role: userRole
                        }));
                        
                        // Redirect based on role
                        setTimeout(() => {
                            switch(userRole) {
                                case ROLES.ADMIN:
                                    window.location.href = 'admin-dashboard.html';
                                    break;
                                case ROLES.TEACHER:
                                    window.location.href = 'teacher-dashboard.html';
                                    break;
                                case ROLES.STUDENT:
                                default:
                                    window.location.href = 'student-dashboard.html';
                                    break;
                            }
                        }, 1500);
                        
                    } catch (roleError) {
                        console.error("Error getting user role:", roleError);
                        
                        // Fallback to default user data without role
                        localStorage.setItem('user', JSON.stringify({
                            uid: userCredential.user.uid,
                            email: userCredential.user.email,
                            displayName: userCredential.user.displayName || email.split('@')[0]
                        }));
                        
                        // Redirect to student dashboard by default
                        setTimeout(() => {
                            window.location.href = 'student-dashboard.html';
                        }, 1500);
                    }
                    
                } catch (error) {
                    // Handle login errors
                    let errorMessage = 'Login failed. Please try again.';
                    
                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage = 'No account found with this email. Please sign up.';
                            break;
                        case 'auth/wrong-password':
                            errorMessage = 'Incorrect password. Please try again.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Invalid email format.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Too many unsuccessful login attempts. Please try again later.';
                            break;
                    }
                    
                    showAlert(errorMessage, 'error');
                    
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Log In';
                    
                    console.error('Login error:', error);
                }
            });
        } else {
            console.warn("Login form not found");
        }
        
        // Signup Form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            console.log("Signup form found");
            signupForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const name = document.getElementById('name').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const submitBtn = signupForm.querySelector('button[type="submit"]');
                
                // Validate form
                if (password !== confirmPassword) {
                    showAlert('Passwords do not match.', 'error');
                    return;
                }
                
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                
                try {
                    // Create user with email and password
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    
                    // Add user details to Firestore
                    await db.collection('users').doc(userCredential.user.uid).set({
                        name: name,
                        email: email,
                        role: 'student', // Default role
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    // Sign up successful
                    showAlert('Account created successfully! Redirecting...', 'success');
                    
                    // Save user data to localStorage for persistence
                    localStorage.setItem('user', JSON.stringify({
                        uid: userCredential.user.uid,
                        email: userCredential.user.email,
                        displayName: name || email.split('@')[0]
                    }));
                    
                    // Redirect to dashboard or home page
                    setTimeout(() => {
                        window.location.href = 'portal.html';
                    }, 1500);
                    
                } catch (error) {
                    // Handle signup errors
                    let errorMessage = 'Sign up failed. Please try again.';
                    
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'Email already in use. Please log in or use a different email.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Invalid email format.';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Password is too weak. Please use at least 6 characters.';
                            break;
                    }
                    
                    showAlert(errorMessage, 'error');
                    
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign Up';
                    
                    console.error('Sign up error:', error);
                }
            });
        } else {
            console.warn("Signup form not found");
        }
        
        // Forgot password link
        const forgotPasswordLink = document.querySelector('.forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Show forgot password form
                // This could be a modal or a new page
                showForgotPasswordForm();
            });
        }
        
        // Social login buttons
        setupSocialLogin();
    } else {
        console.warn("Auth container not found");
    }
    
    function setupSocialLogin() {
        // Google Login
        const googleLogin = document.getElementById('googleLogin');
        const googleSignup = document.getElementById('googleSignup');
        
        function signInWithGoogle() {
            console.log("Attempting Google sign-in");
            const provider = new GoogleAuthProvider();
            
            signInWithPopup(auth, provider)
                .then(async (result) => {
                    // User signed in
                    console.log("Google sign-in successful:", result.user.email);
                    showAlert('Login successful! Redirecting...', 'success');
                    
                    try {
                        // Check if user exists in our database and get role
                        const userRole = await getUserRole(result.user.uid);
                        
                        // Save user data to localStorage with role
                        localStorage.setItem('user', JSON.stringify({
                            uid: result.user.uid,
                            email: result.user.email,
                            displayName: result.user.displayName || result.user.email.split('@')[0],
                            role: userRole
                        }));
                        
                        // Redirect based on role
                        setTimeout(() => {
                            switch(userRole) {
                                case ROLES.ADMIN:
                                    window.location.href = 'admin-dashboard.html';
                                    break;
                                case ROLES.TEACHER:
                                    window.location.href = 'teacher-dashboard.html';
                                    break;
                                case ROLES.STUDENT:
                                default:
                                    window.location.href = 'student-dashboard.html';
                                    break;
                            }
                        }, 1500);
                        
                    } catch (roleError) {
                        console.error("Error getting user role or user not in our system:", roleError);
                        
                        // Set user as STUDENT role by default for new Google sign-ins
                        try {
                            await setUserRole(result.user.uid, ROLES.STUDENT);
                            
                            // Save user data to localStorage with default role
                            localStorage.setItem('user', JSON.stringify({
                                uid: result.user.uid,
                                email: result.user.email,
                                displayName: result.user.displayName || result.user.email.split('@')[0],
                                role: ROLES.STUDENT
                            }));
                        } catch (setRoleError) {
                            console.error("Error setting default role:", setRoleError);
                            
                            // Fallback without role
                            localStorage.setItem('user', JSON.stringify({
                                uid: result.user.uid,
                                email: result.user.email,
                                displayName: result.user.displayName || result.user.email.split('@')[0]
                            }));
                        }
                        
                        // Redirect to student dashboard by default
                        setTimeout(() => {
                            window.location.href = 'student-dashboard.html';
                        }, 1500);
                    }
                })
                .catch((error) => {
                    console.error("Google sign-in error:", error);
                    showAlert('Google login failed. Please try again.', 'error');
                });
        }
        
        if (googleLogin) {
            googleLogin.addEventListener('click', function(e) {
                e.preventDefault();
                signInWithGoogle();
            });
        }
        
        if (googleSignup) {
            googleSignup.addEventListener('click', function(e) {
                e.preventDefault();
                signInWithGoogle();
            });
        }
        
        // Facebook Login
        const facebookLogin = document.getElementById('facebookLogin');
        const facebookSignup = document.getElementById('facebookSignup');
        
        function signInWithFacebook() {
            console.log("Attempting Facebook sign-in");
            const provider = new FacebookAuthProvider();
            
            signInWithPopup(auth, provider)
                .then((result) => {
                    // User signed in
                    console.log("Facebook sign-in successful:", result.user.email);
                    showAlert('Login successful! Redirecting...', 'success');
                    
                    // Save user data to localStorage for persistence
                    localStorage.setItem('user', JSON.stringify({
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName || result.user.email.split('@')[0]
                    }));
                    
                    // Redirect to dashboard or home page
                    setTimeout(() => {
                        window.location.href = 'portal.html';
                    }, 1500);
                })
                .catch((error) => {
                    console.error("Facebook sign-in error:", error);
                    showAlert('Facebook login failed. Please try again.', 'error');
                });
        }
        
        if (facebookLogin) {
            facebookLogin.addEventListener('click', function(e) {
                e.preventDefault();
                signInWithFacebook();
            });
        }
        
        if (facebookSignup) {
            facebookSignup.addEventListener('click', function(e) {
                e.preventDefault();
                signInWithFacebook();
            });
        }
    }
    
    // Function to show alerts
    function showAlert(message, type) {
        console.log(`Alert: ${message} (${type})`);
        
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.auth-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `auth-alert ${type}`;
        
        // Set alert content
        alert.innerHTML = `
            <div class="auth-alert-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add alert to body
        document.body.appendChild(alert);
        
        // Add alert styles if not already added
        if (!document.querySelector('#auth-alert-styles')) {
            const alertStyles = document.createElement('style');
            alertStyles.id = 'auth-alert-styles';
            alertStyles.textContent = `
                .auth-alert {
                    padding: 1rem;
                    border-radius: var(--border-radius);
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                }
                
                .auth-alert.success {
                    background-color: #d1e7dd;
                    color: #0f5132;
                }
                
                .auth-alert.error {
                    background-color: #f8d7da;
                    color: #842029;
                }
                
                .auth-alert-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
            `;
            document.head.appendChild(alertStyles);
        }
        
        // Automatically remove alert after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
    
    // Show forgot password form
    function showForgotPasswordForm() {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h3>Reset Password</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="auth-modal-body">
                    <p>Enter your email address and we'll send you a link to reset your password.</p>
                    <form id="forgotPasswordForm">
                        <div class="form-group">
                            <label for="resetEmail">Email</label>
                            <input type="email" id="resetEmail" name="email" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Send Reset Link</button>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.appendChild(modal);
        
        // Add modal styles if not already added
        if (!document.querySelector('#auth-modal-styles')) {
            const modalStyles = document.createElement('style');
            modalStyles.id = 'auth-modal-styles';
            modalStyles.textContent = `
                .auth-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .auth-modal-content {
                    background-color: var(--background-color);
                    border-radius: var(--border-radius);
                    width: 90%;
                    max-width: 400px;
                    box-shadow: var(--box-shadow);
                }
                
                .auth-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .auth-modal-header h3 {
                    margin-bottom: 0;
                }
                
                .close-modal {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-light);
                }
                
                .auth-modal-body {
                    padding: 1.5rem;
                }
            `;
            document.head.appendChild(modalStyles);
        }
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Reset password form submission
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            try {
                // Send password reset email
                await auth.sendPasswordResetEmail(email);
                
                // Reset email sent successfully
                modal.remove();
                showAlert('Password reset email sent. Please check your inbox.', 'success');
                
            } catch (error) {
                // Handle reset password errors
                let errorMessage = 'Failed to send reset email. Please try again.';
                
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Invalid email format.';
                }
                
                // Show error in the modal
                const errorElement = document.createElement('div');
                errorElement.className = 'auth-modal-error';
                errorElement.textContent = errorMessage;
                
                // Remove existing error messages
                const existingError = modal.querySelector('.auth-modal-error');
                if (existingError) {
                    existingError.remove();
                }
                
                // Add error to modal
                forgotPasswordForm.prepend(errorElement);
                
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Link';
                
                console.error('Reset password error:', error);
            }
        });
    }
    
    // Check if redirected from login button
    const urlParams = new URLSearchParams(window.location.search);
    const loginRedirect = urlParams.get('login');
    
    if (loginRedirect === 'true') {
        // Switch to login tab
        document.querySelector('[data-tab="login"]').click();
    }
}); 