
import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

console.log("🚀 register.js chargé");

const registerBtn = document.getElementById("registerBtn");

registerBtn.addEventListener("click", async () => {

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const checkbox = document.querySelector(".checkbox-row input");

// Vérification nom
    if (!fullName) {
        alert("Veuillez saisir votre nom complet.");
        return;
    }

// Vérification email
    if (!email) {
        alert("Veuillez saisir votre adresse e-mail.");
        return;
    }

    // Vérification mot de passe
    if (!password) {
        alert("Veuillez saisir un mot de passe.");
        return;
    }

    if (password.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    // Confirmation mot de passe
    if (password !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas.");
        return;
    }

    // Conditions
    if (!checkbox.checked) {
        alert("Veuillez accepter les conditions d'utilisation.");
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "Création...";

    try {

        // Création du compte Firebase Authentication
        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = result.user;

        console.log("✅ Compte Firebase créé :", user.uid);

        // Création du profil Firestore
       await setDoc(
    doc(db, "users", user.uid),
    {
        userId: user.uid,
        fullName: fullName,
        email: user.email,
termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }
);
        console.log("✅ Profil enregistré dans Firestore");

        alert("Compte créé avec succès !");

        window.location.href = "home.html";

    } catch (error) {

        console.error("❌ Erreur inscription :", error);

        if (error.code === "auth/email-already-in-use") {
            alert("Cette adresse e-mail est déjà utilisée.");
        }

        else if (error.code === "auth/invalid-email") {
            alert("Adresse e-mail invalide.");
        }

        else if (error.code === "auth/weak-password") {
            alert("Le mot de passe est trop faible.");
        }

        else if (error.code === "permission-denied") {
            alert("Accès Firestore refusé.");
        }

        else {
            alert("Erreur : " + error.message);
        }

        registerBtn.disabled = false;
        registerBtn.textContent = "Créer mon compte";
    }
});

