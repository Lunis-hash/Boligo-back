import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({ example: 'google' })
  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'facebook';

  @ApiProperty({ example: 'ya29.a0AfH6SM...' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  profile?: {
    email: string;
    firstName: string;
    lastName?: string;
    id?: string;
  };
}
