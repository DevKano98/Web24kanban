// src/services/firebase.js - Protected version
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Protected Firebase config function
const getFirebaseConfig = () => {
  const config = {
    apiKey: "AIzaSyAFQCzH57czoJhmekoWL4hHY57CljZOevo",
    authDomain: "web24-dcc8e.firebaseapp.com",
    projectId: "web24-dcc8e",
    storageBucket: "web24-dcc8e.firebasestorage.app",
    messagingSenderId: "1043556297487",
    appId: "1:1043556297487:web:f90e05301061a9b5086c7a"

  };

  // In production, prevent config from being logged
  if (process.env.NODE_ENV === 'production') {
    // Make config non-enumerable to hide from console inspection
    Object.keys(config).forEach(key => {
      Object.defineProperty(config, key, {
        value: config[key],
        writable: false,
        enumerable: false,
        configurable: false
      });
    });
  }

  return config;
};

const app = initializeApp(getFirebaseConfig());
export const auth = getAuth(app);
export const db = getFirestore(app);

// Hide Firebase instances from console in production
if (process.env.NODE_ENV === 'production') {
  // Override toString methods to hide internal details
  auth.toString = () => '[Firebase Auth - Access Restricted]';
  db.toString = () => '[Firestore Database - Access Restricted]';
  
  // Prevent direct access to Firebase internals
  Object.freeze(auth);
  Object.freeze(db);
}