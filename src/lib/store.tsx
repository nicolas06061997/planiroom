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
import { creerDonneesExemple, DATA_VERSION } from "./sampleData";
import { Synchro, type EtatSynchro } from "./sync";
import type { CarteFille, Donnees, ISODate, Session, Shift } from "./types";

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

function charger(): Donnees {
  const d = lire<Donnees>(CLE_DONNEES);
  if (d && d.version === DATA_VERSION) return d;
  return creerDonneesExemple();
}

interface StoreValue {
  pret: boolean;
  /** Partage entre téléphones : local, connexion, partage, horsligne. */
  synchro: EtatSynchro;
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
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [donnees, setDonnees] = useState<Donnees>(() => creerDonneesExemple());
  const [session, setSessionState] = useState<Session | null>(null);
  const [synchro, setSynchro] = useState<EtatSynchro>("local");
  const sync = useRef<Synchro | null>(null);

  useEffect(() => {
    const locales = charger();
    setDonnees(locales);
    setSessionState(lire<Session>(CLE_SESSION));
    setPret(true);
    const s = new Synchro(setDonnees, setSynchro);
    sync.current = s;
    s.demarrer(locales);
    return () => s.arreter();
  }, []);

  useEffect(() => {
    if (!pret) return;
    ecrire(CLE_DONNEES, donnees);
    sync.current?.local(donnees);
  }, [donnees, pret]);

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

  const reinitialiser = useCallback(() => {
    setDonnees(creerDonneesExemple());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      pret,
      synchro,
      donnees,
      session,
      setSession,
      modifier,
      enregistrerHoraire,
      genererRepartition,
      modifierCartes,
      envoyerRepartition,
      reinitialiser,
    }),
    [
      pret,
      synchro,
      donnees,
      session,
      setSession,
      modifier,
      enregistrerHoraire,
      genererRepartition,
      modifierCartes,
      envoyerRepartition,
      reinitialiser,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}

/** Petits raccourcis pratiques pour les écrans. */
export function useEmployee(id: string | undefined) {
  const { donnees } = useStore();
  return donnees.employees.find((e) => e.id === id);
}
