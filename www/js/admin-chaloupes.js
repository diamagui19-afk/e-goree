import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const API_BASE = "http://localhost:3001";
const list = document.getElementById("adminTicketsList");
const status = document.getElementById("ticketsStatus");
const filter = document.getElementById("ticketFilter");
let currentUser = null;
let tickets = [];

function formatStatus(ticket) {
    if (ticket.status === "cancelled") {
        if (ticket.refundStatus === "refunded") return "Annulé · remboursé via Wave";
        if (ticket.refundStatus === "manual_refunded") return "Annulé · remboursement manuel confirmé";
        if (ticket.refundStatus === "not_processed") return "Annulé · remboursement non effectué";
        return "Annulé";
    }
    if (ticket.cancellationStatus === "requested") return "Annulation demandée";
    if (ticket.cancellationStatus === "rejected") return "Demande refusée";
    if (ticket.paymentStatus === "paid") return "Acheté · payé";
    return `Paiement ${ticket.paymentStatus || "en attente"}`;
}

function renderTickets() {
    const visible = tickets.filter((ticket) => {
        if (filter.value === "requested") return ticket.cancellationStatus === "requested";
        if (filter.value === "cancelled") return ticket.status === "cancelled";
        if (filter.value === "paid") return ticket.paymentStatus === "paid" && ticket.status !== "cancelled";
        return true;
    });
    list.replaceChildren();
    if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "admin-card tickets-empty";
        empty.textContent = "Aucun billet dans cette catégorie.";
        list.append(empty);
        return;
    }
    for (const ticket of visible) {
        const card = document.createElement("article");
        card.className = "admin-card booking-card";
        const heading = document.createElement("div");
        heading.className = "booking-heading";
        const title = document.createElement("h2");
        title.textContent = `${ticket.route || "Traversée"} · ${ticket.ticketId || ticket.id}`;
        const badge = document.createElement("span");
        badge.className = "booking-status";
        badge.textContent = formatStatus(ticket);
        heading.append(title, badge);

        const details = document.createElement("p");
        details.textContent = `${ticket.date || "Date inconnue"} à ${ticket.depart || "heure inconnue"} · ${ticket.passengers || ((Number(ticket.adult) || 0) + (Number(ticket.child) || 0))} passager(s) · ${Number(ticket.total || 0).toLocaleString("fr-FR")} F CFA`;
        const owner = document.createElement("p");
        owner.textContent = `${ticket.email || "E-mail indisponible"} · ${ticket.payment || "Paiement inconnu"}`;
        card.append(heading, details, owner);

        if (ticket.cancellationStatus === "requested") {
            const actions = document.createElement("div");
            actions.className = "booking-actions";
            const approve = document.createElement("button");
            approve.type = "button";
            approve.className = "primary-btn";
            approve.textContent = "Accepter et rembourser";
            approve.addEventListener("click", () => decideCancellation(ticket, "approve", approve));
            const reject = document.createElement("button");
            reject.type = "button";
            reject.className = "reject-btn";
            reject.textContent = "Refuser";
            reject.addEventListener("click", () => decideCancellation(ticket, "reject", reject));
            actions.append(approve, reject);
            card.append(actions);
        }
        list.append(card);
    }
}

async function apiRequest(path, options = {}) {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.message || "Erreur serveur");
        error.code = data.code;
        throw error;
    }
    return data;
}

async function loadTickets() {
    status.textContent = "Chargement des billets…";
    try {
        const result = await apiRequest("/api/admin/tickets");
        tickets = result.tickets;
        status.textContent = `${tickets.length} billet(s) · ${tickets.filter((item) => item.cancellationStatus === "requested").length} demande(s) d’annulation en attente`;
        renderTickets();
    } catch (error) {
        console.error("Chargement admin des billets impossible :", error);
        status.textContent = "Impossible de charger les billets pour le moment.";
    }
}

async function decideCancellation(ticket, decision, button) {
    const waveAutoRefund = ticket.payment === "Wave" && ticket.paymentStatus === "paid";
    const prompt = decision === "approve"
        ? waveAutoRefund
            ? `Accepter l’annulation du billet ${ticket.ticketId || ticket.id} et lancer le remboursement Wave ?`
            : `Accepter l’annulation du billet ${ticket.ticketId || ticket.id} ? Le remboursement devra être effectué auprès de ${ticket.payment || "son fournisseur"}.`
        : `Refuser l’annulation du billet ${ticket.ticketId || ticket.id} ?`;
    if (!window.confirm(prompt)) return;
    button.disabled = true;
    try {
        const path = `/api/admin/tickets/${encodeURIComponent(ticket.id)}/cancellation`;
        const body = { decision };
        try {
            await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
        } catch (error) {
            if (decision !== "approve" || error.code !== "MANUAL_REFUND_CONFIRMATION_REQUIRED") throw error;
            const confirmed = window.confirm(`Effectue d’abord le remboursement ${ticket.payment || "du billet"} dans le portail marchand. Confirmer ensuite pour terminer l’annulation ?`);
            if (!confirmed) return;
            await apiRequest(path, { method: "POST", body: JSON.stringify({ decision, manualRefundConfirmed: true }) });
        }
        await loadTickets();
    } catch (error) {
        console.error("Traitement de la demande impossible :", error);
        window.alert(error.message);
        button.disabled = false;
    }
}

filter.addEventListener("change", renderTickets);
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
        window.location.replace("login.html");
        return;
    }
    loadTickets();
});
