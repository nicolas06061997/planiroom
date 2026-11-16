"use client";

import { AlertTriangle, Check, Clock, Pencil, RefreshCw, Send, Shuffle, Sparkles, Trash2, UserRoundX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BandeJours } from "@/components/BandeJours";
import { EditeurChambresDuJour } from "@/components/EditeurChambresDuJour";
import { BarreCharge, LIBELLE_MENAGE, ORDRE_MENAGES } from "@/components/metier";
import { BarreActions, EnTete, Page } from "@/components/shell";
import {
  Avatar,
  Bouton,
  Carte,
  CarteAccueil,
  cx,
  EtatVide,
  Feuille,
  Pastille,
  StatAccueil,
  TitreSection,
} from "@/components/ui";
import { formatDuree, formatHeure, formatJourLong, formatJourMoyen, mondayOf } from "@/lib/dates";
import { chargeCarte, dureeMenage, fillesPresentes, tachesDuJour } from "@/lib/repartition";
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

export function Repartition({ date }: { date: string }) {
  const router = useRouter();
  const { donnees, session, genererRepartition, modifierCartes, envoyerRepartition } = useStore();
  const [edition, setEdition] = useState(false);
  const [editeurChambres, setEditeurChambres] = useState(false);
  const [selection, setSelection] = useState<Element | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    if (session && session.role !== "gouvernante") router.replace("/mes-taches/");
  }, [session, router]);

  const rep = donnees.repartitions[date];
  const presentes = fillesPresentes(donnees, date);
  const chambresJour = donnees.chambresDuJour[date] ?? [];
  const taches = tachesDuJour(donnees, date);
  const numero = (id: string) => donnees.chambres.find((c) => c.id === id)?.numero ?? "?";
  const nomTache = (id: string) => donnees.taches.find((t) => t.id === id);

  const compte = Object.fromEntries(ORDRE_MENAGES.map((t) => [t, chambresJour.filter((c) => c.type === t).length])) as Record<
    TypeMenage,
    number
  >;
  const totalMinutes =
    chambresJour.reduce((s, c) => s + dureeMenage(donnees, c.type), 0) + taches.reduce((s, t) => s + t.dureeMin, 0);

  const nonAttribues = useMemo(() => {
    if (!rep) return { chambres: [], taches: [] };
    const ch = new Set(rep.cartes.flatMap((c) => c.chambres.map((x) => x.chambreId)));
    const ta = new Set(rep.cartes.flatMap((c) => c.taches.map((x) => x.tacheId)));
    return { chambres: chambresJour.filter((c) => !ch.has(c.chambreId)), taches: taches.filter((t) => !ta.has(t.id)) };
  }, [rep, chambresJour, taches]);

  const horaireChange =
    !!rep &&
    (presentes.length !== rep.cartes.length || presentes.some((p) => !rep.cartes.some((c) => c.employeeId === p.employee.id)));

  const deplacer = (el: Element, vers: string | null) => {
    modifierCartes(date, (cartes) =>
      cartes.map((c) => {
        let carte: CarteFille = c;
        if (el.genre === "chambre") {
          if (c.employeeId === el.de) carte = { ...carte, chambres: carte.chambres.filter((x) => x.chambreId !== el.id) };
          if (c.employeeId === vers)
            carte = {
              ...carte,
              chambres: [...carte.chambres, { chambreId: el.id, type: el.type, fait: false }].sort((a, b) =>
                numero(a.chambreId).localeCompare(numero(b.chambreId))
              ),
            };
        } else {
          if (c.employeeId === el.de) carte = { ...carte, taches: carte.taches.filter((x) => x.tacheId !== el.id) };
          if (c.employeeId === vers) carte = { ...carte, taches: [...carte.taches, { tacheId: el.id, fait: false }] };
        }
        return carte;
      })
    );
    setSelection(null);
  };

  const dureeElement = (el: Element) => (el.genre === "chambre" ? dureeMenage(donnees, el.type) : nomTache(el.id)?.dureeMin ?? 0);

  const changerJour = (d: string) => {
    setEdition(false);
    router.replace(`/repartition/?date=${d}`, { scroll: false });
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
      <EnTete titre="Répartition du jour" sousTitre={formatJourLong(date)} retour={`/planning/?semaine=${mondayOf(date)}`} />
      <Page>
        <BandeJours
          date={date}
          onChange={changerJour}
          marque={(d) => {
            const r = donnees.repartitions[d];
            return r ? (r.statut === "envoyee" ? "plein" : "vide") : null;
          }}
        />

        <CarteAccueil
          className="mt-4 animate-apparition"
          surtitre={rep ? (rep.statut === "envoyee" ? "Envoyée aux filles" : "Brouillon") : "Pas encore répartie"}
          titre={formatJourMoyen(date)}
          sousTitre={`${formatDuree(totalMinutes)} de travail estimé`}
          droite={
            <button
              type="button"
              aria-label="Modifier les chambres à faire"
              onClick={() => setEditeurChambres(true)}
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition active:scale-95"
            >
              <Pencil className="h-4.5 w-4.5" />
            </button>
          }
        >
          <div className="flex gap-2.5">
            <StatAccueil valeur={chambresJour.length} libelle="Chambres" />
            <StatAccueil valeur={taches.length} libelle="Tâches" />
            <StatAccueil valeur={presentes.length} libelle="Filles" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ORDRE_MENAGES.map((t) => (
              <Pastille key={t} ton="blanc">
                {compte[t]} {LIBELLE_MENAGE[t]}
              </Pastille>
            ))}
            <button type="button" onClick={() => setEditeurChambres(true)} className="ml-auto text-[13px] font-semibold text-white underline">
              Chambres à faire
            </button>
          </div>
        </CarteAccueil>

        {horaireChange && (
          <div className="mt-4 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-[15px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1">
              Les horaires ont changé depuis cette répartition.{" "}
              <button type="button" className="font-semibold underline" onClick={() => genererRepartition(date)}>
                Relancer
              </button>
            </p>
          </div>
        )}

        {presentes.length === 0 ? (
          <Carte className="mt-4">
            <EtatVide
              icone={<UserRoundX className="h-7 w-7" />}
              titre="Personne ne travaille ce jour-là"
              texte="Aucun horaire n'a été reçu pour cette date, ou toutes les filles sont en congé."
            />
          </Carte>
        ) : !rep ? (
          <Carte className="mt-4">
            <EtatVide
              icone={<Sparkles className="h-7 w-7" />}
              titre="Prête à répartir"
              texte="L'appli partage les chambres et les tâches selon le temps de travail de chacune, et fait tourner les tâches pénibles."
              action={
                <Bouton taille="grand" icone={<Shuffle className="h-5 w-5" />} onClick={() => genererRepartition(date)}>
                  Répartir automatiquement
                </Bouton>
              }
            />
          </Carte>
        ) : (
          <>
            <TitreSection
              action={
                <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold", ecart > 20 ? "bg-conge-clair text-conge" : "bg-primaire-clair text-primaire")}>
                  Écart {ecart} %
                </span>
              }
            >
              {rep.cartes.length} filles
            </TitreSection>

            <div className="flex flex-col gap-3.5">
              {rep.cartes.map((carte, i) => {
                const p = presentes.find((x) => x.employee.id === carte.employeeId);
                const emp = donnees.employees.find((e) => e.id === carte.employeeId);
                if (!emp) return null;
                const charge = chargeCarte(donnees, carte);
                const faits = carte.chambres.filter((c) => c.fait).length + carte.taches.filter((t) => t.fait).length;
                const total = carte.chambres.length + carte.taches.length;
                return (
                  <Carte key={carte.employeeId} className="animate-apparition p-5" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-3">
                      <Avatar prenom={emp.prenom} couleur={emp.couleur} taille={46} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-bold text-encre">{emp.prenom}</p>
                        <p className="flex items-center gap-1 text-[13px] text-doux">
                          <Clock className="h-3.5 w-3.5" />
                          {p ? `${formatHeure(p.shift.debut)} – ${formatHeure(p.shift.fin)}` : "Plus au planning"}
                        </p>
                      </div>
                      {rep.statut === "envoyee" && total > 0 && (
                        <Pastille ton={faits === total ? "succes" : "neutre"}>
                          {faits === total && <Check className="h-3.5 w-3.5" />}
                          {faits}/{total}
                        </Pastille>
                      )}
                    </div>

                    <div className="mt-4">
                      <BarreCharge charge={charge} capacite={p?.capacite ?? 0} />
                    </div>

                    <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wider text-doux">Chambres · {carte.chambres.length}</p>
                    {carte.chambres.length === 0 ? (
                      <p className="text-sm text-pale">Aucune chambre</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {carte.chambres.map((c) => (
                          <button
                            key={c.chambreId}
                            type="button"
                            disabled={!edition}
                            onClick={() => setSelection({ genre: "chambre", id: c.chambreId, type: c.type, de: carte.employeeId })}
                            className={cx(
                              "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-bold tabular-nums transition",
                              STYLE_CHIP[c.type],
                              edition && "ring-2 ring-black/10 active:scale-95",
                              c.fait && "opacity-50"
                            )}
                            title={LIBELLE_MENAGE[c.type]}
                          >
                            {c.fait && <Check className="h-3.5 w-3.5" />}
                            {numero(c.chambreId)}
                            <span className="text-[11px] font-semibold opacity-80">{LIBELLE_MENAGE[c.type]}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wider text-doux">Tâches en plus</p>
                    {carte.taches.length === 0 ? (
                      <p className="text-sm text-pale">Aucune tâche</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {carte.taches.map((t) => {
                          const tache = nomTache(t.tacheId);
                          return (
                            <button
                              key={t.tacheId}
                              type="button"
                              disabled={!edition}
                              onClick={() => setSelection({ genre: "tache", id: t.tacheId, de: carte.employeeId })}
                              className={cx(
                                "flex min-h-11 items-center gap-2.5 rounded-2xl bg-fond px-3.5 text-left text-[15px] text-encre transition",
                                edition && "ring-2 ring-black/10 active:scale-[0.99]"
                              )}
                            >
                              {t.fait ? <Check className="h-4 w-4 text-primaire" /> : <span className="h-2 w-2 rounded-full bg-gray-300" />}
                              <span className={cx("flex-1 font-medium", t.fait && "text-doux line-through")}>{tache?.nom}</span>
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
                <Carte className="border-2 border-dashed border-gray-200 p-5 shadow-none">
                  <p className="mb-3 text-sm text-doux">Touchez un élément pour le donner à une fille.</p>
                  <div className="flex flex-wrap gap-2">
                    {nonAttribues.chambres.map((c) => (
                      <button
                        key={c.chambreId}
                        type="button"
                        onClick={() => setSelection({ genre: "chambre", id: c.chambreId, type: c.type, de: null })}
                        className={cx("min-h-10 rounded-xl px-3 text-[14px] font-bold", STYLE_CHIP[c.type])}
                      >
                        {numero(c.chambreId)} · {LIBELLE_MENAGE[c.type]}
                      </button>
                    ))}
                    {nonAttribues.taches.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelection({ genre: "tache", id: t.id, de: null })}
                        className="min-h-10 rounded-xl bg-gray-100 px-3 text-[14px] font-semibold text-encre"
                      >
                        {t.nom}
                      </button>
                    ))}
                  </div>
                </Carte>
              </>
            )}

            {edition && <p className="mt-4 text-center text-[14px] text-doux">Touchez une chambre ou une tâche pour la déplacer.</p>}

            <BarreActions>
              {edition ? (
                <>
                  <Bouton variante="secondaire" taille="grand" icone={<RefreshCw className="h-4.5 w-4.5" />} onClick={() => genererRepartition(date)}>
                    Recalculer
                  </Bouton>
                  <Bouton taille="grand" className="flex-1" icone={<Check className="h-5 w-5" />} onClick={() => setEdition(false)}>
                    Terminer
                  </Bouton>
                </>
              ) : (
                <>
                  <Bouton variante="secondaire" taille="grand" icone={<Pencil className="h-4.5 w-4.5" />} onClick={() => setEdition(true)}>
                    Modifier
                  </Bouton>
                  <Bouton taille="grand" className="min-w-0 flex-1 whitespace-nowrap" icone={<Send className="h-4.5 w-4.5" />} onClick={() => setConfirmation(true)}>
                    {rep.statut === "envoyee" ? (
                      "Renvoyer"
                    ) : (
                      <span>
                        Envoyer<span className="hidden xs:inline"> aux filles</span>
                      </span>
                    )}
                  </Bouton>
                </>
              )}
            </BarreActions>
          </>
        )}
      </Page>

      <EditeurChambresDuJour date={date} ouverte={editeurChambres} onFermer={() => setEditeurChambres(false)} />

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
            <p className="mb-3 text-[15px] text-doux">
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
                    type="button"
                    disabled={actuelle}
                    onClick={() => deplacer(selection, c.employeeId)}
                    className={cx(
                      "flex min-h-16 items-center gap-3.5 rounded-2xl border px-4 text-left transition",
                      actuelle ? "border-primaire bg-primaire-clair" : "border-bord active:scale-[0.99] active:bg-gray-50"
                    )}
                  >
                    <Avatar prenom={emp.prenom} couleur={emp.couleur} taille={40} />
                    <span className="flex-1">
                      <span className="block text-base font-semibold text-encre">{emp.prenom}</span>
                      <span className="block text-[13px] text-doux">
                        {actuelle ? "Actuellement" : "Après"} : {formatDuree(charge)} sur {formatDuree(p?.capacite ?? 0)}
                      </span>
                    </span>
                    {actuelle && <Check className="h-5 w-5 text-primaire" />}
                  </button>
                );
              })}
            </div>
            {selection.de && (
              <Bouton variante="danger" pleineLargeur className="mt-4" icone={<Trash2 className="h-4.5 w-4.5" />} onClick={() => deplacer(selection, null)}>
                Retirer de la répartition
              </Bouton>
            )}
          </>
        )}
      </Feuille>

      <Feuille
        ouverte={confirmation}
        onFermer={() => setConfirmation(false)}
        titre="Envoyer la répartition ?"
        pied={
          <div className="flex gap-2.5">
            <Bouton variante="secondaire" className="flex-1" onClick={() => setConfirmation(false)}>
              Annuler
            </Bouton>
            <Bouton
              className="flex-1"
              icone={<Send className="h-4.5 w-4.5" />}
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
        <p className="text-base leading-relaxed text-texte">
          Chaque fille verra ses chambres et ses tâches du {formatJourLong(date).toLowerCase()} dans « Mes tâches ».
        </p>
        {nonAttribues.chambres.length + nonAttribues.taches.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {nonAttribues.chambres.length + nonAttribues.taches.length} élément(s) ne sont attribués à personne.
          </p>
        )}
      </Feuille>
    </>
  );
}
