"use client";

import { CloudDownload, WifiOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { Bouton } from "./ui";

/**
 * Affiché quand le téléphone a été vidé (historique Chrome effacé, nouveau téléphone…)
 * pendant que l'appli récupère toutes les données en ligne.
 */
export function EcranRecuperation() {
  const { synchro } = useStore();
  const horsLigne = synchro === "horsligne";
  return (
    <main className="min-h-ecran fond-doux flex flex-col items-center justify-center px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primaire text-white shadow-bouton">
        {horsLigne ? <WifiOff className="h-9 w-9" /> : <CloudDownload className="h-9 w-9" />}
      </div>
      <h1 className="mt-6 text-[22px] font-bold tracking-tight text-encre">
        {horsLigne ? "Pas de connexion internet" : "On récupère vos données…"}
      </h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-doux">
        {horsLigne
          ? "Rien n'est perdu : tout est gardé en ligne. Connectez-vous au wifi ou aux données mobiles, puis réessayez."
          : "Horaires, tâches, messages et réglages reviennent tout seuls. Quelques secondes."}
      </p>
      {horsLigne ? (
        <Bouton taille="grand" className="mt-7" onClick={() => window.location.reload()}>
          Réessayer
        </Bouton>
      ) : (
        <div className="mt-7 h-8 w-8 animate-spin rounded-full border-3 border-primaire/20 border-t-primaire" />
      )}
    </main>
  );
}
