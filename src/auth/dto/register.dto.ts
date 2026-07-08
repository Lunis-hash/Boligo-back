import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

enum GenderValue {
  H = 'H',
  F = 'F',
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

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ enum: GenderValue, example: GenderValue.H })
  @IsEnum(GenderValue)
  gender: GenderValue;

  @ApiProperty({ example: 'Abidjan', required: false })
  @IsString()
  city?: string;

  @ApiProperty({ example: '+2250102030405', required: false })
  @IsString()
  telephone?: string;
}
