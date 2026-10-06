import {
  PartnerRegistrationType,
  PartnerStatus,
  PartnerVerification,
} from '@prisma/client';
import {
  IsIn,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
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

  /** Correction du numéro d'entreprise : la vérification repart de zéro. */
  @IsOptional()
  @IsEnum(PartnerRegistrationType)
  registrationType?: PartnerRegistrationType;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  registrationNumber?: string;
}

/** Décision manuelle d'un administrateur, avec la source consultée. */
export class ManualVerificationDto {
  @IsIn([PartnerVerification.VERIFIE, PartnerVerification.REJETE])
  status: PartnerVerification;

  @IsString()
  @Length(10, 500)
  note: string;
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
