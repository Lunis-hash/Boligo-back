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
  TransactionType,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, emailDeliveryMode } from '../common/email.service';
import { ApplyPartnerDto } from './dto/apply-partner.dto';
import {
  CreatePartnerCodeDto,
  ManualVerificationDto,
  UpdatePartnerDto,
} from './dto/update-partner.dto';
import { checkRegistration, REGISTRATION_LABELS } from './registration';
import { RegistryService } from './registry.service';
import {
  codeStem,
  commissionDue,
  defaultCommission,
  normalizeCode,
  partnerTypeLabel,
} from './partners.logic';
import {
  hashPortalToken,
  isPortalToken,
  monthlyHistory,
  newPortalToken,
  portalLink,
} from './partner-portal.logic';
import { revenueByCode } from './partner-sales';

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
    const stats = await this.revenueByCode(
      rows.map((r) => r.promoCodeId).filter(Boolean) as string[],
    );
    const data = rows.map((r) => {
      const s = (r.promoCodeId && stats.get(r.promoCodeId)) || {
        purchases: 0,
        revenue: 0,
      };
      return {
        ...withoutSecret(r),
        sales: { ...s, commission: commissionDue(s.revenue, r.commissionRate) },
      };
    });
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
    const s = (row.promoCodeId &&
      (await this.revenueByCode([row.promoCodeId])).get(row.promoCodeId)) || {
      purchases: 0,
      revenue: 0,
    };
    return {
      ...withoutSecret(row),
      sales: { ...s, commission: commissionDue(s.revenue, row.commissionRate) },
    };
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
    const row = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        ...registration,
        status: dto.status,
        notes: dto.notes,
        commissionRate: dto.commissionRate,
        // Une candidature refusée perd aussi son Espace partenaire.
        ...(dto.status === PartnerStatus.REFUSE
          ? { portalTokenHash: null, portalLinkSentAt: null }
          : {}),
      },
    });
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
    if (!partner.promoCode) {
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
    const code = partner.promoCode.code;
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
              `Votre code personnel : ${code}.`,
              'Votre Espace partenaire montre en temps réel les Parcours payés avec votre code, le montant encaissé et votre commission, mois par mois.',
              'Ce lien est personnel : ne le partagez pas. Si vous le perdez, écrivez-nous et nous vous en enverrons un nouveau.',
              'Rappel : chaque publication doit porter la mention « Collaboration commerciale » ou « Publicité ».',
            ]
          : [
              `Your personal code: ${code}.`,
              'Your Partner space shows, in real time, the Journeys paid with your code, the amount collected and your commission, month by month.',
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
    if (
      !partner ||
      !partner.promoCode ||
      partner.status === PartnerStatus.REFUSE
    ) {
      throw invalid;
    }
    const promo = partner.promoCode;
    // Achats et remboursements : le chiffre d'affaires est net.
    const sales = await this.prisma.creditTransaction.findMany({
      where: {
        promoCodeId: promo.id,
        type: {
          in: [TransactionType.achat, TransactionType.remboursement_paiement],
        },
      },
      select: { date: true, euroAmount: true, type: true },
    });
    const revenue =
      Math.round(sales.reduce((sum, s) => sum + (s.euroAmount ?? 0), 0) * 100) /
      100;
    return {
      partner: {
        name: partner.name,
        company: partner.company,
        type: partner.type,
        language: partner.language,
        commissionRate: partner.commissionRate,
      },
      code: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        isActive: promo.isActive,
        expiresAt: promo.expiresAt,
        uses: promo.usedCount,
      },
      totals: {
        purchases: sales.filter((s) => s.type === TransactionType.achat).length,
        revenue,
        commission: commissionDue(revenue, partner.commissionRate),
      },
      months: monthlyHistory(sales, partner.commissionRate),
      updatedAt: new Date().toISOString(),
    };
  }

  /** Synthèse : candidatures par profil et statut, ventes et commissions dues. */
  async summary() {
    const [byType, byStatus, withCode] = await Promise.all([
      this.prisma.partnerApplication.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      this.prisma.partnerApplication.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.partnerApplication.findMany({
        where: { promoCodeId: { not: null } },
        select: { promoCodeId: true, commissionRate: true },
      }),
    ]);
    const stats = await this.revenueByCode(
      withCode.map((p) => p.promoCodeId as string),
    );
    let revenue = 0;
    let commission = 0;
    let purchases = 0;
    for (const p of withCode) {
      const s = stats.get(p.promoCodeId as string);
      if (!s) continue;
      revenue += s.revenue;
      purchases += s.purchases;
      commission += commissionDue(s.revenue, p.commissionRate);
    }
    return {
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
      byStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, r._count._all]),
      ),
      activeCodes: withCode.length,
      purchases,
      revenue: Math.round(revenue * 100) / 100,
      commission: Math.round(commission * 100) / 100,
    };
  }

  private revenueByCode(codeIds: string[]) {
    return revenueByCode(this.prisma, codeIds);
  }
}
