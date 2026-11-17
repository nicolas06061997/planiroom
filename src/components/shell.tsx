"use client";

import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Cloud,
  CloudOff,
  ListChecks,
  LogOut,
  MessageCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BASE, PARTAGE_ACTIF, VERSION } from "@/config";
import { Marque } from "./Marque";
import { useTotalNonLus } from "@/lib/messages";
import { moiDe, useStore } from "@/lib/store";
import { EcranInstallation, estInstallee } from "./Installation";
import { Avatar, BoutonIcone, cx, Feuille } from "./ui";

const ONGLETS = [
  { href: "/horaire/", label: "Horaire", icone: CalendarClock, actifSi: ["/horaire"] },
  { href: "/planning/", label: "Planning", icone: CalendarDays, actifSi: ["/planning", "/repartition"] },
  { href: "/mes-taches/", label: "Mes tâches", icone: ListChecks, actifSi: ["/mes-taches"] },
  { href: "/messages/", label: "Messages", icone: MessageCircle, actifSi: ["/messages"] },
];

/* ---------- Barre de navigation du bas ---------- */

export function BarreNavigation() {
  const pathname = usePathname();
  const { donnees, session } = useStore();
  const nonLus = useTotalNonLus(donnees, moiDe(session));
  return (
    <nav aria-label="Navigation principale" className="verre-blanc pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-black/5 shadow-nav">
      <ul className="mx-auto grid max-w-2xl grid-cols-4 px-1">
        {ONGLETS.map(({ href, label, icone: Icone, actifSi }) => {
          const actif = actifSi.some((p) => pathname.startsWith(p));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={cx(
                  "flex min-h-18 flex-col items-center justify-center gap-1 whitespace-nowrap text-[11px] font-semibold transition-colors xs:text-[12px]",
                  actif ? "text-primaire" : "text-doux"
                )}
              >
                <span
                  className={cx(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200",
                    actif ? "bg-primaire-clair" : "bg-transparent"
                  )}
                >
                  <Icone className="h-5.5 w-5.5" strokeWidth={actif ? 2.3 : 1.9} />
                  {href === "/messages/" && nonLus > 0 && (
                    <span className="absolute -top-0.5 right-2.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-conge px-1 text-[11px] font-bold text-white ring-2 ring-white">
                      {nonLus}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- En-tête ---------- */

export function EnTete({
  titre,
  sousTitre,
  retour,
}: {
  /** Sans titre : affiche le nom de l'appli. */
  titre?: string;
  sousTitre?: string;
  /** Adresse du bouton retour. */
  retour?: string;
}) {
  const router = useRouter();
  return (
    <header className="verre pt-safe sticky top-0 z-20">
      <div className="mx-auto flex min-h-16 max-w-2xl items-center gap-2 px-4">
        {retour && (
          <BoutonIcone label="Retour" onClick={() => router.push(retour)} className="-ml-2">
            <ArrowLeft className="h-5.5 w-5.5" />
          </BoutonIcone>
        )}
        <div className="min-w-0 flex-1">
          {titre ? (
            <>
              <h1 className="truncate text-lg font-bold tracking-tight text-encre">{titre}</h1>
              {sousTitre && <p className="truncate text-[13px] text-doux">{sousTitre}</p>}
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${BASE}/icon.svg`} alt="" className="h-8 w-8 rounded-[10px]" />
              <Marque className="text-lg xs:text-xl" />
              <span className="hidden sm:inline-flex">
                <PuceSynchro />
              </span>
            </div>
          )}
        </div>
        <MenuProfil />
      </div>
    </header>
  );
}

/** « Partagé » / « Hors ligne » / « Ce téléphone » à côté du nom de l'appli. */
function PuceSynchro() {
  const { synchro } = useStore();
  if (synchro === "local") return null;
  const ok = synchro === "partage";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        ok ? "bg-primaire-clair text-primaire" : synchro === "connexion" ? "bg-gray-100 text-doux" : "bg-conge-clair text-conge"
      )}
    >
      {ok ? <Cloud className="h-3 w-3" /> : synchro === "connexion" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudOff className="h-3 w-3" />}
      {ok ? "Partagé" : synchro === "connexion" ? "Connexion" : "Hors ligne"}
    </span>
  );
}

/* ---------- Profil ---------- */

export function MenuProfil() {
  const { session, setSession, donnees, synchro } = useStore();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [install, setInstall] = useState(false);
  if (!session) return null;
  const employee = donnees.employees.find((e) => e.id === session.employeeId);
  const nom = session.role === "gouvernante" ? "Gouvernante" : employee?.prenom ?? "";
  const couleur = employee?.couleur ?? "#0F766E";

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Mon profil"
        className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95"
      >
        {session.role === "gouvernante" ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primaire text-white shadow-bouton">
            <ShieldCheck className="h-5 w-5" />
          </span>
        ) : (
          <Avatar prenom={nom} couleur={couleur} taille={40} />
        )}
      </button>
      <Feuille ouverte={ouvert} onFermer={() => setOuvert(false)} titre="Mon profil">
        <div className="mb-4 flex items-center gap-3.5 rounded-3xl bg-fond p-4">
          <Avatar prenom={nom} couleur={couleur} taille={48} />
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-encre">{nom}</p>
            <p className="text-[13px] text-doux">{session.role === "gouvernante" ? "Administratrice" : "Femme de chambre"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {session.role === "gouvernante" && (
            <LigneMenu
              icone={<Settings className="h-5 w-5" />}
              onClick={() => {
                setOuvert(false);
                router.push("/reglages/");
              }}
            >
              Réglages
              <span className="block text-[13px] font-normal text-doux">Filles, chambres, tâches, durées</span>
            </LigneMenu>
          )}
          {!estInstallee() && (
            <LigneMenu
              icone={<Smartphone className="h-5 w-5" />}
              onClick={() => {
                setOuvert(false);
                setInstall(true);
              }}
            >
              Installer l&apos;appli sur ce téléphone
            </LigneMenu>
          )}
          <LigneMenu
            icone={<LogOut className="h-5 w-5" />}
            onClick={() => {
              setSession(null);
              router.replace("/");
            }}
          >
            Changer de profil
          </LigneMenu>
        </div>
        <p className="mt-5 text-center text-xs text-pale">
          {PARTAGE_ACTIF
            ? synchro === "partage"
              ? "Données partagées avec toute l'équipe"
              : "Connexion au partage…"
            : "Bêta · données enregistrées sur ce téléphone"}
          {" · "}v{VERSION}
        </p>
      </Feuille>
      {install && <EcranInstallation onFermer={() => setInstall(false)} />}
    </>
  );
}

function LigneMenu({ icone, children, onClick }: { icone: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 items-center gap-3.5 rounded-2xl px-3 py-2 text-left text-[15px] font-semibold text-encre transition hover:bg-fond active:bg-gray-100"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fond text-texte">{icone}</span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

/* ---------- Mise à jour automatique (comme dans Céline) ---------- */

function useMiseAJour() {
  const [dispo, setDispo] = useState(false);
  useEffect(() => {
    if (VERSION === "dev") return;
    const verifier = async () => {
      try {
        const r = await fetch(`${BASE}/version.json?t=${Date.now()}`, { cache: "no-store" });
        const { v } = (await r.json()) as { v: string };
        if (v && v !== VERSION) {
          // Recharge toute seule une fois par version, sinon bandeau.
          const cle = "planiroom:maj";
          let deja: string | null = null;
          try {
            deja = sessionStorage.getItem(cle);
          } catch {}
          if (deja !== v) {
            try {
              sessionStorage.setItem(cle, v);
            } catch {}
            window.location.reload();
          } else setDispo(true);
        }
      } catch {}
    };
    verifier();
    const t = setInterval(verifier, 5 * 60_000);
    const vis = () => document.visibilityState === "visible" && verifier();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  return dispo;
}

function BandeauMiseAJour() {
  const dispo = useMiseAJour();
  if (!dispo) return null;
  return (
    <div className="pt-safe fixed inset-x-0 top-0 z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 flex animate-apparition items-center gap-2 rounded-full bg-encre px-5 py-3 text-sm font-semibold text-white shadow-flottant"
      >
        <RefreshCw className="h-4 w-4" /> Nouvelle version disponible · Mettre à jour
      </button>
    </div>
  );
}

/* ---------- Enveloppe des écrans connectés ---------- */

export function Coquille({ children }: { children: ReactNode }) {
  const { pret, session } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const pleinEcran = pathname.startsWith("/messages/conversation");

  useEffect(() => {
    if (pret && !session) router.replace("/");
  }, [pret, session, router]);

  if (!pret || !session) return <Chargement />;
  return (
    <div className={cx("min-h-ecran", !pleinEcran && "pb-nav")}>
      {children}
      {!pleinEcran && <BarreNavigation />}
      <BandeauMiseAJour />
    </div>
  );
}

export function Chargement() {
  return (
    <div className="min-h-ecran flex items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-primaire/20 border-t-primaire" />
    </div>
  );
}

/** Contenu centré d'une page. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx("mx-auto max-w-2xl px-4 pt-2", className)}>{children}</main>;
}

/** Barre d'actions collée au-dessus de la navigation. */
export function BarreActions({ children }: { children: ReactNode }) {
  return <div className="bottom-nav sticky z-10 mt-6 flex gap-2.5 pb-3">{children}</div>;
}
