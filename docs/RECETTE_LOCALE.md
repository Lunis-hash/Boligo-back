# Recette locale de BOLIGO (une commande, sans service payant)

Tout tourne **sur votre ordinateur** : base Postgres, API, application web,
tableau de bord admin. Les membres sont **fictifs** (adresses
`@recette.boligo.test`). Aucun e-mail réel, aucune IA réelle, aucune base
distante (Supabase, Render) : seule une base locale peut être visée.
Le paiement par carte n'est possible qu'en **mode test Stripe**.

## 1. Prérequis

- **Docker Desktop** (Mac, Windows) ou Docker Engine + Compose (Linux),
  **Compose 2.24 ou plus récent** (Docker Desktop 4.27+). Le lancer avant la commande.
- Environ 6 Go de disque libre et 4 Go de mémoire pour Docker.
- Internet au **premier** lancement (téléchargement des images et des paquets npm).
- Les ports **3000** (API), **8080** (web), **8081** (admin) et **55432** (base)
  libres. Sinon, les changer dans `.env.recette` (`API_PORT`, `WEB_PORT`,
  `ADMIN_PORT`, `DB_PORT`, puis `PUBLIC_API_URL`, `PUBLIC_WEB_URL`,
  `WEB_APP_URL`, `ADMIN_ALLOWED_ORIGINS` en conséquence).

## 2. La commande

À la racine du dépôt :

| Système | Commande |
|---|---|
| Mac / Linux | `./recette.sh` |
| Windows (PowerShell) | `.\recette.ps1` (si refus : `powershell -ExecutionPolicy Bypass -File .\recette.ps1`) |

Premier lancement : 5 à 15 minutes (construction des images). Les suivants : une
minute environ. Le script :

1. crée `.env.recette` s'il n'existe pas : secrets **factices** générés au hasard
   (mot de passe de la base, `JWT_SECRET`), jamais versionné ;
2. refuse toute clé Stripe `sk_live_` / `pk_live_` / `rk_live_`, et toute clé
   secrète qui ne commence pas par `sk_test_` ;
3. démarre la base Postgres 16 (volume Docker propre à la recette) ;
4. crée le schéma avec `prisma db push` **uniquement si la base est vide**, puis
   rejoue les migrations additives `prisma/sql/*.sql` (déclencheur de version du
   Grand Entretien, etc.) ;
5. crée les données fictives (`npm run seed:recette`), puis les partenaires
   fictifs si le script `seed:recette:partenaires` existe dans `package.json`
   (sinon un message indique que l'étape est ignorée) ;
6. démarre l'API (`INTERVIEW_VERSION=8.2`), l'application web et l'admin, puis
   affiche les adresses et les accès.

Options : `--faux-ia` (`-FauxIA`) ajoute le faux OpenRouter local
(`mobile-steve/e2e/fake-openrouter.js`, déterministe, aucun appel réseau) ;
`--sans-build` (`-SansBuild`) réutilise les images déjà construites ;
`--sans-docker` (`-SansDocker`), voir § 7.

Techniquement : `docker compose -p boligo-recette --env-file .env.recette -f
docker-compose.yml -f docker-compose.recette.yml --profile admin up -d --build`.
La surcouche `docker-compose.recette.yml` ne change rien à l'usage normal de
`docker-compose.yml` ; le fichier `.env` n'est jamais lu, et l'adresse de la base
de l'API est **forcée** sur le conteneur `db`.

## 3. Adresses

| Quoi | Adresse |
|---|---|
| Application web | <http://localhost:8080> |
| Espace partenaire | <http://localhost:8080/espace-partenaire> (anglais : `/partner-space`) — s'ouvre avec le lien privé d'un partenaire (`…/espace-partenaire#<lien>`), envoyé depuis l'admin |
| Page publique des partenaires | <http://localhost:8080/partenaires> |
| API | <http://localhost:3000/api> — santé : `/api/health`, documentation : <http://localhost:3000/docs> |
| Admin | <http://localhost:8081> (sans Docker : <http://localhost:3001>) |

## 4. Accès fictifs (liste unique)

Tout est **fictif** et n'existe que dans la base locale. Domaines
`@recette.boligo.test` (parcours membres) et `@boligo-demo.example`
(programme partenaires) : aucun e-mail n'est envoyé.

### Membres (parcours) — mot de passe `Recette2026!`

| E-mail | Stade |
|---|---|
| `adam.termine@recette.boligo.test` | Grand Entretien V8.2 **terminé**, a envoyé une invitation à Bella (1 crédit restant) |
| `bella.termine@recette.boligo.test` | Grand Entretien V8.2 **terminé**, invitation d'Adam **à accepter** (2 crédits) |
| `cyril.sondeur@recette.boligo.test` | Parcours en cours avec Diane, **Sondeur en cours** : a répondu aux questions 1 et 2, attend Diane |
| `diane.sondeur@recette.boligo.test` | Parcours en cours avec Cyril, **Sondeur en cours** : question 1 révélée, **à elle** de répondre à la question 2 |
| `emma.entretien@recette.boligo.test` | Grand Entretien V8.2 **en cours** : modules 0 à 3 complets, module 4 à moitié (tester le retour arrière) ; 0 crédit |
| `felix.nouveau@recette.boligo.test` | **Nouveau membre** : rien de commencé, 0 crédit (le Grand Entretien démarrera en V8.2) |
| `membre@boligo-demo.example` / `Demo-Membre-2026!` | Membre de la recette partenaires (codes partenaires `DEMO…`) |

### Administration — <http://localhost:8081/login>

| E-mail | Mot de passe | Rôle |
|---|---|---|
| `admin@recette.boligo.test` | `RecetteAdmin2026!` | Administrateur (parcours membres) |
| `admin@boligo-demo.example` | `Demo-Admin-2026!` | Administrateur (programme partenaires) |
| `marketing@boligo-demo.example` | `Demo-Marketing-2026!` | Équipe marketing (partenaires) |

### Espaces partenaires — liens privés (fictifs, recette locale uniquement)

20 partenaires « [DÉMO] » (12 acceptés, 2 suspendus, 2 refusés, 4 en attente),
18 offres, 13 codes `DEMO…`, 14 ventes et 3 remboursements. Liens imprimés par
`npm run seed:recette:partenaires`, identiques à chaque lancement :

| Partenaire | Lien |
|---|---|
| Élise Varnier (Atelier Lumen) | <http://localhost:8080/espace-partenaire#TyFgGraNhI9RNCuaf81OVpVNh58GlML8tcM3KICMGjg> |
| Thomas Orlin (Maison Cerfeuil) | <http://localhost:8080/espace-partenaire#RCPj9lXVv_n2m8bXOcJG_-RPO-tu_GyivLuCWBIhg7Y> |
| Agathe Morvan (Vélo Brume) | <http://localhost:8080/espace-partenaire#prCKjaRj-LOeCnxlfmEgirWwRkZN6soAlPDTeJeg9z8> |
| Bastien Quérel (Librairie L’Ourlet) | <http://localhost:8080/espace-partenaire#4HQq1CYS9dqr2_w20RWOQ3ZwT2dF28lmdw39D176WUQ> |
| Romane Dufresnoy (Spa Nacre, suspendu) | <http://localhost:8080/espace-partenaire#QBsthQ8rEuT1pMKwUOA20lnxNYcseBDji9CZo9m0HGk> |
| Clara Fontenay (commerciale indépendante) | <http://localhost:8080/espace-partenaire#zG1NzM7mQ0bhCa7qL0-iKzpx_ZYJlAlpmhrRdeROrFw> |
| Yanis Belcourt (agent commercial) | <http://localhost:8080/espace-partenaire#uP4sZqngkuL_PMQGzCFvGv273_-OxUbbxkbvcYBB0nM> |
| Sophie Marchetti (ambassadrice) | <http://localhost:8080/espace-partenaire#hso6ePuoPC3ijExk9-1cSOEihGfcxKHpja_SAQR_6qw> |
| Karim Delaunay (ambassadeur) | <http://localhost:8080/espace-partenaire#QUOQ2ZkcNsFh8oPvJIU-2wDLGRhI3fLqtdARzMbFEO8> |
| Lina Arcelle (créatrice de contenu) | <http://localhost:8080/espace-partenaire#PBN9bulkmYLxRF4HyrdfCDEpdp0gvzUPMW-itVG1EVI> |
| Jade Poitevin (podcast « Cœurs lents ») | <http://localhost:8080/espace-partenaire#cYmS_PFH6l2DstkbiJ6HNPUNPzvH7Gp5Z-UDBTPHpos> |
| Nora Valsain (YouTube « Rencontres vraies ») | <http://localhost:8080/espace-partenaire#d3iXJGVWdwiSO3M3PXdpDog8LqS6io2d70CcQ3bmaJc> |
| Théo Grandin (créateur de contenu) | <http://localhost:8080/espace-partenaire#vZxDS_OMQjQC47QTjNGuLeswcZqTa2e4LyfNWAZUdCc> |
| Maëlle Kerbrat (blog « Le temps d’aimer ») | <http://localhost:8080/espace-partenaire#YvSXtQwaHIkIUwBL3LmCohA654MGuxpWkWMmI28hcaY> |

Les offres « [DÉMO] » n'apparaissent que sur la page Partenaires **locale** ;
rien n'est publié sur le site public.

### Codes et inscription

- Codes promo : `RECETTE100` (parcours offert, sans carte), `RECETTE50` (-50 %), et les codes partenaires `DEMO…` (liste dans l'admin, Codes promo).
- Nouveau compte : le code de vérification **1234** est accepté (`OTP_DEBUG=true`, recette uniquement).

Les entretiens, l'invitation et le parcours sont créés par les **vrais services**
de l'API (mêmes contrôles qu'en production). Le Sondeur utilise la banque de
questions fixe (`HARMONY_QUESTIONS_SOURCE=bank`) : 9 questions pour Cyril et Diane.
Les deux seeds sont **idempotents** : ils suppriment puis recréent uniquement
leurs propres données (`@recette.boligo.test`, `RECETTE…`, `@boligo-demo.example`,
`DEMO…`). Ils refusent toute base qui n'est pas `localhost` ou `127.0.0.1`
(ou l'hôte `db`, seulement à l'intérieur du conteneur de recette Docker).

## 5. Paiement

- **Sans clé Stripe (par défaut)** : le paiement par carte est indisponible (le
  serveur répond « Paiement indisponible sur ce serveur », comme prévu dans
  `src/payment/payment.service.ts`). Pour tester l'achat d'un parcours, utiliser
  le code **`RECETTE100`** sur l'écran de paiement : le serveur crédite
  directement le compte, sans carte. `RECETTE50` montre le calcul de réduction.
- **Mode test Stripe (facultatif)** : dans `.env.recette`, renseigner
  `STRIPE_SECRET_KEY=sk_test_…` et `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…`
  du compte **de test** BOLIGO, puis relancer `./recette.sh` (le web est
  reconstruit avec la clé publiable). Sur le web, la page de paiement Stripe
  s'ouvre ; carte de test **4242 4242 4242 4242**, date future quelconque, CVC
  quelconque (refus : 4000 0000 0000 0002 ; authentification 3-D Secure :
  4000 0027 6000 3184). Au retour, l'application confirme le paiement auprès de
  Stripe (`/payment/confirm-checkout`) : aucun webhook n'est nécessaire. Aucun
  argent réel n'est débité. Le script **refuse** toute clé `sk_live_`.
- **Contrôle rapide côté serveur** (API locale, clé de test) :
  `STRIPE_TEST_SECRET_KEY=sk_test_… API_URL=http://localhost:3000/api node mobile-steve/e2e/paiement-test-simple.js`.
  Il crée un compte, prend 15 € avec la carte de test `pm_card_visa`, puis
  vérifie le crédit et l'achat. Résultat du 13/10/2026 :
  `docs/recette-ergonomie/paiement-test.txt` (succeeded, livemode=false, crédit +1).

## 6. Arrêter, réinitialiser

| Action | Mac / Linux | Windows |
|---|---|---|
| Arrêter (données gardées) | `./recette.sh --arreter` | `.\recette.ps1 -Arreter` |
| Repartir de zéro (base supprimée puis recréée) | `./recette.sh --reinitialiser` | `.\recette.ps1 -Reinitialiser` |
| Remettre seulement les comptes fictifs dans leur état initial | relancer `./recette.sh` (le seed est rejoué) | `.\recette.ps1` |
| Nouveaux secrets factices | supprimer `.env.recette`, puis `--reinitialiser` | idem |

`--reinitialiser` est nécessaire après un changement du schéma Prisma : le
schéma n'est poussé que sur une base vide.

Journaux : `docker compose -p boligo-recette logs -f api` (ou `recette-init`, `web`, `admin`).
Les e-mails « envoyés » apparaissent dans le journal de l'API (`[EMAIL SIMULATED]`).

## 7. Sans Docker (`./recette.sh --sans-docker`)

Pour une machine sans Docker, avec **Node.js 22** et un **Postgres local** déjà installé :

1. Dans `.env.recette` (créé au premier lancement), régler
   `SANS_DOCKER_DATABASE_URL` (défaut
   `postgresql://postgres:postgres@localhost:5432/boligo_recette`) ; seuls
   `localhost` et `127.0.0.1` sont acceptés. La base est créée si `psql` est disponible.
2. `./recette.sh --sans-docker` (Windows : `.\recette.ps1 -SansDocker`) installe les
   dépendances manquantes (`npm ci`), compile l'API, initialise la base, démarre
   l'API (`node dist/main.js`), exporte l'application web (servie par
   `mobile-steve/e2e/static-server.js`) et lance l'admin en mode développement
   sur le port **3001**. Journaux et PID dans `.recette/`.
3. Arrêt : `./recette.sh --sans-docker --arreter`. Réinitialisation (base dont le
   nom contient « recette » uniquement) : `./recette.sh --sans-docker --reinitialiser`.

## 8. Ce qui reste simulé ou absent

- **IA** : aucune clé ; portraits rédigés par les règles, Sondeur par la banque
  de questions, modération IA non disponible (journalisée). Avec `--faux-ia`, le
  faux OpenRouter local répond de façon déterministe.
- **E-mails** : simulés (journal). **Vidéo (Daily.co)** : désactivée.
  **Connexion Google / Facebook** : désactivée.
- **Applications mobiles natives** : non couvertes (le web seulement).
