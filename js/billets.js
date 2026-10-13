import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where,

    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    onSnapshot

} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { getOfficialDepartureTimes } from "./ferry-schedule.js";

//import {
 //   doc,
   // getDoc
//} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

console.log("🎟️ BILLETS JS CHARGÉ");

// ======================================================
// 💰 TARIFS E-GORÉE
// ======================================================

const tariffs = {

    senegalese_resident: {
        adult: 1500,
        child: 500
    },

    resident_africa: {
        adult: 2700,
        child: 1700
    },

    non_resident_africa: {
        adult: 5200,
        child: 2700
    }

};
let userTariffCategory =
    "";

let currentTariffs =
    tariffs.non_resident_africa;


function updatePrices() {

    const adultPrice =
        currentTariffs.adult;

    const childPrice =
        currentTariffs.child;


    const subtotal =
        qty.adult * adultPrice +
        qty.child * childPrice;


    const priceSub =
        document.getElementById(
            "price-sub"
        );

    const priceTotal =
        document.getElementById(
            "price-total"
        );


    if (priceSub) {

        priceSub.textContent =
            subtotal.toLocaleString(
                "fr-FR"
            ) + " F";
    }


    if (priceTotal) {

        priceTotal.textContent =
            subtotal.toLocaleString(
                "fr-FR"
            ) + " F CFA";
    }


    // Affichage facultatif des tarifs
    const adultPriceElement =
        document.getElementById(
            "adult-price"
        );

    const childPriceElement =
        document.getElementById(
            "child-price"
        );


    if (adultPriceElement) {

        adultPriceElement.textContent =
            adultPrice.toLocaleString("fr-FR");
    }


    if (childPriceElement) {

        childPriceElement.textContent =
            childPrice.toLocaleString("fr-FR");
    }
}

// ======================================================
// VARIABLES
// ======================================================

let departures = [];
let selectedDeparture = null;
let currentUser = null;
let selectedPay = "Orange Money";

let qty = {
    adult: 1,
    child: 0
};

updatePrices();

//const PRICE = {
    //adult: currentTariffs.adult,
    //child: currentTariffs.child
//};

// ======================================================
// 👤 CATÉGORIE TARIFAIRE UTILISATEUR
// ======================================================



// ======================================================

const dateInput = document.getElementById("bl-date");
const routeInput = document.getElementById("bl-depart");
const timeInput = document.getElementById("bl-heure");
const tariffCategorySelect = document.getElementById("tariff-category");

const availabilityMessage =
    document.getElementById("availability-message");

const buyBtn =
    document.getElementById("buy-ticket-btn");

const historyBtn =
    document.getElementById("historyBtn");

const newTicketBtn =
    document.getElementById("new-ticket-btn");

const payWrap =
    document.getElementById("pay-methods");

if (tariffCategorySelect) {
    tariffCategorySelect.addEventListener("change", () => {
        const category = tariffCategorySelect.value;
        if (!tariffs[category]) return;

        userTariffCategory = category;
        currentTariffs = tariffs[category];
        updatePrices();
        updatePrice();
    });
}

// ======================================================
// UTILISATEUR CONNECTÉ
// ======================================================

onAuthStateChanged(auth, async (user) => {

    if (user) {

        currentUser = user;

        console.log(
            "👤 Utilisateur connecté :",
            user.email
        );

    } else {

        currentUser = null;

        console.log(
            "⚠️ Aucun utilisateur connecté"
        );
    }
});

// ======================================================
// NORMALISER UNE HEURE
// ======================================================

function normalizeTime(time) {

    if (!time) {
        return "";
    }

    let value = String(time).trim();

    // Supprimer secondes éventuelles
    // 10:00:00 → 10:00
    const parts = value.split(":");

    if (parts.length < 2) {
        return "";
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return "";
    }

    return (
        String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0")
    );
}

// ======================================================
// NORMALISER UNE DATE
// ======================================================

function normalizeDate(date) {

    if (!date) {
        return "";
    }

    return String(date).trim().substring(0, 10);
}

// ======================================================
// DATE MINIMUM = AUJOURD'HUI
// ======================================================

function setMinDate() {

    if (!dateInput) {
        return;
    }

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    dateInput.min =
        `${year}-${month}-${day}`;
}

// ======================================================
// CHARGER LES DÉPARTS FIRESTORE
// ======================================================

async function loadDepartures() {

    try {

        console.log(
            "🔥 Chargement des départs Firestore..."
        );

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "departures"
                )
            );

        departures = [];

        snapshot.forEach((departureDoc) => {

            const data =
                departureDoc.data();

            const departure = {

                id:
                    departureDoc.id,

                date:
                    normalizeDate(data.date),

                time:
                    normalizeTime(data.time),

                route:
                    data.route || "",

                places:
                    Number(
                        data.places ?? 0
                    ),

                availablePlaces:
                    Number(
                        data.availablePlaces ??
                        data.places ??
                        0
                    ),

                blocked:
                    data.blocked === true
            };

            // On ignore les départs sans date ou heure
            if (
                departure.date &&
                departure.time
            ) {

                departures.push(
                    departure
                );
            }

        });

        // Trier par date puis heure

        departures.sort((a, b) => {

            const dateA =
                `${a.date} ${a.time}`;

            const dateB =
                `${b.date} ${b.time}`;

            return dateA.localeCompare(
                dateB
            );
        });

        console.log(
            "🚢 Départs chargés :",
            departures
        );

        updateTimeOptions();

    } catch (error) {

        console.error(
            "🔥 Erreur Firestore départs :",
            error
        );

        showAvailability(
            "error",
            "❌ Impossible de charger les horaires."
        );
    }
}

// ======================================================
// AFFICHER LES HORAIRES
// ======================================================

function updateTimeOptions() {

    if (!dateInput || !timeInput) {
        return;
    }

    const selectedDate =
        normalizeDate(
            dateInput.value
        );

    selectedDeparture = null;

    if (buyBtn) {
        buyBtn.disabled = true;
    }

    timeInput.value = "";

    if (!selectedDate) {

        timeInput.disabled = true;

        showAvailability(
            "warning",
            "📅 Choisissez d'abord une date."
        );

        updateSummary();

        return;
    }

    const officialTimes = getOfficialDepartureTimes(
        selectedDate,
        routeInput?.value
    );
    const dayDepartures = officialTimes.map((time) => {
        return departures.find((departure) => {
            return (
                normalizeDate(departure.date) === selectedDate &&
                normalizeTime(departure.time) === time &&
                (!departure.route || departure.route === routeInput?.value)
            );
        });
    }).filter(Boolean);

    timeInput.innerHTML = [
        '<option value="">Choisissez une heure officielle</option>',
        ...officialTimes.map((time) => `<option value="${time}">${time}</option>`)
    ].join("");

    timeInput.disabled = false;

    if (officialTimes.length === 0) {
        showAvailability("warning", "⚠️ Aucun horaire officiel disponible pour cette date.");
    } else {

        const blockedTimes =
            dayDepartures
                .filter((departure) => departure.blocked || departure.availablePlaces <= 0)
                .map((departure) => normalizeTime(departure.time));

        if (blockedTimes.length > 0) {
            showAvailability(
                "warning",
                `⚠️ Certaines heures sont bloquées ou complètes : ${blockedTimes.join(", ")}.`
            );
        } else {
            showAvailability(
                "warning",
                "🕐 Choisissez une heure disponible."
            );
        }
    }

    updateSummary();
}

// ======================================================
// CHANGEMENT DATE
// ======================================================

if (dateInput) {

    dateInput.addEventListener(
        "change",
        () => {

            console.log(
                "📅 Date choisie :",
                dateInput.value
            );

            updateTimeOptions();
        }
    );
}

// ======================================================
// CHANGEMENT TRAJET
// ======================================================

if (routeInput) {

    routeInput.addEventListener(
        "change",
        () => {

            updateTimeOptions();
            updateSummary();

        }
    );
}

// ======================================================
// CHANGEMENT HEURE
// ======================================================

if (timeInput) {

    timeInput.addEventListener(
        "input",
        () => {

            const selectedDate =
                normalizeDate(
                    dateInput.value
                );

            const selectedTime =
                normalizeTime(
                    timeInput.value
                );

            selectedDeparture = null;

            if (buyBtn) {
                buyBtn.disabled = true;
            }

            if (
                !selectedDate ||
                !selectedTime
            ) {

                updateSummary();

                return;
            }

            const departure =
                departures.find(
                    (item) => {
                        return (
                            normalizeDate(
                                item.date
                            ) === selectedDate &&
                            normalizeTime(item.time) === selectedTime &&
                            (!item.route || item.route === routeInput?.value)
                        );
                    }
                );

            if (departure) {

                if (departure.blocked) {
                    showAvailability(
                        "error",
                        "🔴 Ce départ est bloqué par l'administration."
                    );
                    timeInput.value = "";
                    updateSummary();
                    return;
                }

                if (departure.availablePlaces <= 0) {
                    showAvailability(
                        "error",
                        "❌ Ce départ est complet."
                    );
                    timeInput.value = "";
                    updateSummary();
                    return;
                }

                const passengers =
                    qty.adult +
                    qty.child;

                if (
                    departure.availablePlaces <
                    passengers
                ) {
                    showAvailability(
                        "error",
                        `❌ Il ne reste que ${departure.availablePlaces} place(s).`
                    );
                    updateSummary();
                    return;
                }
            }

            selectedDeparture =
                departure || {
                    id: `custom-${selectedDate}-${selectedTime}`,
                    date: selectedDate,
                    time: selectedTime,
                    route: routeInput?.value || "",
                    availablePlaces: 999,
                    blocked: false,
                    places: 999
                };

            if (buyBtn) {
                buyBtn.disabled = false;
            }

            showAvailability(
                "ok",
                departure
                    ? `✅ Départ disponible — ${departure.availablePlaces} place(s) restante(s).`
                    : `✅ Heure sélectionnée — ${selectedTime}`
            );

            updateSummary();
        }
    );

    timeInput.addEventListener(
        "change",
        () => {
            timeInput.dispatchEvent(
                new Event("input")
            );
        }
    );
}

// ======================================================
// QUANTITÉS
// ======================================================

window.changeQty =
function (type, delta) {

    const minimum =
        type === "adult"
            ? 1
            : 0;

    qty[type] =
        Math.max(
            minimum,
            qty[type] + delta
        );

    const element =
        document.getElementById(
            "qty-" + type
        );

    if (element) {

        element.textContent =
            qty[type];
    }

    updatePrice();

    // Re-vérifier le départ

    if (selectedDeparture) {

        const passengers =
            qty.adult +
            qty.child;

        if (
            selectedDeparture.availablePlaces <
            passengers
        ) {

            if (buyBtn) {
                buyBtn.disabled = true;
            }

            showAvailability(
                "error",
                `❌ Seulement ${selectedDeparture.availablePlaces} place(s) disponible(s).`
            );

        } else {

            if (buyBtn) {
                buyBtn.disabled = false;
            }

            showAvailability(
                "ok",
                `✅ ${selectedDeparture.availablePlaces} place(s) disponible(s).`
            );
        }
    }
};

// ======================================================
// PRIX
// ======================================================

function updatePrice() {

    const total =
    qty.adult *
    currentTariffs.adult +

    qty.child *
    currentTariffs.child;

    const priceSub =
        document.getElementById(
            "price-sub"
        );

    const priceTotal =
        document.getElementById(
            "price-total"
        );

    if (priceSub) {

        priceSub.textContent =
            total.toLocaleString(
                "fr-FR"
            ) + " F";
    }

    if (priceTotal) {

        priceTotal.textContent =
            total.toLocaleString(
                "fr-FR"
            ) + " F CFA";
    }
}

// ======================================================
// RÉSUMÉ
// ======================================================

function updateSummary() {

    const summaryDate =
        document.getElementById(
            "summary-date"
        );

    const summaryRoute =
        document.getElementById(
            "summary-route"
        );

    const summaryTime =
        document.getElementById(
            "summary-time"
        );

    if (summaryDate) {

        summaryDate.textContent =
            dateInput?.value ||
            "—";
    }

    if (summaryRoute) {

        summaryRoute.textContent =
            routeInput?.value ||
            "—";
    }

    if (summaryTime) {

        summaryTime.textContent =
            timeInput?.value ||
            "—";
    }
}

// ======================================================
// MESSAGE DISPONIBILITÉ
// ======================================================

function showAvailability(
    type,
    message
) {

    if (!availabilityMessage) {
        return;
    }

    availabilityMessage.className =
        "availability-message " +
        type;

    availabilityMessage.textContent =
        message;

    availabilityMessage.style.display =
        "block";
}

// ======================================================
// MODE DE PAIEMENT
// ======================================================

if (payWrap) {

    payWrap.addEventListener(
        "click",
        (event) => {

            const chip =
                event.target.closest(
                    ".pay-chip"
                );

            if (!chip) {
                return;
            }

            document
                .querySelectorAll(
                    ".pay-chip"
                )
                .forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );

            chip.classList.add(
                "active"
            );

            selectedPay =
                chip.dataset.pay;

            console.log(
                "💳 Paiement :",
                selectedPay
            );
        }
    );
}

// ======================================================
// ACHETER LE BILLET
// ======================================================

if (buyBtn) {

    buyBtn.addEventListener(
        "click",
        async () => {

            // Utilisateur

            if (!currentUser) {

                alert(
                    "Veuillez vous connecter avant d'acheter un billet."
                );

                return;
            }

            if (!tariffCategorySelect?.value || !tariffs[tariffCategorySelect.value]) {
                alert("Veuillez choisir votre catégorie tarifaire.");
                return;
            }

            // Date

            if (!dateInput.value) {

                alert(
                    "📅 Veuillez choisir une date."
                );

                return;
            }

            // Heure

            if (!timeInput.value) {

                alert(
                    "🕐 Veuillez choisir une heure de départ."
                );

                return;
            }

            // Départ

            if (!selectedDeparture) {

                alert(
                    "🚢 Veuillez choisir un départ disponible."
                );

                return;
            }

            // Vérification supplémentaire Firestore

            if (
                selectedDeparture.blocked
            ) {

                alert(
                    "🔴 Ce départ est bloqué."
                );

                return;
            }

            const passengers =
                qty.adult +
                qty.child;

            if (
                selectedDeparture.availablePlaces <
                passengers
            ) {

                alert(
                    "❌ Il n'y a pas assez de places disponibles."
                );

                return;
            }

            const total =
                qty.adult * currentTariffs.adult +
                qty.child * currentTariffs.child;

            const heure =
                normalizeTime(
                    selectedDeparture.time
                );

            // ==================================================
            // CALCUL ARRIVÉE
            // ==================================================

            const parts =
                heure.split(":");

            const h =
                Number(parts[0]);

            const m =
                Number(parts[1]);

            const arrivalMinutes =
                h * 60 +
                m +
                20;

            const arrivalHour =
                Math.floor(
                    arrivalMinutes / 60
                ) % 24;

            const arrivalMinute =
                arrivalMinutes % 60;

            const arrivee =
                String(arrivalHour)
                    .padStart(2, "0")
                +
                ":" +
                String(arrivalMinute)
                    .padStart(2, "0");

            // ==================================================
            // ID BILLET
            // ==================================================

            const ticketId =
                "GR-" +
                Math.random()
                    .toString(36)
                    .substring(2, 8)
                    .toUpperCase();

            try {

                buyBtn.disabled = true;

                buyBtn.textContent =
                    "Génération du billet...";

                // ==================================================
                // ENREGISTRER LE BILLET
                // ==================================================

                const ticketRef = await addDoc(
                    collection(
                        db,
                        "tickets"
                    ),
                    {

                        ticketId:

                            ticketId,

                        userId:

                            currentUser.uid,

                        email:

                            currentUser.email,

                        date:

                            normalizeDate(
                                dateInput.value
                            ),

                        route:

                            routeInput.value,

                        depart:

                            heure,

                        arrivee:

                            arrivee,

                        adult:

                            qty.adult,

                        child:

                            qty.child,

                        passengers:

                            passengers,

                        total:

                            total,

                        payment:

                            selectedPay,

                        tariffCategory:

                            userTariffCategory,

                        departureId:

                            selectedDeparture.id,

                      status: "pending",

paymentStatus: "pending",
                        createdAt:

                            serverTimestamp()
                    }
                );
                // ==================================================
// 🟠 SURVEILLER LE PAIEMENT ORANGE
// ==================================================

if (selectedPay === "Orange Money") {

    console.log(
        "🟠 Paiement Orange en attente..."
    );

    buyBtn.disabled = true;

    buyBtn.textContent =
        "En attente du paiement...";


    const unsubscribe =
        onSnapshot(
            ticketRef,
            (snapshot) => {

                if (!snapshot.exists()) {
                    console.error(
                        "❌ Ticket introuvable."
                    );
                    return;
                }

                const ticket =
                    snapshot.data();

                console.log(
                    "🎫 État paiement :",
                    ticket.paymentStatus
                );


                // ======================================
                // 🟢 PAIEMENT CONFIRMÉ
                // ======================================

                if (
                    ticket.paymentStatus === "paid" &&
                    ticket.status === "confirmed"
                ) {

                    console.log(
                        "✅ Paiement Orange confirmé !"
                    );

                    unsubscribe();


                    renderNewTicket({
                        id:
                            ticket.ticketId,

                        date:
                            ticket.date,

                        route:
                            ticket.route,

                        depart:
                            ticket.depart,

                        arrivee:
                            ticket.arrivee,

                        adult:
                            ticket.adult,

                        child:
                            ticket.child,

                        total:
                            ticket.total,

                        pay:
                            ticket.payment
                    });


                    alert(
                        "✅ Paiement confirmé ! Votre billet est disponible."
                    );


                    buyBtn.disabled = true;

                    buyBtn.textContent =
                        "Billet confirmé";

                }

            }
        );

}

                // ==================================================
                // METTRE À JOUR LES PLACES SEULEMENT SI LE DÉPART
                // EXISTE BIEN DANS FIRESTORE
                // ==================================================

                const isCustomDeparture =
                    String(
                        selectedDeparture.id
                    ).startsWith("custom-");

                if (
    !isCustomDeparture &&
    selectedPay !== "Orange Money"
)  {

                    const newAvailablePlaces =
                        selectedDeparture
                            .availablePlaces -
                        passengers;

                    

                    console.log(
                        "🪑 Places restantes :",
                        newAvailablePlaces
                    );

                } else {

                    console.log(
                        "📝 Heure libre choisie : pas de mise à jour Firestore des départs."
                    );

                }

                console.log(
                    "🎟️ Billet enregistré :",
                    ticketId
                );

                // ==================================================
// 🟢 AFFICHER LE BILLET
// ==================================================

if (selectedPay !== "Orange Money") {

    renderNewTicket({

        id:
            ticketId,

        date:
            dateInput.value,

        route:
            routeInput.value,

        depart:
            heure,

        arrivee:
            arrivee,

        adult:
            qty.adult,

        child:
            qty.child,

        total:
            total,

        pay:
            selectedPay

    });

} else {

    console.log(
        "🟠 Paiement Orange en attente de confirmation..."
    );

}


                // ==================================================
// 🌊 WAVE
// ==================================================

if (selectedPay === "Wave") {

    await payWithWave({

        id: ticketId,

        total: total

    });

    return;
}


// ==================================================
// 🟠 ORANGE MONEY
// ==================================================

if (selectedPay === "Orange Money") {

   console.log(
       "🟠 Orange Money sélectionné — lancement..."
    );

    await payWithOrange({

       id: ticketId,

       total: total

    });

    return;
}



// ==================================================
// AUTRES MOYENS
// ==================================================

alert(
    "✅ Billet généré avec succès !"
);
// ======================================================
// 🟠 PAIEMENT ORANGE MONEY
// ======================================================

async function payWithOrange(ticket) {

    console.log("🟠 Lancement du paiement Orange Money...");

    if (!ticket || !ticket.id) {
        alert("❌ Impossible de lancer le paiement Orange Money.");
        return;
    }

    try {

        if (!currentUser) {
            throw new Error("Connexion requise pour payer ce billet.");
        }
        const idToken = await currentUser.getIdToken();

        const response = await fetch(
            "http://localhost:3001/api/orange/create-payment",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },

                body: JSON.stringify({
                    reference: ticket.id
                })
            }
        );

        const data = await response.json();
        if (Number.isFinite(Number(data.amount))) ticket.total = Number(data.amount);

        console.log(
            "🟠 Réponse backend Orange :",
            data
        );

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Impossible de créer le paiement Orange Money."
            );
        }

        const orange = data.orangeResponse;

        if (!orange) {
            throw new Error(
                "Orange n'a retourné aucune information de paiement."
            );
        }

        console.log(
            "🟠 Paiement Orange créé :",
            orange
        );

        showOrangePayment(
            ticket,
            orange
        );

    } catch (error) {

        console.error(
            "🔥 Erreur paiement Orange :",
            error
        );

        alert(
            "❌ Impossible de lancer le paiement Orange Money.\n\n" +
            error.message
        );
    }
}


// ======================================================
// 🟠 FENÊTRE PAIEMENT ORANGE
// ======================================================

function showOrangePayment(ticket, orange) {

    const existing =
        document.getElementById(
            "orange-payment-modal"
        );

    if (existing) {
        existing.remove();
    }

    const qrData =
        orange.qrCode || "";

    const deepLink =
        orange.deepLinks?.OM ||
        orange.deepLink ||
        orange.shortLink ||
        "";

    const modal =
        document.createElement("div");

    modal.id =
        "orange-payment-modal";

    modal.innerHTML = `

        <div class="orange-payment-overlay">

            <div class="orange-payment-card">

                <button
                    class="orange-close"
                    id="orange-close-btn"
                    type="button"
                >
                    ×
                </button>

                <div class="orange-logo">
                    🟠
                </div>

                <h2>
                    Paiement Orange Money
                </h2>

                <p class="orange-reference">
                    Billet ${ticket.id}
                </p>

                <div class="orange-amount">

                    ${Number(ticket.total)
                        .toLocaleString("fr-FR")}

                    F CFA

                </div>

                <p class="orange-instruction">

                    Scannez le QR code avec
                    Orange Money ou ouvrez
                    directement l'application.

                </p>

                <div
                    id="orange-payment-qr"
                    class="orange-payment-qr"
                ></div>

                ${
                    deepLink
                    ?
                    `
                    <button
                        id="orange-open-btn"
                        class="orange-open-btn"
                        type="button"
                    >
                        🟠 Ouvrir Orange Money
                    </button>
                    `
                    :
                    ""
                }

                <p class="orange-waiting">
                    ⏳ Paiement en attente...
                </p>

            </div>

        </div>
    `;

    document.body.appendChild(modal);


    // ==================================================
    // GÉNÉRER LE QR
    // ==================================================

    const qrContainer =
        document.getElementById(
            "orange-payment-qr"
        );

    if (
        qrContainer &&
        qrData &&
        typeof QRCode !== "undefined"
    ) {

        try {

            new QRCode(
                qrContainer,
                {
                    text: String(qrData),

                    width: 220,

                    height: 220,

                    correctLevel:
                        QRCode.CorrectLevel.M
                }
            );

        } catch (error) {

            console.error(
                "❌ Erreur QR Orange :",
                error
            );

        }

    }


    // ==================================================
    // OUVRIR ORANGE MONEY
    // ==================================================

    const openButton =
        document.getElementById(
            "orange-open-btn"
        );

    if (
        openButton &&
        deepLink
    ) {

        openButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    deepLink;

            }
        );
    }


    // ==================================================
    // FERMER
    // ==================================================

    const closeButton =
        document.getElementById(
            "orange-close-btn"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                modal.remove();

            }
        );
    }
}

// ==================================================
// AUTRES MOYENS DE PAIEMENT
// ==================================================

alert(
    "✅ Billet généré avec succès !"
);


// Recharger

await loadDepartures();

selectedDeparture = null;

timeInput.value = "";

buyBtn.disabled = true;

updateSummary();

                selectedDeparture = null;

                timeInput.value = "";

                buyBtn.disabled = true;

                updateSummary();

            } catch (error) {

                console.error(
                    "🔥 Erreur achat billet :",
                    error
                );

                alert(
                    "❌ Impossible de générer le billet :\n" +
                    error.message
                );

            } finally {

                buyBtn.textContent =
                    "Payer et générer le billet";
            }
        }
    );
}

// ======================================================
// 🌊 PAIEMENT WAVE
// ======================================================

async function payWithWave(ticket) {

    console.log("🌊 Lancement du paiement Wave...");

    if (!ticket || !ticket.id) {

        console.error("❌ Billet invalide.");

        alert(
            "❌ Impossible de lancer le paiement Wave."
        );

        return;
    }

    try {

        if (!currentUser) {
            throw new Error("Connexion requise pour payer ce billet.");
        }
        const idToken = await currentUser.getIdToken();

        const response = await fetch(
            "http://localhost:3001/api/wave/create-checkout",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },

                body: JSON.stringify({

                    ticketId: ticket.id,

                    successUrl:
                        window.location.origin +
                        "/pages/paiement-success.html?ticket=" +
                        encodeURIComponent(ticket.id),

                    errorUrl:
                        window.location.origin +
                        "/pages/paiement-error.html?ticket=" +
                        encodeURIComponent(ticket.id)

                })
            }
        );


        const data = await response.json();
        if (Number.isFinite(Number(data.amount))) ticket.total = Number(data.amount);


        console.log(
            "🌊 Réponse backend Wave :",
            data
        );


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Impossible de créer le paiement Wave."
            );

        }


        if (!data.waveLaunchUrl) {

            throw new Error(
                "Wave n'a pas retourné de lien de paiement."
            );

        }


        console.log(
            "✅ Paiement Wave créé."
        );

        console.log(
            "🌊 Redirection vers Wave..."
        );


        window.location.href =
            data.waveLaunchUrl;


    } catch (error) {

        console.error(
            "🔥 Erreur paiement Wave :",
            error
        );

        alert(
            "❌ Impossible de lancer le paiement Wave.\n\n" +
            error.message
        );

    }

}

// ======================================================
// QR CODE VISUEL
// ======================================================

// ======================================================
// VRAI QR CODE
// ======================================================
function generateQRCode(ticket) {

    if (!ticket || !ticket.id) {
        console.error("❌ Billet invalide pour le QR code");
        return;
    }

    // Le conteneur correspond à :
    // id="qr-${ticket.id}"
    const qrContainer = document.getElementById(
        `qr-${ticket.id}`
    );

    if (!qrContainer) {
        console.error(
            `❌ Conteneur QR introuvable : qr-${ticket.id}`
        );
        return;
    }

    // Nettoyer le conteneur
    qrContainer.innerHTML = "";

    /*
     * IMPORTANT :
     * On met uniquement l'identifiant du billet
     * dans le QR.
     *
     * Exemple :
     * GR-UZ4HRP
     *
     * Les autres informations restent dans Firestore.
     */
    const qrData = String(ticket.id);

    console.log(
        "📱 Génération QR :",
        qrData
    );

    try {

        new QRCode(
            qrContainer,
            {
                text: qrData,

                width: 150,
                height: 150,

                correctLevel:
                    QRCode.CorrectLevel.M
            }
        );

        console.log(
            "✅ QR code généré :",
            qrData
        );

    } catch (error) {

        console.error(
            "❌ Erreur génération QR :",
            error
        );

        qrContainer.innerHTML = `
            <div style="
                width:150px;
                height:150px;
                display:flex;
                align-items:center;
                justify-content:center;
                text-align:center;
                font-size:11px;
                color:#b42318;
                border:1px solid #f0b8b8;
                border-radius:8px;
                padding:10px;
                box-sizing:border-box;
            ">
                QR indisponible
            </div>
        `;
    }
}

// ======================================================
// AFFICHER LE BILLET
// ======================================================

function renderNewTicket(ticket) {

    const slot =
        document.getElementById(
            "new-ticket-slot"
        );

    if (!slot) {
        return;
    }

    let type = "";

    if (
        ticket.adult &&
        ticket.child
    ) {

        type =
            `${ticket.adult} adulte(s) · ${ticket.child} enfant(s)`;

    } else if (
        ticket.adult
    ) {

        type =
            `${ticket.adult} adulte(s)`;

    } else {

        type =
            `${ticket.child} enfant(s)`;
    }

    slot.innerHTML = `

        <div class="ticket-stub">

            <div class="ticket-top">

                <div class="route">
                    ${ticket.route}
                </div>

                <div class="sub">
                    Billet n° ${ticket.id}
                    · payé via ${ticket.pay}
                </div>

            </div>

            <div class="ticket-perforation"></div>

            <div class="ticket-body">

                <div class="ticket-details">

                    <div>

                        <div class="lab">
                            Date
                        </div>

                        <div class="val">
                            ${ticket.date}
                        </div>

                    </div>

                    <div>

                        <div class="lab">
                            Départ
                        </div>

                        <div class="val">
                            ${ticket.depart}
                        </div>

                    </div>

                    <div>

                        <div class="lab">
                            Arrivée
                        </div>

                        <div class="val">
                            ${ticket.arrivee}
                        </div>

                    </div>

                    <div>

                        <div class="lab">
                            Passagers
                        </div>

                        <div
                            class="val"
                            style="
                                font-family:var(--font);
                                font-size:11.5px;
                            "
                        >
                            ${type}
                        </div>

                    </div>

                    <div>

                        <div class="lab">
                            Prix
                        </div>

                        <div class="val">
                            ${ticket.total.toLocaleString("fr-FR")} F
                        </div>

                    </div>

                </div>

               <div
    class="qr"
    id="qr-${ticket.id}">
</div>
            </div>

        </div>
    `;
    generateQRCode(ticket);
}

// ======================================================
// HISTORIQUE
// ======================================================

async function renderHistory() {

    const list =
        document.getElementById(
            "history-list"
        );

    if (!list) {
        return;
    }

    if (!currentUser) {

        list.innerHTML = `
            <div class="empty-history">
                Veuillez vous connecter pour voir vos billets.
            </div>
        `;

        return;
    }

    list.innerHTML = `
        <div class="empty-history">
            Chargement...
        </div>
    `;

    try {

        const snapshot =
            await getDocs(
                query(collection(db, "tickets"), where("userId", "==", currentUser.uid))
            );

        const tickets = [];

        snapshot.forEach(
            (ticketDoc) => {

                const data =
                    ticketDoc.data();

                if (
                    data.userId ===
                    currentUser.uid
                ) {

                    tickets.push(
                        { id: ticketDoc.id, ...data }
                    );
                }
            }
        );

        if (
            tickets.length === 0
        ) {

            list.innerHTML = `
                <div class="empty-history">
                    Aucun billet acheté pour l'instant.
                </div>
            `;

            return;
        }

        tickets.sort(
            (a, b) => {

                const dateA =
                    `${a.date || ""} ${a.depart || ""}`;

                const dateB =
                    `${b.date || ""} ${b.depart || ""}`;

                return dateB.localeCompare(
                    dateA
                );
            }
        );

        list.innerHTML =
            tickets.map(
                (ticket) => {

                    return `

                        <div class="history-item">

                            <div class="ic">
                                🎟️
                            </div>

                            <div class="txt">

                                <div class="r">
                                    ${ticket.route || ""}
                                </div>

                                <div class="m">

                                    ${ticket.date || ""}
                                    ·
                                    ${ticket.depart || ""}
                                    →
                                    ${ticket.arrivee || ""}

                                    ·

                                    ${ticket.adult || 0}
                                    ad.

                                    ${ticket.child || 0}
                                    enf.

                                </div>

                            </div>

                            <div class="p">

                                ${Number(
                                    ticket.total || 0
                                ).toLocaleString("fr-FR")}

                                F

                            </div>

                            <div class="ticket-cancellation">
                                ${ticket.status === "cancelled"
                                    ? (ticket.refundStatus === "refunded" ? "Billet annulé · remboursé" : ticket.refundStatus === "manual_refunded" ? "Billet annulé · remboursement confirmé" : "Billet annulé")
                                    : ticket.cancellationStatus === "requested"
                                        ? "Annulation en attente"
                                        : ticket.cancellationStatus === "rejected"
                                            ? "Demande refusée"
                                            : ticket.paymentStatus === "paid"
                                                ? `<button type="button" class="request-cancellation-btn" data-ticket-id="${ticket.id}">Demander l’annulation</button>`
                                                : "Paiement en attente"}
                            </div>

                        </div>

                    `;
                }
            ).join("");

    } catch (error) {

        console.error(
            "🔥 Erreur historique :",
            error
        );

        list.innerHTML = `
            <div class="empty-history">
                ❌ Impossible de charger l'historique.
            </div>
        `;
    }
}

document.getElementById("history-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest(".request-cancellation-btn");
    if (!button || !currentUser) return;
    if (!confirm("Envoyer une demande d’annulation à l’administrateur ?")) return;

    button.disabled = true;
    try {
        await updateDoc(doc(db, "tickets", button.dataset.ticketId), {
            cancellationStatus: "requested",
            cancellationRequestedAt: serverTimestamp()
        });
        await renderHistory();
    } catch (error) {
        console.error("Demande d’annulation impossible :", error);
        alert("Impossible d’envoyer la demande. Vérifie les règles Firestore puis réessaie.");
        button.disabled = false;
    }
});

// ======================================================
// AFFICHER HISTORIQUE
// ======================================================

function showHistory() {

    const purchase =
        document.getElementById(
            "billet-purchase"
        );

    const history =
        document.getElementById(
            "billet-history"
        );

    if (purchase) {

        purchase.style.display =
            "none";
    }

    if (history) {

        history.style.display =
            "block";
    }

    renderHistory();
}

// ======================================================
// REVENIR À L'ACHAT
// ======================================================

function showPurchase() {

    const purchase =
        document.getElementById(
            "billet-purchase"
        );

    const history =
        document.getElementById(
            "billet-history"
        );

    if (purchase) {

        purchase.style.display =
            "block";
    }

    if (history) {

        history.style.display =
            "none";
    }
}

// ======================================================
// HISTORIQUE
// ======================================================

if (historyBtn) {

    historyBtn.addEventListener(
        "click",
        showHistory
    );
}

// ======================================================
// NOUVEAU BILLET
// ======================================================

if (newTicketBtn) {

    newTicketBtn.addEventListener(
        "click",
        showPurchase
    );
}

// ======================================================
// INITIALISATION
// ======================================================

setMinDate();

updatePrice();

updateSummary();

loadDepartures();

console.log(
    "✅ BILLETS JS PRÊT"
);
