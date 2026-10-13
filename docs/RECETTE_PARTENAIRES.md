# Recette du programme partenaires : 20 partenaires fictifs

**Date** : 13/10/2026
**Branche** : `claude/magical-keller-kw9t2c` (aucune fusion, aucun déploiement)
**Résultat** : **88/88 contrôles réussis**. Le détail est dans `docs/recette-partenaires/resultats.json` et les 23 captures dans `docs/recette-partenaires/captures/`.

## 1. Environnement isolé

| Élément | Recette | Production |
|---|---|---|
| Base | PostgreSQL local jetable `boligo_recette_partenaires` | Supabase BOLIGO **non touchée** (OWEKE non plus) |
| Backend | `dist/main.js` local, `NODE_ENV=development`, port 3000 | — |
| Webapp membre | export web Expo, `http://localhost:8081` | — |
| Administration | export Next.js, `http://localhost:8082` | — |
| E-mails | mode **simulation** (aucune clé d'envoi) : rien ne part | — |
| Paiements | ventes **simulées** par le webhook local non signé (accepté seulement hors production et sans secret) ; aucun appel Stripe | — |
| Coût | aucun service créé | — |

Le script refuse de tourner si une adresse n'est pas `localhost` ou si la base n'est pas `boligo_recette_partenaires`.

### Données fictives

- Toutes les adresses sont en `@boligo-demo.example`. Le domaine `.example` est réservé (RFC 2606) : aucun e-mail ne peut atteindre une vraie personne.
- Chaque société porte la mention « (fictif) ».
- Les numéros d'immatriculation `DEMO-2026-00xx` sont saisis en « autre pays ». Aucun registre officiel n'est interrogé ; la vérification est faite à la main par l'administrateur fictif.
- Tous les codes commencent par `DEMO`.
- Les liens des offres pointent vers `https://<marque>.example/…`. Dans le navigateur, le script les remplace par une page neutre.
- Les visites et clics simulés par l'API portent des adresses de documentation `198.51.100.x` (RFC 5737) pour représenter des visiteurs distincts.

### Le jeu de données (`mobile-steve/e2e/recette-partenaires-data.js`)

| Profil | Partenaires | Statut final |
|---|---|---|
| **Entreprises (8)** | Atelier Lumen (code DEMOLUMEN −10 %) | Accepté |
| | Maison Cerfeuil (DEMOCERFEUIL −15 %) | Accepté |
| | Vélo Brume (sans code) | Accepté |
| | Librairie L'Ourlet (sans code) | Accepté |
| | Spa Nacre (DEMONACRE) | **Suspendu** |
| | Cave Ardoise | En discussion |
| | Studio Galet (formulaire public) | Nouveau |
| | Voyages Tilleul | **Refusé** |
| **Ambassadeurs (6)** | Clara (DEMOCLARA, 20 %) | Accepté |
| | Yanis (DEMOYANIS, 25 %) | Accepté |
| | Sophie (DEMOSOPHIE) | Accepté |
| | Karim (DEMOKARIM −20 %) | Accepté |
| | Hugo (formulaire public) | Nouveau |
| | Mathis (DEMOMATHIS) | **Refusé** |
| **Créateurs (6)** | Lina (formulaire public, puis code créé depuis l'écran d'administration) | Accepté |
| | Jade (DEMOJADE) | Accepté |
| | Nora (DEMONORA, « Parcours offert », 3 utilisations, 12 %) | Accepté |
| | Théo (DEMOTHEO −20 %) | Accepté |
| | Maëlle (DEMOMAELLE) | **Suspendue** |
| | Inès | En discussion |

Bilan des statuts : 12 acceptés, 2 suspendus, 2 en discussion, 2 nouveaux, 2 refusés.

Les 18 offres se répartissent ainsi :
- **6 en ligne**, dont 1 « Partenaire du mois » ;
- **1 programmée** ;
- **2 expirées**, dont une qui a expiré en direct pendant la recette ;
- **5 brouillons** ;
- **4 retirées** :
  - 1 par l'équipe ;
  - 2 par la suspension ;
  - 1 par le refus.

## 2. Résultats par parcours

### 1. Candidature et validation : ✅

**Candidatures**
- 3 candidatures sont passées par le **formulaire public** dans le navigateur et 17 par la même route d'API.
- Toutes sont enregistrées avec le statut « Nouveau », entreprise « à vérifier ».
- Un doublon (même e-mail et même profil en moins de 24 h) n'est pas recréé.

**Blocages avant vérification**
- L'acceptation est **refusée** tant que l'entreprise n'est pas vérifiée. *(Défaut corrigé : avant, le passage manuel à « Accepté » contournait ce contrôle.)*
- La création de code est refusée elle aussi.

**Vérification manuelle**
- 16 partenaires ont été vérifiés par l'API.
- 1 a été vérifié depuis l'**écran d'administration** (Lina). Le bandeau « Entreprise non vérifiée » s'affiche avant la vérification.

**Accès**
- Un membre n'a pas accès à l'administration des partenaires (403).

### 2. Codes et tableau de bord privé : ✅

**Codes et liens privés**
- 12 codes personnalisés sont créés par l'API, et 1 (DEMOLINA) depuis l'écran.
- Le lien privé `…/espace-partenaire#jeton` est délivré à la création. L'e-mail reste en simulation.
- Les marques acceptées **sans code** (Vélo Brume, L'Ourlet) ont désormais leur espace partenaire. *(Ajout : avant, une marque sans code ne pouvait pas avoir d'espace.)*

**Commissions**
- Ambassadeurs 20 % (Yanis 25 %).
- Créateurs 15 % (Nora 12 %).
- Marques : pas de commission.

**Fin d'accès**
- Partenaire refusé : son lien privé ne fonctionne plus (404, « Ce lien ne fonctionne plus »).

### 3. Visites, inscriptions, ventes, commissions : ✅

Chaque espace partenaire affiche des chiffres **exacts** :

| Code | Visites | Inscriptions | Parcours payés | Chiffre d'affaires | Commission |
|---|---|---|---|---|---|
| DEMOCLARA | 43 (dont 1 navigateur) | 6 | 3 | 40,50 € | 8,10 € (20 %) |
| DEMOYANIS | 30 | 4 | 2 | 25,50 € | 6,38 € (25 %) |
| DEMOJADE | 36 | 5 | 2 | 27,00 € | 4,05 € (15 %) |
| DEMOLINA | 26 (dont 1 navigateur) | 3 | 2 | 25,50 € | 3,83 € (15 %) |
| DEMOSOPHIE | 18 | 2 | 1 | 13,50 € | 2,70 € |
| DEMOTHEO | 15 | 2 | 1 | 12,00 € | 1,80 € |
| DEMOMAELLE | 14 | 2 | 1 | 13,50 € | 2,03 € |
| DEMONORA | 20 | 3 | 0 (+ 3 offerts) | 0,00 € | 0,00 € |
| DEMOKARIM | 12 | 1 | 0 | 0,00 € | 0,00 € |
| DEMOLUMEN | 10 | 1 | 1 | 13,50 € | — (marque) |
| DEMONACRE | 6 | 1 | 1 | 13,50 € | — (marque) |
| DEMOCERFEUIL | 8 | 1 | 0 | 0,00 € | — (marque) |

**Synthèse de l'administration** : 14 Parcours payés, 184,50 € de chiffre d'affaires, 28,89 € de commissions dues. Ces totaux concordent avec la somme des espaces.

**Réduction et inscriptions**
- Le montant facturé est calculé par le backend : −10 % donne 13,50 €.
- Les 28 inscriptions passées par un lien sont rattachées au bon partenaire.

**Activations gratuites**
- Elles sont enregistrées à 0 € et **ne sont jamais comptées comme ventes**. *(Défaut corrigé dans l'historique mensuel.)*
- La 4e utilisation d'un code limité à 3 est refusée.

### 4. Visibilité des offres pour les membres : ✅

**Ce que voit le membre**
- L'API publique ne renvoie que les offres **en ligne** de partenaires **acceptés**.
- Ne sont jamais renvoyées : l'offre expirée, l'offre programmée et les brouillons.

**Dans le navigateur**
- Le visiteur arrivé par `?p=DEMOCLARA` voit le bandeau de réduction et l'offre « Partenaire du mois » (Atelier Lumen).
- La page « Offres partenaires » d'un membre connecté affiche les **6** offres en ligne, et seulement elles.
- Au clic d'un membre, le clic est compté (0 → 1), puis le membre est redirigé vers la marque avec `utm_source=boligo`.

### 5. Publication, suspension, expiration : ✅

**Publication**
- Publier une offre d'un partenaire non accepté est refusé.
- Un lien d'offre en `http` est refusé.
- La republication d'une offre expirée est refusée (« prolongez sa date de fin »).

**Retrait et expiration**
- Retrait par l'équipe : l'offre disparaît. Un clic sur une offre retirée ou expirée donne 404 et n'est pas compté.
- **Expiration en direct** : l'offre K (fin à +40 s) disparaît d'elle-même à l'heure dite.

**Suspension** (Spa Nacre, Maëlle)
- Le code est **refusé au paiement**.
- Les visites et inscriptions ne sont plus comptées.
- Les offres sont retirées.
- L'espace reste consultable en lecture seule, avec le bandeau « Partenariat suspendu ».
- **La reprise** réactive le code. *(Nouveau statut « Suspendu ».)*

**Refus** (Mathis, Voyages Tilleul)
- Le code est **refusé au paiement**. *(Défaut corrigé : avant, un code de partenaire refusé restait utilisable.)*
- Les offres sont retirées.
- Le lien privé est coupé.

**Affichages ignorés**
- Les affichages d'offres retirées ou expirées ne sont pas enregistrés. *(Défaut corrigé.)*

**Statut « retirée »**
- Une offre retirée apparaît « Retirée » et non « Brouillon ». *(Défaut corrigé : date de première mise en ligne ajoutée.)*

### 6. Revenus d'affiliation : clics ≠ ventes : ✅

**Deux mesures séparées**
- **Clics mesurés** par BOLIGO : 31, sur 254 affichages.
- **Ventes confirmées** par les marques : 7. Elles viennent de relevés mensuels saisis par l'équipe, dont 1 saisi depuis l'écran d'administration.

**Revenu BOLIGO**
- Il est calculé **sur les seules ventes confirmées** : 26,10 €. Aucun montant n'est jamais déduit des clics.

**Contrôles**
- Un relevé portant sur un mois futur est refusé.

**Affichage**
- Dans l'administration : 4 cartes distinctes (« Clics mesurés (pas des ventes) », « Ventes confirmées par les marques », « Revenu BOLIGO confirmé »…).
- Dans l'espace de la marque : colonne « Ventes confirmées » et la mention « Un clic n'est pas une vente ».

### 7. Gestion des 20 partenaires depuis l'administration : ✅

- Les 20 partenaires sont listés avec leur profil, leur statut, l'état de vérification, le code, les ventes et la commission. Les filtres par profil sont testés.
- Opérations réalisées **dans le navigateur** :
  - vérification manuelle et création de code (Lina) ;
  - création d'une offre (Cerfeuil) ;
  - édition d'une offre et saisie d'une vente confirmée (Vélo Brume) ;
  - suspension (Maëlle).
- Aucune erreur JavaScript n'a été relevée dans les pages.

## 3. Défauts corrigés

1. Le code d'un partenaire **refusé ou non accepté** restait valable au paiement et à l'activation gratuite.
2. L'acceptation manuelle contournait la vérification d'entreprise.
3. Les offres d'un partenaire refusé restaient cliquables. Les affichages étaient comptés hors dates de publication.
4. La limite de 30 offres était appliquée **avant** le filtre de dates, ce qui pouvait masquer des offres en ligne.
5. Les activations gratuites étaient comptées comme Parcours payés dans l'historique mensuel.
6. Aucun statut « Suspendu » n'existait. Il est ajouté : il coupe le code et les offres, garde l'espace en lecture seule, et la reprise est possible.
7. Une marque sans code n'avait pas d'espace partenaire.
8. Aucune notion de vente confirmée n'existait pour les liens affiliés. Ajouts : relevés par offre et par mois, et synthèse qui sépare les clics des ventes.
9. Les offres n'étaient pas modifiables dans l'administration (titre, dates, emplacement). Une offre expirée pouvait être republiée sans être prolongée.
10. Une offre retirée s'affichait « Brouillon ».
11. « Codes partenaires actifs » comptait les codes coupés.
12. Le taux de clic s'affichait « 7.1 % » au lieu de « 7,1 % ».
13. Le serveur statique de recette ne servait pas les pages de l'administration (`dossier/index.html`).

Tests automatiques : backend 1431/1431, app 131/131 ; TypeScript sans erreur sur le backend, l'application et l'administration.

## 4. Limites restantes (non corrigées)

- Un remboursement ne réduit la commission que si `BILLING_ENABLED=true`.
- Le taux d'achat du tunnel rapporte les ventes (tous acheteurs du code) aux inscriptions via le lien : ce ne sont pas les mêmes populations.
- Aucun e-mail automatique n'est envoyé au partenaire lors d'un refus, d'une suspension ou d'une reprise.
- Le taux de commission n'est pas figé au moment de la vente : modifier le taux recalcule l'historique.
- Les limites anti-abus sont en mémoire et remises à zéro à chaque redémarrage du serveur.
- La liste « Codes promo » de l'administration n'affiche pas les activations gratuites des codes partenaires.

## 5. Rejouer et nettoyer

```bash
# 1. Base jetable + schéma
createdb boligo_recette_partenaires
DATABASE_URL=postgresql://…/boligo_recette_partenaires DIRECT_URL=$DATABASE_URL npx prisma db push
psql "$DATABASE_URL" -f prisma/sql/2026-10-14_partenaires_suspension_conversions.sql
# 2. Builds (API locale)
npm run build
(cd mobile-steve && EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo export --platform web --output-dir /tmp/boligo-web-part)
(cd admin && NEXT_PUBLIC_API_URL=http://localhost:3000/api NEXT_PUBLIC_WEB_URL=http://localhost:8081 npm run build)
# 3. Serveurs : backend (NODE_ENV=development, OTP_DEBUG=true, PUBLIC_WEB_URL=http://localhost:8081,
#    ADMIN_ALLOWED_ORIGINS=http://localhost:8082, aucune clé e-mail ni Stripe), puis :
node mobile-steve/e2e/static-server.js /tmp/boligo-web-part 8081
node mobile-steve/e2e/static-server.js admin/out 8082
# 4. Recette
(cd mobile-steve && node e2e/recette-partenaires.js)
```

**Nettoyage intégral** : `mobile-steve/e2e/recette-partenaires-nettoyage.sql`.
- Il supprime en une transaction les partenaires et comptes `@boligo-demo.example` et leurs codes, avec toutes leurs dépendances (offres, statistiques, ventes confirmées, transactions, entretiens…).
- Il affiche ensuite un bilan qui doit valoir 0 / 0 / 0. Il a été testé deux fois entre les passages, avec ce résultat.
- En local, le plus simple est de supprimer la base : `dropdb boligo_recette_partenaires`.

Les accès fictifs (administrateur, membre, liens privés) sont générés à chaque passage. Ils sont écrits **hors du dépôt** avec les droits 0600 et ne sont jamais commités.

## 6. Avant tout déploiement

Appliquer d'abord, sur la base BOLIGO uniquement, `prisma/sql/2026-10-14_partenaires_suspension_conversions.sql`. Cette migration est additive :
- la valeur `SUSPENDU` ;
- la colonne `PartnerOffer.publishedAt` ;
- la table `PartnerOfferConversion`.

Le nouveau code en a besoin. **Non appliquée, en attente d'autorisation.**

## 7. Visualisation sur le site public : méthode proposée (non exécutée)

La recette n'en a pas eu besoin : les trois interfaces ont été vérifiées en local. Si Steve souhaite voir ces données sur le site public, voici la méthode de publication contrôlée proposée. **Elle ne sera exécutée qu'avec son autorisation.**

1. Sauvegarder Supabase BOLIGO (procédure §8.1 de `DEPLOIEMENT_RENDER.md`), puis appliquer la migration additive ci-dessus.
2. Déployer la branche sur Render, après fusion autorisée.
3. Créer **seulement des partenaires au statut non public** : « Nouveau », « En discussion », ou « Accepté » avec des offres en **brouillon**. Ils sont visibles dans l'administration et l'espace partenaire, **jamais par les membres**.
4. Pour voir une offre côté membre, publier **une seule** offre de démonstration avec une **date de fin courte** (par exemple 30 minutes). Elle expire d'elle-même, sans action.
5. Aucune vente simulée en production : le webhook non signé y est refusé, et c'est voulu.
6. Nettoyer ensuite avec `recette-partenaires-nettoyage.sql` et vérifier que le bilan affiche 0 / 0 / 0.
