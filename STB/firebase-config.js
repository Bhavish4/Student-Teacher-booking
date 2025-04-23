// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdRQS6axrJXEo0rI-QPqTYX_FqQ1L-Jqk",
  authDomain: "student-teacher-booking-697a5.firebaseapp.com",
  projectId: "student-teacher-booking-697a5",
  storageBucket: "student-teacher-booking-697a5.firebasestorage.app",
  messagingSenderId: "886390955217",
  appId: "1:886390955217:web:d10492b8c163e77a8839f0",
  measurementId: "G-6T2JVV48XY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper functions for Firebase operations
async function getTeachers() {
  const teachersCollection = collection(db, "teachers");
  const snapshot = await getDocs(teachersCollection);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function getStudents() {
  const studentsCollection = collection(db, "students");
  const snapshot = await getDocs(studentsCollection);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function getAppointments(userId, role) {
  const appointmentsCollection = collection(db, "appointments");
  let q;
  
  if (role === "teacher") {
    q = query(appointmentsCollection, where("teacherId", "==", userId), orderBy("date", "desc"));
  } else {
    q = query(appointmentsCollection, where("studentId", "==", userId), orderBy("date", "desc"));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function createAppointment(appointmentData) {
  const appointmentsCollection = collection(db, "appointments");
  return await addDoc(appointmentsCollection, appointmentData);
}

async function updateAppointment(appointmentId, newData) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  return await updateDoc(appointmentRef, newData);
}

async function deleteAppointment(appointmentId) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  return await deleteDoc(appointmentRef);
}

// Export Firebase services and helper functions
export {
  app, 
  analytics,
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getTeachers,
  getStudents,
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
}; 