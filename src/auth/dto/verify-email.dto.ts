import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  email: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @IsNotEmpty({ message: 'Le code OTP est obligatoire' })
  @Length(4, 6, { message: 'Le code doit contenir 4 à 6 caractères' })
  code: string;
}
