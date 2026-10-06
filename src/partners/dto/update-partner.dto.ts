import { PartnerStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePartnerDto {
  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** Commission en % du prix payé, sur chaque Parcours acheté avec le code. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  commissionRate?: number;
}

export class CreatePartnerCodeDto {
  /** Code souhaité (lettres et chiffres) ; généré à partir du nom s'il est absent. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  /** Réduction offerte aux membres qui utilisent le code, en %. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  discountPercent?: number;
}
