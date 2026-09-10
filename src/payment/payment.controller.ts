import { Controller, Post, Body, UseGuards, Request, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-payment-intent')
  @UseGuards(AuthGuard('jwt'))
  async createPaymentIntent(
    @Request() req,
    @Body() body: { optionId?: string; packId?: string; promoCode?: string }
  ) {
    return this.paymentService.createPaymentSheet(req.user.id, body.optionId || body.packId || 'parcours_harmonie', body.promoCode);
  }

  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  async createIntent(
    @Request() req,
    @Body() body: { optionId?: string; packId?: string; promoCode?: string }
  ) {
    return this.paymentService.createPaymentSheet(req.user.id, body.optionId || body.packId || 'parcours_harmonie', body.promoCode);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any
  ) {
    // If NestJS rawBody is enabled, req.rawBody is a Buffer containing the raw request body
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentService.handleWebhook(rawBody, signature);
  }

  @Post('apply-promo')
  @UseGuards(AuthGuard('jwt'))
  async applyPromo(
    @Request() req,
    @Body() body: { code: string; optionId?: string }
  ) {
    return this.paymentService.applyPromoCode(req.user.id, body.code, body.optionId || 'parcours_harmonie');
  }
}
