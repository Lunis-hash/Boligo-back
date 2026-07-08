-- =============================================================================
-- BOLIGO — Promouvoir un utilisateur EXISTANT en admin (SQL uniquement)
-- =============================================================================
-- ⚠️  Ne crée PAS de mot de passe : l'utilisateur doit déjà exister.
--     Pour un nouveau compte admin avec mot de passe, utilisez plutôt :
--       cd backend
--       npm run seed:admin
-- =============================================================================

-- Remplace l'email par le tien :
UPDATE "User"
SET
  role = 'ADMIN',
  "accountStatus" = 'actif',
  "isVerified" = true,
  "updatedAt" = NOW()
WHERE email = 'admin@boligo.app';

-- Vérification :
-- SELECT id, email, role, "accountStatus" FROM "User" WHERE role = 'ADMIN';
