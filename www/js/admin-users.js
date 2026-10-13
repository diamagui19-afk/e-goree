import { auth, db } from "./firebase.js";
import {
    collection,
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");
const usersStatus = document.getElementById("usersStatus");
const usersCount = document.getElementById("usersCount");
const usersSearch = document.getElementById("usersSearch");
const usersTableBody = document.getElementById("usersTableBody");
const usersTableWrap = document.querySelector(".users-table-wrap");

let users = [];

function setStatus(message, isError = false) {
    usersStatus.textContent = message;
    usersStatus.classList.toggle("is-error", isError);
    usersStatus.hidden = !message;
}

function formatDate(value) {
    if (!value || typeof value.toDate !== "function") return "—";
    return new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium"
    }).format(value.toDate());
}

function renderUsers() {
    const search = usersSearch.value.trim().toLocaleLowerCase("fr");
    const filteredUsers = users.filter((user) => {
        const searchable = `${user.fullName || ""} ${user.email || ""}`
            .toLocaleLowerCase("fr");
        return searchable.includes(search);
    });

    usersCount.textContent = String(users.length);
    usersTableBody.replaceChildren();

    for (const user of filteredUsers) {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        const emailCell = document.createElement("td");
        const roleCell = document.createElement("td");
        const dateCell = document.createElement("td");
        const roleBadge = document.createElement("span");
        const role = user.role === "admin" ? "admin" : "utilisateur";

        nameCell.textContent = user.fullName || "Nom non renseigné";
        emailCell.textContent = user.email || "E-mail non renseigné";
        roleBadge.className = `role-badge${role === "admin" ? " is-admin" : ""}`;
        roleBadge.textContent = role === "admin" ? "Administrateur" : "Utilisateur";
        roleCell.append(roleBadge);
        dateCell.textContent = formatDate(user.createdAt);
        row.append(nameCell, emailCell, roleCell, dateCell);
        usersTableBody.append(row);
    }

    usersTableWrap.hidden = false;
    setStatus(filteredUsers.length ? "" : "Aucun compte ne correspond à la recherche.");
}

async function loadUsers(user) {
    setStatus("Vérification du rôle administrateur…");

    const ownProfile = await getDoc(doc(db, "users", user.uid));
    const role = String(ownProfile.data()?.role || "")
        .trim()
        .toLowerCase();

    if (!ownProfile.exists() || role !== "admin") {
        window.location.replace("home.html");
        return;
    }

    setStatus("Chargement des utilisateurs…");
    const snapshot = await getDocs(collection(db, "users"));
    users = snapshot.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data()
    }));
    renderUsers();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    try {
        await loadUsers(user);
    } catch (error) {
        console.error("Erreur de chargement des utilisateurs :", error);
        setStatus(
            error.code === "permission-denied"
                ? "Accès refusé par les règles Firestore. Vérifie que le rôle admin est configuré et que les règles autorisent la liste des utilisateurs aux admins."
                : `Impossible de charger les utilisateurs : ${error.message}`,
            true
        );
    }
});

usersSearch.addEventListener("input", renderUsers);

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Erreur de déconnexion :", error);
        setStatus("La déconnexion a échoué. Réessaie.", true);
    }
});
