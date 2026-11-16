"use client";

import { useEffect } from "react";
import { BASE, VERSION } from "@/config";
import { capterInvitation } from "./Installation";

if (typeof window !== "undefined") capterInvitation();

/** Active le "service worker" : appli installable et utilisable avec un réseau faible. */
export function EnregistrementSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${BASE}/sw.js?v=${VERSION}`).catch(() => {});
    }
    try {
      navigator.storage?.persist?.();
    } catch {}
  }, []);
  return null;
}
