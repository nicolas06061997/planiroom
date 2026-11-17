"use client";

/**
 * Installation de l'appli sur le téléphone (même principe que l'appli Céline) :
 * - Android + Chrome : bouton « Installer » qui ouvre directement la fenêtre d'installation ;
 * - lien ouvert depuis une autre appli (WhatsApp, Messenger, Gmail, Claude…) :
 *   bouton « Ouvrir dans Chrome / Safari » d'abord ;
 * - iPhone : Apple n'autorise pas l'installation automatique, on guide pas à pas.
 * L'invitation d'Android est captée très tôt par un petit script dans <head> (layout.tsx).
 */
import { Check, Compass, Copy, Download, EllipsisVertical, Menu, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BASE, NOM_APPLI } from "@/config";
import { Bouton, cx } from "./ui";

interface InvitationInstall extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

declare global {
  interface Window {
    __invitationInstall?: InvitationInstall | null;
  }
}

/** Script à placer dans <head> : garde l'invitation d'installation dès qu'elle arrive. */
export const SCRIPT_INVITATION = `window.__invitationInstall=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__invitationInstall=e;dispatchEvent(new Event('planiroom:install'))});addEventListener('appinstalled',function(){window.__invitationInstall=null;dispatchEvent(new Event('planiroom:install'))});`;

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

const UA_APPLI = /; wv\)|FBAN|FBAV|FB_IAB|Messenger|Instagram|WhatsApp|Snapchat|musical_ly|TikTok|Line\/|GSA\/|LinkedInApp|Twitter/;

function detecter(): Contexte {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Lien ouvert depuis une appli Android (fenêtre Chrome « intégrée ») : référent android-app://
  const appli = UA_APPLI.test(ua) || document.referrer.startsWith("android-app://");
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

function nomAppliSource() {
  const ua = navigator.userAgent;
  if (/WhatsApp/.test(ua)) return "WhatsApp";
  if (/Messenger|FBAN|FBAV|FB_IAB/.test(ua)) return "Messenger / Facebook";
  if (/Instagram/.test(ua)) return "Instagram";
  if (/Snapchat/.test(ua)) return "Snapchat";
  return "une autre application";
}

const adresseAppli = () => window.location.origin + BASE + "/";

function ouvrirDansChrome() {
  const u = adresseAppli();
  window.location.href = `intent://${u.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u)};end`;
}

function ouvrirDansSafari() {
  window.location.href = `x-safari-${adresseAppli()}`;
}

/** Suit l'invitation d'installation d'Android (arrive parfois quelques secondes après l'ouverture). */
function useInvitation() {
  const [invitation, setInvitation] = useState<InvitationInstall | null>(null);
  useEffect(() => {
    const maj = () => setInvitation(window.__invitationInstall ?? null);
    maj();
    window.addEventListener("planiroom:install", maj);
    return () => window.removeEventListener("planiroom:install", maj);
  }, []);
  return invitation;
}

export function EcranInstallation({ onFermer }: { onFermer: () => void }) {
  const [contexte, setContexte] = useState<Contexte>("ordinateur");
  const [copie, setCopie] = useState(false);
  const invitation = useInvitation();

  useEffect(() => {
    setContexte(detecter());
  }, []);

  const installer = async () => {
    if (!invitation) return;
    await invitation.prompt();
    const choix = await invitation.userChoice;
    window.__invitationInstall = null;
    if (choix.outcome === "accepted") onFermer();
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(adresseAppli());
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      window.prompt("Copiez ce lien :", adresseAppli());
    }
  };

  const boutonCopier = (
    <Bouton variante="secondaire" pleineLargeur className="mt-3" icone={copie ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} onClick={copier}>
      {copie ? "Lien copié" : "Copier le lien"}
    </Bouton>
  );

  let titre = `Installez ${NOM_APPLI}`;
  let texte = "Elle sera sur l'écran d'accueil de votre téléphone, comme une vraie application, en plein écran.";
  let contenu: ReactNode;

  if (invitation && (contexte === "android" || contexte === "samsung")) {
    contenu = (
      <Bouton taille="grand" pleineLargeur icone={<Download className="h-5 w-5" />} onClick={installer}>
        Installer l&apos;application
      </Bouton>
    );
  } else if (contexte === "android-appli") {
    titre = "Encore une petite étape";
    texte = `Le lien s'est ouvert dans ${nomAppliSource()}. Pour installer l'appli, il faut l'ouvrir dans Chrome.`;
    contenu = (
      <>
        <Bouton taille="grand" pleineLargeur icone={<Compass className="h-5 w-5" />} onClick={ouvrirDansChrome}>
          Ouvrir dans Chrome
        </Bouton>
        <Etapes
          titre="Si rien ne s'ouvre"
          etapes={[
            <>Touchez <EllipsisVertical className="inline h-4 w-4 align-middle" /> en haut à droite</>,
            <>Choisissez <b>« Ouvrir dans Chrome »</b></>,
          ]}
        />
      </>
    );
  } else if (contexte === "ios-appli") {
    titre = "Encore une petite étape";
    texte = `Le lien s'est ouvert dans ${nomAppliSource()}. Pour installer l'appli, il faut l'ouvrir dans Safari.`;
    contenu = (
      <>
        <Bouton taille="grand" pleineLargeur icone={<Compass className="h-5 w-5" />} onClick={ouvrirDansSafari}>
          Ouvrir dans Safari
        </Bouton>
        <Etapes
          titre="Si rien ne s'ouvre"
          etapes={[
            <>Touchez <b>•••</b> ou <Share className="inline h-4 w-4 align-middle" /> en haut ou en bas de l&apos;écran</>,
            <>Choisissez <b>« Ouvrir dans Safari »</b></>,
          ]}
        />
        {boutonCopier}
      </>
    );
  } else if (contexte === "ios-safari" || contexte === "ios-autre-navigateur") {
    texte = "3 petites étapes et elle sera sur votre écran d'accueil, comme une vraie application :";
    contenu = (
      <Etapes
        etapes={[
          <>
            Touchez le bouton <b>Partager</b>{" "}
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primaire-clair align-middle text-primaire">
              <Share className="h-4 w-4" />
            </span>{" "}
            {contexte === "ios-safari" ? (
              <>
                en bas de l&apos;écran <span className="text-doux">(ou <b>•••</b> en bas à droite, puis Partager)</span>
              </>
            ) : (
              "dans la barre d'adresse"
            )}
          </>,
          <>
            Faites défiler et touchez <b>« Sur l&apos;écran d&apos;accueil »</b> <PlusSquare className="inline h-4 w-4 align-middle" />
          </>,
          <>Touchez <b>« Ajouter »</b> en haut à droite</>,
        ]}
      />
    );
  } else if (contexte === "android" || contexte === "samsung") {
    // Chrome n'a pas (encore) proposé l'installation : on montre le menu, et la sortie vers Chrome.
    contenu = (
      <>
        <div className="flex items-center gap-3 rounded-3xl bg-fond p-4 text-[15px] text-doux">
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primaire/20 border-t-primaire" />
          Préparation de l&apos;installation…
        </div>
        <Etapes
          titre="Ou à la main"
          etapes={
            contexte === "samsung"
              ? [
                  <>Touchez le menu <Menu className="inline h-4 w-4 align-middle" /> en bas à droite</>,
                  <>Touchez <b>« Ajouter page à »</b> puis <b>« Écran d&apos;accueil »</b></>,
                ]
              : [
                  <>Touchez <EllipsisVertical className="inline h-4 w-4 align-middle" /> en haut à droite de Chrome</>,
                  <>Choisissez <b>« Installer l&apos;application »</b> ou <b>« Ajouter à l&apos;écran d&apos;accueil »</b></>,
                ]
          }
        />
        <Bouton variante="secondaire" pleineLargeur className="mt-3" icone={<Compass className="h-5 w-5" />} onClick={ouvrirDansChrome}>
          Pas dans le menu ? Ouvrir dans Chrome
        </Bouton>
      </>
    );
  } else {
    titre = NOM_APPLI;
    texte = "Ouvrez ce lien sur votre téléphone pour installer l'appli :";
    contenu = (
      <>
        <span className="block break-all rounded-2xl bg-fond p-3 font-mono text-sm text-encre">{typeof window !== "undefined" ? adresseAppli() : ""}</span>
        {boutonCopier}
      </>
    );
  }

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-[60] flex animate-fondu flex-col overflow-y-auto bg-white" role="dialog" aria-modal aria-label={titre}>
      <div className="hero relative px-6 pb-12 pt-6 text-white">
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
        <h2 className="mt-5 text-[28px] font-bold leading-tight tracking-tight">{titre}</h2>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-white/85">{texte}</p>
      </div>

      <div className="relative -mt-6 flex-1 rounded-t-4xl bg-white px-6 pt-7">
        <div className="mx-auto max-w-md">
          {contenu}
          <button
            type="button"
            onClick={onFermer}
            className="mx-auto mt-8 block min-h-12 px-6 text-[15px] font-semibold text-doux"
          >
            Plus tard
          </button>
        </div>
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primaire text-sm font-bold text-white">{i + 1}</span>
            <span className="pt-1 text-[15px] leading-relaxed text-encre">{e}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const CLE_PLUS_TARD = "planiroom:installation";
const CLE_BANDEAU = "planiroom:bandeau-installation";

function lireNombre(cle: string) {
  try {
    return Number(localStorage.getItem(cle) ?? 0);
  } catch {
    return 0;
  }
}

function ecrireMaintenant(cle: string) {
  try {
    localStorage.setItem(cle, String(Date.now()));
  } catch {}
}

/**
 * Écran d'installation qui s'ouvre tout seul à l'ouverture du lien sur un téléphone
 * (une fois par jour au maximum si on touche « Plus tard »), comme dans Céline.
 */
export function InstallationAuto() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (estInstallee() || detecter() === "ordinateur") return;
    if (Date.now() - lireNombre(CLE_PLUS_TARD) < 24 * 3600_000) return;
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <EcranInstallation
      onFermer={() => {
        ecrireMaintenant(CLE_PLUS_TARD);
        setVisible(false);
      }}
    />
  );
}

/** Carte « Installez l'appli » (tant qu'elle n'est pas installée). */
export function BandeauInstallation({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  const [ecran, setEcran] = useState(false);
  const invitation = useInvitation();

  useEffect(() => {
    if (estInstallee()) return;
    if (Date.now() - lireNombre(CLE_BANDEAU) < 7 * 24 * 3600_000) return;
    setVisible(true);
  }, []);

  if (!visible) return null;
  return (
    <>
      <div className={cx("flex animate-apparition items-center gap-3 rounded-3xl border border-primaire/15 bg-primaire-clair p-3 pl-4", className)}>
        <button type="button" onClick={() => setEcran(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primaire text-white shadow-bouton">
            <Smartphone className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold text-encre">Installez l&apos;appli</span>
            <span className="block text-[13px] text-primaire-fonce">{invitation ? "Touchez ici pour l'installer" : "Touchez ici pour voir comment"}</span>
          </span>
        </button>
        <button
          type="button"
          aria-label="Masquer"
          onClick={() => {
            ecrireMaintenant(CLE_BANDEAU);
            setVisible(false);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primaire-fonce hover:bg-white/60"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {ecran && <EcranInstallation onFermer={() => setEcran(false)} />}
    </>
  );
}
