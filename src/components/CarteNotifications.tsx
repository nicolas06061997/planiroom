"use client";

import { Bell, BellOff, BellRing, Smartphone } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/lib/notifications";
import { moiDe, useStore } from "@/lib/store";
import { EcranInstallation } from "./Installation";
import { Bouton, cx, Interrupteur } from "./ui";

/** Carte « Activer les notifications » (page Messages). Disparaît une fois activées. */
export function CarteNotifications({ className }: { className?: string }) {
  const { session } = useStore();
  const { etat, activer } = useNotifications(moiDe(session));
  const [installer, setInstaller] = useState(false);

  if (etat === "actif" || etat === "non-supporte") return null;
  return (
    <>
      <div className={cx("flex animate-apparition items-start gap-3.5 rounded-3xl border border-black/[0.04] bg-white p-4 shadow-carte", className)}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-conge-clair text-conge">
          {etat === "refuse" ? <BellOff className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-encre">
            {etat === "refuse" ? "Notifications bloquées" : "Être prévenue des messages"}
          </p>
          <p className="mt-0.5 text-[14px] leading-snug text-doux">
            {etat === "installer-iphone"
              ? "Sur iPhone, installez d'abord l'appli sur l'écran d'accueil, puis activez les notifications."
              : etat === "refuse"
                ? "Pour les recevoir, autorisez les notifications pour cette appli dans les réglages du téléphone."
                : "Une notification sur le téléphone quand quelqu'un vous écrit."}
          </p>
          {etat === "inactif" && (
            <Bouton className="mt-3" icone={<Bell className="h-4.5 w-4.5" />} onClick={activer}>
              Activer
            </Bouton>
          )}
          {etat === "installer-iphone" && (
            <Bouton className="mt-3" icone={<Smartphone className="h-4.5 w-4.5" />} onClick={() => setInstaller(true)}>
              Installer l&apos;appli
            </Bouton>
          )}
        </div>
      </div>
      {installer && <EcranInstallation onFermer={() => setInstaller(false)} />}
    </>
  );
}

/** Ligne avec interrupteur (menu profil). */
export function LigneNotifications() {
  const { session } = useStore();
  const { etat, activer, desactiver } = useNotifications(moiDe(session));
  if (etat === "non-supporte" || etat === "installer-iphone") return null;
  return (
    <div className="flex min-h-14 items-center gap-3.5 rounded-2xl px-3 py-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fond text-texte">
        <Bell className="h-5 w-5" />
      </span>
      <span className="flex-1 text-[15px] font-semibold text-encre">
        Notifications des messages
        {etat === "refuse" && <span className="block text-[13px] font-normal text-doux">Bloquées dans les réglages du téléphone</span>}
      </span>
      <Interrupteur actif={etat === "actif"} onChange={(v) => (v ? activer() : desactiver())} label="Notifications des messages" />
    </div>
  );
}
