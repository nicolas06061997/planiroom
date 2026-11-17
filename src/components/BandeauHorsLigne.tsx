"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { PARTAGE_ACTIF } from "@/config";
import { cx } from "./ui";

/** Petit bandeau discret quand le téléphone n'a plus internet (l'appli continue de fonctionner). */
export function BandeauHorsLigne({ pleinEcran }: { pleinEcran?: boolean }) {
  const [horsLigne, setHorsLigne] = useState(false);
  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  if (!horsLigne) return null;
  return (
    <div
      role="status"
      className={cx(
        "pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4",
        pleinEcran ? "top-[calc(4.25rem+env(safe-area-inset-top,0px))]" : "top-[calc(0.5rem+env(safe-area-inset-top,0px))]"
      )}
    >
      <p className="flex animate-apparition items-center gap-2 whitespace-nowrap rounded-full bg-encre/90 px-4 py-2 text-[13px] font-medium text-white shadow-flottant">
        <WifiOff className="h-4 w-4 shrink-0" />
        {PARTAGE_ACTIF ? "Hors connexion · envoi au retour du réseau" : "Hors connexion · tout fonctionne"}
      </p>
    </div>
  );
}
