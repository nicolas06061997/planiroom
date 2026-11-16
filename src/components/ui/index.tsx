"use client";

/**
 * Petits composants d'interface réutilisés partout.
 * Changer un style ici le change dans toute l'appli.
 */
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- Bouton ---------- */

type Variante = "primaire" | "secondaire" | "fantome" | "danger";

export function Bouton({
  variante = "primaire",
  taille = "normal",
  icone,
  pleineLargeur,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  taille?: "normal" | "grand";
  icone?: ReactNode;
  pleineLargeur?: boolean;
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaire",
        taille === "grand" ? "min-h-13 px-5 text-[15px]" : "min-h-11 px-4 text-sm",
        variante === "primaire" && "bg-primaire text-white shadow-carte hover:bg-primaire-fonce",
        variante === "secondaire" && "border border-bord bg-white text-encre hover:bg-gray-50",
        variante === "fantome" && "text-primaire hover:bg-primaire-clair",
        variante === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
        pleineLargeur && "w-full",
        className
      )}
    >
      {icone}
      {children}
    </button>
  );
}

export function BoutonIcone({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...props}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-texte transition-colors hover:bg-black/5 active:bg-black/10 disabled:opacity-35",
        "focus-visible:outline-2 focus-visible:outline-primaire",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Carte ---------- */

export function Carte({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={style}
      className={cx("rounded-2xl border border-bord/70 bg-carte shadow-carte", className)}
    >
      {children}
    </section>
  );
}

/* ---------- En-tête de page ---------- */

export function EnTete({
  titre,
  sousTitre,
  action,
  gauche,
}: {
  titre: string;
  sousTitre?: ReactNode;
  action?: ReactNode;
  gauche?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-bord/60 bg-fond/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-2xl items-center gap-2 px-4">
        {gauche}
        <div className="min-w-0 flex-1 py-2">
          <h1 className="truncate text-lg font-semibold tracking-tight text-encre">{titre}</h1>
          {sousTitre && <p className="truncate text-[13px] text-doux">{sousTitre}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/* ---------- Barre de progression ---------- */

export function Progression({
  valeur,
  max,
  couleur = "var(--color-primaire)",
  hauteur = 8,
  depasse,
}: {
  valeur: number;
  max: number;
  couleur?: string;
  hauteur?: number;
  depasse?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (valeur / max) * 100) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-gray-100"
      style={{ height: hauteur }}
      role="progressbar"
      aria-valuenow={Math.round(valeur)}
      aria-valuemax={Math.round(max)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: depasse ? "var(--color-conge)" : couleur }}
      />
    </div>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({
  prenom,
  couleur,
  taille = 40,
}: {
  prenom: string;
  couleur: string;
  taille?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: taille,
        height: taille,
        fontSize: taille * 0.4,
        color: couleur,
        background: `color-mix(in srgb, ${couleur} 12%, white)`,
      }}
    >
      {prenom.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------- Pastille / étiquette ---------- */

export function Pastille({
  children,
  ton = "neutre",
  className,
}: {
  children: ReactNode;
  ton?: "neutre" | "primaire" | "conge" | "depart" | "arrivee" | "raff" | "succes";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        ton === "neutre" && "bg-gray-100 text-texte",
        ton === "primaire" && "bg-primaire-clair text-primaire",
        ton === "conge" && "bg-conge-clair text-conge",
        ton === "depart" && "bg-depart-clair text-depart",
        ton === "arrivee" && "bg-arrivee-clair text-arrivee",
        ton === "raff" && "bg-raff-clair text-raff",
        ton === "succes" && "bg-emerald-50 text-emerald-700",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Feuille du bas (bottom sheet) ---------- */

export function Feuille({
  ouverte,
  onFermer,
  titre,
  children,
  pied,
}: {
  ouverte: boolean;
  onFermer: () => void;
  titre: string;
  children: ReactNode;
  pied?: ReactNode;
}) {
  useEffect(() => {
    if (!ouverte) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [ouverte, onFermer]);

  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={titre}>
      <div className="absolute inset-0 animate-fondu bg-gray-900/40" onClick={onFermer} />
      <div className="pb-safe relative flex max-h-[88dvh] w-full max-w-lg animate-monte flex-col rounded-t-3xl bg-white shadow-flottant sm:animate-apparition sm:rounded-3xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <h2 className="flex-1 text-base font-semibold text-encre">{titre}</h2>
          <BoutonIcone label="Fermer" onClick={onFermer} className="-mr-2">
            <X className="size-5" />
          </BoutonIcone>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {pied && <div className="border-t border-bord px-5 py-4">{pied}</div>}
      </div>
    </div>
  );
}

/* ---------- Champs de formulaire ---------- */

export function Champ({
  label,
  aide,
  children,
}: {
  label: string;
  aide?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-texte">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-xs text-doux">{aide}</span>}
    </label>
  );
}

export const classeInput =
  "block min-h-11 w-full rounded-xl border border-bord bg-white px-3.5 text-[15px] text-encre outline-none transition-shadow placeholder:text-pale focus:border-primaire focus:ring-3 focus:ring-primaire/15";

/* ---------- Interrupteur ---------- */

export function Interrupteur({
  actif,
  onChange,
  label,
}: {
  actif: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={label}
      onClick={() => onChange(!actif)}
      className="inline-flex min-h-11 shrink-0 items-center"
    >
      <span
        className={cx(
          "relative h-6.5 w-11 rounded-full transition-colors duration-200",
          actif ? "bg-primaire" : "bg-gray-300"
        )}
      >
        <span
          className={cx(
            "absolute top-0.75 left-0.75 size-5 rounded-full bg-white shadow transition-transform duration-200",
            actif && "translate-x-4.5"
          )}
        />
      </span>
    </button>
  );
}

/* ---------- État vide ---------- */

export function EtatVide({
  icone,
  titre,
  texte,
  action,
}: {
  icone: ReactNode;
  titre: string;
  texte?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primaire-clair text-primaire">
        {icone}
      </div>
      <p className="text-base font-semibold text-encre">{titre}</p>
      {texte && <p className="mt-1 max-w-xs text-sm text-doux">{texte}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Titre de section ---------- */

export function TitreSection({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2.5 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold tracking-wide text-doux uppercase">{children}</h2>
      {action}
    </div>
  );
}
