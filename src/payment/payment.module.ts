import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';
import { EmailService } from '../common/email.service';

@Module({
  imports: [PrismaModule, CreditModule],
  controllers: [PaymentController],
  providers: [PaymentService, EmailService],
  exports: [PaymentService],
})
export class PaymentModule {}
