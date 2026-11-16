import { writeFileSync } from "node:fs";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

/**
 * L'appli est exportée en pages statiques : elle peut être publiée
 * gratuitement sur GitHub Pages (comme l'appli Céline).
 */
export default function config(phase: string): NextConfig {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  // Numéro de version : change à chaque publication (sert aux mises à jour automatiques).
  const version =
    process.env.NEXT_PUBLIC_VERSION ??
    (phase === PHASE_PRODUCTION_BUILD ? new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "") : "dev");

  if (phase === PHASE_PRODUCTION_BUILD) {
    writeFileSync("public/version.json", JSON.stringify({ v: version }) + "\n");
  }

  return {
    output: "export",
    basePath: base || undefined,
    trailingSlash: true,
    images: { unoptimized: true },
    reactStrictMode: true,
    env: { NEXT_PUBLIC_VERSION: version, NEXT_PUBLIC_BASE_PATH: base },
  };
}
