// Import Firebase functions
import { 
    auth, 
    db,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from './firebase-config.js';

// Import role management functions
import {
    ROLES,
    getUserRole,
    initializeRoleProtection
} from './firebase-roles.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Teacher dashboard loaded");
    
    // Protect this page - only allow TEACHER role
    try {
        const role = await initializeRoleProtection([ROLES.TEACHER]);
        console.log("User role confirmed:", role);
        
        // Continue loading the dashboard if the role check passes
        initializeDashboard();
    } catch (error) {
        console.error("Access denied:", error);
        // Redirection will be handled by the initializeRoleProtection function
    }
    
    function initializeDashboard() {
        // Setup dark mode toggle
        setupDarkMode();
        
        // Setup sidebar toggle
        setupSidebar();
        
        // Setup navigation
        setupNavigation();
        
        // Setup logout button
        setupLogout();
        
        // Load user info
        loadUserInfo();
        
        // Load dashboard data
        loadDashboardData();
    }
    
    // Dark Mode Toggle
    function setupDarkMode() {
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
    }
    
    // Sidebar Toggle
    function setupSidebar() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        if (sidebarToggle && sidebar && mainContent) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
            
            // Check for smaller screens and collapse sidebar by default
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            }
        }
    }
    
    // Navigation
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const dashboardSections = document.querySelectorAll('.dashboard-section');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get the target section ID
                const sectionId = this.getAttribute('data-section');
                const targetSection = document.getElementById(sectionId + '-section');
                
                // Remove active class from all links and sections
                navLinks.forEach(link => link.classList.remove('active'));
                dashboardSections.forEach(section => section.classList.remove('active'));
                
                // Add active class to current link and section
                this.classList.add('active');
                if (targetSection) {
                    targetSection.classList.add('active');
                }
                
                // If on mobile, collapse the sidebar after navigation
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.add('collapsed');
                    }
                }
            });
        });
    }
    
    // Logout function
    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                try {
                    await signOut(auth);
                    console.log("User signed out");
                    window.location.href = 'auth.html';
                } catch (error) {
                    console.error("Error signing out:", error);
                    showAlert('Error signing out. Please try again.', 'error');
                }
            });
        }
    }
    
    // Load user info
    async function loadUserInfo() {
        try {
            const user = auth.currentUser;
            
            if (user) {
                // Update teacher name in the welcome message
                const teacherNameElement = document.getElementById('teacherName');
                if (teacherNameElement) {
                    teacherNameElement.textContent = user.displayName || 'Teacher';
                }
                
                // Load profile form data
                const profileForm = document.getElementById('profileForm');
                if (profileForm) {
                    const fullNameInput = document.getElementById('fullName');
                    const emailInput = document.getElementById('email');
                    const bioInput = document.getElementById('bio');
                    const expertiseInput = document.getElementById('expertise');
                    const educationInput = document.getElementById('education');
                    
                    if (fullNameInput) fullNameInput.value = user.displayName || '';
                    if (emailInput) emailInput.value = user.email || '';
                    
                    // Try to get additional user data from Firestore
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        if (bioInput && userData.bio) bioInput.value = userData.bio;
                        if (expertiseInput && userData.expertise) expertiseInput.value = userData.expertise;
                        if (educationInput && userData.education) educationInput.value = userData.education;
                    }
                    
                    // Handle profile form submission
                    profileForm.addEventListener('submit', handleProfileSubmit);
                }
            }
        } catch (error) {
            console.error("Error loading user info:", error);
        }
    }
    
    // Handle profile form submission
    async function handleProfileSubmit(e) {
        e.preventDefault();
        
        try {
            const user = auth.currentUser;
            
            if (!user) {
                showAlert('You must be logged in to update your profile.', 'error');
                return;
            }
            
            const fullName = document.getElementById('fullName').value;
            const bio = document.getElementById('bio').value;
            const expertise = document.getElementById('expertise').value;
            const education = document.getElementById('education').value;
            
            // Update user profile
            await updateDoc(doc(db, "users", user.uid), {
                displayName: fullName,
                bio: bio,
                expertise: expertise,
                education: education,
                updatedAt: serverTimestamp()
            });
            
            showAlert('Profile updated successfully!', 'info');
        } catch (error) {
            console.error("Error updating profile:", error);
            showAlert('Error updating profile. Please try again.', 'error');
        }
    }
    
    // Load dashboard data
    async function loadDashboardData() {
        try {
            const user = auth.currentUser;
            
            if (user) {
                // Load stats
                await loadStats(user.uid);
                
                // Load upcoming appointments
                await loadUpcomingAppointments(user.uid);
                
                // Load calendar
                loadCalendar();
                
                // Load students
                await loadStudents(user.uid);
                
                // Load availability
                await loadAvailability(user.uid);
                
                // Add refresh button handler
                const refreshBtn = document.getElementById('refreshAppointments');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => loadUpcomingAppointments(user.uid));
                }
                
                // Setup availability form submission
                const availabilityForm = document.getElementById('availabilityForm');
                if (availabilityForm) {
                    availabilityForm.addEventListener('submit', handleAvailabilitySubmit);
                }
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }
    
    // Load stats
    async function loadStats(teacherId) {
        try {
            // Get today's bookings
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const todayBookingsRef = query(
                collection(db, "bookings"),
                where("teacherId", "==", teacherId),
                where("dateTime", ">=", today),
                where("dateTime", "<", tomorrow)
            );
            const todayBookingsSnapshot = await getDocs(todayBookingsRef);
            const todayBookingsCount = todayBookingsSnapshot.size;
            
            // Get total students
            const studentsRef = query(
                collection(db, "bookings"),
                where("teacherId", "==", teacherId)
            );
            const studentsSnapshot = await getDocs(studentsRef);
            
            // Use a Set to count unique students
            const uniqueStudents = new Set();
            studentsSnapshot.forEach(doc => {
                uniqueStudents.add(doc.data().studentId);
            });
            const totalStudents = uniqueStudents.size;
            
            // Get average rating
            // Placeholder for now
            const avgRating = 4.8;
            
            // Get hours this month
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const monthBookingsRef = query(
                collection(db, "bookings"),
                where("teacherId", "==", teacherId),
                where("dateTime", ">=", firstDayOfMonth),
                where("dateTime", "<=", lastDayOfMonth),
                where("status", "in", ["completed", "confirmed"])
            );
            const monthBookingsSnapshot = await getDocs(monthBookingsRef);
            
            let totalMinutes = 0;
            monthBookingsSnapshot.forEach(doc => {
                const booking = doc.data();
                totalMinutes += booking.duration || 0;
            });
            
            const monthHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place
            
            // Update stats in the DOM
            document.getElementById('todayBookings').textContent = todayBookingsCount;
            document.getElementById('totalStudents').textContent = totalStudents;
            document.getElementById('avgRating').textContent = avgRating;
            document.getElementById('monthHours').textContent = monthHours;
            
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }
    
    // Load upcoming appointments
    async function loadUpcomingAppointments(teacherId) {
        try {
            const now = new Date();
            const upcomingAppointmentsTable = document.getElementById('upcomingAppointmentsTable');
            const tableBody = upcomingAppointmentsTable.querySelector('tbody');
            
            // Clear the table
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading appointments...</td></tr>';
            
            // Get upcoming appointments
            const appointmentsRef = query(
                collection(db, "bookings"),
                where("teacherId", "==", teacherId),
                where("dateTime", ">=", now),
                where("status", "in", ["confirmed", "pending"]),
                orderBy("dateTime", "asc"),
                limit(10)
            );
            const appointmentsSnapshot = await getDocs(appointmentsRef);
            
            if (appointmentsSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No upcoming appointments found</td></tr>';
                return;
            }
            
            // Build table content
            let tableContent = '';
            
            for (const doc of appointmentsSnapshot.docs) {
                const appointment = doc.data();
                
                // Get student name
                const studentDoc = await getDoc(document.doc(db, "users", appointment.studentId));
                const studentName = studentDoc.exists() ? studentDoc.data().displayName || 'Unknown Student' : 'Unknown Student';
                
                // Format date and time
                const dateTime = appointment.dateTime instanceof Date 
                    ? appointment.dateTime 
                    : appointment.dateTime.toDate();
                const formattedDate = dateTime.toLocaleDateString();
                const formattedTime = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Build row
                tableContent += `
                    <tr>
                        <td>${studentName}</td>
                        <td>${formattedDate}</td>
                        <td>${formattedTime}</td>
                        <td>${appointment.duration} min</td>
                        <td>
                            <span class="badge badge-${getStatusBadgeColor(appointment.status)}">
                                ${appointment.status}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn view" data-id="${doc.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" data-id="${doc.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableContent;
            
        } catch (error) {
            console.error("Error loading upcoming appointments:", error);
            const upcomingAppointmentsTable = document.getElementById('upcomingAppointmentsTable');
            const tableBody = upcomingAppointmentsTable.querySelector('tbody');
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading appointments</td></tr>';
        }
    }
    
    // Get status badge color
    function getStatusBadgeColor(status) {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'danger';
            case 'completed':
                return 'primary';
            default:
                return 'secondary';
        }
    }
    
    // Load calendar
    function loadCalendar() {
        // Placeholder for now - would be implemented with a calendar library
        console.log("Loading calendar...");
        
        // Set current week text
        const currentWeekElement = document.getElementById('currentWeek');
        if (currentWeekElement) {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
            
            const formattedStart = startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            const formattedEnd = endOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            
            currentWeekElement.textContent = `${formattedStart} - ${formattedEnd}`;
        }
    }
    
    // Load students
    async function loadStudents(teacherId) {
        try {
            const studentsTable = document.getElementById('studentsTable');
            if (!studentsTable) return;
            
            const tableBody = studentsTable.querySelector('tbody');
            
            // Clear the table
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading students...</td></tr>';
            
            // Get bookings with unique students
            const bookingsRef = query(
                collection(db, "bookings"),
                where("teacherId", "==", teacherId)
            );
            const bookingsSnapshot = await getDocs(bookingsRef);
            
            if (bookingsSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No students found</td></tr>';
                return;
            }
            
            // Build student map with last session and count
            const studentMap = new Map();
            
            bookingsSnapshot.forEach(doc => {
                const booking = doc.data();
                const studentId = booking.studentId;
                
                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, {
                        lastSession: booking.dateTime,
                        sessionCount: 1
                    });
                } else {
                    const student = studentMap.get(studentId);
                    student.sessionCount++;
                    
                    // Check if this booking is more recent
                    const bookingDate = booking.dateTime instanceof Date 
                        ? booking.dateTime 
                        : booking.dateTime.toDate();
                    const lastSessionDate = student.lastSession instanceof Date 
                        ? student.lastSession 
                        : student.lastSession.toDate();
                    
                    if (bookingDate > lastSessionDate) {
                        student.lastSession = booking.dateTime;
                    }
                }
            });
            
            // Get student details and build table rows
            let tableContent = '';
            
            for (const [studentId, data] of studentMap.entries()) {
                // Get student details
                const studentDoc = await getDoc(doc(db, "users", studentId));
                let studentName = 'Unknown Student';
                let studentEmail = 'unknown@example.com';
                
                if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    studentName = studentData.displayName || 'Unknown Student';
                    studentEmail = studentData.email || 'unknown@example.com';
                }
                
                // Format last session date
                const lastSession = data.lastSession instanceof Date 
                    ? data.lastSession 
                    : data.lastSession.toDate();
                const formattedLastSession = lastSession.toLocaleDateString();
                
                // Build row
                tableContent += `
                    <tr>
                        <td>${studentName}</td>
                        <td>${studentEmail}</td>
                        <td>${formattedLastSession}</td>
                        <td>${data.sessionCount}</td>
                        <td>
                            <button class="action-btn view" data-id="${studentId}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn message" data-id="${studentId}">
                                <i class="fas fa-envelope"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableContent;
            
        } catch (error) {
            console.error("Error loading students:", error);
            const studentsTable = document.getElementById('studentsTable');
            if (studentsTable) {
                const tableBody = studentsTable.querySelector('tbody');
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading students</td></tr>';
            }
        }
    }
    
    // Load availability
    async function loadAvailability(teacherId) {
        try {
            // Check if availability data exists
            const availabilityDoc = await getDoc(doc(db, "teacherAvailability", teacherId));
            
            if (availabilityDoc.exists()) {
                const availability = availabilityDoc.data();
                
                // Update the form with existing availability
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                
                days.forEach(day => {
                    const startSelect = document.querySelector(`select[name="${day}_start"]`);
                    const endSelect = document.querySelector(`select[name="${day}_end"]`);
                    
                    if (startSelect && availability[day] && availability[day].start) {
                        startSelect.value = availability[day].start;
                    }
                    
                    if (endSelect && availability[day] && availability[day].end) {
                        endSelect.value = availability[day].end;
                    }
                });
            }
            
        } catch (error) {
            console.error("Error loading availability:", error);
        }
    }
    
    // Handle availability form submission
    async function handleAvailabilitySubmit(e) {
        e.preventDefault();
        
        try {
            const user = auth.currentUser;
            
            if (!user) {
                showAlert('You must be logged in to update your availability.', 'error');
                return;
            }
            
            // Build availability data
            const availability = {};
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            days.forEach(day => {
                const startSelect = document.querySelector(`select[name="${day}_start"]`);
                const endSelect = document.querySelector(`select[name="${day}_end"]`);
                
                if (startSelect && endSelect) {
                    const start = startSelect.value;
                    const end = endSelect.value;
                    
                    if (start && end) {
                        availability[day] = {
                            start: start,
                            end: end
                        };
                    }
                }
            });
            
            // Save to Firestore
            await setDoc(doc(db, "teacherAvailability", user.uid), {
                ...availability,
                updatedAt: serverTimestamp()
            });
            
            showAlert('Availability saved successfully!', 'info');
            
        } catch (error) {
            console.error("Error saving availability:", error);
            showAlert('Error saving availability. Please try again.', 'error');
        }
    }
});

// Show alert function
function showAlert(message, type = 'info') {
    console.log(`Alert: ${message} (${type})`);
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // Set alert content
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas ${type === 'info' ? 'fa-info-circle' : 'fa-exclamation-triangle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-alert">&times;</button>
    `;
    
    // Add alert to body
    document.body.appendChild(alert);
    
    // Add alert styles if not already added
    if (!document.querySelector('#alert-styles')) {
        const alertStyles = document.createElement('style');
        alertStyles.id = 'alert-styles';
        alertStyles.textContent = `
            .alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem;
                border-radius: var(--border-radius);
                background-color: var(--background-color);
                box-shadow: var(--box-shadow);
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 300px;
                z-index: 1000;
                transform: translateX(350px);
                transition: transform 0.3s ease;
            }
            
            .alert.show {
                transform: translateX(0);
            }
            
            .alert-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .alert-info {
                border-left: 4px solid var(--primary-color);
            }
            
            .alert-warning, .alert-error {
                border-left: 4px solid var(--warning-color);
            }
            
            .alert-info i {
                color: var(--primary-color);
            }
            
            .alert-warning i, .alert-error i {
                color: var(--warning-color);
            }
            
            .close-alert {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: var(--text-light);
                transition: var(--transition);
            }
            
            .close-alert:hover {
                color: var(--error-color);
            }
        `;
        document.head.appendChild(alertStyles);
    }
    
    // Show alert with animation
    setTimeout(() => {
        alert.classList.add('show');
    }, 10);
    
    // Close button functionality
    const closeBtn = alert.querySelector('.close-alert');
    closeBtn.addEventListener('click', () => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(alert)) {
            alert.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(alert)) {
                    alert.remove();
                }
            }, 300);
        }
    }, 5000);
} 