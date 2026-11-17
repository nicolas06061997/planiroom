"use client";

/** Carte « Horaires de la semaine » + petites cartes de chiffres (écran Horaire, comme sur la maquette). */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { fromISO, JOURS_COURTS, mondayOf, today, weekDays } from "@/lib/dates";
import { fillesPresentes, shiftDe } from "@/lib/repartition";
import { useStore } from "@/lib/store";
import type { ISODate } from "@/lib/types";
import { Anneau, Avatar, Carte, cx, teinte } from "./ui";

/** "08:00" → "8h", "08:30" → "8h30" */
const heureCourte = (h: string | null) => {
  if (!h) return "";
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm === "00" ? "" : mm}`;
};

export function CarteSemaineEquipe({ date = today() }: { date?: ISODate }) {
  const { donnees } = useStore();
  const lundi = mondayOf(date);
  const jours = weekDays(lundi);
  const filles = donnees.employees.filter((e) => e.actif);
  const recus = new Set(donnees.envois.filter((e) => e.lundi === lundi).map((e) => e.employeeId));
  const colonnes = { gridTemplateColumns: `4.25rem repeat(${filles.length}, minmax(0, 1fr))` };

  return (
    <Carte className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="min-w-0 truncate text-[16px] font-bold tracking-tight text-encre xs:text-[17px]">🗓️ Horaires de la semaine</h2>
        <Link
          href={`/planning/?semaine=${lundi}`}
          aria-label="Voir tout le planning"
          className="flex min-h-11 shrink-0 items-center gap-0.5 whitespace-nowrap pl-2 text-[14px] font-medium text-doux"
        >
          <span className="hidden xs:inline">Tout voir</span> <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="grid items-center gap-y-1" style={colonnes}>
        <Anneau valeur={recus.size} max={filles.length} taille={58} epaisseur={6}>
          <span className="text-[15px] font-bold text-encre tabular-nums">
            {recus.size}/{filles.length}
          </span>
        </Anneau>
        {filles.map((f) => (
          <div key={f.id} className={cx("flex flex-col items-center gap-1", !recus.has(f.id) && "opacity-50")}>
            <Avatar prenom={f.prenom} couleur={f.couleur} taille={34} />
            <span className="w-full truncate text-center text-[11px] font-medium text-texte">{f.prenom}</span>
          </div>
        ))}
      </div>

      <div className="mt-2">
        {jours.map((d, i) => {
          const estAuj = d === today();
          return (
            <div
              key={d}
              className={cx("grid items-center gap-1 border-t border-black/5 py-1.5", estAuj && "-mx-2 rounded-xl border-transparent bg-primaire-clair/60 px-2")}
              style={colonnes}
            >
              <span className={cx("text-[14px] font-semibold", estAuj ? "text-primaire" : "text-encre")}>
                {JOURS_COURTS[i]} {fromISO(d).getDate()}
              </span>
              {filles.map((f) => {
                const s = shiftDe(donnees, f.id, d);
                if (!s) return <span key={f.id} className="text-center text-xs text-pale">–</span>;
                if (s.conge)
                  return (
                    <span key={f.id} className="flex h-8 items-center justify-center rounded-full bg-conge-clair text-[11px] font-semibold text-conge">
                      Congé
                    </span>
                  );
                return (
                  <span
                    key={f.id}
                    className="flex h-8 items-center justify-center whitespace-nowrap rounded-full text-[11px] font-semibold tabular-nums"
                    style={{ background: teinte(f.couleur, 0.14), color: f.couleur }}
                  >
                    {heureCourte(s.debut)}–{heureCourte(s.fin)}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-pale">⛱️ Congé · l&apos;anneau montre les horaires reçus</p>
    </Carte>
  );
}

export function ChiffresSemaine({ date = today() }: { date?: ISODate }) {
  const { donnees } = useStore();
  const lundi = mondayOf(date);
  const jours = weekDays(lundi);
  const jour = jours.includes(today()) ? today() : lundi;
  const presentes = fillesPresentes(donnees, jour).length;
  const prets = jours.filter((d) => donnees.repartitions[d]?.statut === "envoyee").length;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Carte className="p-4">
        <p className="text-[15px] font-bold text-encre">👥 Présentes</p>
        <p className="mt-1 text-[32px] font-extrabold leading-none text-primaire tabular-nums">{presentes}</p>
        <p className="mt-1 text-[13px] text-doux">{jour === today() ? "aujourd'hui" : "lundi"}</p>
      </Carte>
      <Carte className="p-4">
        <p className="text-[15px] font-bold text-encre">✨ Complété</p>
        <p className="mt-1 text-[32px] font-extrabold leading-none text-primaire tabular-nums">
          {prets}
          <span className="text-xl text-primaire/60">/7</span>
        </p>
        <p className="mt-1 text-[13px] text-doux">jours de planning</p>
      </Carte>
    </div>
  );
}
