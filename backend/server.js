const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const {
    initializeApp,
    cert
} = require("firebase-admin/app");

const {
    getFirestore,
    Timestamp
} = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const expectedFirebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!expectedFirebaseProjectId || !serviceAccountPath) {
    throw new Error(
        "Configure FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_PATH in backend/.env"
    );
}

const resolvedServiceAccountPath = path.resolve(__dirname, serviceAccountPath);
const serviceAccount = require(resolvedServiceAccountPath);

if (serviceAccount.project_id !== expectedFirebaseProjectId) {
    throw new Error(
        `Firebase Admin credential project mismatch: expected ${expectedFirebaseProjectId}, got ${serviceAccount.project_id}`
    );
}

initializeApp({
    credential: cert(serviceAccount),
    projectId: expectedFirebaseProjectId
});

const db =
    getFirestore();

const app = express();

const PORT =
    process.env.PORT || 3000;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "http://127.0.0.1:5500";


/* =====================================================
   CORS
===================================================== */

app.use(
    cors({
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
    })
);

app.post("/api/wave/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const secret = process.env.WAVE_WEBHOOK_SECRET;
    const signatureHeader = req.get("Wave-Signature") || "";
    if (!secret) return res.status(503).send("Wave webhook secret is not configured");
    const parts = signatureHeader.split(",").map((part) => part.trim());
    const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
    const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const timestampNumber = Number(timestamp);
    if (!timestamp || !Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
        return res.status(401).send("Invalid or expired webhook signature");
    }
    const expected = crypto.createHmac("sha256", secret).update(timestamp + rawBody).digest("hex");
    const validSignature = signatures.some((candidate) => {
        if (!/^[a-f0-9]{64}$/i.test(candidate)) return false;
        return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(expected, "hex"));
    });
    if (!validSignature) return res.status(401).send("Invalid webhook signature");

    try {
        const event = JSON.parse(rawBody);
        const checkout = event.data || {};
        if (event.type !== "checkout.session.completed" || checkout.payment_status !== "succeeded") {
            return res.status(200).send("Ignored");
        }
        const ticketId = String(checkout.client_reference || "");
        if (!ticketId) return res.status(400).send("Missing client reference");
        const matches = await db.collection("tickets").where("ticketId", "==", ticketId).limit(1).get();
        if (matches.empty) return res.status(404).send("Ticket not found");
        const ticketRef = matches.docs[0].ref;
        await ticketRef.update({
            paymentStatus: "paid",
            status: "confirmed",
            waveCheckoutSessionId: checkout.id || null,
            waveTransactionId: checkout.transaction_id || null,
            paidAt: Timestamp.now()
        });
        return res.status(200).send("OK");
    } catch (error) {
        console.error("Wave webhook processing failed:", error);
        return res.status(500).send("Webhook processing failed");
    }
});


/* =====================================================
   JSON
===================================================== */

app.use(express.json());

async function requireFirebaseUser(req, res, next) {
    const authorization = req.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentification requise"
        });
    }

    try {
        req.firebaseUser = await getAuth().verifyIdToken(token);
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Jeton Firebase invalide ou expiré"
        });
    }
}

async function requireFirebaseAdmin(req, res, next) {
    try {
        const profile = await db.collection("users").doc(req.firebaseUser.uid).get();
        const role = String(profile.data()?.role || "").trim().toLowerCase();
        if (!profile.exists || role !== "admin") {
            return res.status(403).json({ success: false, message: "Accès administrateur refusé" });
        }
        return next();
    } catch (error) {
        console.error("Admin role check failed:", error);
        return res.status(500).json({ success: false, message: "Impossible de vérifier le rôle administrateur" });
    }
}

const requireAdmin = [requireFirebaseUser, requireFirebaseAdmin];

app.get("/api/admin/overview", ...requireAdmin, async (req, res) => {
    try {
        const { period = "all", value = "" } = req.query;
        const usersSnapshot = await db.collection("users").get();
        const departuresSnapshot = await db.collection("departures").get();
        const ticketsSnapshot = await db.collection("tickets").get();
        const matchesPeriod = (date) => period === "all"
            ? true
            : period === "day"
            ? date === value
            : period === "month" && /^\d{4}-\d{2}$/.test(value) && date.startsWith(value);
        const departures = departuresSnapshot.docs.map((item) => item.data());
        const tickets = ticketsSnapshot.docs.map((item) => item.data());
        const periodDepartures = departures.filter((item) => matchesPeriod(String(item.date || "")));
        const periodTickets = tickets.filter((item) => matchesPeriod(String(item.date || "")));
        const customers = usersSnapshot.docs.filter((item) => String(item.data().role || "").toLowerCase() !== "admin");
        const paidTickets = periodTickets.filter((item) => item.paymentStatus === "paid");
        const cancelledTickets = periodTickets.filter((item) => item.status === "cancelled" || item.cancellationStatus === "approved");
        return res.json({
            success: true,
            users: customers.length,
            departures: periodDepartures.length,
            blockedDepartures: periodDepartures.filter((item) => item.blocked === true).length,
            ticketsPurchased: paidTickets.filter((item) => item.status !== "cancelled").length,
            ticketsCancelled: cancelledTickets.length,
            pendingCancellations: tickets.filter((item) => item.cancellationStatus === "requested").length
        });
    } catch (error) {
        console.error("Admin overview failed:", error);
        return res.status(500).json({ success: false, message: "Impossible de charger les statistiques" });
    }
});

app.get("/api/admin/tickets", ...requireAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection("tickets").get();
        const tickets = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) => `${b.date || ""} ${b.depart || ""}`.localeCompare(`${a.date || ""} ${a.depart || ""}`));
        return res.json({ success: true, tickets });
    } catch (error) {
        console.error("Admin tickets load failed:", error);
        return res.status(500).json({ success: false, message: "Impossible de charger les billets" });
    }
});

app.post("/api/admin/tickets/:id/cancellation", ...requireAdmin, async (req, res) => {
    const { decision, manualRefundConfirmed = false } = req.body || {};
    if (!["approve", "reject"].includes(decision)) {
        return res.status(400).json({ success: false, message: "Décision invalide" });
    }
    const ticketRef = db.collection("tickets").doc(req.params.id);
    try {
        const ticketSnapshot = await ticketRef.get();
        if (!ticketSnapshot.exists) return res.status(404).json({ success: false, message: "Billet introuvable" });
        const ticket = ticketSnapshot.data();
        if (ticket.cancellationStatus !== "requested") {
            return res.status(409).json({ success: false, message: "Aucune demande d’annulation en attente" });
        }
        if (decision === "reject") {
            await ticketRef.update({ cancellationStatus: "rejected", cancellationReviewedAt: Timestamp.now(), cancellationReviewedBy: req.firebaseUser.uid });
            return res.json({ success: true });
        }
        if (ticket.paymentStatus === "paid" && ticket.payment === "Wave") {
            if (!ticket.waveCheckoutSessionId || !process.env.WAVE_API_KEY) {
                return res.status(409).json({ success: false, message: "Référence Wave ou clé API absente : remboursement impossible" });
            }
            const refundResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${encodeURIComponent(ticket.waveCheckoutSessionId)}/refund`, {
                method: "POST",
                headers: { Authorization: `Bearer ${process.env.WAVE_API_KEY}` }
            });
            if (!refundResponse.ok) {
                const detail = await refundResponse.text();
                return res.status(502).json({ success: false, message: "Wave n’a pas confirmé le remboursement", detail });
            }
        }
        if (ticket.paymentStatus === "paid" && ticket.payment !== "Wave" && !manualRefundConfirmed) {
            return res.status(409).json({ success: false, code: "MANUAL_REFUND_CONFIRMATION_REQUIRED", message: "Effectue le remboursement auprès du fournisseur puis confirme-le." });
        }
        await db.runTransaction(async (transaction) => {
            const freshTicket = await transaction.get(ticketRef);
            if (!freshTicket.exists || freshTicket.data().cancellationStatus !== "requested") {
                throw new Error("CANCELLATION_ALREADY_PROCESSED");
            }
            const data = freshTicket.data();
            let departureRef = null;
            let departureSnapshot = null;
            if (data.departureId) {
                departureRef = db.collection("departures").doc(data.departureId);
                departureSnapshot = await transaction.get(departureRef);
            }
            transaction.update(ticketRef, {
                status: "cancelled",
                cancellationStatus: "approved",
                cancellationReviewedAt: Timestamp.now(),
                cancellationReviewedBy: req.firebaseUser.uid,
                refundStatus: data.paymentStatus !== "paid"
                    ? "not_required"
                    : data.payment === "Wave" ? "refunded" : "manual_refunded"
            });
            if (departureRef && departureSnapshot?.exists) {
                const departure = departureSnapshot.data();
                const places = Number(departure.places || 0);
                const available = Number(departure.availablePlaces ?? places);
                const passengerCount = Number(data.passengers || ((Number(data.adult) || 0) + (Number(data.child) || 0)));
                transaction.update(departureRef, { availablePlaces: Math.min(places, available + Math.max(0, passengerCount)) });
            }
        });
        return res.json({ success: true });
    } catch (error) {
        console.error("Admin cancellation decision failed:", error);
        const conflict = error.message === "CANCELLATION_ALREADY_PROCESSED";
        return res.status(conflict ? 409 : 500).json({ success: false, message: conflict ? "Cette demande a déjà été traitée" : "Impossible de traiter l’annulation" });
    }
});

const ticketTariffs = {
    senegalese_resident: { adult: 1500, child: 500 },
    resident_africa: { adult: 2700, child: 1700 },
    non_resident_africa: { adult: 5200, child: 2700 }
};

async function getPayableTicket(ticketId, uid, expectedPayment) {
    const snapshot = await db.collection("tickets")
        .where("ticketId", "==", String(ticketId))
        .limit(1)
        .get();

    if (snapshot.empty) {
        const error = new Error("Billet introuvable");
        error.statusCode = 404;
        throw error;
    }

    const ticketDoc = snapshot.docs[0];
    const ticket = ticketDoc.data();

    if (ticket.userId !== uid) {
        const error = new Error("Ce billet n'appartient pas à ce compte");
        error.statusCode = 403;
        throw error;
    }

    if (ticket.payment !== expectedPayment) {
        const error = new Error("Le mode de paiement ne correspond pas au billet");
        error.statusCode = 400;
        throw error;
    }

    if (ticket.status !== "pending" || ticket.paymentStatus !== "pending") {
        const error = new Error("Ce billet n'est plus en attente de paiement");
        error.statusCode = 409;
        throw error;
    }

    const rates = ticketTariffs[ticket.tariffCategory];
    const adult = Number(ticket.adult);
    const child = Number(ticket.child);

    if (!rates || !Number.isSafeInteger(adult) || adult < 1
        || !Number.isSafeInteger(child) || child < 0) {
        const error = new Error("Catégorie tarifaire ou quantité invalide");
        error.statusCode = 400;
        throw error;
    }

    const amount = adult * rates.adult + child * rates.child;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        const error = new Error("Montant du billet invalide");
        error.statusCode = 400;
        throw error;
    }

    await ticketDoc.ref.update({ total: amount });
    return { ticket, amount };
}


/* =====================================================
   TEST SERVEUR
===================================================== */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "🚀 Backend E-Gorée actif",
    });

});


/* =====================================================
   WAVE CHECKOUT
===================================================== */

app.post(
    "/api/wave/create-checkout",
    requireFirebaseUser,
    async (req, res) => {

        try {

            console.log(
                "💳 Nouvelle demande Wave :",
                req.body
            );


            const {
                ticketId,
                successUrl,
                errorUrl
            } = req.body;


            /* ===============================
               VALIDATION
            =============================== */

            if (!ticketId) {

                return res.status(400).json({
                    success: false,
                    message: "ticketId obligatoire",
                });

            }


            if (!process.env.WAVE_API_KEY) {

                console.error(
                    "❌ WAVE_API_KEY absente"
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Clé Wave non configurée",
                });

            }


            /* ===============================
               URLS
            =============================== */

            if (!successUrl || !errorUrl) {

                return res.status(400).json({
                    success: false,
                    message:
                        "successUrl et errorUrl sont obligatoires",
                });

            }

            const { amount } = await getPayableTicket(
                ticketId,
                req.firebaseUser.uid,
                "Wave"
            );


            /* ===============================
               REQUÊTE WAVE
            =============================== */

            const response =
                await fetch(
                    "https://api.wave.com/v1/checkout/sessions",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${process.env.WAVE_API_KEY}`,

                            "Content-Type":
                                "application/json",
                               "X-Callback-Url":
        process.env.WAVE_CALLBACK_URL
        
                        },

                        body: JSON.stringify({

                            amount:
                                String(
                                    Math.round(
                                        amount
                                    )
                                ),

                            currency: "XOF",

                            client_reference:
                                ticketId,

                            success_url:
                                successUrl,

                            error_url:
                                errorUrl,

                        }),
                    }
                );


            const data =
                await response.json();


            console.log(
                "🌊 Réponse Wave :",
                data
            );


            /* ===============================
               ERREUR WAVE
            =============================== */

            if (!response.ok) {

                return res
                    .status(response.status)
                    .json({

                        success: false,

                        message:
                            "Wave a refusé la création du paiement",

                        error: data,

                    });

            }

            const matchingTicket = await db.collection("tickets")
                .where("ticketId", "==", String(ticketId))
                .limit(1)
                .get();
            if (!matchingTicket.empty) {
                await matchingTicket.docs[0].ref.update({ waveCheckoutSessionId: data.id });
            }


            /* ===============================
               SUCCÈS
            =============================== */

            return res.json({

                success: true,

                checkoutId:
                    data.id,

                waveLaunchUrl:
                    data.wave_launch_url,

                clientReference:
                    data.client_reference,

                paymentStatus:
                    data.payment_status,

                amount,

            });

        }

        catch (error) {

            console.error(
                "🔥 Erreur Wave :",
                error
            );

            return res.status(error.statusCode || 500).json({

                success: false,

                message: error.statusCode
                    ? error.message
                    : "Erreur interne du serveur",

            });

        }

    }
);

// ======================================================
// 🟠 ORANGE MONEY — QR CODE SANDBOX
// ======================================================

app.post("/api/orange/create-payment", requireFirebaseUser, async (req, res) => {

    try {

        const { reference } = req.body;

        // ----------------------------------------------
        // 1. VALIDATION
        // ----------------------------------------------

        if (!reference) {

            return res.status(400).json({
                success: false,
                error: "reference obligatoire"
            });

        }

        const { amount } = await getPayableTicket(
            reference,
            req.firebaseUser.uid,
            "Orange Money"
        );


        // ----------------------------------------------
        // 2. TOKEN ORANGE
        // ----------------------------------------------

        const tokenResponse = await fetch(
            "https://api.sandbox.orange-sonatel.com/oauth/v1/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({

                    client_id:
                        process.env.ORANGE_CLIENT_ID,

                    client_secret:
                        process.env.ORANGE_CLIENT_SECRET,

                    grant_type:
                        "client_credentials"

                })
            }
        );


        const tokenData =
            await tokenResponse.json();


        if (!tokenResponse.ok) {

            console.error(
                "❌ Orange OAuth :",
                tokenData
            );

            return res.status(
                tokenResponse.status
            ).json({

                success: false,

                error:
                    "Impossible d'obtenir le token Orange",

                details:
                    tokenData

            });

        }


        const accessToken =
            tokenData.access_token;


        // ----------------------------------------------
        // 3. GÉNÉRATION DU QR ORANGE MONEY
        // ----------------------------------------------

        const paymentResponse = await fetch(
            "https://api.sandbox.orange-sonatel.com/api/eWallet/v4/qrcode",
            {
                method: "POST",

                headers: {

                    "Authorization":
                        `Bearer ${accessToken}`,

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    code:
                        String(
                            process.env.ORANGE_MERCHANT_CODE
                        ),

                    name:
                        "E-Gorée",

                    amount: {

                        value:
                            Math.round(amount),

                        unit:
                            "XOF"

                    },

                    validity:
                        900,

                    reference:
                        reference,

                    metadata: {

                        application:
                            "E-Gorée"

                    }

                })

            }
        );


        const paymentData =
            await paymentResponse.json();


        console.log(
            "🟠 Réponse Orange QR :",
            paymentData
        );


        // ----------------------------------------------
        // 4. ERREUR ORANGE
        // ----------------------------------------------

        if (!paymentResponse.ok) {

            return res.status(
                paymentResponse.status
            ).json({

                success: false,

                error:
                    "Orange a refusé la génération du QR",

                details:
                    paymentData

            });

        }


        // ----------------------------------------------
        // 5. SUCCÈS
        // ----------------------------------------------

        return res.json({

            success: true,

            orangeResponse:
                paymentData,

            reference:
                reference,

            amount

        });


    } catch (error) {

        console.error(
            "🔥 Erreur Orange Money :",
            error
        );


        return res.status(error.statusCode || 500).json({

            success: false,

            error: error.statusCode
                ? error.message
                : "Erreur interne Orange Money"

        });

    }

});
// ======================================================
// 🟠 ORANGE MONEY — CALLBACK
// ======================================================

//app.post("/api/orange/notification", async (req, res) => {

    //try {

       // console.log(
          //  "🟠 NOTIFICATION ORANGE REÇUE :",
           // JSON.stringify(req.body, null, 2)
       // );

        // Pour l'instant, on accuse simplement réception.
        // On n'actualise PAS encore le billet.
       // return res.status(200).json({
          //  success: true,
          //  received: true
       // });

   // } catch (error) {

        //console.error(
          //  "🔥 Erreur notification Orange :",
           // error
      //  );

       // return res.status(500).json({
          //  success: false
       // });
   // }

//});
// ======================================================
// 🟠 ORANGE MONEY — NOTIFICATION
// ======================================================

app.post("/api/orange/notification", async (req, res) => {

    try {

        console.log(
            "🟠 NOTIFICATION ORANGE REÇUE :",
            JSON.stringify(req.body, null, 2)
        );

        const {
            status,
            reference,
            transactionId
        } = req.body;


        // ==================================================
        // 1. VÉRIFICATION
        // ==================================================

        if (!reference) {

            console.error(
                "❌ Reference Orange absente"
            );

            return res.status(400).json({
                success: false,
                error: "reference manquante"
            });
        }


        console.log(
            "🟠 Référence :",
            reference
        );

        console.log(
            "🟠 Statut :",
            status
        );

        console.log(
            "🟠 Transaction :",
            transactionId
        );


        // ==================================================
        // 2. PAIEMENT NON CONFIRMÉ
        // ==================================================

        if (status !== "SUCCESS") {

            console.log(
                "⏳ Paiement Orange non confirmé :",
                status
            );

            return res.status(200).json({
                success: true,
                received: true,
                paymentConfirmed: false
            });
        }


        // ==================================================
        // 3. RECHERCHER LE BILLET
        // ==================================================

        const ticketsSnapshot = await db
            .collection("tickets")
            .where("ticketId", "==", reference)
            .limit(1)
            .get();


        if (ticketsSnapshot.empty) {

            console.error(
                "❌ Billet introuvable :",
                reference
            );

            return res.status(404).json({
                success: false,
                error: "Billet introuvable",
                reference: reference
            });
        }


        // ==================================================
        // 4. RÉCUPÉRER LE BILLET
        // ==================================================

        const ticketDoc =
            ticketsSnapshot.docs[0];

        const ticketRef =
            ticketDoc.ref;


        // ==================================================
        // 5. METTRE À JOUR LE BILLET
        // ==================================================

       await ticketRef.update({

    paymentStatus:
        "paid",

    status:
        "confirmed",

    orangeTransactionId:
        transactionId || null,

   paidAt:
    Timestamp.now()

});


        console.log(
            "✅ BILLET PAYÉ ET CONFIRMÉ :",
            reference
        );


        // ==================================================
        // 6. RÉPONSE À ORANGE
        // ==================================================

        return res.status(200).json({

            success: true,

            received: true,

            paymentConfirmed: true,

            reference: reference,

            transactionId:
                transactionId || null

        });


    } catch (error) {

        console.error(
            "🔥 Erreur notification Orange :",
            error
        );

        return res.status(500).json({

            success: false,

            error: error.message

        });

    }

});
/* =====================================================
   DÉMARRAGE
===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 Backend E-Gorée lancé sur http://localhost:${PORT}`
        );

        console.log(
            "🌊 Wave Checkout API prête"
        );

    }
);
