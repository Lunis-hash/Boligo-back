import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Header,
  Req,
} from '@nestjs/common';
import { ReportStatus, UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { AdminGuard } from './guards/admin.guard';
import { AllowRoles } from './guards/admin-roles';
import { SetTeamRoleDto } from './dto/set-team-role.dto';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/promo-code.dto';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('auth/login')
  @UseGuards(AuthRateLimitGuard)
  login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR, UserRole.MARKETING)
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
    });
  }

  @Get('users/export/csv')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="utilisateurs.csv"')
  exportUsersCSV() {
    return this.adminService.exportUsersCSV();
  }

  @Get('users/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @Req() req: { user: { role: UserRole } },
  ) {
    return this.adminService.updateUser(id, dto, req.user.role);
  }

  @Get('matches')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  listMatches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listMatches({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Get('journeys')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  listJourneys(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('result') result?: string,
    @Query('step') step?: string,
  ) {
    return this.adminService.listJourneys({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      result,
      step,
    });
  }

  @Get('journeys/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  getJourney(@Param('id') id: string) {
    return this.adminService.getJourney(id);
  }

  @Get('reports')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  listReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listReports({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Patch('reports/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  updateReport(
    @Param('id') id: string,
    @Body('status') status: ReportStatus,
  ) {
    return this.adminService.updateReport(id, status);
  }

  @Get('messages/blocked')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  listBlockedMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listBlockedMessages({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('finance/stats')
  @UseGuards(AdminGuard)
  getFinanceStats() {
    return this.adminService.getFinanceStats();
  }

  @Get('finance/export/csv')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="transactions.csv"')
  exportTransactionsCSV() {
    return this.adminService.exportTransactionsCSV();
  }

  @Get('finance/transactions')
  @UseGuards(AdminGuard)
  listTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.listTransactions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
    });
  }

  // ═══════════════════════════════════════════════
  // CODES PROMO
  // ═══════════════════════════════════════════════

  @Get('promo/stats')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  getPromoStats() {
    return this.adminService.getPromoStats();
  }

  @Get('promo/codes')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  listPromoCodes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('q') q?: string,
  ) {
    return this.adminService.listPromoCodes({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isActive,
      q,
    });
  }

  @Get('promo/codes/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  getPromoCode(
    @Param('id') id: string,
    @Req() req: { user: { role: UserRole } },
  ) {
    return this.adminService.getPromoCode(id, req.user.role);
  }

  @Post('promo/codes')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  createPromoCode(@Body() body: CreatePromoCodeDto) {
    return this.adminService.createPromoCode(body);
  }

  @Patch('promo/codes/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  updatePromoCode(@Param('id') id: string, @Body() body: UpdatePromoCodeDto) {
    return this.adminService.updatePromoCode(id, body);
  }

  @Patch('promo/codes/:id/toggle')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  togglePromoCode(@Param('id') id: string) {
    return this.adminService.togglePromoCode(id);
  }

  /** Un code jamais utilisé est supprimé ; un code déjà utilisé est mis en pause. */
  @Delete('promo/codes/:id')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MARKETING)
  deletePromoCode(@Param('id') id: string) {
    return this.adminService.deletePromoCode(id);
  }

  // ═══════════════════════════════════════════════
  // SESSIONS VIDÉO
  // ═══════════════════════════════════════════════

  @Get('video/stats')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  getVideoStats() {
    return this.adminService.getVideoStats();
  }

  @Get('video/sessions')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR)
  listVideoSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listVideoSessions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // ═══════════════════════════════════════════════
  // NOTIFICATIONS PUSH (ADMIN)
  // ═══════════════════════════════════════════════

  @Post('notifications/broadcast')
  @UseGuards(AdminGuard)
  broadcastPushNotification(
    @Body()
    body: {
      title: string;
      content: string;
      type: 'nouveau_match' | 'message' | 'question_harmonie' | 'rappel_reponse' | 'credit' | 'systeme';
      targetUserId?: string;
    },
  ) {
    return this.adminService.broadcastPushNotification(body);
  }

  @Get('notifications/history')
  @UseGuards(AdminGuard)
  getNotificationHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getNotificationHistory({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
    });
  }

  // ═══════════════════════════════════════════════
  // ÉQUIPE : qui accède au tableau de bord (administrateur seulement)
  // ═══════════════════════════════════════════════

  /** Profil de la personne connectée (rôle à jour). */
  @Get('me')
  @UseGuards(AdminGuard)
  @AllowRoles(UserRole.MODERATOR, UserRole.MARKETING)
  me(
    @Req()
    req: {
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
      };
    },
  ) {
    const { id, email, firstName, lastName, role } = req.user;
    return { id, email, firstName, lastName, role };
  }

  @Get('team')
  @UseGuards(AdminGuard)
  listTeam() {
    return this.adminService.listTeam();
  }

  @Patch('team')
  @UseGuards(AdminGuard)
  setTeamRole(
    @Body() dto: SetTeamRoleDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.setTeamRole(req.user.id, dto.email, dto.role);
  }
}
