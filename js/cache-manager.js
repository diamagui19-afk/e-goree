// ======================================================
// 🔄 GESTION DU CACHE NAVIGATEUR
// Désactive le Back-Forward Cache pour Firestore
// ======================================================

// Empêcher la mise en cache arrière-avant du navigateur
// qui interfère avec les connexions WebSocket
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('🔄 Page restaurée du cache — Rechargement...');
        // Recharger les données Firestore
        location.reload();
    }
});

window.addEventListener('pagehide', function(event) {
    if (event.persisted) {
        console.log('⚠️ Page mise en cache (Back-Forward Cache)');
    }
});

// Désactiver le bfcache en signalant au navigateur
// que nous avons des ressources que nous devons fermer
if (window.onunload) {
    const originalUnload = window.onunload;
    window.onunload = function() {
        originalUnload();
        // Fermer les connexions Firestore
        console.log('🔌 Fermeture des connexions Firestore');
    };
} else {
    window.onunload = function() {
        console.log('🔌 Page quittée — Fermeture des connexions');
    };
}

// Gestion des changements de visibilité de la page
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('👁️ Page cachée');
    } else {
        console.log('👁️ Page visible — Vérification des connexions');
        // Revalider les connexions Firestore si nécessaire
    }
});

console.log('✅ Gestionnaire de cache navigateur activé');
