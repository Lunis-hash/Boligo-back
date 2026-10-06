import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../common/email.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { RegistryService } from './registry.service';

@Module({
  imports: [PrismaModule],
  controllers: [PartnersController],
  providers: [PartnersService, EmailService, RegistryService],
})
export class PartnersModule {}
