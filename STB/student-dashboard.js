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
    serverTimestamp
} from './firebase-config.js';

// Import role management functions
import {
    ROLES,
    getUserRole,
    initializeRoleProtection
} from './firebase-roles.js';

// Import Swiper library
import Swiper from 'swiper';

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Student dashboard loaded");
    
    // Protect this page - only allow STUDENT role
    try {
        const role = await initializeRoleProtection([ROLES.STUDENT]);
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
        
        // Setup testimonial slider
        setupTestimonialSlider();
        
        // Initialize testimonial slider
        initTestimonialSwiper();
    }
    
    // Dark Mode Toggle
    function setupDarkMode() {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        
        if (darkModeToggle) {
            // Check for saved dark mode preference
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            darkModeToggle.checked = savedTheme === 'dark';

            darkModeToggle.addEventListener('change', function() {
                const newTheme = this.checked ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
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
                // Update student name in the welcome message
                const studentNameElement = document.getElementById('studentName');
                if (studentNameElement) {
                    studentNameElement.textContent = user.displayName || 'Student';
                }
                
                // Load profile form data
                const profileForm = document.getElementById('profileForm');
                if (profileForm) {
                    const fullNameInput = document.getElementById('fullName');
                    const emailInput = document.getElementById('email');
                    const educationLevelSelect = document.getElementById('educationLevel');
                    const subjectsInput = document.getElementById('subjects');
                    
                    if (fullNameInput) fullNameInput.value = user.displayName || '';
                    if (emailInput) emailInput.value = user.email || '';
                    
                    // Try to get additional user data from Firestore
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        if (educationLevelSelect && userData.educationLevel) {
                            educationLevelSelect.value = userData.educationLevel;
                        }
                        
                        if (subjectsInput && userData.subjects) {
                            subjectsInput.value = userData.subjects;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error loading user info:", error);
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
                
                // Load recent teachers
                await loadRecentTeachers(user.uid);
                
                // Load teachers directory
                await loadTeachers();
                
                // Book new button handler
                const bookNewBtn = document.getElementById('bookNewBtn');
                if (bookNewBtn) {
                    bookNewBtn.addEventListener('click', function() {
                        // Navigate to teachers section
                        const teachersLink = document.querySelector('.nav-link[data-section="teachers"]');
                        if (teachersLink) {
                            teachersLink.click();
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }
    
    // Load stats
    async function loadStats(studentId) {
        try {
            // Get upcoming sessions count
            const now = new Date();
            const upcomingSessionsRef = query(
                collection(db, "bookings"),
                where("studentId", "==", studentId),
                where("dateTime", ">=", now),
                where("status", "in", ["confirmed", "pending"])
            );
            const upcomingSessionsSnapshot = await getDocs(upcomingSessionsRef);
            const upcomingSessionsCount = upcomingSessionsSnapshot.size;
            
            // Get teachers count
            const teachersRef = query(
                collection(db, "bookings"),
                where("studentId", "==", studentId)
            );
            const teachersSnapshot = await getDocs(teachersRef);
            
            // Use a Set to count unique teachers
            const uniqueTeachers = new Set();
            teachersSnapshot.forEach(doc => {
                uniqueTeachers.add(doc.data().teacherId);
            });
            const teachersCount = uniqueTeachers.size;
            
            // Get total hours
            let totalMinutes = 0;
            teachersSnapshot.forEach(doc => {
                const booking = doc.data();
                if (booking.status === 'completed' || booking.status === 'confirmed') {
                    totalMinutes += booking.duration || 0;
                }
            });
            
            const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place
            
            // Get courses joined - placeholder for now
            const coursesJoined = 0;
            
            // Update stats in the DOM
            document.getElementById('upcomingSessions').textContent = upcomingSessionsCount;
            document.getElementById('myTeachers').textContent = teachersCount;
            document.getElementById('totalHours').textContent = totalHours;
            document.getElementById('coursesJoined').textContent = coursesJoined;
            
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }
    
    // Load upcoming appointments
    async function loadUpcomingAppointments(studentId) {
        try {
            const now = new Date();
            const upcomingTable = document.getElementById('upcomingTable');
            if (!upcomingTable) return;
            
            const tableBody = upcomingTable.querySelector('tbody');
            
            // Clear the table
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading appointments...</td></tr>';
            
            // Get upcoming appointments
            const appointmentsRef = query(
                collection(db, "bookings"),
                where("studentId", "==", studentId),
                where("dateTime", ">=", now),
                where("status", "in", ["confirmed", "pending"]),
                orderBy("dateTime", "asc"),
                limit(5)
            );
            const appointmentsSnapshot = await getDocs(appointmentsRef);
            
            if (appointmentsSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No upcoming appointments found</td></tr>';
                return;
            }
            
            // Build table content
            let tableContent = '';
            
            for (const doc of appointmentsSnapshot.docs) {
                const appointment = doc.data();
                
                // Get teacher name
                const teacherDoc = await getDoc(doc(db, "users", appointment.teacherId));
                const teacherName = teacherDoc.exists() ? teacherDoc.data().displayName || 'Unknown Teacher' : 'Unknown Teacher';
                
                // Format date and time
                const dateTime = appointment.dateTime instanceof Date 
                    ? appointment.dateTime 
                    : appointment.dateTime.toDate();
                const formattedDate = dateTime.toLocaleDateString();
                const formattedTime = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Build row
                tableContent += `
                    <tr>
                        <td>${teacherName}</td>
                        <td>${appointment.subject || 'General'}</td>
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
                            <button class="action-btn cancel" data-id="${doc.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableContent;
            
        } catch (error) {
            console.error("Error loading upcoming appointments:", error);
            const upcomingTable = document.getElementById('upcomingTable');
            if (upcomingTable) {
                const tableBody = upcomingTable.querySelector('tbody');
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading appointments</td></tr>';
            }
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
    
    // Load recent teachers
    async function loadRecentTeachers(studentId) {
        try {
            const recentTeachersContainer = document.getElementById('recentTeachers');
            if (!recentTeachersContainer) return;
            
            // Clear the container
            recentTeachersContainer.innerHTML = '<div class="empty-state text-center">Loading recent teachers...</div>';
            
            // Get recent bookings
            const bookingsRef = query(
                collection(db, "bookings"),
                where("studentId", "==", studentId),
                orderBy("dateTime", "desc"),
                limit(3)
            );
            const bookingsSnapshot = await getDocs(bookingsRef);
            
            if (bookingsSnapshot.empty) {
                recentTeachersContainer.innerHTML = '<div class="empty-state text-center">No recent teachers found. Start by finding a teacher to book a session.</div>';
                return;
            }
            
            // Get unique teacher IDs
            const teacherIds = new Set();
            bookingsSnapshot.forEach(doc => {
                teacherIds.add(doc.data().teacherId);
            });
            
            if (teacherIds.size === 0) {
                recentTeachersContainer.innerHTML = '<div class="empty-state text-center">No recent teachers found. Start by finding a teacher to book a session.</div>';
                return;
            }
            
            // Build teacher cards
            let cardsContent = '';
            
            for (const teacherId of teacherIds) {
                const teacherDoc = await getDoc(doc(db, "users", teacherId));
                
                if (teacherDoc.exists()) {
                    const teacherData = teacherDoc.data();
                    
                    // Get teacher's first name initial for avatar
                    let initial = '?';
                    if (teacherData.displayName) {
                        initial = teacherData.displayName.charAt(0).toUpperCase();
                    }
                    
                    // Build card
                    cardsContent += `
                        <div class="teacher-card">
                            <div class="teacher-header">
                                <div class="teacher-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="teacher-info">
                                    <h4>${teacherData.displayName || 'Unknown Teacher'}</h4>
                                    <p>${teacherData.title || 'Teacher'}</p>
                                    <div class="teacher-rating">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star-half-alt"></i>
                                        <span>(4.5)</span>
                                    </div>
                                </div>
                            </div>
                            <div class="teacher-body">
                                <p>${teacherData.bio || 'No bio available.'}</p>
                                <p><strong>Expertise:</strong> ${teacherData.expertise || 'General'}</p>
                            </div>
                            <div class="teacher-footer">
                                <div class="badges">
                                    <span class="badge badge-primary">${teacherData.subject || 'General'}</span>
                                </div>
                                <button class="btn btn-primary" data-id="${teacherId}">Book Session</button>
                            </div>
                        </div>
                    `;
                }
            }
            
            recentTeachersContainer.innerHTML = cardsContent;
            
        } catch (error) {
            console.error("Error loading recent teachers:", error);
            const recentTeachersContainer = document.getElementById('recentTeachers');
            if (recentTeachersContainer) {
                recentTeachersContainer.innerHTML = '<div class="empty-state text-center">Error loading recent teachers.</div>';
            }
        }
    }
    
    // Load teachers directory
    async function loadTeachers() {
        try {
            const teachersGrid = document.getElementById('teachersGrid');
            if (!teachersGrid) return;
            
            // Clear the container
            teachersGrid.innerHTML = '<div class="empty-state text-center">Loading teachers...</div>';
            
            // Get teachers
            const teachersRef = query(
                collection(db, "userRoles"),
                where("role", "==", ROLES.TEACHER)
            );
            const teachersSnapshot = await getDocs(teachersRef);
            
            if (teachersSnapshot.empty) {
                teachersGrid.innerHTML = '<div class="empty-state text-center">No teachers found.</div>';
                return;
            }
            
            // Build teacher cards
            let cardsContent = '';
            
            for (const roleDoc of teachersSnapshot.docs) {
                const teacherId = roleDoc.id;
                
                // Get teacher details
                const teacherDoc = await getDoc(doc(db, "users", teacherId));
                
                if (teacherDoc.exists()) {
                    const teacherData = teacherDoc.data();
                    
                    // Get teacher's first name initial for avatar
                    let initial = '?';
                    if (teacherData.displayName) {
                        initial = teacherData.displayName.charAt(0).toUpperCase();
                    }
                    
                    // Build card
                    cardsContent += `
                        <div class="teacher-card">
                            <div class="teacher-header">
                                <div class="teacher-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="teacher-info">
                                    <h4>${teacherData.displayName || 'Unknown Teacher'}</h4>
                                    <p>${teacherData.title || 'Teacher'}</p>
                                    <div class="teacher-rating">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star-half-alt"></i>
                                        <span>(4.5)</span>
                                    </div>
                                </div>
                            </div>
                            <div class="teacher-body">
                                <p>${teacherData.bio || 'No bio available.'}</p>
                                <p><strong>Expertise:</strong> ${teacherData.expertise || 'General'}</p>
                            </div>
                            <div class="teacher-footer">
                                <div class="badges">
                                    <span class="badge badge-primary">${teacherData.subject || 'General'}</span>
                                </div>
                                <button class="btn btn-primary book-teacher" data-id="${teacherId}">Book Session</button>
                            </div>
                        </div>
                    `;
                }
            }
            
            teachersGrid.innerHTML = cardsContent;
            
            // Add event listeners to book buttons
            const bookButtons = document.querySelectorAll('.book-teacher');
            bookButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const teacherId = this.getAttribute('data-id');
                    bookTeacher(teacherId);
                });
            });
            
        } catch (error) {
            console.error("Error loading teachers:", error);
            const teachersGrid = document.getElementById('teachersGrid');
            if (teachersGrid) {
                teachersGrid.innerHTML = '<div class="empty-state text-center">Error loading teachers.</div>';
            }
        }
    }
    
    // Book teacher
    function bookTeacher(teacherId) {
        console.log("Book teacher:", teacherId);
        // Implement booking modal/flow
        alert('Booking functionality will be implemented soon!');
    }

    // Testimonial Slider
    function setupTestimonialSlider() {
        const track = document.querySelector('.testimonial-track');
        const slides = document.querySelectorAll('.testimonial-slide');
        const dots = document.querySelectorAll('.testimonial-dots .dot');
        const prevBtn = document.querySelector('.testimonial-nav.prev');
        const nextBtn = document.querySelector('.testimonial-nav.next');
        
        let currentSlide = 0;
        const slideCount = slides.length;
        const slideWidth = 100;

        function updateSlider() {
            track.style.transform = `translateX(-${currentSlide * slideWidth}%)`;
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slideCount;
            updateSlider();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + slideCount) % slideCount;
            updateSlider();
        }

        // Event Listeners
        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentSlide = index;
                updateSlider();
            });
        });

        // Auto slide every 5 seconds
        setInterval(nextSlide, 5000);
    }

    // Initialize Swiper for testimonials
    function initTestimonialSwiper() {
        const testimonialSwiper = new Swiper('.testimonial-swiper', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            effect: 'coverflow',
            coverflowEffect: {
                rotate: 0,
                stretch: 0,
                depth: 100,
                modifier: 2,
                slideShadows: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                640: {
                    slidesPerView: 1,
                },
                768: {
                    slidesPerView: 2,
                },
                1024: {
                    slidesPerView: 3,
                },
            },
            on: {
                init: function() {
                    // Animate progress bars when slide becomes active
                    const activeSlide = this.slides[this.activeIndex];
                    const progressBar = activeSlide.querySelector('.progress');
                    if (progressBar) {
                        progressBar.style.width = progressBar.getAttribute('data-width') || '0%';
                    }
                },
                slideChange: function() {
                    // Reset and animate progress bars on slide change
                    const activeSlide = this.slides[this.activeIndex];
                    const progressBar = activeSlide.querySelector('.progress');
                    if (progressBar) {
                        progressBar.style.width = '0%';
                        setTimeout(() => {
                            progressBar.style.width = progressBar.getAttribute('data-width') || '0%';
                        }, 50);
                    }
                }
            }
        });
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