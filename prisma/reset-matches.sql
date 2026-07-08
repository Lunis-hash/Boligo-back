-- =============================================================================
-- BOLIGO — Réinitialiser TOUS les matchs & parcours
-- =============================================================================
-- ⚠️  SAUVEGARDE OBLIGATOIRE AVANT EXÉCUTION
--     pg_dump -h localhost -U postgres -d boligo -F c -f boligo_backup.dump
--     ou dans pgAdmin : clic droit sur la base → Backup…
--
-- CONSERVE : User, Profile, InterviewIA, ModuleResponse, MentalMap, crédits
--            achetés (CreditTransaction sans journeyId)
-- SUPPRIME : MatchProposal, Journey, Harmonie, messages, vidéo, contacts, etc.
-- =============================================================================

-- --- État AVANT (optionnel, exécuter seul pour vérifier) ---
-- SELECT COUNT(*) AS propositions FROM "MatchProposal";
-- SELECT COUNT(*) AS parcours FROM "Journey";
-- SELECT COUNT(*) AS messages FROM "Message";

BEGIN;

-- 1. Harmonie (enfants avant parents)
DELETE FROM "HarmonyResponse";
DELETE FROM "HarmonyQuestion";

-- 2. Signalements liés aux messages de parcours
DELETE FROM "Report" WHERE "messageId" IS NOT NULL;

-- 3. Chat
DELETE FROM "Message";

-- 4. Vidéo, contacts, alumni
DELETE FROM "VideoSession";
DELETE FROM "ContactExchange";
DELETE FROM "AlumniCouple";

-- 5. Crédits liés à un parcours uniquement
DELETE FROM "CreditTransaction" WHERE "journeyId" IS NOT NULL;

-- 6. Parcours puis propositions
DELETE FROM "Journey";
DELETE FROM "MatchProposal";

-- 7. Notifications matching / parcours
DELETE FROM "Notification"
WHERE type IN (
  'nouveau_match',
  'question_harmonie',
  'message',
  'rappel_reponse'
);

-- 8. Comptes bloqués « en parcours » → actifs
UPDATE "User"
SET "accountStatus" = 'actif',
    "updatedAt" = NOW()
WHERE "accountStatus" = 'en_parcours';

COMMIT;

-- --- État APRÈS (doit afficher 0) ---
-- SELECT COUNT(*) AS propositions FROM "MatchProposal";
-- SELECT COUNT(*) AS parcours FROM "Journey";
-- SELECT COUNT(*) AS users_en_parcours FROM "User" WHERE "accountStatus" = 'en_parcours';
