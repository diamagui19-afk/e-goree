(() => {
    const readTheme = () => localStorage.getItem("theme") === "dark" ? "dark" : "light";
    const applyTheme = (theme) => {
        const value = theme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = value;
        document.documentElement.classList.toggle("dark", value === "dark");
        if (document.body) document.body.classList.toggle("dark", value === "dark");
        return value;
    };

    applyTheme(readTheme());

    window.EGoreeTheme = {
        get: readTheme,
        set(theme) {
            const value = applyTheme(theme);
            localStorage.setItem("theme", value);
            return value;
        }
    };

    document.addEventListener("DOMContentLoaded", () => applyTheme(readTheme()), { once: true });
    window.addEventListener("storage", (event) => {
        if (event.key === "theme") applyTheme(readTheme());
    });
})();
