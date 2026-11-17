"use client";

/**
 * Notifications de messages.
 *
 * 1. Appli ouverte ou en arrière-plan : l'appli affiche elle-même la notification
 *    dès qu'un message arrive (via le service worker).
 * 2. Appli fermée (« push ») : le téléphone s'abonne, l'abonnement est rangé dans
 *    Firebase `push/<CODE_HOTEL>/<personne>/<id>`, et le petit service `serveur/notifier.ts`
 *    envoie la notification à chaque nouveau message. Nécessite NOTIF_URL + VAPID_PUBLIQUE.
 *    Sur iPhone : seulement si l'appli est installée (iOS 16.4 ou plus récent).
 */
import { useCallback, useEffect, useState } from "react";
import { BASE, CODE_HOTEL, FIREBASE_URL, NOTIF_URL, PARTAGE_ACTIF, VAPID_PUBLIQUE } from "@/config";
import type { Message, Participant } from "./types";

const CLE_PREF = "planiroom:notifications";

export type EtatNotif = "non-supporte" | "installer-iphone" | "refuse" | "actif" | "inactif";

function estIphone() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function estInstallee() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches;
}

export function lireEtat(): EtatNotif {
  if (typeof window === "undefined") return "non-supporte";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    // iPhone dans Safari : les notifications n'existent qu'une fois l'appli installée.
    return estIphone() && !estInstallee() ? "installer-iphone" : "non-supporte";
  }
  if (Notification.permission === "denied") return "refuse";
  let pref = false;
  try {
    pref = localStorage.getItem(CLE_PREF) === "1";
  } catch {}
  return Notification.permission === "granted" && pref ? "actif" : "inactif";
}

function cleEnOctets(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

async function idAbonnement(endpoint: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(h).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Abonne ce téléphone aux notifications « appli fermée » (si le service est configuré). */
async function abonnerPush(moi: Participant) {
  if (!PARTAGE_ACTIF || !VAPID_PUBLIQUE || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const abo =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(VAPID_PUBLIQUE) as BufferSource }));
    const id = await idAbonnement(abo.endpoint);
    await fetch(`${FIREBASE_URL}/push/${CODE_HOTEL}/${moi}/${id}.json`, {
      method: "PUT",
      body: JSON.stringify({ ...abo.toJSON(), u: new Date().toISOString() }),
    });
  } catch {
    /* pas grave : les notifications « appli ouverte » marchent quand même */
  }
}

async function desabonnerPush(moi: Participant) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const abo = await reg.pushManager?.getSubscription();
    if (!abo) return;
    const id = await idAbonnement(abo.endpoint);
    await abo.unsubscribe();
    if (PARTAGE_ACTIF) await fetch(`${FIREBASE_URL}/push/${CODE_HOTEL}/${moi}/${id}.json`, { method: "DELETE" });
  } catch {}
}

export function useNotifications(moi: Participant | null) {
  const [etat, setEtat] = useState<EtatNotif>("non-supporte");
  useEffect(() => {
    setEtat(lireEtat());
    const maj = () => setEtat(lireEtat());
    window.addEventListener("planiroom:notifications", maj);
    return () => window.removeEventListener("planiroom:notifications", maj);
  }, []);

  // L'abonnement est refait à chaque ouverture (il peut changer ou expirer).
  useEffect(() => {
    if (etat === "actif" && moi) abonnerPush(moi);
  }, [etat, moi]);

  const activer = useCallback(async () => {
    if (!("Notification" in window)) return;
    const reponse = await Notification.requestPermission();
    if (reponse === "granted") {
      try {
        localStorage.setItem(CLE_PREF, "1");
      } catch {}
      if (moi) await abonnerPush(moi);
    }
    window.dispatchEvent(new Event("planiroom:notifications"));
  }, [moi]);

  const desactiver = useCallback(async () => {
    try {
      localStorage.setItem(CLE_PREF, "0");
    } catch {}
    if (moi) await desabonnerPush(moi);
    window.dispatchEvent(new Event("planiroom:notifications"));
  }, [moi]);

  return { etat, activer, desactiver };
}

/** Affiche une notification sur le téléphone (appli ouverte ou en arrière-plan). */
export async function afficherNotification(titre: string, corps: string, conversationId: string) {
  if (lireEtat() !== "actif") return;
  const options: NotificationOptions = {
    body: corps,
    icon: `${BASE}/icon-192.png`,
    badge: `${BASE}/icon-192.png`,
    tag: `conv-${conversationId}`,
    data: { url: `${BASE}/messages/conversation/?id=${conversationId}` },
  };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) return await reg.showNotification(titre, options);
    new Notification(titre, options);
  } catch {}
}

/** Prévient le service de notifications qu'un message vient d'être envoyé (appli fermée chez les autres). */
export function signalerMessage(m: Message) {
  if (!NOTIF_URL || !PARTAGE_ACTIF) return;
  // Petit délai : le message doit d'abord être arrivé dans Firebase.
  setTimeout(() => {
    fetch(NOTIF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: m.conversationId, messageId: m.id }),
      keepalive: true,
    }).catch(() => {});
  }, 1500);
}
