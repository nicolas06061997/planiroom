"use client";

/** Composants liés au métier (types de ménage, charge de travail…). */
import { formatDuree } from "@/lib/dates";
import type { TypeMenage } from "@/lib/types";
import { Pastille, Progression } from "./ui";

const TON: Record<TypeMenage, "depart" | "arrivee" | "raff"> = {
  depart: "depart",
  arrivee: "arrivee",
  raff: "raff",
};

export const LIBELLE_MENAGE: Record<TypeMenage, string> = {
  depart: "Départ",
  arrivee: "Arrivée",
  raff: "Raff",
};

export const ORDRE_MENAGES: TypeMenage[] = ["depart", "arrivee", "raff"];

export function EtiquetteMenage({ type }: { type: TypeMenage }) {
  return <Pastille ton={TON[type]}>{LIBELLE_MENAGE[type]}</Pastille>;
}

/** Barre de charge : temps de travail prévu par rapport au temps disponible. */
export function BarreCharge({ charge, capacite }: { charge: number; capacite: number }) {
  const depasse = charge > capacite;
  const pct = capacite > 0 ? Math.round((charge / capacite) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-[14px]">
        <span className="font-semibold text-encre">
          {formatDuree(charge)} <span className="font-normal text-doux">sur {formatDuree(capacite)}</span>
        </span>
        <span className={depasse ? "font-semibold text-conge" : "text-doux"}>{pct} %</span>
      </div>
      <Progression valeur={charge} max={capacite} depasse={depasse} />
    </div>
  );
}
