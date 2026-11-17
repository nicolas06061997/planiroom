"use client";

/**
 * Stockage des données.
 *
 * Version bêta : les données sont enregistrées dans le navigateur
 * (localStorage). Pour partager les données entre plusieurs téléphones,
 * il suffira de remplacer `charger` / `enregistrer` par une base en ligne
 * (Firebase ou Supabase) : les écrans n'auront pas à changer.
 */
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mondayOf } from "./dates";
import { repartir } from "./repartition";
import { conversationsExemple, creerDonneesExemple, DATA_VERSION, NOUVELLES_COULEURS } from "./sampleData";
import { PARTAGE_ACTIF } from "@/config";
import { renvoyerPhotosEnAttente } from "./photos";
import { Synchro, type EtatSynchro } from "./sync";
import { GOUVERNANTE, type CarteFille, type Donnees, type ISODate, type Message, type Participant, type Profil, type Session, type Shift } from "./types";

const CLE_DONNEES = "planiroom:donnees";
const CLE_SESSION = "planiroom:session";

function lire<T>(cle: string): T | null {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible (navigation privée) : on continue en mémoire */
  }
}

/** Complète les données d'une ancienne version (ex. avant l'arrivée du chat). */
export function normaliser(d: Donnees): Donnees {
  const n = { ...d };
  // Couleurs d'origine des filles remplacées par la nouvelle palette (seulement si jamais modifiées).
  if (n.employees.some((e) => NOUVELLES_COULEURS[e.couleur.toLowerCase()])) {
    n.employees = n.employees.map((e) => ({ ...e, couleur: NOUVELLES_COULEURS[e.couleur.toLowerCase()] ?? e.couleur }));
  }
  if (!Array.isArray(n.conversations) || !Array.isArray(n.messages)) Object.assign(n, conversationsExemple());
  if (!n.profils || typeof n.profils !== "object") n.profils = {};
  if (!n.conversations.some((c) => c.type === "groupe")) {
    n.conversations = [
      { id: "groupe", type: "groupe", nom: "Équipe", membres: [], creePar: GOUVERNANTE, creeeLe: new Date().toISOString() },
      ...n.conversations,
    ];
  }
  return n;
}

/** Données gardées sur ce téléphone, ou null s'il n'y en a pas (premier lancement, téléphone vidé…). */
function charger(): Donnees | null {
  const d = lire<Donnees>(CLE_DONNEES);
  if (d && d.version === DATA_VERSION) return normaliser(d);
  return null;
}

interface StoreValue {
  pret: boolean;
  /**
   * Vrai quand le téléphone n'a plus rien en mémoire (historique effacé…) et que les
   * données n'ont pas encore été récupérées en ligne : l'appli attend au lieu d'afficher
   * des données d'exemple (qui risqueraient d'écraser les vraies).
   */
  attenteDonnees: boolean;
  /** Partage entre téléphones : local, connexion, partage, horsligne. */
  synchro: EtatSynchro;
  /** Chemins pas encore envoyés (hors connexion), ex. `messages/<conversation>/<id>`. */
  enAttente: Set<string>;
  donnees: Donnees;
  session: Session | null;
  setSession: (s: Session | null) => void;
  /** Modification générique des données. */
  modifier: (fn: (d: Donnees) => Donnees) => void;
  enregistrerHoraire: (employeeId: string, shifts: Shift[]) => void;
  genererRepartition: (date: ISODate) => void;
  modifierCartes: (date: ISODate, fn: (cartes: CarteFille[]) => CarteFille[]) => void;
  envoyerRepartition: (date: ISODate) => void;
  reinitialiser: () => void;
  envoyerMessage: (conversationId: string, auteur: Participant, texte: string, photo?: Message["photo"]) => Message | null;
  /** Crée (ou retrouve) une conversation privée ; renvoie son id. */
  creerConversation: (membres: Participant[], creePar: Participant, nom?: string) => string;
  /** Modifie les réglages personnels d'une personne (gardés en ligne). */
  majProfil: (p: Participant, fn: (profil: Profil) => Profil) => void;
  /** Remplace toutes les données (restauration d'une sauvegarde). */
  restaurer: (d: Donnees) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [donnees, setDonnees] = useState<Donnees>(() => creerDonneesExemple());
  const [session, setSessionState] = useState<Session | null>(null);
  const [synchro, setSynchro] = useState<EtatSynchro>("local");
  const [attenteDonnees, setAttenteDonnees] = useState(false);
  const [enAttente, setEnAttente] = useState<Set<string>>(() => new Set());
  const sync = useRef<Synchro | null>(null);

  useEffect(() => {
    const gardees = charger();
    const locales = gardees ?? creerDonneesExemple();
    // En « transition » : React finit d'afficher la page avant d'appliquer les données
    // (sinon, quand la page arrive instantanément depuis le téléphone, les deux se percutent).
    startTransition(() => {
      setDonnees(locales);
      setSessionState(lire<Session>(CLE_SESSION));
      // Téléphone vidé + partage actif : on attend les vraies données en ligne.
      if (!gardees && PARTAGE_ACTIF) setAttenteDonnees(true);
      setPret(true);
    });
    const s = new Synchro((d) => setDonnees(normaliser(d)), setSynchro, () => setAttenteDonnees(false), setEnAttente);
    sync.current = s;
    s.demarrer(locales);
    renvoyerPhotosEnAttente();
    window.addEventListener("online", renvoyerPhotosEnAttente);
    return () => {
      s.arreter();
      window.removeEventListener("online", renvoyerPhotosEnAttente);
    };
  }, []);

  useEffect(() => {
    if (!pret || attenteDonnees) return;
    ecrire(CLE_DONNEES, donnees);
    sync.current?.local(donnees);
  }, [donnees, pret, attenteDonnees]);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    ecrire(CLE_SESSION, s);
  }, []);

  const modifier = useCallback((fn: (d: Donnees) => Donnees) => setDonnees(fn), []);

  const enregistrerHoraire = useCallback((employeeId: string, shifts: Shift[]) => {
    setDonnees((d) => {
      const dates = new Set(shifts.map((s) => s.date));
      const lundis = new Set(shifts.map((s) => mondayOf(s.date)));
      return {
        ...d,
        shifts: [
          ...d.shifts.filter((s) => !(s.employeeId === employeeId && dates.has(s.date))),
          ...shifts.map((s) => ({ ...s, employeeId })),
        ],
        envois: [
          ...d.envois.filter((e) => !(e.employeeId === employeeId && lundis.has(e.lundi))),
          ...[...lundis].map((lundi) => ({
            employeeId,
            lundi,
            valideLe: new Date().toISOString(),
          })),
        ],
      };
    });
  }, []);

  const genererRepartition = useCallback((date: ISODate) => {
    setDonnees((d) => ({
      ...d,
      repartitions: {
        ...d.repartitions,
        [date]: {
          date,
          statut: "brouillon",
          cartes: repartir(d, date),
          creeeLe: new Date().toISOString(),
        },
      },
    }));
  }, []);

  const modifierCartes = useCallback(
    (date: ISODate, fn: (cartes: CarteFille[]) => CarteFille[]) => {
      setDonnees((d) => {
        const r = d.repartitions[date];
        if (!r) return d;
        return {
          ...d,
          repartitions: { ...d.repartitions, [date]: { ...r, cartes: fn(r.cartes) } },
        };
      });
    },
    []
  );

  const envoyerRepartition = useCallback((date: ISODate) => {
    setDonnees((d) => {
      const r = d.repartitions[date];
      if (!r) return d;
      return {
        ...d,
        repartitions: {
          ...d.repartitions,
          [date]: { ...r, statut: "envoyee", envoyeeLe: new Date().toISOString() },
        },
      };
    });
  }, []);

  const majProfil = useCallback((p: Participant, fn: (profil: Profil) => Profil) => {
    setDonnees((d) => ({ ...d, profils: { ...d.profils, [p]: fn(d.profils?.[p] ?? {}) } }));
  }, []);

  const restaurer = useCallback((d: Donnees) => {
    setDonnees(normaliser({ ...d, version: DATA_VERSION }));
  }, []);

  const reinitialiser = useCallback(() => {
    setDonnees(creerDonneesExemple());
  }, []);

  const envoyerMessage = useCallback((conversationId: string, auteur: Participant, texte: string, photo?: Message["photo"]) => {
    const t = texte.trim();
    if (!t && !photo) return null;
    const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const message: Message = {
      id,
      conversationId,
      auteur,
      texte: t.slice(0, 2000),
      envoyeLe: new Date().toISOString(),
      ...(photo ? { photo } : {}),
    };
    setDonnees((d) => ({ ...d, messages: [...d.messages, message] }));
    return message;
  }, []);

  const creerConversation = useCallback(
    (membres: Participant[], creePar: Participant, nom?: string) => {
      const tous = [...new Set([...membres, creePar])].sort();
      // Une conversation avec exactement les mêmes personnes existe déjà ? On la rouvre.
      const existante = donnees.conversations.find(
        (c) => c.type === "prive" && !c.nom && !nom && [...c.membres].sort().join("|") === tous.join("|")
      );
      if (existante) return existante.id;
      const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      setDonnees((d) => ({
        ...d,
        conversations: [
          ...d.conversations,
          { id, type: "prive", membres: tous, creePar, creeeLe: new Date().toISOString(), ...(nom?.trim() ? { nom: nom.trim() } : {}) },
        ],
      }));
      return id;
    },
    [donnees.conversations]
  );

  const value = useMemo<StoreValue>(
    () => ({
      pret,
      attenteDonnees,
      synchro,
      enAttente,
      donnees,
      session,
      setSession,
      modifier,
      enregistrerHoraire,
      genererRepartition,
      modifierCartes,
      envoyerRepartition,
      reinitialiser,
      envoyerMessage,
      creerConversation,
      majProfil,
      restaurer,
    }),
    [
      pret,
      attenteDonnees,
      synchro,
      enAttente,
      donnees,
      session,
      setSession,
      modifier,
      enregistrerHoraire,
      genererRepartition,
      modifierCartes,
      envoyerRepartition,
      reinitialiser,
      envoyerMessage,
      creerConversation,
      majProfil,
      restaurer,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}

/** La personne connectée, comme participant du chat. */
export function moiDe(session: Session | null): Participant | null {
  if (!session) return null;
  return session.role === "gouvernante" ? GOUVERNANTE : session.employeeId ?? null;
}

/** Petits raccourcis pratiques pour les écrans. */
export function useEmployee(id: string | undefined) {
  const { donnees } = useStore();
  return donnees.employees.find((e) => e.id === id);
}
