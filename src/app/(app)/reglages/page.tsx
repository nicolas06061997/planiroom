"use client";

import { ChevronRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EnTete, Page } from "@/components/shell";
import {
  Avatar,
  Bouton,
  BoutonIcone,
  Carte,
  Champ,
  classeInput,
  cx,
  Feuille,
  Interrupteur,
  Pastille,
  TitreSection,
} from "@/components/ui";
import { formatDuree, JOURS_COURTS } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Donnees, JourSemaine, Tache } from "@/lib/types";

const ONGLETS = ["Filles", "Chambres", "Tâches", "Ménages", "Général"] as const;
type Onglet = (typeof ONGLETS)[number];

const COULEURS = ["#C2474F", "#8B5CC4", "#D9772F", "#4F6D8A", "#2E8A8A", "#C85A7C", "#5B8A5E", "#B0803A"];

const nouvelId = (prefixe: string) => `${prefixe}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export default function ReglagesPage() {
  const { session } = useStore();
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("Filles");

  useEffect(() => {
    if (session && session.role !== "gouvernante") router.replace("/mes-taches");
  }, [session, router]);

  return (
    <>
      <EnTete titre="Réglages" sousTitre="Tout est modifiable ici" retour="/planning/" />
      <Page>
        <div className="sans-barre -mx-4 overflow-x-auto px-4 pt-2">
          <div className="inline-flex gap-1 rounded-2xl bg-gray-200/70 p-1">
            {ONGLETS.map((o) => (
              <button
                key={o}
                onClick={() => setOnglet(o)}
                aria-pressed={onglet === o}
                className={cx(
                  "min-h-10 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all",
                  onglet === o ? "bg-white text-encre shadow-carte" : "text-doux hover:text-texte"
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div key={onglet} className="animate-apparition pb-6">
          {onglet === "Filles" && <ReglagesFilles />}
          {onglet === "Chambres" && <ReglagesChambres />}
          {onglet === "Tâches" && <ReglagesTaches />}
          {onglet === "Ménages" && <ReglagesMenages />}
          {onglet === "Général" && <ReglagesGeneral />}
        </div>
      </Page>
    </>
  );
}

/* ---------------- Filles ---------------- */

function ReglagesFilles() {
  const { donnees, modifier } = useStore();
  const maj = (id: string, patch: Partial<Donnees["employees"][number]>) =>
    modifier((d) => ({ ...d, employees: d.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  return (
    <>
      <TitreSection>Femmes de chambre</TitreSection>
      <Carte className="divide-y divide-bord/70">
        {donnees.employees.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            <button
              aria-label="Changer la couleur"
              onClick={() => maj(e.id, { couleur: COULEURS[(COULEURS.indexOf(e.couleur) + 1) % COULEURS.length] })}
            >
              <Avatar prenom={e.prenom || "?"} couleur={e.couleur} />
            </button>
            <input
              value={e.prenom}
              onChange={(ev) => maj(e.id, { prenom: ev.target.value })}
              className={cx(classeInput, "flex-1 border-transparent bg-transparent px-2 hover:border-bord")}
              aria-label="Prénom"
            />
            <Interrupteur actif={e.actif} onChange={(v) => maj(e.id, { actif: v })} label={`${e.prenom} active`} />
          </div>
        ))}
      </Carte>
      <p className="mt-2 px-1 text-xs text-doux">
        Touchez la pastille pour changer la couleur. Désactivez une fille pour la retirer du planning sans perdre son historique.
      </p>
      <Bouton
        variante="secondaire"
        pleineLargeur
        className="mt-4"
        icone={<Plus className="size-4.5" />}
        onClick={() =>
          modifier((d) => ({
            ...d,
            employees: [
              ...d.employees,
              { id: nouvelId("e"), prenom: "Nouvelle", couleur: COULEURS[d.employees.length % COULEURS.length], actif: true },
            ],
          }))
        }
      >
        Ajouter une fille
      </Bouton>
    </>
  );
}

/* ---------------- Chambres ---------------- */

function ReglagesChambres() {
  const { donnees, modifier } = useStore();
  const [numero, setNumero] = useState("");
  const chambres = [...donnees.chambres].sort((a, b) => a.numero.localeCompare(b.numero));

  const ajouter = () => {
    const n = numero.trim();
    if (!n || donnees.chambres.some((c) => c.numero === n)) return;
    modifier((d) => ({
      ...d,
      chambres: [...d.chambres, { id: nouvelId("c"), numero: n, etage: Number(n[0]) || 0, active: true }],
    }));
    setNumero("");
  };

  return (
    <>
      <TitreSection>{chambres.length} chambres</TitreSection>
      <Carte className="divide-y divide-bord/70">
        {chambres.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2">
            <span className="w-12 text-[17px] font-semibold text-encre tabular-nums">{c.numero}</span>
            <label className="flex flex-1 items-center gap-2 text-[13px] text-doux">
              Étage
              <input
                type="number"
                inputMode="numeric"
                value={c.etage}
                onChange={(e) =>
                  modifier((d) => ({
                    ...d,
                    chambres: d.chambres.map((x) => (x.id === c.id ? { ...x, etage: Number(e.target.value) } : x)),
                  }))
                }
                className={cx(classeInput, "w-16 text-center")}
              />
            </label>
            <Interrupteur
              actif={c.active}
              label={`Chambre ${c.numero} active`}
              onChange={(v) =>
                modifier((d) => ({ ...d, chambres: d.chambres.map((x) => (x.id === c.id ? { ...x, active: v } : x)) }))
              }
            />
            <BoutonIcone
              label={`Supprimer la chambre ${c.numero}`}
              className="text-pale hover:text-red-600"
              onClick={() => modifier((d) => ({ ...d, chambres: d.chambres.filter((x) => x.id !== c.id) }))}
            >
              <Trash2 className="size-4.5" />
            </BoutonIcone>
          </div>
        ))}
      </Carte>
      <div className="mt-4 flex gap-2">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          placeholder="N° de chambre (ex. 211)"
          inputMode="numeric"
          className={cx(classeInput, "flex-1")}
        />
        <Bouton icone={<Plus className="size-4.5" />} onClick={ajouter} disabled={!numero.trim()}>
          Ajouter
        </Bouton>
      </div>
    </>
  );
}

/* ---------------- Tâches ---------------- */

function ReglagesTaches() {
  const { donnees, modifier } = useStore();
  const [edition, setEdition] = useState<Tache | null>(null);

  const enregistrer = (t: Tache) => {
    modifier((d) => ({
      ...d,
      taches: d.taches.some((x) => x.id === t.id) ? d.taches.map((x) => (x.id === t.id ? t : x)) : [...d.taches, t],
    }));
    setEdition(null);
  };

  return (
    <>
      <TitreSection>Tâches en plus</TitreSection>
      <Carte className="divide-y divide-bord/70 overflow-hidden">
        {donnees.taches.map((t) => (
          <button
            key={t.id}
            onClick={() => setEdition(t)}
            className={cx("flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50", !t.active && "opacity-50")}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-encre">
                {t.nom}
                {t.penible && <Pastille ton="conge">Pénible</Pastille>}
              </p>
              <p className="text-[13px] text-doux">
                {formatDuree(t.dureeMin)} · {t.jours.length === 7 ? "Tous les jours" : t.jours.map((j) => JOURS_COURTS[j]).join(", ")}
              </p>
            </div>
            <ChevronRight className="size-5 text-pale" />
          </button>
        ))}
      </Carte>
      <p className="mt-2 px-1 text-xs text-doux">
        Les tâches « pénibles » tournent entre les filles pour que ce ne soit pas toujours la même.
      </p>
      <Bouton
        variante="secondaire"
        pleineLargeur
        className="mt-4"
        icone={<Plus className="size-4.5" />}
        onClick={() =>
          setEdition({ id: nouvelId("t"), nom: "", dureeMin: 20, jours: [0, 1, 2, 3, 4, 5, 6], penible: false, active: true })
        }
      >
        Ajouter une tâche
      </Bouton>

      {edition && (
        <EditeurTache
          tache={edition}
          existe={donnees.taches.some((x) => x.id === edition.id)}
          onFermer={() => setEdition(null)}
          onEnregistrer={enregistrer}
          onSupprimer={() => {
            modifier((d) => ({ ...d, taches: d.taches.filter((x) => x.id !== edition.id) }));
            setEdition(null);
          }}
        />
      )}
    </>
  );
}

function EditeurTache({
  tache,
  existe,
  onFermer,
  onEnregistrer,
  onSupprimer,
}: {
  tache: Tache;
  existe: boolean;
  onFermer: () => void;
  onEnregistrer: (t: Tache) => void;
  onSupprimer: () => void;
}) {
  const [t, setT] = useState(tache);
  const basculerJour = (j: JourSemaine) =>
    setT((x) => ({
      ...x,
      jours: x.jours.includes(j) ? x.jours.filter((y) => y !== j) : ([...x.jours, j].sort() as JourSemaine[]),
    }));

  return (
    <Feuille
      ouverte
      onFermer={onFermer}
      titre={existe ? "Modifier la tâche" : "Nouvelle tâche"}
      pied={
        <Bouton pleineLargeur onClick={() => onEnregistrer(t)} disabled={!t.nom.trim() || t.jours.length === 0}>
          Enregistrer
        </Bouton>
      }
    >
      <div className="flex flex-col gap-4">
        <Champ label="Nom">
          <input
            value={t.nom}
            onChange={(e) => setT({ ...t, nom: e.target.value })}
            placeholder="Ex. Wellness"
            className={classeInput}
            autoFocus={!existe}
          />
        </Champ>
        <Champ label="Durée estimée (minutes)">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={t.dureeMin}
            onChange={(e) => setT({ ...t, dureeMin: Math.max(0, Number(e.target.value)) })}
            className={classeInput}
          />
        </Champ>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-texte">Jours</p>
          <div className="grid grid-cols-7 gap-1">
            {JOURS_COURTS.map((nom, i) => {
              const actif = t.jours.includes(i as JourSemaine);
              return (
                <button
                  key={nom}
                  onClick={() => basculerJour(i as JourSemaine)}
                  aria-pressed={actif}
                  className={cx(
                    "min-h-11 rounded-lg text-[13px] font-semibold transition-colors",
                    actif ? "bg-primaire text-white" : "bg-gray-100 text-doux"
                  )}
                >
                  {nom}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-fond px-4 py-1">
          <div>
            <p className="text-[15px] font-medium text-encre">Tâche pénible</p>
            <p className="text-xs text-doux">Tourne entre les filles</p>
          </div>
          <Interrupteur actif={t.penible} onChange={(v) => setT({ ...t, penible: v })} label="Tâche pénible" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-fond px-4 py-1">
          <p className="text-[15px] font-medium text-encre">Active</p>
          <Interrupteur actif={t.active} onChange={(v) => setT({ ...t, active: v })} label="Tâche active" />
        </div>
        {existe && (
          <Bouton variante="danger" icone={<Trash2 className="size-4.5" />} onClick={onSupprimer}>
            Supprimer la tâche
          </Bouton>
        )}
      </div>
    </Feuille>
  );
}

/* ---------------- Ménages & linge ---------------- */

function ReglagesMenages() {
  const { donnees, modifier } = useStore();
  const [nouvelArticle, setNouvelArticle] = useState("");

  return (
    <>
      {donnees.menages.map((m) => (
        <div key={m.type}>
          <TitreSection>{m.libelle}</TitreSection>
          <Carte className="p-4">
            <Champ label="Durée estimée (minutes)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={m.dureeMin}
                onChange={(e) =>
                  modifier((d) => ({
                    ...d,
                    menages: d.menages.map((x) => (x.type === m.type ? { ...x, dureeMin: Math.max(0, Number(e.target.value)) } : x)),
                  }))
                }
                className={classeInput}
              />
            </Champ>
            <p className="mt-4 mb-2 text-[13px] font-medium text-texte">Linge utilisé</p>
            <div className="grid grid-cols-2 gap-2">
              {donnees.articlesLinge.map((a) => (
                <label key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-fond py-1 pr-1 pl-3">
                  <span className="truncate text-[13px] text-texte">{a.nom}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={m.linge[a.id] ?? 0}
                    onChange={(e) =>
                      modifier((d) => ({
                        ...d,
                        menages: d.menages.map((x) =>
                          x.type === m.type ? { ...x, linge: { ...x.linge, [a.id]: Math.max(0, Number(e.target.value)) } } : x
                        ),
                      }))
                    }
                    className="min-h-10 w-14 rounded-lg border border-bord bg-white text-center text-[15px] tabular-nums outline-none focus:border-primaire"
                  />
                </label>
              ))}
            </div>
          </Carte>
        </div>
      ))}

      <TitreSection>Articles de linge</TitreSection>
      <Carte className="divide-y divide-bord/70">
        {donnees.articlesLinge.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-4 py-1.5">
            <input
              value={a.nom}
              onChange={(e) =>
                modifier((d) => ({
                  ...d,
                  articlesLinge: d.articlesLinge.map((x) => (x.id === a.id ? { ...x, nom: e.target.value } : x)),
                }))
              }
              className={cx(classeInput, "flex-1 border-transparent bg-transparent px-2 hover:border-bord")}
              aria-label="Nom de l'article"
            />
            <BoutonIcone
              label={`Supprimer ${a.nom}`}
              className="text-pale hover:text-red-600"
              onClick={() => modifier((d) => ({ ...d, articlesLinge: d.articlesLinge.filter((x) => x.id !== a.id) }))}
            >
              <Trash2 className="size-4.5" />
            </BoutonIcone>
          </div>
        ))}
      </Carte>
      <div className="mt-3 flex gap-2">
        <input
          value={nouvelArticle}
          onChange={(e) => setNouvelArticle(e.target.value)}
          placeholder="Ex. Peignoirs"
          className={cx(classeInput, "flex-1")}
        />
        <Bouton
          icone={<Plus className="size-4.5" />}
          disabled={!nouvelArticle.trim()}
          onClick={() => {
            modifier((d) => ({ ...d, articlesLinge: [...d.articlesLinge, { id: nouvelId("l"), nom: nouvelArticle.trim() }] }));
            setNouvelArticle("");
          }}
        >
          Ajouter
        </Bouton>
      </div>
    </>
  );
}

/* ---------------- Général ---------------- */

function ReglagesGeneral() {
  const { donnees, modifier, reinitialiser } = useStore();
  const [confirmer, setConfirmer] = useState(false);
  return (
    <>
      <TitreSection>Temps de travail</TitreSection>
      <Carte className="p-4">
        <Champ label="Pause déduite (minutes)" aide="Retirée du temps disponible pour les journées de 6 h ou plus.">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={donnees.reglages.pauseMin}
            onChange={(e) =>
              modifier((d) => ({ ...d, reglages: { ...d.reglages, pauseMin: Math.max(0, Number(e.target.value)) } }))
            }
            className={classeInput}
          />
        </Champ>
      </Carte>

      <TitreSection>Données</TitreSection>
      <Carte className="p-4">
        <p className="text-sm text-doux">
          Bêta : les données sont enregistrées sur cet appareil uniquement. Réinitialiser remet les données d&apos;exemple.
        </p>
        <Bouton variante="danger" className="mt-3" icone={<RotateCcw className="size-4.5" />} onClick={() => setConfirmer(true)}>
          Réinitialiser les données
        </Bouton>
      </Carte>

      <Feuille
        ouverte={confirmer}
        onFermer={() => setConfirmer(false)}
        titre="Tout réinitialiser ?"
        pied={
          <div className="flex gap-2">
            <Bouton variante="secondaire" className="flex-1" onClick={() => setConfirmer(false)}>
              Annuler
            </Bouton>
            <Bouton
              variante="danger"
              className="flex-1"
              onClick={() => {
                reinitialiser();
                setConfirmer(false);
              }}
            >
              Réinitialiser
            </Bouton>
          </div>
        }
      >
        <p className="text-[15px] text-texte">
          Les horaires, répartitions et réglages seront remplacés par les données d&apos;exemple.
        </p>
      </Feuille>
    </>
  );
}
