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
    console.log("Admin dashboard loaded");
    
    // Protect this page - only allow ADMIN role
    try {
        const role = await initializeRoleProtection([ROLES.ADMIN]);
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
    
    // Load dashboard data
    async function loadDashboardData() {
        loadStats();
        loadRecentBookings();
        loadSystemNotices();
        loadUsers();
        loadBookings();
        
        // Setup refresh buttons
        const refreshBookingsBtn = document.getElementById('refreshBookings');
        if (refreshBookingsBtn) {
            refreshBookingsBtn.addEventListener('click', loadRecentBookings);
        }
        
        // Setup user management
        setupUserManagement();
    }
    
    // Load stats
    async function loadStats() {
        try {
            // Get total users count
            const totalUsersRef = collection(db, "userRoles");
            const totalUsersSnapshot = await getDocs(totalUsersRef);
            const totalUsers = totalUsersSnapshot.size;
            
            // Get teachers count
            const teachersRef = query(collection(db, "userRoles"), where("role", "==", ROLES.TEACHER));
            const teachersSnapshot = await getDocs(teachersRef);
            const totalTeachers = teachersSnapshot.size;
            
            // Get students count
            const studentsRef = query(collection(db, "userRoles"), where("role", "==", ROLES.STUDENT));
            const studentsSnapshot = await getDocs(studentsRef);
            const totalStudents = studentsSnapshot.size;
            
            // Get today's bookings count
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const bookingsRef = query(
                collection(db, "bookings"), 
                where("dateTime", ">=", today),
                where("dateTime", "<", tomorrow)
            );
            const bookingsSnapshot = await getDocs(bookingsRef);
            const todayBookings = bookingsSnapshot.size;
            
            // Update stats on the page
            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('total-teachers').textContent = totalTeachers;
            document.getElementById('total-students').textContent = totalStudents;
            document.getElementById('today-bookings').textContent = todayBookings;
            
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }
    
    // Load recent bookings
    async function loadRecentBookings() {
        try {
            const recentBookingsTable = document.getElementById('recentBookingsTable');
            const tableBody = recentBookingsTable.querySelector('tbody');
            
            // Clear the table
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading bookings...</td></tr>';
            
            // Get recent bookings
            const bookingsRef = query(
                collection(db, "bookings"), 
                orderBy("createdAt", "desc"),
                limit(5)
            );
            const bookingsSnapshot = await getDocs(bookingsRef);
            
            if (bookingsSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No bookings found</td></tr>';
                return;
            }
            
            // Build table content
            let tableContent = '';
            
            for (const doc of bookingsSnapshot.docs) {
                const booking = doc.data();
                
                // Get student name
                const studentName = await getUserName(booking.studentId);
                
                // Get teacher name
                const teacherName = await getUserName(booking.teacherId);
                
                // Format date
                const dateTime = booking.dateTime instanceof Date 
                    ? booking.dateTime 
                    : booking.dateTime.toDate();
                const formattedDate = dateTime.toLocaleString();
                
                // Build row
                tableContent += `
                    <tr>
                        <td>${doc.id.substring(0, 8)}...</td>
                        <td>${studentName}</td>
                        <td>${teacherName}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <span class="badge badge-${getStatusColor(booking.status)}">
                                ${booking.status}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn view" data-id="${doc.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" data-id="${doc.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableContent;
            
            // Add event listeners to action buttons
            addBookingActionListeners();
            
        } catch (error) {
            console.error("Error loading recent bookings:", error);
            
            const recentBookingsTable = document.getElementById('recentBookingsTable');
            const tableBody = recentBookingsTable.querySelector('tbody');
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading bookings</td></tr>';
        }
    }
    
    // Helper function to get user name by ID
    async function getUserName(userId) {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.displayName || 'Unknown User';
            } else {
                return 'Unknown User';
            }
        } catch (error) {
            console.error("Error getting user name:", error);
            return 'Unknown User';
        }
    }
    
    // Helper function to get status color
    function getStatusColor(status) {
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
    
    // Add booking action listeners
    function addBookingActionListeners() {
        const viewButtons = document.querySelectorAll('.action-btn.view');
        const editButtons = document.querySelectorAll('.action-btn.edit');
        
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const bookingId = this.getAttribute('data-id');
                viewBookingDetails(bookingId);
            });
        });
        
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const bookingId = this.getAttribute('data-id');
                editBooking(bookingId);
            });
        });
    }
    
    // View booking details
    function viewBookingDetails(bookingId) {
        console.log("View booking details:", bookingId);
        // Implement booking details modal
    }
    
    // Edit booking
    function editBooking(bookingId) {
        console.log("Edit booking:", bookingId);
        // Implement booking edit modal
    }
    
    // Load system notices
    function loadSystemNotices() {
        const systemNoticesElement = document.getElementById('system-notices');
        
        if (systemNoticesElement) {
            // For now, just a placeholder
            systemNoticesElement.innerHTML = `
                <div class="notice">
                    <h4><i class="fas fa-info-circle"></i> System Update</h4>
                    <p>The system will undergo maintenance on Sunday, June 15, 2023, from 2:00 AM to 4:00 AM UTC.</p>
                </div>
            `;
        }
    }
    
    // Load users
    async function loadUsers() {
        try {
            const usersTable = document.getElementById('usersTable');
            const tableBody = usersTable.querySelector('tbody');
            
            // Clear the table
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading users...</td></tr>';
            
            // Get all users
            const usersRef = collection(db, "userRoles");
            const usersSnapshot = await getDocs(usersRef);
            
            if (usersSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
                return;
            }
            
            // Build table content
            let tableContent = '';
            
            for (const roleDoc of usersSnapshot.docs) {
                const userId = roleDoc.id;
                const roleData = roleDoc.data();
                
                // Get user details
                const userDoc = await getDoc(doc(db, "users", userId));
                let userData = { displayName: 'Unknown User', email: 'unknown@example.com' };
                
                if (userDoc.exists()) {
                    userData = userDoc.data();
                }
                
                // Build row
                tableContent += `
                    <tr>
                        <td>${userData.displayName || 'Unknown User'}</td>
                        <td>${userData.email || 'unknown@example.com'}</td>
                        <td>
                            <span class="badge badge-${getRoleBadgeColor(roleData.role)}">
                                ${roleData.role}
                            </span>
                        </td>
                        <td>
                            <span class="badge badge-${userData.disabled ? 'danger' : 'success'}">
                                ${userData.disabled ? 'Disabled' : 'Active'}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn edit" data-id="${userId}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" data-id="${userId}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableContent;
            
            // Add event listeners to action buttons
            addUserActionListeners();
            
        } catch (error) {
            console.error("Error loading users:", error);
            
            const usersTable = document.getElementById('usersTable');
            const tableBody = usersTable.querySelector('tbody');
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading users</td></tr>';
        }
    }
    
    // Helper function to get role badge color
    function getRoleBadgeColor(role) {
        switch (role) {
            case ROLES.ADMIN:
                return 'danger';
            case ROLES.TEACHER:
                return 'success';
            case ROLES.STUDENT:
                return 'primary';
            default:
                return 'secondary';
        }
    }
    
    // Add user action listeners
    function addUserActionListeners() {
        const editButtons = document.querySelectorAll('#usersTable .action-btn.edit');
        const deleteButtons = document.querySelectorAll('#usersTable .action-btn.delete');
        
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                editUser(userId);
            });
        });
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                deleteUser(userId);
            });
        });
    }
    
    // Edit user
    function editUser(userId) {
        console.log("Edit user:", userId);
        // Implement user edit modal
    }
    
    // Delete user
    function deleteUser(userId) {
        console.log("Delete user:", userId);
        // Implement user delete confirmation
    }
    
    // Setup user management
    function setupUserManagement() {
        const addUserBtn = document.getElementById('addUserBtn');
        
        if (addUserBtn) {
            addUserBtn.addEventListener('click', function() {
                console.log("Add user button clicked");
                // Implement add user modal
            });
        }
    }
    
    // Load bookings
    async function loadBookings() {
        try {
            const bookingsTable = document.getElementById('bookingsTable');
            const tableBody = bookingsTable.querySelector('tbody');
            
            // Clear the table
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading bookings...</td></tr>';
            
            // Get all bookings
            const bookingsRef = query(
                collection(db, "bookings"), 
                orderBy("dateTime", "desc")
            );
            const bookingsSnapshot = await getDocs(bookingsRef);
            
            if (bookingsSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No bookings found</td></tr>';
                return;
            }
            
            // Build table content
            let tableContent = '';
            
            for (const doc of bookingsSnapshot.docs) {
                const booking = doc.data();
                
                // Get student name
                const studentName = await getUserName(booking.studentId);
                
                // Get teacher name
                const teacherName = await getUserName(booking.teacherId);
                
                // Format date
                const dateTime = booking.dateTime instanceof Date 
                    ? booking.dateTime 
                    : booking.dateTime.toDate();
                const formattedDate = dateTime.toLocaleDateString();
                const formattedTime = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Build row
                tableContent += `
                    <tr>
                        <td>${doc.id.substring(0, 8)}...</td>
                        <td>${studentName}</td>
                        <td>${teacherName}</td>
                        <td>${formattedDate} ${formattedTime}</td>
                        <td>${booking.duration} min</td>
                        <td>
                            <span class="badge badge-${getStatusColor(booking.status)}">
                                ${booking.status}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn view" data-id="${doc.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" data-id="${doc.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" data-id="${doc.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableContent;
            
            // Add event listeners to action buttons
            addBookingActionListeners();
            
            // Add filter functionality
            setupBookingFilter();
            
        } catch (error) {
            console.error("Error loading bookings:", error);
            
            const bookingsTable = document.getElementById('bookingsTable');
            const tableBody = bookingsTable.querySelector('tbody');
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading bookings</td></tr>';
        }
    }
    
    // Setup booking filter
    function setupBookingFilter() {
        const filterSelect = document.getElementById('bookingStatusFilter');
        
        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                const status = this.value;
                filterBookings(status);
            });
        }
    }
    
    // Filter bookings by status
    function filterBookings(status) {
        console.log("Filter bookings by status:", status);
        // Implement booking filtering
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