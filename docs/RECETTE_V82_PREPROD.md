# BOLIGO V8.2 — recette avant préproduction

Branche `claude/magical-keller-kw9t2c`. Rien n'a été fusionné ni déployé. Supabase et Render de production n'ont pas été touchés.

## Décision

- **Préproduction : oui.**
- **Production : non**, tant que les 3 blocages ci-dessous ne sont pas levés.

## Blocages

1. **IA réelle non testée en bout de chaîne.** Il faut une clé OpenRouter, et l'hôte `openrouter.ai` doit être autorisé dans l'environnement. Le relecteur (GPT) n'a jamais tourné.
2. **Membres anglophones : le Sondeur est en anglais, le reste de l'écran non.** L'en-tête, les lectures du jour et le Bilan restent en français.
3. **Impact sur les membres V7.1 à mesurer sur une copie de préproduction.** La nouvelle mise à l'abri masque des profils (voir les chiffres plus bas).

## Corrigé et vérifié

| Sujet | Résultat |
|---|---|
| Version d'entretien | Fixée dès l'inscription et immuable. Un entretien V7.1 terminé n'est plus bloqué au dernier module. |
| Sécurité | Une alerte critique masque le profil et bloque les invitations. Une réponse isolée n'est pas sanctionnée. Les réponses en attente de classement sont reprises dès que l'IA répond. |
| Sondeur bilingue | 100 % des questions ont leur version anglaise. Un couple FR/EN reçoit les mêmes questions, chacun dans sa langue. |
| Questions | Les tournures alambiquées sont réécrites en questions directes. Un accord n'est plus redemandé. L'IA reçoit la même consigne et le code rejette ces tournures. |
| Données envoyées à l'IA | Aucune réponse sensible (religion, intimité), ni âge exact, ni ville. |

## Preuves

- **Tests unitaires :** 1 236 sur 1 236 (backend) et 131 sur 131 (app).
- **Base locale isolée :** V7.1 26/26, V8.2 18/18, sécurité 8/8.
- **Navigateur (`mobile-steve/e2e/v82.e2e.js`) :** 36 vérifications sur 37.
  - Couvert : Grand Entretien FR/EN, plages d'âge, reprise, conditions, consentement, Découverte, invitation, Sondeur sur 3 jours et confidentialité.
  - Le point non vérifié est l'ouverture du tchat. Quand l'IA est en panne, elle attend 3 tentatives de lecture, environ 20 minutes ; c'est le comportement prévu.
  - Captures dans `mobile-steve/docs/screenshots/v82/`.
- **Essai IA sur couples fictifs** (`docs/ia-essais/`), avec le prompt de production et un modèle Claude Opus comme rédacteur :
  - 114 questions proposées, 79 acceptées par le code ;
  - aucune fuite de réponse ;
  - version anglaise toujours présente.
  - Cet essai a révélé le style alambiqué, qui est maintenant corrigé.
  - Faux refus : environ 1 rejet sur 3 vient des règles strictes du contrat de preuves (« votre projet », « vivez »). C'est le prix de la prudence.
  - Coût estimé : environ 11 000 jetons d'entrée par jour et par couple.
  - Aucune relecture ne garantit 100 % de fiabilité.

## Membres V7.1 (couples fictifs proches, moteur de production comparé à la branche)

- **Incompatibilités déclarées :** de 41 % à 26 % (10 % de réponses différentes) et de 56 % à 44 % (25 % de réponses différentes).
- **Mise à l'abri nouvelle :** environ 10 % de ces couples.
  - La proportion réelle dépend du nombre de membres qui choisissent ces réponses.
  - Elle est à mesurer sur une copie en préproduction.
- **Scores :** écart moyen de 4 à 8 points.

## Activation et retour arrière

- **Retour à la V7.1 :** retirer `INTERVIEW_VERSION` et `INTERVIEW_V82_PERCENT`. Les entretiens déjà commencés gardent leur version.
- **Activation progressive :** `INTERVIEW_V82_PERCENT=10`, puis 50, puis 100. La répartition des membres est stable.
- **Migrations à appliquer en préproduction** (elles ne font qu'ajouter) :
  - `prisma/sql/2026-10-12_version_entretien.sql`
  - `prisma/sql/2026-10-12_sondeur_bilingue.sql`
