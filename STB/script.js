// Import Firebase services from the config file
import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Check authentication state and update UI
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('user');
    let currentUser = storedUser ? JSON.parse(storedUser) : null;
    
    // Listen for auth state changes
    onAuthStateChanged(auth, function(user) {
        if (user) {
            // User is signed in
            currentUser = user;
            updateUIForLoggedInUser(user);
        } else {
            // No user is signed in
            currentUser = null;
            localStorage.removeItem('user');
            updateUIForLoggedOutUser();
        }
    });

    function updateUIForLoggedInUser(user) {
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            const displayName = user.displayName || (currentUser ? currentUser.displayName : null) || user.email.split('@')[0];
            
            navButtons.innerHTML = `
                <div class="user-dropdown">
                    <span class="user-greeting">Hello, ${displayName} <i class="fas fa-chevron-down"></i></span>
                    <div class="dropdown-menu">
                        <a href="student-dashboard.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                        <a href="profile.html"><i class="fas fa-user"></i> Profile</a>
                        <button id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Log Out</button>
                    </div>
                </div>
            `;
            
            // Add dropdown functionality
            const userDropdown = navButtons.querySelector('.user-dropdown');
            if (userDropdown) {
                userDropdown.addEventListener('click', function(e) {
                    this.classList.toggle('active');
                    e.stopPropagation();
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', function() {
                    userDropdown.classList.remove('active');
                });
            }
            
            // Add logout functionality
            document.getElementById('logoutBtn').addEventListener('click', function() {
                signOut(auth).then(() => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error('Error signing out:', error);
                    showAlert('Error logging out: ' + error.message, 'error');
                });
            });
        }
        
        // Update booking buttons to direct to dashboard
        const bookButtons = document.querySelectorAll('.btn-primary.btn-large');
        bookButtons.forEach(button => {
            if (button.textContent.includes('Book an Appointment') || button.textContent.includes('Book Now')) {
                button.href = 'student-dashboard.html';
            }
        });
        
        // Add dropdown styles if not already added
        if (!document.querySelector('#dropdown-styles')) {
            const dropdownStyles = document.createElement('style');
            dropdownStyles.id = 'dropdown-styles';
            dropdownStyles.textContent = `
                .user-dropdown {
                    position: relative;
                    cursor: pointer;
                }
                
                .user-greeting {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border-radius: var(--border-radius);
                }
                
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background-color: var(--background-color);
                    border-radius: var(--border-radius);
                    box-shadow: var(--box-shadow);
                    min-width: 200px;
                    z-index: 10;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                }
                
                .user-dropdown.active .dropdown-menu {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }
                
                .dropdown-menu a, 
                .dropdown-menu button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    color: var(--text-color);
                    text-decoration: none;
                    transition: var(--transition);
                    border: none;
                    background: none;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    font-size: 1rem;
                }
                
                .dropdown-menu a:hover, 
                .dropdown-menu button:hover {
                    background-color: var(--background-alt);
                    color: var(--primary-color);
                }
                
                .dropdown-menu a:not(:last-child), 
                .dropdown-menu button:not(:last-child) {
                    border-bottom: 1px solid var(--border-color);
                }
            `;
            document.head.appendChild(dropdownStyles);
        }
    }

    function updateUIForLoggedOutUser() {
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            navButtons.innerHTML = `
                <a href="auth.html" class="btn btn-secondary">Log In</a>
                <a href="auth.html?tab=signup" class="btn btn-primary">Sign Up</a>
            `;
        }
        
        // Update booking buttons to direct to auth
        const bookButtons = document.querySelectorAll('.btn-primary.btn-large');
        bookButtons.forEach(button => {
            if (button.textContent.includes('Book an Appointment') || button.textContent.includes('Book Now')) {
                button.href = 'auth.html?login=true';
            }
        });
    }

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
    
    // FAQ Accordion - Enhanced implementation
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        console.log('FAQ Items found:', faqItems.length);
        
        if (faqItems.length === 0) {
            console.error('No FAQ items found in the DOM');
            return;
        }
        
        // Add click events to all FAQ questions
        faqItems.forEach((item, index) => {
            const question = item.querySelector('.faq-question');
            if (!question) {
                console.error(`No question element found in FAQ item ${index + 1}`);
                return;
            }
            
            console.log(`Adding click listener to FAQ item ${index + 1}`);
            
            // Add click event to the entire question div
            question.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`FAQ item ${index + 1} clicked`);
                
                // Close all other items
                faqItems.forEach((otherItem, otherIndex) => {
                    if (otherIndex !== index) {
                        otherItem.classList.remove('active');
                        console.log(`Closing FAQ item ${otherIndex + 1}`);
                    }
                });
                
                // Toggle current item
                item.classList.toggle('active');
                console.log(`Toggling FAQ item ${index + 1}, active: ${item.classList.contains('active')}`);
                
                // Auto-scroll to the opened item if it's not visible
                if (item.classList.contains('active')) {
                    const rect = item.getBoundingClientRect();
                    const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
                    
                    if (!isInViewport) {
                        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            });
        });
        
        // Open the first FAQ item by default
        if (faqItems.length > 0) {
            // Uncomment the line below if you want the first FAQ to be open by default
            // faqItems[0].classList.add('active');
        }
    }
    
    // Initialize FAQ accordion
    initFaqAccordion();
    
    // Testimonial Slider
    initTestimonialSlider();
    
    // Interactive Calendar Demo
    initCalendarDemo();
    
    // Form submissions
    initFormHandlers();
    
    // Smooth scrolling for anchor links
    initSmoothScrolling();
    
    // Animate elements on scroll
    initScrollAnimations();
});

// Helper functions to keep the main code cleaner
function initTestimonialSlider() {
    const testimonialSlider = document.getElementById('testimonialSlider');
    if (testimonialSlider) {
        const testimonialSlides = testimonialSlider.querySelectorAll('.testimonial-slide');
        const dots = document.querySelectorAll('.dot');
        const prevBtn = document.getElementById('prevTestimonial');
        const nextBtn = document.getElementById('nextTestimonial');
        
        let currentSlide = 0;
        
        function showSlide(index) {
            // Hide all slides
            testimonialSlides.forEach(slide => {
                slide.style.display = 'none';
            });
            
            // Remove active class from all dots
            dots.forEach(dot => {
                dot.classList.remove('active');
            });
            
            // Show current slide and activate corresponding dot
            testimonialSlides[index].style.display = 'block';
            if (dots[index]) {
                dots[index].classList.add('active');
            }
        }
        
        // Initialize slider
        if (testimonialSlides.length > 0) {
            showSlide(currentSlide);
            
            // Next button
            if (nextBtn) {
                nextBtn.addEventListener('click', function() {
                    currentSlide = (currentSlide + 1) % testimonialSlides.length;
                    showSlide(currentSlide);
                });
            }
            
            // Previous button
            if (prevBtn) {
                prevBtn.addEventListener('click', function() {
                    currentSlide = (currentSlide - 1 + testimonialSlides.length) % testimonialSlides.length;
                    showSlide(currentSlide);
                });
            }
            
            // Dot navigation
            dots.forEach((dot, index) => {
                dot.addEventListener('click', function() {
                    currentSlide = index;
                    showSlide(currentSlide);
                });
            });
            
            // Auto slide every 5 seconds
            setInterval(function() {
                currentSlide = (currentSlide + 1) % testimonialSlides.length;
                showSlide(currentSlide);
            }, 5000);
        }
    }
}

function initCalendarDemo() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthElement = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const selectedDateElement = document.getElementById('selectedDate');
    const slotsContainer = document.getElementById('slotsContainer');
    const bookingProgress = document.getElementById('bookingProgress');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    if (calendarDays && currentMonthElement) {
        let currentDate = new Date();
        let selectedDate = null;
        let currentStep = 1;
        let selectedTeacher = null;
        let selectedTimeSlot = null;
        
        // Add teacher selection functionality
        const interactiveDemo = document.querySelector('.interactive-demo');
        if (interactiveDemo) {
            // Create teacher selector
            const teacherSelector = document.createElement('div');
            teacherSelector.className = 'teacher-selector';
            teacherSelector.innerHTML = `
                <h5>Select a Teacher</h5>
                <div class="teacher-list">
                    <div class="teacher-card" data-teacher-id="1">
                        <img src="https://via.placeholder.com/60x60?text=JD" alt="Teacher">
                        <div class="teacher-info">
                            <h4>Dr. John Davis</h4>
                            <p>Mathematics</p>
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
                    <div class="teacher-card" data-teacher-id="2">
                        <img src="https://via.placeholder.com/60x60?text=SW" alt="Teacher">
                        <div class="teacher-info">
                            <h4>Prof. Sarah Wilson</h4>
                            <p>Computer Science</p>
                            <div class="teacher-rating">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <span>(5.0)</span>
                            </div>
                        </div>
                    </div>
                    <div class="teacher-card" data-teacher-id="3">
                        <img src="https://via.placeholder.com/60x60?text=RM" alt="Teacher">
                        <div class="teacher-info">
                            <h4>Dr. Robert Miller</h4>
                            <p>Physics</p>
                            <div class="teacher-rating">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="far fa-star"></i>
                                <span>(4.0)</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add teacher selector before calendar
            const calendarDemo = interactiveDemo.querySelector('.calendar-demo');
            if (calendarDemo) {
                interactiveDemo.insertBefore(teacherSelector, calendarDemo);
            }
            
            // Add CSS for teacher selector
            const style = document.createElement('style');
            style.textContent = `
                .teacher-selector {
                    margin-bottom: 2rem;
                }
                
                .teacher-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .teacher-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: var(--transition);
                }
                
                .teacher-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--box-shadow);
                }
                
                .teacher-card.active {
                    border-color: var(--primary-color);
                    background-color: rgba(79, 70, 229, 0.05);
                }
                
                .teacher-card img {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                
                .teacher-info h4 {
                    margin-bottom: 0.25rem;
                    font-size: 1rem;
                }
                
                .teacher-info p {
                    margin-bottom: 0.25rem;
                    font-size: 0.9rem;
                }
                
                .teacher-rating {
                    color: #f59e0b;
                    font-size: 0.8rem;
                }
                
                .teacher-rating span {
                    color: var(--text-light);
                    margin-left: 0.25rem;
                }
            `;
            document.head.appendChild(style);
            
            // Add teacher selection functionality
            const teacherCards = document.querySelectorAll('.teacher-card');
            teacherCards.forEach(card => {
                card.addEventListener('click', function() {
                    // Remove active class from all cards
                    teacherCards.forEach(c => c.classList.remove('active'));
                    
                    // Add active class to selected card
                    card.classList.add('active');
                    
                    // Update selected teacher
                    selectedTeacher = {
                        id: card.dataset.teacherId,
                        name: card.querySelector('h4').textContent,
                        subject: card.querySelector('p').textContent
                    };
                    
                    // Reset date and time selection
                    selectedDate = null;
                    selectedTimeSlot = null;
                    
                    // Clear active date
                    document.querySelectorAll('.calendar-day').forEach(day => {
                        day.classList.remove('active');
                    });
                    
                    // Clear time slots
                    if (slotsContainer) {
                        slotsContainer.innerHTML = '';
                    }
                    
                    // Update progress
                    updateProgress(1);
                    
                    // Show alert
                    showAlert(`Selected ${selectedTeacher.name}. Now choose a date.`, 'info');
                });
            });
        }
        
        // Generate calendar
        function generateCalendar(year, month) {
            if (!calendarDays) return;
            
            calendarDays.innerHTML = '';
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // Update month display
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthElement.textContent = `${monthNames[month]} ${year}`;
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < startingDay; i++) {
                const emptyDay = document.createElement('div');
                calendarDays.appendChild(emptyDay);
            }
            
            // Add days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = document.createElement('div');
                dayElement.classList.add('calendar-day');
                dayElement.textContent = day;
                
                // Disable past dates
                const dateToCheck = new Date(year, month, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (dateToCheck < today) {
                    dayElement.classList.add('disabled');
                } else {
                    // Add click event to selectable dates
                    dayElement.addEventListener('click', function() {
                        if (!selectedTeacher) {
                            // Show alert if no teacher selected
                            showAlert('Please select a teacher first', 'warning');
                            return;
                        }
                        
                        // Remove active class from all days
                        document.querySelectorAll('.calendar-day').forEach(day => {
                            day.classList.remove('active');
                        });
                        
                        // Add active class to selected day
                        dayElement.classList.add('active');
                        
                        // Update selected date
                        selectedDate = new Date(year, month, day);
                        if (selectedDateElement) {
                            selectedDateElement.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                        }
                        
                        // Generate time slots for selected date
                        generateTimeSlots();
                        
                        // Update progress
                        updateProgress(2);
                    });
                }
                
                calendarDays.appendChild(dayElement);
            }
        }
        
        // Generate time slots
        function generateTimeSlots() {
            if (!slotsContainer) return;
            
            // Clear previous slots
            slotsContainer.innerHTML = '';
            
            // Show loading indicator
            slotsContainer.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i> Loading available time slots...
                </div>
            `;
            
            // Simulate API call to get available slots
            setTimeout(() => {
                // Clear loading indicator
                slotsContainer.innerHTML = '';
                
                // Generate random slots based on teacher and date
                const slots = [];
                const startHour = 9; // 9 AM
                const endHour = 17; // 5 PM
                
                for (let hour = startHour; hour < endHour; hour++) {
                    // Add slots at :00 and :30
                    if (Math.random() > 0.3) { // 70% chance of availability
                        slots.push({
                            time: `${hour}:00`,
                            display: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
                        });
                    }
                    
                    if (Math.random() > 0.3) { // 70% chance of availability
                        slots.push({
                            time: `${hour}:30`,
                            display: `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}`
                        });
                    }
                }
                
                // Sort slots by time
                slots.sort((a, b) => {
                    const timeA = a.time.split(':');
                    const timeB = b.time.split(':');
                    
                    const hourA = parseInt(timeA[0]);
                    const hourB = parseInt(timeB[0]);
                    
                    if (hourA !== hourB) {
                        return hourA - hourB;
                    }
                    
                    const minuteA = parseInt(timeA[1]);
                    const minuteB = parseInt(timeB[1]);
                    
                    return minuteA - minuteB;
                });
                
                // Display slots or no slots message
                if (slots.length === 0) {
                    slotsContainer.innerHTML = `
                        <div class="no-slots-message">
                            <i class="fas fa-exclamation-circle"></i> No available slots for this date.
                        </div>
                    `;
                } else {
                    // Create slots grid
                    const slotsGrid = document.createElement('div');
                    slotsGrid.className = 'time-slots-grid';
                    
                    // Add slots to grid
                    slots.forEach(slot => {
                        const slotElement = document.createElement('div');
                        slotElement.className = 'time-slot';
                        slotElement.textContent = slot.display;
                        slotElement.dataset.time = slot.time;
                        
                        slotElement.addEventListener('click', function() {
                            // Remove active class from all slots
                            document.querySelectorAll('.time-slot').forEach(s => {
                                s.classList.remove('active');
                            });
                            
                            // Add active class to selected slot
                            slotElement.classList.add('active');
                            
                            // Update selected time slot
                            selectedTimeSlot = slot;
                            
                            // Update progress
                            updateProgress(3);
                            
                            // Add confirm button if not already added
                            if (!document.querySelector('.confirm-booking-btn')) {
                                const confirmBtn = document.createElement('button');
                                confirmBtn.className = 'btn btn-primary confirm-booking-btn';
                                confirmBtn.innerHTML = 'Confirm Booking <i class="fas fa-check"></i>';
                                
                                confirmBtn.addEventListener('click', function() {
                                    // Check if user is logged in
                                    onAuthStateChanged(auth, (user) => {
                                        if (user) {
                                            // User is logged in, show confirmation
                                            showBookingConfirmation();
                                        } else {
                                            // User is not logged in, show login modal
                                            showLoginModal(selectedTeacher.name, 
                                                selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), 
                                                selectedTimeSlot.display);
                                        }
                                    });
                                });
                                
                                interactiveDemo.appendChild(confirmBtn);
                            }
                        });
                        
                        slotsGrid.appendChild(slotElement);
                    });
                    
                    slotsContainer.appendChild(slotsGrid);
                    
                    // Add CSS for time slots
                    if (!document.querySelector('#time-slots-styles')) {
                        const slotsStyles = document.createElement('style');
                        slotsStyles.id = 'time-slots-styles';
                        slotsStyles.textContent = `
                            .time-slots-grid {
                                display: grid;
                                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                                gap: 0.5rem;
                                margin-top: 1rem;
                            }
                            
                            .time-slot {
                                padding: 0.5rem;
                                text-align: center;
                                border-radius: var(--border-radius);
                                border: 1px solid var(--border-color);
                                cursor: pointer;
                                transition: var(--transition);
                            }
                            
                            .time-slot:hover {
                                background-color: var(--background-alt);
                            }
                            
                            .time-slot.active {
                                background-color: var(--primary-color);
                                color: white;
                                border-color: var(--primary-color);
                            }
                            
                            .loading-indicator, .no-slots-message {
                                text-align: center;
                                padding: 1rem;
                            }
                            
                            .confirm-booking-btn {
                                display: block;
                                margin: 2rem auto 0;
                                padding: 1rem 2rem;
                            }
                        `;
                        document.head.appendChild(slotsStyles);
                    }
                }
            }, 1000); // Simulate 1 second loading time
        }
        
        // Show booking confirmation
        function showBookingConfirmation() {
            // Create modal element
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Booking Confirmation</h3>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="confirmation-details">
                            <p><strong>Teacher:</strong> ${selectedTeacher.name}</p>
                            <p><strong>Subject:</strong> ${selectedTeacher.subject}</p>
                            <p><strong>Date:</strong> ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Time:</strong> ${selectedTimeSlot.display}</p>
                        </div>
                        <div class="confirmation-message">
                            <i class="fas fa-check-circle" style="color: var(--success-color); font-size: 3rem;"></i>
                            <p>Your appointment has been booked successfully!</p>
                            <p>A confirmation email has been sent to your registered email address.</p>
                        </div>
                        <div class="confirmation-actions">
                            <button class="btn btn-primary close-confirmation">Done</button>
                            <button class="btn btn-secondary book-another">Book Another</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to body
            document.body.appendChild(modal);
            
            // Show modal with animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Close modal functionality
            const closeBtn = modal.querySelector('.close-modal');
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            });
            
            // Done button functionality
            const doneBtn = modal.querySelector('.close-confirmation');
            doneBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            });
            
            // Book another button functionality
            const bookAnotherBtn = modal.querySelector('.book-another');
            bookAnotherBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    resetBookingForm();
                }, 300);
            });
            
            // Add modal styles if not already added
            if (!document.querySelector('#modal-styles')) {
                const modalStyles = document.createElement('style');
                modalStyles.id = 'modal-styles';
                modalStyles.textContent = `
                    .modal {
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
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.3s ease, visibility 0.3s ease;
                    }
                    
                    .modal.show {
                        opacity: 1;
                        visibility: visible;
                    }
                    
                    .modal-content {
                        background-color: var(--background-color);
                        border-radius: var(--border-radius);
                        width: 90%;
                        max-width: 500px;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: var(--box-shadow);
                        transform: translateY(-20px);
                        transition: transform 0.3s ease;
                    }
                    
                    .modal.show .modal-content {
                        transform: translateY(0);
                    }
                    
                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.5rem;
                        border-bottom: 1px solid var(--border-color);
                    }
                    
                    .modal-header h3 {
                        margin-bottom: 0;
                        color: var(--primary-color);
                    }
                    
                    .close-modal {
                        font-size: 1.5rem;
                        cursor: pointer;
                        color: var(--text-light);
                        transition: var(--transition);
                    }
                    
                    .close-modal:hover {
                        color: var(--error-color);
                    }
                    
                    .modal-body {
                        padding: 1.5rem;
                    }
                    
                    .confirmation-details {
                        background-color: var(--background-alt);
                        padding: 1rem;
                        border-radius: var(--border-radius);
                        margin-bottom: 1.5rem;
                    }
                    
                    .confirmation-details p {
                        margin-bottom: 0.5rem;
                    }
                    
                    .confirmation-message {
                        text-align: center;
                        margin-bottom: 1.5rem;
                    }
                    
                    .confirmation-actions {
                        display: flex;
                        justify-content: center;
                        gap: 1rem;
                    }
                `;
                document.head.appendChild(modalStyles);
            }
        }
        
        // Show login modal
        function showLoginModal(teacherName, date, time) {
            // Create modal element
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Login Required</h3>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p>Please log in or sign up to confirm your appointment with ${teacherName} on ${date} at ${time}.</p>
                        <div class="modal-buttons">
                            <button class="btn btn-primary login-btn">Log In</button>
                            <button class="btn btn-secondary signup-btn">Sign Up</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to body
            document.body.appendChild(modal);
            
            // Show modal with animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Close modal functionality
            const closeBtn = modal.querySelector('.close-modal');
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            });
            
            // Login button functionality
            const loginBtn = modal.querySelector('.login-btn');
            loginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
            
            // Signup button functionality
            const signupBtn = modal.querySelector('.signup-btn');
            signupBtn.addEventListener('click', () => {
                window.location.href = 'signup.html';
            });
        }
        
        // Reset booking form
        function resetBookingForm() {
            // Reset selected values
            selectedTeacher = null;
            selectedDate = null;
            selectedTimeSlot = null;
            
            // Reset UI
            document.querySelectorAll('.teacher-card').forEach(card => card.classList.remove('active'));
            document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('active'));
            if (slotsContainer) {
                slotsContainer.innerHTML = '';
            }
            if (selectedDateElement) {
                selectedDateElement.textContent = 'select a date';
            }
            
            // Remove confirm button
            const confirmBtn = document.querySelector('.confirm-booking-btn');
            if (confirmBtn) {
                confirmBtn.remove();
            }
            
            // Reset progress
            updateProgress(1);
        }
        
        // Update booking progress
        function updateProgress(step) {
            currentStep = step;
            
            if (bookingProgress) {
                // Update progress bar width
                const progressWidth = ((step - 1) / 2) * 100;
                bookingProgress.style.width = `${progressWidth}%`;
            }
            
            // Update active step
            progressSteps.forEach((stepElement, index) => {
                if (index + 1 <= step) {
                    stepElement.classList.add('active');
                } else {
                    stepElement.classList.remove('active');
                }
            });
        }
        
        // Initialize calendar with current month
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
        
        // Previous month button
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', function() {
                currentDate.setMonth(currentDate.getMonth() - 1);
                generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
            });
        }
        
        // Next month button
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', function() {
                currentDate.setMonth(currentDate.getMonth() + 1);
                generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
            });
        }
    }
}

function initFormHandlers() {
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate form submission
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            // Simulate API call
            setTimeout(function() {
                submitButton.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
                
                // Reset form
                contactForm.reset();
                
                // Reset button after 3 seconds
                setTimeout(function() {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }, 3000);
            }, 1500);
        });
    }
    
    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate form submission
            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
            
            // Simulate API call
            setTimeout(function() {
                submitButton.innerHTML = '<i class="fas fa-check"></i> Subscribed!';
                
                // Reset form
                newsletterForm.reset();
                
                // Reset button after 3 seconds
                setTimeout(function() {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }, 3000);
            }, 1500);
        });
    }
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Offset for fixed header
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

function initScrollAnimations() {
    function animateOnScroll() {
        const elements = document.querySelectorAll('.feature-card, .step, .testimonial-card, .faq-item, .stat');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Set initial styles for animation
    document.querySelectorAll('.feature-card, .step, .testimonial-card, .faq-item, .stat').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Run animation on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Run once on page load
    animateOnScroll();
}

// Show alert function available globally
window.showAlert = function(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // Set alert content
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'info' ? 'fa-info-circle' : 'fa-exclamation-triangle')}"></i>
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
            
            .alert-success {
                border-left: 4px solid var(--success-color);
            }
            
            .alert-info {
                border-left: 4px solid var(--primary-color);
            }
            
            .alert-warning, .alert-error {
                border-left: 4px solid var(--warning-color);
            }
            
            .alert-success i {
                color: var(--success-color);
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
}; 