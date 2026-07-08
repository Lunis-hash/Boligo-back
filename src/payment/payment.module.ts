import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [PrismaModule, CreditModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
