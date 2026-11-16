"use client";

import { CalendarClock, CalendarDays, ListChecks, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Avatar, cx, Feuille } from "./ui";

const ONGLETS = [
  { href: "/horaire", label: "Horaire", icone: CalendarClock, actifSi: ["/horaire"] },
  { href: "/planning", label: "Planning", icone: CalendarDays, actifSi: ["/planning", "/repartition"] },
  { href: "/mes-taches", label: "Mes tâches", icone: ListChecks, actifSi: ["/mes-taches"] },
];

export function BarreNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-bord bg-white/95 backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-3">
        {ONGLETS.map(({ href, label, icone: Icone, actifSi }) => {
          const actif = actifSi.some((p) => pathname.startsWith(p));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={cx(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors",
                  actif ? "text-primaire" : "text-doux hover:text-texte"
                )}
              >
                <span
                  className={cx(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                    actif && "bg-primaire-clair"
                  )}
                >
                  <Icone className="size-5.5" strokeWidth={actif ? 2.25 : 1.9} />
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

/** Pastille de profil en haut à droite, avec menu. */
export function MenuProfil() {
  const { session, setSession, donnees } = useStore();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  if (!session) return null;
  const employee = donnees.employees.find((e) => e.id === session.employeeId);
  const nom = session.role === "gouvernante" ? "Gouvernante" : employee?.prenom ?? "";
  const couleur = employee?.couleur ?? "#0F766E";

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        aria-label="Mon profil"
        className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-95"
      >
        {session.role === "gouvernante" ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-primaire text-white">
            <UserRound className="size-4.5" />
          </span>
        ) : (
          <Avatar prenom={nom} couleur={couleur} taille={36} />
        )}
      </button>
      <Feuille ouverte={ouvert} onFermer={() => setOuvert(false)} titre="Mon profil">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-fond p-3">
          <Avatar prenom={nom} couleur={couleur} taille={44} />
          <div>
            <p className="font-semibold text-encre">{nom}</p>
            <p className="text-[13px] text-doux">
              {session.role === "gouvernante" ? "Administratrice" : "Femme de chambre"}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {session.role === "gouvernante" && (
            <LigneMenu
              icone={<Settings className="size-5" />}
              onClick={() => {
                setOuvert(false);
                router.push("/reglages");
              }}
            >
              Réglages (filles, chambres, tâches)
            </LigneMenu>
          )}
          <LigneMenu
            icone={<LogOut className="size-5" />}
            onClick={() => {
              setSession(null);
              router.replace("/");
            }}
          >
            Changer de profil
          </LigneMenu>
        </div>
      </Feuille>
    </>
  );
}

function LigneMenu({
  icone,
  children,
  onClick,
}: {
  icone: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-13 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-encre hover:bg-fond active:bg-gray-100"
    >
      <span className="text-doux">{icone}</span>
      {children}
    </button>
  );
}

/** Enveloppe des écrans connectés : vérifie le profil et affiche la barre du bas. */
export function Coquille({ children }: { children: ReactNode }) {
  const { pret, session } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (pret && !session) router.replace("/");
  }, [pret, session, router]);

  if (!pret || !session) return <Chargement />;
  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {children}
      <BarreNavigation />
    </div>
  );
}

export function Chargement() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-3 border-primaire/20 border-t-primaire" />
    </div>
  );
}

/** Contenu centré d'une page. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx("mx-auto max-w-2xl px-4 pt-4", className)}>{children}</main>;
}
