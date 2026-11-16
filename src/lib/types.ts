/**
 * Modèle de données de l'appli.
 * Tout ce qui est "paramétrable" (filles, chambres, tâches, durées, linge)
 * vit dans les données, jamais en dur dans les écrans.
 */

/** Date au format AAAA-MM-JJ (ex. "2026-11-16"). */
export type ISODate = string;
/** Heure au format HH:MM (ex. "08:00"). */
export type Heure = string;

export type Role = "gouvernante" | "employee";

export interface Employee {
  id: string;
  prenom: string;
  /** Couleur d'identification (pastille, avatar). */
  couleur: string;
  actif: boolean;
}

export type TypeMenage = "depart" | "arrivee" | "raff";

export interface Chambre {
  id: string;
  numero: string;
  /** Étage, utilisé pour regrouper les chambres d'une même fille. */
  etage: number;
  active: boolean;
}

/** Linge utilisé pour un ménage. Les clés sont libres et modifiables. */
export type Linge = Record<string, number>;

export interface ArticleLinge {
  id: string;
  nom: string;
}

export interface ReglageMenage {
  type: TypeMenage;
  libelle: string;
  /** Durée estimée en minutes. */
  dureeMin: number;
  linge: Linge;
}

/** 0 = lundi … 6 = dimanche */
export type JourSemaine = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Tache {
  id: string;
  nom: string;
  dureeMin: number;
  /** Jours où la tâche doit être faite. */
  jours: JourSemaine[];
  /** Tâche pénible : on la fait tourner entre les filles. */
  penible: boolean;
  active: boolean;
}

export interface Reglages {
  /** Pause déduite du temps de travail disponible (minutes). */
  pauseMin: number;
}

/** Un jour d'horaire d'une fille (lu depuis Shifter ou saisi). */
export interface Shift {
  employeeId: string;
  date: ISODate;
  debut: Heure | null;
  fin: Heure | null;
  conge: boolean;
}

/** Une fille a validé son horaire pour la semaine qui commence ce lundi. */
export interface EnvoiHoraire {
  employeeId: string;
  lundi: ISODate;
  valideLe: string;
}

/** Une chambre à faire un jour donné. */
export interface ChambreDuJour {
  chambreId: string;
  type: TypeMenage;
}

export interface ItemChambre {
  chambreId: string;
  type: TypeMenage;
  fait: boolean;
  note?: string;
}

export interface ItemTache {
  tacheId: string;
  fait: boolean;
  note?: string;
}

export interface CarteFille {
  employeeId: string;
  chambres: ItemChambre[];
  taches: ItemTache[];
  note?: string;
}

export type StatutRepartition = "brouillon" | "envoyee";

export interface Repartition {
  date: ISODate;
  statut: StatutRepartition;
  cartes: CarteFille[];
  creeeLe: string;
  envoyeeLe?: string;
}

export interface Donnees {
  version: number;
  employees: Employee[];
  chambres: Chambre[];
  menages: ReglageMenage[];
  articlesLinge: ArticleLinge[];
  taches: Tache[];
  reglages: Reglages;
  shifts: Shift[];
  envois: EnvoiHoraire[];
  /** Chambres à faire, par date. */
  chambresDuJour: Record<ISODate, ChambreDuJour[]>;
  repartitions: Record<ISODate, Repartition>;
}

export interface Session {
  role: Role;
  /** Renseigné quand role = "employee". */
  employeeId?: string;
}
