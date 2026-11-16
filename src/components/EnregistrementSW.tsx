"use client";

import { useEffect } from "react";

/** Active le "service worker" qui permet d'installer l'appli sur le téléphone. */
export function EnregistrementSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
