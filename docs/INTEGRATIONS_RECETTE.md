# Intégrations externes : RÉEL / SIMULÉ / À CONFIGURER (14 octobre 2026)

Sources : journaux de démarrage du service Render `Boligo-back` (lus en
lecture seule : ligne `[CONFIG]`, `[EMAIL] Mode d'envoi`, avertissements),
code de la branche `claude/recette-ge-v82-ergonomie`, et essais de la recette.
**Aucun secret n'est lu ni recopié ici** : seule la présence ou l'absence
d'un réglage est indiquée.

| Intégration | Production (Render `Boligo-back`) | Prévisualisation de recette (`Dockerfile.preview`) | Recette locale (`./recette.sh`) |
|---|---|---|---|
| **Resend** (e-mails) | **RÉEL** : journal « Mode d'envoi : resend », domaine boligo.fr | **SIMULÉ** : jamais envoyé hors de `@recette.boligo.test` et `@boligo-demo.example` ; sans clé, tout est écrit dans le journal (« EMAIL PRÉVISUALISATION — non envoyé ») | **SIMULÉ** (journal de l'API) |
| **Google OAuth** (connexion Google) | **À VÉRIFIER** : `GOOGLE_CLIENT_IDS` n'apparaît pas dans les journaux ; le code refuse tout jeton d'une autre application | **DÉSACTIVÉ** ; pour l'activer : ajouter l'origine `https://<service>.onrender.com` dans Google Cloud Console, puis poser `GOOGLE_CLIENT_IDS` | **DÉSACTIVÉ** |
| **Stripe** | **MODE TEST** : clé de test, secret de webhook présent (journal `[CONFIG]`). Le passage en LIVE reste **À CONFIGURER** (docs/STRIPE_PASSAGE_EN_LIVE.md) | **DÉSACTIVÉ** sans clé (codes `RECETTE100` / `RECETTE50`) ; `sk_test_` facultative ; toute clé LIVE fait **refuser le démarrage** | **DÉSACTIVÉ** sans clé ; clé `sk_test_` facultative, LIVE refusée |
| **OpenRouter** (IA du Sondeur) | **REPLI DÉTERMINISTE** (fail-closed) : `config/sondeur-models.json` → `generation.enabled=false` ; questions de la banque locale | **SIMULÉ** : banque locale (`HARMONY_QUESTIONS_SOURCE=bank`), aucune clé | **SIMULÉ** : banque locale ; faux OpenRouter local avec `--faux-ia` |
| **Groq** (rédaction du portrait) | **RÉEL** : journal « [Groq] Modèle retenu » | **DÉSACTIVÉ** : portraits rédigés par les règles | **DÉSACTIVÉ** |
| **Daily** (vidéo) | **CONFIGURÉ** : aucun avertissement « DAILY_API_KEY manquante » au démarrage | **NON CONFIGURÉ** : mode dégradé (pas d'appel vidéo réel) | **NON CONFIGURÉ** : mode dégradé |
| **Supabase** (base) | **RÉEL** : base de production (projet Supabase, ligne `[CONFIG] base=…`) | **REFUSÉ** : la prévisualisation et les seeds refusent toute URL Supabase ; base Postgres Render gratuite et dédiée | **REFUSÉ** : Postgres local (Docker ou 127.0.0.1) |
| **Render** (hébergement) | **RÉEL** : `Boligo-back` (API), `boligo-web`, `boligo-admin` (sites statiques), branche `main` | **À CRÉER par Steve** : un service web Docker gratuit et une base Postgres gratuite (docs/PREVISUALISATION_RECETTE.md) | Sans objet |

## Ce qui a été réellement testé dans cette recette

- **Stripe mode TEST**, par l'API Stripe de test : paiement réussi avec `pm_card_visa` (`livemode=false`), crédit attribué. Voir docs/recette-ergonomie/paiement-test.txt et docs/recette-stripe-test/.
- **E-mails** : seulement leur rétention (journal) en prévisualisation. Aucun envoi réel n'a été fait.
- **OpenRouter et IA réelle** : **NON TESTÉS**. Le Sondeur a été vérifié en banque locale (repli fail-closed) et avec un faux OpenRouter local et déterministe (e2e V8.2).
- **Daily** : **NON TESTÉ** (fournisseur non joignable sans clé dans la recette).
- **Google OAuth** : **NON TESTÉ**.
- **Géocodeurs** (geo.api.gouv.fr, Photon, Nominatim) : bloqués par le réseau du conteneur de recette. Ils ont été testés seulement avec des réponses **simulées**, et à refaire dans le navigateur de Steve.
