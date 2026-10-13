import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

console.log("🚀 login.js chargé");

const loginBtn = document.getElementById("loginBtn");

if (!loginBtn) {


console.error("❌ Bouton loginBtn introuvable");


} else {


loginBtn.addEventListener("click", async () => {
const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;


    // Vérification email
    if (!email) {

        alert("Veuillez saisir votre adresse e-mail.");

        return;
    }


    // Vérification mot de passe
    if (!password) {

        alert("Veuillez saisir votre mot de passe.");

        return;
    }


    loginBtn.disabled = true;
    loginBtn.textContent = "Connexion...";


    try {

        // ==============================
        // CONNEXION FIREBASE
        // ==============================

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        const user = result.user;


        console.log(
            "✅ Utilisateur connecté :",
            user.uid
        );


        // ==============================
        // RÉCUPÉRER LE PROFIL FIRESTORE
        // ==============================

        const userRef = doc(
            db,
            "users",
            user.uid
        );


        const userSnap = await getDoc(userRef);


        let role = "user";


        if (userSnap.exists()) {

            const userData = userSnap.data();

            role = String(userData.role || "user")
                .trim()
                .toLowerCase();


            console.log(
                "👤 Profil Firestore :",
                userData
            );

            console.log(
                "🎯 Rôle détecté :",
                role
            );

        } else {

            console.log(
                "⚠️ Aucun profil Firestore trouvé"
            );

        }


        // ==============================
        // REDIRECTION
        // ==============================

        if (role === "admin") {

            console.log(
                "👑 Administrateur détecté"
            );

            window.location.href =
                "admin.html";

        } else {

            console.log(
                "👤 Utilisateur normal"
            );

            window.location.href =
                "home.html";
        }


    } catch (error) {

        console.error(
            "❌ Erreur Firebase :",
            error
        );


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            alert(
                "E-mail ou mot de passe incorrect."
            );

        }

        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            alert(
                "Aucun compte trouvé avec cet e-mail."
            );

        }

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            alert(
                "Adresse e-mail invalide."
            );

        }

        else if (
            error.code === "permission-denied" ||
            error.code === "firestore/permission-denied"
        ) {

            alert(
                "Accès Firestore refusé. Vérifie les règles de sécurité."
            );

        }

        else {

            alert(
                "Erreur : " +
                error.message
            );

        }


        loginBtn.disabled = false;

        loginBtn.textContent =
            "Se connecter";
    }

});


}
