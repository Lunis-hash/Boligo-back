import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin/guards/admin.guard';
import { InvoiceService } from './invoice.service';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalDecisionDto } from './dto/billing.dto';

const day = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : undefined;

/** Facturation, réservée aux administrateurs (argent rendu, pièces comptables). */
@Controller('admin/billing')
@UseGuards(AdminGuard)
export class BillingAdminController {
  constructor(
    private readonly invoices: InvoiceService,
    private readonly withdrawals: WithdrawalService,
  ) {}

  @Get('status')
  status() {
    return this.invoices.status();
  }

  @Get('withdrawals')
  listWithdrawals() {
    return this.withdrawals.listForAdmin();
  }

  @Post('withdrawals/:id/decide')
  decide(
    @Param('id') id: string,
    @Body() body: WithdrawalDecisionDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.withdrawals.decide(id, req.user.id, body);
  }

  /** Journal des ventes (du = inclus, au = exclu, AAAA-MM-JJ). */
  @Get('sales/export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="journal-des-ventes.csv"',
  )
  salesJournal(@Query('from') from?: string, @Query('to') to?: string) {
    return this.invoices.salesJournalCsv(day(from), day(to));
  }
}
