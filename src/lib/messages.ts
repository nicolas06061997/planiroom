/** Petites fonctions pour le chat (qui voit quoi, noms, messages non lus). */
"use client";

import { useCallback, useEffect, useState } from "react";
import { GOUVERNANTE, type Conversation, type Donnees, type Message, type Participant } from "./types";

export function nomParticipant(d: Donnees, p: Participant): string {
  if (p === GOUVERNANTE) return "Gouvernante";
  return d.employees.find((e) => e.id === p)?.prenom ?? "Ancienne collègue";
}

export function couleurParticipant(d: Donnees, p: Participant): string {
  if (p === GOUVERNANTE) return "#0F172A";
  return d.employees.find((e) => e.id === p)?.couleur ?? "#6B7280";
}

/** Tout le monde qui peut participer au chat (filles actives + gouvernante). */
export function participants(d: Donnees): Participant[] {
  return [GOUVERNANTE, ...d.employees.filter((e) => e.actif).map((e) => e.id)];
}

export function membresDe(d: Donnees, c: Conversation): Participant[] {
  return c.type === "groupe" ? participants(d) : c.membres;
}

/** Une conversation privée n'est visible que par ses membres. */
export function peutVoir(c: Conversation, moi: Participant): boolean {
  return c.type === "groupe" || c.membres.includes(moi);
}

export function titreConversation(d: Donnees, c: Conversation, moi: Participant): string {
  if (c.nom) return c.nom;
  const autres = c.membres.filter((m) => m !== moi).map((m) => nomParticipant(d, m));
  return autres.length ? autres.join(", ") : "Moi";
}

export function messagesDe(d: Donnees, conversationId: string): Message[] {
  return d.messages.filter((m) => m.conversationId === conversationId);
}

export function dernierMessage(d: Donnees, conversationId: string): Message | undefined {
  let dernier: Message | undefined;
  for (const m of d.messages) if (m.conversationId === conversationId && (!dernier || m.envoyeLe > dernier.envoyeLe)) dernier = m;
  return dernier;
}

/* ---------- Lu / non lu (gardé sur le téléphone de chacune) ---------- */

const CLE_LUS = "planiroom:lus";

function lireLus(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CLE_LUS) ?? "{}");
  } catch {
    return {};
  }
}

/** Date de dernière lecture de chaque conversation, pour la personne connectée. */
export function useLus(moi: Participant | null) {
  const [lus, setLus] = useState<Record<string, string>>({});
  useEffect(() => {
    const maj = () => setLus(lireLus());
    maj();
    window.addEventListener("storage", maj);
    window.addEventListener("planiroom:lus", maj);
    return () => {
      window.removeEventListener("storage", maj);
      window.removeEventListener("planiroom:lus", maj);
    };
  }, []);

  const marquerLu = useCallback(
    (conversationId: string) => {
      if (!moi) return;
      const tous = lireLus();
      tous[`${moi}|${conversationId}`] = new Date().toISOString();
      try {
        localStorage.setItem(CLE_LUS, JSON.stringify(tous));
      } catch {}
      window.dispatchEvent(new Event("planiroom:lus"));
    },
    [moi]
  );

  const nonLus = useCallback(
    (d: Donnees, conversationId: string) => {
      if (!moi) return 0;
      const depuis = lus[`${moi}|${conversationId}`] ?? "";
      return d.messages.filter((m) => m.conversationId === conversationId && m.auteur !== moi && m.envoyeLe > depuis).length;
    },
    [lus, moi]
  );

  return { marquerLu, nonLus };
}

/** Nombre total de conversations avec des messages non lus (pastille dans la barre du bas). */
export function useTotalNonLus(d: Donnees, moi: Participant | null) {
  const { nonLus } = useLus(moi);
  if (!moi) return 0;
  return d.conversations.filter((c) => peutVoir(c, moi) && nonLus(d, c.id) > 0).length;
}

/** "14:05", "Hier", "lun." ou "12/11" selon l'ancienneté. */
export function heureCourte(iso: string): string {
  const d = new Date(iso);
  const maintenant = new Date();
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86_400_000);
  const hh = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (ecart === 0) return hh;
  if (ecart === 1) return "Hier";
  if (ecart < 7) return ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][d.getDay()];
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Séparateur de date dans une conversation : "Aujourd'hui", "Hier", "Lundi 16 novembre". */
export function jourMessage(iso: string): string {
  const d = new Date(iso);
  const maintenant = new Date();
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86_400_000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Hier";
  return d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());
}
