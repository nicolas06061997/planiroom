/**
 * Partage des données entre téléphones (Firebase Realtime Database).
 *
 * Même principe que l'appli Céline : une adresse Firebase + un code secret,
 * pas de compte à créer pour les filles.
 *
 * Pour que deux personnes puissent travailler en même temps sans s'écraser,
 * chaque élément est enregistré séparément : une fille qui coche sa chambre
 * ne modifie que SA carte du jour, la gouvernante qui change une tâche ne
 * modifie que cette tâche, etc.
 */
import { CODE_HOTEL, FIREBASE_URL, PARTAGE_ACTIF } from "@/config";
import { DATA_VERSION } from "./sampleData";
import type {
  CarteFille,
  ChambreDuJour,
  Donnees,
  JourSemaine,
  Repartition,
  TypeMenage,
} from "./types";

export type EtatSynchro = "local" | "connexion" | "partage" | "horsligne";

type Arbre = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/* ---------- Conversion Données <-> arbre Firebase ---------- */

const parId = <T extends { id: string }>(liste: T[]) =>
  Object.fromEntries(liste.map((x, o) => [x.id, { ...x, o }]));

const liste = <T>(obj: unknown): T[] =>
  obj && typeof obj === "object"
    ? (Object.values(obj as Record<string, T & { o?: number }>).sort((a, b) => (a.o ?? 0) - (b.o ?? 0)) as T[])
    : [];

const sansOrdre = <T extends { o?: number }>(x: T) => {
  const { o: _o, ...reste } = x; // eslint-disable-line @typescript-eslint/no-unused-vars
  return reste;
};

const tableau = <T>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []) as T[];

export function versArbre(d: Donnees): Arbre {
  return {
    v: d.version,
    employees: parId(d.employees),
    chambres: parId(d.chambres),
    menages: Object.fromEntries(d.menages.map((m, o) => [m.type, { ...m, o }])),
    articlesLinge: parId(d.articlesLinge),
    taches: parId(d.taches),
    reglages: d.reglages,
    shifts: Object.fromEntries(d.shifts.map((s) => [`${s.employeeId}_${s.date}`, s])),
    envois: Object.fromEntries(d.envois.map((e) => [`${e.employeeId}_${e.lundi}`, e])),
    chambresDuJour: Object.fromEntries(
      Object.entries(d.chambresDuJour).map(([date, l]) => [date, Object.fromEntries(l.map((c) => [c.chambreId, c.type]))])
    ),
    conversations: parId(d.conversations),
    profils: d.profils ?? {},
    messages: d.messages.reduce<Arbre>((acc, m) => {
      (acc[m.conversationId] ??= {})[m.id] = m;
      return acc;
    }, {}),
    repartitions: Object.fromEntries(
      Object.entries(d.repartitions).map(([date, r]) => [
        date,
        {
          info: { statut: r.statut, creeeLe: r.creeeLe, ...(r.envoyeeLe ? { envoyeeLe: r.envoyeeLe } : {}) },
          cartes: Object.fromEntries(
            r.cartes.map((c, o) => [
              c.employeeId,
              {
                o,
                ...(c.note ? { note: c.note } : {}),
                chambres: Object.fromEntries(c.chambres.map((x, i) => [x.chambreId, { ...x, o: i }])),
                taches: Object.fromEntries(c.taches.map((x, i) => [x.tacheId, { ...x, o: i }])),
              },
            ])
          ),
        },
      ])
    ),
  };
}

export function depuisArbre(a: Arbre): Donnees {
  const repartitions: Record<string, Repartition> = {};
  for (const [date, r] of Object.entries<Arbre>(a.repartitions ?? {})) {
    if (!r?.info) continue;
    const cartes = Object.entries<Arbre>(r.cartes ?? {})
      .sort(([, x], [, y]) => (x.o ?? 0) - (y.o ?? 0))
      .map(
        ([employeeId, c]): CarteFille => ({
          employeeId,
          ...(c.note ? { note: c.note } : {}),
          chambres: liste<CarteFille["chambres"][number] & { o?: number }>(c.chambres).map(sansOrdre),
          taches: liste<CarteFille["taches"][number] & { o?: number }>(c.taches).map(sansOrdre),
        })
      );
    repartitions[date] = { date, ...r.info, cartes };
  }

  const chambresDuJour: Record<string, ChambreDuJour[]> = {};
  for (const [date, m] of Object.entries<Record<string, TypeMenage>>(a.chambresDuJour ?? {})) {
    chambresDuJour[date] = Object.entries(m ?? {}).map(([chambreId, type]) => ({ chambreId, type }));
  }

  return {
    version: a.v ?? DATA_VERSION,
    employees: liste<Donnees["employees"][number] & { o?: number }>(a.employees).map(sansOrdre),
    chambres: liste<Donnees["chambres"][number] & { o?: number }>(a.chambres).map(sansOrdre),
    menages: liste<Donnees["menages"][number] & { o?: number }>(a.menages).map((m) => ({ ...sansOrdre(m), linge: m.linge ?? {} })),
    articlesLinge: liste<Donnees["articlesLinge"][number] & { o?: number }>(a.articlesLinge).map(sansOrdre),
    taches: liste<Donnees["taches"][number] & { o?: number }>(a.taches).map((t) => ({
      ...sansOrdre(t),
      jours: tableau<JourSemaine>(t.jours),
    })),
    reglages: { pauseMin: 30, ...(a.reglages ?? {}) },
    shifts: Object.values<Arbre>(a.shifts ?? {}).map((s) => ({ debut: null, fin: null, ...s })) as Donnees["shifts"],
    envois: Object.values(a.envois ?? {}) as Donnees["envois"],
    chambresDuJour,
    repartitions,
    conversations: liste<Donnees["conversations"][number] & { o?: number }>(a.conversations).map((c) => ({
      ...sansOrdre(c),
      membres: tableau<string>(c.membres),
    })),
    profils: (a.profils ?? {}) as Donnees["profils"],
    messages: Object.values<Arbre>(a.messages ?? {})
      .flatMap((parConv) => Object.values(parConv ?? {}) as Donnees["messages"])
      .sort((x, y) => x.envoyeLe.localeCompare(y.envoyeLe)),
  };
}

/* ---------- Découpage en petits morceaux ---------- */

const PROFONDEUR_2 = ["employees", "chambres", "menages", "articlesLinge", "taches", "shifts", "envois", "chambresDuJour", "conversations", "profils"];

/** Transforme l'arbre en { "chemin": "valeur JSON" } au bon niveau de détail. */
function aplatir(a: Arbre): Record<string, string> {
  const r: Record<string, string> = {};
  r["v"] = JSON.stringify(a.v);
  r["reglages"] = JSON.stringify(a.reglages);
  for (const k of PROFONDEUR_2) {
    for (const [id, val] of Object.entries(a[k] ?? {})) r[`${k}/${id}`] = JSON.stringify(val);
  }
  for (const [conv, msgs] of Object.entries<Arbre>(a.messages ?? {})) {
    for (const [id, m] of Object.entries(msgs ?? {})) r[`messages/${conv}/${id}`] = JSON.stringify(m);
  }
  for (const [date, rep] of Object.entries<Arbre>(a.repartitions ?? {})) {
    r[`repartitions/${date}/info`] = JSON.stringify(rep.info);
    for (const [emp, c] of Object.entries(rep.cartes ?? {})) r[`repartitions/${date}/cartes/${emp}`] = JSON.stringify(c);
  }
  return r;
}

function differences(avant: Record<string, string>, apres: Record<string, string>) {
  const d: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(apres)) if (avant[k] !== v) d[k] = JSON.parse(v);
  for (const k of Object.keys(avant)) if (!(k in apres)) d[k] = null;
  return d;
}

function placer(arbre: Arbre | null, chemin: string, valeur: unknown): Arbre | null {
  const parties = chemin.split("/").filter(Boolean);
  if (parties.length === 0) return (valeur as Arbre) ?? null;
  const racine: Arbre = arbre ? { ...arbre } : {};
  let noeud = racine;
  parties.forEach((p, i) => {
    if (i === parties.length - 1) {
      if (valeur === null) delete noeud[p];
      else noeud[p] = valeur;
    } else {
      noeud[p] = noeud[p] && typeof noeud[p] === "object" ? { ...noeud[p] } : {};
      noeud = noeud[p];
    }
  });
  return racine;
}

/* ---------- Synchronisation ---------- */

const URL_NOEUD = `${FIREBASE_URL}/hotels/${CODE_HOTEL}.json`;
/** Changements pas encore confirmés par le serveur, gardés sur le téléphone. */
const CLE_ATTENTE = "planiroom:attente";

function lireAttente(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(CLE_ATTENTE) ?? "{}");
  } catch {
    return {};
  }
}

export class Synchro {
  private base: Record<string, string> = {};
  private attente: Record<string, unknown> = {};
  private enVol: Record<string, unknown> = {};
  private brut: Arbre | null = null;
  private envoisEnCours = 0;
  private minuteur: ReturnType<typeof setTimeout> | null = null;
  private relecture: ReturnType<typeof setInterval> | null = null;
  private source: EventSource | null = null;
  private reconstructionDifferee = false;
  private demarre = false;

  private pretSignale = false;
  private locales: Donnees | null = null;

  constructor(
    private onDonnees: (d: Donnees) => void,
    private onEtat: (e: EtatSynchro) => void,
    /** Appelé une fois, dès que les données en ligne ont été lues avec succès. */
    private onPret?: () => void,
    /** Chemins pas encore confirmés par le serveur (ex. messages en attente d'envoi). */
    private onAttente?: (chemins: Set<string>) => void
  ) {}

  private signalerPret() {
    if (this.pretSignale) return;
    this.pretSignale = true;
    this.onPret?.();
  }

  /** Démarre avec les données déjà connues sur ce téléphone. */
  async demarrer(locales: Donnees) {
    if (!PARTAGE_ACTIF || this.demarre) {
      this.onEtat("local");
      return;
    }
    this.demarre = true;
    this.locales = locales;
    this.base = aplatir(versArbre(locales));
    this.onEtat("connexion");
    try {
      const res = await fetch(URL_NOEUD, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const distant = (await res.json()) as Arbre | null;
      if (!distant || !distant.employees) {
        // Base vide : ce téléphone envoie ses données de départ.
        this.brut = versArbre(locales);
        const put = await fetch(URL_NOEUD, { method: "PUT", body: JSON.stringify(this.brut) });
        if (!put.ok) throw new Error(String(put.status));
        this.enregistrerAttente();
      } else {
        this.brut = distant;
        // Changements faits ici mais pas encore envoyés (appli fermée trop vite, pas de réseau…)
        const restants = lireAttente();
        if (Object.keys(restants).length) {
          this.attente = { ...restants, ...this.attente };
          for (const [k, v] of Object.entries(this.attente)) this.brut = placer(this.brut, k, v);
          this.reconstruire();
          await this.vider();
        } else this.reconstruire();
      }
      this.signalerPret();
      this.onEtat("partage");
    } catch {
      this.onEtat("horsligne");
    }
    this.ecouter();
    this.relecture = setInterval(() => this.relire(), 30_000);
    document.addEventListener("visibilitychange", this.surVisibilite);
    window.addEventListener("online", this.surVisibilite);
    window.addEventListener("pagehide", this.surDepart);
  }

  arreter() {
    window.removeEventListener("pagehide", this.surDepart);
    this.source?.close();
    if (this.relecture) clearInterval(this.relecture);
    document.removeEventListener("visibilitychange", this.surVisibilite);
    window.removeEventListener("online", this.surVisibilite);
  }

  /** À appeler après chaque modification faite sur ce téléphone. */
  local(d: Donnees) {
    if (!PARTAGE_ACTIF || !this.demarre) return;
    const plat = aplatir(versArbre(d));
    const diff = differences(this.base, plat);
    this.base = plat;
    if (Object.keys(diff).length === 0) return;
    Object.assign(this.attente, diff);
    this.enregistrerAttente();
    if (this.minuteur) clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.vider(), 350);
  }

  private enregistrerAttente() {
    this.onAttente?.(new Set([...Object.keys(this.enVol), ...Object.keys(this.attente)]));
    try {
      const tout = { ...this.enVol, ...this.attente };
      if (Object.keys(tout).length) localStorage.setItem(CLE_ATTENTE, JSON.stringify(tout));
      else localStorage.removeItem(CLE_ATTENTE);
    } catch {}
  }

  /** L'appli est fermée ou mise en arrière-plan : on envoie tout de suite. */
  private surDepart = () => {
    if (Object.keys(this.attente).length) this.vider(true);
  };

  private surVisibilite = () => {
    if (document.visibilityState === "hidden") return this.surDepart();
    if (document.visibilityState === "visible") {
      this.relire();
      if (Object.keys(this.attente).length) this.vider();
      if (!this.source || this.source.readyState === 2) this.ecouter();
    }
  };

  private occupe() {
    return this.envoisEnCours > 0 || this.minuteur !== null || Object.keys(this.attente).length > 0;
  }

  private async vider(depart = false) {
    if (this.minuteur) clearTimeout(this.minuteur);
    this.minuteur = null;
    const lot = this.attente;
    this.attente = {};
    if (Object.keys(lot).length === 0) return;
    for (const [k, v] of Object.entries(lot)) this.brut = placer(this.brut, k, v);
    Object.assign(this.enVol, lot);
    this.envoisEnCours++;
    try {
      const res = await fetch(URL_NOEUD, { method: "PATCH", body: JSON.stringify(lot), keepalive: depart });
      if (!res.ok) throw new Error(String(res.status));
      for (const k of Object.keys(lot)) if (this.enVol[k] === lot[k]) delete this.enVol[k];
      this.onEtat("partage");
    } catch {
      // Hors ligne : on garde les changements et on réessaie.
      for (const k of Object.keys(lot)) delete this.enVol[k];
      this.attente = { ...lot, ...this.attente };
      this.onEtat("horsligne");
      this.minuteur = setTimeout(() => this.vider(), 5000);
    } finally {
      this.enregistrerAttente();
      this.envoisEnCours--;
      if (!this.occupe() && this.reconstructionDifferee) this.reconstruire();
    }
  }

  private async relire() {
    if (this.occupe()) return;
    try {
      const res = await fetch(URL_NOEUD, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const distant = (await res.json()) as Arbre | null;
      if (distant && !this.occupe()) {
        this.brut = distant;
        this.reconstruire();
      }
      if (distant?.employees) this.signalerPret();
      else if (!this.pretSignale && this.locales) {
        // Base encore vide (premier téléphone, hors ligne au démarrage) : on la remplit maintenant.
        this.brut = versArbre(this.locales);
        const put = await fetch(URL_NOEUD, { method: "PUT", body: JSON.stringify(this.brut) });
        if (put.ok) this.signalerPret();
      }
      this.onEtat("partage");
    } catch {
      this.onEtat("horsligne");
    }
  }

  private ecouter() {
    if (typeof EventSource === "undefined") return; // vieux navigateurs : la relecture suffit
    this.source?.close();
    const s = new EventSource(URL_NOEUD);
    const appliquer = (patch: boolean) => (e: MessageEvent) => {
      try {
        const { path, data } = JSON.parse(e.data) as { path: string; data: unknown };
        if (patch && data && typeof data === "object") {
          for (const [k, v] of Object.entries(data)) this.brut = placer(this.brut, `${path}/${k}`, v);
        } else {
          this.brut = placer(this.brut, path, data);
        }
        if (this.occupe()) this.reconstructionDifferee = true;
        else this.reconstruire();
        this.onEtat("partage");
      } catch {
        /* message illisible : ignoré */
      }
    };
    s.addEventListener("put", appliquer(false) as EventListener);
    s.addEventListener("patch", appliquer(true) as EventListener);
    s.onerror = () => this.onEtat(navigator.onLine ? "connexion" : "horsligne");
    this.source = s;
  }

  private reconstruire() {
    this.reconstructionDifferee = false;
    if (!this.brut || !this.brut.employees) return;
    const d = depuisArbre(this.brut);
    this.base = aplatir(versArbre(d));
    this.onDonnees(d);
  }
}
