import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class StartLabRunDto {
  @ApiProperty({
    example: 3,
    description:
      'Nombre de couples types à évaluer (1 à 27, environ 1 € chacun)',
  })
  @IsInt()
  @Min(1)
  @Max(27)
  couples: number;
}
