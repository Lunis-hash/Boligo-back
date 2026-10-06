import { PartnerRegistrationType, PartnerType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Candidature publique au Programme Partenaires BOLIGO. */
export class ApplyPartnerDto {
  @IsEnum(PartnerType)
  type: PartnerType;

  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  company?: string;

  @Transform(trim)
  @IsString()
  @Length(2, 80)
  country: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  audience?: string;

  @Transform(trim)
  @IsString()
  @Length(20, 2000)
  message: string;

  @IsOptional()
  @IsIn(['fr', 'en'])
  language?: 'fr' | 'en';

  /** Entreprise du partenaire : obligatoire, vérifiée auprès des registres publics. */
  @IsEnum(PartnerRegistrationType)
  registrationType: PartnerRegistrationType;

  @Transform(trim)
  @IsString()
  @Length(3, 40)
  registrationNumber: string;

  /** Accord explicite pour être recontacté au sujet de la candidature. */
  @IsBoolean()
  @Equals(true, {
    message: 'Le consentement est nécessaire pour traiter la candidature.',
  })
  consent: boolean;
}
