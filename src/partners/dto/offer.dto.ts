import { OfferPlacement } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
