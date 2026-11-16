/**
 * Lecture d'une capture Shifter.
 * - Si LECTURE_URL est renseignée (src/config.ts), l'image est envoyée au
 *   service de lecture (dossier `serveur/`), qui utilise l'IA Claude.
 * - Sinon : mode démo, un horaire d'exemple est proposé (rien n'est payé).
 */
import { LECTURE_URL } from "@/config";
import { addDays } from "./dates";
import type { JourLu, ReponseLecture } from "./lectureHoraire";

function horaireDemo(lundi: string): JourLu[] {
  const modele: ([string, string] | null)[] = [
    ["08:00", "14:00"], ["08:00", "14:00"], null, ["09:00", "15:00"], ["08:00", "14:00"], ["08:00", "13:00"], null,
  ];
  return modele.map((m, i) => ({ date: addDays(lundi, i), debut: m?.[0] ?? null, fin: m?.[1] ?? null, conge: !m }));
}

export async function lireCapture(params: {
  image: string;
  mediaType: string;
  aujourdhui: string;
  lundi: string;
}): Promise<ReponseLecture> {
  if (!LECTURE_URL) {
    await new Promise((r) => setTimeout(r, 1400));
    return { jours: horaireDemo(params.lundi), demo: true };
  }
  const res = await fetch(LECTURE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({ jours: [], erreur: "Réponse illisible." }))) as ReponseLecture;
  if (!res.ok && !data.erreur) data.erreur = "Le service de lecture est indisponible.";
  return data;
}
