import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('credit')
@UseGuards(AuthGuard('jwt'))
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('balance')
  async getBalance(@Request() req) {
    return this.creditService.getBalance(req.user.id);
  }

  // Ancienne route de débit appelée par l'app : le serveur débite désormais
  // lui-même à l'invitation et à l'acceptation (module matching). Elle ne débite
  // plus rien, pour qu'une ancienne version de l'app ne facture pas deux fois.
  @Post('spend')
  async spendCredits(@Request() req) {
    const balance = await this.creditService.getBalance(req.user.id);
    return { success: true, charged: 0, newBalance: balance.credits };
  }

  // Pas de route « ajouter des crédits » : les crédits ne s'obtiennent que par
  // un paiement Stripe vérifié ou un code promo (module paiement).

  @Get('history')
  async getHistory(@Request() req) {
    return this.creditService.getHistory(req.user.id);
  }
}
