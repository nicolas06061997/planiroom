"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  MessageSquarePlus,
  PartyPopper,
  StickyNote,
  Shirt,
} from "lucide-react";
import { useState } from "react";
import { EtiquetteMenage } from "@/components/metier";
import { SelecteurFille, useFilleCourante } from "@/components/SelecteurFille";
import { MenuProfil, Page } from "@/components/shell";
import {
  Bouton,
  BoutonIcone,
  Carte,
  classeInput,
  cx,
  EnTete,
  EtatVide,
  Feuille,
  Pastille,
  Progression,
  TitreSection,
} from "@/components/ui";
import { addDays, formatDuree, formatHeure, formatJourLong, today } from "@/lib/dates";
import { dureeMenage, shiftDe } from "@/lib/repartition";
import { useStore } from "@/lib/store";
import type { CarteFille } from "@/lib/types";

const NOTES_RAPIDES = [
  "Sac de linge laissé",
  "Problème technique",
  "Client encore présent",
  "Ne pas déranger",
  "Objet trouvé",
  "Manque de produit",
];

/** Cible d'une note : une chambre, une tâche ou la journée entière. */
type CibleNote = { genre: "chambre" | "tache"; id: string } | { genre: "journee" };

export default function MesTachesPage() {
  const { donnees, session, modifierCartes } = useStore();
  const estAdmin = session?.role === "gouvernante";
  const [choix, setChoix] = useState<string>();
  const employeeId = useFilleCourante(choix);
  const [date, setDate] = useState(today());
  const [cibleNote, setCibleNote] = useState<CibleNote | null>(null);
  const [texteNote, setTexteNote] = useState("");

  const rep = donnees.repartitions[date];
  const visible = rep && (rep.statut === "envoyee" || estAdmin);
  const carte = visible ? rep.cartes.find((c) => c.employeeId === employeeId) : undefined;
  const shift = employeeId ? shiftDe(donnees, employeeId, date) : undefined;
  const numero = (id: string) => donnees.chambres.find((c) => c.id === id)?.numero ?? "?";
  const tache = (id: string) => donnees.taches.find((t) => t.id === id);

  const majCarte = (fn: (c: CarteFille) => CarteFille) =>
    modifierCartes(date, (cartes) => cartes.map((c) => (c.employeeId === employeeId ? fn(c) : c)));

  const basculerChambre = (id: string) =>
    majCarte((c) => ({
      ...c,
      chambres: c.chambres.map((x) => (x.chambreId === id ? { ...x, fait: !x.fait } : x)),
    }));
  const basculerTache = (id: string) =>
    majCarte((c) => ({
      ...c,
      taches: c.taches.map((x) => (x.tacheId === id ? { ...x, fait: !x.fait } : x)),
    }));

  const ouvrirNote = (cible: CibleNote) => {
    if (!carte) return;
    let actuel = "";
    if (cible.genre === "journee") actuel = carte.note ?? "";
    else if (cible.genre === "chambre") actuel = carte.chambres.find((x) => x.chambreId === cible.id)?.note ?? "";
    else actuel = carte.taches.find((x) => x.tacheId === cible.id)?.note ?? "";
    setTexteNote(actuel);
    setCibleNote(cible);
  };

  const enregistrerNote = () => {
    if (!cibleNote) return;
    const note = texteNote.trim() || undefined;
    majCarte((c) => {
      if (cibleNote.genre === "journee") return { ...c, note };
      if (cibleNote.genre === "chambre")
        return { ...c, chambres: c.chambres.map((x) => (x.chambreId === cibleNote.id ? { ...x, note } : x)) };
      return { ...c, taches: c.taches.map((x) => (x.tacheId === cibleNote.id ? { ...x, note } : x)) };
    });
    setCibleNote(null);
  };

  const total = carte ? carte.chambres.length + carte.taches.length : 0;
  const faits = carte ? carte.chambres.filter((c) => c.fait).length + carte.taches.filter((t) => t.fait).length : 0;
  const tempsRestant = carte
    ? carte.chambres.filter((c) => !c.fait).reduce((s, c) => s + dureeMenage(donnees, c.type), 0) +
      carte.taches.filter((t) => !t.fait).reduce((s, t) => s + (tache(t.tacheId)?.dureeMin ?? 0), 0)
    : 0;

  // Linge à prévoir pour toutes ses chambres.
  const linge = new Map<string, number>();
  carte?.chambres.forEach((c) => {
    const m = donnees.menages.find((x) => x.type === c.type);
    Object.entries(m?.linge ?? {}).forEach(([k, v]) => linge.set(k, (linge.get(k) ?? 0) + v));
  });

  const titreNote =
    cibleNote?.genre === "chambre"
      ? `Note · chambre ${numero(cibleNote.id)}`
      : cibleNote?.genre === "tache"
        ? `Note · ${tache(cibleNote.id)?.nom ?? ""}`
        : "Note pour la gouvernante";

  return (
    <>
      <EnTete titre="Mes tâches" sousTitre={formatJourLong(date)} action={<MenuProfil />} />
      <Page>
        {estAdmin && <SelecteurFille valeur={employeeId} onChange={setChoix} />}

        <div className="flex items-center gap-1">
          <BoutonIcone label="Jour précédent" onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft className="size-5" />
          </BoutonIcone>
          <p className="flex-1 text-center text-[15px] font-semibold text-encre">
            {date === today() ? "Aujourd'hui" : date === addDays(today(), 1) ? "Demain" : formatJourLong(date)}
          </p>
          <BoutonIcone label="Jour suivant" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="size-5" />
          </BoutonIcone>
        </div>

        {estAdmin && rep?.statut === "brouillon" && (
          <p className="mt-2 rounded-xl bg-conge-clair px-3 py-2 text-center text-[13px] font-medium text-conge">
            Aperçu : cette répartition n&apos;a pas encore été envoyée.
          </p>
        )}

        {!carte ? (
          <Carte className="mt-3">
            {shift?.conge ? (
              <EtatVide
                icone={<PartyPopper className="size-6" />}
                titre="Jour de congé"
                texte="Bon repos !"
              />
            ) : (
              <EtatVide
                icone={<Hourglass className="size-6" />}
                titre="Pas encore de tâches"
                texte="La gouvernante n'a pas encore envoyé la répartition pour ce jour."
              />
            )}
          </Carte>
        ) : (
          <>
            {/* Progression */}
            <Carte className="mt-3 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[26px] leading-none font-bold tracking-tight text-encre tabular-nums">
                    {faits}
                    <span className="text-lg font-semibold text-pale">/{total}</span>
                  </p>
                  <p className="mt-1 text-[13px] text-doux">
                    {faits === total && total > 0 ? "Tout est terminé, bravo !" : "tâches terminées"}
                  </p>
                </div>
                <div className="text-right text-[13px] text-doux">
                  {shift && !shift.conge && (
                    <p className="flex items-center justify-end gap-1">
                      <Clock className="size-3.5" />
                      {formatHeure(shift.debut)} – {formatHeure(shift.fin)}
                    </p>
                  )}
                  {tempsRestant > 0 && <p>Reste env. {formatDuree(tempsRestant)}</p>}
                </div>
              </div>
              <div className="mt-3.5">
                <Progression valeur={faits} max={total} hauteur={10} />
              </div>
            </Carte>

            {/* Chambres */}
            <TitreSection>Chambres ({carte.chambres.length})</TitreSection>
            <Carte className="divide-y divide-bord/70 overflow-hidden">
              {carte.chambres.length === 0 && <p className="p-4 text-sm text-pale">Aucune chambre aujourd&apos;hui.</p>}
              {carte.chambres.map((c) => (
                <Ligne
                  key={c.chambreId}
                  fait={c.fait}
                  onBasculer={() => basculerChambre(c.chambreId)}
                  onNote={() => ouvrirNote({ genre: "chambre", id: c.chambreId })}
                  note={c.note}
                  titre={
                    <span className="flex items-center gap-2">
                      <span className="text-[17px] font-semibold tabular-nums">{numero(c.chambreId)}</span>
                      <EtiquetteMenage type={c.type} />
                    </span>
                  }
                  detail={formatDuree(dureeMenage(donnees, c.type))}
                />
              ))}
            </Carte>

            {/* Tâches en plus */}
            {carte.taches.length > 0 && (
              <>
                <TitreSection>Tâches en plus</TitreSection>
                <Carte className="divide-y divide-bord/70 overflow-hidden">
                  {carte.taches.map((t) => (
                    <Ligne
                      key={t.tacheId}
                      fait={t.fait}
                      onBasculer={() => basculerTache(t.tacheId)}
                      onNote={() => ouvrirNote({ genre: "tache", id: t.tacheId })}
                      note={t.note}
                      titre={<span className="text-[15px] font-semibold">{tache(t.tacheId)?.nom}</span>}
                      detail={formatDuree(tache(t.tacheId)?.dureeMin ?? 0)}
                    />
                  ))}
                </Carte>
              </>
            )}

            {/* Linge */}
            {linge.size > 0 && (
              <>
                <TitreSection>Linge à prévoir</TitreSection>
                <Carte className="p-4">
                  <div className="mb-3 flex items-center gap-2 text-[13px] text-doux">
                    <Shirt className="size-4" /> Estimation pour vos chambres
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {donnees.articlesLinge
                      .filter((a) => linge.get(a.id))
                      .map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-xl bg-fond px-3 py-2.5">
                          <span className="text-[13px] text-texte">{a.nom}</span>
                          <span className="text-[15px] font-semibold text-encre tabular-nums">{linge.get(a.id)}</span>
                        </div>
                      ))}
                  </div>
                </Carte>
              </>
            )}

            {/* Note du jour */}
            {carte.note && (
              <Carte className="mt-4 flex gap-3 p-4">
                <StickyNote className="mt-0.5 size-4.5 shrink-0 text-conge" />
                <p className="flex-1 text-sm text-texte">{carte.note}</p>
              </Carte>
            )}
            <Bouton
              variante="secondaire"
              taille="grand"
              pleineLargeur
              className="mt-4 mb-4"
              icone={<MessageSquarePlus className="size-5" />}
              onClick={() => ouvrirNote({ genre: "journee" })}
            >
              {carte.note ? "Modifier ma note" : "Ajouter une note"}
            </Bouton>
          </>
        )}
      </Page>

      <Feuille
        ouverte={!!cibleNote}
        onFermer={() => setCibleNote(null)}
        titre={titreNote}
        pied={
          <Bouton pleineLargeur onClick={enregistrerNote}>
            Enregistrer
          </Bouton>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {NOTES_RAPIDES.map((n) => (
            <button
              key={n}
              onClick={() => setTexteNote((t) => (t ? `${t}. ${n}` : n))}
              className="min-h-9 rounded-full border border-bord bg-white px-3 text-[13px] font-medium text-texte hover:bg-gray-50 active:bg-gray-100"
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          value={texteNote}
          onChange={(e) => setTexteNote(e.target.value)}
          rows={4}
          placeholder="Écrire une note…"
          className={cx(classeInput, "min-h-28 resize-none py-3")}
          autoFocus
        />
      </Feuille>
    </>
  );
}

function Ligne({
  fait,
  onBasculer,
  onNote,
  titre,
  detail,
  note,
}: {
  fait: boolean;
  onBasculer: () => void;
  onNote: () => void;
  titre: React.ReactNode;
  detail: string;
  note?: string;
}) {
  return (
    <div className={cx("transition-colors", fait && "bg-gray-50/60")}>
      <div className="flex items-center gap-1 pr-1.5">
        <button
          onClick={onBasculer}
          role="checkbox"
          aria-checked={fait}
          className="flex min-h-16 flex-1 items-center gap-3.5 pl-4 text-left"
        >
          <span
            className={cx(
              "flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200",
              fait ? "scale-100 border-primaire bg-primaire text-white" : "border-gray-300 bg-white"
            )}
          >
            <Check className={cx("size-4.5 transition-transform duration-200", fait ? "scale-100" : "scale-0")} strokeWidth={3} />
          </span>
          <span className={cx("flex-1 text-encre transition-opacity", fait && "opacity-50")}>{titre}</span>
          <span className="text-xs text-doux tabular-nums">{detail}</span>
        </button>
        <BoutonIcone label="Ajouter une note" onClick={onNote} className={note ? "text-conge" : "text-pale"}>
          <StickyNote className="size-4.5" />
        </BoutonIcone>
      </div>
      {note && (
        <p className="-mt-2 pr-4 pb-3 pl-[3.6rem] text-[13px] text-conge">
          <Pastille ton="conge" className="mr-1.5">Note</Pastille>
          {note}
        </p>
      )}
    </div>
  );
}
