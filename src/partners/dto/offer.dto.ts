import { OfferPlacement } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Offre d'une marque, saisie par l'équipe (tous les champs facultatifs en mise à jour). */
export class OfferInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  perk?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  perkCode?: string | null;

  @IsOptional()
  @IsEnum(OfferPlacement)
  placement?: OfferPlacement;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}

/** Affichages réellement montrés à l'écran (une fois par session). */
export class OfferImpressionsDto {
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  ids: string[];
}

/**
 * Ventes confirmées par la marque pour un mois (d'après son relevé ou celui
 * de son réseau d'affiliation) et rémunération due à BOLIGO, en euros.
 */
export class OfferConversionDto {
  /** Mois concerné, « AAAA-MM ». */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month!: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  conversions!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  revenue!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;
}
