const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const webOutput = path.join(projectRoot, "www");
const webEntries = [
    "index.html",
    "assets",
    "components",
    "css",
    "data",
    "js",
    "pages"
];

fs.mkdirSync(webOutput, { recursive: true });

for (const entry of webEntries) {
    const source = path.join(projectRoot, entry);
    const destination = path.join(webOutput, entry);

    if (!fs.existsSync(source)) {
        throw new Error(`Fichier web source introuvable : ${entry}`);
    }

    fs.cpSync(source, destination, {
        recursive: true,
        force: true
    });
}

console.log("✅ Fichiers web copiés dans www pour Capacitor.");
