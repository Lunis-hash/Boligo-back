import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { AuthGuard } from '@nestjs/passport';
import { ReportReason } from '@prisma/client';

@Controller('report')
@UseGuards(AuthGuard('jwt'))
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async createReport(
    @Request() req,
    @Body() body: {
      reportedUserId?: string;
      messageId?: string;
      reason: ReportReason;
      description?: string;
    },
  ) {
    const userId = req.user.id || req.user.userId;
    return this.reportService.createReport(userId, body);
  }
}
