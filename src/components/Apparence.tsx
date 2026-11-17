"use client";

/**
 * Apparence propre à chaque téléphone (comme dans Céline) :
 * couleur principale + fond (doux par défaut, ou photo personnelle floutée).
 */
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { preparerImage } from "@/lib/image";
import { chargerPhoto, enregistrerPhoto } from "@/lib/photos";
import { moiDe, useStore } from "@/lib/store";
import { changerFond, changerTheme, lireFond, lireTheme, PALETTE, type ReglageFond } from "@/lib/theme";
import { Bouton, cx, Feuille, Interrupteur } from "./ui";

function useFond() {
  const [fond, setFond] = useState<ReglageFond>({ flou: true });
  useEffect(() => {
    const maj = () => setFond(lireFond());
    maj();
    window.addEventListener("planiroom:fond", maj);
    return () => window.removeEventListener("planiroom:fond", maj);
  }, []);
  return fond;
}

/** Fond de toute l'appli, fixé derrière le contenu. */
export function FondEcran() {
  const fond = useFond();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {fond.photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fond.photo}
            alt=""
            className="h-full w-full object-cover"
            style={fond.flou ? { filter: "blur(14px)", transform: "scale(1.08)" } : undefined}
          />
          <div className="absolute inset-0 bg-fond/55" />
        </>
      ) : (
        <div className="fond-doux h-full w-full" />
      )}
    </div>
  );
}

/** Fenêtre « Couleurs » ouverte par le bouton palette. */
export function FeuilleApparence({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const { session, majProfil } = useStore();
  const moi = moiDe(session);
  const [couleur, setCouleur] = useState(lireTheme());
  const fond = useFond();
  const [erreur, setErreur] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ouverte) setCouleur(lireTheme());
  }, [ouverte]);

  const choisirPhoto = async (f: File | undefined) => {
    if (!f) return;
    setErreur(null);
    try {
      const img = await preparerImage(f, 1400, 0.72);
      const id = `fond-${moi ?? "inconnu"}-${Date.now().toString(36)}`;
      if (!changerFond({ ...fond, photo: img.apercu, id })) {
        setErreur("Cette photo est trop lourde pour ce téléphone.");
        return;
      }
      // Gardée aussi en ligne : elle revient même si le téléphone est vidé.
      enregistrerPhoto(id, img.apercu);
      if (moi) majProfil(moi, (p) => ({ ...p, fondPhoto: id, fondFlou: fond.flou }));
    } catch {
      setErreur("Cette photo n'a pas pu être ouverte.");
    }
  };

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="🎨 Couleurs" pied={<Bouton pleineLargeur taille="grand" onClick={onFermer}>Terminé</Bouton>}>
      <p className="mb-4 text-[14px] text-doux">Ces réglages ne changent que sur ce téléphone.</p>

      <p className="mb-2.5 text-[13px] font-bold uppercase tracking-wider text-doux">Couleur</p>
      <div className="grid grid-cols-4 gap-3">
        {PALETTE.map((p) => {
          const actif = p.hex.toLowerCase() === couleur.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => {
                setCouleur(p.hex);
                changerTheme(p.hex);
                if (moi) majProfil(moi, (pr) => ({ ...pr, couleur: p.hex }));
              }}
              aria-pressed={actif}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cx("flex h-14 w-14 items-center justify-center rounded-full text-white shadow-carte transition", actif && "ring-4 ring-offset-2")}
                style={{ background: p.hex, ...(actif ? { ["--tw-ring-color" as string]: p.hex } : {}) }}
              >
                {actif && <Check className="h-6 w-6" strokeWidth={3} />}
              </span>
              <span className={cx("text-[12px]", actif ? "font-bold text-encre" : "text-doux")}>{p.nom}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-2.5 mt-7 text-[13px] font-bold uppercase tracking-wider text-doux">Fond d&apos;écran</p>
      <input ref={fichier} type="file" accept="image/*" className="hidden" onChange={(e) => { choisirPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex items-center gap-3">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-2xl border border-bord shadow-carte">
          {fond.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fond.photo} alt="Fond actuel" className="h-full w-full object-cover" style={fond.flou ? { filter: "blur(3px)" } : undefined} />
          ) : (
            <div className="fond-doux h-full w-full" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Bouton variante="secondaire" icone={<ImagePlus className="h-4.5 w-4.5" />} onClick={() => fichier.current?.click()}>
            {fond.photo ? "Changer la photo" : "Mettre une photo"}
          </Bouton>
          {fond.photo && (
            <Bouton variante="fantome" icone={<Trash2 className="h-4.5 w-4.5" />} onClick={() => {
                changerFond({ flou: fond.flou });
                if (moi) majProfil(moi, (p) => ({ ...p, fondPhoto: undefined }));
              }}>
              Fond doux
            </Bouton>
          )}
        </div>
      </div>
      {fond.photo && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-fond px-4 py-1">
          <span className="text-[15px] font-medium text-encre">Flouter la photo</span>
          <Interrupteur
            actif={fond.flou}
            onChange={(v) => {
              changerFond({ ...fond, flou: v });
              if (moi) majProfil(moi, (p) => ({ ...p, fondFlou: v }));
            }}
            label="Flouter la photo"
          />
        </div>
      )}
      {erreur && <p className="mt-3 text-sm text-red-700">{erreur}</p>}
    </Feuille>
  );
}

/**
 * Remet les réglages personnels gardés en ligne (couleur, photo de fond, notifications)
 * quand ils manquent sur ce téléphone : après un historique effacé, un nouveau téléphone, etc.
 */
export function RestaurerProfil() {
  const { donnees, session, majProfil } = useStore();
  const moi = moiDe(session);
  const profil = moi ? donnees.profils?.[moi] : undefined;

  // Couleur
  useEffect(() => {
    if (!moi) return;
    if (profil?.couleur) {
      if (profil.couleur.toLowerCase() !== lireTheme().toLowerCase()) changerTheme(profil.couleur);
    } else {
      // Couleur choisie avant cette version : on la garde en ligne.
      let locale: string | null = null;
      try {
        locale = localStorage.getItem("planiroom:theme");
      } catch {}
      if (locale) majProfil(moi, (p) => ({ ...p, couleur: locale! }));
    }
  }, [moi, profil?.couleur, majProfil]);

  // Photo de fond
  useEffect(() => {
    if (!moi || !profil) return;
    const local = lireFond();
    if (profil.fondPhoto && local.id !== profil.fondPhoto) {
      let actif = true;
      chargerPhoto(profil.fondPhoto).then((photo) => {
        if (actif && photo) changerFond({ photo, id: profil.fondPhoto, flou: profil.fondFlou ?? true });
      });
      return () => {
        actif = false;
      };
    }
    if (!profil.fondPhoto && local.id) changerFond({ flou: local.flou }); // retirée sur un autre téléphone
    if (profil.fondPhoto && profil.fondFlou !== undefined && profil.fondFlou !== local.flou) changerFond({ ...local, flou: profil.fondFlou });
  }, [moi, profil]);

  // Notifications : si la personne les avait activées et que le téléphone l'autorise encore.
  useEffect(() => {
    if (!profil?.notifs || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      if (localStorage.getItem("planiroom:notifications") !== "1") {
        localStorage.setItem("planiroom:notifications", "1");
        window.dispatchEvent(new Event("planiroom:notifications"));
      }
    } catch {}
  }, [profil?.notifs]);

  return null;
}
