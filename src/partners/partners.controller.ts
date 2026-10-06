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
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AllowRoles } from '../admin/guards/admin-roles';
import { PartnersService } from './partners.service';
import { PortalRateLimitGuard } from './portal-rate-limit.guard';
import { PartnerPortalDto } from './dto/portal.dto';
import { ApplyPartnerDto } from './dto/apply-partner.dto';
import {
  CreatePartnerCodeDto,
  UpdatePartnerDto,
} from './dto/update-partner.dto';

@Controller()
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

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
}
