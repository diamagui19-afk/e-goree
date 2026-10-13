// ======================================================
// 🚨 GESTION DES ERREURS FIRESTORE
// Reconnexion automatique et gestion des timeouts
// ======================================================

let firebaseRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 secondes

/**
 * Wrapper pour les appels Firestore avec gestion d'erreur
 */
async function firebaseCallWithRetry(callback, operation = 'Firestore Operation') {
    try {
        return await callback();
    } catch (error) {
        console.error(`❌ ${operation} échoué:`, error.message);

        // Vérifier le type d'erreur
        if (error.code === 'permission-denied') {
            console.error('🔐 Erreur de permissions Firestore — Vérifiez les règles');
            return null;
        }

        if (error.code === 'unauthenticated') {
            console.error('🔐 Non authentifié — Redirection vers login');
            window.location.href = 'login.html';
            return null;
        }

        // Retry logic pour les erreurs temporaires
        if (firebaseRetryCount < MAX_RETRY_ATTEMPTS) {
            firebaseRetryCount++;
            console.warn(`⏳ Tentative de reconnexion (${firebaseRetryCount}/${MAX_RETRY_ATTEMPTS})...`);
            
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return firebaseCallWithRetry(callback, operation);
        } else {
            console.error(`❌ Impossible de se connecter à ${operation} après ${MAX_RETRY_ATTEMPTS} tentatives`);
            firebaseRetryCount = 0;
            return null;
        }
    }
}

/**
 * Monitorer la connexion Firestore
 */
function monitorFirebaseConnection() {
    if (typeof window.firebase !== 'undefined' && window.firebase.firestore) {
        const firestore = window.firebase.firestore();
        
        // Écouter les changements de connexion
        firestore.enableNetwork().catch(error => {
            console.warn('⚠️ Erreur activation réseau Firestore:', error.message);
        });
    }
}

/**
 * Gérer les erreurs de WebSocket
 */
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('WebSocket')) {
        console.warn('🔌 Erreur WebSocket détectée — Tentative de reconnexion');
        firebaseRetryCount = 0;
        monitorFirebaseConnection();
    }
});

console.log('✅ Gestionnaire d\'erreurs Firestore activé');
