import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferPlacement, PartnerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  dayKey,
  discountLabel,
  funnelByMonth,
  isSafeOfferUrl,
  normalizePartnerCode,
  offerIsLive,
  offerRedirectUrl,
  rate,
  referralStillValid,
} from './partner-tracking.logic';
import { OfferConversionDto, OfferInputDto } from './dto/offer.dto';

/** État lisible d'une offre pour l'équipe et le partenaire. */
export function offerState(
  o: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): 'brouillon' | 'programmee' | 'en_ligne' | 'expiree' | 'retiree' {
  if (o.endsAt && o.endsAt <= now) return 'expiree';
  if (!o.isActive) return o.startsAt || o.endsAt ? 'retiree' : 'brouillon';
  if (o.startsAt && o.startsAt > now) return 'programmee';
  return 'en_ligne';
}

/** Code partenaire utilisable : actif, non expiré, partenaire accepté. */
type LiveCode = {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed' | 'free';
  discountValue: number;
  partnerName: string;
  partnerType: string;
};

@Injectable()
export class PartnerTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  private async liveCode(raw: unknown): Promise<LiveCode | null> {
    const code = normalizePartnerCode(raw);
    if (!code) return null;
    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
      include: { partner: true },
    });
    if (
      !promo ||
      !promo.isActive ||
      !promo.partner ||
      promo.partner.status !== PartnerStatus.ACCEPTE ||
      (promo.expiresAt && promo.expiresAt < new Date()) ||
      (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
    ) {
      return null;
    }
    return {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      partnerName: promo.partner.company || promo.partner.name,
      partnerType: promo.partner.type,
    };
  }

  /** Ce que voit un visiteur arrivé par ?p=CODE : qui le recommande, quelle réduction. */
  async linkInfo(raw: string) {
    const live = await this.liveCode(raw);
    if (!live)
      throw new NotFoundException('Lien partenaire inconnu ou terminé.');
    return {
      code: live.code,
      partnerName: live.partnerName,
      partnerType: live.partnerType,
      discount: discountLabel(live.discountType, live.discountValue),
    };
  }

  private bump(promoCodeId: string, field: 'visits' | 'signups') {
    const day = dayKey();
    return this.prisma.partnerDailyStat.upsert({
      where: { promoCodeId_day: { promoCodeId, day } },
      create: { promoCodeId, day, [field]: 1 },
      update: { [field]: { increment: 1 } },
    });
  }

  /** Une visite arrivée par le lien (comptée une fois par session côté app). */
  async recordVisit(raw: string) {
    const live = await this.liveCode(raw);
    if (!live) return { counted: false };
    await this.bump(live.id, 'visits');
    return { counted: true };
  }

  /**
   * À l'inscription : rattache le compte au partenaire dont le lien a été
   * suivi. Jamais bloquant pour l'inscription.
   */
  async attachReferral(userId: string, raw: unknown): Promise<boolean> {
    try {
      const live = await this.liveCode(raw);
      if (!live) return false;
      await this.prisma.user.update({
        where: { id: userId },
        data: { referralCodeId: live.id, referredAt: new Date() },
      });
      await this.bump(live.id, 'signups');
      return true;
    } catch (err) {
      console.error(
        `[PARTENAIRES] Lien partenaire non rattaché : ${(err as Error)?.message}`,
      );
      return false;
    }
  }

  /** Code à préremplir au paiement pour un membre arrivé par un lien partenaire. */
  async referralFor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredAt: true,
        referralCode: { select: { code: true, id: true } },
      },
    });
    if (!user?.referralCode || !referralStillValid(user.referredAt)) {
      return { code: null };
    }
    const live = await this.liveCode(user.referralCode.code);
    if (!live) return { code: null };
    const used = await this.prisma.promoUsage.findUnique({
      where: { promoCodeId_userId: { promoCodeId: live.id, userId } },
    });
    if (used) return { code: null };
    return {
      code: live.code,
      partnerName: live.partnerName,
      discount: discountLabel(live.discountType, live.discountValue),
    };
  }

  /** Visites et inscriptions venues du lien d'un partenaire. */
  async linkFunnel(promoCodeId: string) {
    const rows = await this.prisma.partnerDailyStat.findMany({
      where: { promoCodeId },
      select: { day: true, visits: true, signups: true },
    });
    const visits = rows.reduce((s, r) => s + r.visits, 0);
    const signups = rows.reduce((s, r) => s + r.signups, 0);
    return { visits, signups, months: funnelByMonth(rows) };
  }

  // ─── Offres des marques ─────────────────────────────────────────────────

  /** Offres visibles des membres et des visiteurs. */
  async publicOffers(placement?: string) {
    const where: Prisma.PartnerOfferWhereInput = {
      isActive: true,
      partner: { status: PartnerStatus.ACCEPTE },
    };
    if (placement && placement in OfferPlacement) {
      where.placement = placement as OfferPlacement;
    }
    const now = new Date();
    // Les dates sont filtrées en base : une offre expirée ou à venir ne prend
    // jamais la place d'une offre en cours dans la limite de 30.
    where.AND = [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    ];
    const offers = await this.prisma.partnerOffer.findMany({
      where,
      include: { partner: { select: { name: true, company: true } } },
      orderBy: [{ placement: 'desc' }, { updatedAt: 'desc' }],
      take: 30,
    });
    return offers
      .filter((o) => offerIsLive(o, now))
      .map((o) => ({
        id: o.id,
        placement: o.placement,
        brand: o.partner.company || o.partner.name,
        title: o.title,
        perk: o.perk,
        description: o.description,
        perkCode: o.perkCode,
      }));
  }

  private bumpOffer(offerId: string, field: 'impressions' | 'clicks') {
    const day = dayKey();
    return this.prisma.partnerOfferStat.upsert({
      where: { offerId_day: { offerId, day } },
      create: { offerId, day, [field]: 1 },
      update: { [field]: { increment: 1 } },
    });
  }

  /** Affichages : l'app envoie les offres réellement montrées (une fois par session). */
  async recordImpressions(ids: string[]) {
    const unique = [...new Set(ids)].slice(0, 30);
    const shown = await this.prisma.partnerOffer.findMany({
      where: {
        id: { in: unique },
        isActive: true,
        partner: { status: PartnerStatus.ACCEPTE },
      },
    });
    // Seules les offres réellement en ligne (dates comprises) sont comptées.
    const live = shown.filter((o) => offerIsLive(o));
    for (const o of live) await this.bumpOffer(o.id, 'impressions');
    return { counted: live.length };
  }

  /** Clic : compté, puis redirection vers la marque avec ses paramètres de campagne. */
  async clickOffer(id: string): Promise<string> {
    const offer = await this.prisma.partnerOffer.findUnique({
      where: { id },
      include: { partner: { select: { status: true } } },
    });
    if (
      !offer ||
      offer.partner.status !== PartnerStatus.ACCEPTE ||
      !offerIsLive(offer) ||
      !isSafeOfferUrl(offer.url)
    ) {
      throw new NotFoundException('Offre terminée.');
    }
    await this.bumpOffer(offer.id, 'clicks');
    return offerRedirectUrl(offer.url, offer.id);
  }

  /** Statistiques des offres d'un partenaire (Espace partenaire et équipe). */
  async offerStats(partnerId: string) {
    const offers = await this.prisma.partnerOffer.findMany({
      where: { partnerId },
      include: { stats: true, conversions: true },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return offers.map((o) => {
      const impressions = o.stats.reduce((s, r) => s + r.impressions, 0);
      const clicks = o.stats.reduce((s, r) => s + r.clicks, 0);
      const confirmedSales = o.conversions.reduce(
        (s, r) => s + r.conversions,
        0,
      );
      const confirmedRevenue =
        o.conversions.reduce((s, r) => s + r.revenueCents, 0) / 100;
      return {
        // Clics (mesurés par BOLIGO) et ventes confirmées (relevé de la
        // marque) sont deux mesures distinctes, jamais converties l'une en l'autre.
        confirmedSales,
        confirmedRevenue,
        state: offerState(o, now),
        id: o.id,
        title: o.title,
        perk: o.perk,
        placement: o.placement,
        isActive: o.isActive,
        live: offerIsLive(o),
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        impressions,
        clicks,
        clickRate: rate(clicks, impressions),
      };
    });
  }

  // ─── Gestion par l'équipe ────────────────────────────────────────────────

  private checkInput(dto: OfferInputDto) {
    if (dto.url !== undefined && !isSafeOfferUrl(dto.url)) {
      throw new BadRequestException(
        'Le lien de l’offre doit commencer par https:// (site de la marque).',
      );
    }
    if (
      dto.startsAt &&
      dto.endsAt &&
      new Date(dto.endsAt) <= new Date(dto.startsAt)
    ) {
      throw new BadRequestException('La fin doit être après le début.');
    }
  }

  async adminOffers(partnerId: string) {
    const partner = await this.prisma.partnerApplication.findUnique({
      where: { id: partnerId },
      select: { id: true },
    });
    if (!partner) throw new NotFoundException('Partenaire introuvable.');
    const [offers, stats] = await Promise.all([
      this.prisma.partnerOffer.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
      }),
      this.offerStats(partnerId),
    ]);
    const byId = new Map(stats.map((s) => [s.id, s]));
    return offers.map((o) => ({ ...o, stats: byId.get(o.id) }));
  }

  async createOffer(partnerId: string, dto: OfferInputDto) {
    const partner = await this.prisma.partnerApplication.findUnique({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partenaire introuvable.');
    if (!dto.title || !dto.perk || !dto.description || !dto.url) {
      throw new BadRequestException(
        'Titre, avantage, description et lien sont obligatoires.',
      );
    }
    this.checkInput(dto);
    if (dto.isActive && partner.status !== PartnerStatus.ACCEPTE) {
      throw new BadRequestException(
        'Acceptez d’abord le partenaire avant de publier son offre.',
      );
    }
    return this.prisma.partnerOffer.create({
      data: {
        partnerId,
        title: dto.title.trim(),
        perk: dto.perk.trim(),
        description: dto.description.trim(),
        url: dto.url,
        perkCode: dto.perkCode?.trim() || null,
        placement: dto.placement ?? OfferPlacement.OFFRES,
        isActive: dto.isActive ?? false,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async updateOffer(partnerId: string, offerId: string, dto: OfferInputDto) {
    const offer = await this.prisma.partnerOffer.findFirst({
      where: { id: offerId, partnerId },
      include: { partner: true },
    });
    if (!offer) throw new NotFoundException('Offre introuvable.');
    this.checkInput(dto);
    if (dto.isActive && offer.partner.status !== PartnerStatus.ACCEPTE) {
      throw new BadRequestException(
        'Acceptez d’abord le partenaire avant de publier son offre.',
      );
    }
    const startsAt =
      dto.startsAt !== undefined
        ? dto.startsAt && new Date(dto.startsAt)
        : offer.startsAt;
    const endsAt =
      dto.endsAt !== undefined ? dto.endsAt && new Date(dto.endsAt) : offer.endsAt;
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('La fin doit être après le début.');
    }
    if (dto.isActive && endsAt && endsAt <= new Date()) {
      throw new BadRequestException(
        'Offre expirée : prolongez sa date de fin avant de la republier.',
      );
    }
    return this.prisma.partnerOffer.update({
      where: { id: offerId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.perk !== undefined && { perk: dto.perk.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.perkCode !== undefined && {
          perkCode: dto.perkCode?.trim() || null,
        }),
        ...(dto.placement !== undefined && { placement: dto.placement }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        }),
        ...(dto.endsAt !== undefined && {
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        }),
      },
    });
  }

  // ─── Ventes confirmées des offres (relevés des marques) ──────────────────

  async listConversions(partnerId: string, offerId: string) {
    await this.offerOf(partnerId, offerId);
    const rows = await this.prisma.partnerOfferConversion.findMany({
      where: { offerId },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      month: r.month.toISOString().slice(0, 7),
      conversions: r.conversions,
      revenue: r.revenueCents / 100,
      reference: r.reference,
      createdAt: r.createdAt,
    }));
  }

  async addConversion(
    partnerId: string,
    offerId: string,
    dto: OfferConversionDto,
    adminId?: string,
  ) {
    await this.offerOf(partnerId, offerId);
    const month = new Date(`${dto.month}-01T00:00:00.000Z`);
    if (month > new Date()) {
      throw new BadRequestException('Mois à venir : aucune vente à confirmer.');
    }
    await this.prisma.partnerOfferConversion.create({
      data: {
        offerId,
        month,
        conversions: dto.conversions,
        revenueCents: Math.round(dto.revenue * 100),
        reference: dto.reference?.trim() || null,
        createdBy: adminId ?? null,
      },
    });
    return this.listConversions(partnerId, offerId);
  }

  async deleteConversion(partnerId: string, offerId: string, id: string) {
    await this.offerOf(partnerId, offerId);
    await this.prisma.partnerOfferConversion.deleteMany({
      where: { id, offerId },
    });
    return this.listConversions(partnerId, offerId);
  }

  /** Synthèse des offres : affichages et clics mesurés, ventes confirmées à part. */
  async offersSummary() {
    const [offers, stats, conv] = await Promise.all([
      this.prisma.partnerOffer.findMany({
        select: { isActive: true, startsAt: true, endsAt: true },
      }),
      this.prisma.partnerOfferStat.aggregate({
        _sum: { impressions: true, clicks: true },
      }),
      this.prisma.partnerOfferConversion.aggregate({
        _sum: { conversions: true, revenueCents: true },
      }),
    ]);
    const now = new Date();
    const byState: Record<string, number> = {};
    for (const o of offers) {
      const st = offerState(o, now);
      byState[st] = (byState[st] ?? 0) + 1;
    }
    const clicks = stats._sum.clicks ?? 0;
    const confirmedSales = conv._sum.conversions ?? 0;
    return {
      total: offers.length,
      byState,
      impressions: stats._sum.impressions ?? 0,
      clicks,
      confirmedSales,
      confirmedRevenue: (conv._sum.revenueCents ?? 0) / 100,
      conversionRate: rate(confirmedSales, clicks),
    };
  }

  private async offerOf(partnerId: string, offerId: string) {
    const offer = await this.prisma.partnerOffer.findFirst({
      where: { id: offerId, partnerId },
      select: { id: true },
    });
    if (!offer) throw new NotFoundException('Offre introuvable.');
    return offer;
  }
}
