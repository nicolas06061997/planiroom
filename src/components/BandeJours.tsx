"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fromISO, JOURS_COURTS, jourSemaine, mondayOf, today, weekDays } from "@/lib/dates";
import type { ISODate } from "@/lib/types";
import { BoutonIcone, cx } from "./ui";

/** Bande des 7 jours de la semaine, avec flèches semaine précédente / suivante. */
export function BandeJours({
  date,
  onChange,
  marque,
}: {
  date: ISODate;
  onChange: (d: ISODate) => void;
  /** Petit point sous les jours concernés (ex. tâches envoyées). */
  marque?: (d: ISODate) => "plein" | "vide" | null;
}) {
  const lundi = mondayOf(date);
  return (
    <div className="flex items-center gap-0.5">
      <BoutonIcone label="Semaine précédente" onClick={() => onChange(addDays(date, -7))} className="-ml-2 h-10 w-9">
        <ChevronLeft className="h-5 w-5" />
      </BoutonIcone>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {weekDays(lundi).map((d) => {
          const actif = d === date;
          const estAujourdhui = d === today();
          const m = marque?.(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              aria-pressed={actif}
              aria-label={d}
              className={cx(
                "flex min-h-[3.75rem] flex-col items-center justify-center rounded-2xl transition active:scale-95",
                actif ? "bg-primaire text-white shadow-bouton" : estAujourdhui ? "bg-primaire-clair text-primaire" : "text-texte"
              )}
            >
              <span className={cx("text-[11px] font-semibold uppercase", actif ? "text-white/75" : "text-doux")}>
                {JOURS_COURTS[jourSemaine(d)]}
              </span>
              <span className="text-[17px] font-bold leading-tight tabular-nums">{fromISO(d).getDate()}</span>
              <span
                className={cx(
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  !m && "opacity-0",
                  m === "plein" && (actif ? "bg-white" : "bg-primaire"),
                  m === "vide" && (actif ? "bg-white/50" : "bg-amber-400")
                )}
              />
            </button>
          );
        })}
      </div>
      <BoutonIcone label="Semaine suivante" onClick={() => onChange(addDays(date, 7))} className="-mr-2 h-10 w-9">
        <ChevronRight className="h-5 w-5" />
      </BoutonIcone>
    </div>
  );
}
