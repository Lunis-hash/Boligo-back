import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../common/email.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [PrismaModule],
  controllers: [PartnersController],
  providers: [PartnersService, EmailService],
})
export class PartnersModule {}
