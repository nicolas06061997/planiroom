"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  RefreshCw,
  Send,
  Shuffle,
  Sparkles,
  Trash2,
  UserRoundX,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditeurChambresDuJour } from "@/components/EditeurChambresDuJour";
import { BarreCharge, LIBELLE_MENAGE, ORDRE_MENAGES } from "@/components/metier";
import { MenuProfil, Page } from "@/components/shell";
import {
  Avatar,
  Bouton,
  BoutonIcone,
  Carte,
  cx,
  EnTete,
  EtatVide,
  Feuille,
  Pastille,
  TitreSection,
} from "@/components/ui";
import {
  addDays,
  formatDuree,
  formatHeure,
  formatJourLong,
  mondayOf,
} from "@/lib/dates";
import {
  chargeCarte,
  dureeMenage,
  fillesPresentes,
  tachesDuJour,
} from "@/lib/repartition";
import { useStore } from "@/lib/store";
import type { CarteFille, TypeMenage } from "@/lib/types";

type Element =
  | { genre: "chambre"; id: string; type: TypeMenage; de: string | null }
  | { genre: "tache"; id: string; de: string | null };

const STYLE_CHIP: Record<TypeMenage, string> = {
  depart: "bg-depart-clair text-depart",
  arrivee: "bg-arrivee-clair text-arrivee",
  raff: "bg-raff-clair text-raff",
};

export default function RepartitionPage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const { donnees, session, genererRepartition, modifierCartes, envoyerRepartition } = useStore();
  const [edition, setEdition] = useState(false);
  const [editeurChambres, setEditeurChambres] = useState(false);
  const [selection, setSelection] = useState<Element | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    if (session && session.role !== "gouvernante") router.replace("/mes-taches");
  }, [session, router]);

  const rep = donnees.repartitions[date];
  const presentes = fillesPresentes(donnees, date);
  const chambresJour = donnees.chambresDuJour[date] ?? [];
  const taches = tachesDuJour(donnees, date);
  const numero = (id: string) => donnees.chambres.find((c) => c.id === id)?.numero ?? "?";
  const nomTache = (id: string) => donnees.taches.find((t) => t.id === id);

  const compte = Object.fromEntries(
    ORDRE_MENAGES.map((t) => [t, chambresJour.filter((c) => c.type === t).length])
  ) as Record<TypeMenage, number>;
  const totalMinutes =
    chambresJour.reduce((s, c) => s + dureeMenage(donnees, c.type), 0) +
    taches.reduce((s, t) => s + t.dureeMin, 0);

  // Éléments du jour qui ne sont dans aucune carte (après une modification).
  const nonAttribues = useMemo(() => {
    if (!rep) return { chambres: [], taches: [] };
    const ch = new Set(rep.cartes.flatMap((c) => c.chambres.map((x) => x.chambreId)));
    const ta = new Set(rep.cartes.flatMap((c) => c.taches.map((x) => x.tacheId)));
    return {
      chambres: chambresJour.filter((c) => !ch.has(c.chambreId)),
      taches: taches.filter((t) => !ta.has(t.id)),
    };
  }, [rep, chambresJour, taches]);

  const horaireChange =
    !!rep &&
    (presentes.length !== rep.cartes.length ||
      presentes.some((p) => !rep.cartes.some((c) => c.employeeId === p.employee.id)));

  const deplacer = (el: Element, vers: string | null) => {
    modifierCartes(date, (cartes) =>
      cartes.map((c) => {
        let carte: CarteFille = c;
        if (el.genre === "chambre") {
          if (c.employeeId === el.de)
            carte = { ...carte, chambres: carte.chambres.filter((x) => x.chambreId !== el.id) };
          if (c.employeeId === vers)
            carte = {
              ...carte,
              chambres: [...carte.chambres, { chambreId: el.id, type: el.type, fait: false }].sort(
                (a, b) => numero(a.chambreId).localeCompare(numero(b.chambreId))
              ),
            };
        } else {
          if (c.employeeId === el.de)
            carte = { ...carte, taches: carte.taches.filter((x) => x.tacheId !== el.id) };
          if (c.employeeId === vers)
            carte = { ...carte, taches: [...carte.taches, { tacheId: el.id, fait: false }] };
        }
        return carte;
      })
    );
    setSelection(null);
  };

  const dureeElement = (el: Element) =>
    el.genre === "chambre" ? dureeMenage(donnees, el.type) : nomTache(el.id)?.dureeMin ?? 0;

  const allerJour = (n: number) => {
    setEdition(false);
    router.replace(`/repartition/${addDays(date, n)}`);
  };

  const ecart = rep
    ? (() => {
        const ratios = rep.cartes.map((c) => {
          const p = presentes.find((x) => x.employee.id === c.employeeId);
          return p ? chargeCarte(donnees, c) / p.capacite : 0;
        });
        return ratios.length ? Math.round((Math.max(...ratios) - Math.min(...ratios)) * 100) : 0;
      })()
    : 0;

  return (
    <>
      <EnTete
        titre="Répartition du jour"
        sousTitre={formatJourLong(date)}
        gauche={
          <BoutonIcone
            label="Retour au planning"
            onClick={() => router.push(`/planning?semaine=${mondayOf(date)}`)}
            className="-ml-2"
          >
            <ArrowLeft className="size-5" />
          </BoutonIcone>
        }
        action={<MenuProfil />}
      />
      <Page>
        {/* Navigation jour */}
        <div className="flex items-center gap-1">
          <BoutonIcone label="Jour précédent" onClick={() => allerJour(-1)}>
            <ChevronLeft className="size-5" />
          </BoutonIcone>
          <div className="flex flex-1 items-center justify-center gap-2">
            {rep ? (
              rep.statut === "envoyee" ? (
                <Pastille ton="primaire">
                  <Check className="size-3.5" /> Envoyée aux filles
                </Pastille>
              ) : (
                <Pastille ton="conge">Brouillon, pas encore envoyé</Pastille>
              )
            ) : (
              <Pastille>Pas encore répartie</Pastille>
            )}
          </div>
          <BoutonIcone label="Jour suivant" onClick={() => allerJour(1)}>
            <ChevronRight className="size-5" />
          </BoutonIcone>
        </div>

        {/* Résumé du jour */}
        <Carte className="mt-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primaire-clair text-primaire">
              <BedDouble className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-encre">
                {chambresJour.length} chambres · {taches.length} tâches
              </p>
              <p className="text-[13px] text-doux">
                {presentes.length} présentes · {formatDuree(totalMinutes)} de travail estimé
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ORDRE_MENAGES.map((t) => (
                  <span
                    key={t}
                    className={cx("rounded-md px-2 py-0.5 text-xs font-semibold", STYLE_CHIP[t])}
                  >
                    {compte[t]} {LIBELLE_MENAGE[t]}
                  </span>
                ))}
              </div>
            </div>
            <BoutonIcone label="Modifier les chambres à faire" onClick={() => setEditeurChambres(true)} className="-mr-2 -mt-1.5">
              <Pencil className="size-4.5" />
            </BoutonIcone>
          </div>
        </Carte>

        {horaireChange && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0" />
            <p className="flex-1">
              Les horaires ont changé depuis cette répartition.
              <button className="ml-1 font-semibold underline" onClick={() => genererRepartition(date)}>
                Relancer
              </button>
            </p>
          </div>
        )}

        {presentes.length === 0 ? (
          <Carte className="mt-4">
            <EtatVide
              icone={<UserRoundX className="size-6" />}
              titre="Personne ne travaille ce jour-là"
              texte="Aucun horaire n'a été reçu pour cette date, ou toutes les filles sont en congé."
            />
          </Carte>
        ) : !rep ? (
          <Carte className="mt-4">
            <EtatVide
              icone={<Sparkles className="size-6" />}
              titre="Prête à répartir"
              texte="L'appli partage les chambres et les tâches selon le temps de travail de chacune, et fait tourner les tâches pénibles."
              action={
                <Bouton taille="grand" icone={<Shuffle className="size-5" />} onClick={() => genererRepartition(date)}>
                  Répartir automatiquement
                </Bouton>
              }
            />
          </Carte>
        ) : (
          <>
            <TitreSection
              action={
                <span className={cx("text-xs font-medium", ecart > 20 ? "text-conge" : "text-doux")}>
                  Écart de charge : {ecart} %
                </span>
              }
            >
              {rep.cartes.length} filles
            </TitreSection>

            <div className="flex flex-col gap-3">
              {rep.cartes.map((carte, i) => {
                const p = presentes.find((x) => x.employee.id === carte.employeeId);
                const emp = donnees.employees.find((e) => e.id === carte.employeeId);
                if (!emp) return null;
                const charge = chargeCarte(donnees, carte);
                const faits =
                  carte.chambres.filter((c) => c.fait).length + carte.taches.filter((t) => t.fait).length;
                const total = carte.chambres.length + carte.taches.length;
                return (
                  <Carte key={carte.employeeId} className="animate-apparition p-4" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-3">
                      <Avatar prenom={emp.prenom} couleur={emp.couleur} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-encre">{emp.prenom}</p>
                        <p className="flex items-center gap-1 text-[13px] text-doux">
                          <Clock className="size-3.5" />
                          {p ? `${formatHeure(p.shift.debut)} – ${formatHeure(p.shift.fin)}` : "Plus au planning"}
                        </p>
                      </div>
                      {rep.statut === "envoyee" && total > 0 && (
                        <Pastille ton={faits === total ? "succes" : "neutre"}>
                          {faits}/{total} fait
                        </Pastille>
                      )}
                    </div>

                    <div className="mt-3">
                      <BarreCharge charge={charge} capacite={p?.capacite ?? 0} />
                    </div>

                    <p className="mt-4 mb-2 text-[12px] font-semibold tracking-wide text-doux uppercase">
                      Chambres ({carte.chambres.length})
                    </p>
                    {carte.chambres.length === 0 ? (
                      <p className="text-sm text-pale">Aucune chambre</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {carte.chambres.map((c) => (
                          <button
                            key={c.chambreId}
                            disabled={!edition}
                            onClick={() =>
                              setSelection({ genre: "chambre", id: c.chambreId, type: c.type, de: carte.employeeId })
                            }
                            className={cx(
                              "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold tabular-nums transition-[transform,box-shadow]",
                              STYLE_CHIP[c.type],
                              edition && "ring-1 ring-current/25 active:scale-95",
                              c.fait && "opacity-55"
                            )}
                            title={LIBELLE_MENAGE[c.type]}
                          >
                            {c.fait && <Check className="size-3.5" />}
                            {numero(c.chambreId)}
                            <span className="text-[11px] font-medium opacity-80">{LIBELLE_MENAGE[c.type]}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="mt-4 mb-2 text-[12px] font-semibold tracking-wide text-doux uppercase">
                      Tâches en plus
                    </p>
                    {carte.taches.length === 0 ? (
                      <p className="text-sm text-pale">Aucune tâche</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {carte.taches.map((t) => {
                          const tache = nomTache(t.tacheId);
                          return (
                            <button
                              key={t.tacheId}
                              disabled={!edition}
                              onClick={() => setSelection({ genre: "tache", id: t.tacheId, de: carte.employeeId })}
                              className={cx(
                                "flex min-h-10 items-center gap-2 rounded-lg bg-gray-50 px-3 text-left text-sm text-encre",
                                edition && "ring-1 ring-bord active:scale-[0.99]"
                              )}
                            >
                              {t.fait ? (
                                <Check className="size-4 text-primaire" />
                              ) : (
                                <span className="size-1.5 rounded-full bg-gray-400" />
                              )}
                              <span className={cx("flex-1", t.fait && "text-doux line-through")}>{tache?.nom}</span>
                              {tache?.penible && <Pastille ton="conge">Pénible</Pastille>}
                              <span className="text-xs text-doux tabular-nums">{formatDuree(tache?.dureeMin ?? 0)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Carte>
                );
              })}
            </div>

            {(nonAttribues.chambres.length > 0 || nonAttribues.taches.length > 0) && (
              <>
                <TitreSection>Non attribuées</TitreSection>
                <Carte className="border-dashed p-4">
                  <p className="mb-3 text-sm text-doux">Touchez un élément pour le donner à une fille.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nonAttribues.chambres.map((c) => (
                      <button
                        key={c.chambreId}
                        onClick={() => setSelection({ genre: "chambre", id: c.chambreId, type: c.type, de: null })}
                        className={cx("min-h-9 rounded-lg px-2.5 text-[13px] font-semibold", STYLE_CHIP[c.type])}
                      >
                        {numero(c.chambreId)} · {LIBELLE_MENAGE[c.type]}
                      </button>
                    ))}
                    {nonAttribues.taches.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelection({ genre: "tache", id: t.id, de: null })}
                        className="min-h-9 rounded-lg bg-gray-100 px-2.5 text-[13px] font-semibold text-encre"
                      >
                        {t.nom}
                      </button>
                    ))}
                  </div>
                </Carte>
              </>
            )}

            {/* Actions */}
            <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] mt-5 flex gap-2 pb-3">
              {edition ? (
                <>
                  <Bouton
                    variante="secondaire"
                    taille="grand"
                    className="shadow-flottant"
                    icone={<RefreshCw className="size-4.5" />}
                    onClick={() => genererRepartition(date)}
                  >
                    Recalculer
                  </Bouton>
                  <Bouton taille="grand" className="flex-1 shadow-flottant" icone={<Check className="size-5" />} onClick={() => setEdition(false)}>
                    Terminer
                  </Bouton>
                </>
              ) : (
                <>
                  <Bouton
                    variante="secondaire"
                    taille="grand"
                    className="shadow-flottant"
                    icone={<Pencil className="size-4.5" />}
                    onClick={() => setEdition(true)}
                  >
                    Modifier
                  </Bouton>
                  <Bouton
                    taille="grand"
                    className="flex-1 whitespace-nowrap shadow-flottant"
                    icone={<Send className="size-4.5" />}
                    onClick={() => setConfirmation(true)}
                  >
                    {rep.statut === "envoyee" ? (
                      "Renvoyer"
                    ) : (
                      <>
                        Envoyer<span className="hidden min-[380px]:inline">&nbsp;aux filles</span>
                      </>
                    )}
                  </Bouton>
                </>
              )}
            </div>
            {edition && (
              <p className="-mt-1 pb-4 text-center text-[13px] text-doux">
                Touchez une chambre ou une tâche pour la déplacer.
              </p>
            )}
          </>
        )}
      </Page>

      <EditeurChambresDuJour date={date} ouverte={editeurChambres} onFermer={() => setEditeurChambres(false)} />

      {/* Déplacer un élément */}
      <Feuille
        ouverte={!!selection}
        onFermer={() => setSelection(null)}
        titre={
          selection
            ? selection.genre === "chambre"
              ? `Chambre ${numero(selection.id)} · ${LIBELLE_MENAGE[selection.type]}`
              : nomTache(selection.id)?.nom ?? "Tâche"
            : ""
        }
      >
        {selection && rep && (
          <>
            <p className="mb-3 text-sm text-doux">
              Donner à… <span className="text-pale">({formatDuree(dureeElement(selection))})</span>
            </p>
            <div className="flex flex-col gap-2">
              {rep.cartes.map((c) => {
                const emp = donnees.employees.find((e) => e.id === c.employeeId);
                const p = presentes.find((x) => x.employee.id === c.employeeId);
                if (!emp) return null;
                const actuelle = c.employeeId === selection.de;
                const charge = chargeCarte(donnees, c) + (actuelle ? 0 : dureeElement(selection));
                return (
                  <button
                    key={c.employeeId}
                    disabled={actuelle}
                    onClick={() => deplacer(selection, c.employeeId)}
                    className={cx(
                      "flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left transition-colors",
                      actuelle ? "border-primaire bg-primaire-clair" : "border-bord hover:bg-gray-50 active:bg-gray-100"
                    )}
                  >
                    <Avatar prenom={emp.prenom} couleur={emp.couleur} taille={36} />
                    <span className="flex-1">
                      <span className="block text-[15px] font-semibold text-encre">{emp.prenom}</span>
                      <span className="block text-xs text-doux">
                        {actuelle ? "Actuellement" : "Après"} : {formatDuree(charge)} sur {formatDuree(p?.capacite ?? 0)}
                      </span>
                    </span>
                    {actuelle && <Check className="size-5 text-primaire" />}
                  </button>
                );
              })}
            </div>
            {selection.de && (
              <Bouton
                variante="danger"
                pleineLargeur
                className="mt-4"
                icone={<Trash2 className="size-4.5" />}
                onClick={() => deplacer(selection, null)}
              >
                Retirer de la répartition
              </Bouton>
            )}
          </>
        )}
      </Feuille>

      {/* Confirmation d'envoi */}
      <Feuille
        ouverte={confirmation}
        onFermer={() => setConfirmation(false)}
        titre="Envoyer la répartition ?"
        pied={
          <div className="flex gap-2">
            <Bouton variante="secondaire" className="flex-1" onClick={() => setConfirmation(false)}>
              Annuler
            </Bouton>
            <Bouton
              className="flex-1"
              icone={<Send className="size-4.5" />}
              onClick={() => {
                envoyerRepartition(date);
                setConfirmation(false);
                setEdition(false);
              }}
            >
              Envoyer
            </Bouton>
          </div>
        }
      >
        <p className="text-[15px] text-texte">
          Chaque fille verra ses chambres et ses tâches du {formatJourLong(date).toLowerCase()} dans « Mes tâches ».
        </p>
        {nonAttribues.chambres.length + nonAttribues.taches.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {nonAttribues.chambres.length + nonAttribues.taches.length} élément(s) ne sont attribués à personne.
          </p>
        )}
      </Feuille>
    </>
  );
}
