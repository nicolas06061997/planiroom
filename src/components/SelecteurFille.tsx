"use client";

import { useStore } from "@/lib/store";
import { cx } from "./ui";

/** Choix d'une fille (visible uniquement pour la gouvernante). */
export function SelecteurFille({
  valeur,
  onChange,
}: {
  valeur: string | undefined;
  onChange: (id: string) => void;
}) {
  const { donnees } = useStore();
  return (
    <div className="-mx-4 mb-1 overflow-x-auto px-4 [scrollbar-width:none]">
      <div className="flex gap-2 py-1">
        {donnees.employees
          .filter((e) => e.actif)
          .map((e) => {
            const actif = e.id === valeur;
            return (
              <button
                key={e.id}
                onClick={() => onChange(e.id)}
                aria-pressed={actif}
                className={cx(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                  actif
                    ? "border-primaire bg-primaire text-white"
                    : "border-bord bg-white text-texte hover:bg-gray-50"
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: actif ? "white" : e.couleur }}
                />
                {e.prenom}
              </button>
            );
          })}
      </div>
    </div>
  );
}

/** Fille affichée : la fille connectée, ou celle choisie par la gouvernante. */
export function useFilleCourante(choix: string | undefined) {
  const { session, donnees } = useStore();
  if (session?.role === "employee") return session.employeeId;
  return choix ?? donnees.employees.find((e) => e.actif)?.id;
}
