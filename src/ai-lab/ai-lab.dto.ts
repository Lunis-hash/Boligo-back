import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class StartLabRunDto {
  @ApiProperty({
    example: 3,
    description:
      'Nombre de couples types à évaluer (1 à 10, environ 0,5 à 1 € chacun)',
  })
  @IsInt()
  @Min(1)
  @Max(10)
  couples: number;
}
