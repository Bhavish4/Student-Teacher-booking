// Import Firebase Firestore functions
import { 
    db,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    limit,
    startAfter,
    endBefore,
    limitToLast,
    setDoc
} from './firebase-config.js';

// Teacher functions
export async function getTeachers() {
    try {
        console.log("Getting teachers from Firestore...");
        const teachersRef = collection(db, "teachers");
        console.log("Teachers collection reference:", teachersRef);
        
        const snapshot = await getDocs(teachersRef);
        console.log("Got teachers snapshot, empty?", snapshot.empty);
        
        if (snapshot.empty) {
            console.log("No teachers found, adding sample data");
            await addSampleTeachers();
            console.log("Sample teachers added, fetching again");
            return getTeachers(); // Try again after adding sample data
        }
        
        const teachers = [];
        snapshot.forEach(doc => {
            console.log("Teacher document:", doc.id, doc.data());
            teachers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log("Returning teachers array:", teachers);
        return teachers;
    } catch (error) {
        console.error("Error getting teachers:", error);
        throw error;
    }
}

export async function getTeachersBySubject(subject) {
    try {
        const teachersRef = collection(db, "teachers");
        const q = query(teachersRef, where("subject", "==", subject));
        const snapshot = await getDocs(q);
        
        const teachers = [];
        snapshot.forEach(doc => {
            teachers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return teachers;
    } catch (error) {
        console.error("Error getting teachers by subject:", error);
        throw error;
    }
}

export async function getTeacherById(teacherId) {
    try {
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId));
        if (teacherDoc.exists()) {
            return {
                id: teacherDoc.id,
                ...teacherDoc.data()
            };
        } else {
            console.error("Teacher not found:", teacherId);
            return null;
        }
    } catch (error) {
        console.error("Error getting teacher:", error);
        throw error;
    }
}

async function addSampleTeachers() {
    const sampleTeachers = [
        {
            name: "Dr. John Davis",
            subject: "Mathematics",
            avatar: "Dr. Robert Chen.jpeg",
            availability: {
                monday: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00"],
                wednesday: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"],
                friday: ["13:00", "14:00", "15:00", "16:00"]
            },
            rating: 4.8,
            reviews: 24,
            bio: "Experienced mathematics professor specializing in calculus and linear algebra."
        },
        {
            name: "Prof. Sarah Wilson",
            subject: "Computer Science",
            avatar: "https://via.placeholder.com/60x60?text=SW",
            availability: {
                tuesday: ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
                thursday: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00"],
                saturday: ["10:00", "11:00", "12:00", "13:00"]
            },
            rating: 4.9,
            reviews: 36,
            bio: "Computer science professor with expertise in algorithms and data structures."
        },
        {
            name: "Dr. Robert Miller",
            subject: "Physics",
            avatar: "https://via.placeholder.com/60x60?text=RM",
            availability: {
                monday: ["13:00", "14:00", "15:00", "16:00"],
                wednesday: ["9:00", "10:00", "11:00", "12:00"],
                friday: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]
            },
            rating: 4.7,
            reviews: 18,
            bio: "Physics professor specializing in quantum mechanics and theoretical physics."
        }
    ];
    
    try {
        console.log("Adding sample teachers...");
        for (const teacher of sampleTeachers) {
            await addDoc(collection(db, "teachers"), teacher);
            console.log(`Added teacher: ${teacher.name}`);
        }
        console.log("Sample teachers added successfully");
        return true;
    } catch (error) {
        console.error("Error adding sample teachers:", error);
        throw error;
    }
}

// Appointment functions
export async function getUserAppointments(userId) {
    try {
        const appointmentsRef = collection(db, "appointments");
        const q = query(
            appointmentsRef, 
            where("userId", "==", userId),
            orderBy("date", "desc")
        );
        
        const snapshot = await getDocs(q);
        const appointments = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            appointments.push({
                id: doc.id,
                ...data,
                date: data.date.toDate() // Convert Firestore Timestamp to JS Date
            });
        });
        
        return appointments;
    } catch (error) {
        console.error("Error getting appointments:", error);
        throw error;
    }
}

export async function getTeacherAppointments(teacherId) {
    try {
        const appointmentsRef = collection(db, "appointments");
        const q = query(
            appointmentsRef, 
            where("teacherId", "==", teacherId),
            orderBy("date", "asc")
        );
        
        const snapshot = await getDocs(q);
        const appointments = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            appointments.push({
                id: doc.id,
                ...data,
                date: data.date.toDate() // Convert Firestore Timestamp to JS Date
            });
        });
        
        return appointments;
    } catch (error) {
        console.error("Error getting teacher appointments:", error);
        throw error;
    }
}

export async function createAppointment(appointmentData) {
    try {
        // Make sure date is a Firestore Timestamp
        const appointmentWithTimestamp = {
            ...appointmentData,
            date: appointmentData.date instanceof Date ? Timestamp.fromDate(appointmentData.date) : appointmentData.date,
            createdAt: serverTimestamp()
        };
        
        console.log("Creating appointment with data:", appointmentWithTimestamp);
        
        const result = await addDoc(collection(db, "appointments"), appointmentWithTimestamp);
        console.log("Appointment created with ID:", result.id);
        
        return result.id;
    } catch (error) {
        console.error("Error creating appointment:", error);
        throw error;
    }
}

export async function updateAppointment(appointmentId, updateData) {
    try {
        await updateDoc(doc(db, "appointments", appointmentId), {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error updating appointment:", error);
        throw error;
    }
}

export async function cancelAppointment(appointmentId) {
    try {
        await updateDoc(doc(db, "appointments", appointmentId), {
            status: "Cancelled",
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        throw error;
    }
}

export async function completeAppointment(appointmentId) {
    try {
        await updateDoc(doc(db, "appointments", appointmentId), {
            status: "Completed",
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error completing appointment:", error);
        throw error;
    }
}

// Listen for real-time updates to appointments
export function listenToUserAppointments(userId, callback) {
    const appointmentsRef = collection(db, "appointments");
    const q = query(
        appointmentsRef, 
        where("userId", "==", userId),
        orderBy("date", "desc")
    );
    
    return onSnapshot(q, (snapshot) => {
        const appointments = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            appointments.push({
                id: doc.id,
                ...data,
                date: data.date.toDate() // Convert Firestore Timestamp to JS Date
            });
        });
        
        callback(appointments);
    }, (error) => {
        console.error("Error listening to appointments:", error);
    });
}

// Listen for real-time updates to teacher appointments
export function listenToTeacherAppointments(teacherId, callback) {
    const appointmentsRef = collection(db, "appointments");
    const q = query(
        appointmentsRef, 
        where("teacherId", "==", teacherId),
        orderBy("date", "asc")
    );
    
    return onSnapshot(q, (snapshot) => {
        const appointments = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            appointments.push({
                id: doc.id,
                ...data,
                date: data.date.toDate() // Convert Firestore Timestamp to JS Date
            });
        });
        
        callback(appointments);
    }, (error) => {
        console.error("Error listening to teacher appointments:", error);
    });
}

// User profile functions
export async function getUserProfile(userId) {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            return {
                id: userDoc.id,
                ...userDoc.data()
            };
        } else {
            console.log("User profile not found, creating default profile");
            return createUserProfile(userId);
        }
    } catch (error) {
        console.error("Error getting user profile:", error);
        throw error;
    }
}

export async function createUserProfile(userId, userData = {}) {
    try {
        const defaultData = {
            createdAt: serverTimestamp(),
            preferences: {
                notifications: true,
                darkMode: false
            }
        };
        
        const mergedData = { ...defaultData, ...userData };
        
        await setDoc(doc(db, "users", userId), mergedData);
        
        return {
            id: userId,
            ...mergedData
        };
    } catch (error) {
        console.error("Error creating user profile:", error);
        throw error;
    }
}

export async function updateUserProfile(userId, updateData) {
    try {
        await updateDoc(doc(db, "users", userId), {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
}

// Review functions
export async function addReview(reviewData) {
    try {
        const result = await addDoc(collection(db, "reviews"), {
            ...reviewData,
            createdAt: serverTimestamp()
        });
        
        // Update teacher rating
        await updateTeacherRating(reviewData.teacherId);
        
        return result.id;
    } catch (error) {
        console.error("Error adding review:", error);
        throw error;
    }
}

export async function getTeacherReviews(teacherId) {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
            reviewsRef, 
            where("teacherId", "==", teacherId),
            orderBy("createdAt", "desc")
        );
        
        const snapshot = await getDocs(q);
        const reviews = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            reviews.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate() // Convert Firestore Timestamp to JS Date
            });
        });
        
        return reviews;
    } catch (error) {
        console.error("Error getting teacher reviews:", error);
        throw error;
    }
}

async function updateTeacherRating(teacherId) {
    try {
        // Get all reviews for this teacher
        const reviews = await getTeacherReviews(teacherId);
        
        if (reviews.length === 0) return;
        
        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        
        // Update teacher document
        await updateDoc(doc(db, "teachers", teacherId), {
            rating: averageRating,
            reviews: reviews.length
        });
        
        return true;
    } catch (error) {
        console.error("Error updating teacher rating:", error);
        throw error;
    }
}

// Helper function to generate availability HTML
export function generateAvailabilityHTML(availability) {
    if (!availability) return '<li>No availability information</li>';
    
    const days = {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday'
    };
    
    let html = '';
    
    try {
        for (const day in availability) {
            if (availability[day] && Array.isArray(availability[day]) && availability[day].length > 0) {
                const slots = availability[day];
                const formattedSlots = slots.map(slot => {
                    const hour = parseInt(slot.split(':')[0]);
                    if (hour >= 12) {
                        return `${hour === 12 ? 12 : hour - 12}:00 PM`;
                    } else {
                        return `${hour}:00 AM`;
                    }
                }).join(', ');
                
                html += `<li><strong>${days[day]}:</strong> ${formattedSlots}</li>`;
            }
        }
    } catch (error) {
        console.error("Error generating availability HTML:", error);
        return '<li>Error displaying availability</li>';
    }
    
    return html || '<li>No availability information</li>';
} 