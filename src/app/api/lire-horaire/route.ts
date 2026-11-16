/**
 * Lecture d'une capture d'écran Shifter avec l'IA Claude (vision).
 *
 * - Sans clé ANTHROPIC_API_KEY : "mode démo", renvoie un horaire d'exemple
 *   (rien n'est payé).
 * - Avec une clé : l'image est envoyée à Claude, qui renvoie un JSON
 *   { jours: [{ date, debut, fin, conge }] }.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { addDays } from "@/lib/dates";
import { HoraireLuSchema, type JourLu, type ReponseLecture } from "@/lib/lectureHoraire";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELE = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type TypeImage = (typeof TYPES_IMAGE)[number];

const CONSIGNES = `Tu lis des captures d'écran de l'application de planning "Shifter" envoyées par des femmes de chambre d'un hôtel en Belgique.
Extrais chaque jour visible sur la capture :
- date au format AAAA-MM-JJ (déduis l'année à partir de la date du jour fournie ; les captures montrent la semaine en cours ou les suivantes) ;
- debut et fin au format HH:MM sur 24 h (ex. "08:00", "14:30") ;
- conge = true pour un jour de congé, repos, "off", absence, maladie, ou un jour affiché sans service. Dans ce cas debut et fin valent null.
S'il y a plusieurs services le même jour, prends le début du premier et la fin du dernier.
N'invente aucun jour qui n'est pas visible. Si la capture n'est pas un horaire, renvoie une liste vide.`;

function normaliserHeure(h: string | null): string | null {
  if (!h) return null;
  const m = h.trim().match(/^(\d{1,2})[:hH.]?(\d{2})?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2] ?? 0);
  if (hh > 24 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function nettoyer(jours: JourLu[]): JourLu[] {
  return jours
    .filter((j) => /^\d{4}-\d{2}-\d{2}$/.test(j.date))
    .map((j) => {
      const debut = normaliserHeure(j.debut);
      const fin = normaliserHeure(j.fin);
      const conge = j.conge || !debut || !fin;
      return { date: j.date, debut: conge ? null : debut, fin: conge ? null : fin, conge };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function horaireDemo(lundi: string): JourLu[] {
  const modele: ([string, string] | null)[] = [
    ["08:00", "14:00"], ["08:00", "14:00"], null, ["09:00", "15:00"], ["08:00", "14:00"], ["08:00", "13:00"], null,
  ];
  return modele.map((m, i) => ({
    date: addDays(lundi, i),
    debut: m?.[0] ?? null,
    fin: m?.[1] ?? null,
    conge: !m,
  }));
}

export async function POST(req: Request) {
  let corps: { image?: string; mediaType?: string; aujourdhui?: string; lundi?: string };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json<ReponseLecture>({ jours: [], erreur: "Requête invalide." }, { status: 400 });
  }
  const { image, mediaType, aujourdhui, lundi } = corps;
  if (!image || !mediaType || !TYPES_IMAGE.includes(mediaType as TypeImage)) {
    return NextResponse.json<ReponseLecture>({ jours: [], erreur: "Image manquante ou format non pris en charge." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 1200)); // simule le temps de lecture
    return NextResponse.json<ReponseLecture>({ jours: horaireDemo(lundi ?? aujourdhui ?? ""), demo: true });
  }

  const client = new Anthropic();
  try {
    const reponse = await client.beta.messages.parse({
      model: MODELE,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(HoraireLuSchema) },
      system: CONSIGNES,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as TypeImage, data: image } },
            { type: "text", text: `Date du jour : ${aujourdhui ?? "inconnue"}. Lis cet horaire.` },
          ],
        },
      ],
    });

    if (reponse.stop_reason === "refusal" || !reponse.parsed_output) {
      return NextResponse.json<ReponseLecture>(
        { jours: [], erreur: "La capture n'a pas pu être lue. Essayez une capture plus nette." },
        { status: 422 }
      );
    }
    return NextResponse.json<ReponseLecture>({ jours: nettoyer(reponse.parsed_output.jours) });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json<ReponseLecture>({ jours: [], erreur: "Clé API Claude invalide." }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json<ReponseLecture>({ jours: [], erreur: "Trop de demandes, réessayez dans une minute." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json<ReponseLecture>({ jours: [], erreur: "Le service de lecture est indisponible." }, { status: 502 });
    }
    return NextResponse.json<ReponseLecture>({ jours: [], erreur: "Erreur inattendue pendant la lecture." }, { status: 500 });
  }
}
