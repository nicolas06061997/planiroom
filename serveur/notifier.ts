/**
 * Service de notifications « appli fermée » (Web Push).
 *
 * L'appli l'appelle après chaque message envoyé : { conversationId, messageId }.
 * Le service relit le message dans Firebase, trouve les destinataires (tout le
 * monde pour le groupe, les membres pour une conversation privée, jamais l'auteur)
 * et envoie une notification à leurs téléphones abonnés.
 *
 * À héberger chez un hébergeur de fonctions gratuit (avec `lire-horaire.ts`).
 * Variables à configurer chez l'hébergeur :
 *   FIREBASE_URL, CODE_HOTEL, APP_URL (ex. https://nicolas06061997.github.io/planiroom),
 *   VAPID_PUBLIQUE, VAPID_PRIVEE (créées avec `npx web-push generate-vapid-keys`),
 *   VAPID_CONTACT (ex. mailto:adresse@exemple.be).
 */
import * as webpush from "web-push";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const repondre = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json", ...CORS } });

interface Abonnement {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request): Promise<Response> {
  const { FIREBASE_URL, CODE_HOTEL, APP_URL, VAPID_PUBLIQUE, VAPID_PRIVEE, VAPID_CONTACT } = process.env;
  if (!FIREBASE_URL || !CODE_HOTEL || !VAPID_PUBLIQUE || !VAPID_PRIVEE) return repondre({ erreur: "Service non configuré." }, 500);

  let corps: { conversationId?: string; messageId?: string };
  try {
    corps = await req.json();
  } catch {
    return repondre({ erreur: "Requête invalide." }, 400);
  }
  const { conversationId, messageId } = corps;
  if (!conversationId || !messageId || !/^[\w-]{1,60}$/.test(conversationId + messageId)) return repondre({ erreur: "Requête invalide." }, 400);

  const fb = FIREBASE_URL.replace(/\/$/, "");
  const lire = async <T,>(chemin: string): Promise<T | null> => {
    const r = await fetch(`${fb}/${chemin}.json`);
    return r.ok ? ((await r.json()) as T | null) : null;
  };

  // Une seule notification par message, et seulement pour un message récent.
  if (await lire<boolean>(`push-envoyes/${CODE_HOTEL}/${messageId}`)) return repondre({ envoyes: 0, deja: true });
  const [message, conversation, employes, abonnements] = await Promise.all([
    lire<{ auteur: string; texte: string; envoyeLe: string; photo?: unknown }>(`hotels/${CODE_HOTEL}/messages/${conversationId}/${messageId}`),
    lire<{ type: string; nom?: string; membres?: string[] | Record<string, string> }>(`hotels/${CODE_HOTEL}/conversations/${conversationId}`),
    lire<Record<string, { prenom: string }>>(`hotels/${CODE_HOTEL}/employees`),
    lire<Record<string, Record<string, Abonnement>>>(`push/${CODE_HOTEL}`),
  ]);
  if (!message || !conversation) return repondre({ erreur: "Message introuvable." }, 404);
  if (Date.now() - new Date(message.envoyeLe).getTime() > 5 * 60_000) return repondre({ envoyes: 0, ancien: true });
  await fetch(`${fb}/push-envoyes/${CODE_HOTEL}/${messageId}.json`, { method: "PUT", body: "true" });

  const nom = (p: string) => (p === "gouvernante" ? "Gouvernante" : employes?.[p]?.prenom ?? "Quelqu'un");
  const membres = conversation.membres ? Object.values(conversation.membres) : [];
  const destinataires = Object.keys(abonnements ?? {}).filter(
    (p) => p !== message.auteur && (conversation.type === "groupe" || membres.includes(p))
  );
  const titre =
    conversation.type === "groupe"
      ? `${nom(message.auteur)} · ${conversation.nom ?? "Équipe"}`
      : conversation.nom
        ? `${nom(message.auteur)} · ${conversation.nom}`
        : nom(message.auteur);
  const charge = JSON.stringify({
    titre,
    corps: message.texte?.slice(0, 180) || (message.photo ? "Photo" : "Nouveau message"),
    url: `${(APP_URL ?? "").replace(/\/$/, "")}/messages/conversation/?id=${conversationId}`,
    tag: `conv-${conversationId}`,
  });

  webpush.setVapidDetails(VAPID_CONTACT || "mailto:contact@exemple.be", VAPID_PUBLIQUE, VAPID_PRIVEE);
  let envoyes = 0;
  await Promise.all(
    destinataires.flatMap((p) =>
      Object.entries(abonnements![p] ?? {}).map(async ([id, abo]) => {
        try {
          await webpush.sendNotification(abo, charge, { TTL: 3600 });
          envoyes++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          // Abonnement mort (appli désinstallée…) : on le retire.
          if (code === 404 || code === 410) await fetch(`${fb}/push/${CODE_HOTEL}/${p}/${id}.json`, { method: "DELETE" });
        }
      })
    )
  );
  return repondre({ envoyes });
}
