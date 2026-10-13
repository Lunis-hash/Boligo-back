import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Une seule réponse, enregistrée aussitôt (retour à une question précédente). */
export class SaveAnswerDto {
  @ApiProperty({ example: 'V82_M0_03' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  questionId: string;

  @ApiProperty({ example: 'B,C', description: 'Clé(s) de réponse, ou « 25-40 »' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  value: string;

  @ApiProperty({ required: false, description: 'Précision écrite (« une autre langue »)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  freeText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  moduleName?: string;
}
