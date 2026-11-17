# Housekeeping Infinit

Nom de l'appli : « Housekeeping Infinit » (constante `NOM_APPLI` dans `src/config.ts`). Le dépôt s'appelle encore `planiroom`.

Appli de planning ménage (PWA) pour l'Hôtel du Casino de Dinant : 5 femmes de chambre + 1 gouvernante.
L'utilisateur parle français et n'est pas développeur : réponses courtes, en français, étape par étape.
Projet indépendant des autres dépôts (Céline, La Fine Crasse, Krinkels Plan…) : ne rien mélanger.
Le design s'inspire de l'appli Céline (carte d'accueil en dégradé, cartes très arrondies, gros textes, fenêtres du bas).

## Décisions en attente (ne rien faire sans accord)
- Firebase (partage entre téléphones) et publication : **seulement quand l'appli sera complètement terminée**,
  après réception de toutes les infos (liste des tâches avec fréquence et durée, vraies captures Shifter, etc.).
  En attendant : continuer en mode local, ne pas proposer de créer le projet Firebase ni de publier.

## Exigences
- Très beau, propre, professionnel. Police Inter, fond #F5F6F8, couleur principale #0F766E, orange = congés.
- Téléphone d'abord, boutons ≥ 44 px, champs en 16 px (pas de zoom iPhone). Pas d'emoji : icônes lucide-react.
- Doit marcher sur tous les téléphones : Tailwind **3** (pas 4 : il exige iOS 16.4+), cible iOS 15+ / Android.
  Pas de `dvh` sans repli, pas de `color-mix`, utiliser les classes de `globals.css` (`min-h-ecran`, `pb-nav`, `bottom-nav`, `verre`, `hero`).
- Tout en français. Rien de payant sans accord de l'utilisateur.

## Technique
- Next.js 15 en export statique (`output: "export"`), publié sur GitHub Pages par `.github/workflows/publier.yml` (branche `main`).
  Pas de route serveur dans `src/app` ; pages à paramètre via `?date=` (`/repartition/?date=AAAA-MM-JJ`).
- `src/config.ts` : FIREBASE_URL, CODE_HOTEL, LECTURE_URL, BASE (sous-dossier Pages), VERSION.
- Données : `src/lib/store.tsx` (contexte React + localStorage `planiroom:donnees`), session locale `planiroom:session`.
- Partage : `src/lib/sync.ts`, Firebase Realtime Database REST + EventSource, nœud `hotels/<CODE_HOTEL>`.
  Chaque élément est un chemin séparé (`aplatir()`), envois en PATCH multi-chemins ; changements non confirmés gardés
  dans `planiroom:attente` et renvoyés au démarrage ; envoi `keepalive` à la fermeture.
  Tester avec un faux serveur Firebase (la session de développement ne joint pas Firebase).
- Répartition : `src/lib/repartition.ts` (charge / temps disponible, rotation des tâches pénibles sur 28 jours, étages groupés).
- Lecture des captures : `serveur/lire-horaire.ts` (API Claude vision, à héberger à part), client `src/lib/lecture.ts` (démo sans LECTURE_URL).
- Mises à jour : `public/version.json` écrit au build ; l'appli recharge une fois par version, sinon bandeau. SW `public/sw.js?v=VERSION`.
- Installation : `src/components/Installation.tsx` (iPhone Safari / WhatsApp → x-safari-https, Android → invite ou intent Chrome), « Plus tard » = 24 h.

## Vérifier avant de livrer
`npx tsc --noEmit`, `npx next build`, puis captures Playwright sur iPhone SE, iPhone 13 et Galaxy (servir `out/`).
