import type { Heure, ISODate, JourSemaine } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Lundi de la semaine qui contient cette date. */
export function mondayOf(iso: ISODate): ISODate {
  const d = fromISO(iso);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  return toISO(d);
}

export function weekDays(monday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 0 = lundi … 6 = dimanche */
export function jourSemaine(iso: ISODate): JourSemaine {
  return ((fromISO(iso).getDay() + 6) % 7) as JourSemaine;
}

export const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const JOURS_LONGS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** "Lundi 16 novembre" */
export function formatJourLong(iso: ISODate): string {
  const d = fromISO(iso);
  return `${JOURS_LONGS[jourSemaine(iso)]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** "16 nov." */
export function formatJourCourt(iso: ISODate): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

/** "16 – 22 novembre 2026" */
export function formatSemaine(monday: ISODate): string {
  const a = fromISO(monday);
  const b = fromISO(addDays(monday, 6));
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${MOIS[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${a.getDate()} ${MOIS_COURTS[a.getMonth()]} – ${b.getDate()} ${MOIS_COURTS[b.getMonth()]} ${b.getFullYear()}`;
}

export function heureEnMinutes(h: Heure): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + (mm || 0);
}

/** Durée d'un shift en minutes (gère le passage de minuit). */
export function dureeShift(debut: Heure | null, fin: Heure | null): number {
  if (!debut || !fin) return 0;
  let d = heureEnMinutes(fin) - heureEnMinutes(debut);
  if (d < 0) d += 24 * 60;
  return d;
}

/** 95 → "1 h 35", 60 → "1 h", 40 → "40 min" */
export function formatDuree(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${pad(r)}`;
}

/** "08:00" → "8h00" */
export function formatHeure(h: Heure | null): string {
  if (!h) return "–";
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm}`;
}
