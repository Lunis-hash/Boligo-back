-- =====================================================
-- BOLIGO - Script complet de test
-- Sam (homme) + 3 profils féminins + matchs
-- =====================================================

-- ── SAM (homme) ──────────────────────────────────────
INSERT INTO "User" (id, email, telephone, "passwordHash", "firstName", "lastName", "birthDate", gender, city, "accountStatus", "creditBalance", "isVerified", "createdAt", "updatedAt")
VALUES ('fb80515a-c0dd-4f56-93e9-1c45a796d12c',
  'sam.kouassi@gmail.com', '+2250700000001',
  '$2b$12$dummyhashpassword1234567890abcdefghijk',
  'Sam', 'Kouassi', '1995-08-20', 'H', 'Abidjan, Côte d''Ivoire', 'actif', 100, true, NOW(), NOW());

INSERT INTO "Profile" (id, "userId", description, "displayedCity", profession, "profileStatus")
VALUES ('prof-sam-000', 'fb80515a-c0dd-4f56-93e9-1c45a796d12c',
  'Développeur et passionné de musique. Je cherche une femme sincère et ambitieuse.', 'Abidjan, Côte d''Ivoire', 'Développeur', 'complet');

INSERT INTO "InterviewIA" (id, "userId", status, "startDate", version)
VALUES ('interview-sam-000', 'fb80515a-c0dd-4f56-93e9-1c45a796d12c', 'termine', NOW(), 1);

INSERT INTO "MentalMap" (id, "userId", "interviewId", synthesis, bio, "needsList", "redFlags", "keyValues", "maturityScore", "alchemyScore", version, "generatedAt")
VALUES ('mental-sam-000', 'fb80515a-c0dd-4f56-93e9-1c45a796d12c', 'interview-sam-000',
  'Sam est un homme ambitieux et bienveillant. Il valorise la communication et le partage.',
  'Développeur et passionné de musique.',
  '["Communication", "Ambition partagée", "Famille"]', '[]', '["Technologie", "Musique", "Famille"]',
  0.85, 0.80, 1, NOW());

-- ── AMINA ────────────────────────────────────────────
INSERT INTO "User" (id, email, telephone, "passwordHash", "firstName", "lastName", "birthDate", gender, city, "accountStatus", "creditBalance", "isVerified", "createdAt", "updatedAt")
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'amina.diop@gmail.com', '+2250701020304',
  '$2b$12$dummyhashpassword1234567890abcdefghijk',
  'Amina', 'Diop', '1998-06-15', 'F', 'Dakar, Sénégal', 'actif', 50, true, NOW(), NOW());

INSERT INTO "Profile" (id, "userId", description, "displayedCity", profession, "profileStatus")
VALUES ('prof-amin-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Passionnée de voyages et de cuisine. Je cherche quelqu''un de sincère.', 'Dakar, Sénégal', 'Journaliste', 'complet');

INSERT INTO "InterviewIA" (id, "userId", status, "startDate", version)
VALUES ('interview-amin-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'termine', NOW(), 1);

INSERT INTO "MentalMap" (id, "userId", "interviewId", synthesis, bio, "needsList", "redFlags", "keyValues", "maturityScore", "alchemyScore", version, "generatedAt")
VALUES ('mental-amin-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'interview-amin-001',
  'Amina valorise la communication honnête et le respect mutuel.',
  'Passionnée de voyages et de cuisine.',
  '["Communication honnête", "Ambition partagée"]', '[]', '["Famille", "Voyage", "Sincérité"]',
  0.82, 0.78, 1, NOW());

-- ── FATOU ────────────────────────────────────────────
INSERT INTO "User" (id, email, telephone, "passwordHash", "firstName", "lastName", "birthDate", gender, city, "accountStatus", "creditBalance", "isVerified", "createdAt", "updatedAt")
VALUES ('b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'fatou.kone@gmail.com', '+2250702030405',
  '$2b$12$dummyhashpassword1234567890abcdefghijk',
  'Fatou', 'Koné', '2000-03-22', 'F', 'Abidjan, Côte d''Ivoire', 'actif', 30, true, NOW(), NOW());

INSERT INTO "Profile" (id, "userId", description, "displayedCity", profession, "profileStatus")
VALUES ('prof-fatou-002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Étudiante en médecine, je rêve d''un homme sérieux et attentionné.', 'Abidjan, Côte d''Ivoire', 'Médecin', 'complet');

INSERT INTO "InterviewIA" (id, "userId", status, "startDate", version)
VALUES ('interview-fatou-002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'termine', NOW(), 1);

INSERT INTO "MentalMap" (id, "userId", "interviewId", synthesis, bio, "needsList", "redFlags", "keyValues", "maturityScore", "alchemyScore", version, "generatedAt")
VALUES ('mental-fatou-002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'interview-fatou-002',
  'Fatou est déterminée avec un fort sens des responsabilités.',
  'Étudiante en médecine, je rêve d''un homme sérieux.',
  '["Stabilité émotionnelle", "Projet familial"]', '[]', '["Médecine", "Famille", "Foi"]',
  0.88, 0.85, 1, NOW());

-- ── MARIAM ───────────────────────────────────────────
INSERT INTO "User" (id, email, telephone, "passwordHash", "firstName", "lastName", "birthDate", gender, city, "accountStatus", "creditBalance", "isVerified", "createdAt", "updatedAt")
VALUES ('c3d4e5f6-a7b8-9012-cdef-123456789012',
  'mariam.traore@gmail.com', '+2230703040506',
  '$2b$12$dummyhashpassword1234567890abcdefghijk',
  'Mariam', 'Traoré', '1997-11-08', 'F', 'Bamako, Mali', 'actif', 45, true, NOW(), NOW());

INSERT INTO "Profile" (id, "userId", description, "displayedCity", profession, "profileStatus")
VALUES ('prof-mari-003', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Entrepreneuse et fière. Je cherche un partenaire qui respecte mon ambition.', 'Bamako, Mali', 'Entrepreneuse', 'complet');

INSERT INTO "InterviewIA" (id, "userId", status, "startDate", version)
VALUES ('interview-mari-003', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'termine', NOW(), 1);

INSERT INTO "MentalMap" (id, "userId", "interviewId", synthesis, bio, "needsList", "redFlags", "keyValues", "maturityScore", "alchemyScore", version, "generatedAt")
VALUES ('mental-mari-003', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'interview-mari-003',
  'Mariam est ambitieuse et indépendante. Elle cherche un égal.',
  'Entrepreneuse et fière.',
  '["Ambition partagée", "Indépendance"]', '[]', '["Entrepreneuriat", "Leadership", "Innovation"]',
  0.90, 0.87, 1, NOW());

-- ── MATCH PROPOSALS ──────────────────────────────────
INSERT INTO "MatchProposal" (id, "sourceUserId", "targetUserId", "compatibilityScore", "iaExplanation", "proposedAt", "expiresAt", status, "weekNumber")
VALUES ('match-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'fb80515a-c0dd-4f56-93e9-1c45a796d12c', 0.87,
  'Amina et Sam partagent des valeurs familiales fortes.',
  NOW(), NOW() + INTERVAL '7 days', 'acceptee', 1);

INSERT INTO "MatchProposal" (id, "sourceUserId", "targetUserId", "compatibilityScore", "iaExplanation", "proposedAt", "expiresAt", status, "weekNumber")
VALUES ('match-002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'fb80515a-c0dd-4f56-93e9-1c45a796d12c', 0.92,
  'Fatou et Sam ont des profils très compatibles.',
  NOW(), NOW() + INTERVAL '7 days', 'acceptee', 1);

INSERT INTO "MatchProposal" (id, "sourceUserId", "targetUserId", "compatibilityScore", "iaExplanation", "proposedAt", "expiresAt", status, "weekNumber")
VALUES ('match-003', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'fb80515a-c0dd-4f56-93e9-1c45a796d12c', 0.78,
  'Mariam et Sam partagent une ambition commune.',
  NOW(), NOW() + INTERVAL '7 days', 'en_attente', 1);

-- ── CREDITS ──────────────────────────────────────────
INSERT INTO "CreditTransaction" (id, "userId", type, "creditAmount", "euroAmount", "paymentRef", date, description)
VALUES ('trans-001', 'fb80515a-c0dd-4f56-93e9-1c45a796d12c',
  'achat', 100, 9.99, 'PAY-SIM-001', NOW(), 'Achat 100 crédits');

-- ✅ Terminé !
