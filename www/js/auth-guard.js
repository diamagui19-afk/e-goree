
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase.js";

onAuthStateChanged(auth, (user) => {

    if (!user) {
        console.log("🔒 Aucun utilisateur connecté");

        window.location.href = "login.html";
        return;
    }

    console.log("🔓 Utilisateur connecté :", user.uid);
});

