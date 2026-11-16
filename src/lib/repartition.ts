/**
 * Répartition automatique des chambres et des tâches.
 *
 * Principe (simple à ajuster) :
 *  1. On prend les filles présentes ce jour-là et leur temps disponible
 *     (durée du shift moins la pause).
 *  2. Les tâches pénibles sont données en priorité à celle qui les a faites
 *     le moins souvent ces 4 dernières semaines (rotation).
 *  3. Les autres tâches puis les chambres sont données une par une,
 *     de la plus longue à la plus courte, à la fille la moins chargée
 *     PAR RAPPORT à son temps disponible. On garde si possible les chambres
 *     d'une même fille sur le même étage.
 */
import { addDays, dureeShift, jourSemaine } from "./dates";
import type {
  CarteFille,
  Chambre,
  Donnees,
  Employee,
  ISODate,
  Shift,
  Tache,
  TypeMenage,
} from "./types";

/** Nombre de jours d'historique pris en compte pour la rotation. */
const JOURS_HISTORIQUE = 28;
/** Une pause n'est déduite que pour les shifts d'au moins 6 h. */
const SEUIL_PAUSE_MIN = 6 * 60;

export interface FillePresente {
  employee: Employee;
  shift: Shift;
  /** Temps de travail disponible, en minutes. */
  capacite: number;
}

export function shiftDe(d: Donnees, employeeId: string, date: ISODate): Shift | undefined {
  return d.shifts.find((s) => s.employeeId === employeeId && s.date === date);
}

export function capacite(d: Donnees, shift: Shift): number {
  const brut = dureeShift(shift.debut, shift.fin);
  const pause = brut >= SEUIL_PAUSE_MIN ? d.reglages.pauseMin : 0;
  return Math.max(brut - pause, 30);
}

export function fillesPresentes(d: Donnees, date: ISODate): FillePresente[] {
  return d.employees
    .filter((e) => e.actif)
    .map((employee) => ({ employee, shift: shiftDe(d, employee.id, date) }))
    .filter(
      (x): x is { employee: Employee; shift: Shift } =>
        !!x.shift && !x.shift.conge && dureeShift(x.shift.debut, x.shift.fin) > 0
    )
    .map((x) => ({ ...x, capacite: capacite(d, x.shift) }));
}

export function tachesDuJour(d: Donnees, date: ISODate): Tache[] {
  const j = jourSemaine(date);
  return d.taches.filter((t) => t.active && t.jours.includes(j));
}

export function dureeMenage(d: Donnees, type: TypeMenage): number {
  return d.menages.find((m) => m.type === type)?.dureeMin ?? 0;
}

/** Charge totale d'une carte, en minutes. */
export function chargeCarte(d: Donnees, carte: CarteFille): number {
  const ch = carte.chambres.reduce((s, c) => s + dureeMenage(d, c.type), 0);
  const ta = carte.taches.reduce(
    (s, t) => s + (d.taches.find((x) => x.id === t.tacheId)?.dureeMin ?? 0),
    0
  );
  return ch + ta;
}

/** Combien de fois chaque fille a eu chaque tâche récemment. */
function historiqueTaches(d: Donnees, date: ISODate) {
  const compte = new Map<string, number>();
  for (let i = 1; i <= JOURS_HISTORIQUE; i++) {
    const r = d.repartitions[addDays(date, -i)];
    if (!r) continue;
    for (const carte of r.cartes) {
      for (const t of carte.taches) {
        const k = `${carte.employeeId}|${t.tacheId}`;
        compte.set(k, (compte.get(k) ?? 0) + 1);
      }
    }
  }
  return (employeeId: string, tacheId: string) => compte.get(`${employeeId}|${tacheId}`) ?? 0;
}

export function repartir(d: Donnees, date: ISODate): CarteFille[] {
  const filles = fillesPresentes(d, date);
  if (filles.length === 0) return [];

  const etat = filles.map((f) => ({
    fille: f,
    charge: 0,
    penibles: 0,
    carte: { employeeId: f.employee.id, chambres: [], taches: [] } as CarteFille,
    etages: new Set<number>(),
  }));
  const ratio = (e: (typeof etat)[number], ajout: number) =>
    (e.charge + ajout) / e.fille.capacite;

  const historique = historiqueTaches(d, date);

  // 1. Tâches : pénibles d'abord, puis les plus longues.
  const taches = [...tachesDuJour(d, date)].sort(
    (a, b) => Number(b.penible) - Number(a.penible) || b.dureeMin - a.dureeMin
  );
  for (const t of taches) {
    const choix = [...etat].sort((a, b) => {
      if (t.penible) {
        const h = historique(a.fille.employee.id, t.id) - historique(b.fille.employee.id, t.id);
        if (h !== 0) return h;
        if (a.penibles !== b.penibles) return a.penibles - b.penibles;
      }
      return ratio(a, t.dureeMin) - ratio(b, t.dureeMin);
    })[0];
    choix.carte.taches.push({ tacheId: t.id, fait: false });
    choix.charge += t.dureeMin;
    if (t.penible) choix.penibles++;
  }

  // 2. Chambres : les plus longues d'abord, en gardant les étages groupés.
  const chambresById = new Map<string, Chambre>(d.chambres.map((c) => [c.id, c]));
  const chambres = (d.chambresDuJour[date] ?? [])
    .filter((c) => chambresById.get(c.chambreId)?.active)
    .map((c) => ({ ...c, chambre: chambresById.get(c.chambreId)!, duree: dureeMenage(d, c.type) }))
    .sort((a, b) => b.duree - a.duree || a.chambre.numero.localeCompare(b.chambre.numero));

  for (const c of chambres) {
    const score = (e: (typeof etat)[number]) => {
      let malus = 0;
      if (e.etages.size > 0 && !e.etages.has(c.chambre.etage)) malus = 0.06;
      return ratio(e, c.duree) + malus;
    };
    const choix = [...etat].sort((a, b) => score(a) - score(b))[0];
    choix.carte.chambres.push({ chambreId: c.chambreId, type: c.type, fait: false });
    choix.charge += c.duree;
    choix.etages.add(c.chambre.etage);
  }

  // 3. Chambres triées par numéro pour un parcours logique.
  for (const e of etat) {
    e.carte.chambres.sort((a, b) =>
      (chambresById.get(a.chambreId)?.numero ?? "").localeCompare(
        chambresById.get(b.chambreId)?.numero ?? ""
      )
    );
  }

  return etat.map((e) => e.carte);
}
