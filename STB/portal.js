// Import Firebase auth functions
import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Import Firestore service functions
import { 
    getTeachers, 
    getTeacherById, 
    getUserAppointments, 
    createAppointment, 
    updateAppointment, 
    cancelAppointment,
    listenToUserAppointments,
    generateAvailabilityHTML
} from './firestore-service.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log("Portal.js loaded - DOM fully loaded and parsed");
    
    // Store teachers data
    let teachers = [];
    
    // Show loading indicators
    const teachersLoading = document.getElementById('teachersLoading');
    const upcomingLoading = document.getElementById('upcomingLoading');
    const historyLoading = document.getElementById('historyLoading');
    
    if (teachersLoading) teachersLoading.style.display = 'flex';
    if (upcomingLoading) upcomingLoading.style.display = 'flex';
    if (historyLoading) historyLoading.style.display = 'flex';
    
    // Check if user is logged in
    onAuthStateChanged(auth, function(user) {
        if (user) {
            // User is signed in
            console.log("User is signed in:", user.email);
            updateUIForLoggedInUser(user);
            initializePortal();
            
            // Load data from Firestore
            loadTeachers();
            
            // Set up real-time listener for appointments
            try {
                const unsubscribe = listenToUserAppointments(user.uid, (appointments) => {
                    console.log("Appointments updated:", appointments);
                    updateAppointmentsUI(appointments);
                    
                    // Hide loading indicator
                    if (upcomingLoading) upcomingLoading.style.display = 'none';
                    if (historyLoading) historyLoading.style.display = 'none';
                });
                
                // Store unsubscribe function for cleanup
                window.addEventListener('beforeunload', () => {
                    unsubscribe();
                });
            } catch (error) {
                console.error("Error setting up appointments listener:", error);
                showAlert('Error loading appointments: ' + error.message, 'warning');
                
                // Hide loading indicator
                if (upcomingLoading) upcomingLoading.style.display = 'none';
                if (historyLoading) historyLoading.style.display = 'none';
                
                // Show empty state
                const upcomingContainer = document.getElementById('upcoming-appointments');
                if (upcomingContainer) {
                    upcomingContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading appointments. Please try again later.</p>
                        </div>
                    `;
                }
                
                const historyContainer = document.getElementById('appointment-history');
                if (historyContainer) {
                    historyContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading appointment history. Please try again later.</p>
                        </div>
                    `;
                }
            }
        } else {
            // No user is signed in, redirect to login
            console.log("No user is signed in, redirecting to login");
            window.location.href = 'auth.html';
        }
    });
    
    // Load teachers from Firestore
    async function loadTeachers() {
        try {
            console.log("Loading teachers from Firestore...");
            teachers = await getTeachers();
            console.log("Teachers loaded:", teachers);
            updateTeachersUI();
            
            // Hide loading indicator
            if (teachersLoading) teachersLoading.style.display = 'none';
        } catch (error) {
            console.error("Error loading teachers:", error);
            showAlert('Error loading teachers: ' + error.message, 'warning');
            
            // Hide loading indicator
            if (teachersLoading) teachersLoading.style.display = 'none';
            
            // Show empty state
            const teachersContainer = document.getElementById('teachersContainer');
            if (teachersContainer) {
                teachersContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading teachers. Please try again later.</p>
                        <button id="retryLoadTeachers" class="btn btn-primary">Retry</button>
                    </div>
                `;
                
                // Add retry button functionality
                const retryBtn = teachersContainer.querySelector('#retryLoadTeachers');
                if (retryBtn) {
                    retryBtn.addEventListener('click', function() {
                        // Show loading indicator
                        if (teachersLoading) teachersLoading.style.display = 'flex';
                        teachersContainer.innerHTML = '';
                        
                        // Try loading teachers again
                        loadTeachers();
                    });
                }
            }
        }
    }
    
    // Update UI with teachers
    function updateTeachersUI() {
        const teachersContainer = document.getElementById('teachersContainer');
        if (!teachersContainer) return;
        
        // Clear existing teachers
        teachersContainer.innerHTML = '';
        
        if (teachers.length === 0) {
            teachersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No teachers available at the moment.</p>
                </div>
            `;
            return;
        }
        
        // Add each teacher to the UI
        teachers.forEach(teacher => {
            const teacherCard = document.createElement('div');
            teacherCard.className = 'teacher-card';
            teacherCard.innerHTML = `
                <div class="teacher-header">
                    <img src="${teacher.avatar}" alt="${teacher.name}" class="teacher-avatar">
                    <div class="teacher-info">
                        <h3>${teacher.name}</h3>
                        <p>${teacher.subject}</p>
                        <div class="teacher-rating">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star-half-alt"></i>
                            <span>(${teacher.reviews || 0} reviews)</span>
                        </div>
                    </div>
                </div>
                <div class="teacher-body">
                    <p>${teacher.bio || 'No bio available.'}</p>
                    <h4>Availability</h4>
                    <ul class="availability-list">
                        ${generateAvailabilityHTML(teacher.availability)}
                    </ul>
                    <button class="btn btn-primary book-teacher" data-teacher-id="${teacher.id}">Book Appointment</button>
                </div>
            `;
            
            teachersContainer.appendChild(teacherCard);
            
            // Add event listener to book button
            const bookBtn = teacherCard.querySelector('.book-teacher');
            if (bookBtn) {
                bookBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log("Book button clicked for teacher:", teacher.id);
                    openBookingModal(teacher.id);
                });
            }
        });
    }
    
    // Update appointments UI
    function updateAppointmentsUI(appointments) {
        if (!appointments) {
            console.error("No appointments data provided to updateAppointmentsUI");
            return;
        }
        
        // Separate upcoming and past appointments
        const now = new Date();
        const upcomingAppointments = appointments.filter(a => 
            a.date > now || 
            (a.date.toDateString() === now.toDateString() && 
             a.status && a.status.toLowerCase() !== 'cancelled' && 
             a.status.toLowerCase() !== 'completed')
        );
        
        const pastAppointments = appointments.filter(a => 
            a.date < now || 
            (a.date.toDateString() === now.toDateString() && 
             a.status && (a.status.toLowerCase() === 'cancelled' || 
              a.status.toLowerCase() === 'completed'))
        );
        
        console.log("Upcoming appointments:", upcomingAppointments);
        console.log("Past appointments:", pastAppointments);
        
        // Update upcoming appointments
        const upcomingContainer = document.getElementById('upcoming-appointments');
        if (upcomingContainer) {
            upcomingContainer.innerHTML = '';
            
            if (upcomingAppointments.length === 0) {
                upcomingContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-alt"></i>
                        <p>You don't have any upcoming appointments.</p>
                        <button id="emptyStateBookingBtn" class="btn btn-primary">Book New Appointment</button>
                    </div>
                `;
                
                // Add event listener to new booking button - DIRECT CLASS MANIPULATION
                const emptyStateBookingBtn = document.getElementById('emptyStateBookingBtn');
                if (emptyStateBookingBtn) {
                    emptyStateBookingBtn.addEventListener('click', function() {
                        console.log("Empty state booking button clicked");
                        
                        // Get all tabs and contents
                        const portalTabs = document.querySelectorAll('.portal-tab');
                        const portalContents = document.querySelectorAll('.portal-content');
                        
                        // Remove active class from all tabs and contents
                        portalTabs.forEach(t => t.classList.remove('active'));
                        portalContents.forEach(c => c.classList.remove('active'));
                        
                        // Find the book tab and content
                        const bookTab = document.querySelector('[data-tab="book"]');
                        const bookContent = document.getElementById('book-content');
                        
                        // Activate them directly
                        if (bookTab) {
                            console.log("Activating book tab");
                            bookTab.classList.add('active');
                        } else {
                            console.error("Book tab not found");
                        }
                        
                        if (bookContent) {
                            console.log("Activating book content");
                            bookContent.classList.add('active');
                        } else {
                            console.error("Book content not found");
                        }
                    });
                }
            } else {
                // Add each upcoming appointment to the UI
                upcomingAppointments.forEach(appointment => {
                    addAppointmentToUI(appointment, upcomingContainer);
                });
            }
        }
        
        // Update past appointments
        const pastContainer = document.getElementById('appointment-history');
        if (pastContainer) {
            pastContainer.innerHTML = '';
            
            if (pastAppointments.length === 0) {
                pastContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>You don't have any past appointments.</p>
                    </div>
                `;
            } else {
                // Add each past appointment to the UI
                pastAppointments.forEach(appointment => {
                    addAppointmentToUI(appointment, pastContainer, true);
                });
            }
        }
    }
    
    // Add appointment to UI
    async function addAppointmentToUI(appointment, container, isPast = false) {
        try {
            if (!appointment || !appointment.teacherId) {
                console.error("Invalid appointment data:", appointment);
                return;
            }
            
            // Get teacher data
            const teacher = await getTeacherById(appointment.teacherId);
            if (!teacher) {
                console.error("Teacher not found:", appointment.teacherId);
                return;
            }
            
            const appointmentCard = document.createElement('div');
            appointmentCard.className = 'appointment-card';
            appointmentCard.dataset.appointmentId = appointment.id;
            
            // Format date and time
            const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
            const formattedDate = appointment.date.toLocaleDateString('en-US', dateOptions);
            
            appointmentCard.innerHTML = `
                <div class="appointment-header">
                    <div class="appointment-date">${formattedDate}, ${appointment.timeSlot}</div>
                    <div class="appointment-status status-${appointment.status ? appointment.status.toLowerCase() : 'pending'}">${appointment.status || 'Pending'}</div>
                </div>
                <div class="appointment-teacher">
                    <img src="${teacher.avatar}" alt="${teacher.name}" class="appointment-avatar">
                    <div>
                        <h3>${teacher.name}</h3>
                        <p>${teacher.subject}</p>
                    </div>
                </div>
                <div class="appointment-details">
                    <div class="appointment-detail">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="appointment-detail">
                        <i class="fas fa-clock"></i>
                        <span>${appointment.timeSlot}</span>
                    </div>
                    <div class="appointment-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${appointment.location || 'To be determined'}</span>
                    </div>
                    ${appointment.notes ? `
                    <div class="appointment-detail">
                        <i class="fas fa-comment-alt"></i>
                        <span>${appointment.notes}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="appointment-actions">
                    ${isPast ? `
                        <a href="#" class="btn btn-primary btn-sm book-again-btn">Book Again</a>
                    ` : `
                        ${!appointment.status || appointment.status.toLowerCase() !== 'cancelled' ? `
                            <a href="#" class="btn btn-outline btn-sm reschedule-btn">Reschedule</a>
                            <a href="#" class="btn btn-outline btn-sm cancel-btn">Cancel</a>
                        ` : `
                            <a href="#" class="btn btn-primary btn-sm book-again-btn">Book Again</a>
                        `}
                    `}
                </div>
            `;
            
            container.appendChild(appointmentCard);
            
            // Add event listeners to buttons
            if (!isPast && (!appointment.status || appointment.status.toLowerCase() !== 'cancelled')) {
                // Reschedule button
                const rescheduleBtn = appointmentCard.querySelector('.reschedule-btn');
                if (rescheduleBtn) {
                    rescheduleBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        showAlert('Reschedule functionality coming soon!', 'info');
                    });
                }
                
                // Cancel button
                const cancelBtn = appointmentCard.querySelector('.cancel-btn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', async function(e) {
                        e.preventDefault();
                        
                        if (confirm('Are you sure you want to cancel this appointment?')) {
                            try {
                                // Disable button and show loading
                                this.disabled = true;
                                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                                
                                // Cancel appointment in Firestore
                                await cancelAppointment(appointment.id);
                                
                                showAlert('Appointment cancelled successfully', 'info');
                            } catch (error) {
                                console.error("Error cancelling appointment:", error);
                                showAlert('Error cancelling appointment: ' + error.message, 'warning');
                                
                                // Reset button
                                this.disabled = false;
                                this.innerHTML = 'Cancel';
                            }
                        }
                    });
                }
            }
            
            // Book again button
            const bookAgainBtn = appointmentCard.querySelector('.book-again-btn');
            if (bookAgainBtn) {
                bookAgainBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openBookingModal(appointment.teacherId);
                });
            }
        } catch (error) {
            console.error("Error adding appointment to UI:", error);
        }
    }
    
    function updateUIForLoggedInUser(user) {
        // Update user greeting
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email.split('@')[0];
        }
        
        // Add logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                signOut(auth).then(() => {
                    showAlert('You have been logged out successfully', 'info');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }).catch((error) => {
                    showAlert('Error logging out: ' + error.message, 'warning');
                });
            });
        }
    }
    
    function initializePortal() {
        // Dark Mode Toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', function() {
                document.body.classList.toggle('dark-mode');
                
                // Save preference to localStorage
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('darkMode', 'enabled');
                } else {
                    localStorage.setItem('darkMode', 'disabled');
                }
            });
            
            // Check for saved dark mode preference
            if (localStorage.getItem('darkMode') === 'enabled') {
                document.body.classList.add('dark-mode');
                darkModeToggle.checked = true;
            }
        }
        
        // Mobile Menu Toggle
        const openMenu = document.getElementById('openMenu');
        const closeMenu = document.getElementById('closeMenu');
        const navLinks = document.getElementById('navLinks');
        
        if (openMenu && closeMenu && navLinks) {
            openMenu.addEventListener('click', function() {
                navLinks.classList.add('active');
            });
            
            closeMenu.addEventListener('click', function() {
                navLinks.classList.remove('active');
            });
            
            // Close menu when clicking on a link (for mobile)
            const mobileLinks = navLinks.querySelectorAll('a');
            mobileLinks.forEach(link => {
                link.addEventListener('click', function() {
                    navLinks.classList.remove('active');
                });
            });
        }
        
        // Tab switching
        const portalTabs = document.querySelectorAll('.portal-tab');
        const portalContents = document.querySelectorAll('.portal-content');
        
        portalTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                console.log("Tab clicked:", this.getAttribute('data-tab'));
                
                // Remove active class from all tabs and contents
                portalTabs.forEach(t => t.classList.remove('active'));
                portalContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding content
                const tabName = this.getAttribute('data-tab');
                const contentElement = document.getElementById(`${tabName}-content`);
                if (contentElement) {
                    contentElement.classList.add('active');
                    console.log(`Activated content: ${tabName}-content`);
                } else {
                    console.error(`Content element not found: ${tabName}-content`);
                }
            });
        });
        
        // New Booking button in the header - DIRECT CLASS MANIPULATION
        const headerNewBookingBtn = document.getElementById('newBookingBtn');
        if (headerNewBookingBtn) {
            console.log("Found header booking button");
            headerNewBookingBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Header booking button clicked");
                
                // Get all tabs and contents
                const portalTabs = document.querySelectorAll('.portal-tab');
                const portalContents = document.querySelectorAll('.portal-content');
                
                // Remove active class from all tabs and contents
                portalTabs.forEach(t => t.classList.remove('active'));
                portalContents.forEach(c => c.classList.remove('active'));
                
                // Find the book tab and content
                const bookTab = document.querySelector('[data-tab="book"]');
                const bookContent = document.getElementById('book-content');
                
                // Activate them directly
                if (bookTab) {
                    console.log("Activating book tab");
                    bookTab.classList.add('active');
                } else {
                    console.error("Book tab not found");
                }
                
                if (bookContent) {
                    console.log("Activating book content");
                    bookContent.classList.add('active');
                } else {
                    console.error("Book content not found");
                }
            });
        } else {
            console.error("Header booking button not found");
        }
        
        // Initialize booking modal
        initBookingModal();
        
        // Add search functionality for teachers
        const teacherSearch = document.getElementById('teacherSearch');
        if (teacherSearch) {
            teacherSearch.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const teacherCards = document.querySelectorAll('.teacher-card');
                
                teacherCards.forEach(card => {
                    const teacherName = card.querySelector('h3').textContent.toLowerCase();
                    const teacherSubject = card.querySelector('p').textContent.toLowerCase();
                    
                    if (teacherName.includes(searchTerm) || teacherSubject.includes(searchTerm)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
        
        // Subject filter functionality
        const subjectFilter = document.getElementById('subjectFilter');
        if (subjectFilter) {
            subjectFilter.addEventListener('change', function() {
                const selectedSubject = this.value.toLowerCase();
                const teacherCards = document.querySelectorAll('.teacher-card');
                
                teacherCards.forEach(card => {
                    const teacherSubject = card.querySelector('.teacher-info p').textContent.toLowerCase();
                    
                    if (selectedSubject === 'all' || teacherSubject === selectedSubject) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    }
    
    function openBookingModal(teacherId) {
        console.log("Opening booking modal for teacher:", teacherId);
        
        const modal = document.getElementById('bookingModal');
        if (!modal) {
            console.error("Booking modal not found");
            return;
        }
        
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) {
            console.error("Teacher not found:", teacherId);
            return;
        }
        
        console.log("Found teacher:", teacher);
        
        // Update modal with teacher info
        const modalTeacherAvatar = document.getElementById('modalTeacherAvatar');
        const modalTeacherName = document.getElementById('modalTeacherName');
        const modalTeacherSubject = document.getElementById('modalTeacherSubject');
        
        if (modalTeacherAvatar) modalTeacherAvatar.src = teacher.avatar;
        if (modalTeacherName) modalTeacherName.textContent = teacher.name;
        if (modalTeacherSubject) modalTeacherSubject.textContent = teacher.subject;
        
        // Store teacher ID in modal for reference
        modal.dataset.teacherId = teacherId;
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Generate calendar
        generateCalendar(new Date(), teacher);
    }
    
    function initBookingModal() {
        const modal = document.getElementById('bookingModal');
        if (!modal) {
            console.error("Booking modal not found");
            return;
        }
        
        // Close modal buttons
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        
        function closeModal() {
            console.log("Closing modal");
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeModal();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                closeModal();
            });
        }
        
        // Confirm booking button
        const confirmBtn = document.getElementById('confirmBooking');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async function() {
                // Get booking details
                const teacherId = modal.dataset.teacherId;
                const teacherName = document.getElementById('modalTeacherName').textContent;
                const selectedDate = document.getElementById('selectedDate').textContent;
                const selectedTimeSlot = document.querySelector('.time-slot.active')?.textContent;
                const notes = document.getElementById('appointmentNotes').value;
                
                if (!selectedTimeSlot) {
                    showAlert('Please select a time slot', 'warning');
                    return;
                }
                
                // Disable button and show loading
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
                
                try {
                    // Parse selected date
                    const dateParts = selectedDate.match(/(\w+), (\w+) (\d+), (\d+)/);
                    if (!dateParts) {
                        throw new Error("Invalid date format");
                    }
                    
                    const [_, dayOfWeek, month, day, year] = dateParts;
                    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
                    
                    const appointmentDate = new Date(parseInt(year), monthIndex, parseInt(day));
                    
                    // Create appointment in Firestore
                    await createAppointment({
                        userId: auth.currentUser.uid,
                        teacherId: teacherId,
                        date: appointmentDate,
                        timeSlot: selectedTimeSlot,
                        notes: notes,
                        status: "Pending"
                    });
                    
                    // Close modal
                    closeModal();
                    
                    // Show success message
                    showAlert('Appointment booked successfully!', 'info');
                    
                    // Reset form
                    document.getElementById('appointmentNotes').value = '';
                } catch (error) {
                    console.error("Error booking appointment:", error);
                    showAlert('Error booking appointment: ' + error.message, 'warning');
                    
                    // Reset button
                    this.disabled = false;
                    this.innerHTML = 'Confirm Booking';
                }
            });
        }
        
        // Previous month button
        const prevMonthBtn = document.getElementById('prevMonth');
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', function() {
                const teacherId = modal.dataset.teacherId;
                const teacher = teachers.find(t => t.id === teacherId);
                if (!teacher) return;
                
                const currentMonth = document.getElementById('currentMonth').textContent;
                const [monthName, year] = currentMonth.split(' ');
                
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const monthIndex = monthNames.indexOf(monthName);
                
                let newMonth = monthIndex - 1;
                let newYear = parseInt(year);
                
                if (newMonth < 0) {
                    newMonth = 11;
                    newYear--;
                }
                
                const newDate = new Date(newYear, newMonth, 1);
                generateCalendar(newDate, teacher);
            });
        }
        
        // Next month button
        const nextMonthBtn = document.getElementById('nextMonth');
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', function() {
                const teacherId = modal.dataset.teacherId;
                const teacher = teachers.find(t => t.id === teacherId);
                if (!teacher) return;
                
                const currentMonth = document.getElementById('currentMonth').textContent;
                const [monthName, year] = currentMonth.split(' ');
                
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const monthIndex = monthNames.indexOf(monthName);
                
                let newMonth = monthIndex + 1;
                let newYear = parseInt(year);
                
                if (newMonth > 11) {
                    newMonth = 0;
                    newYear++;
                }
                
                const newDate = new Date(newYear, newMonth, 1);
                generateCalendar(newDate, teacher);
            });
        }
    }
    
    function generateCalendar(date, teacher) {
        const calendarGrid = document.getElementById('calendarGrid');
        const currentMonthElement = document.getElementById('currentMonth');
        const selectedDateElement = document.getElementById('selectedDate');
        const timeSlotsContainer = document.getElementById('timeSlots');
        const confirmBookingBtn = document.getElementById('confirmBooking');
        
        if (!calendarGrid || !currentMonthElement) return;
        
        // Clear previous calendar
        calendarGrid.innerHTML = '';
        
        // Get current month and year
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();
        
        // Update month display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        // Add day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Get first day of month
        const firstDay = new Date(currentYear, currentMonth, 1);
        const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get last day of month
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const totalDays = lastDay.getDate();
        
        // Get today's date
        const today = new Date();
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= totalDays; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            // Check if day is in the past
            const currentDate = new Date(currentYear, currentMonth, day);
            if (currentDate < today && !(currentDate.getDate() === today.getDate() && 
                                         currentDate.getMonth() === today.getMonth() && 
                                         currentDate.getFullYear() === today.getFullYear())) {
                dayElement.classList.add('other-month');
                dayElement.style.cursor = 'not-allowed';
            } else {
                // Check if teacher is available on this day
                const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
                let isAvailable = false;
                
                if (dayOfWeek === 1 && teacher.availability.monday) isAvailable = true; // Monday
                if (dayOfWeek === 2 && teacher.availability.tuesday) isAvailable = true; // Tuesday
                if (dayOfWeek === 3 && teacher.availability.wednesday) isAvailable = true; // Wednesday
                if (dayOfWeek === 4 && teacher.availability.thursday) isAvailable = true; // Thursday
                if (dayOfWeek === 5 && teacher.availability.friday) isAvailable = true; // Friday
                if (dayOfWeek === 6 && teacher.availability.saturday) isAvailable = true; // Saturday
                if (dayOfWeek === 0 && teacher.availability.sunday) isAvailable = true; // Sunday
                
                if (isAvailable) {
                    dayElement.classList.add('has-events');
                    
                    // Add click event to select date
                    dayElement.addEventListener('click', function() {
                        // Remove active class from all days
                        document.querySelectorAll('.calendar-day').forEach(day => {
                            day.classList.remove('active');
                        });
                        
                        // Add active class to selected day
                        this.classList.add('active');
                        
                        // Update selected date
                        const selectedDate = new Date(currentYear, currentMonth, day);
                        selectedDateElement.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                        
                        // Generate time slots
                        generateTimeSlots(selectedDate, teacher);
                    });
                } else {
                    dayElement.classList.add('other-month');
                    dayElement.style.cursor = 'not-allowed';
                }
            }
            
            calendarGrid.appendChild(dayElement);
        }
        
        // Clear time slots
        if (timeSlotsContainer) {
            timeSlotsContainer.innerHTML = '';
        }
        
        // Disable confirm button
        if (confirmBookingBtn) {
            confirmBookingBtn.disabled = true;
        }
        
        // Reset selected date
        if (selectedDateElement) {
            selectedDateElement.textContent = 'Please select a date';
        }
    }
    
    function generateTimeSlots(date, teacher) {
        const timeSlotsContainer = document.getElementById('timeSlots');
        const confirmBookingBtn = document.getElementById('confirmBooking');
        
        if (!timeSlotsContainer) return;
        
        // Clear previous time slots
        timeSlotsContainer.innerHTML = '';
        
        // Get day of week
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get available time slots for this day
        let availableSlots = [];
        
        if (dayOfWeek === 1 && teacher.availability.monday) availableSlots = teacher.availability.monday;
        if (dayOfWeek === 2 && teacher.availability.tuesday) availableSlots = teacher.availability.tuesday;
        if (dayOfWeek === 3 && teacher.availability.wednesday) availableSlots = teacher.availability.wednesday;
        if (dayOfWeek === 4 && teacher.availability.thursday) availableSlots = teacher.availability.thursday;
        if (dayOfWeek === 5 && teacher.availability.friday) availableSlots = teacher.availability.friday;
        if (dayOfWeek === 6 && teacher.availability.saturday) availableSlots = teacher.availability.saturday;
        if (dayOfWeek === 0 && teacher.availability.sunday) availableSlots = teacher.availability.sunday;
        
        // Generate time slots
        if (availableSlots.length > 0) {
            availableSlots.forEach(slot => {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                
                // Convert to 12-hour format
                const hour = parseInt(slot.split(':')[0]);
                if (hour >= 12) {
                    timeSlot.textContent = `${hour === 12 ? 12 : hour - 12}:00 PM`;
                } else {
                    timeSlot.textContent = `${hour}:00 AM`;
                }
                
                // Add click event to select time slot
                timeSlot.addEventListener('click', function() {
                    // Remove active class from all time slots
                    document.querySelectorAll('.time-slot').forEach(slot => {
                        slot.classList.remove('active');
                    });
                    
                    // Add active class to selected time slot
                    this.classList.add('active');
                    
                    // Enable confirm button
                    if (confirmBookingBtn) {
                        confirmBookingBtn.disabled = false;
                    }
                });
                
                timeSlotsContainer.appendChild(timeSlot);
            });
        } else {
            // No available slots
            const noSlots = document.createElement('div');
            noSlots.className = 'no-slots-message';
            noSlots.innerHTML = '<i class="fas fa-exclamation-circle"></i> No available time slots for this day.';
            timeSlotsContainer.appendChild(noSlots);
        }
    }
    
    // Function to show alerts
    function showAlert(message, type) {
        console.log(`Alert: ${message} (${type})`);
        
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
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
                
                .alert-warning {
                    border-left: 4px solid var(--warning-color);
                }
                
                .alert-info i {
                    color: var(--primary-color);
                }
                
                .alert-warning i {
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

    // Add this function to handle the "Book New Appointment" button in the empty state
    function setupNewBookingButton() {
        const newBookingBtn = document.getElementById('newBookingBtn');
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Switch to book tab
                const portalTabs = document.querySelectorAll('.portal-tab');
                const portalContents = document.querySelectorAll('.portal-content');
                
                portalTabs.forEach(t => t.classList.remove('active'));
                portalContents.forEach(c => c.classList.remove('active'));
                
                const bookTab = document.querySelector('[data-tab="book"]');
                if (bookTab) bookTab.classList.add('active');
                
                const bookContent = document.getElementById('book-content');
                if (bookContent) bookContent.classList.add('active');
                
                // Scroll to book content
                bookContent.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    // Add this debug function at the end of your file
    function debugPortal() {
        console.log("Debug Portal");
        
        // Check if tabs are working
        const portalTabs = document.querySelectorAll('.portal-tab');
        console.log("Portal tabs:", portalTabs.length);
        
        // Check if content sections exist
        const upcomingContent = document.getElementById('upcoming-content');
        const bookContent = document.getElementById('book-content');
        const historyContent = document.getElementById('history-content');
        
        console.log("Upcoming content exists:", !!upcomingContent);
        console.log("Book content exists:", !!bookContent);
        console.log("History content exists:", !!historyContent);
        
        // Check if new booking button exists
        const newBookingBtn = document.getElementById('newBookingBtn');
        console.log("New booking button exists:", !!newBookingBtn);
        
        // Check if teachers container exists
        const teachersContainer = document.getElementById('teachersContainer');
        console.log("Teachers container exists:", !!teachersContainer);
        
        // Check if teachers are loaded
        console.log("Teachers loaded:", teachers.length);
        
        // Add a test button to force tab switching
        const debugBtn = document.createElement('button');
        debugBtn.textContent = "Switch to Book Tab";
        debugBtn.className = "btn btn-secondary";
        debugBtn.style.position = "fixed";
        debugBtn.style.bottom = "60px";
        debugBtn.style.right = "20px";
        debugBtn.style.zIndex = "1000";
        
        debugBtn.addEventListener('click', function() {
            portalTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.portal-content').forEach(c => c.classList.remove('active'));
            
            const bookTab = document.querySelector('[data-tab="book"]');
            if (bookTab) {
                bookTab.classList.add('active');
                console.log("Book tab activated");
            }
            
            if (bookContent) {
                bookContent.classList.add('active');
                console.log("Book content activated");
            }
        });
        
        document.body.appendChild(debugBtn);
    }

    // Add this function to debug booking issues
    function debugBooking() {
        console.log("Debugging booking functionality");
        
        // Check if modal exists
        const modal = document.getElementById('bookingModal');
        console.log("Modal exists:", !!modal);
        
        // Check if book buttons exist
        const bookButtons = document.querySelectorAll('.book-teacher');
        console.log("Book buttons:", bookButtons.length);
        
        // Add test event listeners to all book buttons
        bookButtons.forEach((btn, index) => {
            console.log(`Book button ${index}:`, btn);
            
            // Remove existing event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add new event listener
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Book button clicked:", this.dataset.teacherId);
                
                // Show modal manually
                if (modal) {
                    const teacherId = this.dataset.teacherId;
                    const teacher = teachers.find(t => t.id === teacherId);
                    
                    if (teacher) {
                        console.log("Found teacher:", teacher);
                        
                        // Update modal content
                        const modalTeacherName = document.getElementById('modalTeacherName');
                        if (modalTeacherName) modalTeacherName.textContent = teacher.name;
                        
                        const modalTeacherSubject = document.getElementById('modalTeacherSubject');
                        if (modalTeacherSubject) modalTeacherSubject.textContent = teacher.subject;
                        
                        const modalTeacherAvatar = document.getElementById('modalTeacherAvatar');
                        if (modalTeacherAvatar) modalTeacherAvatar.src = teacher.avatar;
                        
                        // Store teacher ID
                        modal.dataset.teacherId = teacherId;
                        
                        // Show modal
                        modal.style.display = 'flex';
                        setTimeout(() => {
                            modal.classList.add('show');
                        }, 10);
                        
                        // Generate calendar
                        generateCalendar(new Date(), teacher);
                    } else {
                        console.error("Teacher not found:", teacherId);
                    }
                } else {
                    console.error("Modal not found");
                }
            });
        });
        
        // Check if close buttons work
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.modal-cancel');
        
        console.log("Close button exists:", !!closeBtn);
        console.log("Cancel button exists:", !!cancelBtn);
        
        if (closeBtn) {
            // Remove existing event listeners
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            // Add new event listener
            newCloseBtn.addEventListener('click', function() {
                console.log("Close button clicked");
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            });
        }
        
        if (cancelBtn) {
            // Remove existing event listeners
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            // Add new event listener
            newCancelBtn.addEventListener('click', function() {
                console.log("Cancel button clicked");
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            });
        }
        
        // Add a test button to open modal directly
        const testBookBtn = document.createElement('button');
        testBookBtn.textContent = "Test Booking Modal";
        testBookBtn.className = "btn btn-primary";
        testBookBtn.style.position = "fixed";
        testBookBtn.style.bottom = "100px";
        testBookBtn.style.right = "20px";
        testBookBtn.style.zIndex = "1000";
        
        testBookBtn.addEventListener('click', function() {
            if (teachers.length > 0) {
                const firstTeacher = teachers[0];
                console.log("Opening modal for first teacher:", firstTeacher);
                openBookingModal(firstTeacher.id);
            } else {
                console.error("No teachers available");
            }
        });
        
        document.body.appendChild(testBookBtn);
    }

    // Add this function to your portal.js file
    function testTabSwitching() {
        console.log("Testing tab switching...");
        
        // Get all tabs
        const tabs = document.querySelectorAll('.portal-tab');
        console.log("Found tabs:", tabs.length);
        
        // Get all content sections
        const contents = document.querySelectorAll('.portal-content');
        console.log("Found content sections:", contents.length);
        
        // Test switching to book tab
        const bookTab = document.querySelector('[data-tab="book"]');
        if (bookTab) {
            console.log("Found book tab:", bookTab);
            console.log("Clicking book tab...");
            bookTab.click();
            
            // Check if book content is active
            setTimeout(() => {
                const bookContent = document.getElementById('book-content');
                if (bookContent) {
                    console.log("Book content active:", bookContent.classList.contains('active'));
                } else {
                    console.error("Book content not found");
                }
            }, 100);
        } else {
            console.error("Book tab not found");
        }
    }

    // Call this function when the test button is clicked
    document.getElementById('testFirestore').addEventListener('click', function() {
        import('./test-firestore.js')
            .then(() => {
                console.log("Test script loaded");
                testTabSwitching();
            })
            .catch(error => console.error("Error loading test script:", error));
    });
}); 