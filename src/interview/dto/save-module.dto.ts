import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, Max, Min } from 'class-validator';

export class SaveModuleDto {
  @ApiProperty({ example: 0, description: 'Module number (0-10)' })
  @IsInt()
  @Min(0)
  @Max(10)
  moduleNumber: number;

  @ApiProperty({ example: 'Identification & Culture' })
  @IsNotEmpty()
  moduleName: string;

  @ApiProperty({
    example: { Q01: 'A', Q02: 'B' },
    description: 'Key-value pairs of questions and answers'
  })
  @IsObject()
  answers: Record<string, any>;
}
