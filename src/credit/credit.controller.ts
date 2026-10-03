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

  @Post('spend')
  async spendCredits(
    @Request() req,
    @Body() body: { amount: number; description: string },
  ) {
    return this.creditService.spendCredits(
      req.user.id,
      body.amount,
      body.description,
    );
  }

  // Pas de route « ajouter des crédits » : les crédits ne s'obtiennent que par
  // un paiement Stripe vérifié ou un code promo (module paiement).

  @Get('history')
  async getHistory(@Request() req) {
    return this.creditService.getHistory(req.user.id);
  }
}
