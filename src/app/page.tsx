"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Chargement } from "@/components/shell";
import { Avatar } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Session } from "@/lib/types";

/**
 * Choix du profil.
 * Bêta : pas encore de mot de passe, chacune choisit son nom.
 * La vraie connexion arrivera avec la base de données en ligne.
 */
export default function Accueil() {
  const { pret, session, setSession, donnees } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (pret && session) {
      router.replace(session.role === "gouvernante" ? "/planning" : "/mes-taches");
    }
  }, [pret, session, router]);

  if (!pret || session) return <Chargement />;

  const choisir = (s: Session) => setSession(s);

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <div className="animate-apparition pt-14 pb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="mb-6 size-14 rounded-2xl shadow-carte" />
        <p className="text-[13px] font-semibold tracking-wide text-primaire uppercase">
          Hôtel du Casino · Dinant
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-tight text-encre">
          Planning ménage
        </h1>
        <p className="mt-2 text-[15px] text-doux">Qui êtes-vous ?</p>
      </div>

      <div className="animate-apparition flex flex-col gap-2.5" style={{ animationDelay: "60ms" }}>
        <BoutonProfil
          onClick={() => choisir({ role: "gouvernante" })}
          titre="Gouvernante"
          sousTitre="Planning, répartition, réglages"
          visuel={
            <span className="flex size-11 items-center justify-center rounded-full bg-primaire text-white">
              <ShieldCheck className="size-5" />
            </span>
          }
        />

        <p className="mt-5 mb-1 px-1 text-[13px] font-semibold tracking-wide text-doux uppercase">
          Femmes de chambre
        </p>
        {donnees.employees
          .filter((e) => e.actif)
          .map((e) => (
            <BoutonProfil
              key={e.id}
              onClick={() => choisir({ role: "employee", employeeId: e.id })}
              titre={e.prenom}
              visuel={<Avatar prenom={e.prenom} couleur={e.couleur} taille={44} />}
            />
          ))}
      </div>

      <p className="mt-auto pt-10 pb-6 text-center text-xs text-pale">Version bêta</p>
    </main>
  );
}

function BoutonProfil({
  titre,
  sousTitre,
  visuel,
  onClick,
}: {
  titre: string;
  sousTitre?: string;
  visuel: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-16 items-center gap-3.5 rounded-2xl border border-bord/70 bg-white px-4 py-3 text-left shadow-carte transition-[transform,box-shadow] active:scale-[0.99] hover:shadow-flottant"
    >
      {visuel}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-encre">{titre}</span>
        {sousTitre && <span className="block text-[13px] text-doux">{sousTitre}</span>}
      </span>
      <ChevronRight className="size-5 text-pale" />
    </button>
  );
}
