/* =====================================================
   E-GORÉE — AIDE & ASSISTANCE
   ===================================================== */

console.log("🆘 AIDE.JS chargé");


/* =====================================================
   ÉLÉMENTS
   ===================================================== */

const searchInput =
    document.getElementById("help-search");

const clearSearch =
    document.getElementById("clear-search");

const faqItems =
    document.querySelectorAll(".faq-item");

const faqCount =
    document.getElementById("faq-count");

const noResults =
    document.getElementById("no-results");

const categories =
    document.querySelectorAll(".category");

const reportButton =
    document.getElementById("report-problem");

const reportModal =
    document.getElementById("report-modal");

const closeModal =
    document.getElementById("close-modal");

const modalOverlay =
    document.querySelector(".modal-overlay");

const problemText =
    document.getElementById("problem-text");

const sendReport =
    document.getElementById("send-report");


/* =====================================================
   FAQ — OUVERTURE / FERMETURE
   ===================================================== */

document
    .querySelectorAll(".faq-question")
    .forEach((question) => {

        question.addEventListener(
            "click",
            () => {

                const item =
                    question.closest(".faq-item");

                if (!item) return;


                const wasOpen =
                    item.classList.contains("open");


                /* Fermer les autres */

                document
                    .querySelectorAll(".faq-item.open")
                    .forEach((other) => {

                        if (other !== item) {

                            other.classList.remove(
                                "open"
                            );

                        }

                    });


                item.classList.toggle(
                    "open",
                    !wasOpen
                );

            }
        );

    });


/* =====================================================
   FILTRAGE
   ===================================================== */

let currentCategory = "all";


function filterFAQ() {

    const query =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    let visibleCount = 0;


    faqItems.forEach((item) => {

        const category =
            item.dataset.category || "";


        const searchText =
            (
                item.dataset.search ||
                item.textContent
            ).toLowerCase();


        const matchesSearch =
            !query ||
            searchText.includes(query);


        const matchesCategory =
            currentCategory === "all" ||
            category === currentCategory;


        const visible =
            matchesSearch &&
            matchesCategory;


        item.style.display =
            visible ? "" : "none";


        if (visible) {

            visibleCount++;

        } else {

            item.classList.remove(
                "open"
            );

        }

    });


    if (faqCount) {

        faqCount.textContent =
            visibleCount;

    }


    if (noResults) {

        noResults.classList.toggle(
            "visible",
            visibleCount === 0
        );

    }


    if (searchInput) {

        const hasText =
            searchInput.value.trim().length > 0;

        const searchBox =
            searchInput.closest(".search-box");

        if (searchBox) {

            searchBox.classList.toggle(
                "has-text",
                hasText
            );

        }

    }

}


/* =====================================================
   RECHERCHE
   ===================================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        filterFAQ
    );

}


if (clearSearch) {

    clearSearch.addEventListener(
        "click",
        () => {

            searchInput.value = "";

            filterFAQ();

            searchInput.focus();

        }
    );

}


/* =====================================================
   CATÉGORIES
   ===================================================== */

categories.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            categories.forEach(
                (category) => {

                    category.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add(
                "active"
            );


            currentCategory =
                button.dataset.category ||
                "all";


            filterFAQ();

        }
    );

});


/* =====================================================
   MODAL SIGNALER UN PROBLÈME
   ===================================================== */

function openModal() {

    if (!reportModal) return;

    reportModal.classList.add(
        "visible"
    );

    document.body.style.overflow =
        "hidden";

    if (problemText) {

        setTimeout(
            () => problemText.focus(),
            100
        );

    }

}


function closeReportModal() {

    if (!reportModal) return;

    reportModal.classList.remove(
        "visible"
    );

    document.body.style.overflow =
        "";

}


if (reportButton) {

    reportButton.addEventListener(
        "click",
        openModal
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeReportModal
    );

}


if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        closeReportModal
    );

}


/* =====================================================
   ESCAPE POUR FERMER
   ===================================================== */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            reportModal &&
            reportModal.classList.contains("visible")
        ) {

            closeReportModal();

        }

    }
);


/* =====================================================
   ENVOYER UN SIGNALEMENT
   ===================================================== */

if (sendReport) {

    sendReport.addEventListener(
        "click",
        () => {

            const text =
                problemText
                    ? problemText.value.trim()
                    : "";


            if (!text) {

                if (problemText) {

                    problemText.focus();

                }

                return;

            }


            /*
             * Pour le moment, on ouvre le client
             * e-mail de l'utilisateur.
             *
             * On pourra ensuite connecter ceci
             * directement à Firestore.
             */

            const subject =
                encodeURIComponent(
                    "Signalement — E-Gorée"
                );


            const body =
                encodeURIComponent(
                    text +
                    "\n\n---\nEnvoyé depuis E-Gorée"
                );




              window.location.href =
    `mailto:supportegoree@gmail.com?subject=${subject}&body=${body}`;
            problemText.value = "";

            closeReportModal();

        }
    );

}


/* =====================================================
   INITIALISATION
   ===================================================== */

filterFAQ();


console.log(
    "✅ Aide et assistance prête"
);