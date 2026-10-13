/**
 * navbar-loader.js
 * Charge le composant navbar dans toutes les pages
 * et gère l'état actif des liens.
 */

(function() {
    'use strict';

    // Appliquer le dark mode persisté avant tout rendu
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    }

    // Mapping des pages vers les data-page correspondants dans la navbar
    const pageMapping = {
        'home.html': 'home',
        'map.html': 'map',
        
        'billets.html': 'Billets',
        'profile.html': 'settings',
        'settings.html': 'settings',
        'login.html': null,
        'index.html': null
    };

    const NAVBAR_HTML = `
<nav class="bottom-nav">

<a href="home.html" data-page="home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
        <span>Accueil</span>
    </a>
    <style>
        /* Garantit que les 4 onglets (dont Carte & Réglages) restent visibles */
        .bottom-nav{ max-width:520px; left:50% !important; transform:translateX(-50%); justify-content:space-between; }
        .bottom-nav a{ flex:1 1 0; min-width:0; font-size:11px; white-space:nowrap; overflow:hidden; }
    </style>

    <a href="billets.html" data-page="billets">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M3 12h18" stroke-dasharray="2 2"/></svg>
        <span>Billets</span>
    </a>

    <a href="map.html" data-page="map">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20l-6-2V4l6 2 6-2 6 2v16l-6-2-6 2z"/><line x1="9" y1="6" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="18"/></svg>
        <span>Carte</span>
    </a>

    <a href="settings.html" data-page="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>
        <span>Réglages</span>
    </a>

</nav>
`;

    async function fetchNavbar(paths) {
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error('Erreur chargement navbar: ' + response.status);
                }
                return await response.text();
            } catch (err) {
                console.warn('Échec fetch navbar:', path, err);
            }
        }
        throw new Error('Aucun chemin navbar valide trouvé.');
    }

    /**
     * Charge la navbar et l'injecte dans le DOM
     */
    async function loadNavbar() {
        const navbarContainer = document.getElementById('navbar');
        if (!navbarContainer) return;

        // Éviter de charger deux fois
        if (navbarContainer.dataset.navbarLoaded === 'true') return;

        const tryPaths = [
            'components/navbar.html',
            './components/navbar.html',
            '../components/navbar.html',
            'pages/components/navbar.html'
        ];

        const html = NAVBAR_HTML;

        navbarContainer.innerHTML = html;
        navbarContainer.dataset.navbarLoaded = 'true';
        setActiveLink();
    }

    /**
     * Détermine quelle page est active et ajoute la classe 'active'
     */
    function setActiveLink() {
        const links = document.querySelectorAll('.bottom-nav a');
        if (!links.length) return;

        // Récupérer le nom du fichier actuel
        const pathParts = window.location.pathname.split('/');
        const currentFile = pathParts[pathParts.length - 1] || 'home.html';
        const currentPage = pageMapping[currentFile] || 'home';

        links.forEach(link => {
            const page = link.dataset.page;
            if (page === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }

            // Gérer le clic (l'état actif sera réévalué à la navigation complète)
            link.addEventListener('click', function(e) {
                links.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNavbar);
    } else {
        loadNavbar();
    }

})();

