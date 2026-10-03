# Stripe BOLIGO : état actuel et passage en paiements réels

BOLIGO reste **en mode test** : aucune carte réelle n'est débitée. Tout ce qui peut
être préparé l'est ; le passage en réel se fait en remplaçant trois valeurs.

## Ce qui est en place (test)

| Élément | État |
|---|---|
| Compte Stripe | « environnement de test BOLIGO » (bac à sable, distinct de tout autre projet) |
| Clé secrète (`STRIPE_SECRET_KEY`, service Render `Boligo-back`) | test (`sk_test_…`) |
| Clé publique servie par l'API (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, Render) | test (`pk_test_…`) |
| Clé publique des builds de l'app (`mobile-steve/eas.json`, profils development, preview **et production**) | test (`pk_test_…`) |
| Crédit d'un paiement | `POST /api/payment/confirm` : le serveur relit le paiement chez Stripe, vérifie le membre et le statut, crédite une seule fois |
| Webhook (filet de sécurité) | route prête : `POST https://boligo-back.onrender.com/api/payment/webhook`, signature obligatoire en production ; **secret à créer** (voir ci-dessous) |
| Contrôle au démarrage | l'API écrit dans ses journaux si les clés publique et secrète ne sont pas du même mode, ou si le secret du webhook manque (jamais la valeur des clés) |

## Étape restante en test : le webhook (2 minutes)

1. Ouvrir le tableau de bord Stripe sur **l'environnement de test BOLIGO** (vérifier le nom en haut à gauche).
2. Développeurs → Webhooks → **Ajouter une destination**.
3. URL : `https://boligo-back.onrender.com/api/payment/webhook`
4. Événement : `payment_intent.succeeded` (seul événement utilisé).
5. Enregistrer, puis **Révéler** le secret de signature (`whsec_…`).
6. Le renseigner sur Render, service `Boligo-back`, variable `STRIPE_WEBHOOK_SECRET` (ou le transmettre pour qu'il soit renseigné).
7. Contrôle : au redémarrage, la ligne « STRIPE_WEBHOOK_SECRET absent » disparaît des journaux. Un paiement de test avec la carte `4242 4242 4242 4242` crédite 1 crédit une seule fois, même si le webhook et la confirmation de l'app arrivent ensemble.

## Le jour du passage en réel

Pré-requis côté Stripe (compte BOLIGO uniquement) :
- activer le compte : raison sociale, SIREN, représentant légal, IBAN de versement ;
- libellé de relevé bancaire : `BOLIGO` ;
- reçus par e-mail activés, nom et logo BOLIGO ;
- mentions légales et CGV à jour dans `mobile-steve/constants/legal.json` (prix 15 € TTC, droit de rétractation pour un service numérique, remboursement de la Règle de Justice).

Remplacements (trois valeurs, rien d'autre) :

| Où | Variable | Valeur |
|---|---|---|
| Render `Boligo-back` | `STRIPE_SECRET_KEY` | `sk_live_…` du compte BOLIGO |
| Render `Boligo-back` | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` du compte BOLIGO |
| `mobile-steve/eas.json`, profil `production` | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` (puis nouvelle build de production) |

Puis :
- créer le **webhook en mode réel** (même URL, même événement) et remplacer `STRIPE_WEBHOOK_SECRET` par le nouveau `whsec_…` ;
- redéployer l'API et vérifier dans les journaux : « Stripe connecté : compte « … BOLIGO … », mode RÉEL » et aucune alerte d'incohérence ;
- faire un achat réel de 15 € avec une carte personnelle, vérifier le crédit, puis le rembourser depuis Stripe.

## À ne jamais faire

- Utiliser une clé, un compte ou un webhook d'un autre projet : BOLIGO a son propre compte Stripe.
- Mettre une clé secrète (`sk_…`) ou un secret de webhook (`whsec_…`) dans le dépôt ou dans l'app : seulement dans les variables Render.
- Mélanger les modes : clé publique et clé secrète doivent être toutes deux de test ou toutes deux réelles.
