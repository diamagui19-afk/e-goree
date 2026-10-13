import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const logoutBtn = document.getElementById("logoutBtn");
const status = document.getElementById("statsStatus");

async function loadOverview(user) {
    if (!user) return;
    status.textContent = "Chargement des statistiques…";
    try {
        const [usersSnapshot, departuresSnapshot, ticketsSnapshot] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "departures")),
            getDocs(collection(db, "tickets"))
        ]);

        const users = usersSnapshot.docs.filter((item) => {
            return String(item.data().role || "").trim().toLowerCase() !== "admin";
        });
        const departures = departuresSnapshot.docs.map((item) => item.data());
        const tickets = ticketsSnapshot.docs.map((item) => item.data());
        const purchasedTickets = tickets.filter((ticket) => {
            return ticket.paymentStatus === "paid" && ticket.status !== "cancelled";
        });
        const cancelledTickets = tickets.filter((ticket) => {
            return ticket.status === "cancelled" || ticket.cancellationStatus === "approved";
        });

        document.getElementById("usersCount").textContent = users.length;
        document.getElementById("departuresCount").textContent = departures.length;
        document.getElementById("ticketsCount").textContent = purchasedTickets.length;
        document.getElementById("blockedCount").textContent = departures.filter((item) => item.blocked === true).length;
        document.getElementById("purchasedTicketsCount").textContent = purchasedTickets.length;
        document.getElementById("cancelledTicketsCount").textContent = cancelledTickets.length;
        document.getElementById("pendingCancellationCount").textContent = tickets.filter((item) => item.cancellationStatus === "requested").length;
        status.textContent = "Totaux généraux";
    } catch (error) {
        console.error("Chargement des statistiques admin impossible :", error);
        status.textContent = error.code === "permission-denied"
            ? "Statistiques indisponibles : vérifie que les règles Firestore publiées autorisent la lecture par un compte admin."
            : `Statistiques indisponibles : ${error.message}`;
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) loadOverview(user);
});

logoutBtn?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Erreur de déconnexion :", error);
        alert("Erreur lors de la déconnexion : " + error.message);
    }
});
