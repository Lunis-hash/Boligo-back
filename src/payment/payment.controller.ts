import { Controller, Post, Get, Body, UseGuards, Request, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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
    @Body() body: { code: string; optionId?: string }
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
    @Body() body: { optionId?: string; packId?: string; promoCode?: string }
  ) {
    return this.paymentService.createPaymentSheet(
      req.user.id,
      body.optionId || body.packId || 'parcours_harmonie',
      body.promoCode,
    );
  }

  // ─── Alias : create-intent (compatibilité app mobile existante) ───────────
  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  async createIntent(
    @Request() req,
    @Body() body: { optionId?: string; packId?: string; promoCode?: string }
  ) {
    return this.paymentService.createPaymentSheet(
      req.user.id,
      body.optionId || body.packId || 'parcours_harmonie',
      body.promoCode,
    );
  }

  // ─── Webhook Stripe (sans auth, vérifié par signature) ────────────────────
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentService.handleWebhook(rawBody, signature);
  }

  // ─── Appliquer un code promo (accès gratuit ou réduction) ─────────────────
  @Post('apply-promo')
  @UseGuards(AuthGuard('jwt'))
  async applyPromo(
    @Request() req,
    @Body() body: { code: string; optionId?: string }
  ) {
    return this.paymentService.applyPromoCode(
      req.user.id,
      body.code,
      body.optionId || 'parcours_harmonie',
    );
  }
}
