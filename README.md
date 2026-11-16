# Housekeeping Infinit – Planning ménage (bêta)

Application web installable (PWA) pour l'Hôtel du Casino de Dinant :
horaires des femmes de chambre, répartition équitable des chambres et des tâches,
et liste « Mes tâches » à cocher. Fonctionne sur iPhone (iOS 15 et plus) et Android.

## Publier (gratuit, comme l'appli Céline)

1. Sur GitHub : **Settings → Pages → Source : « GitHub Actions »** (à faire une seule fois).
2. Chaque modification de la branche `main` publie l'appli en 2-3 minutes sur
   `https://<compte>.github.io/planiroom/`.
3. Les téléphones se mettent à jour tout seuls.

## Partager les données entre les téléphones

Firebase Realtime Database (offre gratuite) : même principe que Céline.
Dans GitHub : **Settings → Secrets and variables → Actions → Variables** :

| Variable       | Exemple                                                     |
| -------------- | ----------------------------------------------------------- |
| `FIREBASE_URL` | `https://planiroom-xxxx-default-rtdb.europe-west1.firebasedatabase.app` |
| `CODE_HOTEL`   | un code secret d'au moins 20 caractères                     |

Règles Firebase : `{"rules":{"hotels":{"$code":{".read":"$code.length >= 20",".write":"$code.length >= 20"}}}}`

Sans `FIREBASE_URL`, chaque téléphone garde ses propres données.

## Lecture automatique des captures Shifter

Le dossier `serveur/` contient le petit service qui lit les captures avec l'IA Claude.
Il doit tourner chez un hébergeur de fonctions (la clé API doit rester secrète),
puis son adresse va dans la variable `LECTURE_URL`. Sans elle : mode démo.

## Lancer sur un ordinateur

```bash
npm install
npm run dev
```

## Où modifier quoi

| Je veux changer…                         | Fichier                                     |
| ---------------------------------------- | ------------------------------------------- |
| Les couleurs, arrondis, ombres           | `tailwind.config.ts`, `src/app/globals.css` |
| Les données d'exemple (filles, tâches…)  | `src/lib/sampleData.ts`                     |
| La règle de répartition                  | `src/lib/repartition.ts`                    |
| Le partage entre téléphones              | `src/lib/sync.ts`, `src/config.ts`          |
| La lecture des captures (consignes IA)   | `serveur/lire-horaire.ts`                   |
| Les boutons, cartes, fenêtres…           | `src/components/ui/index.tsx`               |
| L'écran d'installation                   | `src/components/Installation.tsx`           |
| Un écran                                 | `src/app/(app)/<écran>/page.tsx`            |

Dans l'appli, la gouvernante modifie filles, chambres, tâches (durée, jours, pénible),
durées de ménage, linge et pause : bouton profil → Réglages.
