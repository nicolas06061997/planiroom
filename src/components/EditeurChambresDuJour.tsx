"use client";

import { useStore } from "@/lib/store";
import type { ISODate, TypeMenage } from "@/lib/types";
import { LIBELLE_MENAGE, ORDRE_MENAGES } from "./metier";
import { Bouton, cx, Feuille } from "./ui";

const CYCLE: (TypeMenage | null)[] = [null, ...ORDRE_MENAGES];

const STYLE: Record<TypeMenage, string> = {
  depart: "border-depart/30 bg-depart-clair text-depart",
  arrivee: "border-arrivee/30 bg-arrivee-clair text-arrivee",
  raff: "border-raff/30 bg-raff-clair text-raff",
};

/** Feuille pour choisir quelles chambres sont à faire ce jour-là, et comment. */
export function EditeurChambresDuJour({
  date,
  ouverte,
  onFermer,
}: {
  date: ISODate;
  ouverte: boolean;
  onFermer: () => void;
}) {
  const { donnees, modifier } = useStore();
  const liste = donnees.chambresDuJour[date] ?? [];
  const typeDe = (id: string) => liste.find((c) => c.chambreId === id)?.type ?? null;

  const changer = (chambreId: string) => {
    const actuel = typeDe(chambreId);
    const suivant = CYCLE[(CYCLE.indexOf(actuel) + 1) % CYCLE.length];
    modifier((d) => {
      const autres = (d.chambresDuJour[date] ?? []).filter((c) => c.chambreId !== chambreId);
      return {
        ...d,
        chambresDuJour: {
          ...d.chambresDuJour,
          [date]: suivant ? [...autres, { chambreId, type: suivant }] : autres,
        },
      };
    });
  };

  const etages = [...new Set(donnees.chambres.filter((c) => c.active).map((c) => c.etage))].sort();

  return (
    <Feuille
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Chambres à faire"
      pied={
        <Bouton pleineLargeur onClick={onFermer}>
          Terminé
        </Bouton>
      }
    >
      <p className="mb-4 text-sm text-doux">
        Touchez une chambre pour changer : rien → Départ → Arrivée → Raff.
      </p>
      {etages.map((etage) => (
        <div key={etage} className="mb-4">
          <p className="mb-2 text-[13px] font-semibold text-doux">
            {etage === 0 ? "Rez-de-chaussée" : `Étage ${etage}`}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {donnees.chambres
              .filter((c) => c.active && c.etage === etage)
              .sort((a, b) => a.numero.localeCompare(b.numero))
              .map((c) => {
                const t = typeDe(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => changer(c.id)}
                    className={cx(
                      "flex min-h-14 flex-col items-center justify-center rounded-xl border text-center transition-colors active:scale-[0.97]",
                      t ? STYLE[t] : "border-bord bg-white text-doux"
                    )}
                  >
                    <span className={cx("text-[15px] font-semibold", !t && "text-encre")}>{c.numero}</span>
                    <span className="text-[11px] font-medium">{t ? LIBELLE_MENAGE[t] : "—"}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </Feuille>
  );
}
