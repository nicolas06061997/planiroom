# Planiroom – Planning ménage (bêta)

Application web installable (PWA) pour l'Hôtel du Casino de Dinant :
horaires des femmes de chambre, répartition équitable des chambres et des tâches,
et liste « Mes tâches » à cocher.

## Lancer l'appli sur un ordinateur

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

Pour activer la lecture automatique des captures Shifter, copier `.env.example`
en `.env.local` et y mettre une clé API Claude. Sans clé, l'appli fonctionne en
**mode démo** (un horaire d'exemple est proposé, rien n'est payé).

## Où modifier quoi

| Je veux changer…                         | Fichier                                     |
| ---------------------------------------- | ------------------------------------------- |
| Les couleurs, la police                  | `src/app/globals.css` (bloc `@theme`)       |
| Les données d'exemple (filles, tâches…)  | `src/lib/sampleData.ts`                     |
| La règle de répartition                  | `src/lib/repartition.ts`                    |
| La lecture des captures (consignes IA)   | `src/app/api/lire-horaire/route.ts`         |
| L'enregistrement des données             | `src/lib/store.tsx`                         |
| Les boutons, cartes, feuilles…           | `src/components/ui/index.tsx`               |
| Un écran                                 | `src/app/(app)/<écran>/page.tsx`            |

Dans l'appli, la gouvernante peut déjà modifier les filles, chambres, tâches
(durée, jours, pénible), durées de ménage, linge et pause : menu profil → Réglages.

## Limites de la bêta

- Les données sont enregistrées **sur l'appareil** (pas encore partagées entre téléphones).
- Pas encore de mot de passe : chacune choisit son profil.
- Ces deux points seront réglés avec une base de données en ligne (Firebase ou Supabase, offre gratuite).
