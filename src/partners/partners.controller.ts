import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AllowRoles } from '../admin/guards/admin-roles';
import { PartnersService } from './partners.service';
import { PortalRateLimitGuard } from './portal-rate-limit.guard';
import { TrackingRateLimitGuard } from './tracking-rate-limit.guard';
import { PartnerTrackingService } from './partner-tracking.service';
import { OfferImpressionsDto, OfferInputDto } from './dto/offer.dto';
import { PartnerPortalDto } from './dto/portal.dto';
import { ApplyPartnerDto } from './dto/apply-partner.dto';
import {
  CreatePartnerCodeDto,
  ManualVerificationDto,
  UpdatePartnerDto,
} from './dto/update-partner.dto';

@Controller()
export class PartnersController {
  constructor(
    private readonly partners: PartnersService,
    private readonly tracking: PartnerTrackingService,
  ) {}

  /** Visiteur arrivé par ?p=CODE : qui le recommande et quelle réduction. */
  @Get('partners/link/:code')
  @UseGuards(TrackingRateLimitGuard)
  linkInfo(@Param('code') code: string) {
    return this.tracking.linkInfo(code);
  }

  /** Visite venue du lien d'un partenaire (une fois par session). */
  @Post('partners/link/:code/visit')
  @HttpCode(200)
  @UseGuards(TrackingRateLimitGuard)
  linkVisit(@Param('code') code: string) {
    return this.tracking.recordVisit(code);
  }

  /** Code du partenaire à préremplir au paiement (membre inscrit via son lien). */
  @Get('partners/referral')
  @UseGuards(AuthGuard('jwt'))
  referral(@Req() req: { user: { id: string } }) {
    return this.tracking.referralFor(req.user.id);
  }

  /** Offres des marques visibles des membres et des visiteurs. */
  @Get('partners/offers')
  @UseGuards(TrackingRateLimitGuard)
  offers(@Query('placement') placement?: string) {
    return this.tracking.publicOffers(placement);
  }

  @Post('partners/offers/impressions')
  @HttpCode(200)
  @UseGuards(TrackingRateLimitGuard)
  impressions(@Body() dto: OfferImpressionsDto) {
    return this.tracking.recordImpressions(dto.ids);
  }

  /** Clic sur une offre : compté, puis redirection vers la marque. */
  @Get('partners/offers/:id/go')
  @UseGuards(TrackingRateLimitGuard)
  @Redirect()
  async goToOffer(@Param('id', ParseUUIDPipe) id: string) {
    return { url: await this.tracking.clickOffer(id), statusCode: 302 };
  }

  @Get('admin/partners/:id/offers')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  adminOffers(@Param('id', ParseUUIDPipe) id: string) {
    return this.tracking.adminOffers(id);
  }

  @Post('admin/partners/:id/offers')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  createOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OfferInputDto,
  ) {
    return this.tracking.createOffer(id, dto);
  }

  @Patch('admin/partners/:id/offers/:offerId')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  updateOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() dto: OfferInputDto,
  ) {
    return this.tracking.updateOffer(id, offerId, dto);
  }

  /** Formulaire public du Programme Partenaires (site et application). */
  @Post('partners/apply')
  @UseGuards(AuthRateLimitGuard)
  apply(@Body() dto: ApplyPartnerDto) {
    return this.partners.apply(dto);
  }

  /** Espace partenaire : le jeton voyage dans le corps, jamais dans l'adresse. */
  @Post('partners/portal')
  @HttpCode(200)
  @UseGuards(PortalRateLimitGuard)
  portal(@Body() dto: PartnerPortalDto) {
    return this.partners.portal(dto.token);
  }

  @Get('admin/partners')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  list(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.partners.list({
      type,
      status,
      q,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('admin/partners/summary')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  summary() {
    return this.partners.summary();
  }

  @Get('admin/partners/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.get(id);
  }

  @Patch('admin/partners/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partners.update(id, dto);
  }

  @Post('admin/partners/:id/code')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  createCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePartnerCodeDto,
  ) {
    return this.partners.createCode(id, dto);
  }

  /** Nouveau lien vers l'Espace partenaire, envoyé par e-mail (l'ancien ne marche plus). */
  @Post('admin/partners/:id/portal')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  sendPortalLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.sendPortalLink(id);
  }

  @Delete('admin/partners/:id/portal')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  revokePortal(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.revokePortal(id);
  }

  /** Relance la vérification de l'entreprise auprès du registre public. */
  @Post('admin/partners/:id/verify')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  verify(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.verify(id);
  }

  /** Validation ou rejet manuel de l'entreprise : administrateurs uniquement. */
  @Patch('admin/partners/:id/verification')
  @UseGuards(AdminGuard)
  manualVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualVerificationDto,
    @Req() req: { user: { email: string } },
  ) {
    return this.partners.manualVerification(id, dto, req.user.email);
  }
}
