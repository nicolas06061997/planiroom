"use client";

/**
 * Petits composants d'interface réutilisés partout.
 * Changer un style ici le change dans toute l'appli.
 */
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Couleur hexadécimale + transparence (compatible tous navigateurs). */
export function teinte(hex: string, alpha: number) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex.length === 7 ? hex : "#0F766E"}${a}`;
}

const focus = "focus:outline-none focus-visible:ring-3 focus-visible:ring-primaire/40";

/* ---------- Bouton ---------- */

type Variante = "primaire" | "secondaire" | "fantome" | "danger" | "blanc";

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
      type="button"
      {...props}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        focus,
        taille === "grand" ? "min-h-14 px-6 text-base" : "min-h-12 px-5 text-[15px]",
        variante === "primaire" && "bg-primaire text-white shadow-bouton hover:bg-primaire-fonce",
        variante === "secondaire" && "border border-bord bg-white text-encre shadow-carte hover:bg-gray-50",
        variante === "fantome" && "text-primaire hover:bg-primaire-clair",
        variante === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
        variante === "blanc" && "bg-white text-primaire-fonce shadow-flottant hover:bg-primaire-clair",
        pleineLargeur && "w-full",
        className
      )}
    >
      {icone && <span className="flex shrink-0 items-center">{icone}</span>}
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
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texte transition hover:bg-black/5 active:scale-95 active:bg-black/10 disabled:opacity-30",
        focus,
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
  style?: CSSProperties;
}) {
  return (
    <section style={style} className={cx("rounded-3xl border border-black/[0.04] bg-carte shadow-carte", className)}>
      {children}
    </section>
  );
}

/* ---------- Carte d'accueil (dégradé, comme dans Céline) ---------- */

export function CarteAccueil({
  surtitre,
  titre,
  sousTitre,
  droite,
  children,
  className,
}: {
  surtitre?: ReactNode;
  titre: ReactNode;
  sousTitre?: ReactNode;
  droite?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("hero relative overflow-hidden rounded-4xl p-5 text-white shadow-flottant", className)}>
      {/* Formes décoratives discrètes */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/[0.06]" />
      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {surtitre && <p className="text-[13px] font-semibold uppercase tracking-wider text-white/70">{surtitre}</p>}
          <h2 className="mt-1 text-[26px] font-bold leading-tight tracking-tight">{titre}</h2>
          {sousTitre && <div className="mt-1 text-[15px] text-white/80">{sousTitre}</div>}
        </div>
        {droite}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}

/** Petite statistique sur fond de carte d'accueil. */
export function StatAccueil({ valeur, libelle }: { valeur: ReactNode; libelle: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.12] px-2.5 py-2.5 xs:px-3.5">
      <p className="text-xl font-bold leading-tight tabular-nums">{valeur}</p>
      <p className="truncate text-[11px] font-medium text-white/75 xs:text-[12px]">{libelle}</p>
    </div>
  );
}

/* ---------- Anneau de progression ---------- */

export function Anneau({
  valeur,
  max,
  taille = 76,
  epaisseur = 8,
  clair,
  children,
}: {
  valeur: number;
  max: number;
  taille?: number;
  epaisseur?: number;
  /** Version blanche, pour la carte d'accueil. */
  clair?: boolean;
  children?: ReactNode;
}) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, valeur / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" strokeWidth={epaisseur} stroke={clair ? "rgba(255,255,255,0.2)" : "#E6F4F2"} />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          stroke={clair ? "#FFFFFF" : "#0F766E"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------- Barre de progression ---------- */

export function Progression({
  valeur,
  max,
  hauteur = 8,
  depasse,
}: {
  valeur: number;
  max: number;
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
        className={cx("h-full rounded-full transition-all duration-500 ease-out", depasse ? "bg-conge" : "bg-primaire")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ prenom, couleur, taille = 40 }: { prenom: string; couleur: string; taille?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: taille, height: taille, fontSize: taille * 0.42, color: couleur, background: teinte(couleur, 0.12) }}
    >
      {(prenom || "?").slice(0, 1).toUpperCase()}
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
  ton?: "neutre" | "primaire" | "conge" | "depart" | "arrivee" | "raff" | "succes" | "blanc";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ton === "neutre" && "bg-gray-100 text-texte",
        ton === "primaire" && "bg-primaire-clair text-primaire",
        ton === "conge" && "bg-conge-clair text-conge",
        ton === "depart" && "bg-depart-clair text-depart",
        ton === "arrivee" && "bg-arrivee-clair text-arrivee",
        ton === "raff" && "bg-raff-clair text-raff",
        ton === "succes" && "bg-emerald-50 text-emerald-700",
        ton === "blanc" && "bg-white/20 text-white",
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
      <div className="absolute inset-0 animate-fondu bg-slate-900/40" onClick={onFermer} />
      <div className="pb-safe max-h-feuille relative flex w-full max-w-lg animate-monte flex-col rounded-t-4xl bg-white shadow-flottant sm:animate-apparition sm:rounded-4xl">
        <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-gray-200 sm:hidden" />
        <div className="flex items-center gap-2 px-6 pb-2 pt-3">
          <h2 className="flex-1 text-lg font-bold tracking-tight text-encre">{titre}</h2>
          <BoutonIcone label="Fermer" onClick={onFermer} className="-mr-2 bg-gray-100">
            <X className="h-5 w-5" />
          </BoutonIcone>
        </div>
        <div className="overflow-y-auto px-6 pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>
        {pied && <div className="border-t border-bord px-6 py-4">{pied}</div>}
      </div>
    </div>
  );
}

/* ---------- Champs de formulaire ---------- */

export function Champ({ label, aide, children }: { label: string; aide?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-texte">{label}</span>
      {children}
      {aide && <span className="mt-1.5 block text-xs text-doux">{aide}</span>}
    </label>
  );
}

/* font-size 16px minimum : évite le zoom automatique sur iPhone */
export const classeInput =
  "block min-h-12 w-full rounded-2xl border border-bord bg-white px-4 text-base text-encre outline-none transition placeholder:text-pale focus:border-primaire focus:ring-3 focus:ring-primaire/15";

/* ---------- Interrupteur ---------- */

export function Interrupteur({ actif, onChange, label }: { actif: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={label}
      onClick={() => onChange(!actif)}
      className="inline-flex min-h-11 shrink-0 items-center focus:outline-none"
    >
      <span className={cx("relative h-7 w-12 rounded-full transition-colors duration-200", actif ? "bg-primaire" : "bg-gray-300")}>
        <span
          className={cx(
            "absolute left-0.75 top-0.75 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform duration-200",
            actif && "translate-x-5"
          )}
        />
      </span>
    </button>
  );
}

/* ---------- État vide ---------- */

export function EtatVide({ icone, titre, texte, action }: { icone: ReactNode; titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primaire-clair text-primaire">{icone}</div>
      <p className="text-[17px] font-bold text-encre">{titre}</p>
      {texte && <p className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-doux">{texte}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ---------- Titre de section ---------- */

export function TitreSection({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between px-1">
      <h2 className="text-[17px] font-bold tracking-tight text-encre">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Sélecteur segmenté ---------- */

export function Segments<T extends string>({
  options,
  valeur,
  onChange,
  className,
}: {
  options: { valeur: T; libelle: ReactNode }[];
  valeur: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex rounded-2xl bg-gray-200/70 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="tab"
          aria-selected={o.valeur === valeur}
          onClick={() => onChange(o.valeur)}
          className={cx(
            "min-h-10 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition",
            o.valeur === valeur ? "bg-white text-encre shadow-carte" : "text-doux"
          )}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}
