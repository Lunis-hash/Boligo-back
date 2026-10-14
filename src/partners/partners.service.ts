import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  PartnerStatus,
  PartnerType,
  PartnerVerification,
  Prisma,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, emailDeliveryMode } from '../common/email.service';
import { ApplyPartnerDto, TeamCreatePartnerDto } from './dto/apply-partner.dto';
import {
  CreatePartnerCodeDto,
  ManualVerificationDto,
  UpdatePartnerDto,
} from './dto/update-partner.dto';
import { checkRegistration, REGISTRATION_LABELS } from './registration';
import { RegistryService } from './registry.service';
import {
  codeStem,
  defaultCommission,
  normalizeCode,
  partnerTypeLabel,
} from './partners.logic';
import {
  hashPortalToken,
  isPortalToken,
  newPortalToken,
  portalBaseUrl,
  portalLink,
} from './partner-portal.logic';
import { revenueByCode } from './partner-sales';
import {
  EMPTY_FIGURES,
  monthlyCommissions,
  partnerFigures,
} from './partner-commissions';
import { PartnerTrackingService } from './partner-tracking.service';
import { partnerShareLink, rate } from './partner-tracking.logic';

type PartnerRow = { portalTokenHash?: string | null } & Record<string, unknown>;

/** Jamais l'empreinte du lien privé dans les réponses du tableau de bord. */
function withoutSecret<T extends PartnerRow>(row: T) {
  const { portalTokenHash, ...rest } = row;
  return { ...rest, portalActive: Boolean(portalTokenHash) };
}

const TEAM_EMAIL = () =>
  process.env.PARTNERS_NOTIFY_EMAIL || 'contact@boligo.fr';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger('Partners');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly registry: RegistryService,
    private readonly tracking: PartnerTrackingService,
  ) {}

  /** Candidature publique : enregistrement, puis e-mails (sans bloquer la réponse). */
  async apply(dto: ApplyPartnerDto) {
    const lang = dto.language === 'en' ? 'en' : 'fr';
    const registration = checkRegistration(
      dto.registrationType,
      dto.registrationNumber,
    );
    if (!registration.ok) throw new BadRequestException(registration.error);
    const recent = await this.prisma.partnerApplication.findFirst({
      where: {
        email: dto.email,
        type: dto.type,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) {
      return { ok: true, id: recent.id, duplicate: true };
    }
    const created = await this.prisma.partnerApplication.create({
      data: {
        type: dto.type,
        name: dto.name,
        email: dto.email,
        company: dto.company || null,
        country: dto.country,
        city: dto.city || null,
        website: dto.website || null,
        audience: dto.audience || null,
        message: dto.message,
        language: lang,
        commissionRate: defaultCommission(dto.type),
        registrationType: dto.registrationType,
        registrationNumber: registration.number,
      },
    });
    void this.notify(created.id, dto, lang);
    // Contrôle auprès du registre officiel, sans faire attendre le candidat.
    void this.runVerification(created.id).catch((err: Error) =>
      this.logger.warn(`Vérification d'entreprise différée : ${err.message}`),
    );
    return { ok: true, id: created.id };
  }

  /**
   * Partenaire ajouté par l'équipe : statut « En discussion », vérification
   * d'entreprise lancée comme pour une candidature. Aucun e-mail n'est envoyé :
   * l'équipe lui transmettra son lien privé une fois le code créé.
   */
  async createByTeam(dto: TeamCreatePartnerDto, createdBy?: string) {
    const registration = checkRegistration(
      dto.registrationType,
      dto.registrationNumber,
    );
    if (!registration.ok) throw new BadRequestException(registration.error);
    const existing = await this.prisma.partnerApplication.findFirst({
      where: { email: dto.email, type: dto.type },
      select: { id: true },
    });
    if (existing)
      throw new BadRequestException(
        'Un partenaire de ce profil existe déjà avec cette adresse e-mail.',
      );
    const created = await this.prisma.partnerApplication.create({
      data: {
        type: dto.type,
        status: PartnerStatus.EN_COURS,
        name: dto.name,
        email: dto.email,
        company: dto.company || null,
        country: dto.country,
        city: dto.city || null,
        website: dto.website || null,
        audience: dto.audience || null,
        message: dto.message || 'Partenaire ajouté par l’équipe BOLIGO.',
        language: dto.language === 'en' ? 'en' : 'fr',
        notes: `Ajouté depuis l’administration${createdBy ? ` par ${createdBy}` : ''}.`,
        commissionRate:
          dto.type === PartnerType.ANNONCEUR
            ? null
            : (dto.commissionRate ?? defaultCommission(dto.type)),
        registrationType: dto.registrationType,
        registrationNumber: registration.number,
      },
    });
    void this.runVerification(created.id).catch((err: Error) =>
      this.logger.warn(`Vérification d'entreprise différée : ${err.message}`),
    );
    return this.get(created.id);
  }

  /** Interroge le registre public correspondant au numéro déclaré. */
  private async runVerification(id: string) {
    const row = await this.prisma.partnerApplication.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Candidature introuvable');
    if (!row.registrationType || !row.registrationNumber) {
      return this.prisma.partnerApplication.update({
        where: { id },
        data: {
          verificationStatus: PartnerVerification.A_VERIFIER,
          verificationMethod: null,
          verificationNote:
            'Aucun numéro d’entreprise : demandez-le au partenaire avant tout accord.',
        },
      });
    }
    const result = await this.registry.verify(
      row.registrationType,
      row.registrationNumber,
    );
    return this.prisma.partnerApplication.update({
      where: { id },
      data: {
        verificationStatus: result.status,
        verificationMethod: result.method,
        verifiedName: result.officialName,
        verificationNote: result.note,
        verifiedAt:
          result.status === PartnerVerification.VERIFIE ? new Date() : null,
        verifiedBy: null,
      },
    });
  }

  /** Relance la vérification automatique (bouton du tableau de bord). */
  async verify(id: string) {
    await this.runVerification(id);
    return this.get(id);
  }

  /**
   * Décision d'un administrateur quand aucun registre public ne répond pour le
   * pays : il note la source consultée (justificatif, registre national…).
   */
  async manualVerification(
    id: string,
    dto: ManualVerificationDto,
    actorEmail: string,
  ) {
    await this.get(id);
    await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        verificationStatus: dto.status,
        verificationMethod: 'Contrôle manuel',
        verificationNote: dto.note.trim(),
        verifiedAt: new Date(),
        verifiedBy: actorEmail,
      },
    });
    return this.get(id);
  }

  private async notify(id: string, dto: ApplyPartnerDto, lang: 'fr' | 'en') {
    const label = partnerTypeLabel(dto.type, 'fr');
    try {
      await this.email.sendSimpleEmail(
        TEAM_EMAIL(),
        `Nouvelle candidature partenaire : ${label}`,
        `Nouvelle candidature : ${label}`,
        [
          `${dto.name}${dto.company ? ` (${dto.company})` : ''} — ${dto.country}${dto.city ? `, ${dto.city}` : ''}`,
          `E-mail : ${dto.email}`,
          `Entreprise : ${REGISTRATION_LABELS[dto.registrationType]} ${dto.registrationNumber}`,
          dto.website ? `Site ou réseaux : ${dto.website}` : '',
          dto.audience ? `Audience / zone / budget : ${dto.audience}` : '',
          `Message :\n${dto.message}`,
          `À traiter dans le tableau de bord, page Partenaires (réf. ${id.slice(0, 8)}).`,
        ].filter(Boolean),
      );
    } catch (err) {
      this.logger.warn(
        `Notification équipe non envoyée : ${(err as Error).message}`,
      );
    }
    try {
      const fr = lang === 'fr';
      await this.email.sendSimpleEmail(
        dto.email,
        fr
          ? 'Votre candidature au Programme Partenaires BOLIGO'
          : 'Your BOLIGO Partner Program application',
        fr
          ? `Merci ${dto.name}, nous avons bien reçu votre candidature`
          : `Thank you ${dto.name}, we have received your application`,
        fr
          ? [
              `Profil : ${partnerTypeLabel(dto.type, 'fr')}.`,
              'Notre équipe étudie chaque candidature avec attention et vous répond sous 5 jours ouvrés.',
              'Pour toute question : contact@boligo.fr.',
            ]
          : [
              `Profile: ${partnerTypeLabel(dto.type, 'en')}.`,
              'Our team reviews every application carefully and will reply within 5 business days.',
              'Any question: contact@boligo.fr.',
            ],
        lang,
      );
    } catch (err) {
      this.logger.warn(
        `Accusé de réception non envoyé : ${(err as Error).message}`,
      );
    }
  }

  async list(params: {
    type?: string;
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const where: Prisma.PartnerApplicationWhereInput = {};
    if (params.type && params.type in PartnerType)
      where.type = params.type as PartnerType;
    if (params.status && params.status in PartnerStatus)
      where.status = params.status as PartnerStatus;
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where,
        include: {
          promoCode: {
            select: { id: true, code: true, isActive: true, usedCount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnerApplication.count({ where }),
    ]);
    const blocks = await this.salesBlocks(rows);
    const data = rows.map((r) => ({
      ...withoutSecret(r),
      ...blocks.get(r.id)!,
    }));
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async get(id: string) {
    const row = await this.prisma.partnerApplication.findUnique({
      where: { id },
      include: { promoCode: true },
    });
    if (!row) throw new NotFoundException('Candidature introuvable');
    const blocks = await this.salesBlocks([row]);
    return { ...withoutSecret(row), ...blocks.get(row.id)! };
  }

  async update(id: string, dto: UpdatePartnerDto) {
    const current = await this.get(id);
    let registration: Prisma.PartnerApplicationUpdateInput = {};
    if (
      dto.registrationType !== undefined ||
      dto.registrationNumber !== undefined
    ) {
      const type = dto.registrationType ?? current.registrationType;
      const raw = dto.registrationNumber ?? current.registrationNumber;
      if (!type || !raw) {
        throw new BadRequestException(
          'Indiquez le type et le numéro d’entreprise.',
        );
      }
      const check = checkRegistration(type, raw);
      if (!check.ok) throw new BadRequestException(check.error);
      registration = {
        registrationType: type,
        registrationNumber: check.number,
        verificationStatus: PartnerVerification.A_VERIFIER,
        verificationMethod: null,
        verifiedName: null,
        verificationNote: null,
        verifiedAt: null,
        verifiedBy: null,
      };
    }
    const verified =
      current.verificationStatus === PartnerVerification.VERIFIE &&
      !registration.registrationNumber;
    if (
      dto.status === PartnerStatus.ACCEPTE &&
      current.status !== PartnerStatus.ACCEPTE &&
      !verified
    ) {
      throw new BadRequestException(
        'Entreprise non vérifiée : contrôlez son numéro (SIREN, TVA…) avant d’accepter le partenaire.',
      );
    }
    const stopping =
      dto.status === PartnerStatus.REFUSE ||
      dto.status === PartnerStatus.SUSPENDU;
    const row = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        ...registration,
        status: dto.status,
        notes: dto.notes,
        commissionRate: dto.commissionRate,
        // Une candidature refusée perd aussi son Espace partenaire (un
        // partenaire suspendu le garde, en lecture seule).
        ...(dto.status === PartnerStatus.REFUSE
          ? { portalTokenHash: null, portalLinkSentAt: null }
          : {}),
      },
    });
    if (dto.status && dto.status !== current.status && current.promoCodeId) {
      if (stopping) {
        // Refus ou suspension : le code cesse de donner sa réduction.
        await this.prisma.promoCode.update({
          where: { id: current.promoCodeId },
          data: { isActive: false },
        });
      } else if (
        dto.status === PartnerStatus.ACCEPTE &&
        current.status === PartnerStatus.SUSPENDU
      ) {
        // Fin de suspension : le code reprend ; les offres restent à republier.
        await this.prisma.promoCode.update({
          where: { id: current.promoCodeId },
          data: { isActive: true },
        });
      }
    }
    if (stopping && dto.status !== current.status) {
      await this.prisma.partnerOffer.updateMany({
        where: { partnerId: id, isActive: true },
        data: { isActive: false },
      });
    }
    if (registration.registrationNumber) {
      return this.verify(id);
    }
    return withoutSecret(row);
  }

  /** Crée le code promo personnel du partenaire et valide la candidature. */
  async createCode(id: string, dto: CreatePartnerCodeDto) {
    const partner = await this.get(id);
    if (partner.promoCodeId)
      throw new BadRequestException('Ce partenaire a déjà un code.');
    if (partner.verificationStatus !== PartnerVerification.VERIFIE) {
      throw new BadRequestException(
        'Entreprise non vérifiée : contrôlez son numéro (SIREN, TVA…) avant de créer son code.',
      );
    }
    let code: string | null;
    if (dto.code) {
      code = normalizeCode(dto.code);
      if (!code)
        throw new BadRequestException(
          'Code invalide : 4 à 20 lettres ou chiffres.',
        );
      if (await this.prisma.promoCode.findUnique({ where: { code } })) {
        throw new BadRequestException(`Le code ${code} existe déjà.`);
      }
    } else {
      code = null;
      const stem = codeStem(partner.company || partner.name);
      for (let i = 0; i < 20 && !code; i++) {
        const candidate = `${stem}${randomInt(10, 100)}`;
        if (
          !(await this.prisma.promoCode.findUnique({
            where: { code: candidate },
          }))
        )
          code = candidate;
      }
      if (!code)
        throw new BadRequestException(
          'Impossible de générer un code libre, saisissez-en un.',
        );
    }
    const discount = dto.discountPercent ?? 10;
    const promo = await this.prisma.promoCode.create({
      data: {
        code,
        discountType: DiscountType.percent,
        discountValue: discount,
        isActive: true,
        description: `Partenaire : ${partner.company || partner.name} (${partnerTypeLabel(partner.type)})`,
      },
    });
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { promoCodeId: promo.id, status: PartnerStatus.ACCEPTE },
    });
    // Bienvenue : le code et le lien vers l'Espace partenaire, dans sa langue.
    const portal = await this.sendPortalLink(id, true);
    return { ...(await this.get(id)), ...portal };
  }

  /**
   * Crée un nouveau lien privé vers l'Espace partenaire (l'ancien cesse de
   * fonctionner) et l'envoie au partenaire. Le lien est rendu une seule fois
   * à l'équipe, pour le copier si l'e-mail n'est pas configuré.
   */
  async sendPortalLink(id: string, welcome = false) {
    const partner = await this.prisma.partnerApplication.findUnique({
      where: { id },
      include: { promoCode: true },
    });
    if (!partner) throw new NotFoundException('Candidature introuvable');
    // Une marque acceptée suit ses offres sans code ; les autres profils
    // ont besoin de leur code (l'Espace montre l'activité de ce code).
    const brandOnly =
      partner.type === PartnerType.ANNONCEUR &&
      partner.status === PartnerStatus.ACCEPTE;
    if (!partner.promoCode && !brandOnly) {
      throw new BadRequestException(
        'Créez d’abord le code du partenaire : l’Espace partenaire montre son activité.',
      );
    }
    const { token, hash } = newPortalToken();
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { portalTokenHash: hash, portalLinkSentAt: new Date() },
    });
    const link = portalLink(token, partner.language);
    const fr = partner.language !== 'en';
    const code = partner.promoCode?.code;
    try {
      await this.email.sendSimpleEmail(
        partner.email,
        fr
          ? welcome
            ? 'Bienvenue dans le Programme Partenaires BOLIGO'
            : 'Votre lien vers l’Espace partenaire BOLIGO'
          : welcome
            ? 'Welcome to the BOLIGO Partner Program'
            : 'Your link to the BOLIGO Partner space',
        fr
          ? welcome
            ? `Bienvenue ${partner.name}, votre candidature est acceptée`
            : `Bonjour ${partner.name}, voici votre nouveau lien`
          : welcome
            ? `Welcome ${partner.name}, your application is accepted`
            : `Hello ${partner.name}, here is your new link`,
        fr
          ? [
              code
                ? `Votre code personnel : ${code}.`
                : 'Vos offres apparaissent aux membres BOLIGO dès leur publication.',
              code
                ? 'Votre Espace partenaire montre en temps réel les Parcours payés avec votre code, le montant encaissé et votre commission, mois par mois.'
                : 'Votre Espace partenaire montre les affichages et les clics de vos offres, et les ventes que vous nous avez confirmées.',
              'Ce lien est personnel : ne le partagez pas. Si vous le perdez, écrivez-nous et nous vous en enverrons un nouveau.',
              'Rappel : chaque publication doit porter la mention « Collaboration commerciale » ou « Publicité ».',
            ]
          : [
              code
                ? `Your personal code: ${code}.`
                : 'Your offers are shown to BOLIGO members once published.',
              code
                ? 'Your Partner space shows, in real time, the Journeys paid with your code, the amount collected and your commission, month by month.'
                : 'Your Partner space shows the views and clicks of your offers, and the sales you confirmed to us.',
              'This link is personal: do not share it. If you lose it, write to us and we will send you a new one.',
              'Reminder: every post must be clearly labelled as an ad or a paid partnership.',
            ],
        partner.language,
        {
          label: fr ? 'Ouvrir mon Espace partenaire' : 'Open my Partner space',
          url: link,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Lien de l'Espace partenaire non envoyé : ${(err as Error).message}`,
      );
    }
    return {
      portalLink: link,
      emailAttempted: emailDeliveryMode() !== 'simulation',
    };
  }

  /** Coupe l'accès à l'Espace partenaire (le code, lui, reste tel quel). */
  async revokePortal(id: string) {
    await this.get(id);
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { portalTokenHash: null, portalLinkSentAt: null },
    });
    return { ok: true };
  }

  /**
   * Espace partenaire : totaux et historique des achats payés avec son code.
   * Aucune donnée de membre : ni nom, ni identifiant, ni date précise d'achat.
   */
  async portal(token: unknown) {
    const invalid = new NotFoundException(
      'Lien invalide ou expiré. Demandez un nouveau lien à contact@boligo.fr.',
    );
    if (!isPortalToken(token)) throw invalid;
    const partner = await this.prisma.partnerApplication.findUnique({
      where: { portalTokenHash: hashPortalToken(token) },
      include: { promoCode: true },
    });
    const brandOnly = partner?.type === PartnerType.ANNONCEUR;
    if (
      !partner ||
      (!partner.promoCode && !brandOnly) ||
      (partner.status !== PartnerStatus.ACCEPTE &&
        partner.status !== PartnerStatus.SUSPENDU)
    ) {
      throw invalid;
    }
    const promo = partner.promoCode;
    // Mêmes chiffres que l'administration : registre des commissions.
    const [block, ledger] = await Promise.all([
      this.salesBlocks([partner]).then((m) => m.get(partner.id)!),
      this.prisma.partnerCommission.findMany({
        where: { partnerId: partner.id },
        select: {
          kind: true,
          amountCents: true,
          commissionCents: true,
          createdAt: true,
        },
      }),
    ]);
    const paid = block.sales.purchases;
    const free = block.sales.freeActivations;
    const [link, offers] = await Promise.all([
      promo
        ? this.tracking.linkFunnel(promo.id)
        : Promise.resolve({ visits: 0, signups: 0, months: [] }),
      this.tracking.offerStats(partner.id),
    ]);
    return {
      partner: {
        name: partner.name,
        company: partner.company,
        type: partner.type,
        language: partner.language,
        commissionRate: partner.commissionRate,
        status: partner.status,
      },
      shareLink: promo ? partnerShareLink(portalBaseUrl(), promo.code) : null,
      funnel: {
        visits: link.visits,
        signups: link.signups,
        purchases: paid,
        freeActivations: free,
        signupRate: rate(link.signups, link.visits),
        purchaseRate: rate(paid, link.signups),
        months: link.months,
      },
      offers,
      code: promo
        ? {
            code: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            isActive: promo.isActive,
            expiresAt: promo.expiresAt,
            uses: promo.usedCount,
          }
        : null,
      totals: {
        purchases: paid,
        revenue: block.sales.revenue,
        refunded: block.sales.refunded,
        refundedSales: block.sales.refundedSales,
        commission: block.sales.commission,
        commissionGross: block.sales.commissionGross,
        commissionReversed: block.sales.commissionReversed,
      },
      metrics: block.metrics,
      months: monthlyCommissions(ledger),
      updatedAt: new Date().toISOString(),
    };
  }

  /** Synthèse : candidatures par profil et statut, ventes et commissions dues. */
  async summary() {
    const [byType, byStatus, all] = await Promise.all([
      this.prisma.partnerApplication.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      this.prisma.partnerApplication.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.partnerApplication.findMany({
        select: {
          id: true,
          promoCodeId: true,
          promoCode: { select: { isActive: true } },
        },
      }),
    ]);
    // Somme des blocs de chaque partenaire : les totaux concordent par
    // construction avec la liste et avec chaque Espace partenaire.
    const blocks = await this.salesBlocks(all);
    const t = {
      purchases: 0,
      revenueCents: 0,
      refundedCents: 0,
      refundedSales: 0,
      commissionCents: 0,
      commissionReversedCents: 0,
      freeActivations: 0,
      clicks: 0,
      signups: 0,
      verifiedConversions: 0,
    };
    for (const b of blocks.values()) {
      t.purchases += b.sales.purchases;
      t.revenueCents += Math.round(b.sales.revenue * 100);
      t.refundedCents += Math.round(b.sales.refunded * 100);
      t.refundedSales += b.sales.refundedSales;
      t.commissionCents += Math.round(b.sales.commission * 100);
      t.commissionReversedCents += Math.round(b.sales.commissionReversed * 100);
      t.freeActivations += b.sales.freeActivations;
      t.clicks += b.metrics.clicks;
      t.signups += b.metrics.signups;
      t.verifiedConversions += b.metrics.verifiedConversions;
    }
    return {
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
      byStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, r._count._all]),
      ),
      // Codes encore utilisables (hors partenaires refusés ou suspendus).
      activeCodes: all.filter((p) => p.promoCode?.isActive).length,
      purchases: t.purchases,
      revenue: t.revenueCents / 100,
      refunded: t.refundedCents / 100,
      refundedSales: t.refundedSales,
      commission: t.commissionCents / 100,
      commissionReversed: t.commissionReversedCents / 100,
      freeActivations: t.freeActivations,
      metrics: {
        clicks: t.clicks,
        signups: t.signups,
        verifiedConversions: t.verifiedConversions,
        confirmedRevenue: t.revenueCents / 100,
      },
      // Offres des marques : clics mesurés et ventes confirmées, séparés.
      offers: await this.tracking.offersSummary(),
    };
  }

  /**
   * Chiffres commerciaux de chaque partenaire, calculés une seule fois ici
   * pour la liste, la fiche, la synthèse et l'Espace partenaire :
   * - clics : visites du lien + clics sur ses offres (mesurés, pas des ventes) ;
   * - conversions vérifiées : Parcours payés (paiement confirmé) + ventes
   *   confirmées par relevé de la marque ;
   * - revenu confirmé : payé et non remboursé ; commission due au taux figé
   *   sur chaque vente, reprises de remboursement déduites.
   */
  private async salesBlocks(
    partners: { id: string; promoCodeId?: string | null }[],
  ) {
    const ids = partners.map((p) => p.id);
    const codeIds = partners
      .map((p) => p.promoCodeId)
      .filter(Boolean) as string[];
    const [figures, free, visits, offerRows] = await Promise.all([
      partnerFigures(this.prisma, ids),
      this.revenueByCode(codeIds),
      this.prisma.partnerDailyStat.groupBy({
        by: ['promoCodeId'],
        where: { promoCodeId: { in: codeIds } },
        _sum: { visits: true, signups: true },
      }),
      this.prisma.partnerOffer.findMany({
        where: { partnerId: { in: ids } },
        select: {
          partnerId: true,
          stats: { select: { clicks: true } },
          conversions: { select: { conversions: true } },
        },
      }),
    ]);
    const visitsBy = new Map(visits.map((v) => [v.promoCodeId, v._sum]));
    const offerClicks = new Map<string, number>();
    const brandSales = new Map<string, number>();
    for (const o of offerRows) {
      offerClicks.set(
        o.partnerId,
        (offerClicks.get(o.partnerId) ?? 0) +
          o.stats.reduce((n, s) => n + s.clicks, 0),
      );
      brandSales.set(
        o.partnerId,
        (brandSales.get(o.partnerId) ?? 0) +
          o.conversions.reduce((n, c) => n + c.conversions, 0),
      );
    }
    const out = new Map<
      string,
      {
        sales: {
          purchases: number;
          freeActivations: number;
          revenue: number;
          gross: number;
          refunded: number;
          refundedSales: number;
          commission: number;
          commissionGross: number;
          commissionReversed: number;
        };
        metrics: {
          clicks: number;
          signups: number;
          verifiedConversions: number;
          confirmedRevenue: number;
        };
      }
    >();
    for (const p of partners) {
      const f = figures.get(p.id) ?? EMPTY_FIGURES;
      const v = (p.promoCodeId && visitsBy.get(p.promoCodeId)) || {
        visits: 0,
        signups: 0,
      };
      const freeActivations =
        (p.promoCodeId && free.get(p.promoCodeId)?.freeActivations) || 0;
      out.set(p.id, {
        sales: {
          purchases: f.sales,
          freeActivations,
          revenue: f.confirmedCents / 100,
          gross: f.grossCents / 100,
          refunded: f.refundedCents / 100,
          refundedSales: f.refundedSales,
          commission: f.commissionDueCents / 100,
          commissionGross: f.commissionGrossCents / 100,
          commissionReversed: f.commissionReversedCents / 100,
        },
        metrics: {
          clicks: (v.visits ?? 0) + (offerClicks.get(p.id) ?? 0),
          signups: v.signups ?? 0,
          verifiedConversions: f.sales + (brandSales.get(p.id) ?? 0),
          confirmedRevenue: f.confirmedCents / 100,
        },
      });
    }
    return out;
  }

  private revenueByCode(codeIds: string[]) {
    return revenueByCode(this.prisma, codeIds);
  }
}
