# Recette locale de BOLIGO (une commande, sans service payant)

Tout tourne **sur votre ordinateur** : base Postgres, API, application web,
tableau de bord admin. Les membres sont **fictifs** (adresses
`@recette.boligo.test`). Aucun e-mail réel, aucune IA réelle, aucune base
distante (Supabase, Render) : seule une base locale peut être visée.
Le paiement par carte n'est possible qu'en **mode test Stripe**.

## 1. Prérequis

- **Docker Desktop** (Mac, Windows 10 22H2 / Windows 11) ou Docker Engine + Compose
  (Linux), **Compose 2.24 ou plus récent** (Docker Desktop 4.27+). Le lancer avant
  la commande. Sous Windows : moteur **WSL 2** (voir « Windows » ci-dessous).
- Environ 6 Go de disque libre et 4 Go de mémoire pour Docker.
- Internet au **premier** lancement (téléchargement des images et des paquets npm).
- Ports libres sur le poste :

  | Service | Port | Variable de `.env.recette` |
  |---|---|---|
  | API | **3000** | `API_PORT` (puis `PUBLIC_API_URL`) |
  | Application web | **8080** | `WEB_PORT` (puis `PUBLIC_WEB_URL`, `WEB_APP_URL`, `APP_URL`) |
  | Admin | **8081** | `ADMIN_PORT` (puis `ADMIN_ALLOWED_ORIGINS`) |
  | Base Postgres | **55432** | `DB_PORT` |
  | Faux OpenRouter (`--faux-ia`) | 8799 | `FAUX_IA_PORT` |

  Avant le démarrage, `recette.ps1` vérifie ces ports ; s'il en trouve un occupé,
  il s'arrête et indique la variable à changer. Tous les ports sont publiés
  sur **127.0.0.1 seulement** : la recette n'est pas joignable depuis le réseau.

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

### Windows (PowerShell 5.1 ou 7)

1. **Windows 10 (22H2) ou 11**, 64 bits, virtualisation activée dans le BIOS.
2. **WSL 2** : dans un PowerShell administrateur, `wsl --install`, puis redémarrer.
3. **Docker Desktop** : installer, cocher « Use the WSL 2 based engine »
   (Settings > General), démarrer, attendre « Engine running ». Vérifier :
   `docker compose version` (2.24 ou plus).
4. Ouvrir PowerShell **à la racine du dépôt** (le chemin peut contenir des espaces)
   et lancer `.\recette.ps1`. Si Windows refuse le script (stratégie
   d'exécution), lancer `powershell -ExecutionPolicy Bypass -File .\recette.ps1`
   (même chose avec `pwsh` pour PowerShell 7). La stratégie n'est levée que pour cette
   commande ; un fichier téléchargé en ZIP peut aussi être débloqué par
   `Unblock-File .\recette.ps1`.
5. Aide : `.\recette.ps1 -Aide`. Arrêt : `.\recette.ps1 -Arreter` (données
   gardées), ou `.\recette.ps1 -Reinitialiser` pour repartir de zéro (voir § 6).
   Docker Desktop peut ensuite être quitté.

À savoir :

- `recette.ps1` est en UTF-8 **avec BOM** et en fins de ligne CRLF, `recette.sh`
  et les fichiers lus par les conteneurs en LF (règles de `.gitattributes`). Si
  un éditeur enregistre `recette.ps1` sans BOM, Windows PowerShell 5.1 affiche
  mal les accents.
- **Port occupé** : le script le signale avec la variable à changer dans
  `.env.recette`. Pour trouver le programme :
  `Get-NetTCPConnection -State Listen -LocalPort 3000 | Select-Object OwningProcess`,
  puis `Get-Process -Id <numéro>`. Si Docker répond « ports are not available »
  alors que rien n'écoute, Windows a réservé le port (Hyper-V / WSL) : voir
  `netsh interface ipv4 show excludedportrange protocol=tcp` et choisir un port
  hors de ces plages.
- Les ports n'étant publiés qu'en IPv4 (127.0.0.1), une adresse `localhost` lente
  à répondre peut être remplacée par `http://127.0.0.1:8080` dans le navigateur.
  L'admin, lui, doit rester sur `http://localhost:8081` (origine autorisée par l'API).
- Les variables d'environnement modifiées par le script sont rétablies à la fin :
  la fenêtre PowerShell reste propre.
- Sans Docker (`.\recette.ps1 -SansDocker`, § 7) : Node.js 22 et Postgres pour
  Windows ; `psql` dans le `PATH` pour créer ou réinitialiser la base.

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
