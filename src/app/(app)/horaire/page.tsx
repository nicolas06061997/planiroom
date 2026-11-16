"use client";

import { CalendarCheck, Camera, CheckCircle2, ChevronLeft, ChevronRight, Info, PencilLine, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { SelecteurFille, useFilleCourante } from "@/components/SelecteurFille";
import { BarreActions, EnTete, Page } from "@/components/shell";
import { Bouton, BoutonIcone, Carte, CarteAccueil, cx, Pastille, TitreSection } from "@/components/ui";
import {
  addDays,
  dureeShift,
  formatDuree,
  formatHeure,
  formatJourCourt,
  formatSemaine,
  JOURS_LONGS,
  jourSemaine,
  mondayOf,
  today,
  weekDays,
} from "@/lib/dates";
import { preparerImage } from "@/lib/image";
import { lireCapture } from "@/lib/lecture";
import type { JourLu } from "@/lib/lectureHoraire";
import { shiftDe } from "@/lib/repartition";
import { useStore } from "@/lib/store";

type Etape = "repos" | "lecture" | "verification" | "envoye";

export default function HorairePage() {
  const { donnees, session, enregistrerHoraire } = useStore();
  const estAdmin = session?.role === "gouvernante";
  const [choix, setChoix] = useState<string>();
  const employeeId = useFilleCourante(choix);
  const employee = donnees.employees.find((e) => e.id === employeeId);

  const [lundi, setLundi] = useState(() => mondayOf(today()));
  const [etape, setEtape] = useState<Etape>("repos");
  const [jours, setJours] = useState<JourLu[]>([]);
  const [apercu, setApercu] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const envoi = donnees.envois.find((e) => e.employeeId === employeeId && e.lundi === lundi);
  const joursSemaine = weekDays(lundi);

  const recommencer = () => {
    setEtape("repos");
    setJours([]);
    setApercu(null);
    setErreur(null);
    setDemo(false);
  };

  const lire = async (fichier: File) => {
    setErreur(null);
    setEtape("lecture");
    try {
      const img = await preparerImage(fichier);
      setApercu(img.apercu);
      const data = await lireCapture({ image: img.base64, mediaType: img.mediaType, aujourdhui: today(), lundi });
      if (data.erreur) throw new Error(data.erreur);
      if (data.jours.length === 0) throw new Error("Aucun jour trouvé sur cette capture.");
      setJours(data.jours);
      setDemo(!!data.demo);
      if (data.jours[0]) setLundi(mondayOf(data.jours[0].date));
      setEtape("verification");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Lecture impossible.");
      setEtape("repos");
    }
  };

  const saisieManuelle = () => {
    setJours(
      joursSemaine.map((date) => {
        const s = employeeId ? shiftDe(donnees, employeeId, date) : undefined;
        return s ? { date, debut: s.debut, fin: s.fin, conge: s.conge } : { date, debut: "08:00", fin: "14:00", conge: false };
      })
    );
    setApercu(null);
    setDemo(false);
    setEtape("verification");
  };

  const modifierJour = (date: string, patch: Partial<JourLu>) => setJours((js) => js.map((j) => (j.date === date ? { ...j, ...patch } : j)));

  const valider = () => {
    if (!employeeId) return;
    enregistrerHoraire(
      employeeId,
      jours.map((j) => ({ employeeId, date: j.date, debut: j.conge ? null : j.debut, fin: j.conge ? null : j.fin, conge: j.conge }))
    );
    setEtape("envoye");
  };

  const totalHeures = jours.reduce((s, j) => s + (j.conge ? 0 : dureeShift(j.debut, j.fin)), 0);

  return (
    <>
      <EnTete />
      <Page>
        {estAdmin && (
          <SelecteurFille
            valeur={employeeId}
            onChange={(id) => {
              setChoix(id);
              recommencer();
            }}
          />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) lire(f);
            e.target.value = "";
          }}
        />

        {etape === "repos" && (
          <>
            <CarteAccueil
              className="animate-apparition"
              surtitre={estAdmin ? `Horaire de ${employee?.prenom ?? ""}` : "Mon horaire"}
              titre="Envoyer mon horaire"
              sousTitre="Une capture d'écran de Shifter suffit : l'appli lit les jours et les heures."
            >
              <Bouton variante="blanc" taille="grand" pleineLargeur icone={<Camera className="h-5.5 w-5.5" />} onClick={() => inputRef.current?.click()}>
                Ajouter une capture
              </Bouton>
            </CarteAccueil>

            {erreur && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-800">{erreur}</p>}

            <Bouton variante="fantome" pleineLargeur className="mt-2" icone={<PencilLine className="h-4.5 w-4.5" />} onClick={saisieManuelle}>
              Saisir à la main
            </Bouton>

            <TitreSection
              action={
                envoi ? (
                  <Pastille ton="succes">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Validé
                  </Pastille>
                ) : (
                  <Pastille ton="conge">À envoyer</Pastille>
                )
              }
            >
              Horaire enregistré
            </TitreSection>
            <Carte className="overflow-hidden">
              <div className="flex items-center gap-1 border-b border-black/5 px-2 py-1">
                <BoutonIcone label="Semaine précédente" onClick={() => setLundi(addDays(lundi, -7))}>
                  <ChevronLeft className="h-5 w-5" />
                </BoutonIcone>
                <p className="flex-1 text-center text-[15px] font-semibold text-encre">{formatSemaine(lundi)}</p>
                <BoutonIcone label="Semaine suivante" onClick={() => setLundi(addDays(lundi, 7))}>
                  <ChevronRight className="h-5 w-5" />
                </BoutonIcone>
              </div>
              {joursSemaine.map((date, i) => {
                const s = employeeId ? shiftDe(donnees, employeeId, date) : undefined;
                return (
                  <div key={date} className={cx("flex min-h-[3.5rem] items-center px-5", i > 0 && "border-t border-black/5", date === today() && "bg-primaire-clair/40")}>
                    <span className="flex-1 text-[15px] font-medium text-encre">
                      {JOURS_LONGS[jourSemaine(date)]} <span className="font-normal text-doux">{formatJourCourt(date)}</span>
                    </span>
                    {!s ? (
                      <span className="text-sm text-pale">Non renseigné</span>
                    ) : s.conge ? (
                      <Pastille ton="conge">Congé</Pastille>
                    ) : (
                      <span className="text-[15px] font-semibold text-encre tabular-nums">
                        {formatHeure(s.debut)} – {formatHeure(s.fin)}
                      </span>
                    )}
                  </div>
                );
              })}
            </Carte>
          </>
        )}

        {etape === "lecture" && (
          <Carte className="flex animate-apparition flex-col items-center px-6 py-14 text-center">
            {apercu && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercu} alt="Capture envoyée" className="mb-6 max-h-48 rounded-2xl border border-bord object-contain shadow-carte" />
            )}
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-primaire/20 border-t-primaire" />
            <p className="mt-4 text-[17px] font-bold text-encre">Lecture de la capture…</p>
            <p className="mt-1 text-[15px] text-doux">Quelques secondes.</p>
          </Carte>
        )}

        {etape === "verification" && (
          <div className="animate-apparition">
            {demo && (
              <div className="mb-4 flex gap-3 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-[14px] text-sky-900">
                <Info className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Mode démo : la lecture automatique n&apos;est pas encore activée, voici un horaire d&apos;exemple. Vous pouvez le corriger.</p>
              </div>
            )}

            <div className="flex items-center gap-3.5 px-1">
              {apercu && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={apercu} alt="Capture" className="h-14 w-14 rounded-2xl border border-bord object-cover" />
              )}
              <div className="flex-1">
                <p className="text-[22px] font-bold tracking-tight text-encre">Vérifiez vos jours</p>
                <p className="text-[14px] text-doux">
                  {jours.filter((j) => !j.conge).length} jours de travail · {formatDuree(totalHeures)}
                </p>
              </div>
            </div>

            <Carte className="mt-4 overflow-hidden">
              {jours.map((j, i) => (
                <LigneJour key={j.date} premiere={i === 0} jour={j} onChange={(p) => modifierJour(j.date, p)} />
              ))}
            </Carte>

            <BarreActions>
              <Bouton variante="secondaire" taille="grand" icone={<RotateCcw className="h-4.5 w-4.5" />} onClick={recommencer}>
                Annuler
              </Bouton>
              <Bouton
                taille="grand"
                className="flex-1 whitespace-nowrap"
                icone={<CalendarCheck className="h-5 w-5" />}
                onClick={valider}
                disabled={jours.some((j) => !j.conge && (!j.debut || !j.fin))}
              >
                <span>
                  Valider<span className="hidden xs:inline"> mon horaire</span>
                </span>
              </Bouton>
            </BarreActions>
          </div>
        )}

        {etape === "envoye" && (
          <Carte className="flex animate-apparition flex-col items-center px-6 py-14 text-center">
            <span className="flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-primaire text-white shadow-bouton">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <p className="mt-5 text-[22px] font-bold tracking-tight text-encre">Horaire envoyé</p>
            <p className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-doux">
              La gouvernante voit maintenant vos jours de travail et vos congés dans le planning.
            </p>
            <Bouton variante="secondaire" className="mt-7" onClick={recommencer}>
              Retour
            </Bouton>
          </Carte>
        )}
      </Page>
    </>
  );
}

function LigneJour({ jour, onChange, premiere }: { jour: JourLu; onChange: (p: Partial<JourLu>) => void; premiere?: boolean }) {
  const champ =
    "min-h-12 min-w-0 flex-1 rounded-2xl border border-bord bg-white px-3 text-center text-base font-semibold text-encre tabular-nums outline-none focus:border-primaire focus:ring-3 focus:ring-primaire/15";
  const segment = (actif: boolean, conge: boolean) =>
    cx(
      "min-h-9 rounded-xl px-3.5 text-[13px] font-semibold transition",
      actif ? (conge ? "bg-white text-conge shadow-carte" : "bg-white text-primaire shadow-carte") : "text-doux"
    );
  return (
    <div className={cx("px-5 py-4 transition-colors", !premiere && "border-t border-black/5", jour.conge && "bg-conge-clair/60")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-encre">{JOURS_LONGS[jourSemaine(jour.date)]}</p>
          <p className="text-[13px] text-doux">{formatJourCourt(jour.date)}</p>
        </div>
        <div className="inline-flex rounded-2xl bg-gray-100 p-1" role="group" aria-label="Type de jour">
          <button
            type="button"
            aria-pressed={!jour.conge}
            className={segment(!jour.conge, false)}
            onClick={() => jour.conge && onChange({ conge: false, debut: "08:00", fin: "14:00" })}
          >
            Travail
          </button>
          <button
            type="button"
            aria-pressed={jour.conge}
            className={segment(jour.conge, true)}
            onClick={() => !jour.conge && onChange({ conge: true, debut: null, fin: null })}
          >
            Congé
          </button>
        </div>
      </div>
      {!jour.conge && (
        <div className="mt-3 flex items-center gap-2.5">
          <input type="time" aria-label="Début" value={jour.debut ?? ""} onChange={(e) => onChange({ debut: e.target.value })} className={champ} />
          <span className="text-sm text-doux">à</span>
          <input type="time" aria-label="Fin" value={jour.fin ?? ""} onChange={(e) => onChange({ fin: e.target.value })} className={champ} />
        </div>
      )}
    </div>
  );
}
