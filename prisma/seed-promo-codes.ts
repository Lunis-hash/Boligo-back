/**
 * Seed des codes promotionnels BOLIGO initiaux
 * Migre les codes hardcodés vers la base de données
 * 
 * Exécuter : ts-node prisma/seed-promo-codes.ts
 */

import { PrismaClient, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎟️  Seeding codes promo BOLIGO...\n');

  const promoCodes = [
    // Codes 100% gratuits
    {
      code: 'BOLIGO100',
      discountType: DiscountType.free,
      discountValue: 0,
      maxUses: null, // illimité
      expiresAt: null,
      isActive: true,
      description: 'Code fondateur — accès 100% gratuit',
    },
    {
      code: 'HARMONIE',
      discountType: DiscountType.free,
      discountValue: 0,
      maxUses: 100,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      isActive: true,
      description: 'Code lancement — 100 utilisations max',
    },
    {
      code: 'WELCOME',
      discountType: DiscountType.free,
      discountValue: 0,
      maxUses: 50,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      isActive: true,
      description: 'Code bienvenue — 50 utilisations max',
    },
    // Code -50%
    {
      code: 'BOLIGO50',
      discountType: DiscountType.percent,
      discountValue: 50,
      maxUses: null,
      expiresAt: null,
      isActive: true,
      description: '50% de réduction sur le Parcours Harmonie',
    },
    // Code -5€
    {
      code: 'BIENVENUE5',
      discountType: DiscountType.fixed,
      discountValue: 500, // 5,00€ en centimes
      maxUses: null,
      expiresAt: null,
      isActive: true,
      description: '5€ de réduction sur le premier parcours',
    },
    // Code beta testeurs
    {
      code: 'BETA2026',
      discountType: DiscountType.free,
      discountValue: 0,
      maxUses: 200,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      isActive: true,
      description: 'Beta testeurs 2026 — accès gratuit',
    },
  ];

  for (const promo of promoCodes) {
    const existing = await prisma.promoCode.findUnique({ where: { code: promo.code } });
    if (existing) {
      console.log(`⏭️  Code "${promo.code}" déjà existant — ignoré.`);
      continue;
    }

    await prisma.promoCode.create({ data: promo });
    console.log(`✅ Code créé : ${promo.code} (${promo.discountType === 'free' ? '100% gratuit' : promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${promo.discountValue / 100}€`})`);
  }

  const total = await prisma.promoCode.count();
  console.log(`\n✅ Seed terminé — ${total} codes promo en base de données.\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
