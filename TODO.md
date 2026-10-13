# 🎨 Refonte E-Gorée — Nouveau thème (terracotta/or, Fraunces/Work Sans, wax, dark mode)

## Objectif
Appliquer le nouveau design (fourni par l'utilisateur) à toutes les pages **sauf** splash (`index.html`) et login (`pages/login.html`), en **conservant la structure multi-pages et toutes les fonctionnalités** (navigation, audio, carte Leaflet, billets, paramètres).

## Étapes

- [x] 1. `css/variables.css` — Adapter la palette (terracotta `#B5541B`, or `#D9A441`, indigo `#1E3A4C`, feuille `#5C8A3A`, corail `#E1673D`) + polices (Fraunces, Work Sans, IBM Plex Mono) + renforcer le dark mode
- [x] 2. `components/navbar.html` — Refonte visuelle (icônes, couleurs)
- [x] 3. `css/navbar.css` — Nouveau style navbar (thème créme/terracotta)
- [x] 4. `pages/home.html` — Refonte (header, bannière, lieux, audioguide)
- [x] 5. `css/home.css` — Nouveau style home (wax pattern, cards)
- [x] 6. `pages/map.html` + `css/map.css` — Refonte carte Leaflet
- [x] 7. `pages/tickets.html` + `css/tickets.css` — Refonte billet chaloupe
- [x] 8. `pages/billets.html` + `css/billets.css` — Style cohérent
- [x] 9. `pages/settings.html` + `css/settings.css` — Refonte paramètres (chips langue, switches, déconnexion)
- [x] 10. `pages/profile.html` — Refonte profil (carte profil)
- [x] 11. `js/navbar-loader.js` — Dark mode persistant + mapping navbar corrigé (billets→tickets, profile→settings)
