/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- doublures de test typées « any », comme les autres tests d’intégration */
/**
 * Intégration du programme partenaires sur une base PostgreSQL LOCALE :
 * taux de commission figé à la vente, reprise au prorata des remboursements,
 * concordance Espace partenaire / administration, statuts d'offre et codes
 * refusés après suspension. Les paiements passent par le webhook Stripe
 * simulé (non signé, accepté hors production sans secret) : aucun appel Stripe.
 *
 *   npm run test:int:partenaires
 * Les données créées (préfixe « int-part- ») sont supprimées à la fin.
 */
import 'dotenv/config';
import * as assert from 'assert';
import {
  PartnerStatus,
  PartnerType,
  PartnerVerification,
} from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreditService } from '../src/credit/credit.service';
import { PaymentService } from '../src/payment/payment.service';
import { InvoiceService } from '../src/payment/invoice.service';
import { PartnersService } from '../src/partners/partners.service';
import { PartnerTrackingService } from '../src/partners/partner-tracking.service';
import { assertLocalDatabase } from '../prisma/recette-guard';

assertLocalDatabase(process.env.DATABASE_URL);
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.STRIPE_SECRET_KEY;
process.env.NODE_ENV = 'development';
process.env.BILLING_ENABLED = 'false';

const prisma = new PrismaService();
const config = { get: () => undefined } as any;
const email: any = {
  sendSimpleEmail: async () => undefined,
  sendEmail: async () => undefined,
  sendPaymentConfirmationEmail: async () => undefined,
};
const credit = new CreditService(prisma);
const invoices = new InvoiceService(config, prisma, email);
const payment = new PaymentService(config, prisma, credit, email, invoices);
const tracking = new PartnerTrackingService(prisma);
const partners = new PartnersService(prisma, email, {} as any, tracking);

const tag = `int-part-${Date.now().toString(36)}`;
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function webhook(event: object) {
  await payment.handleWebhook(Buffer.from(JSON.stringify(event)), '');
}
async function pay(userId: string, code: string, cents: number, ref: string) {
  await webhook({
    id: `evt_${ref}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: ref,
        amount: cents,
        metadata: {
          userId,
          credits: '1',
          planName: 'Parcours Harmonie',
          promoCode: code,
        },
      },
    },
  });
}
async function refund(ref: string, total: number, cumul: number) {
  await webhook({
    id: `evt_${ref}_r${cumul}`,
    type: 'charge.refunded',
    data: {
      object: {
        id: `ch_${ref}`,
        payment_intent: ref,
        amount: total,
        amount_refunded: cumul,
      },
    },
  });
}

async function main() {
  const userIds: string[] = [];
  const member = async (i: number) => {
    const u = await prisma.user.create({
      data: {
        email: `${tag}-m${i}@boligo-demo.example`,
        firstName: `Membre${i}`,
        lastName: 'Démo',
        gender: 'F',
        birthDate: new Date('1992-01-01'),
        isVerified: true,
      } as any,
    });
    userIds.push(u.id);
    return u.id;
  };
  const code = await prisma.promoCode.create({
    data: {
      code: `INT${Date.now().toString(36).toUpperCase()}`.slice(0, 20),
      discountType: 'percent',
      discountValue: 10,
    },
  });
  const partner = await prisma.partnerApplication.create({
    data: {
      type: PartnerType.AMBASSADEUR,
      status: PartnerStatus.ACCEPTE,
      name: `${tag} Ambassadeur`,
      email: `${tag}@boligo-demo.example`,
      country: 'FR',
      message: 'Test d’intégration',
      commissionRate: 20,
      promoCodeId: code.id,
      verificationStatus: PartnerVerification.VERIFIE,
    },
  });

  try {
    const [m1, m2, m3, m4] = [
      await member(1),
      await member(2),
      await member(3),
      await member(4),
    ];

    await check(
      'le code est appliqué au paiement (−10 % : 15,00 € → 13,50 €)',
      async () => {
        const r = await (payment as any).resolvePromoCode(code.code, m1, 1500);
        assert.equal(r.isValid, true);
        assert.equal(r.finalAmount, 1350);
        assert.equal(r.promoCodeId, code.id);
      },
    );

    await check(
      'vente : commission au taux du jour, figé sur la ligne',
      async () => {
        await pay(m1, code.code, 1350, `pi_${tag}_1`);
        await pay(m1, code.code, 1350, `pi_${tag}_1`); // webhook rejoué
        const lines = await prisma.partnerCommission.findMany({
          where: { partnerId: partner.id },
        });
        assert.equal(lines.length, 1, 'un seul enregistrement malgré le rejeu');
        assert.equal(lines[0].ratePercent, 20);
        assert.equal(lines[0].commissionCents, 270);
      },
    );

    await check(
      'changer le taux ne réécrit pas les ventes passées',
      async () => {
        await prisma.partnerApplication.update({
          where: { id: partner.id },
          data: { commissionRate: 25 },
        });
        await pay(m2, code.code, 1350, `pi_${tag}_2`);
        const lines = await prisma.partnerCommission.findMany({
          where: { partnerId: partner.id, kind: 'VENTE' },
          orderBy: { createdAt: 'asc' },
        });
        assert.deepEqual(
          lines.map((l) => [l.ratePercent, l.commissionCents]),
          [
            [20, 270],
            [25, 338],
          ],
        );
      },
    );

    await check(
      'remboursement partiel : reprise au prorata, traçable',
      async () => {
        await refund(`pi_${tag}_2`, 1350, 675);
        await refund(`pi_${tag}_2`, 1350, 675); // rejoué
        const r = await prisma.partnerCommission.findMany({
          where: { partnerId: partner.id, kind: 'REPRISE' },
        });
        assert.equal(r.length, 1);
        assert.equal(r[0].amountCents, 675);
        assert.equal(r[0].commissionCents, -169);
        assert.equal(r[0].ratePercent, 25);
        assert.ok(r[0].saleId, 'reprise rattachée à la vente');
        assert.match(r[0].reason ?? '', /partiel/);
      },
    );

    await check(
      'remboursement total : commission annulée (jamais négative)',
      async () => {
        await refund(`pi_${tag}_2`, 1350, 1350);
        const sum = await prisma.partnerCommission.aggregate({
          where: { paymentRef: `pi_${tag}_2` },
          _sum: { commissionCents: true },
        });
        assert.equal(sum._sum.commissionCents, 0);
      },
    );

    await check(
      'paiement sans code partenaire : aucune commission',
      async () => {
        await webhook({
          id: `evt_${tag}_nc`,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: `pi_${tag}_nc`,
              amount: 1500,
              metadata: { userId: m3, credits: '1' },
            },
          },
        });
        assert.equal(
          await prisma.partnerCommission.count({
            where: { paymentRef: `pi_${tag}_nc` },
          }),
          0,
        );
      },
    );

    await check(
      'admin et Espace partenaire affichent les mêmes chiffres',
      async () => {
        await prisma.partnerDailyStat.create({
          data: {
            promoCodeId: code.id,
            day: new Date(),
            visits: 40,
            signups: 5,
          },
        });
        const admin = await partners.get(partner.id);
        assert.deepEqual(admin.sales, {
          purchases: 2,
          freeActivations: 0,
          revenue: 13.5,
          gross: 27,
          refunded: 13.5,
          refundedSales: 1,
          commission: 2.7,
          commissionGross: 6.08,
          commissionReversed: 3.38,
        });
        // Clics ≠ conversions vérifiées ≠ revenu confirmé.
        assert.deepEqual(admin.metrics, {
          clicks: 40,
          signups: 5,
          verifiedConversions: 2,
          confirmedRevenue: 13.5,
        });
        const { portalLink } = await partners.sendPortalLink(partner.id);
        const space = await partners.portal(portalLink.split('#')[1]);
        assert.equal(space.totals.revenue, admin.sales.revenue);
        assert.equal(space.totals.commission, admin.sales.commission);
        assert.equal(space.totals.refunded, admin.sales.refunded);
        assert.deepEqual(space.metrics, admin.metrics);
        const thisMonth = space.months[0];
        assert.equal(thisMonth.purchases, 2);
        assert.equal(thisMonth.commission, 2.7);
      },
    );

    await check(
      'suspension : code refusé au paiement, offres retirées',
      async () => {
        const offer = await prisma.partnerOffer.create({
          data: {
            partnerId: partner.id,
            title: 'Offre test',
            perk: '-10 %',
            description: 'Offre de test',
            url: 'https://exemple.example/offre',
            isActive: true,
            publishedAt: new Date(),
          },
        });
        assert.ok(
          (await tracking.publicOffers()).some((o: any) => o.id === offer.id),
        );
        await partners.update(partner.id, {
          status: PartnerStatus.SUSPENDU,
        } as any);
        const r = await (payment as any).resolvePromoCode(code.code, m4, 1500);
        assert.equal(r.isValid, false);
        assert.ok(
          !(await tracking.publicOffers()).some((o: any) => o.id === offer.id),
        );
        const after = await prisma.partnerOffer.findUnique({
          where: { id: offer.id },
        });
        assert.equal(after?.isActive, false);
        // Les chiffres déjà acquis restent visibles.
        assert.equal((await partners.get(partner.id)).sales.commission, 2.7);
      },
    );

    await check(
      'offres : programmée et expirée jamais visibles des membres',
      async () => {
        await partners.update(partner.id, {
          status: PartnerStatus.ACCEPTE,
        } as any);
        const day = 24 * 3600 * 1000;
        const [later, past, live] = await Promise.all([
          prisma.partnerOffer.create({
            data: {
              partnerId: partner.id,
              title: 'Programmée',
              perk: 'x',
              description: 'x',
              url: 'https://a.example',
              isActive: true,
              publishedAt: new Date(),
              startsAt: new Date(Date.now() + 3 * day),
            },
          }),
          prisma.partnerOffer.create({
            data: {
              partnerId: partner.id,
              title: 'Expirée',
              perk: 'x',
              description: 'x',
              url: 'https://a.example',
              isActive: true,
              publishedAt: new Date(),
              endsAt: new Date(Date.now() - day),
            },
          }),
          prisma.partnerOffer.create({
            data: {
              partnerId: partner.id,
              title: 'En ligne',
              perk: 'x',
              description: 'x',
              url: 'https://a.example',
              isActive: true,
              publishedAt: new Date(),
              endsAt: new Date(Date.now() + day),
            },
          }),
        ]);
        const ids = (await tracking.publicOffers()).map((o: any) => o.id);
        assert.ok(ids.includes(live.id));
        assert.ok(!ids.includes(later.id));
        assert.ok(!ids.includes(past.id));
        const states = Object.fromEntries(
          (await tracking.offerStats(partner.id)).map((o) => [
            o.title,
            o.state,
          ]),
        );
        assert.equal(states['Programmée'], 'programmee');
        assert.equal(states['Expirée'], 'expiree');
        assert.equal(states['En ligne'], 'en_ligne');
        assert.equal(states['Offre test'], 'retiree');
      },
    );

    console.log(`\n${passed} contrôles réussis.`);
  } finally {
    await prisma.partnerCommission.deleteMany({
      where: { partnerId: partner.id },
    });
    await prisma.partnerOffer.deleteMany({ where: { partnerId: partner.id } });
    await prisma.partnerApplication.delete({ where: { id: partner.id } });
    await prisma.creditTransaction.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.promoUsage.deleteMany({ where: { promoCodeId: code.id } });
    await prisma.partnerDailyStat.deleteMany({
      where: { promoCodeId: code.id },
    });
    await prisma.payment
      .deleteMany({ where: { userId: { in: userIds } } })
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.promoCode.delete({ where: { id: code.id } });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
