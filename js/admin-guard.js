import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    try {
        const profile = await getDoc(doc(db, "users", user.uid));
        const role = String(profile.data()?.role || "")
            .trim()
            .toLowerCase();

        if (!profile.exists() || role !== "admin") {
            console.warn("Accès admin refusé. UID:", user.uid, "Rôle:", role || "absent");
            window.location.replace("home.html");
        }
    } catch (error) {
        console.error("Impossible de vérifier le rôle administrateur :", error);
        alert("Impossible de vérifier le rôle administrateur dans Firestore. Vérifie les règles Firestore et le champ role du profil.");
        window.location.replace("login.html");
    }
});
