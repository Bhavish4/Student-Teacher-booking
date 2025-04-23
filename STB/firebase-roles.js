// Import Firebase functions
import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  query,
  where,
  getDocs,
  auth,
  onAuthStateChanged
} from './firebase-config.js';

// Define user roles
export const ROLES = {
    ADMIN: 'Admin',
    TEACHER: 'Teacher',
    STUDENT: 'Student'
};

// Function to get role badge color
function getRoleBadgeColor(role) {
    switch (role) {
        case ROLES.ADMIN:
            return 'danger';
        case ROLES.TEACHER:
            return 'primary';
        case ROLES.STUDENT:
            return 'success';
        default:
            return 'secondary';
    }
}

// Function to set a user role
export async function setUserRole(userId, role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${Object.values(ROLES).join(', ')}`);
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { role }, { merge: true });
    console.log(`Role ${role} set for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
}

// Function to get a user's role
export async function getUserRole(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            return userData.role || ROLES.STUDENT; // Default to Student if no role found
        } else {
            // User document doesn't exist, create one with default role
            await setUserRole(userId, ROLES.STUDENT);
            return ROLES.STUDENT;
        }
    } catch (error) {
        console.error('Error getting user role:', error);
        return ROLES.STUDENT; // Default to Student on error
    }
}

// Function to check if a user has a specific role
export async function hasRole(userId, role) {
    const userRole = await getUserRole(userId);
    return userRole === role;
}

// Function to check if the user is an admin
export async function isAdmin(userId) {
    return await hasRole(userId, ROLES.ADMIN);
}

// Function to check if the user is a teacher
export async function isTeacher(userId) {
    return await hasRole(userId, ROLES.TEACHER);
}

// Function to check if the user is a student
export async function isStudent(userId) {
    return await hasRole(userId, ROLES.STUDENT);
}

// Function to get all users with a specific role
export async function getUsersByRole(role) {
  try {
    const q = query(collection(db, "userRoles"), where("role", "==", role));
    const querySnapshot = await getDocs(q);
    
    const userIds = [];
    querySnapshot.forEach((doc) => {
      userIds.push(doc.id);
    });
    
    return userIds;
  } catch (error) {
    console.error(`Error getting users with role ${role}:`, error);
    throw error;
  }
}

// Check if current user has specific role
export async function currentUserHasRole(role) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Stop listening immediately
      if (user) {
        try {
          const hasRole = await hasRole(user.uid, role);
          resolve(hasRole);
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(false);
      }
    });
  });
}

// Redirect based on role
export async function redirectBasedOnRole() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Stop listening immediately
      if (user) {
        try {
          const role = await getUserRole(user.uid);
          
          switch(role) {
            case ROLES.ADMIN:
              window.location.href = 'admin-dashboard.html';
              break;
            case ROLES.TEACHER:
              window.location.href = 'teacher-dashboard.html';
              break;
            case ROLES.STUDENT:
              window.location.href = 'student-dashboard.html';
              break;
            default:
              window.location.href = 'student-dashboard.html';
          }
          
          resolve(role);
        } catch (error) {
          console.error("Error redirecting based on role:", error);
          reject(error);
        }
      } else {
        window.location.href = 'auth.html';
        resolve(null);
      }
    });
  });
}

// Create initial admin, teacher, and student accounts if they don't exist
export async function createInitialAccounts() {
  // This function will be called when setting up the application
  // It checks for predefined accounts and creates them if they don't exist
  // You would call this from an admin setup page or initialization script
}

// Initialize role protection for a page - redirects if user doesn't have required role
async function initializeRoleProtection(allowedRoles) {
    // This function would contain actual role protection code
    // For now, it's a placeholder
    return ROLES.ADMIN; // Assume admin for testing
}

// Export functions and constants
export {
    getRoleBadgeColor,
    initializeRoleProtection
}; 