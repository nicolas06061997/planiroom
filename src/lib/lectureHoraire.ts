/** Format échangé entre l'écran "Horaire" et le serveur qui lit les captures. */
import { z } from "zod";

export const JourLuSchema = z.object({
  date: z.string().describe("Date au format AAAA-MM-JJ"),
  debut: z.string().nullable().describe("Heure de début HH:MM, ou null si congé"),
  fin: z.string().nullable().describe("Heure de fin HH:MM, ou null si congé"),
  conge: z.boolean().describe("true si jour de congé / repos / pas de service"),
});

export const HoraireLuSchema = z.object({
  jours: z.array(JourLuSchema),
});

export type JourLu = z.infer<typeof JourLuSchema>;

export interface ReponseLecture {
  jours: JourLu[];
  /** true quand aucune clé API n'est configurée : horaire d'exemple. */
  demo?: boolean;
  erreur?: string;
}
