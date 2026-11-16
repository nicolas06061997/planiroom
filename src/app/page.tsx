"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InstallationAuto } from "@/components/Installation";
import { Chargement } from "@/components/shell";
import { Avatar } from "@/components/ui";
import { BASE, NOM_APPLI } from "@/config";
import { formatJourLong, today } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Session } from "@/lib/types";

/**
 * Choix du profil.
 * Bêta : pas encore de mot de passe, chacune choisit son nom.
 */
export default function Accueil() {
  const { pret, session, setSession, donnees } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (pret && session) router.replace(session.role === "gouvernante" ? "/planning/" : "/mes-taches/");
  }, [pret, session, router]);

  if (!pret || session) return <Chargement />;

  const choisir = (s: Session) => setSession(s);

  return (
    <main className="min-h-ecran flex flex-col bg-white">
      {/* Bandeau d'accueil */}
      <div className="hero pt-safe relative overflow-hidden px-6 pb-16 text-white">
        <span aria-hidden className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/[0.06]" />
        <div className="relative mx-auto max-w-md animate-apparition pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/icon.svg`} alt="" className="h-16 w-16 rounded-2xl shadow-flottant ring-4 ring-white/20" />
          <p className="mt-7 text-[13px] font-semibold uppercase tracking-wider text-white/70">Hôtel du Casino · Dinant</p>
          <h1 className="mt-1 text-[34px] font-extrabold leading-[1.05] tracking-tight">
            {NOM_APPLI.split(" ")[0]}
            <span className="block text-white/80">{NOM_APPLI.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="mt-1 text-[17px] text-white/85">{formatJourLong(today())}</p>
        </div>
      </div>

      {/* Choix du profil */}
      <div className="pb-safe relative -mt-8 flex-1 rounded-t-4xl bg-white px-5 pt-7">
        <div className="mx-auto max-w-md animate-apparition" style={{ animationDelay: "80ms" }}>
          <h2 className="px-1 text-[22px] font-bold tracking-tight text-encre">Qui êtes-vous ?</h2>
          <p className="mt-1 px-1 text-[15px] text-doux">Touchez votre prénom pour commencer.</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {donnees.employees
              .filter((e) => e.actif)
              .map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => choisir({ role: "employee", employeeId: e.id })}
                  className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2.5 rounded-3xl border border-black/[0.04] bg-fond px-3 py-4 transition active:scale-[0.97]"
                >
                  <Avatar prenom={e.prenom} couleur={e.couleur} taille={52} />
                  <span className="text-base font-semibold text-encre">{e.prenom}</span>
                </button>
              ))}
          </div>

          <button
            type="button"
            onClick={() => choisir({ role: "gouvernante" })}
            className="mt-3 flex min-h-[4.5rem] w-full items-center gap-4 rounded-3xl bg-encre px-5 text-left text-white transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
              <ShieldCheck className="h-5.5 w-5.5" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Gouvernante</span>
              <span className="block text-[13px] text-white/60">Planning, répartition, réglages</span>
            </span>
            <ChevronRight className="h-5 w-5 text-white/50" />
          </button>

          <p className="pb-6 pt-8 text-center text-xs text-pale">Version bêta</p>
        </div>
      </div>
      <InstallationAuto />
    </main>
  );
}
