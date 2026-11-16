import { NOM_APPLI } from "@/config";
import { cx } from "./ui";

/** Nom de l'appli dans l'en-tête : premier mot en noir, la suite en couleur. */
export function Marque({ className }: { className?: string }) {
  const [premier, ...reste] = NOM_APPLI.split(" ");
  return (
    <span className={cx("whitespace-nowrap font-extrabold tracking-tight text-encre", className)}>
      {premier} <span className="text-primaire">{reste.join(" ")}</span>
    </span>
  );
}
