/**
 * Données d'exemple, chargées au premier lancement.
 * Tout est modifiable ensuite dans l'écran Réglages.
 */
import { addDays, mondayOf, today, weekDays } from "./dates";
import type {
  Chambre,
  ChambreDuJour,
  Donnees,
  Employee,
  EnvoiHoraire,
  ISODate,
  Shift,
  Tache,
  TypeMenage,
} from "./types";

export const DATA_VERSION = 1;

/** Anciennes couleurs des filles → nouvelles (douces, assorties au thème terracotta). */
export const NOUVELLES_COULEURS: Record<string, string> = {"#0f766e": "#C2474F", "#4f46e5": "#8B5CC4", "#be185d": "#D9772F", "#b45309": "#4F6D8A", "#0369a1": "#2E8A8A"};

const employees: Employee[] = [
  { id: "e1", prenom: "Nadja", couleur: "#C2474F", actif: true },
  { id: "e2", prenom: "Cécile", couleur: "#8B5CC4", actif: true },
  { id: "e3", prenom: "Ingrid", couleur: "#D9772F", actif: true },
  { id: "e4", prenom: "Amalia", couleur: "#4F6D8A", actif: true },
  { id: "e5", prenom: "Célia", couleur: "#2E8A8A", actif: true },
];

const numeros = [
  "101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "117",
  "201", "202", "203", "204", "205", "210",
];

const chambres: Chambre[] = numeros.map((n) => ({
  id: `c${n}`,
  numero: n,
  etage: Number(n[0]),
  active: true,
}));

const tousLesJours = [0, 1, 2, 3, 4, 5, 6] as Tache["jours"];

/** Liste provisoire, à remplacer par celle de la gouvernante. */
const taches: Tache[] = [
  { id: "t1", nom: "Sanitaires communs", dureeMin: 30, jours: tousLesJours, penible: true, active: true },
  { id: "t2", nom: "Couloir 1er + aspirateur", dureeMin: 25, jours: tousLesJours, penible: false, active: true },
  { id: "t3", nom: "Couloir 2e + aspirateur", dureeMin: 25, jours: tousLesJours, penible: false, active: true },
  { id: "t4", nom: "Musée à l'eau", dureeMin: 45, jours: [1, 4], penible: true, active: true },
  { id: "t5", nom: "Bar", dureeMin: 20, jours: tousLesJours, penible: false, active: true },
  { id: "t6", nom: "Salle séminaire", dureeMin: 30, jours: [0, 3], penible: false, active: true },
  { id: "t7", nom: "Wellness", dureeMin: 40, jours: tousLesJours, penible: true, active: true },
];

const lingeComplet = { taies: 2, draps: 2, housses: 1, grandes: 2, petites: 2, tapis: 1 };

/** Modèles d'horaires : [début, fin] ou null = congé, du lundi au dimanche. */
const modeles: Record<string, ([string, string] | null)[]> = {
  e1: [["08:00", "14:00"], ["08:00", "14:00"], null, ["08:00", "14:00"], ["08:00", "15:00"], ["08:00", "14:00"], null],
  e2: [["09:00", "15:00"], null, ["08:00", "14:00"], ["08:00", "14:00"], null, ["08:00", "15:00"], ["08:00", "13:00"]],
  e3: [null, ["08:00", "14:00"], ["08:00", "14:00"], ["09:00", "15:00"], ["08:00", "14:00"], null, ["08:00", "13:00"]],
  e4: [["08:00", "12:00"], ["08:00", "12:00"], ["08:00", "12:00"], null, ["08:00", "12:00"], ["08:00", "12:00"], null],
  e5: [["08:00", "14:00"], ["09:00", "15:00"], ["08:00", "14:00"], ["08:00", "14:00"], ["08:00", "14:00"], null, null],
};

function shiftsPourSemaine(lundi: ISODate): Shift[] {
  const jours = weekDays(lundi);
  return employees.flatMap((e) =>
    jours.map((date, i) => {
      const m = modeles[e.id][i];
      return { employeeId: e.id, date, debut: m?.[0] ?? null, fin: m?.[1] ?? null, conge: !m };
    })
  );
}

/** Générateur pseudo-aléatoire stable (même date = mêmes chambres). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function chambresPourDate(date: ISODate): ChambreDuJour[] {
  const rnd = seeded(Number(date.replaceAll("-", "")));
  const result: ChambreDuJour[] = [];
  for (const c of chambres) {
    const r = rnd();
    let type: TypeMenage | null = null;
    if (r < 0.28) type = "depart";
    else if (r < 0.4) type = "arrivee";
    else if (r < 0.75) type = "raff";
    if (type) result.push({ chambreId: c.id, type });
  }
  return result;
}

/** Groupe de l'équipe (toujours présent) + quelques messages d'exemple. */
export function conversationsExemple(): Pick<Donnees, "conversations" | "messages"> {
  const il = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  return {
    conversations: [
      { id: "groupe", type: "groupe", nom: "Équipe", membres: [], creePar: "gouvernante", creeeLe: il(60 * 24 * 7) },
      { id: "p-e1-e2", type: "prive", membres: ["e1", "e2"], creePar: "e1", creeeLe: il(60 * 5) },
    ],
    messages: [
      { id: "m1", conversationId: "groupe", auteur: "gouvernante", texte: "Bonjour à toutes ! La répartition de demain est envoyée, pensez à la regarder.", envoyeLe: il(60 * 3) },
      { id: "m2", conversationId: "groupe", auteur: "e3", texte: "Merci ! Il manque des taies au 1er étage.", envoyeLe: il(60 * 2 + 40) },
      { id: "m3", conversationId: "groupe", auteur: "gouvernante", texte: "Je m'en occupe.", envoyeLe: il(60 * 2 + 30) },
      { id: "m4", conversationId: "p-e1-e2", auteur: "e2", texte: "Tu peux prendre la 105 à ma place ? Je finis à 14h.", envoyeLe: il(60 * 4) },
      { id: "m5", conversationId: "p-e1-e2", auteur: "e1", texte: "Oui pas de souci.", envoyeLe: il(60 * 3 + 50) },
    ],
  };
}

export function creerDonneesExemple(): Donnees {
  const lundi = mondayOf(today());
  const lundiSuivant = addDays(lundi, 7);
  const jours = [...weekDays(lundi), ...weekDays(lundiSuivant)];

  const envois: EnvoiHoraire[] = ["e1", "e2", "e4"].map((id) => ({
    employeeId: id,
    lundi,
    valideLe: new Date().toISOString(),
  }));

  return {
    version: DATA_VERSION,
    employees,
    chambres,
    menages: [
      { type: "depart", libelle: "Départ", dureeMin: 35, linge: { ...lingeComplet } },
      { type: "arrivee", libelle: "Arrivée", dureeMin: 20, linge: { ...lingeComplet } },
      { type: "raff", libelle: "Raff", dureeMin: 15, linge: { grandes: 2, petites: 2, tapis: 1 } },
    ],
    articlesLinge: [
      { id: "taies", nom: "Taies" },
      { id: "draps", nom: "Draps" },
      { id: "housses", nom: "Housses" },
      { id: "grandes", nom: "Grandes serviettes" },
      { id: "petites", nom: "Petites serviettes" },
      { id: "tapis", nom: "Tapis" },
    ],
    taches,
    reglages: { pauseMin: 30 },
    shifts: [...shiftsPourSemaine(lundi), ...shiftsPourSemaine(lundiSuivant)],
    envois,
    chambresDuJour: Object.fromEntries(jours.map((d) => [d, chambresPourDate(d)])),
    repartitions: {},
    ...conversationsExemple(),
    profils: {},
  };
}
