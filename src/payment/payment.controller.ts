import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import { WithdrawalService } from './withdrawal.service';
import { CreatePaymentDto, WithdrawalRequestDto } from './dto/billing.dto';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly withdrawals: WithdrawalService,
  ) {}

  // ─── Présentation du plan unique (sans auth) ───────────────────────────────
  @Get('plans')
  async getPlans() {
    return this.paymentService.getPlans();
  }

  // ─── Vérifier un code promo avant paiement ────────────────────────────────
  @Post('check-promo')
  @UseGuards(AuthGuard('jwt'))
  async checkPromo(
    @Request() req,
    @Body() body: { code: string; optionId?: string },
  ) {
    return this.paymentService.checkPromoCode(
      req.user.id,
      body.code,
      body.optionId || 'parcours_harmonie',
    );
  }

  // ─── Créer un PaymentIntent Stripe ────────────────────────────────────────
  @Post('create-payment-intent')
  @UseGuards(AuthGuard('jwt'))
  async createPaymentIntent(
    @Request() req,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentService.createPaymentSheet(
      req.user.id,
      body.optionId || body.packId || 'parcours_harmonie',
      body.promoCode,
      body,
    );
  }

  // ─── Alias : create-intent (compatibilité app mobile existante) ───────────
  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  async createIntent(
    @Request() req,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentService.createPaymentSheet(
      req.user.id,
      body.optionId || body.packId || 'parcours_harmonie',
      body.promoCode,
      body,
    );
  }

  // ─── Confirmer un paiement après la feuille de paiement (app) ─────────────
  @Post('confirm')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async confirm(@Request() req, @Body() body: { paymentIntentId: string }) {
    return this.paymentService.confirmPayment(
      req.user.id,
      body?.paymentIntentId,
    );
  }

  // ─── Webhook Stripe (sans auth, vérifié par signature) ────────────────────
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentService.handleWebhook(rawBody, signature);
  }

  // ─── Mes achats, factures et rétractation ─────────────────────────────────
  @Get('purchases')
  @UseGuards(AuthGuard('jwt'))
  purchases(@Request() req: { user: { id: string } }) {
    return this.withdrawals.purchases(req.user.id);
  }

  /** Lien du PDF de la facture (relu chez Stripe à chaque demande). */
  @Get('invoices/:paymentRef')
  @UseGuards(AuthGuard('jwt'))
  async invoice(
    @Request() req: { user: { id: string } },
    @Param('paymentRef') paymentRef: string,
  ) {
    return { url: await this.withdrawals.invoicePdf(req.user.id, paymentRef) };
  }

  /** « Se rétracter du contrat ici » : accusé de réception par e-mail. */
  @Post('withdrawals')
  @UseGuards(AuthGuard('jwt'))
  withdraw(
    @Request() req: { user: { id: string } },
    @Body() body: WithdrawalRequestDto,
  ) {
    return this.withdrawals.request(req.user.id, body.paymentRef);
  }

  // ─── Appliquer un code promo (accès gratuit ou réduction) ─────────────────
  @Post('apply-promo')
  @UseGuards(AuthGuard('jwt'))
  async applyPromo(
    @Request() req,
    @Body() body: { code: string; optionId?: string },
  ) {
    return this.paymentService.applyPromoCode(
      req.user.id,
      body.code,
      body.optionId || 'parcours_harmonie',
    );
  }
}
