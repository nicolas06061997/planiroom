"use client";

import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import { useRef, useState } from "react";
import { SelecteurFille, useFilleCourante } from "@/components/SelecteurFille";
import { MenuProfil, Page } from "@/components/shell";
import { Bouton, BoutonIcone, Carte, cx, EnTete, Pastille, TitreSection } from "@/components/ui";
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
import type { JourLu, ReponseLecture } from "@/lib/lectureHoraire";
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

  const lireCapture = async (fichier: File) => {
    setErreur(null);
    setEtape("lecture");
    try {
      const img = await preparerImage(fichier);
      setApercu(img.apercu);
      const res = await fetch("/api/lire-horaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img.base64, mediaType: img.mediaType, aujourdhui: today(), lundi }),
      });
      const data = (await res.json()) as ReponseLecture;
      if (!res.ok || data.erreur) throw new Error(data.erreur ?? "Lecture impossible.");
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
        return s
          ? { date, debut: s.debut, fin: s.fin, conge: s.conge }
          : { date, debut: "08:00", fin: "14:00", conge: false };
      })
    );
    setApercu(null);
    setDemo(false);
    setEtape("verification");
  };

  const modifierJour = (date: string, patch: Partial<JourLu>) =>
    setJours((js) => js.map((j) => (j.date === date ? { ...j, ...patch } : j)));

  const valider = () => {
    if (!employeeId) return;
    enregistrerHoraire(
      employeeId,
      jours.map((j) => ({
        employeeId,
        date: j.date,
        debut: j.conge ? null : j.debut,
        fin: j.conge ? null : j.fin,
        conge: j.conge,
      }))
    );
    setEtape("envoye");
  };

  const totalHeures = jours.reduce((s, j) => s + (j.conge ? 0 : dureeShift(j.debut, j.fin)), 0);

  return (
    <>
      <EnTete
        titre="Envoyer mon horaire"
        sousTitre={estAdmin ? "Pour une fille de l'équipe" : employee?.prenom}
        action={<MenuProfil />}
      />
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
            if (f) lireCapture(f);
            e.target.value = "";
          }}
        />

        {etape === "repos" && (
          <>
            <Carte className="animate-apparition overflow-hidden">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 px-6 py-9 text-center transition-colors hover:bg-gray-50/70 active:bg-gray-100/70"
              >
                <span className="flex size-16 items-center justify-center rounded-2xl bg-primaire text-white shadow-carte">
                  <Camera className="size-7" />
                </span>
                <span className="text-[17px] font-semibold text-encre">Ajouter une capture Shifter</span>
                <span className="max-w-xs text-sm text-doux">
                  Faites une capture d&apos;écran de votre horaire dans Shifter, puis choisissez-la ici.
                  L&apos;appli lit vos jours et vos heures.
                </span>
              </button>
            </Carte>

            {erreur && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{erreur}</p>
            )}

            <Bouton
              variante="fantome"
              pleineLargeur
              className="mt-2"
              icone={<PencilLine className="size-4.5" />}
              onClick={saisieManuelle}
            >
              Saisir à la main
            </Bouton>

            {/* Horaire déjà enregistré */}
            <TitreSection
              action={
                envoi ? (
                  <Pastille ton="succes">
                    <CheckCircle2 className="size-3.5" /> Validé
                  </Pastille>
                ) : (
                  <Pastille ton="conge">À envoyer</Pastille>
                )
              }
            >
              Horaire enregistré
            </TitreSection>
            <div className="mb-2 flex items-center gap-1">
              <BoutonIcone label="Semaine précédente" onClick={() => setLundi(addDays(lundi, -7))}>
                <ChevronLeft className="size-5" />
              </BoutonIcone>
              <p className="flex-1 text-center text-sm font-semibold text-encre">{formatSemaine(lundi)}</p>
              <BoutonIcone label="Semaine suivante" onClick={() => setLundi(addDays(lundi, 7))}>
                <ChevronRight className="size-5" />
              </BoutonIcone>
            </div>
            <Carte className="divide-y divide-bord/70">
              {joursSemaine.map((date) => {
                const s = employeeId ? shiftDe(donnees, employeeId, date) : undefined;
                return (
                  <div key={date} className="flex min-h-13 items-center px-4">
                    <span className="flex-1 text-[15px] text-encre">
                      {JOURS_LONGS[jourSemaine(date)]}{" "}
                      <span className="text-doux">{formatJourCourt(date)}</span>
                    </span>
                    {!s ? (
                      <span className="text-sm text-pale">Non renseigné</span>
                    ) : s.conge ? (
                      <Pastille ton="conge">Congé</Pastille>
                    ) : (
                      <span className="text-[15px] font-medium text-encre tabular-nums">
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
          <Carte className="animate-apparition flex flex-col items-center px-6 py-12 text-center">
            {apercu && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercu} alt="Capture envoyée" className="mb-5 max-h-44 rounded-xl border border-bord object-contain shadow-carte" />
            )}
            <Loader2 className="size-7 animate-spin text-primaire" />
            <p className="mt-3 text-[15px] font-semibold text-encre">Lecture de la capture…</p>
            <p className="mt-1 text-sm text-doux">Quelques secondes.</p>
          </Carte>
        )}

        {etape === "verification" && (
          <div className="animate-apparition">
            {demo && (
              <div className="mb-3 flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[13px] text-sky-900">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  Mode démo : la lecture automatique n&apos;est pas encore activée, voici un horaire d&apos;exemple.
                  Vous pouvez le corriger.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {apercu && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={apercu} alt="Capture" className="size-14 rounded-lg border border-bord object-cover" />
              )}
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-encre">Vérifiez vos jours</p>
                <p className="text-[13px] text-doux">
                  {jours.filter((j) => !j.conge).length} jours de travail · {formatDuree(totalHeures)}
                </p>
              </div>
            </div>

            <Carte className="mt-3 divide-y divide-bord/70">
              {jours.map((j) => (
                <LigneJour key={j.date} jour={j} onChange={(p) => modifierJour(j.date, p)} />
              ))}
            </Carte>

            <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] mt-5 flex gap-2 pb-3">
              <Bouton
                variante="secondaire"
                taille="grand"
                className="shadow-flottant"
                icone={<RotateCcw className="size-4.5" />}
                onClick={recommencer}
              >
                Annuler
              </Bouton>
              <Bouton
                taille="grand"
                className="flex-1 whitespace-nowrap shadow-flottant"
                icone={<CalendarCheck className="size-5" />}
                onClick={valider}
                disabled={jours.some((j) => !j.conge && (!j.debut || !j.fin))}
              >
                Valider<span className="hidden min-[380px]:inline">&nbsp;mon horaire</span>
              </Bouton>
            </div>
          </div>
        )}

        {etape === "envoye" && (
          <Carte className="animate-apparition flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-primaire-clair text-primaire">
              <CheckCircle2 className="size-8" />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-encre">Horaire envoyé</p>
            <p className="mt-1 max-w-xs text-sm text-doux">
              La gouvernante voit maintenant vos jours de travail et vos congés dans le planning.
            </p>
            <Bouton variante="secondaire" className="mt-6" onClick={recommencer}>
              Retour
            </Bouton>
          </Carte>
        )}
      </Page>
    </>
  );
}

function LigneJour({ jour, onChange }: { jour: JourLu; onChange: (p: Partial<JourLu>) => void }) {
  const champ =
    "min-h-11 min-w-0 flex-1 rounded-lg border border-bord bg-white px-3 text-center text-[15px] text-encre tabular-nums outline-none focus:border-primaire focus:ring-3 focus:ring-primaire/15";
  const segment = (actif: boolean, conge: boolean) =>
    cx(
      "min-h-9 rounded-md px-3 text-[13px] font-semibold transition-colors",
      actif ? (conge ? "bg-white text-conge shadow-carte" : "bg-white text-primaire shadow-carte") : "text-doux"
    );
  return (
    <div className={cx("px-4 py-3 transition-colors", jour.conge && "bg-conge-clair/50")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-encre">{JOURS_LONGS[jourSemaine(jour.date)]}</p>
          <p className="text-[13px] text-doux">{formatJourCourt(jour.date)}</p>
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Type de jour">
          <button
            aria-pressed={!jour.conge}
            className={segment(!jour.conge, false)}
            onClick={() => jour.conge && onChange({ conge: false, debut: "08:00", fin: "14:00" })}
          >
            Travail
          </button>
          <button
            aria-pressed={jour.conge}
            className={segment(jour.conge, true)}
            onClick={() => !jour.conge && onChange({ conge: true, debut: null, fin: null })}
          >
            Congé
          </button>
        </div>
      </div>
      {!jour.conge && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="time"
            aria-label="Début"
            value={jour.debut ?? ""}
            onChange={(e) => onChange({ debut: e.target.value })}
            className={champ}
          />
          <span className="text-doux">à</span>
          <input
            type="time"
            aria-label="Fin"
            value={jour.fin ?? ""}
            onChange={(e) => onChange({ fin: e.target.value })}
            className={champ}
          />
        </div>
      )}
    </div>
  );
}
