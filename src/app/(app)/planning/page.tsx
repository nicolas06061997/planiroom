"use client";

import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EnTete, Page } from "@/components/shell";
import { Avatar, Bouton, Carte, CarteAccueil, cx, StatAccueil, TitreSection } from "@/components/ui";
import { addDays, formatHeure, formatSemaineCourte, fromISO, JOURS_COURTS, mondayOf, today, weekDays } from "@/lib/dates";
import { fillesPresentes, shiftDe } from "@/lib/repartition";
import { useStore } from "@/lib/store";

export default function PlanningPage() {
  return (
    <Suspense>
      <Planning />
    </Suspense>
  );
}

function Planning() {
  const { donnees, session } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const lundi = mondayOf(params.get("semaine") ?? today());
  const jours = weekDays(lundi);
  const estAdmin = session?.role === "gouvernante";
  const filles = donnees.employees.filter((e) => e.actif);

  const allerSemaine = (n: number) => router.replace(`/planning/?semaine=${addDays(lundi, n * 7)}`, { scroll: false });

  const envoyees = new Set(donnees.envois.filter((e) => e.lundi === lundi).map((e) => e.employeeId));
  const nbRecues = filles.filter((f) => envoyees.has(f.id)).length;
  const jourCible = jours.includes(today()) ? today() : lundi;
  const nbReparties = jours.filter((d) => donnees.repartitions[d]?.statut === "envoyee").length;
  const colonnes = { gridTemplateColumns: `4.5rem repeat(${filles.length}, minmax(0, 1fr))` };

  return (
    <>
      <EnTete />
      <Page>
        <CarteAccueil
          className="animate-apparition"
          surtitre={`${lundi === mondayOf(today()) ? "Cette semaine" : "Semaine"} · ${fromISO(lundi).getFullYear()}`}
          titre={formatSemaineCourte(lundi)}
          droite={
            <div className="-mr-2 -mt-1 flex">
              <button
                type="button"
                aria-label="Semaine précédente"
                onClick={() => allerSemaine(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Semaine suivante"
                onClick={() => allerSemaine(1)}
                className="ml-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition active:scale-95"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          }
        >
          <div className="flex gap-2.5">
            <StatAccueil valeur={`${nbRecues}/${filles.length}`} libelle="Horaires" />
            <StatAccueil valeur={fillesPresentes(donnees, jourCible).length} libelle={jourCible === today() ? "Présentes" : "Lundi"} />
            <StatAccueil valeur={`${nbReparties}/7`} libelle="Jours prêts" />
          </div>
          <p className="mt-3 text-[14px] text-white/80">
            {nbRecues === filles.length
              ? "Tous les horaires de la semaine sont arrivés."
              : `Horaire attendu : ${filles.filter((f) => !envoyees.has(f.id)).map((f) => f.prenom).join(", ")}`}
          </p>
          {estAdmin && (
            <Bouton
              variante="blanc"
              taille="grand"
              pleineLargeur
              className="mt-4"
              icone={<Shuffle className="h-5 w-5" />}
              onClick={() => router.push(`/repartition/?date=${jourCible}`)}
            >
              Répartir les tâches
            </Bouton>
          )}
        </CarteAccueil>

        {lundi !== mondayOf(today()) && (
          <button
            type="button"
            className="mx-auto mt-3 block min-h-11 px-4 text-sm font-semibold text-primaire"
            onClick={() => router.replace("/planning/", { scroll: false })}
          >
            Revenir à cette semaine
          </button>
        )}

        <TitreSection action={estAdmin ? <span className="text-[13px] text-doux">Touchez un jour</span> : undefined}>
          Horaires de l&apos;équipe
        </TitreSection>

        <Carte className="overflow-hidden">
          <div className="grid border-b border-black/5 bg-fond/60 text-center" style={colonnes}>
            <div />
            {filles.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1 px-0.5 py-3">
                <Avatar prenom={f.prenom} couleur={f.couleur} taille={30} />
                <span className="w-full truncate text-[11px] font-semibold text-texte">{f.prenom}</span>
              </div>
            ))}
          </div>

          {jours.map((date, i) => {
            const presentes = fillesPresentes(donnees, date).length;
            const rep = donnees.repartitions[date];
            const estAujourdhui = date === today();
            const contenu = (
              <div className="grid items-stretch" style={colonnes}>
                <div className="flex flex-col justify-center py-2.5 pl-3.5">
                  <span className={cx("text-[14px] font-bold", estAujourdhui ? "text-primaire" : "text-encre")}>
                    {JOURS_COURTS[i]} {fromISO(date).getDate()}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-doux">
                    {presentes} prés.
                    {rep && (
                      <span
                        className={cx("h-1.5 w-1.5 rounded-full", rep.statut === "envoyee" ? "bg-primaire" : "bg-amber-400")}
                        title={rep.statut === "envoyee" ? "Répartition envoyée" : "Brouillon"}
                      />
                    )}
                  </span>
                </div>
                {filles.map((f) => {
                  const s = shiftDe(donnees, f.id, date);
                  return (
                    <div key={f.id} className="flex items-center justify-center p-1">
                      {!s ? (
                        <span className="text-xs text-pale">–</span>
                      ) : s.conge ? (
                        <span className="flex h-full min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-conge-clair text-[11px] font-bold text-conge">
                          Congé
                        </span>
                      ) : (
                        <span className="flex h-full min-h-[2.75rem] w-full flex-col items-center justify-center rounded-xl bg-primaire-clair text-[11px] font-semibold leading-tight text-primaire-fonce tabular-nums">
                          <span>{formatHeure(s.debut)}</span>
                          <span className="opacity-60">{formatHeure(s.fin)}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
            return (
              <div key={date} className={cx("border-b border-black/5 last:border-b-0", estAujourdhui && "bg-primaire-clair/30")}>
                {estAdmin ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/repartition/?date=${date}`)}
                    className="block w-full text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                    aria-label={`Répartition du ${JOURS_COURTS[i]} ${fromISO(date).getDate()}`}
                  >
                    {contenu}
                  </button>
                ) : (
                  contenu
                )}
              </div>
            );
          })}
        </Carte>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-doux">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-primaire-clair ring-1 ring-primaire/20" /> Travail
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-conge-clair ring-1 ring-conge/30" /> Congé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primaire" /> Répartition envoyée
          </span>
        </div>

      </Page>
    </>
  );
}
