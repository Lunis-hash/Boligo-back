import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/** Création de la feuille de paiement (anciens champs gardés pour l'app). */
export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  optionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  packId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string;

  /** Demande de commencement avant la fin du délai de rétractation. */
  @IsOptional()
  @IsBoolean()
  earlyStartConsent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  consentVersion?: string;
}

/** « Se rétracter du contrat ici ». */
export class WithdrawalRequestDto {
  @IsString()
  @Matches(/^pi_[A-Za-z0-9_]+$/)
  paymentRef!: string;
}

/** Décision de l'équipe sur une demande de rétractation. */
export class WithdrawalDecisionDto {
  @IsIn(['refund', 'refuse'])
  action!: 'refund' | 'refuse';

  /** Montant remboursé en centimes ; absent : tout ce qui reste. */
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
