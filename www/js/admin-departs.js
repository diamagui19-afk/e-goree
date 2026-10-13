import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { getOfficialDepartureTimes } from "./ferry-schedule.js";


console.log("🛠️ ADMIN DÉPARTS JS CHARGÉ");


let departures = [];
let currentUser = null;


// ======================================================
// ÉLÉMENTS
// ======================================================

const form =
    document.getElementById("departureForm");

const dateInput =
    document.getElementById("departureDate");

const placesInput =
    document.getElementById("departurePlaces");

const list =
    document.getElementById("departuresList");

const count =
    document.getElementById("departureCount");

const message =
    document.getElementById("formMessage");

const logoutBtn =
    document.getElementById("logoutBtn");


// MODAL

const modal =
    document.getElementById("editModal");

const closeModal =
    document.getElementById("closeModal");

const editForm =
    document.getElementById("editForm");

const editId =
    document.getElementById("editId");

const editDate =
    document.getElementById("editDate");

const editTime =
    document.getElementById("editTime");

const editPlaces =
    document.getElementById("editPlaces");

const editMessage =
    document.getElementById("editMessage");

// ======================================================
// AUTHENTIFICATION
// ======================================================

onAuthStateChanged(auth, function(user) {

    if (!user) {

        console.warn(
            "⚠️ Aucun administrateur connecté."
        );

        return;
    }

    currentUser = user;

    console.log(
        "👤 Administrateur connecté :",
        user.email
    );

});


// ======================================================
// DATE MINIMUM
// ======================================================

function setMinDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    const todayString =
        `${year}-${month}-${day}`;

    dateInput.min =
        todayString;

    editDate.min =
        todayString;
}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(
    element,
    type,
    text
) {

    element.className =
        "form-message " + type;

    element.textContent =
        text;
}


// ======================================================
// CHARGER LES DÉPARTS
// ======================================================

async function loadDepartures() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "departures"
                )
            );

        departures = [];

        snapshot.forEach(function(item) {

            const data =
                item.data();

            departures.push({

                id:
                    item.id,

                date:
                    data.date || "",

                time:
                    data.time || "",

                route:
                    data.route || "",

                places:
                    Number(
                        data.places || 0
                    ),

                availablePlaces:
                    Number(
                        data.availablePlaces ??
                        data.places ??
                        0
                    ),

                blocked:
                    data.blocked === true

            });

        });


        departures.sort(
            function(a, b) {

                return `${a.date} ${a.time}`
                    .localeCompare(
                        `${b.date} ${b.time}`
                    );

            }
        );


        renderDepartures();


    } catch (error) {

        console.error(
            "🔥 Erreur chargement :",
            error
        );

        list.innerHTML = `
            <div class="empty">
                Impossible de charger les départs.
            </div>
        `;

    }

}


// ======================================================
// AFFICHER LES DÉPARTS
// ======================================================

function renderDepartures() {

    count.textContent =
        `${departures.length} départ${
            departures.length > 1
                ? "s"
                : ""
        }`;


    if (departures.length === 0) {

        list.innerHTML = `
            <div class="empty">
                Aucun départ programmé.
            </div>
        `;

        return;

    }


    const departuresByDate = new Map();
    departures.forEach((departure) => {
        if (!departuresByDate.has(departure.date)) {
            departuresByDate.set(departure.date, []);
        }
        departuresByDate.get(departure.date).push(departure);
    });

    list.innerHTML = [...departuresByDate.entries()].map(([date, dayDepartures]) => {
        const allBlocked = dayDepartures.every((departure) => departure.blocked);
        const dayAction = allBlocked ? "unblock-day" : "block-day";
        const dayActionLabel = allBlocked ? "Réactiver la journée" : "Bloquer la journée";

        const rows = dayDepartures.map((departure) => {
            let status = "";
            let statusClass = "";

            if (departure.blocked) {
                status = "🔴 Bloqué";
                statusClass = "status-blocked";
            } else if (departure.availablePlaces <= 0) {
                status = "⚠️ Complet";
                statusClass = "status-full";
            } else {
                status = `🟢 ${departure.availablePlaces} place(s)`;
                statusClass = "status-ok";
            }

            return `
                <div class="departure-item" data-id="${departure.id}">
                    <div class="departure-info">
                        <div class="departure-time">🕐 ${departure.time}${departure.route ? ` · ${departure.route}` : ""}</div>
                        <span class="departure-status ${statusClass}">${status}</span>
                    </div>
                    <div class="departure-actions">
                        <button class="action-btn edit-btn" data-action="edit" data-id="${departure.id}">✏️ Modifier</button>
                        <button class="action-btn ${departure.blocked ? "unblock-btn" : "block-btn"}" data-action="${departure.blocked ? "unblock" : "block"}" data-id="${departure.id}">${departure.blocked ? "🟢 Réactiver" : "🔴 Bloquer"}</button>
                        <button class="action-btn delete-btn" data-action="delete" data-id="${departure.id}">🗑️ Supprimer</button>
                    </div>
                </div>
            `;
        }).join("");

        return `
            <section class="departure-day">
                <header class="departure-day-header">
                    <strong>📅 ${date} <span>${dayDepartures.length} départ(s)</span></strong>
                    <button class="action-btn ${allBlocked ? "unblock-btn" : "block-btn"}" data-action="${dayAction}" data-date="${date}">${dayActionLabel}</button>
                </header>
                <div class="departure-day-list">${rows}</div>
            </section>
        `;
    }).join("");

}


// ======================================================
// GÉNÉRER LES DÉPARTS OFFICIELS DU JOUR
// ======================================================

form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const date =
            dateInput.value;

        const places =
            Number(
                placesInput.value
            );


        if (!date || places < 1) {

            showMessage(
                message,
                "error",
                "❌ Choisis une date et un nombre de places valide."
            );

            return;

        }


        const routes = ["Dakar → Gorée", "Gorée → Dakar"];
        const scheduledDepartures = routes.flatMap((route) => {
            return getOfficialDepartureTimes(date, route).map((time) => ({ route, time }));
        });
        const missingDepartures = scheduledDepartures.filter(({ route, time }) => {
            return !departures.some((item) => item.date === date && item.time === time && item.route === route);
        });

        if (!missingDepartures.length) {
            showMessage(message, "success", "✅ Les horaires officiels de cette date sont déjà générés.");
            return;
        }


        try {

            const button =
                document.getElementById(
                    "saveDepartureBtn"
                );

            button.disabled =
                true;

            button.textContent =
                "Enregistrement...";


            await Promise.all(missingDepartures.map(({ route, time }) => {
                return addDoc(collection(db, "departures"), {
                    date,
                    time,
                    route,
                    places,
                    availablePlaces: places,
                    blocked: false,
                    createdAt: serverTimestamp()
                });
            }));


            showMessage(
                message,
                "success",
                `✅ ${missingDepartures.length} départ(s) officiel(s) généré(s).`
            );


            form.reset();

            placesInput.value =
                100;


            await loadDepartures();


        } catch (error) {

            console.error(
                error
            );

            showMessage(
                message,
                "error",
                error.code === "permission-denied"
                    ? "❌ Firestore refuse la création. Vérifie que les règles publiées autorisent les écritures pour un compte dont users/{UID}.role vaut admin."
                    : "❌ Erreur : " + error.message
            );


        } finally {

            const button =
                document.getElementById(
                    "saveDepartureBtn"
                );

            button.disabled =
                false;

                button.textContent =
                "Générer les départs officiels";

        }

    }
);


// ======================================================
// ACTIONS
// ======================================================

list.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(
                "button[data-action]"
            );

        if (!button) {
            return;
        }


        const action =
            button.dataset.action;

        const id =
            button.dataset.id;

        if (action === "block-day" || action === "unblock-day") {
            const date = button.dataset.date;
            const blocked = action === "block-day";
            const dayDepartures = departures.filter((item) => item.date === date);
            if (!dayDepartures.length) return;

            const verb = blocked ? "bloquer" : "réactiver";
            if (!confirm(`Veux-tu ${verb} tous les départs du ${date} ?`)) return;

            try {
                const batch = writeBatch(db);
                dayDepartures.forEach((item) => {
                    batch.update(doc(db, "departures", item.id), { blocked });
                });
                await batch.commit();
                await loadDepartures();
            } catch (error) {
                console.error("Gestion de la journée impossible :", error);
                alert("Impossible de modifier tous les départs de cette journée. Vérifie les droits administrateur.");
            }
            return;
        }


        const departure =
            departures.find(
                function(item) {
                    return item.id === id;
                }
            );


        if (!departure) {
            return;
        }


        // ==========================
        // MODIFIER
        // ==========================

        if (action === "edit") {

            editId.value =
                departure.id;

            editDate.value =
                departure.date;

            editTime.value =
                departure.time;

            editPlaces.value =
                departure.places;

            editMessage.className =
                "form-message";

            editMessage.textContent =
                "";

            modal.classList.add(
                "show"
            );

            return;

        }


        // ==========================
        // BLOQUER
        // ==========================

        if (action === "block") {

            const confirmBlock =
                confirm(
                    `Bloquer le départ du ${departure.date} à ${departure.time} ?`
                );

            if (!confirmBlock) {
                return;
            }


            await updateDoc(
                doc(
                    db,
                    "departures",
                    id
                ),
                {

                    blocked:
                        true

                }
            );


            await loadDepartures();

            return;

        }


        // ==========================
        // DÉBLOQUER
        // ==========================

        if (action === "unblock") {

            const confirmUnblock =
                confirm(
                    `Débloquer le départ du ${departure.date} à ${departure.time} ?`
                );

            if (!confirmUnblock) {
                return;
            }


            await updateDoc(
                doc(
                    db,
                    "departures",
                    id
                ),
                {

                    blocked:
                        false

                }
            );


            await loadDepartures();

            return;

        }


        // ==========================
        // SUPPRIMER
        // ==========================

        if (action === "delete") {

            const confirmDelete =
                confirm(
                    `Supprimer définitivement le départ du ${departure.date} à ${departure.time} ?`
                );

            if (!confirmDelete) {
                return;
            }


            await deleteDoc(
                doc(
                    db,
                    "departures",
                    id
                )
            );


            await loadDepartures();

        }

    }
);


// ======================================================
// MODIFICATION
// ======================================================

editForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const id =
            editId.value;

        const date =
            editDate.value;

        const time =
            editTime.value;

        const places =
            Number(
                editPlaces.value
            );


        if (!date || !time || places < 1) {

            showMessage(
                editMessage,
                "error",
                "❌ Informations invalides."
            );

            return;

        }


        const oldDeparture =
            departures.find(
                function(item) {
                    return item.id === id;
                }
            );


        if (!oldDeparture) {
            return;
        }


        /*
         * Si le nombre de places change,
         * on recalcule les places disponibles
         * en conservant les places déjà vendues.
         */

        const sold =
            Math.max(
                0,
                oldDeparture.places -
                oldDeparture.availablePlaces
            );


        const newAvailable =
            Math.max(
                0,
                places - sold
            );


        try {

            await updateDoc(
                doc(
                    db,
                    "departures",
                    id
                ),
                {

                    date:
                        date,

                    time:
                        time,

                    places:
                        places,

                    availablePlaces:
                        newAvailable

                }
            );


            showMessage(
                editMessage,
                "success",
                "✅ Départ modifié."
            );


            await loadDepartures();


            setTimeout(
                function() {

                    modal.classList.remove(
                        "show"
                    );

                },
                700
            );


        } catch (error) {

            console.error(
                error
            );

            showMessage(
                editMessage,
                "error",
                "❌ " +
                error.message
            );

        }

    }
);


// ======================================================
// FERMER MODAL
// ======================================================

closeModal.addEventListener(
    "click",
    function() {

        modal.classList.remove(
            "show"
        );

    }
);


modal.addEventListener(
    "click",
    function(event) {

        if (
            event.target === modal
        ) {

            modal.classList.remove(
                "show"
            );

        }

    }
);


// ======================================================
// DÉCONNEXION
// ======================================================

logoutBtn?.addEventListener(
    "click",
    async function() {

        try {

            await signOut(auth);

            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                error
            );

        }

    }
);


// ======================================================
// INITIALISATION
// ======================================================

setMinDate();

loadDepartures();

console.log(
    "✅ ADMIN DÉPARTS PRÊT"
);
