// Après « next build » : liste tous les fichiers de l'appli pour que le téléphone
// les télécharge d'un coup (utilisation sans internet). Écrit out/precache.json.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = "out";
const EXCLUS = new Set(["sw.js", "version.json", "precache.json"]);

function lister(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? lister(chemin) : [chemin];
  });
}

const fichiers = lister(OUT)
  .map((f) => relative(OUT, f).split("\\").join("/"))
  .filter((f) => !EXCLUS.has(f) && !f.endsWith(".map"));

// Les pages s'ouvrent par leur dossier : « horaire/ » = « horaire/index.html ».
const adresses = fichiers.flatMap((f) => (f.endsWith("index.html") ? [f.slice(0, -"index.html".length) || "./", f] : [f]));
writeFileSync(join(OUT, "precache.json"), JSON.stringify(adresses));
const taille = fichiers.reduce((s, f) => s + statSync(join(OUT, f)).size, 0);
console.log(`precache.json : ${adresses.length} adresses, ${(taille / 1024 / 1024).toFixed(1)} Mo`);
