// ======================================================
// 🗺️ E-GORÉE — CARTE + ITINÉRAIRE + NAVIGATION GPS
// ======================================================

let map;
let directionsService;
let directionsRenderer;

let userMarker = null;
let watchId = null;

let navigationActive = false;
let currentDestination = null;


// ======================================================
// 📍 INITIALISATION DE LA CARTE
// ======================================================

function initMap() {

    console.log("🗺️ Initialisation Google Maps...");

    const goree = {
        lat: 14.6667,
        lng: -17.3989
    };

    map = new google.maps.Map(
        document.getElementById("map"),
        {
            center: goree,
            zoom: 15,

            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,

            zoomControl: true
        }
    );


    directionsService =
        new google.maps.DirectionsService();


    directionsRenderer =
        new google.maps.DirectionsRenderer({
            map: map,

            suppressMarkers: false,

            polylineOptions: {
                strokeColor: "#1d6b4f",
                strokeOpacity: 0.9,
                strokeWeight: 5
            }
        });


    console.log("✅ Google Maps prête");

    addGoreeMarkers();

}


// ======================================================
// 📍 MARQUEURS DES LIEUX
// ======================================================

function addGoreeMarkers() {

    const lieux = [

        {
            name: "Maison des Esclaves",
            position: {
                lat: 14.6666,
                lng: -17.3990
            }
        },

        {
            name: "Mémorial de Gorée",
            position: {
                lat: 14.6675,
                lng: -17.3995
            }
        },

        {
            name: "Castel de Gorée",
            position: {
                lat: 14.6628,
                lng: -17.3984
            }
        },

        {
            name: "Plage de Gorée",
            position: {
                lat: 14.6690,
                lng: -17.3969
            }
        },

        {
            name: "Embarcadère de Gorée",
            position: {
                lat: 14.6669,
                lng: -17.4000
            }
        }

    ];


    lieux.forEach((lieu) => {

        const marker =
            new google.maps.Marker({

                position: lieu.position,

                map: map,

                title: lieu.name

            });


        const infoWindow =
            new google.maps.InfoWindow({

                content: `
                    <div style="
                        padding:8px;
                        font-family:Arial;
                    ">
                        <strong>
                            ${lieu.name}
                        </strong>
                    </div>
                `

            });


        marker.addListener(
            "click",
            () => {

                infoWindow.open({
                    anchor: marker,
                    map
                });

            }
        );

    });

}


// ======================================================
// 🚶 CALCULER UN ITINÉRAIRE À PIED
// ======================================================

function calculateWalkingRoute(
    origin,
    destination
) {

    if (!directionsService) {

        console.error(
            "❌ DirectionsService indisponible"
        );

        return;

    }


    directionsService.route(

        {

            origin: origin,

            destination: destination,

            travelMode:
                google.maps.TravelMode.WALKING

        },

        (result, status) => {

            if (
                status ===
                "OK"
            ) {

                directionsRenderer.setDirections(
                    result
                );


                const route =
                    result.routes[0];


                if (
                    route &&
                    route.legs &&
                    route.legs[0]
                ) {

                    const leg =
                        route.legs[0];


                    console.log(
                        "📏 Distance :",
                        leg.distance.text
                    );


                    console.log(
                        "⏱️ Durée :",
                        leg.duration.text
                    );

                }

            }

            else {

                console.error(
                    "❌ Impossible de calculer l'itinéraire :",
                    status
                );

                alert(
                    "Impossible de calculer cet itinéraire."
                );

            }

        }

    );

}


// ======================================================
// 📍 DEMANDER LA LOCALISATION
// ======================================================

function requestUserLocation(
    destination
) {

    if (
        !navigator.geolocation
    ) {

        alert(
            "❌ Votre appareil ne prend pas en charge la géolocalisation."
        );

        return;

    }


    console.log(
        "📍 Demande d'autorisation de localisation..."
    );


    navigator.geolocation.getCurrentPosition(

        (position) => {

            console.log(
                "✅ Localisation autorisée"
            );


            const userPosition = {

                lat:
                    position.coords.latitude,

                lng:
                    position.coords.longitude

            };


            currentDestination =
                destination;


            startNavigation(
                userPosition,
                destination
            );

        },


        (error) => {

            console.error(
                "❌ Localisation refusée/indisponible :",
                error
            );


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                alert(
                    "📍 La localisation est nécessaire pour démarrer la navigation.\n\n" +
                    "Autorisez la localisation dans votre navigateur puis réessayez."
                );

            }

            else if (
                error.code ===
                error.POSITION_UNAVAILABLE
            ) {

                alert(
                    "❌ Position GPS indisponible."
                );

            }

            else if (
                error.code ===
                error.TIMEOUT
            ) {

                alert(
                    "⏱️ La récupération de votre position a pris trop de temps."
                );

            }

        },

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0

        }

    );

}


// ======================================================
// 🧭 DÉMARRER LA NAVIGATION
// ======================================================

function startNavigation(
    userPosition,
    destination
) {

    navigationActive =
        true;


    console.log(
        "🧭 Navigation démarrée"
    );


    // --------------------------------------------------
    // 🔵 Marqueur utilisateur
    // --------------------------------------------------

    if (userMarker) {

        userMarker.setPosition(
            userPosition
        );

    }

    else {

        userMarker =
            new google.maps.Marker({

                position:
                    userPosition,

                map: map,

                title:
                    "Votre position",

                icon: {

                    path:
                        google.maps.SymbolPath.CIRCLE,

                    scale: 8,

                    fillColor:
                        "#4285F4",

                    fillOpacity: 1,

                    strokeColor:
                        "#ffffff",

                    strokeWeight: 3

                }

            });

    }


    // --------------------------------------------------
    // 🎯 Centrer la carte
    // --------------------------------------------------

    map.panTo(
        userPosition
    );


    map.setZoom(
        17
    );


    // --------------------------------------------------
    // 🚶 Calcul de l'itinéraire
    // --------------------------------------------------

    calculateWalkingRoute(
        userPosition,
        destination
    );


    // --------------------------------------------------
    // 📡 Suivi GPS en temps réel
    // --------------------------------------------------

    if (
        watchId !== null
    ) {

        navigator.geolocation.clearWatch(
            watchId
        );

    }


    watchId =
        navigator.geolocation.watchPosition(

            (position) => {

                if (
                    !navigationActive
                ) {

                    return;

                }


                const newPosition = {

                    lat:
                        position.coords.latitude,

                    lng:
                        position.coords.longitude

                };


                console.log(
                    "📍 Nouvelle position :",
                    newPosition
                );


                // Mise à jour du point bleu
                if (
                    userMarker
                ) {

                    userMarker.setPosition(
                        newPosition
                    );

                }


                // Recentrage léger
                map.panTo(
                    newPosition
                );


                // Recalcul de l'itinéraire
                if (
                    currentDestination
                ) {

                    calculateWalkingRoute(

                        newPosition,

                        currentDestination

                    );

                }

            },


            (error) => {

                console.error(
                    "❌ Erreur GPS pendant la navigation :",
                    error
                );

            },


            {

                enableHighAccuracy:
                    true,

                maximumAge:
                    3000,

                timeout:
                    10000

            }

        );


    showNavigationControls();

}


// ======================================================
// ⏹️ ARRÊTER LA NAVIGATION
// ======================================================

function stopNavigation() {

    console.log(
        "⏹️ Navigation arrêtée"
    );


    navigationActive =
        false;


    currentDestination =
        null;


    if (
        watchId !== null
    ) {

        navigator.geolocation.clearWatch(
            watchId
        );

        watchId =
            null;

    }


    if (
        userMarker
    ) {

        userMarker.setMap(
            null
        );

        userMarker =
            null;

    }


    directionsRenderer.setDirections(
        {
            routes: []
        }
    );


    hideNavigationControls();

}


// ======================================================
// 🧭 BOUTONS DE NAVIGATION
// ======================================================

function showNavigationControls() {

    let controls =
        document.getElementById(
            "navigation-controls"
        );


    if (!controls) {

        controls =
            document.createElement(
                "div"
            );

        controls.id =
            "navigation-controls";


        controls.style.position =
            "fixed";

        controls.style.bottom =
            "25px";

        controls.style.left =
            "50%";

        controls.style.transform =
            "translateX(-50%)";

        controls.style.zIndex =
            "9999";

        controls.style.background =
            "#ffffff";

        controls.style.padding =
            "12px";

        controls.style.borderRadius =
            "14px";

        controls.style.boxShadow =
            "0 4px 20px rgba(0,0,0,.2)";


        controls.innerHTML = `

            <button
                id="stop-navigation-btn"
                style="
                    border:none;
                    padding:12px 20px;
                    border-radius:10px;
                    background:#b42318;
                    color:white;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                ⏹️ Arrêter la navigation
            </button>

        `;


        document.body.appendChild(
            controls
        );


        document
            .getElementById(
                "stop-navigation-btn"
            )
            .addEventListener(
                "click",
                stopNavigation
            );

    }

}


// ======================================================
// ❌ CACHER LES CONTRÔLES
// ======================================================

function hideNavigationControls() {

    const controls =
        document.getElementById(
            "navigation-controls"
        );


    if (controls) {

        controls.remove();

    }

}


// ======================================================
// 🌍 EXPOSER LES FONCTIONS
// ======================================================

window.initMap =
    initMap;

window.calculateWalkingRoute =
    calculateWalkingRoute;

window.requestUserLocation =
    requestUserLocation;

window.startNavigation =
    startNavigation;

window.stopNavigation =
    stopNavigation;

// Google calls this global callback when the Maps API key,
// billing account, or API authorization is rejected.
window.gm_authFailure = function () {
    console.error(
        "Google Maps a refusé l'authentification. Vérifiez la clé, la facturation et les restrictions d'API/référent."
    );

    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const message = document.createElement("p");
    message.className = "map-api-error";
    message.setAttribute("role", "alert");
    message.textContent =
        "La carte Google Maps est indisponible. Vérifiez la configuration de l'API.";
    mapContainer.replaceChildren(message);
};

console.log(
    "✅ MAP JS PRÊT"
);
// ======================================================
// 🧭 SYSTÈME D'ITINÉRAIRE E-GORÉE
// ======================================================

const routeDestinations = {

    "maison-esclaves": {
        name: "Maison des Esclaves",
        lat: 14.6666,
        lng: -17.3990
    },

    "memorial": {
        name: "Mémorial de Gorée",
        lat: 14.6675,
        lng: -17.3995
    },

    "castel": {
        name: "Castel de Gorée",
        lat: 14.6628,
        lng: -17.3984
    },

    "plage": {
        name: "Plage de Gorée",
        lat: 14.6690,
        lng: -17.3969
    },

    "goree-port": {
        name: "Embarcadère de Gorée",
        lat: 14.6669,
        lng: -17.4000
    }

};


let selectedRouteDestination = null;

let selectedRouteOrigin = null;

let routeCalculated = false;


// ======================================================
// 📍 OBTENIR LA POSITION
// ======================================================

function getCurrentPositionForRoute() {

    return new Promise(
        (resolve, reject) => {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "La géolocalisation n'est pas disponible."
                    )
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                (position) => {

                    resolve({

                        lat:
                            position.coords.latitude,

                        lng:
                            position.coords.longitude

                    });

                },

                (error) => {

                    reject(error);

                },

                {

                    enableHighAccuracy: true,

                    timeout: 10000,

                    maximumAge: 0

                }

            );

        }
    );

}


// ======================================================
// 🧭 CALCULER L'ITINÉRAIRE
// ======================================================

async function calculateSelectedRoute() {

    const originSelect =
        document.getElementById(
            "route-origin"
        );

    const destinationSelect =
        document.getElementById(
            "route-destination"
        );


    const destinationId =
        destinationSelect.value;


    if (!destinationId) {

        alert(
            "Veuillez choisir une destination."
        );

        return;

    }


    const destination =
        routeDestinations[
            destinationId
        ];


    if (!destination) {

        alert(
            "Destination introuvable."
        );

        return;

    }


    try {

        // ----------------------------------------------
        // 📍 DÉPART
        // ----------------------------------------------

        if (
            originSelect.value ===
            "current"
        ) {

            console.log(
                "📍 Demande de localisation..."
            );


            selectedRouteOrigin =
                await getCurrentPositionForRoute();

        }

        else {

            selectedRouteOrigin =
                routeDestinations[
                    originSelect.value
                ];

        }


        selectedRouteDestination =
            destination;


        // ----------------------------------------------
        // 🚶 GOOGLE DIRECTIONS
        // ----------------------------------------------

        directionsService.route(

            {

                origin:
                    selectedRouteOrigin,

                destination:
                    selectedRouteDestination,

                travelMode:
                    google.maps.TravelMode.WALKING,

                optimizeWaypoints:
                    false

            },

            (result, status) => {

                if (
                    status !==
                    "OK"
                ) {

                    console.error(
                        "❌ Itinéraire impossible :",
                        status
                    );

                    alert(
                        "Impossible de calculer cet itinéraire."
                    );

                    return;

                }


                directionsRenderer.setDirections(
                    result
                );


                const leg =
                    result.routes[0].legs[0];


                const resultBox =
                    document.getElementById(
                        "route-result"
                    );


                const distance =
                    document.getElementById(
                        "route-distance"
                    );


                const duration =
                    document.getElementById(
                        "route-duration"
                    );


                distance.textContent =
                    leg.distance.text;


                duration.textContent =
                    "🚶 " +
                    leg.duration.text;


                resultBox.style.display =
                    "block";


                routeCalculated =
                    true;


                console.log(
                    "✅ Itinéraire calculé"
                );

                console.log(
                    "📏",
                    leg.distance.text
                );

                console.log(
                    "⏱️",
                    leg.duration.text
                );

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Erreur localisation :",
            error
        );


        if (
            error.code ===
            1
        ) {

            alert(
                "📍 Autorisation de localisation refusée.\n\n" +
                "Autorisez la localisation pour utiliser votre position comme départ."
            );

        }

        else {

            alert(
                "Impossible d'obtenir votre position."
            );

        }

    }

}


// ======================================================
// 📍 DÉMARRER NAVIGATION
// ======================================================

async function startSelectedNavigation() {

    if (
        !selectedRouteDestination
    ) {

        alert(
            "Calculez d'abord un itinéraire."
        );

        return;

    }


    try {

        const position =
            await getCurrentPositionForRoute();


        startNavigation(

            position,

            selectedRouteDestination

        );

    }

    catch (error) {

        console.error(
            "❌ GPS :",
            error
        );


        alert(
            "📍 Autorisez la localisation pour démarrer la navigation."
        );

    }

}


// ======================================================
// 🔘 BOUTONS
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const calculateBtn =
            document.getElementById(
                "calculate-route-btn"
            );


        const navigationBtn =
            document.getElementById(
                "start-navigation-btn"
            );


        const closeBtn =
            document.getElementById(
                "close-route-panel"
            );


        if (calculateBtn) {

            calculateBtn.addEventListener(
                "click",
                calculateSelectedRoute
            );

        }


        if (navigationBtn) {

            navigationBtn.addEventListener(
                "click",
                startSelectedNavigation
            );

        }


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                () => {

                    const panel =
                        document.getElementById(
                            "route-panel"
                        );


                    if (panel) {

                        panel.style.display =
                            "none";

                    }

                }
            );

        }

    }
);
// ======================================================
// 🧭 OUVRIR / FERMER LE PANNEAU ITINÉRAIRE
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const openRouteBtn =
            document.getElementById(
                "open-route-btn"
            );

        const routePanel =
            document.getElementById(
                "route-panel"
            );

        const closeRouteBtn =
            document.getElementById(
                "close-route-panel"
            );


        if (openRouteBtn) {

            openRouteBtn.addEventListener(
                "click",
                () => {

                    routePanel.style.display =
                        "block";

                }
            );

        }


        if (closeRouteBtn) {

            closeRouteBtn.addEventListener(
                "click",
                () => {

                    routePanel.style.display =
                        "none";

                }
            );

        }

    }
);
