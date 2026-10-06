import { DiscountType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Valeur de la réduction : pourcentage (1 à 100), montant fixe en centimes,
 * ou rien pour un code « gratuit ». La cohérence est vérifiée par le service.
 */
export class UpdatePromoCodeDto {
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  discountValue?: number;

  /** Nombre maximal d'utilisations ; null = illimité. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxUses?: number | null;

  /** Date de fin (ISO) ; null = sans fin. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class CreatePromoCodeDto extends UpdatePromoCodeDto {
  @IsString()
  @Matches(/^\s*[A-Za-z0-9]{3,30}\s*$/, {
    message: 'Code : 3 à 30 lettres ou chiffres, sans espace ni accent.',
  })
  code: string;

  @IsEnum(DiscountType)
  declare discountType: DiscountType;
}
