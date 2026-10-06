# BOLIGO — Tableau de bord d'administration

Tableau de bord Next.js de l'équipe BOLIGO, aux couleurs de l'application :
membres, rencontres, parcours, signalements, messages bloqués, finances,
partenaires et équipe. Il ne contient aucune donnée : il appelle les routes
`/api/admin/*` de l'API BOLIGO (dossier `src/` de ce dépôt).

## En ligne

- Site statique Render **`boligo-admin`**, dans le même espace que l'API
  `Boligo-back` et l'application web `boligo-web`.
- Construction : `npm ci && npm run build` dans `admin/`, publication du dossier
  `out/`. Seuls les changements sous `admin/**` déclenchent une nouvelle
  publication.
- API appelée : `NEXT_PUBLIC_API_URL` (variable Render du site). Sans valeur, la
  version en ligne appelle `https://boligo-back.onrender.com/api`.
- Les fiches détaillées ont une adresse de la forme
  `/dashboard/users/detail/?id=…` et `/dashboard/journeys/detail/?id=…`, ce qui
  permet de tout servir en fichiers statiques.

## Sécurité

- L'API n'accepte les appels du tableau de bord (`/api/admin/*`) que depuis
  `https://boligo-admin.onrender.com` et `http://localhost:3001`. Une autre
  adresse s'ajoute avec la variable Render `ADMIN_ALLOWED_ORIGINS` du service
  `Boligo-back` (adresses séparées par des virgules). L'ancienne copie sur
  Vercel ne peut donc plus appeler l'API depuis un navigateur.
- La connexion est limitée à 8 essais par adresse e-mail toutes les 10 minutes.
- Le site envoie des en-têtes de protection (déclarés dans `render.yaml`) :
  pas d'indexation par les moteurs de recherche, pas d'affichage dans un cadre,
  et une politique de contenu qui n'autorise que l'API BOLIGO.

## Accès de l'équipe

Trois rôles peuvent se connecter ; le menu et l'API s'adaptent au rôle :

| Rôle | Pages |
|---|---|
| Administrateur (`ADMIN`) | toutes, dont Finances, Partenaires et Équipe |
| Modération (`MODERATOR`) | Vue d'ensemble, Membres, Rencontres, Parcours, Signalements, Modération |
| Marketing (`MARKETING`) | Vue d'ensemble, Partenaires |

Aucun mot de passe n'est fourni par défaut, et aucun ne doit être écrit dans ce
dépôt.

- **Premier administrateur** : créer un compte normal dans l'application
  BOLIGO (code e-mail validé), puis ajouter sur Render, service `Boligo-back`, la
  variable `ADMIN_BOOTSTRAP_EMAIL` avec cette adresse. Le compte devient
  administrateur au redémarrage de l'API ou à sa première connexion ici. La
  variable n'agit que tant qu'il n'existe aucun administrateur.
- **Autres membres de l'équipe** : page **Équipe** (administrateurs), à partir
  d'un compte BOLIGO déjà vérifié. « Retirer l'accès » coupe l'accès
  immédiatement.
- Un compte d'équipe n'apparaît jamais dans la Découverte des membres.
- En dépannage, le script `prisma/seed-admin.ts` reste disponible :
  `ADMIN_EMAIL=<adresse> ADMIN_PASSWORD=<12 caractères minimum> npx ts-node prisma/seed-admin.ts`,
  avec `DATABASE_URL` pointant vers la base BOLIGO.

Le programme partenaires est décrit dans `docs/PROGRAMME_PARTENAIRES.md`.

La session dure 8 heures.

## En local

```bash
# 1. API BOLIGO, à la racine du dépôt (port 3000)
npm run start:dev

# 2. Tableau de bord, dans admin/ (port 3001)
npm ci
npm run dev
```

Ouvrir http://localhost:3001/login. En local, l'API par défaut est
`http://localhost:3000/api`. Pour en viser une autre, créer `admin/.env.local`
avec `NEXT_PUBLIC_API_URL=<adresse>/api`.

## Erreur `Cannot find module './627.js'` ou `./638.js`

Ce n'est **pas** un bug de code : le dossier **`.next`** (cache de compilation)
est corrompu ou désynchronisé. Cela arrive souvent quand le serveur de
développement tourne pendant une compilation interrompue, ou après un `EPERM`
sous Windows.

1. Arrêter le serveur de développement (`Ctrl+C`).
2. Nettoyer le cache : `npm run clean`.
3. Relancer : `npm run dev`.

Si `npm run clean` échoue (fichier verrouillé), fermer tous les terminaux Next.js
puis supprimer à la main le dossier `.next`.
