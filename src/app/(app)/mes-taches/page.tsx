"use client";

import { BandeauInstallation } from "@/components/Installation";
import { Check, Hourglass, MessageSquarePlus, PartyPopper, Shirt, StickyNote } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BandeJours } from "@/components/BandeJours";
import { EtiquetteMenage } from "@/components/metier";
import { SelecteurFille, useFilleCourante } from "@/components/SelecteurFille";
import { EnTete, Page } from "@/components/shell";
import {
  Anneau,
  Bouton,
  BoutonIcone,
  Carte,
  CarteAccueil,
  classeInput,
  cx,
  EtatVide,
  Feuille,
  TitreSection,
} from "@/components/ui";
import { formatDuree, formatHeure, formatJourLong, today } from "@/lib/dates";
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

type CibleNote = { genre: "chambre" | "tache"; id: string } | { genre: "journee" };

const salutation = () => (new Date().getHours() < 18 ? "Bonjour" : "Bonsoir");

export default function MesTachesPage() {
  const { donnees, session, modifierCartes } = useStore();
  const estAdmin = session?.role === "gouvernante";
  const [choix, setChoix] = useState<string>();
  const employeeId = useFilleCourante(choix);
  const employee = donnees.employees.find((e) => e.id === employeeId);
  const [date, setDate] = useState(today());
  const [cibleNote, setCibleNote] = useState<CibleNote | null>(null);
  const [texteNote, setTexteNote] = useState("");

  const visibleLe = (d: string) => {
    const r = donnees.repartitions[d];
    return r && (r.statut === "envoyee" || estAdmin) ? r : undefined;
  };
  const rep = visibleLe(date);
  const carte = rep?.cartes.find((c) => c.employeeId === employeeId);
  const shift = employeeId ? shiftDe(donnees, employeeId, date) : undefined;
  const numero = (id: string) => donnees.chambres.find((c) => c.id === id)?.numero ?? "?";
  const tache = (id: string) => donnees.taches.find((t) => t.id === id);

  const majCarte = (fn: (c: CarteFille) => CarteFille) =>
    modifierCartes(date, (cartes) => cartes.map((c) => (c.employeeId === employeeId ? fn(c) : c)));

  const basculerChambre = (id: string) =>
    majCarte((c) => ({ ...c, chambres: c.chambres.map((x) => (x.chambreId === id ? { ...x, fait: !x.fait } : x)) }));
  const basculerTache = (id: string) =>
    majCarte((c) => ({ ...c, taches: c.taches.map((x) => (x.tacheId === id ? { ...x, fait: !x.fait } : x)) }));

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
  const termine = total > 0 && faits === total;

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
      <EnTete />
      <Page>
        {estAdmin && <SelecteurFille valeur={employeeId} onChange={setChoix} />}

        <CarteAccueil
          className="animate-apparition"
          surtitre={date === today() ? "Aujourd'hui" : formatJourLong(date)}
          titre={estAdmin ? employee?.prenom ?? "" : `${salutation()} ${employee?.prenom ?? ""} ! 👋`}
          sousTitre={
            shift && !shift.conge ? (
              <>
                <span className="block font-semibold text-white">
                  {formatHeure(shift.debut)} – {formatHeure(shift.fin)}
                </span>
                {tempsRestant > 0 && <span className="block text-[14px]">Reste environ {formatDuree(tempsRestant)}</span>}
              </>
            ) : shift?.conge
                ? "Jour de congé"
                : "Pas d'horaire pour ce jour"
          }
          droite={
            carte && total > 0 ? (
              <Anneau valeur={faits} max={total} clair taille={80}>
                {termine ? (
                  <Check className="h-8 w-8" strokeWidth={3} />
                ) : (
                  <>
                    <span className="text-xl font-bold leading-none tabular-nums">
                      {faits}
                      <span className="text-sm font-semibold text-white/60">/{total}</span>
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">faits</span>
                  </>
                )}
              </Anneau>
            ) : undefined
          }
        >
          {termine && (
            <p className="rounded-2xl bg-white/15 px-4 py-2.5 text-[15px] font-semibold">Tout est terminé, merci et bravo !</p>
          )}
        </CarteAccueil>

        <BandeauInstallation className="mt-4" />

        <div className="mt-4">
          <BandeJours
            date={date}
            onChange={setDate}
            marque={(d) => (visibleLe(d)?.cartes.some((c) => c.employeeId === employeeId) ? "plein" : null)}
          />
        </div>

        {estAdmin && rep?.statut === "brouillon" && (
          <p className="mt-3 rounded-2xl bg-conge-clair px-4 py-2.5 text-center text-[13px] font-semibold text-conge">
            Aperçu : cette répartition n&apos;a pas encore été envoyée.
          </p>
        )}

        {!carte ? (
          <Carte className="mt-4">
            {shift?.conge ? (
              <EtatVide icone={<PartyPopper className="h-7 w-7" />} titre="Jour de congé" texte="Bon repos !" />
            ) : (
              <EtatVide
                icone={<Hourglass className="h-7 w-7" />}
                titre="Pas encore de tâches"
                texte="La gouvernante n'a pas encore envoyé la répartition pour ce jour."
              />
            )}
          </Carte>
        ) : (
          <>
            <TitreSection action={<span className="text-[13px] font-medium text-doux">{carte.chambres.length} à faire</span>}>
              🧹 Mes chambres
            </TitreSection>
            <Carte className="overflow-hidden">
              {carte.chambres.length === 0 && <p className="p-5 text-[15px] text-pale">Aucune chambre aujourd&apos;hui.</p>}
              {carte.chambres.map((c, i) => (
                <Ligne
                  key={c.chambreId}
                  premiere={i === 0}
                  fait={c.fait}
                  onBasculer={() => basculerChambre(c.chambreId)}
                  onNote={() => ouvrirNote({ genre: "chambre", id: c.chambreId })}
                  note={c.note}
                  titre={
                    <span className="flex items-center gap-2.5">
                      <span className="text-[19px] font-bold tabular-nums tracking-tight">{numero(c.chambreId)}</span>
                      <EtiquetteMenage type={c.type} />
                    </span>
                  }
                  detail={formatDuree(dureeMenage(donnees, c.type))}
                />
              ))}
            </Carte>

            {carte.taches.length > 0 && (
              <>
                <TitreSection>✨ Tâches en plus</TitreSection>
                <Carte className="overflow-hidden">
                  {carte.taches.map((t, i) => (
                    <Ligne
                      key={t.tacheId}
                      premiere={i === 0}
                      fait={t.fait}
                      onBasculer={() => basculerTache(t.tacheId)}
                      onNote={() => ouvrirNote({ genre: "tache", id: t.tacheId })}
                      note={t.note}
                      titre={<span className="text-base font-semibold">{tache(t.tacheId)?.nom}</span>}
                      detail={formatDuree(tache(t.tacheId)?.dureeMin ?? 0)}
                    />
                  ))}
                </Carte>
              </>
            )}

            {linge.size > 0 && (
              <>
                <TitreSection>🧺 Linge à prévoir</TitreSection>
                <Carte className="p-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    {donnees.articlesLinge
                      .filter((a) => linge.get(a.id))
                      .map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-2xl bg-fond px-4 py-3">
                          <span className="text-[14px] text-texte">{a.nom}</span>
                          <span className="text-lg font-bold text-encre tabular-nums">{linge.get(a.id)}</span>
                        </div>
                      ))}
                  </div>
                </Carte>
              </>
            )}

            {carte.note && (
              <Carte className="mt-5 flex gap-3 border-conge/20 bg-conge-clair p-4">
                <StickyNote className="mt-0.5 h-5 w-5 shrink-0 text-conge" />
                <p className="flex-1 text-[15px] text-encre">{carte.note}</p>
              </Carte>
            )}
            <Bouton
              variante="secondaire"
              taille="grand"
              pleineLargeur
              className="mb-2 mt-5"
              icone={<MessageSquarePlus className="h-5 w-5" />}
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
          <Bouton pleineLargeur taille="grand" onClick={enregistrerNote}>
            Enregistrer
          </Bouton>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {NOTES_RAPIDES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTexteNote((t) => (t ? `${t}. ${n}` : n))}
              className="min-h-10 rounded-full bg-fond px-4 text-sm font-medium text-texte transition active:scale-95 active:bg-gray-200"
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
          className={cx(classeInput, "min-h-[7rem] resize-none py-3")}
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
  premiere,
}: {
  fait: boolean;
  onBasculer: () => void;
  onNote: () => void;
  titre: ReactNode;
  detail: string;
  note?: string;
  premiere?: boolean;
}) {
  return (
    <div className={cx("transition-colors", !premiere && "border-t border-black/5", fait && "bg-primaire-clair/40")}>
      <div className="flex items-center pr-2">
        <button
          type="button"
          onClick={onBasculer}
          role="checkbox"
          aria-checked={fait}
          className="flex min-h-[4.5rem] flex-1 items-center gap-4 pl-4 text-left"
        >
          <span
            className={cx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
              fait ? "animate-pop border-primaire bg-primaire text-white" : "border-gray-300 bg-white"
            )}
          >
            <Check className={cx("h-4.5 w-4.5 transition-transform duration-200", fait ? "scale-100" : "scale-0")} strokeWidth={3} />
          </span>
          <span className={cx("min-w-0 flex-1 text-encre transition-opacity", fait && "opacity-45")}>{titre}</span>
          <span className="text-[13px] text-doux tabular-nums">{detail}</span>
        </button>
        <BoutonIcone label="Ajouter une note" onClick={onNote} className={note ? "text-conge" : "text-pale"}>
          <StickyNote className="h-5 w-5" />
        </BoutonIcone>
      </div>
      {note && (
        <p className="-mt-2 pb-3.5 pl-16 pr-5 text-[14px] text-conge">
          <span className="font-semibold">Note : </span>
          {note}
        </p>
      )}
    </div>
  );
}
