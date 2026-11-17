# Housekeeping Infinit

Nom de l'appli : « Housekeeping Infinit » (constante `NOM_APPLI` dans `src/config.ts`). Le dépôt s'appelle encore `planiroom`.

Appli de planning ménage (PWA) pour l'Hôtel du Casino de Dinant : 5 femmes de chambre + 1 gouvernante.
L'utilisateur parle français et n'est pas développeur : réponses courtes, en français, étape par étape.
Projet indépendant des autres dépôts (Céline, La Fine Crasse, Krinkels Plan…) : ne rien mélanger.
Le design s'inspire de l'appli Céline (carte d'accueil en dégradé, cartes très arrondies, gros textes, fenêtres du bas).

## Décisions en attente (ne rien faire sans accord)
- Firebase (partage entre téléphones) et publication : **seulement quand l'appli sera complètement terminée**,
  après réception de toutes les infos (liste des tâches avec fréquence et durée, vraies captures Shifter, etc.).
  En attendant : continuer en mode local, ne pas proposer de créer le projet Firebase.
- Une **version d'essai** est publiée sur GitHub Pages (branche `main`, sans Firebase) pour que l'utilisateur
  la teste sur son téléphone : https://nicolas06061997.github.io/planiroom/
  Le développement se fait sur la branche de travail ; copier sur `main` quand l'utilisateur veut voir les changements.
  Attention : l'environnement GitHub `github-pages` n'autorise que la branche `ccr-0b431f57-tu8ml3` à publier
  (règle créée automatiquement). Pour publier : lancer le workflow `publier.yml` à la main (workflow_dispatch)
  sur la ref `ccr-0b431f57-tu8ml3`, puis garder `main` identique. Le workflow ne se lance plus tout seul (workflow_dispatch uniquement).

## Exigences
- Très beau, propre, professionnel, rendu proche de Céline et de la maquette (terracotta, cartes arrondies). Police Inter. Congés en rose.
- Téléphone d'abord, boutons ≥ 44 px, champs en 16 px (pas de zoom iPhone). Emojis dans les titres OK ; icônes lucide-react pour les boutons.
- Doit marcher sur tous les téléphones : Tailwind **3** (pas 4 : il exige iOS 16.4+), cible iOS 15+ / Android.
  Pas de `dvh` sans repli, pas de `color-mix`, utiliser les classes de `globals.css` (`min-h-ecran`, `pb-nav`, `bottom-nav`, `verre`, `hero`).
- Tout en français. Rien de payant sans accord de l'utilisateur.

## Technique
- Next.js 15 en export statique (`output: "export"`), publié sur GitHub Pages par `.github/workflows/publier.yml` (lancé à la main).
  Pas de route serveur dans `src/app` ; pages à paramètre via `?date=` (`/repartition/?date=AAAA-MM-JJ`).
- `src/config.ts` : FIREBASE_URL, CODE_HOTEL, LECTURE_URL, BASE (sous-dossier Pages), VERSION.
- Données : `src/lib/store.tsx` (contexte React + localStorage `planiroom:donnees`), session locale `planiroom:session`.
- Partage : `src/lib/sync.ts`, Firebase Realtime Database REST + EventSource, nœud `hotels/<CODE_HOTEL>`.
  Chaque élément est un chemin séparé (`aplatir()`), envois en PATCH multi-chemins ; changements non confirmés gardés
  dans `planiroom:attente` et renvoyés au démarrage ; envoi `keepalive` à la fermeture.
  Tester avec un faux serveur Firebase (la session de développement ne joint pas Firebase).
- Chat : onglet « Messages » (`src/app/(app)/messages/`), aides dans `src/lib/messages.ts`. Groupe « Équipe » (id `groupe`,
  tout le monde) + conversations privées (`membres`, visibles seulement par eux : `peutVoir()`). Participant = id d'une fille
  ou `"gouvernante"`. Messages synchronisés en `messages/<conversation>/<message>`. « Lu » gardé sur chaque téléphone
  (`planiroom:lus`). Limite : avec la base Firebase ouverte, la confidentialité n'est garantie que par l'appli (pas par la base).
- Photos du chat : `src/lib/photos.ts`, rangées À PART (`photos/<CODE_HOTEL>/<id>` dans Firebase, IndexedDB sur le téléphone)
  pour ne pas alourdir la synchro ; le message ne garde que `photo: {id, l, h}`.
- Notifications : `src/lib/notifications.ts` (permission, abonnement push dans `push/<CODE>/<personne>/<id>`),
  `src/components/AlerteMessages.tsx` (bandeau si appli visible, notification si arrière-plan), `public/sw.js` (push + clic),
  `serveur/notifier.ts` (Web Push, à héberger ; `import * as webpush`). Push « appli fermée » seulement avec NOTIF_URL + VAPID_PUBLIQUE.
  Tests : Chromium headless refuse les notifications → `chromium.launch({ channel: "chromium" })`.
- Ne rien perdre si le téléphone est vidé (historique Chrome effacé) : les données vivent dans Firebase ; réglages perso
  (couleur, photo de fond, notifications, messages lus) dans `profils/<personne>` (`Profil`, `majProfil`, `RestaurerProfil`).
  Téléphone vide + partage actif → `attenteDonnees` : écran `EcranRecuperation` au lieu des données d'exemple (qui écraseraient
  les vraies). Sauvegarde / restauration JSON dans Réglages → Général.
- Apparence : couleur par téléphone (`src/lib/theme.ts`, variables CSS `--c-*` posées par un script dans <head>, terracotta
  par défaut), fond doux ou photo (`Apparence.tsx`). Les `Feuille` et l'écran d'installation passent par un portail (`document.body`).
- Emojis autorisés (demande de l'utilisateur, comme Céline) dans les titres ; icônes lucide pour les boutons.
- Répartition : `src/lib/repartition.ts` (charge / temps disponible, rotation des tâches pénibles sur 28 jours, étages groupés).
- Lecture des captures : `serveur/lire-horaire.ts` (API Claude vision, à héberger à part), client `src/lib/lecture.ts` (démo sans LECTURE_URL).
- Mises à jour : `public/version.json` écrit au build ; l'appli recharge une fois par version, sinon bandeau. SW `public/sw.js?v=VERSION`.
- Installation : `src/components/Installation.tsx` (iPhone Safari / WhatsApp → x-safari-https, Android → invite ou intent Chrome), « Plus tard » = 24 h.

## Vérifier avant de livrer
`npx tsc --noEmit`, `npx next build`, puis captures Playwright sur iPhone SE, iPhone 13 et Galaxy (servir `out/`).
