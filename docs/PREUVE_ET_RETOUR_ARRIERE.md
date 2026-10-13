# Preuve de recette et retour arrière — Sondeur fail-closed

Branche `claude/magical-keller-kw9t2c` (Draft PR #42). Recette **locale uniquement** :
base PostgreSQL locale, comptes fictifs (`@example.test`, `@boligo-test.fr`), aucun
Supabase ni Render de production, aucune donnée réelle de membre.

## 1. Correction

La rédaction IA du Sondeur est **fail-closed**. Sont concernées les questions, les
relances, l'escalade et la relecture (critic).

### Quand la rédaction est désactivée

La rédaction est éteinte dans chacun des cas suivants :

- `config/sondeur-models.json` absent ;
- JSON invalide ;
- qualification invalide ;
- `generation.enabled` qui n'est pas strictement le booléen `true`.

Dans ces cas, aucun appel n'est fait : ni OpenRouter, ni Groq.

### Modèles autorisés

- Modèle non qualifié : refusé, même s'il est imposé par une variable d'environnement.
- Aucun modèle qualifié disponible : on utilise les gabarits déterministes.
- `modelsFor(…, { strict: true })` ne renvoie plus les modèles historiques.

### Ce qui ne change pas

Les fonctions IA hors Sondeur ne changent pas : bio, modération, lectures du jour et bilan.

### Configuration de production

Elle est livrée avec `generation.enabled: false`. Le repli déterministe est décrit dans `docs/SONDEUR_REPLI.md`.

Commits : `d69a299` (correction et tests), suivi du commit de recette qui ajoute ce document.

## 2. Résultats

| Contrôle | Résultat |
|---|---|
| jest backend | 1415 / 1415 (92 suites) |
| jest application | 131 / 131 (20 suites) |
| `tsc -p tsconfig.build.json` | 0 erreur |
| Lint (`eslint {src,test}`) | 943 erreurs (≤ 962) |
| Intégration audit (V7.1) | 26 / 26 |
| Intégration V8.2 (qualification de test IA active) | 19 / 19 |
| Intégration circuit de sécurité | 8 / 8 |
| Intégration Sondeur déterministe, 3 jours (config production) | 4 / 4 |
| E2E navigateur, **build final**, config production | 40 / 40 applicables + 1 N/A (`NO_FAKE_GAP` : IA désactivée) |
| E2E navigateur, build final, qualification IA active (non-régression) | 41 / 41 |
| Paiement Stripe (webhook test signé) et admin | 16 / 16 |
| Parcours API complet (chat, vidéo, contacts, fin) | 81 / 81 |

### Tests unitaires du fail-closed

Fichier : `src/ai/sondeur-fail-closed.spec.ts`.

- Un test par scénario : fichier absent, JSON invalide, qualification invalide, `generation` absent, `enabled` absent, `"true"`, `1`, `false`, puis `true`.
- Un test « modèle non qualifié refusé ».
- Un test « aucun appel OpenRouter ni Groq » pour rédiger, relire et relancer.
- Un test « aucun modèle autorisé → gabarits ».
- Un test montrant que les fonctions IA hors Sondeur restent inchangées.

### Test d'intégration sur 3 jours

Fichier : `test/sondeur-deterministe.int.ts`. Il vérifie :

- la reprise sur la même question après redémarrage ;
- la confidentialité, puis la révélation ;
- le nombre adaptatif de questions (9 à 21) ;
- l'absence de régénération et de suppression ;
- que le jour suivant reste fermé jusqu'au lendemain.

### Recette sur le build final

Les tests tournent sur `dist/` (backend `node dist/main.js`) et sur l'export web Expo, servi en statique. Le parcours suivi est le suivant :

1. inscription ;
2. Grand Entretien ;
3. découverte ;
4. double consentement ;
5. paiement ;
6. Parcours Harmonie à 2 comptes sur 3 jours ;
7. chat ;
8. vidéo ;
9. échange de coordonnées ;
10. bilan (lectures des jours 1 à 3 et bilan final écrits) ;
11. administration.

### Pièces

- Captures : `mobile-steve/docs/screenshots/v82/` (configuration de production) et `resultats.json`.
- Journaux résumés : `docs/recette-build-final/` (`e2e-navigateur-config-production.txt`, `paiement-admin.txt`, `smoke-api-chat-video-contacts.txt`, réponses JSON des pages admin).

## 3. Paiement Stripe — ce qui est vérifié, et ce qui ne l'est pas

Aucune clé `sk_test_` n'est disponible. Le backend a donc tourné avec un secret de webhook **local** (`whsec_…`). Les événements `payment_intent.succeeded` (mode test, 15,00 €) ont été signés avec la bibliothèque officielle Stripe (`generateTestHeaderString`), comme le fait `stripe trigger`.

**Vérifié :**

- Webhook sans signature ou à signature invalide : 400, aucun crédit.
- Webhook signé : 1 crédit au bon compte.
- Rejeu de l'événement et même PaymentIntent : jamais crédité deux fois. Une seule ligne `CreditTransaction` porte `paymentRef = PaymentIntent`.
- Après paiement : l'invitation, l'acceptation (débit serveur) et l'accès au parcours fonctionnent.

**Non vérifié contre le vrai Stripe test :**

- la création réelle d'un PaymentIntent ou d'une session de paiement, et la page de paiement ;
- la livraison du webhook par les serveurs Stripe (secret de l'endpoint du tableau de bord) ;
- la ligne `Payment`, la facture et le remboursement, qui dépendent de l'objet Stripe réel.

À faire en préproduction avec une clé `sk_test_` et `stripe listen`.

## 4. Retour arrière

1. **Code** : sur `main`, `git revert -m 1 <commit de merge de la PR #42>`, puis push. Ce revert déclenche le redéploiement Render.
2. **Rétablissement immédiat** : sur Render, dans le service backend, ouvrir *Deploys*, choisir le déploiement du commit précédent, puis *Redeploy* (ou *Rollback*). Faire de même pour le web si besoin.
3. **Base de données** : les migrations sont **additives** (nouvelles colonnes ou tables, `prisma/sql/*.sql` idempotents). Elles restent en place : l'ancien code les ignore. Aucune suppression de colonne et aucune restauration de base ne sont nécessaires.
4. **Coupure du Sondeur IA sans redéploiement de code** : la rédaction IA est déjà désactivée par défaut (`generation.enabled: false`). Pour la couper après l'avoir activée, remettre `false`, ou supprimer le fichier : la rédaction se met alors en fail-closed et les gabarits déterministes prennent le relais.
5. **Vérification après retour arrière** :
   - `GET /api/health` ;
   - un parcours fictif en préproduction (inscription → première question du Sondeur) ;
   - le webhook Stripe test (`stripe trigger payment_intent.succeeded`).
