import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

const firebaseConfig = {
    
  apiKey: "AIzaSyCtnFXSX1VX5VAfY9Q0DcyooBGPlXP6H54",
  authDomain: "egoree-c85a9.firebaseapp.com",
  projectId: "egoree-c85a9",
  storageBucket: "egoree-c85a9.firebasestorage.app",
  messagingSenderId: "1022814094576",
  appId: "YOUR_FIREBASE_APP_ID"

};

const app = initializeApp(firebaseConfig);

export { app };