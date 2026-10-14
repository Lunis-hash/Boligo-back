/**
 * Seed de RECETTE du programme partenaires, sur une base PostgreSQL LOCALE.
 *
 *   DATABASE_URL=postgresql://…@localhost:5432/boligo_recette_partenaires \
 *     npm run seed:recette:partenaires
 *
 * - Refuse de tourner si DATABASE_URL pointe vers Supabase ou une base non
 *   locale (prisma/recette-guard.ts) : aucune donnée fictive ne peut arriver
 *   sur le site public.
 * - Idempotent : il efface d'abord TOUT ce qu'il a pu créer (comptes et
 *   partenaires en @boligo-demo.example, codes DEMO…), puis recrée le jeu à
 *   l'identique. Le relancer donne toujours le même état.
 * - 20 partenaires « [DÉMO] », 18 offres, 13 codes, visites, inscriptions,
 *   ventes (au taux figé), remboursements, ventes confirmées par les marques.
 * - Ventes et remboursements passent par les fonctions du registre utilisées
 *   par le webhook Stripe (recordPartnerSale / recordPartnerRefund) : les
 *   chiffres sont ceux que produirait l'application. Aucun appel Stripe.
 *
 * Les identifiants imprimés en fin de script sont FICTIFS et ne servent qu'en
 * local (le domaine .example ne reçoit aucun e-mail).
 */
import {
  DiscountType,
  Gender,
  OfferPlacement,
  PartnerRegistrationType,
  PartnerStatus,
  PartnerType,
  PartnerVerification,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  recordPartnerRefund,
  recordPartnerSale,
} from '../src/partners/partner-commissions';
import { hashPortalToken } from '../src/partners/partner-portal.logic';
import { assertLocalDatabase } from './recette-guard';

assertLocalDatabase(process.env.DATABASE_URL);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DATA = require('../mobile-steve/e2e/recette-partenaires-data.js') as {
  DOMAIN: string;
  PARTNERS: SeedPartner[];
  OFFERS: SeedOffer[];
  CONVERSIONS: {
    offer: string;
    month: number;
    conversions: number;
    revenue: number;
    reference: string;
  }[];
};

type SeedPartner = {
  key: string;
  type: PartnerType;
  name: string;
  company: string;
  city: string;
  website?: string;
  audience: string;
  final: PartnerStatus;
  rate?: number;
  email: string;
  regNumber: string;
  message: string;
  code?: { code: string; discount: number; free?: boolean };
  traffic?: { visits: number; signups: number; sales: number; free?: number };
};
type SeedOffer = {
  key: string;
  partner: string;
  title: string;
  perk: string;
  placement: OfferPlacement;
  publish: boolean;
  state: string;
  startIn?: number;
  endIn?: number;
  endInSec?: number;
  withdraw?: boolean;
  clicks?: number;
  description: string;
  url: string;
  perkCode: string;
};

/** Mots de passe FICTIFS, valables seulement sur la base locale de recette. */
export const DEMO_ACCOUNTS = {
  admin: { email: `admin@${DATA.DOMAIN}`, password: 'Demo-Admin-2026!' },
  marketing: {
    email: `marketing@${DATA.DOMAIN}`,
    password: 'Demo-Marketing-2026!',
  },
  membre: { email: `membre@${DATA.DOMAIN}`, password: 'Demo-Membre-2026!' },
};

/** Remboursements de démonstration : cumul remboursé par vente. */
const REFUNDS: { partner: string; sale: number; share: number }[] = [
  { partner: 'clara', sale: 0, share: 1 }, // total : commission annulée
  { partner: 'yanis', sale: 1, share: 0.5 }, // partiel : reprise au prorata
  { partner: 'lumen', sale: 0, share: 1 }, // marque : vente annulée
];
/**
 * Taux figé : ces partenaires avaient un autre taux lors de leurs premières
 * ventes (le taux actuel ne s'applique qu'aux suivantes).
 */
const EARLIER_RATE: Record<string, { rate: number; sales: number }> = {
  clara: { rate: 15, sales: 1 },
  jade: { rate: 10, sales: 1 },
};

const PLAN_CENTS = 1500;
const DAY = 24 * 3600 * 1000;
const prisma = new PrismaService();

/** Lien privé de démonstration, déterministe (base locale uniquement). */
export function demoPortalToken(key: string): string {
  return createHash('sha256')
    .update(`boligo-recette-partenaires:${key}`)
    .digest('base64url');
}

function demoCompany(p: SeedPartner): string {
  return `[DÉMO] ${p.company.replace(/\s*\(fictif\)\s*$/, '')}`;
}

function priceWith(code: SeedPartner['code']): number {
  if (!code || code.free) return 0;
  return Math.round((PLAN_CENTS * (100 - code.discount)) / 100);
}

/** Efface tout ce que ce seed (ou la recette par l'API) a pu créer. */
async function cleanup() {
  const like = `%@${DATA.DOMAIN}`;
  await prisma.$transaction(
    async (tx) => {
      const run = (sql: string) => tx.$executeRawUnsafe(sql);
      await run(
        `CREATE TEMP TABLE demo_users ON COMMIT DROP AS SELECT id FROM "User" WHERE email LIKE '${like}'`,
      );
      await run(
        `CREATE TEMP TABLE demo_codes ON COMMIT DROP AS SELECT id FROM "PromoCode" WHERE code LIKE 'DEMO%' OR id IN (SELECT "promoCodeId" FROM "PartnerApplication" WHERE email LIKE '${like}' AND "promoCodeId" IS NOT NULL)`,
      );
      await run(`DELETE FROM "PartnerApplication" WHERE email LIKE '${like}'`);
      await run(
        `DELETE FROM "PartnerCommission" WHERE "promoCodeId" IN (SELECT id FROM demo_codes)`,
      );
      await run(
        `DELETE FROM "PromoUsage" WHERE "promoCodeId" IN (SELECT id FROM demo_codes)`,
      );
      await run(
        `DELETE FROM "CreditTransaction" WHERE "promoCodeId" IN (SELECT id FROM demo_codes)`,
      );
      await run(
        `UPDATE "Payment" SET "promoCodeId" = NULL WHERE "promoCodeId" IN (SELECT id FROM demo_codes)`,
      );
      await run(
        `UPDATE "User" SET "referralCodeId" = NULL WHERE "referralCodeId" IN (SELECT id FROM demo_codes)`,
      );
      await run(`CREATE FUNCTION pg_temp.purge(tbl regclass, cond text) RETURNS void AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS ctbl, a.attname AS ccol, pa.attname AS pcol
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND c.confrelid = tbl AND c.conrelid <> tbl
  LOOP
    PERFORM pg_temp.purge(r.ctbl, format('%I IN (SELECT %I FROM %s WHERE %s)', r.ccol, r.pcol, tbl, cond));
  END LOOP;
  EXECUTE format('DELETE FROM %s WHERE %s', tbl, cond);
END $$ LANGUAGE plpgsql`);
      await run(
        `SELECT pg_temp.purge('"User"', 'id IN (SELECT id FROM demo_users)')`,
      );
      await run(
        `DELETE FROM "PromoCode" WHERE id IN (SELECT id FROM demo_codes)`,
      );
      await run(`DROP FUNCTION pg_temp.purge(regclass, text)`);
    },
    { timeout: 60_000 },
  );
}

async function account(
  email: string,
  password: string,
  role: UserRole,
  firstName: string,
  extra: Partial<Prisma.UserCreateInput> = {},
) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      firstName,
      lastName: '[DÉMO]',
      birthDate: new Date('1991-05-14'),
      gender: Gender.AUTRE,
      role,
      accountStatus: 'actif',
      isVerified: true,
      city: 'Paris, Île-de-France, France',
      profile: { create: {} },
      ...extra,
    },
  });
}

/** Répartit `total` sur `days` jours (les plus récents d'abord). */
function spread(total: number, days: number): number[] {
  const out = Array.from({ length: days }, () => 0);
  for (let i = 0; i < total; i++) out[(i * 7) % days] += 1;
  return out;
}

async function main() {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  console.log('Nettoyage des données de démonstration précédentes…');
  await cleanup();

  const admin = await account(
    DEMO_ACCOUNTS.admin.email,
    DEMO_ACCOUNTS.admin.password,
    UserRole.ADMIN,
    'Admin',
  );
  await account(
    DEMO_ACCOUNTS.marketing.email,
    DEMO_ACCOUNTS.marketing.password,
    UserRole.MARKETING,
    'Marketing',
  );

  const portals: { key: string; company: string; link: string }[] = [];
  const partnerIds = new Map<string, string>();
  let memberSeq = 0;

  for (const [i, p] of DATA.PARTNERS.entries()) {
    const created = new Date(now.getTime() - (90 - i * 3) * DAY);
    const verified =
      p.final === PartnerStatus.ACCEPTE || p.final === PartnerStatus.SUSPENDU;
    const promo = p.code
      ? await prisma.promoCode.create({
          data: {
            code: p.code.code,
            discountType: p.code.free
              ? DiscountType.free
              : DiscountType.percent,
            discountValue: p.code.free ? 0 : p.code.discount,
            maxUses: p.code.free ? 3 : null,
            // Code coupé si le partenaire est suspendu ou refusé.
            isActive: p.final === PartnerStatus.ACCEPTE,
            description: `[DÉMO] Code de ${demoCompany(p)}`,
            createdAt: created,
          },
        })
      : null;
    const currentRate =
      p.type === PartnerType.ANNONCEUR
        ? null
        : (p.rate ?? (p.type === PartnerType.AMBASSADEUR ? 20 : 15));
    const earlier = EARLIER_RATE[p.key];
    const hasPortal =
      verified && (promo !== null || p.type === PartnerType.ANNONCEUR);
    const partner = await prisma.partnerApplication.create({
      data: {
        type: p.type,
        status: p.final,
        name: `[DÉMO] ${p.name}`,
        email: p.email,
        company: demoCompany(p),
        country: 'FR',
        city: p.city,
        website: p.website,
        audience: p.audience,
        message: p.message,
        language: 'fr',
        notes: '[DÉMO] Partenaire fictif de recette : ne pas contacter.',
        commissionRate: earlier ? earlier.rate : currentRate,
        promoCodeId: promo?.id,
        registrationType: PartnerRegistrationType.AUTRE,
        registrationNumber: p.regNumber,
        verificationStatus: verified
          ? PartnerVerification.VERIFIE
          : PartnerVerification.A_VERIFIER,
        verificationMethod: verified ? 'Contrôle manuel' : null,
        verifiedName: verified ? demoCompany(p) : null,
        verificationNote: verified
          ? '[DÉMO] Vérification manuelle fictive (aucun registre interrogé).'
          : null,
        verifiedAt: verified ? created : null,
        verifiedBy: verified ? admin.email : null,
        portalTokenHash: hasPortal
          ? hashPortalToken(demoPortalToken(p.key))
          : null,
        portalLinkSentAt: hasPortal ? created : null,
        createdAt: created,
      },
    });
    partnerIds.set(p.key, partner.id);
    if (hasPortal)
      portals.push({
        key: p.key,
        company: `${p.name} (${demoCompany(p).replace('[DÉMO] ', '')})`,
        link: `${(process.env.PUBLIC_WEB_URL || 'http://localhost:8080').replace(/\/+$/, '')}/espace-partenaire#${demoPortalToken(p.key)}`,
      });
    if (!promo || !p.traffic) continue;

    // Visites et inscriptions par jour (30 derniers jours).
    const visits = spread(p.traffic.visits, 30);
    const signups = spread(p.traffic.signups, 30);
    for (let d = 0; d < 30; d++) {
      if (!visits[d] && !signups[d]) continue;
      await prisma.partnerDailyStat.create({
        data: {
          promoCodeId: promo.id,
          day: new Date(today.getTime() - d * DAY),
          visits: visits[d],
          signups: signups[d],
        },
      });
    }

    // Membres inscrits par le lien ; les premiers achètent.
    const members: string[] = [];
    for (let s = 0; s < p.traffic.signups; s++) {
      memberSeq += 1;
      const u = await account(
        `membre-${p.key}-${s + 1}@${DATA.DOMAIN}`,
        DEMO_ACCOUNTS.membre.password,
        UserRole.USER,
        `Membre${memberSeq}`,
        {
          referralCode: { connect: { id: promo.id } },
          referredAt: new Date(now.getTime() - (25 - s) * DAY),
        },
      );
      members.push(u.id);
    }

    // Ventes payées : écriture comme le webhook (achat + registre).
    const price = priceWith(p.code);
    for (let s = 0; s < p.traffic.sales; s++) {
      const at = new Date(now.getTime() - (40 - s * 12) * DAY);
      const ref = `pi_demo_${p.key}_${s + 1}`;
      const userId = members[s % Math.max(1, members.length)];
      if (earlier && s === earlier.sales)
        await prisma.partnerApplication.update({
          where: { id: partner.id },
          data: { commissionRate: currentRate },
        });
      await prisma.creditTransaction.create({
        data: {
          userId,
          type: 'achat',
          creditAmount: 1,
          euroAmount: price / 100,
          paymentRef: ref,
          promoCodeId: promo.id,
          description: `[DÉMO] Parcours Harmonie (paiement simulé ${ref})`,
          date: at,
        },
      });
      await prisma.promoUsage
        .create({ data: { promoCodeId: promo.id, userId, usedAt: at } })
        .catch(() => undefined);
      // Le partenaire était accepté au moment de la vente.
      await recordPartnerSale(prisma, {
        paymentRef: ref,
        promoCodeId: promo.id,
        amountCents: price,
        at,
      });
    }
    if (earlier && p.traffic.sales <= earlier.sales)
      await prisma.partnerApplication.update({
        where: { id: partner.id },
        data: { commissionRate: currentRate },
      });

    // Parcours offerts (jeu concours) : 0 €, jamais une vente.
    for (let s = 0; s < (p.traffic.free ?? 0); s++) {
      const userId = members[s % members.length];
      await prisma.creditTransaction.create({
        data: {
          userId,
          type: 'achat',
          creditAmount: 1,
          euroAmount: 0,
          paymentRef: `PROMO_${promo.id}_${userId}`,
          promoCodeId: promo.id,
          description: '[DÉMO] Parcours offert (code partenaire)',
        },
      });
      await prisma.promoUsage
        .create({ data: { promoCodeId: promo.id, userId } })
        .catch(() => undefined);
    }
    await prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        usedCount: await prisma.promoUsage.count({
          where: { promoCodeId: promo.id },
        }),
      },
    });

    // Remboursements : reprise de commission au prorata, traçable.
    for (const r of REFUNDS.filter((x) => x.partner === p.key)) {
      const ref = `pi_demo_${p.key}_${r.sale + 1}`;
      const refunded = Math.round(price * r.share);
      const at = new Date(now.getTime() - 5 * DAY);
      await prisma.creditTransaction.create({
        data: {
          userId: members[r.sale % members.length],
          type: 'remboursement_paiement',
          creditAmount: 0,
          euroAmount: -refunded / 100,
          promoCodeId: promo.id,
          paymentRef: `${ref}:remboursement:${refunded}`,
          description: `[DÉMO] Remboursement ${r.share >= 1 ? 'total' : 'partiel'} (simulé)`,
          date: at,
        },
      });
      await recordPartnerRefund(prisma, {
        paymentRef: ref,
        refundedTotalCents: refunded,
        at,
      });
    }
  }

  // Le membre de démonstration : connecté, il voit les offres en ligne.
  // Grand Entretien terminé : il accède directement à l'application.
  await account(
    DEMO_ACCOUNTS.membre.email,
    DEMO_ACCOUNTS.membre.password,
    UserRole.USER,
    'Camille',
    {
      interviews: {
        create: {
          status: 'termine',
          endDate: new Date(now.getTime() - 20 * DAY),
          questionnaireVersion: '8.2',
        },
      },
    },
  );

  // 18 offres : en ligne, programmée, expirées, brouillons, retirées.
  for (const o of DATA.OFFERS) {
    const partnerId = partnerIds.get(o.partner)!;
    const startsAt =
      o.startIn !== undefined
        ? new Date(now.getTime() + o.startIn * DAY)
        : null;
    let endsAt =
      o.endIn !== undefined ? new Date(now.getTime() + o.endIn * DAY) : null;
    // L'offre « vente flash » a expiré hier (en recette, elle expirait en direct).
    if (o.endInSec !== undefined) endsAt = new Date(now.getTime() - DAY);
    const online = o.state === 'en_ligne' || o.state === 'programmee';
    const everPublished = o.publish || o.state === 'retiree';
    const offer = await prisma.partnerOffer.create({
      data: {
        partnerId,
        placement: o.placement,
        title: `[DÉMO] ${o.title}`,
        perk: o.perk,
        description: o.description,
        url: o.url,
        perkCode: o.perkCode,
        isActive: online || (o.state === 'expiree' && o.publish),
        startsAt,
        endsAt,
        publishedAt: everPublished ? new Date(now.getTime() - 30 * DAY) : null,
      },
    });
    const clicks = o.clicks ?? (everPublished ? 2 : 0);
    if (everPublished) {
      const perDay = spread(clicks, 20);
      for (let d = 0; d < 20; d++) {
        const impressions = 6 + ((d * 5 + o.key.charCodeAt(0)) % 9);
        await prisma.partnerOfferStat.create({
          data: {
            offerId: offer.id,
            day: new Date(today.getTime() - (d + 1) * DAY),
            impressions,
            clicks: perDay[d],
          },
        });
      }
    }
    for (const c of DATA.CONVERSIONS.filter((x) => x.offer === o.key)) {
      await prisma.partnerOfferConversion.create({
        data: {
          offerId: offer.id,
          month: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + c.month, 1),
          ),
          conversions: c.conversions,
          revenueCents: Math.round(c.revenue * 100),
          reference: `[DÉMO] ${c.reference}`,
          createdBy: admin.email,
        },
      });
    }
  }

  // Bilan.
  const [partners, offers, codes, sales, refunds] = await Promise.all([
    prisma.partnerApplication.groupBy({
      by: ['status'],
      where: { email: { endsWith: `@${DATA.DOMAIN}` } },
      _count: { _all: true },
    }),
    prisma.partnerOffer.count({
      where: { partner: { email: { endsWith: `@${DATA.DOMAIN}` } } },
    }),
    prisma.promoCode.count({ where: { code: { startsWith: 'DEMO' } } }),
    prisma.partnerCommission.count({
      where: { kind: 'VENTE', paymentRef: { startsWith: 'pi_demo_' } },
    }),
    prisma.partnerCommission.count({
      where: { kind: 'REPRISE', paymentRef: { startsWith: 'pi_demo_' } },
    }),
  ]);
  const web = (process.env.PUBLIC_WEB_URL || 'http://localhost:8080').replace(
    /\/+$/,
    '',
  );
  const adm = (process.env.ADMIN_URL || 'http://localhost:8081').replace(
    /\/+$/,
    '',
  );
  console.log('\n✅ Recette partenaires prête (base locale, données [DÉMO]).');
  console.log(
    `   Partenaires : ${partners.reduce((s, r) => s + r._count._all, 0)} (${partners.map((r) => `${r.status} ${r._count._all}`).join(', ')})`,
  );
  console.log(
    `   Offres : ${offers} · Codes : ${codes} · Ventes : ${sales} · Reprises (remboursements) : ${refunds}`,
  );
  console.log('\n   Identifiants FICTIFS (base locale uniquement) :');
  console.log(
    `   Administration ${adm}/login  →  ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.admin.password}`,
  );
  console.log(
    `   Équipe marketing ${adm}/login  →  ${DEMO_ACCOUNTS.marketing.email} / ${DEMO_ACCOUNTS.marketing.password}`,
  );
  console.log(
    `   Membre ${web}  →  ${DEMO_ACCOUNTS.membre.email} / ${DEMO_ACCOUNTS.membre.password}`,
  );
  console.log('   Espaces partenaires (liens privés de démonstration) :');
  for (const p of portals)
    console.log(`     [DÉMO] ${p.company}\n       ${p.link}`);
}

if (require.main === module)
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
