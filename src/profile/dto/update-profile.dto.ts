import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  // ── Champs Profile ──
  @ApiProperty({ example: 'https://photo.url', required: false })
  @IsOptional()
  @IsString()
  mainPhoto?: string;

  @ApiProperty({ example: 'Je suis passionné par...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Abidjan', required: false })
  @IsOptional()
  @IsString()
  displayedCity?: string;

  @ApiProperty({ example: 'Développeur', required: false })
  @IsOptional()
  @IsString()
  profession?: string;

  // ── Champs User ──
  @ApiProperty({ example: 'Sam', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Kouassi', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+2250700000001', required: false })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'Abidjan', required: false })
  @IsOptional()
  @IsString()
  city?: string;
}
