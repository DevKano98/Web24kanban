// src/services/firebase.js - Minimal Test Version
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Simple configuration without any extra logic
const firebaseConfig = {
  apiKey: "AIzaSyAFQCzH57czoJhmekoWL4hHY57CljZOevo",
  authDomain: "web24-dcc8e.firebaseapp.com",
  projectId: "web24-dcc8e",
  storageBucket: "web24-dcc8e.firebasestorage.app",
  messagingSenderId: "1043556297487",
  appId: "1:1043556297487:web:f90e05301061a9b5086c7a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);