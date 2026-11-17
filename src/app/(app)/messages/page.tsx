"use client";

import { Check, ChevronRight, Lock, MessageCirclePlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CarteNotifications } from "@/components/CarteNotifications";
import { EnTete, Page } from "@/components/shell";
import { Avatar, Bouton, Carte, CarteAccueil, Champ, classeInput, cx, EtatVide, Feuille, TitreSection } from "@/components/ui";
import {
  couleurParticipant,
  dernierMessage,
  heureCourte,
  nomParticipant,
  participants,
  peutVoir,
  titreConversation,
  useLus,
} from "@/lib/messages";
import { moiDe, useStore } from "@/lib/store";
import type { Conversation, Participant } from "@/lib/types";

export default function MessagesPage() {
  const { donnees, session, creerConversation } = useStore();
  const router = useRouter();
  const moi = moiDe(session);
  const { nonLus } = useLus(moi);
  const [nouvelle, setNouvelle] = useState(false);

  if (!moi) return null;

  const conversations = donnees.conversations
    .filter((c) => peutVoir(c, moi))
    .map((c) => ({ c, dernier: dernierMessage(donnees, c.id) }))
    .sort((a, b) => {
      if (a.c.type === "groupe") return -1;
      if (b.c.type === "groupe") return 1;
      return (b.dernier?.envoyeLe ?? b.c.creeeLe).localeCompare(a.dernier?.envoyeLe ?? a.c.creeeLe);
    });
  const groupe = conversations.find((x) => x.c.type === "groupe");
  const privees = conversations.filter((x) => x.c.type === "prive");
  const totalNonLus = conversations.reduce((s, x) => s + nonLus(donnees, x.c.id), 0);

  const ouvrir = (id: string) => router.push(`/messages/conversation/?id=${id}`);

  return (
    <>
      <EnTete />
      <Page>
        <CarteAccueil
          className="animate-apparition"
          surtitre="Messages"
          titre="Discuter avec l'équipe 💬"
          sousTitre={totalNonLus > 0 ? `${totalNonLus} message${totalNonLus > 1 ? "s" : ""} non lu${totalNonLus > 1 ? "s" : ""}` : "Le groupe de l'équipe et vos conversations privées."}
        >
          <Bouton variante="blanc" taille="grand" pleineLargeur icone={<MessageCirclePlus className="h-5.5 w-5.5" />} onClick={() => setNouvelle(true)}>
            Nouveau message
          </Bouton>
        </CarteAccueil>

        <CarteNotifications className="mt-4" />

        {groupe && (
          <>
            <TitreSection>💬 Groupe</TitreSection>
            <Carte className="overflow-hidden">
              <LigneConversation c={groupe.c} moi={moi} nonLus={nonLus(donnees, groupe.c.id)} onClick={() => ouvrir(groupe.c.id)} />
            </Carte>
          </>
        )}

        <TitreSection action={<span className="hidden items-center gap-1 text-[13px] text-doux xs:flex"><Lock className="h-3.5 w-3.5" /> Visibles par les membres seulement</span>}>
          🔒 Privé
        </TitreSection>
        {privees.length === 0 ? (
          <Carte>
            <EtatVide
              icone={<Lock className="h-7 w-7" />}
              titre="Aucune conversation privée"
              texte="Écrivez à une collègue, ou à plusieurs, sans que le reste de l'équipe voie les messages."
              action={
                <Bouton icone={<MessageCirclePlus className="h-5 w-5" />} onClick={() => setNouvelle(true)}>
                  Nouveau message
                </Bouton>
              }
            />
          </Carte>
        ) : (
          <Carte className="overflow-hidden">
            {privees.map((x, i) => (
              <div key={x.c.id} className={cx(i > 0 && "border-t border-black/5")}>
                <LigneConversation c={x.c} moi={moi} nonLus={nonLus(donnees, x.c.id)} onClick={() => ouvrir(x.c.id)} />
              </div>
            ))}
          </Carte>
        )}
      </Page>

      {nouvelle && (
        <NouvelleConversation
          moi={moi}
          onFermer={() => setNouvelle(false)}
          onCreer={(membres, nom) => {
            const id = creerConversation(membres, moi, nom);
            setNouvelle(false);
            ouvrir(id);
          }}
        />
      )}
    </>
  );
}

function AvatarConversation({ c, moi }: { c: Conversation; moi: Participant }) {
  const { donnees } = useStore();
  if (c.type === "groupe") {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaire text-white shadow-bouton">
        <Users className="h-5.5 w-5.5" />
      </span>
    );
  }
  const autres = c.membres.filter((m) => m !== moi);
  if (autres.length <= 1) {
    const p = autres[0] ?? moi;
    return <Avatar prenom={nomParticipant(donnees, p)} couleur={couleurParticipant(donnees, p)} taille={48} />;
  }
  return (
    <span className="relative h-12 w-12 shrink-0">
      <span className="absolute left-0 top-0">
        <Avatar prenom={nomParticipant(donnees, autres[0])} couleur={couleurParticipant(donnees, autres[0])} taille={32} />
      </span>
      <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-white">
        <Avatar prenom={nomParticipant(donnees, autres[1])} couleur={couleurParticipant(donnees, autres[1])} taille={32} />
      </span>
    </span>
  );
}

function LigneConversation({ c, moi, nonLus, onClick }: { c: Conversation; moi: Participant; nonLus: number; onClick: () => void }) {
  const { donnees } = useStore();
  const dernier = dernierMessage(donnees, c.id);
  const auteur = dernier ? (dernier.auteur === moi ? "Vous" : nomParticipant(donnees, dernier.auteur)) : "";
  return (
    <button type="button" onClick={onClick} className="flex min-h-[4.75rem] w-full items-center gap-3.5 px-4 py-3 text-left transition active:bg-gray-50">
      <AvatarConversation c={c} moi={moi} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cx("min-w-0 flex-1 truncate text-base text-encre", nonLus > 0 ? "font-bold" : "font-semibold")}>{titreConversation(donnees, c, moi)}</span>
          {dernier && <span className={cx("shrink-0 text-xs", nonLus > 0 ? "font-semibold text-primaire" : "text-pale")}>{heureCourte(dernier.envoyeLe)}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cx("min-w-0 flex-1 truncate text-[14px]", nonLus > 0 ? "font-medium text-encre" : "text-doux")}>
            {dernier ? `${auteur} : ${dernier.texte || (dernier.photo ? "Photo" : "")}` : "Aucun message pour l'instant"}
          </span>
          {nonLus > 0 ? (
            <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primaire px-1.5 text-[11px] font-bold text-white">{nonLus}</span>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-pale" />
          )}
        </span>
      </span>
    </button>
  );
}

function NouvelleConversation({
  moi,
  onFermer,
  onCreer,
}: {
  moi: Participant;
  onFermer: () => void;
  onCreer: (membres: Participant[], nom?: string) => void;
}) {
  const { donnees } = useStore();
  const [choisies, setChoisies] = useState<Participant[]>([]);
  const [nom, setNom] = useState("");
  const personnes = participants(donnees).filter((p) => p !== moi);
  const basculer = (p: Participant) => setChoisies((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));

  return (
    <Feuille
      ouverte
      onFermer={onFermer}
      titre="Nouveau message"
      pied={
        <Bouton taille="grand" pleineLargeur disabled={choisies.length === 0} onClick={() => onCreer(choisies, choisies.length > 1 ? nom : undefined)}>
          {choisies.length === 0
            ? "Choisissez au moins une personne"
            : choisies.length === 1
              ? `Écrire à ${nomParticipant(donnees, choisies[0])}`
              : `Créer la conversation (${choisies.length + 1})`}
        </Bouton>
      }
    >
      <p className="mb-3 flex items-start gap-2 text-[14px] text-doux">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Seules les personnes choisies verront cette conversation.
      </p>
      <div className="flex flex-col gap-2">
        {personnes.map((p) => {
          const actif = choisies.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => basculer(p)}
              aria-pressed={actif}
              className={cx(
                "flex min-h-14 items-center gap-3.5 rounded-2xl border px-4 text-left transition active:scale-[0.99]",
                actif ? "border-primaire bg-primaire-clair" : "border-bord"
              )}
            >
              <Avatar prenom={nomParticipant(donnees, p)} couleur={couleurParticipant(donnees, p)} taille={40} />
              <span className="flex-1 text-base font-semibold text-encre">{nomParticipant(donnees, p)}</span>
              <span
                className={cx(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 transition",
                  actif ? "border-primaire bg-primaire text-white" : "border-gray-300"
                )}
              >
                {actif && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      {choisies.length > 1 && (
        <div className="mt-4">
          <Champ label="Nom de la conversation (facultatif)">
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Étage 2" className={classeInput} maxLength={40} />
          </Champ>
        </div>
      )}
    </Feuille>
  );
}
