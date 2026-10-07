import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SensitiveConsentDto {
  @ApiProperty({
    example: true,
    description:
      'true : le membre accepte les questions sensibles ; false : il les refuse ou retire son accord',
  })
  @IsBoolean()
  accepted: boolean;
}
