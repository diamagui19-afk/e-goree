# Activation des outils administrateur

1. Dans Firebase Console, garde les comptes clients avec `role: "user"` (ou sans champ `role`) et définis manuellement `role: "admin"` sur le profil de l’administrateur.
2. Publie les règles du fichier `../firestore.rules` dans Firestore Rules. Elles empêchent un client de s’attribuer le rôle admin et autorisent les opérations d’administration.
3. Dans `backend/.env`, configure `WAVE_WEBHOOK_SECRET` avec le secret de signature fourni par Wave. Configure aussi `WAVE_CALLBACK_URL` vers l’URL publique `https://<ton-domaine>/api/wave/webhook` et active l’événement `checkout.session.completed` dans Wave.
4. Garde le backend démarré pendant les essais. Les écrans admin appellent l’API locale `http://localhost:3001`; pour un téléphone physique ou une mise en production, remplace cette adresse par l’URL réseau ou publique du backend.

Accepter une demande annule le billet et réactive les places. Un paiement Wave confirmé est remboursé automatiquement par l’API Wave. Pour Orange Money et les autres moyens, l’administrateur effectue d’abord le remboursement dans le portail du fournisseur, puis confirme l’action dans l’application.
