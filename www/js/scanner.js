// ======================================================
// 📱 E-GORÉE — SCANNER DE BILLETS
// QR → Ticket ID → Firestore → Vérification
// ======================================================

import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


console.log("📱 SCANNER E-GORÉE CHARGÉ");


// ======================================================
// VARIABLES
// ======================================================

let currentUser = null;
let currentTicket = null;
let scanner = null;
let scannerRunning = false;
let lastScannedCode = "";


// ======================================================
// ÉLÉMENTS HTML
// ======================================================

const scannerStatus =
    document.getElementById("scanner-status");

const ticketResult =
    document.getElementById("ticket-result");

const resultCard =
    document.getElementById("result-card");

const resultIcon =
    document.getElementById("result-icon");

const resultTitle =
    document.getElementById("result-title");

const ticketNumber =
    document.getElementById("ticket-number");

const ticketDate =
    document.getElementById("ticket-date");

const ticketRoute =
    document.getElementById("ticket-route");

const ticketDepart =
    document.getElementById("ticket-depart");

const ticketArrivee =
    document.getElementById("ticket-arrivee");

const ticketPassengers =
    document.getElementById("ticket-passengers");

const ticketTotal =
    document.getElementById("ticket-total");

const paymentStatus =
    document.getElementById("payment-status");

const usedMessage =
    document.getElementById("used-message");

const validateBtn =
    document.getElementById("validate-btn");

const scanAgainBtn =
    document.getElementById("scan-again-btn");

const manualTicketId =
    document.getElementById("manual-ticket-id");

const manualSearchBtn =
    document.getElementById("manual-search-btn");


// ======================================================
// 👤 UTILISATEUR CONNECTÉ
// ======================================================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            currentUser = user;

            console.log(
                "👤 Contrôleur connecté :",
                user.email
            );

        } else {

            currentUser = null;

            console.warn(
                "⚠️ Aucun utilisateur connecté."
            );
        }
    }
);


// ======================================================
// MESSAGE SCANNER
// ======================================================

function showScannerStatus(
    type,
    message
) {

    if (!scannerStatus) {
        return;
    }

    scannerStatus.className =
        "scanner-status " + type;

    scannerStatus.textContent =
        message;
}


// ======================================================
// NORMALISER LE NUMÉRO
// ======================================================

function normalizeTicketId(value) {

    return String(value || "")
        .trim()
        .toUpperCase();

}


// ======================================================
// EXTRAIRE LE NUMÉRO DU QR
// ======================================================

function extractTicketId(decodedText) {

    const text =
        String(decodedText || "").trim();

    if (!text) {
        return "";
    }

    /*
     * Le QR E-Gorée contient normalement :
     *
     * GR-UZ4HRP
     *
     * Compatibilité avec ancien QR JSON conservée.
     */

    try {

        const qrData =
            JSON.parse(text);

        if (qrData.ticketId) {

            return normalizeTicketId(
                qrData.ticketId
            );
        }

    } catch (error) {

        // Pas du JSON : on utilise directement le texte.
    }

    return normalizeTicketId(text);
}


// ======================================================
// 🔎 RECHERCHE FIRESTORE
// ======================================================

async function findTicket(ticketId) {

    const id =
        normalizeTicketId(ticketId);

    if (!id) {

        showScannerStatus(
            "error",
            "❌ Numéro de billet invalide."
        );

        return null;
    }

    console.log(
        "🔎 Recherche Firestore du billet :",
        id
    );

    try {

        const ticketsQuery =
            query(
                collection(
                    db,
                    "tickets"
                ),
                where(
                    "ticketId",
                    "==",
                    id
                )
            );

        const snapshot =
            await getDocs(
                ticketsQuery
            );

        if (snapshot.empty) {

            console.warn(
                "❌ Billet introuvable :",
                id
            );

            showScannerStatus(
                "error",
                "❌ Billet introuvable dans Firebase."
            );

            return null;
        }

        const ticketDoc =
            snapshot.docs[0];

        const foundTicket =
            ticketDoc.data();

        const ticket = {

            ...foundTicket,

            _documentId:
                ticketDoc.id
        };

        console.log(
            "🎟️ Billet Firebase trouvé :",
            ticket
        );

        return ticket;

    } catch (error) {

        console.error(
            "🔥 Erreur Firebase :",
            error
        );

        showScannerStatus(
            "error",
            "❌ Erreur lors de la vérification du billet."
        );

        return null;
    }
}


// ======================================================
// 🎟️ AFFICHER LE BILLET
// ======================================================

function displayTicket(ticket) {

    currentTicket =
        ticket;

    if (!ticketResult) {
        return;
    }

    ticketResult.classList.add(
        "show"
    );

    resultCard.classList.remove(
        "valid",
        "invalid"
    );


    // ==================================================
    // NUMÉRO
    // ==================================================

    ticketNumber.textContent =
        ticket.ticketId || "—";


    // ==================================================
    // DATE
    // ==================================================

    ticketDate.textContent =
        ticket.date || "—";


    // ==================================================
    // TRAJET
    // ==================================================

    ticketRoute.textContent =
        ticket.route || "—";


    // ==================================================
    // DÉPART
    // ==================================================

    ticketDepart.textContent =
        ticket.depart || "—";


    // ==================================================
    // ARRIVÉE
    // ==================================================

    ticketArrivee.textContent =
        ticket.arrivee || "—";


    // ==================================================
    // PASSAGERS
    // ==================================================

    const adults =
        Number(
            ticket.adult || 0
        );

    const children =
        Number(
            ticket.child || 0
        );

    let passengers = "";

    if (adults > 0) {

        passengers +=
            `${adults} adulte(s)`;
    }

    if (children > 0) {

        if (passengers) {
            passengers += " · ";
        }

        passengers +=
            `${children} enfant(s)`;
    }

    if (!passengers) {

        passengers =
            `${ticket.passengers || 0} passager(s)`;
    }

    ticketPassengers.textContent =
        passengers;


    // ==================================================
    // PRIX
    // ==================================================

    ticketTotal.textContent =
        Number(
            ticket.total || 0
        ).toLocaleString(
            "fr-FR"
        ) + " F CFA";


    // ==================================================
    // PAIEMENT
    // ==================================================

    displayPaymentStatus(
        ticket
    );


    // ==================================================
    // STATUT
    // ==================================================

    displayTicketStatus(
        ticket
    );
}


// ======================================================
// 💳 STATUT PAIEMENT
// ======================================================

function displayPaymentStatus(ticket) {

    const payment =
        String(
            ticket.paymentStatus || ""
        ).toLowerCase();

    paymentStatus.className =
        "payment-status";


    if (
        payment === "paid"
    ) {

        paymentStatus.textContent =
            "💳 Paiement : PAYÉ";

        paymentStatus.classList.add(
            "payment-paid"
        );

        return;
    }


    if (
        payment === "failed" ||
        payment === "cancelled"
    ) {

        paymentStatus.textContent =
            "❌ Paiement : ÉCHOUÉ";

        paymentStatus.classList.add(
            "payment-failed"
        );

        return;
    }


    paymentStatus.textContent =
        "⏳ Paiement : EN ATTENTE";

    paymentStatus.classList.add(
        "payment-pending"
    );
}


// ======================================================
// 📌 STATUT DU BILLET
// ======================================================

function displayTicketStatus(ticket) {

    const status =
        String(
            ticket.status || ""
        ).toLowerCase();

    usedMessage.classList.add(
        "hidden"
    );

    validateBtn.disabled =
        false;


    // ==================================================
    // DÉJÀ UTILISÉ
    // ==================================================

    if (
        status === "used"
    ) {

        resultCard.classList.add(
            "invalid"
        );

        resultIcon.textContent =
            "🚫";

        resultTitle.textContent =
            "Billet déjà utilisé";

        usedMessage.classList.remove(
            "hidden"
        );

        usedMessage.textContent =
            "🚫 Ce billet a déjà été utilisé.";

        validateBtn.disabled =
            true;

        showScannerStatus(
            "error",
            "🚫 Ce billet a déjà été utilisé."
        );

        return;
    }


    // ==================================================
    // ANNULÉ
    // ==================================================

    if (
        status === "cancelled"
    ) {

        resultCard.classList.add(
            "invalid"
        );

        resultIcon.textContent =
            "❌";

        resultTitle.textContent =
            "Billet annulé";

        validateBtn.disabled =
            true;

        showScannerStatus(
            "error",
            "❌ Ce billet est annulé."
        );

        return;
    }


    // ==================================================
    // PAIEMENT
    // ==================================================

    const payment =
        String(
            ticket.paymentStatus || ""
        ).toLowerCase();

    /*
     * IMPORTANT :
     *
     * Pour l'embarquement, on accepte
     * UNIQUEMENT :
     *
     * paymentStatus = paid
     */

    if (
        payment !== "paid"
    ) {

        resultCard.classList.add(
            "invalid"
        );

        resultIcon.textContent =
            "💳";

        resultTitle.textContent =
            "Paiement non confirmé";

        validateBtn.disabled =
            true;

        showScannerStatus(
            "warning",
            "⚠️ Paiement non confirmé."
        );

        return;
    }


    // ==================================================
    // STATUT CONFIRMÉ
    // ==================================================

    if (
        status !== "confirmed"
    ) {

        resultCard.classList.add(
            "invalid"
        );

        resultIcon.textContent =
            "⚠️";

        resultTitle.textContent =
            "Billet non confirmé";

        validateBtn.disabled =
            true;

        showScannerStatus(
            "warning",
            "⚠️ Le billet n'est pas encore confirmé."
        );

        return;
    }


    // ==================================================
    // BILLET VALIDE
    // ==================================================

    resultCard.classList.add(
        "valid"
    );

    resultIcon.textContent =
        "🟢";

    resultTitle.textContent =
        "Billet valide";

    showScannerStatus(
        "success",
        "✅ Billet valide — paiement confirmé."
    );
}


// ======================================================
// 📱 TRAITER QR
// ======================================================

async function processQRCode(
    decodedText
) {

    const ticketId =
        extractTicketId(
            decodedText
        );

    if (!ticketId) {
        return;
    }


    /*
     * Empêcher la caméra de lire
     * le même QR plusieurs fois.
     */

    if (
        ticketId ===
        lastScannedCode
    ) {

        return;
    }

    lastScannedCode =
        ticketId;


    console.log(
        "📱 QR détecté :",
        decodedText
    );

    console.log(
        "🎟️ Ticket ID :",
        ticketId
    );


    showScannerStatus(
        "warning",
        "🔎 Vérification du billet..."
    );


    await stopScanner();


    const ticket =
        await findTicket(
            ticketId
        );

    if (ticket) {

        displayTicket(
            ticket
        );
    }
}


// ======================================================
// 📷 DÉMARRER SCANNER
// ======================================================

async function startScanner() {

    if (scannerRunning) {
        return;
    }

    if (
        typeof Html5Qrcode ===
        "undefined"
    ) {

        showScannerStatus(
            "error",
            "❌ La bibliothèque QR n'est pas chargée."
        );

        return;
    }

    try {

        scanner =
            new Html5Qrcode(
                "qr-reader"
            );

        const config = {

            fps: 10,

            qrbox: {
                width: 180,
                height: 180
            },

            aspectRatio: 1
        };


        await scanner.start(

            {
                facingMode:
                    "environment"
            },

            config,

            function (decodedText) {

                processQRCode(
                    decodedText
                );
            },

            function () {

                // Erreurs normales de lecture ignorées.
            }
        );


        scannerRunning =
            true;

        showScannerStatus(
            "warning",
            "📷 Scanner actif — présentez le QR Code."
        );

        console.log(
            "📷 Caméra activée."
        );

    } catch (error) {

        console.error(
            "🔥 Erreur caméra :",
            error
        );

        showScannerStatus(
            "error",
            "❌ Impossible d'accéder à la caméra."
        );
    }
}


// ======================================================
// 🛑 ARRÊTER SCANNER
// ======================================================

async function stopScanner() {

    if (
        !scanner ||
        !scannerRunning
    ) {

        return;
    }

    try {

        await scanner.stop();

        scanner.clear();

        scannerRunning =
            false;

        console.log(
            "📷 Scanner arrêté."
        );

    } catch (error) {

        console.warn(
            "⚠️ Erreur arrêt caméra :",
            error
        );

        scannerRunning =
            false;
    }
}


// ======================================================
// ✅ VALIDATION EMBARQUEMENT
// ======================================================

async function validateTicket() {

    if (!currentTicket) {
        return;
    }

    if (!currentUser) {

        alert(
            "❌ Vous devez être connecté."
        );

        return;
    }

    if (
        !currentTicket._documentId
    ) {

        alert(
            "❌ Document Firebase introuvable."
        );

        return;
    }


    try {

        validateBtn.disabled =
            true;

        validateBtn.textContent =
            "Validation...";


        const ticketRef =
            doc(
                db,
                "tickets",
                currentTicket._documentId
            );


        // ==================================================
        // 🔐 TRANSACTION FIRESTORE
        // ==================================================

        /*
         * La transaction garantit qu'un seul scanner
         * peut utiliser le billet.
         */

        await runTransaction(
            db,
            async (transaction) => {

                const snapshot =
                    await transaction.get(
                        ticketRef
                    );


                if (!snapshot.exists()) {

                    throw new Error(
                        "Le billet n'existe plus."
                    );
                }


                const ticket =
                    snapshot.data();


                // ==========================================
                // DÉJÀ UTILISÉ
                // ==========================================

                if (
                    String(
                        ticket.status || ""
                    ).toLowerCase() ===
                    "used"
                ) {

                    throw new Error(
                        "🚫 Ce billet a déjà été utilisé."
                    );
                }


                // ==========================================
                // ANNULÉ
                // ==========================================

                if (
                    String(
                        ticket.status || ""
                    ).toLowerCase() ===
                    "cancelled"
                ) {

                    throw new Error(
                        "❌ Ce billet est annulé."
                    );
                }


                // ==========================================
                // PAIEMENT
                // ==========================================

                const payment =
                    String(
                        ticket.paymentStatus || ""
                    ).toLowerCase();


                if (
                    payment !== "paid"
                ) {

                    throw new Error(
                        "❌ Le paiement n'est pas confirmé."
                    );
                }


                // ==========================================
                // CONFIRMATION
                // ==========================================

                if (
                    String(
                        ticket.status || ""
                    ).toLowerCase() !==
                    "confirmed"
                ) {

                    throw new Error(
                        "❌ Le billet n'est pas confirmé."
                    );
                }


                // ==========================================
                // VALIDER LE BILLET
                // ==========================================

                transaction.update(
                    ticketRef,
                    {

                        status:
                            "used",

                        usedAt:
                            serverTimestamp(),

                        usedBy:
                            currentUser.uid,

                        usedByEmail:
                            currentUser.email
                    }
                );
            }
        );


        // ==================================================
        // 🎉 SUCCÈS
        // ==================================================

        currentTicket.status =
            "used";


        resultCard.classList.remove(
            "valid"
        );

        resultCard.classList.add(
            "invalid"
        );


        resultIcon.textContent =
            "✅";

        resultTitle.textContent =
            "Embarquement validé";


        usedMessage.classList.remove(
            "hidden"
        );

        usedMessage.textContent =
            "✅ Ce billet vient d'être validé pour l'embarquement.";


        validateBtn.textContent =
            "✓ Billet utilisé";

        validateBtn.disabled =
            true;


        showScannerStatus(
            "success",
            "✅ Embarquement validé avec succès."
        );


        console.log(
            "🎟️ Billet utilisé :",
            currentTicket.ticketId
        );


    } catch (error) {

        console.error(
            "🔥 Erreur validation :",
            error
        );


        validateBtn.disabled =
            false;

        validateBtn.textContent =
            "✓ Valider l'embarquement";


        /*
         * Si le billet vient d'être utilisé
         * par un autre scanner, on affiche
         * clairement le refus.
         */

        if (
            error.message.includes(
                "déjà été utilisé"
            )
        ) {

            resultCard.classList.remove(
                "valid"
            );

            resultCard.classList.add(
                "invalid"
            );

            resultIcon.textContent =
                "🚫";

            resultTitle.textContent =
                "Billet déjà utilisé";

            usedMessage.classList.remove(
                "hidden"
            );

            usedMessage.textContent =
                "🚫 Ce billet a déjà été utilisé.";

            validateBtn.disabled =
                true;

            showScannerStatus(
                "error",
                "🚫 Ce billet a déjà été utilisé."
            );

            return;
        }


        alert(
            "❌ Impossible de valider le billet.\n\n" +
            error.message
        );
    }
}


// ======================================================
// 🔄 SCANNER UN AUTRE BILLET
// ======================================================

async function resetScanner() {

    currentTicket =
        null;

    lastScannedCode =
        "";

    ticketResult.classList.remove(
        "show"
    );

    resultCard.classList.remove(
        "valid",
        "invalid"
    );

    resultIcon.textContent =
        "🎟️";

    resultTitle.textContent =
        "Billet";


    ticketNumber.textContent =
        "—";

    ticketDate.textContent =
        "—";

    ticketRoute.textContent =
        "—";

    ticketDepart.textContent =
        "—";

    ticketArrivee.textContent =
        "—";

    ticketPassengers.textContent =
        "—";

    ticketTotal.textContent =
        "—";


    paymentStatus.textContent =
        "Paiement : —";

    paymentStatus.className =
        "payment-status";


    usedMessage.classList.add(
        "hidden"
    );


    validateBtn.disabled =
        false;

    validateBtn.textContent =
        "✓ Valider l'embarquement";


    manualTicketId.value =
        "";


    showScannerStatus(
        "warning",
        "📷 Redémarrage du scanner..."
    );


    await startScanner();
}


// ======================================================
// 🔎 RECHERCHE MANUELLE
// ======================================================

async function manualSearch() {

    const id =
        normalizeTicketId(
            manualTicketId.value
        );

    if (!id) {

        showScannerStatus(
            "error",
            "❌ Entrez un numéro de billet."
        );

        return;
    }


    await stopScanner();


    showScannerStatus(
        "warning",
        "🔎 Recherche du billet..."
    );


    const ticket =
        await findTicket(
            id
        );


    if (ticket) {

        displayTicket(
            ticket
        );
    }
}


// ======================================================
// 🖱️ ÉVÉNEMENTS
// ======================================================

if (validateBtn) {

    validateBtn.addEventListener(
        "click",
        validateTicket
    );
}


if (scanAgainBtn) {

    scanAgainBtn.addEventListener(
        "click",
        resetScanner
    );
}


if (manualSearchBtn) {

    manualSearchBtn.addEventListener(
        "click",
        manualSearch
    );
}


if (manualTicketId) {

    manualTicketId.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                manualSearch();
            }
        }
    );
}


// ======================================================
// 🚀 INITIALISATION
// ======================================================

startScanner();

console.log(
    "✅ SCANNER E-GORÉE PRÊT"
);