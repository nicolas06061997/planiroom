"use client";

/**
 * Prévient quand un nouveau message arrive d'une autre personne :
 * - appli visible : petit bandeau en haut (sauf si on est déjà dans la conversation) ;
 * - appli en arrière-plan : notification sur le téléphone (si activées).
 */
import { MessageCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { nomParticipant, peutVoir, titreConversation } from "@/lib/messages";
import { afficherNotification } from "@/lib/notifications";
import { moiDe, useStore } from "@/lib/store";
import type { Message } from "@/lib/types";

export function AlerteMessages() {
  return (
    <Suspense>
      <Alerte />
    </Suspense>
  );
}

function Alerte() {
  const { donnees, session } = useStore();
  const moi = moiDe(session);
  const pathname = usePathname();
  const params = useSearchParams();
  const conversationOuverte = pathname.startsWith("/messages/conversation") ? params.get("id") : null;
  const router = useRouter();
  const connus = useRef<Set<string> | null>(null);
  const [bandeau, setBandeau] = useState<{ m: Message; titre: string; corps: string } | null>(null);

  useEffect(() => {
    if (!moi) return;
    // Premier passage : on mémorise les messages déjà là, sans alerter.
    if (!connus.current) {
      connus.current = new Set(donnees.messages.map((m) => m.id));
      return;
    }
    const nouveaux = donnees.messages.filter((m) => !connus.current!.has(m.id));
    nouveaux.forEach((m) => connus.current!.add(m.id));
    const recus = nouveaux.filter((m) => {
      const c = donnees.conversations.find((x) => x.id === m.conversationId);
      return m.auteur !== moi && c && peutVoir(c, moi);
    });
    if (recus.length === 0) return;
    const m = recus[recus.length - 1];
    const c = donnees.conversations.find((x) => x.id === m.conversationId)!;
    const auteur = nomParticipant(donnees, m.auteur);
    const titre = c.type === "groupe" || c.membres.length > 2 ? `${auteur} · ${titreConversation(donnees, c, moi)}` : auteur;
    const corps = m.texte || "Photo";
    if (document.visibilityState === "hidden") {
      afficherNotification(titre, corps, c.id);
    } else if (conversationOuverte !== c.id) {
      setBandeau({ m, titre, corps });
    }
  }, [donnees, moi, conversationOuverte]);

  useEffect(() => {
    if (!bandeau) return;
    const t = setTimeout(() => setBandeau(null), 5000);
    return () => clearTimeout(t);
  }, [bandeau]);

  if (!bandeau) return null;
  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3">
      <button
        type="button"
        onClick={() => {
          setBandeau(null);
          router.push(`/messages/conversation/?id=${bandeau.m.conversationId}`);
        }}
        className="pointer-events-auto mt-2 flex w-full max-w-md animate-apparition items-center gap-3 rounded-3xl bg-encre px-4 py-3 text-left text-white shadow-flottant"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold">{bandeau.titre}</span>
          <span className="block truncate text-[14px] text-white/75">{bandeau.corps}</span>
        </span>
      </button>
    </div>
  );
}
