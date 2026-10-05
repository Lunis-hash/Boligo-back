import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { MEETING_SCOPES } from '../../interview/meeting-scope';

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
  @MinLength(2)
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

  // ── Préférence de rencontre (réponse M0_Q02 de l'entretien) ──
  @ApiProperty({ example: 'national', enum: MEETING_SCOPES, required: false })
  @IsOptional()
  @IsIn(MEETING_SCOPES)
  meetingScope?: (typeof MEETING_SCOPES)[number];
}
