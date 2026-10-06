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
  Prisma,
  TransactionType,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';
import { ApplyPartnerDto } from './dto/apply-partner.dto';
import {
  CreatePartnerCodeDto,
  UpdatePartnerDto,
} from './dto/update-partner.dto';
import {
  codeStem,
  commissionDue,
  defaultCommission,
  normalizeCode,
  partnerTypeLabel,
} from './partners.logic';

const TEAM_EMAIL = () =>
  process.env.PARTNERS_NOTIFY_EMAIL || 'contact@boligo.fr';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger('Partners');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Candidature publique : enregistrement, puis e-mails (sans bloquer la réponse). */
  async apply(dto: ApplyPartnerDto) {
    const lang = dto.language === 'en' ? 'en' : 'fr';
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
      },
    });
    void this.notify(created.id, dto, lang);
    return { ok: true, id: created.id };
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
        ...r,
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
      ...row,
      sales: { ...s, commission: commissionDue(s.revenue, row.commissionRate) },
    };
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.get(id);
    return this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        commissionRate: dto.commissionRate,
      },
    });
  }

  /** Crée le code promo personnel du partenaire et valide la candidature. */
  async createCode(id: string, dto: CreatePartnerCodeDto) {
    const partner = await this.get(id);
    if (partner.promoCodeId)
      throw new BadRequestException('Ce partenaire a déjà un code.');
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
    return this.prisma.partnerApplication.update({
      where: { id },
      data: { promoCodeId: promo.id, status: PartnerStatus.ACCEPTE },
      include: { promoCode: true },
    });
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

  /** Achats payés avec chaque code : nombre et chiffre d'affaires en euros. */
  private async revenueByCode(codeIds: string[]) {
    const map = new Map<string, { purchases: number; revenue: number }>();
    if (!codeIds.length) return map;
    const rows = await this.prisma.creditTransaction.groupBy({
      by: ['promoCodeId'],
      where: { promoCodeId: { in: codeIds }, type: TransactionType.achat },
      _count: { _all: true },
      _sum: { euroAmount: true },
    });
    for (const r of rows) {
      if (r.promoCodeId) {
        map.set(r.promoCodeId, {
          purchases: r._count._all,
          revenue: Math.round((r._sum.euroAmount ?? 0) * 100) / 100,
        });
      }
    }
    return map;
  }
}
