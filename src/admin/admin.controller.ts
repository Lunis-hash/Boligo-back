import {
  Body,
  Controller,
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
}
