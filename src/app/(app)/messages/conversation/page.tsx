"use client";

import { ArrowLeft, ArrowUp, Clock, ImagePlus, Lock, MessageCircle, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar, BoutonIcone, cx, EtatVide, Feuille } from "@/components/ui";
import {
  couleurParticipant,
  jourMessage,
  membresDe,
  messagesDe,
  nomParticipant,
  peutVoir,
  titreConversation,
  useLus,
} from "@/lib/messages";
import { preparerImage } from "@/lib/image";
import { signalerMessage } from "@/lib/notifications";
import { enregistrerPhoto, usePhoto } from "@/lib/photos";
import { moiDe, useStore } from "@/lib/store";
import type { Message } from "@/lib/types";

export default function ConversationPage() {
  return (
    <Suspense>
      <Conversation />
    </Suspense>
  );
}

const heure = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Conversation() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { donnees, session, envoyerMessage, enAttente } = useStore();
  const moi = moiDe(session);
  const { marquerLu } = useLus(moi);
  const [texte, setTexte] = useState("");
  const [membresOuverts, setMembresOuverts] = useState(false);
  const [photo, setPhoto] = useState<{ src: string; l: number; h: number } | null>(null);
  const [photoErreur, setPhotoErreur] = useState<string | null>(null);
  const [agrandie, setAgrandie] = useState<string | null>(null);
  const fichierRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLTextAreaElement>(null);
  const premierAffichage = useRef(true);

  const conv = donnees.conversations.find((c) => c.id === id);
  const visible = !!conv && !!moi && peutVoir(conv, moi);
  const messages = visible ? messagesDe(donnees, id) : [];
  const nb = messages.length;

  // Messages lus dès qu'ils sont affichés.
  useEffect(() => {
    if (visible) marquerLu(id);
  }, [visible, id, nb, marquerLu]);

  // Toujours afficher le dernier message.
  useLayoutEffect(() => {
    finRef.current?.scrollIntoView({ behavior: premierAffichage.current ? "auto" : "smooth", block: "end" });
    premierAffichage.current = false;
  }, [nb]);

  // Le champ grandit avec le texte (jusqu'à 5 lignes).
  useLayoutEffect(() => {
    const el = champRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [texte]);

  if (!moi) return null;

  if (!visible || !conv) {
    return (
      <div className="min-h-ecran pt-safe">
        <EtatVide
          icone={<MessageCircle className="h-7 w-7" />}
          titre="Conversation introuvable"
          texte="Elle a peut-être été supprimée, ou vous n'en faites pas partie."
          action={
            <button type="button" onClick={() => router.push("/messages/")} className="min-h-12 rounded-2xl bg-primaire px-6 font-semibold text-white">
              Retour aux messages
            </button>
          }
        />
      </div>
    );
  }

  const membres = membresDe(donnees, conv);
  const choisirPhoto = async (f: File | undefined) => {
    if (!f) return;
    setPhotoErreur(null);
    try {
      const img = await preparerImage(f, 1280, 0.75);
      setPhoto({ src: img.apercu, l: img.largeur, h: img.hauteur });
    } catch {
      setPhotoErreur("Cette photo n'a pas pu être ouverte.");
    }
  };

  const envoyer = () => {
    if (!texte.trim() && !photo) return;
    let joint: Message["photo"];
    if (photo) {
      const pid = `ph${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      enregistrerPhoto(pid, photo.src);
      joint = { id: pid, l: photo.l, h: photo.h };
    }
    const m = envoyerMessage(id, moi, texte, joint);
    if (m) signalerMessage(m);
    setTexte("");
    setPhoto(null);
    champRef.current?.focus();
  };

  return (
    <div className="min-h-ecran flex flex-col">
      {/* En-tête */}
      <header className="verre pt-safe sticky top-0 z-20 border-b border-black/5">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center gap-2 px-3">
          <BoutonIcone label="Retour aux messages" onClick={() => router.push("/messages/")}>
            <ArrowLeft className="h-5.5 w-5.5" />
          </BoutonIcone>
          <button type="button" onClick={() => setMembresOuverts(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 text-left">
            {conv.type === "groupe" || conv.membres.filter((m) => m !== moi).length > 1 ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primaire text-white">
                <Users className="h-5 w-5" />
              </span>
            ) : (
              <Avatar
                prenom={nomParticipant(donnees, conv.membres.find((m) => m !== moi) ?? moi)}
                couleur={couleurParticipant(donnees, conv.membres.find((m) => m !== moi) ?? moi)}
                taille={40}
              />
            )}
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-encre">{titreConversation(donnees, conv, moi)}</span>
              <span className="flex items-center gap-1 truncate text-[12px] text-doux">
                {conv.type === "prive" && <Lock className="h-3 w-3 shrink-0" />}
                {conv.type === "groupe" ? `${membres.length} personnes` : `Privé · ${membres.length} personnes`}
              </span>
            </span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-28 pt-3">
        {messages.length === 0 && (
          <p className="mx-auto mt-10 max-w-xs text-center text-[15px] text-doux">
            Aucun message pour l&apos;instant. Écrivez le premier !
          </p>
        )}
        {messages.map((m, i) => {
          const precedent = messages[i - 1];
          const nouveauJour = !precedent || jourMessage(precedent.envoyeLe) !== jourMessage(m.envoyeLe);
          const memeAuteur = !nouveauJour && precedent?.auteur === m.auteur;
          const suivant = messages[i + 1];
          const dernierDuBloc = !suivant || suivant.auteur !== m.auteur || jourMessage(suivant.envoyeLe) !== jourMessage(m.envoyeLe);
          const mien = m.auteur === moi;
          const afficherNom = !mien && !memeAuteur && membres.length > 2;
          return (
            <Fragment key={m.id}>
              {nouveauJour && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-doux shadow-carte">{jourMessage(m.envoyeLe)}</span>
                </div>
              )}
              <div className={cx("flex items-end gap-2", mien ? "justify-end" : "justify-start", memeAuteur ? "mt-0.5" : "mt-3")}>
                {!mien && (
                  <span className="w-8 shrink-0">
                    {dernierDuBloc && <Avatar prenom={nomParticipant(donnees, m.auteur)} couleur={couleurParticipant(donnees, m.auteur)} taille={32} />}
                  </span>
                )}
                <div
                  className={cx(
                    "max-w-[78%] animate-apparition px-3.5 py-2 shadow-carte",
                    mien ? "rounded-[20px] rounded-br-md bg-primaire text-white" : "rounded-[20px] rounded-bl-md bg-white text-encre"
                  )}
                >
                  {afficherNom && (
                    <p className="mb-0.5 text-[12px] font-bold" style={{ color: couleurParticipant(donnees, m.auteur) }}>
                      {nomParticipant(donnees, m.auteur)}
                    </p>
                  )}
                  {m.photo && <PhotoMessage photo={m.photo} onAgrandir={setAgrandie} />}
                  {m.texte && <p className={cx("whitespace-pre-wrap break-words text-[15px] leading-snug", m.photo && "mt-1.5")}>{m.texte}</p>}
                  <p className={cx("mt-0.5 flex items-center justify-end gap-1 text-[11px]", mien ? "text-white/70" : "text-pale")}>
                    {heure(m.envoyeLe)}
                    {mien && enAttente.has(`messages/${id}/${m.id}`) && (
                      <Clock className="h-3 w-3" aria-label="Pas encore envoyé (hors connexion)" />
                    )}
                  </p>
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={finRef} />
      </main>

      {/* Zone de saisie */}
      <div className="verre-blanc pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-black/5">
        {(photo || photoErreur) && (
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pt-3">
            {photo ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt="Photo à envoyer" className="h-20 max-w-[8rem] rounded-2xl border border-bord object-cover shadow-carte" />
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => setPhoto(null)}
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-encre text-white shadow-flottant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-red-700">{photoErreur}</p>
            )}
            {photo && <p className="text-[13px] text-doux">Ajoutez un texte si vous voulez, puis envoyez.</p>}
          </div>
        )}
        <input
          ref={fichierRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            choisirPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <form
          className="mx-auto flex max-w-2xl items-end gap-2 px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            envoyer();
          }}
        >
          <button
            type="button"
            aria-label="Ajouter une photo"
            onClick={() => fichierRef.current?.click()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-primaire transition hover:bg-primaire-clair active:scale-95"
          >
            <ImagePlus className="h-6 w-6" />
          </button>
          <textarea
            ref={champRef}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={1}
            placeholder="Message…"
            aria-label="Message"
            maxLength={2000}
            className="min-h-12 flex-1 resize-none rounded-3xl border border-bord bg-white px-4 py-3 text-base leading-snug text-encre outline-none transition placeholder:text-pale focus:border-primaire focus:ring-3 focus:ring-primaire/15"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={!texte.trim() && !photo}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaire text-white shadow-bouton transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowUp className="h-5.5 w-5.5" strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {agrandie && (
        <div className="fixed inset-0 z-[70] flex animate-fondu items-center justify-center bg-black/95" role="dialog" aria-modal aria-label="Photo" onClick={() => setAgrandie(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agrandie} alt="Photo" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            aria-label="Fermer la photo"
            onClick={() => setAgrandie(null)}
            className="pt-safe absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <Feuille ouverte={membresOuverts} onFermer={() => setMembresOuverts(false)} titre={conv.type === "groupe" ? "Groupe de l'équipe" : "Conversation privée"}>
        {conv.type === "prive" && (
          <p className="mb-4 flex items-start gap-2 text-[14px] text-doux">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Seules ces personnes voient les messages.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {membres.map((p) => (
            <div key={p} className="flex min-h-14 items-center gap-3.5 rounded-2xl bg-fond px-4">
              <Avatar prenom={nomParticipant(donnees, p)} couleur={couleurParticipant(donnees, p)} taille={40} />
              <span className="flex-1 text-base font-semibold text-encre">{nomParticipant(donnees, p)}</span>
              {p === moi && <span className="text-[13px] text-doux">Vous</span>}
            </div>
          ))}
        </div>
      </Feuille>
    </div>
  );
}

/** Photo dans une bulle : place réservée à la bonne taille, chargement, toucher pour agrandir. */
function PhotoMessage({ photo, onAgrandir }: { photo: NonNullable<Message["photo"]>; onAgrandir: (src: string) => void }) {
  const { src, echec } = usePhoto(photo.id);
  const largeur = Math.min(240, photo.l);
  const hauteur = Math.min(320, Math.round((largeur * photo.h) / Math.max(1, photo.l)));
  return (
    <button
      type="button"
      onClick={() => src && onAgrandir(src)}
      className="-mx-1.5 -mt-0.5 block overflow-hidden rounded-2xl bg-black/5"
      style={{ width: largeur, height: hauteur, maxWidth: "100%" }}
      aria-label="Agrandir la photo"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Photo envoyée" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[13px] text-doux">
          {echec ? "Photo indisponible" : <span className="h-6 w-6 animate-spin rounded-full border-2 border-primaire/20 border-t-primaire" />}
        </span>
      )}
    </button>
  );
}
