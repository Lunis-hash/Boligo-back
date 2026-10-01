# Rapport de mission — application mobile BOLIGO (« Boligo - STEVE »)

Ce dossier `mobile-steve/` contient la copie de travail **indépendante** de l'application
mobile BOLIGO (Expo / React Native), avec son historique Git complet, corrigée, testée et documentée.
Il est déposé ici (branche `claude/magical-keller-kw9t2c` de `Boligo-back`) parce que la création du
dépôt GitHub `Boligo-STEVE` a été refusée par l'intégration (HTTP 403 : « Resource not accessible by
integration » / « sessions are bound to their configured repositories »). **Aucun fichier de `Boligo-back`
n'est modifié** par cette branche en dehors de ce dossier et de ce rapport.

## 1. Source identifiée

| Preuve | Valeur |
|---|---|
| Dépôt | `Lunis-hash/oweke`, racine = application Expo `harmonie-expo-starter` (commit `432b66d`, 2026-08-24) |
| `app.json` | `Harmonie` / `harmonie-expo` / `com.harmonie.app`, plugins `expo-router`, Stripe, SecureStore |
| `eas.json` | `EXPO_PUBLIC_API_URL=https://boligo-back.onrender.com/api` |
| Code | routes `interview/`, `discover`, Sondeur, parcours Harmonie ; événements Socket.IO du `ChatGateway` |

`Boligo-Website` est le site vitrine (Next.js) ; son README mentionne un dossier `project/` Expo qui n'existe plus.
Le dépôt `oweke` mélangeait l'app mobile et un site Next.js OWEKE sans rapport : seul le mobile a été conservé.

## 2. Transplanter vers un dépôt `Boligo-STEVE`

```bash
# depuis un clone de Boligo-back sur cette branche
git subtree split --prefix=mobile-steve -b boligo-steve
git push git@github.com:Lunis-hash/Boligo-STEVE.git boligo-steve:main
```

Le sous-arbre conserve l'historique d'origine (`432b66d` et antérieurs) suivi des commits de la mission.

## 3. Ce qui a été fait

Voir `mobile-steve/docs/JOURNAL_RECETTE.md` (22 constats, priorité, preuve, commit correctif),
`mobile-steve/docs/ARCHITECTURE.md`, `mobile-steve/docs/API_AUDIT.md`, `mobile-steve/docs/E2E_RESULTATS.md`
et les captures `mobile-steve/docs/screenshots/`.

Corrections principales (commits atomiques, messages conventionnels) :

| Priorité | Domaine | Commit |
|---|---|---|
| P0 | installation reproductible, extraction du dépôt mélangé | `dbb404f`, `1f61545` |
| P0 | session sécurisée, refresh JWT, erreurs lisibles, plus de tokens dans les logs | `806ebcf` |
| P0 | socket authentifié, événements alignés sur le gateway, contacts révélés seulement après double consentement | `4fc69f9` |
| P0 | suppression de la connexion sociale simulée et des écrans morts, ajout mot de passe oublié / réinitialisation | `0b27b4e`, `6983211` |
| P0 | entretien : reprise correcte, module 10 posé, modules vides tolérés | `2472946` |
| P0 | crédits : solde backend seule source de vérité ; paiement : formules du backend, plus de crédit local | `060b71a`, `9a64fd8` |
| P0 (web) | résolution de l'URL API sûre sur le web | `0275522` |
| P1 | fin d'appel vidéo alignée sur le backend ; token push enregistré ; navigation depuis une notification | `eac4ecf`, `66fe9a1`, `75ab531` |
| P1 | périmètre de rencontre envoyé à l'inscription ; Sondeur : refus de modération affiché | `5a0ef4c`, `225b685` |
| P1 | profil : envoi des seuls champs modifiés ; carrousel d'accueil et étapes d'inscription | `5f71525`, `cd80bd9`, `4e5e568` |
| P2 | marges de barre d'état via safe-area ; `Alert` sur le web ; lint | `b9ecf63`, `daa89b1`, `779aaec` |
| Tests | Jest (8 suites, 33 tests), recette API (`scripts/backend-flow-smoke.js`), recette navigateur Playwright | `59fe0e0`, `82d1dfd`, `daa89b1` |

## 4. Résultats de recette

| Vérification | Résultat |
|---|---|
| `npm ci` / `npm run typecheck` / `npm run lint` | OK / 0 erreur / 0 erreur (69 avertissements hérités) |
| `npm test` | 8 suites, 33 tests OK |
| Recette API contre backend local (base vide) | 60/64 — les 4 échecs sont des bugs backend documentés |
| Recette navigateur (parcours complet, 390×844 + 360×640 + 768×1024) | **44/44 étapes OK** (`mobile-steve/docs/E2E_RESULTATS.md`) |

La production (Render, Supabase, Stripe) n'a été utilisée **qu'en lecture** ; aucun paiement, aucune donnée
client, aucune notification ou e-mail réel n'a été déclenché.

## 5. Points d'attention hors périmètre mobile (à traiter côté backend / infra)

Détail, preuves et corrections proposées : `mobile-steve/docs/BACKEND_ISSUES.md`.

1. **`Boligo-back` `main` ne compile pas** (`src/admin/admin.service.ts`) : les 3 derniers déploiements Render
   sont en `build_failed`, la production tourne toujours sur `0046ad8`.
2. **Sécurité** : IDOR sur `GET /journey/:id/*` ; contacts du partenaire renvoyés sans consentement ;
   `POST /credit/add` ouvert ; `connect`/`accept` ne débitent rien ; `otpDebugCode` renvoyé et code `1234`
   accepté en production ; `push-token` renvoie l'objet `User` complet (hash du mot de passe inclus) ;
   connexion sociale créant un compte sur simple `profile`.
3. **Supabase** : RLS désactivé sur les 20 tables (avis critique du tableau de bord).
4. **Secrets** : `eas.json` embarque une clé **publiable** Stripe de test dans le profil `production`
   (non secrète, mais à remplacer par la clé live via variable EAS). Aucun secret n'est reproduit dans les rapports.

## 6. Hypothèses temporaires

Listées dans `mobile-steve/docs/JOURNAL_RECETTE.md` § 4 (débit du crédit au like côté app tant que le backend
ne le fait pas ; crédit débité avant d'accepter un like reçu ; paiement carte et vidéo indisponibles sur le web).

---

## 7. Phase 2 — Produit fini, hébergement bas coût et flux métier (2026-10-01)

Cahier des charges « BOLIGO (Mobile & Web) », six jalons. Détail : `mobile-steve/docs/DEPLOIEMENT.md`
(architecture et mode d'emploi), `mobile-steve/docs/AUDIT_METIER.md` (entretien, découverte, tunnel
relationnel, modération, vidéo, modèle économique), `mobile-steve/docs/backend-proposals/` (patchs).

| Jalon | Fait | Reste à faire (humain) |
|---|---|---|
| 1. Hébergement | **RLS activé sur les 20 tables Supabase** (migration `enable_rls_boligo_tables`, backend non affecté : rôle propriétaire). Base Render bannie, tout repose sur Supabase. Cold start : réveil du serveur au lancement de l'app + message d'attente. Arborescence : `mobile-steve/` + README. | Créer le Static Site Render `boligo-web` (réglages prêts, § 3.2 de DEPLOIEMENT.md ; la création par API a été refusée par la politique de permissions). Appliquer `admin-service-build-fix.patch` pour que `main` redéploie. |
| 2. Grand Entretien | 69 questions / 11 modules auditées : bonne couverture valeurs, projet, communication, lignes rouges. 7 questions ciblées proposées (substances, polygamie, dettes, confiance/téléphone, réconciliation, temps ensemble, gestion des divergences) + coquille. | Relire et appliquer `interview-questions-enrichment.patch` (décision produit sur la question polygamie). |
| 3. Découverte | Score et filtres audités : like/match reposent sur les cartes mentales issues de l'entretien. App : nouveau bloc **« Sujets à aborder »** (piliers faibles → questions d'ouverture), distance inventée supprimée. | Appliquer `discover-strict-filters-real-details.patch` (fin du repli hors périmètre, fin des données inventées). Décider des critères durs (enfants, religion, fidélité). |
| 4. Modèle économique | Formule unique « Parcours Harmonie » 15 € / 1 crédit verrouillée côté app ; crédit validé par le serveur ; dépendance Supabase inutile retirée ; `pk_test` dans les profils de test. | Renseigner `STRIPE_SECRET_KEY` (`sk_test`) et `STRIPE_WEBHOOK_SECRET` sur Render ; clé live en production via EAS. |
| 5. Tunnel relationnel | **7 questions par jour pendant 3 jours appliqué dans l'app** (ouverture calendaire, « Disponible demain »), chat libre après réponses des deux, chat → vidéo après 3 jours, règle de justice, double consentement : vérifiés. Questions de scénarios : IA personnalisée à partir des deux profils quand `OPENROUTER_API_KEY` est configurée. | Appliquer `sondeur-day-gating.patch` (le serveur acceptait les 21 réponses d'une traite). |
| 6. Modération & vidéo | Filtrage avant envoi, modération serveur, signalement : testés. **Un compte suspendu peut encore se connecter** (prouvé) → patch `account-status-enforcement.patch`, message clair dans l'app. Vidéo : 2 minutes, Daily éphémère avec éjection à 120 s, repli Jitsi, tempo vérifié. | Créer le compte Daily.co et renseigner `DAILY_API_KEY` sur Render (inscription humaine requise). |

Recette de non-régression après cette phase : typecheck 0 erreur, lint 0 erreur, Jest 10 suites / 44 tests,
recette navigateur **47/47 étapes OK** (`mobile-steve/docs/E2E_RESULTATS.md`).

Commits de la phase (dans `mobile-steve/`) : `25b1bad` paiement, `8b94648` Sondeur calendaire,
`1ce0065` sujets à aborder, `dc86921` réveil du serveur, puis tests, documentation et patchs.
