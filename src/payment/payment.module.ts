import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';
import { EmailService } from '../common/email.service';
import { InvoiceService } from './invoice.service';
import { WithdrawalService } from './withdrawal.service';
import { BillingAdminController } from './billing-admin.controller';

@Module({
  imports: [PrismaModule, CreditModule],
  controllers: [PaymentController, BillingAdminController],
  providers: [PaymentService, EmailService, InvoiceService, WithdrawalService],
  exports: [PaymentService],
})
export class PaymentModule {}
