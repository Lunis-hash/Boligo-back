import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum GenderValue {
  H = 'H',
  F = 'F',
  AUTRE = 'AUTRE',
}

export class RegisterDto {
  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password12!@', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Dupont', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ enum: GenderValue, example: GenderValue.H })
  @IsEnum(GenderValue)
  gender: GenderValue | 'H' | 'F' | 'AUTRE';

  @ApiProperty({ example: 'Abidjan', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '+2250102030405', required: false })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({ example: 'Développeur', required: false })
  @IsString()
  @IsOptional()
  job?: string;

  @ApiProperty({ example: 'Développeur', required: false })
  @IsString()
  @IsOptional()
  profession?: string;

  @ApiProperty({ example: 'local', required: false })
  @IsString()
  @IsOptional()
  meetingScope?: string;

  @ApiProperty({
    example: true,
    description: "Acceptation expresse des CGU et de la politique de confidentialité (doit valoir true).",
  })
  @Equals(true, {
    message: "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité pour créer un compte.",
  })
  acceptTerms: boolean;

  @ApiProperty({ example: '2026-10-02', required: false, description: 'Version des textes légaux acceptée.' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  termsVersion?: string;
}
