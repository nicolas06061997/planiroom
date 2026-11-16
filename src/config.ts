/**
 * Réglages techniques de l'appli (un seul endroit à modifier).
 *
 * FIREBASE_URL : adresse de la base Firebase "Realtime Database".
 *   Vide = les données restent sur chaque téléphone (mode local).
 *   Rempli = tous les téléphones partagent les mêmes données, en direct.
 * CODE_HOTEL : code secret de l'hôtel (au moins 20 caractères).
 *   Tous les téléphones qui ont ce code voient les mêmes données.
 * LECTURE_URL : adresse du service qui lit les captures Shifter avec l'IA.
 *   Vide = mode démo (un horaire d'exemple est proposé).
 */
export const FIREBASE_URL = (process.env.NEXT_PUBLIC_FIREBASE_URL || "").replace(/\/$/, "");
export const CODE_HOTEL = process.env.NEXT_PUBLIC_CODE_HOTEL || "hotel-casino-dinant-planiroom-2026";
export const LECTURE_URL = process.env.NEXT_PUBLIC_LECTURE_URL || "";

/** Préfixe d'adresse quand l'appli est publiée dans un sous-dossier (GitHub Pages). */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Version affichée et utilisée pour proposer les mises à jour. */
export const VERSION = process.env.NEXT_PUBLIC_VERSION ?? "dev";

export const PARTAGE_ACTIF = FIREBASE_URL.length > 0 && CODE_HOTEL.length >= 20;
