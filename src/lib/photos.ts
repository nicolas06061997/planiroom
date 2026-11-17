"use client";

/**
 * Photos du chat.
 *
 * Elles sont rangées À PART des autres données (sinon chaque téléphone
 * retéléchargerait toutes les photos toutes les 30 secondes) :
 * - sur le téléphone : base IndexedDB (place largement suffisante) ;
 * - partagées : Firebase `photos/<CODE_HOTEL>/<id>`, téléchargées une seule fois.
 */
import { useEffect, useState } from "react";
import { CODE_HOTEL, FIREBASE_URL, PARTAGE_ACTIF } from "@/config";

const BASE_IDB = "planiroom";
const MAGASIN = "photos";
const CLE_ATTENTE = "planiroom:photos-attente";
const memoire = new Map<string, string>();

function ouvrir(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const req = indexedDB.open(BASE_IDB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function idbLire(id: string): Promise<string | null> {
  const db = await ouvrir();
  if (!db) return null;
  return new Promise((ok) => {
    try {
      const r = db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(id);
      r.onsuccess = () => ok((r.result as string) ?? null);
      r.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function idbEcrire(id: string, valeur: string): Promise<void> {
  const db = await ouvrir();
  if (!db) return;
  await new Promise<void>((ok) => {
    try {
      const t = db.transaction(MAGASIN, "readwrite");
      t.objectStore(MAGASIN).put(valeur, id);
      t.oncomplete = () => ok();
      t.onerror = () => ok();
    } catch {
      ok();
    }
  });
}

const urlPhoto = (id: string) => `${FIREBASE_URL}/photos/${CODE_HOTEL}/${id}.json`;

function lireAttente(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_ATTENTE) ?? "[]");
  } catch {
    return [];
  }
}
function ecrireAttente(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(CLE_ATTENTE, JSON.stringify(ids));
    else localStorage.removeItem(CLE_ATTENTE);
  } catch {}
}

async function televerser(id: string, dataUrl: string): Promise<boolean> {
  try {
    const r = await fetch(urlPhoto(id), { method: "PUT", body: JSON.stringify(dataUrl) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Enregistre une photo prise sur ce téléphone (et l'envoie aux autres si le partage est actif). */
export async function enregistrerPhoto(id: string, dataUrl: string) {
  memoire.set(id, dataUrl);
  await idbEcrire(id, dataUrl);
  if (!PARTAGE_ACTIF) return;
  if (!(await televerser(id, dataUrl))) ecrireAttente([...new Set([...lireAttente(), id])]);
}

/** Renvoie les photos qui n'ont pas pu partir (pas de réseau au moment de l'envoi). */
export async function renvoyerPhotosEnAttente() {
  if (!PARTAGE_ACTIF) return;
  const restantes: string[] = [];
  for (const id of lireAttente()) {
    const d = memoire.get(id) ?? (await idbLire(id));
    if (d && !(await televerser(id, d))) restantes.push(id);
  }
  ecrireAttente(restantes);
}

/** Contenu d'une photo : mémoire, puis téléphone, puis Firebase (une seule fois). */
export async function chargerPhoto(id: string): Promise<string | null> {
  if (memoire.has(id)) return memoire.get(id)!;
  const locale = await idbLire(id);
  if (locale) {
    memoire.set(id, locale);
    return locale;
  }
  if (!PARTAGE_ACTIF) return null;
  try {
    const r = await fetch(urlPhoto(id));
    const d = r.ok ? ((await r.json()) as string | null) : null;
    if (d && d.startsWith("data:image/")) {
      memoire.set(id, d);
      await idbEcrire(id, d);
      return d;
    }
  } catch {}
  return null;
}

export function usePhoto(id: string | undefined) {
  const [src, setSrc] = useState<string | null>(id ? memoire.get(id) ?? null : null);
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    if (!id) return;
    let actif = true;
    let essais = 0;
    const essayer = async () => {
      const d = await chargerPhoto(id);
      if (!actif) return;
      if (d) setSrc(d);
      else if (++essais < 6) setTimeout(essayer, 3000 * essais); // la photo est peut-être encore en route
      else setEchec(true);
    };
    essayer();
    return () => {
      actif = false;
    };
  }, [id]);
  return { src, echec };
}
