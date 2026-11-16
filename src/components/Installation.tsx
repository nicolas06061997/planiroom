"use client";

/**
 * Écran « Installer l'appli » adapté au téléphone (comme dans Céline) :
 * iPhone (Safari, Chrome, ou lien ouvert depuis WhatsApp/Messenger),
 * Android (Chrome, Samsung, ou lien ouvert depuis une autre appli).
 * Un iPhone ne permet pas d'installer automatiquement : on guide pas à pas.
 */
import { Compass, Download, EllipsisVertical, Menu, PlusSquare, Share, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BASE, NOM_APPLI } from "@/config";
import { Bouton } from "./ui";

interface InvitationInstall extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

declare global {
  interface Window {
    __invitationInstall?: InvitationInstall | null;
  }
}

/** À appeler une fois au démarrage : garde l'invitation d'installation d'Android. */
export function capterInvitation() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__invitationInstall = e as InvitationInstall;
    window.dispatchEvent(new Event("planiroom:install"));
  });
  window.addEventListener("appinstalled", () => {
    window.__invitationInstall = null;
  });
}

export function estInstallee() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

type Contexte = "ios-safari" | "ios-autre-navigateur" | "ios-appli" | "android" | "android-appli" | "samsung" | "ordinateur";

function detecter(): Contexte {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const appli = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Messenger|Line\/|Snapchat|TikTok|; wv\)/.test(ua);
  if (ios) {
    if (appli) return "ios-appli";
    if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return "ios-autre-navigateur";
    return "ios-safari";
  }
  if (/Android/.test(ua)) {
    if (appli) return "android-appli";
    if (/SamsungBrowser/.test(ua)) return "samsung";
    return "android";
  }
  return "ordinateur";
}

export function EcranInstallation({ onFermer }: { onFermer: () => void }) {
  const [contexte, setContexte] = useState<Contexte>("ordinateur");
  const [invitation, setInvitation] = useState<InvitationInstall | null>(null);

  useEffect(() => {
    setContexte(detecter());
    setInvitation(window.__invitationInstall ?? null);
    const maj = () => setInvitation(window.__invitationInstall ?? null);
    window.addEventListener("planiroom:install", maj);
    return () => window.removeEventListener("planiroom:install", maj);
  }, []);

  const adresse = typeof window !== "undefined" ? window.location.origin + BASE + "/" : "";
  const sansProtocole = adresse.replace(/^https?:\/\//, "");

  const installer = async () => {
    if (!invitation) return;
    await invitation.prompt();
    const choix = await invitation.userChoice;
    if (choix.outcome === "accepted") onFermer();
  };

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-[60] flex animate-fondu flex-col overflow-y-auto bg-white">
      <div className="hero relative px-6 pb-10 pt-6 text-white">
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
        >
          <X className="h-5 w-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/icon.svg`} alt="" className="h-16 w-16 rounded-2xl shadow-flottant ring-4 ring-white/20" />
        <h2 className="mt-5 text-[28px] font-bold leading-tight tracking-tight">Installez {NOM_APPLI}</h2>
        <p className="mt-2 max-w-sm text-[15px] text-white/80">
          L&apos;appli s&apos;ouvrira comme une vraie application, en plein écran, depuis l&apos;écran d&apos;accueil du téléphone.
        </p>
      </div>

      <div className="-mt-5 flex-1 rounded-t-4xl bg-white px-6 pt-7">
        {(contexte === "android" || contexte === "samsung") && invitation && (
          <Bouton taille="grand" pleineLargeur icone={<Download className="h-5 w-5" />} onClick={installer}>
            Installer maintenant
          </Bouton>
        )}

        {contexte === "ios-appli" && (
          <>
            <p className="mb-4 text-[15px] text-texte">
              Vous avez ouvert le lien depuis une autre appli (WhatsApp, Messenger…). Il faut d&apos;abord l&apos;ouvrir dans{" "}
              <b>Safari</b>.
            </p>
            <a
              href={`x-safari-https://${sansProtocole}`}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primaire px-6 text-base font-semibold text-white shadow-bouton"
            >
              <Compass className="h-5 w-5" /> Ouvrir dans Safari
            </a>
            <Etapes
              titre="Si le bouton ne marche pas"
              etapes={[
                <>Touchez <b>•••</b> ou l&apos;icône <Share className="inline h-4 w-4" /> en bas ou en haut de l&apos;écran</>,
                <>Choisissez <b>« Ouvrir dans Safari »</b> (ou « Ouvrir dans le navigateur »)</>,
                <>Puis suivez les étapes d&apos;installation dans Safari</>,
              ]}
            />
          </>
        )}

        {(contexte === "ios-safari" || contexte === "ios-autre-navigateur") && (
          <Etapes
            etapes={[
              <>
                Touchez le bouton <b>Partager</b>{" "}
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primaire-clair align-middle text-primaire">
                  <Share className="h-4 w-4" />
                </span>{" "}
                {contexte === "ios-safari" ? "en bas de l'écran" : "en haut à droite"}
              </>,
              <>
                Faites défiler et touchez <b>« Sur l&apos;écran d&apos;accueil »</b>{" "}
                <PlusSquare className="inline h-4 w-4 align-middle" />
              </>,
              <>Touchez <b>« Ajouter »</b> en haut à droite</>,
            ]}
          />
        )}

        {contexte === "android-appli" && (
          <>
            <p className="mb-4 text-[15px] text-texte">
              Vous avez ouvert le lien depuis une autre appli. Ouvrez-le d&apos;abord dans <b>Chrome</b>.
            </p>
            <a
              href={`intent://${sansProtocole}#Intent;scheme=https;package=com.android.chrome;end`}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primaire px-6 text-base font-semibold text-white shadow-bouton"
            >
              <Compass className="h-5 w-5" /> Ouvrir dans Chrome
            </a>
          </>
        )}

        {contexte === "android" && !invitation && (
          <Etapes
            etapes={[
              <>Touchez le menu <EllipsisVertical className="inline h-4 w-4 align-middle" /> en haut à droite de Chrome</>,
              <>Touchez <b>« Installer l&apos;application »</b> ou <b>« Ajouter à l&apos;écran d&apos;accueil »</b></>,
              <>Confirmez avec <b>« Installer »</b></>,
            ]}
          />
        )}

        {contexte === "samsung" && !invitation && (
          <Etapes
            etapes={[
              <>Touchez le menu <Menu className="inline h-4 w-4 align-middle" /> en bas à droite</>,
              <>Touchez <b>« Ajouter page à »</b> puis <b>« Écran d&apos;accueil »</b></>,
              <>Confirmez avec <b>« Ajouter »</b></>,
            ]}
          />
        )}

        {contexte === "ordinateur" && (
          <p className="text-[15px] text-texte">
            Ouvrez ce lien sur votre téléphone pour installer l&apos;appli :
            <span className="mt-2 block break-all rounded-2xl bg-fond p-3 font-mono text-sm text-encre">{adresse}</span>
          </p>
        )}

        <button type="button" onClick={onFermer} className="mx-auto mt-8 block min-h-12 px-6 text-[15px] font-semibold text-doux">
          Plus tard
        </button>
      </div>
    </div>
  );
}

function Etapes({ titre, etapes }: { titre?: string; etapes: ReactNode[] }) {
  return (
    <div className={titre ? "mt-7" : ""}>
      {titre && <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-doux">{titre}</p>}
      <ol className="flex flex-col gap-3">
        {etapes.map((e, i) => (
          <li key={i} className="flex items-start gap-3.5 rounded-3xl bg-fond p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primaire text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-1 text-[15px] leading-relaxed text-encre">{e}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const CLE_PLUS_TARD = "planiroom:installation";

/** Affiche l'écran d'installation au démarrage sur téléphone (une fois par jour au maximum). */
export function InstallationAuto() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (estInstallee() || detecter() === "ordinateur") return;
    let dernier = 0;
    try {
      dernier = Number(localStorage.getItem(CLE_PLUS_TARD) ?? 0);
    } catch {}
    if (Date.now() - dernier > 24 * 3600_000) setVisible(true);
  }, []);
  if (!visible) return null;
  return (
    <EcranInstallation
      onFermer={() => {
        try {
          localStorage.setItem(CLE_PLUS_TARD, String(Date.now()));
        } catch {}
        setVisible(false);
      }}
    />
  );
}
