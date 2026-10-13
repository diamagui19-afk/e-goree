
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyAJhGDEX_6caolTEAZGrw0Z_s0ANbse-_Y",
    authDomain: "egoree-c85a9-a0b13.firebaseapp.com",
    projectId: "egoree-c85a9-a0b13",
    storageBucket: "egoree-c85a9-a0b13.firebasestorage.app",
    messagingSenderId: "526235046950",
    appId: "YOUR_FIREBASE_APP_ID"
};


// Initialisation Firebase
const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

console.log("🔥 Firebase E-Gorée connecté");