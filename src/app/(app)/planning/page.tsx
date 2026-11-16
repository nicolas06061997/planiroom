"use client";

import { Check, ChevronLeft, ChevronRight, Shuffle, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MenuProfil, Page } from "@/components/shell";
import { Avatar, Bouton, BoutonIcone, Carte, cx, EnTete, Pastille } from "@/components/ui";
import {
  addDays,
  formatHeure,
  formatSemaine,
  fromISO,
  JOURS_COURTS,
  mondayOf,
  today,
  weekDays,
} from "@/lib/dates";
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

  const allerSemaine = (n: number) =>
    router.replace(`/planning?semaine=${addDays(lundi, n * 7)}`, { scroll: false });

  const envoyees = new Set(
    donnees.envois.filter((e) => e.lundi === lundi).map((e) => e.employeeId)
  );
  const nbRecues = filles.filter((f) => envoyees.has(f.id)).length;
  const jourCible = jours.includes(today()) ? today() : lundi;

  return (
    <>
      <EnTete titre="Planning" sousTitre="Semaine de l'équipe" action={<MenuProfil />} />
      <Page>
        {/* Navigation semaine */}
        <div className="flex items-center gap-1">
          <BoutonIcone label="Semaine précédente" onClick={() => allerSemaine(-1)}>
            <ChevronLeft className="size-5" />
          </BoutonIcone>
          <div className="flex-1 text-center">
            <p className="text-[15px] font-semibold text-encre">{formatSemaine(lundi)}</p>
            {lundi !== mondayOf(today()) && (
              <button
                className="text-[13px] font-medium text-primaire"
                onClick={() => router.replace("/planning", { scroll: false })}
              >
                Revenir à cette semaine
              </button>
            )}
          </div>
          <BoutonIcone label="Semaine suivante" onClick={() => allerSemaine(1)}>
            <ChevronRight className="size-5" />
          </BoutonIcone>
        </div>

        {/* Captures reçues */}
        <Carte className="mt-3 flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primaire-clair text-primaire">
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-encre">
              Captures reçues {nbRecues}/{filles.length}
            </p>
            <div className="mt-1.5 flex -space-x-1.5">
              {filles.map((f) => (
                <span
                  key={f.id}
                  title={`${f.prenom} : ${envoyees.has(f.id) ? "reçue" : "en attente"}`}
                  className={cx(
                    "rounded-full ring-2 ring-white",
                    !envoyees.has(f.id) && "opacity-35 grayscale"
                  )}
                >
                  <Avatar prenom={f.prenom} couleur={f.couleur} taille={26} />
                </span>
              ))}
            </div>
          </div>
          {nbRecues === filles.length && (
            <Pastille ton="succes">
              <Check className="size-3.5" /> Complet
            </Pastille>
          )}
        </Carte>

        {/* Grille de la semaine */}
        <Carte className="mt-3 overflow-hidden">
          <div
            className="grid border-b border-bord bg-gray-50/70 text-center"
            style={{ gridTemplateColumns: `4.25rem repeat(${filles.length}, minmax(0, 1fr))` }}
          >
            <div />
            {filles.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1 px-0.5 py-2.5">
                <Avatar prenom={f.prenom} couleur={f.couleur} taille={26} />
                <span className="w-full truncate text-[11px] font-medium text-texte">{f.prenom}</span>
              </div>
            ))}
          </div>

          {jours.map((date, i) => {
            const presentes = fillesPresentes(donnees, date).length;
            const rep = donnees.repartitions[date];
            const estAujourdhui = date === today();
            const contenu = (
              <div
                className="grid items-stretch"
                style={{ gridTemplateColumns: `4.25rem repeat(${filles.length}, minmax(0, 1fr))` }}
              >
                <div className="flex flex-col justify-center py-2.5 pl-3">
                  <span
                    className={cx(
                      "text-[13px] font-semibold",
                      estAujourdhui ? "text-primaire" : "text-encre"
                    )}
                  >
                    {JOURS_COURTS[i]} {fromISO(date).getDate()}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-doux">
                    {presentes} prés.
                    {rep && (
                      <span
                        className={cx(
                          "size-1.5 rounded-full",
                          rep.statut === "envoyee" ? "bg-primaire" : "bg-amber-400"
                        )}
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
                        <span className="flex h-full min-h-9 w-full items-center justify-center rounded-lg bg-conge-clair text-[11px] font-semibold text-conge">
                          Congé
                        </span>
                      ) : (
                        <span className="flex h-full min-h-9 w-full flex-col items-center justify-center rounded-lg bg-primaire-clair/70 text-[11px] leading-tight font-medium text-primaire-fonce tabular-nums">
                          <span>{formatHeure(s.debut)}</span>
                          <span className="opacity-70">{formatHeure(s.fin)}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
            return (
              <div
                key={date}
                className={cx(
                  "border-b border-bord/70 last:border-b-0",
                  estAujourdhui && "bg-primaire-clair/30"
                )}
              >
                {estAdmin ? (
                  <Link
                    href={`/repartition/${date}`}
                    className="block transition-colors hover:bg-gray-50 active:bg-gray-100"
                    aria-label={`Répartition du ${JOURS_COURTS[i]} ${fromISO(date).getDate()}`}
                  >
                    {contenu}
                  </Link>
                ) : (
                  contenu
                )}
              </div>
            );
          })}
        </Carte>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-doux">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primaire-clair" /> Travail
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-conge-clair ring-1 ring-conge/30" /> Congé
          </span>
          {estAdmin && <span>Touchez un jour pour voir sa répartition.</span>}
        </div>

        {estAdmin && (
          <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] mt-5 pb-3">
            <Bouton
              taille="grand"
              pleineLargeur
              icone={<Shuffle className="size-5" />}
              onClick={() => router.push(`/repartition/${jourCible}`)}
              className="shadow-flottant"
            >
              Répartir les tâches
            </Bouton>
          </div>
        )}
      </Page>
    </>
  );
}
