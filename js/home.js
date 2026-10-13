// ======================================================
// 🏠 E-GORÉE — HOME.JS
// 🔎 Recherche + 🔔 Notifications Firebase
// ======================================================

import {
    auth,
    db
} from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

// Carrousel de la page d'accueil : lecture automatique, avec pause au survol.
const homeSlider = document.getElementById("home-slider");
if (homeSlider) {
    const slides = Array.from(homeSlider.querySelectorAll(".slide"));
    const dotsContainer = document.getElementById("home-dots");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeSlide = Math.max(0, slides.findIndex(slide => slide.classList.contains("active")));
    let autoplayTimer;

    const showSlide = (index) => {
        activeSlide = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === activeSlide;
            slide.classList.toggle("active", isActive);
            slide.setAttribute("aria-hidden", String(!isActive));
        });
        dotsContainer?.querySelectorAll("button").forEach((dot, dotIndex) => {
            const isActive = dotIndex === activeSlide;
            dot.classList.toggle("active", isActive);
            dot.setAttribute("aria-current", String(isActive));
        });
    };

    if (slides.length > 1) {
        slides.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "slide-dot";
            dot.setAttribute("aria-label", `Afficher l’image ${index + 1}`);
            dot.addEventListener("click", () => {
                showSlide(index);
                startAutoplay();
            });
            dotsContainer?.append(dot);
        });

        const stopAutoplay = () => window.clearInterval(autoplayTimer);
        function startAutoplay() {
            stopAutoplay();
            if (prefersReducedMotion.matches || document.hidden || homeSlider.matches(":hover")) return;
            autoplayTimer = window.setInterval(() => showSlide(activeSlide + 1), 4500);
        }

        homeSlider.addEventListener("mouseenter", stopAutoplay);
        homeSlider.addEventListener("mouseleave", startAutoplay);
        homeSlider.addEventListener("focusin", stopAutoplay);
        homeSlider.addEventListener("focusout", startAutoplay);
        document.addEventListener("visibilitychange", startAutoplay);
        prefersReducedMotion.addEventListener?.("change", startAutoplay);
        showSlide(activeSlide);
        startAutoplay();
    }
}


// ======================================================
// 🔎 ÉLÉMENTS — RECHERCHE
// ======================================================

const searchBtn =
    document.getElementById("searchBtn");

const searchModal =
    document.getElementById("searchModal");

const closeSearch =
    document.getElementById("closeSearch");

const searchInput =
    document.getElementById("homeSearchInput");

const searchResults =
    document.getElementById("searchResults");


// ======================================================
// 🔔 ÉLÉMENTS — NOTIFICATIONS
// ======================================================

const notificationBtn =
    document.getElementById("notificationBtn");

const notificationModal =
    document.getElementById("notificationModal");

const closeNotifications =
    document.getElementById("closeNotifications");

const notificationList =
    document.getElementById("notificationList");

const notificationBadge =
    document.getElementById("notificationBadge");


// ======================================================
// 📦 VARIABLES
// ======================================================

let currentUser = null;

let lieux = [];

let notifications = [];

let tickets = [];


// ======================================================
// 🚀 INITIALISATION
// ======================================================

console.log("🏠 HOME.JS chargé");


// ======================================================
// 👤 AUTHENTIFICATION
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        currentUser = user;

        console.log(
            "👤 Utilisateur Home :",
            user?.email || "aucun utilisateur"
        );


        if (user) {

            // 🔔 Notifications Firebase
            listenNotifications();

            // 🎟️ Billets utilisateur
            listenUserTickets();

        } else {

            notifications = [];

            tickets = [];

            renderNotifications();

            updateNotificationBadge();

        }

    }
);


// ======================================================
// 🔎 RECHERCHE
// ======================================================

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            console.log(
                "🔎 Recherche ouverte"
            );

            openSearch();

        }
    );

} else {

    console.warn(
        "⚠️ #searchBtn introuvable"
    );

}


// ======================================================
// 🔎 OUVRIR RECHERCHE
// ======================================================

function openSearch() {

    if (!searchModal) {

        console.error(
            "❌ #searchModal introuvable"
        );

        return;

    }


    searchModal.classList.add("show");

    // Sécurité visuelle
    searchModal.style.display = "flex";


    setTimeout(
        () => {

            if (searchInput) {

                searchInput.focus();

            }

        },
        100
    );


    loadPlaces();

}


// ======================================================
// ❌ FERMER RECHERCHE
// ======================================================

if (closeSearch) {

    closeSearch.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            closeSearchModal();

        }
    );

}


function closeSearchModal() {

    if (!searchModal) return;

    searchModal.classList.remove("show");

    searchModal.style.display = "none";

}


// ======================================================
// 📍 CHARGER LES LIEUX FIRESTORE
// ======================================================

async function loadPlaces() {

    if (lieux.length > 0) {

        renderSearchResults(lieux);

        return;

    }


    if (!searchResults) return;


    searchResults.innerHTML = `
        <div class="search-empty">
            Chargement des lieux...
        </div>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "lieux"
                )
            );


        lieux = [];


        snapshot.forEach(
            (lieuDoc) => {

                const data =
                    lieuDoc.data();


                lieux.push({

                    id:
                        lieuDoc.id,

                    name:
                        data.name ||
                        data.nom ||
                        "Lieu de Gorée",

                    description:
                        data.description ||
                        "",

                    image:
                        data.image ||
                        "../assets/images/goree2.webp"

                });

            }
        );


        console.log(
            "📍 Lieux chargés :",
            lieux
        );


        renderSearchResults(lieux);


    } catch (error) {

        console.error(
            "❌ Erreur chargement lieux :",
            error
        );


        searchResults.innerHTML = `
            <div class="search-empty">
                ❌ Impossible de charger les lieux.
            </div>
        `;

    }

}


// ======================================================
// 🔎 RECHERCHE EN DIRECT
// ======================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const value =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!value) {

                renderSearchResults(
                    lieux
                );

                return;

            }


            const results =
                lieux.filter(
                    (lieu) => {

                        const name =
                            String(
                                lieu.name || ""
                            ).toLowerCase();


                        const description =
                            String(
                                lieu.description || ""
                            ).toLowerCase();


                        return (
                            name.includes(value) ||
                            description.includes(value)
                        );

                    }
                );


            renderSearchResults(
                results
            );

        }
    );

}


// ======================================================
// 📍 AFFICHER LES RÉSULTATS
// ======================================================

function renderSearchResults(
    results
) {

    if (!searchResults) return;


    if (!results || results.length === 0) {

        searchResults.innerHTML = `
            <div class="search-empty">
                🔎 Aucun lieu trouvé.
            </div>
        `;

        return;

    }


    searchResults.innerHTML =
        results.map(
            (lieu) => {

                return `

                    <div
                        class="search-result"
                        data-place-id="${escapeHtml(
                            lieu.id
                        )}">

                        <img
                            src="${escapeHtml(
                                lieu.image
                            )}"
                            alt="${escapeHtml(
                                lieu.name
                            )}">

                        <div
                            class="search-result-info">

                            <strong>
                                ${escapeHtml(
                                    lieu.name
                                )}
                            </strong>

                            ${
                                lieu.description
                                    ? `
                                        <span>
                                            ${escapeHtml(
                                                lieu.description
                                            )}
                                        </span>
                                    `
                                    : ""
                            }

                        </div>

                        <span class="arrow">
                            →
                        </span>

                    </div>

                `;

            }
        ).join("");


    // Ajouter les clics
    document
        .querySelectorAll(
            ".search-result"
        )
        .forEach(
            (element) => {

                element.addEventListener(
                    "click",
                    () => {

                        const id =
                            element.dataset
                                .placeId;


                        console.log(
                            "📍 Lieu sélectionné :",
                            id
                        );


                        window.location.href =
                            `map.html?lieu=${encodeURIComponent(
                                id
                            )}`;

                    }
                );

            }
        );

}


// ======================================================
// 🔔 BOUTON NOTIFICATIONS
// ======================================================

if (notificationBtn) {

    notificationBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            console.log(
                "🔔 Bouton notifications cliqué"
            );


            if (!notificationModal) {

                console.error(
                    "❌ #notificationModal introuvable dans home.html"
                );

                return;

            }


            // OUVERTURE
            notificationModal.classList.add(
                "show"
            );


            // Sécurité : forcer l'affichage
            notificationModal.style.display =
                "flex";


            renderNotifications();


            console.log(
                "✅ Fenêtre notifications ouverte"
            );

        }
    );

} else {

    console.error(
        "❌ #notificationBtn introuvable dans home.html"
    );

}


// ======================================================
// ❌ FERMER NOTIFICATIONS
// ======================================================

if (closeNotifications) {

    closeNotifications.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            closeNotificationModal();

        }
    );

} else {

    console.warn(
        "⚠️ #closeNotifications introuvable"
    );

}


// ======================================================
// ❌ FERMER FENÊTRE NOTIFICATION
// ======================================================

function closeNotificationModal() {

    if (!notificationModal) return;


    notificationModal.classList.remove(
        "show"
    );


    notificationModal.style.display =
        "none";


    console.log(
        "❌ Fenêtre notifications fermée"
    );

}


// ======================================================
// 🔔 ÉCOUTER LES NOTIFICATIONS FIRESTORE
// ======================================================

function listenNotifications() {

    if (!currentUser) return;


    console.log(
        "🔔 Écoute des notifications Firebase..."
    );


    // Ne lire que les notifications destinées à l'utilisateur connecté.
    // Firestore Security Rules n'appliquent pas de filtre après lecture.
    const notificationsRef =
        query(
            collection(db, "notifications"),
            where("userId", "==", currentUser.uid)
        );


    onSnapshot(
        notificationsRef,

        (snapshot) => {

            const firebaseNotifications = [];


            snapshot.forEach(
                (notificationDoc) => {

                    const data =
                        notificationDoc.data();


                    const targetUser =
                        data.userId || "";


                    // Notification générale
                    const isForEveryone =
                        targetUser === "" ||
                        targetUser === "all";


                    // Notification personnelle
                    const isForUser =
                        targetUser ===
                        currentUser.uid;


                    if (
                        isForEveryone ||
                        isForUser
                    ) {

                        firebaseNotifications.push({

                            id:
                                notificationDoc.id,

                            ...data

                        });

                    }

                }
            );


            notifications =
                firebaseNotifications;


            console.log(
                "🔔 Notifications Firebase :",
                notifications
            );


            renderNotifications();

            updateNotificationBadge();

        },

        (error) => {

            console.error(
                "❌ Erreur notifications Firebase :",
                error
            );

        }
    );

}


// ======================================================
// 🎟️ ÉCOUTER LES BILLETS
// ======================================================

function listenUserTickets() {

    if (!currentUser) return;


    console.log(
        "🎟️ Écoute des billets..."
    );


    const ticketsQuery =
        query(
            collection(
                db,
                "tickets"
            ),

            where(
                "userId",
                "==",
                currentUser.uid
            )
        );


    onSnapshot(
        ticketsQuery,

        (snapshot) => {

            tickets = [];


            snapshot.forEach(
                (ticketDoc) => {

                    tickets.push({

                        id:
                            ticketDoc.id,

                        ...ticketDoc.data()

                    });

                }
            );


            console.log(
                "🎟️ Billets :",
                tickets
            );


            renderNotifications();

        },

        (error) => {

            console.error(
                "❌ Erreur billets :",
                error
            );

        }
    );

}


// ======================================================
// 🔔 AFFICHER LES NOTIFICATIONS
// ======================================================

function renderNotifications() {

    if (!notificationList) {

        console.warn(
            "⚠️ #notificationList introuvable"
        );

        return;

    }


    if (!currentUser) {

        notificationList.innerHTML = `
            <div class="search-empty">
                🔐 Connectez-vous pour voir vos notifications.
            </div>
        `;

        return;

    }


    // ==================================================
    // NOTIFICATIONS FIREBASE
    // ==================================================

    const firebaseItems =
        notifications.map(
            (notification) => {

                return {

                    id:
                        notification.id,

                    icon:
                        getNotificationIcon(
                            notification.type
                        ),

                    title:
                        notification.title ||
                        "Notification",

                    message:
                        notification.message ||
                        "",

                    date:
                        formatTimestamp(
                            notification.createdAt
                        ),

                    read:
                        notification.read === true,

                    source:
                        "firebase"

                };

            }
        );


    // ==================================================
    // NOTIFICATIONS BILLETS
    // ==================================================

    const ticketItems =
        tickets.map(
            (ticket) => {

                const ticketNumber =
                    ticket.ticketId ||
                    ticket.id ||
                    "Billet";


                return {

                    id:
                        `ticket-${ticket.id}`,

                    icon:
                        "🎟️",

                    title:
                        "Billet confirmé",

                    message:
                        `Votre billet ${ticketNumber} est confirmé.`,

                    date:
                        `${ticket.date || ""} ${
                            ticket.depart ||
                            ticket.time ||
                            ""
                        }`,

                    read:
                        true,

                    source:
                        "ticket"

                };

            }
        );


    // ==================================================
    // FUSION
    // ==================================================

    const all =
        [
            ...firebaseItems,
            ...ticketItems
        ];


    // ==================================================
    // AUCUNE NOTIFICATION
    // ==================================================

    if (all.length === 0) {

        notificationList.innerHTML = `
            <div class="search-empty">
                🔔 Aucune notification pour le moment.
            </div>
        `;

        return;

    }


    // ==================================================
    // NON LUES EN PREMIER
    // ==================================================

    all.sort(
        (a, b) => {

            return (
                Number(a.read) -
                Number(b.read)
            );

        }
    );


    // ==================================================
    // AFFICHAGE
    // ==================================================

    notificationList.innerHTML =
        all.map(
            (notification) => {

                return `

                    <div
                        class="
                            notification-item
                            ${
                                notification.read
                                    ? "read"
                                    : "unread"
                            }
                        "
                        data-notification-id="${escapeHtml(
                            notification.id
                        )}"
                        data-source="${escapeHtml(
                            notification.source
                        )}">

                        <div
                            class="notification-icon">

                            ${notification.icon}

                        </div>


                        <div
                            class="notification-content">

                            <strong>
                                ${escapeHtml(
                                    notification.title
                                )}
                            </strong>


                            <p>
                                ${escapeHtml(
                                    notification.message
                                )}
                            </p>


                            ${
                                notification.date
                                    ? `
                                        <small>
                                            ${escapeHtml(
                                                notification.date
                                            )}
                                        </small>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                `;

            }
        ).join("");


    // ==================================================
    // CLIC NOTIFICATION
    // ==================================================

    document
        .querySelectorAll(
            ".notification-item.unread"
        )
        .forEach(
            (element) => {

                element.addEventListener(
                    "click",
                    () => {

                        const id =
                            element.dataset
                                .notificationId;


                        const source =
                            element.dataset
                                .source;


                        if (
                            source ===
                            "firebase"
                        ) {

                            markNotificationAsRead(
                                id
                            );

                        }

                    }
                );

            }
        );

}


// ======================================================
// 🔔 ICÔNE SELON TYPE
// ======================================================

function getNotificationIcon(
    type
) {

    switch (type) {

        case "ticket":
            return "🎟️";

        case "departure":
            return "🚢";

        case "warning":
            return "⚠️";

        case "success":
            return "✅";

        case "payment":
            return "💳";

        case "info":
            return "📢";

        default:
            return "🔔";

    }

}


// ======================================================
// 👁️ MARQUER NOTIFICATION COMME LUE
// ======================================================

async function markNotificationAsRead(
    notificationId
) {

    if (!notificationId) return;


    try {

        await updateDoc(
            doc(
                db,
                "notifications",
                notificationId
            ),

            {
                read: true
            }
        );


        console.log(
            "✅ Notification marquée comme lue :",
            notificationId
        );


    } catch (error) {

        console.error(
            "❌ Erreur marquage notification :",
            error
        );

    }

}


// ======================================================
// 🔴 BADGE NOTIFICATIONS
// ======================================================

function updateNotificationBadge() {

    if (!notificationBadge) {

        console.warn(
            "⚠️ #notificationBadge introuvable"
        );

        return;

    }


    const unreadCount =
        notifications.filter(
            (notification) =>
                notification.read !== true
        ).length;


    if (unreadCount > 0) {

        notificationBadge.style.display =
            "flex";


        notificationBadge.textContent =
            unreadCount > 9
                ? "9+"
                : unreadCount;

    } else {

        notificationBadge.style.display =
            "none";


        notificationBadge.textContent =
            "";

    }

}


// ======================================================
// 🕐 FORMAT DATE FIREBASE
// ======================================================

function formatTimestamp(
    timestamp
) {

    if (!timestamp) {

        return "";

    }


    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);


        return date.toLocaleString(
            "fr-FR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (error) {

        return "";

    }

}


// ======================================================
// 🛡️ PROTECTION HTML
// ======================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ======================================================
// 🖱️ CLIQUER EN DEHORS DES MODALES
// ======================================================

window.addEventListener(
    "click",
    function (event) {

        // Recherche
        if (
            searchModal &&
            event.target ===
            searchModal
        ) {

            closeSearchModal();

        }


        // Notifications
        if (
            notificationModal &&
            event.target ===
            notificationModal
        ) {

            closeNotificationModal();

        }

    }
);


// ======================================================
// ⌨️ TOUCHE ESC
// ======================================================

window.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        closeSearchModal();

        closeNotificationModal();

    }
);


// ======================================================
// 🌍 CHANGEMENT DE LANGUE
// ======================================================

window.addEventListener(
    "egoree-language-changed",
    function () {

        console.log(
            "🌍 Langue modifiée — actualisation Home"
        );

        renderNotifications();

    }
);


// ======================================================
// FIN
// ======================================================

console.log(
    "✅ HOME.JS PRÊT — Recherche + Notifications Firebase"
);
