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
} from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { AdminGuard } from './guards/admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('auth/login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @UseGuards(AdminGuard)
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
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @UseGuards(AdminGuard)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('matches')
  @UseGuards(AdminGuard)
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
  getJourney(@Param('id') id: string) {
    return this.adminService.getJourney(id);
  }

  @Get('reports')
  @UseGuards(AdminGuard)
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
  updateReport(
    @Param('id') id: string,
    @Body('status') status: ReportStatus,
  ) {
    return this.adminService.updateReport(id, status);
  }

  @Get('messages/blocked')
  @UseGuards(AdminGuard)
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
  getPromoStats() {
    return this.adminService.getPromoStats();
  }

  @Get('promo/codes')
  @UseGuards(AdminGuard)
  listPromoCodes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.listPromoCodes({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isActive,
    });
  }

  @Get('promo/codes/:id')
  @UseGuards(AdminGuard)
  getPromoCode(@Param('id') id: string) {
    return this.adminService.getPromoCode(id);
  }

  @Post('promo/codes')
  @UseGuards(AdminGuard)
  createPromoCode(
    @Body() body: {
      code: string;
      discountType: string;
      discountValue: number;
      maxUses?: number | null;
      expiresAt?: string | null;
      isActive?: boolean;
      description?: string;
    }
  ) {
    return this.adminService.createPromoCode(body);
  }

  @Patch('promo/codes/:id')
  @UseGuards(AdminGuard)
  updatePromoCode(
    @Param('id') id: string,
    @Body() body: {
      discountType?: string;
      discountValue?: number;
      maxUses?: number | null;
      expiresAt?: string | null;
      isActive?: boolean;
      description?: string;
    }
  ) {
    return this.adminService.updatePromoCode(id, body);
  }

  @Patch('promo/codes/:id/toggle')
  @UseGuards(AdminGuard)
  togglePromoCode(@Param('id') id: string) {
    return this.adminService.togglePromoCode(id);
  }

  @Delete('promo/codes/:id')
  @UseGuards(AdminGuard)
  deletePromoCode(@Param('id') id: string) {
    return this.adminService.deletePromoCode(id);
  }

  // ═══════════════════════════════════════════════
  // SESSIONS VIDÉO
  // ═══════════════════════════════════════════════

  @Get('video/stats')
  @UseGuards(AdminGuard)
  getVideoStats() {
    return this.adminService.getVideoStats();
  }

  @Get('video/sessions')
  @UseGuards(AdminGuard)
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
}
