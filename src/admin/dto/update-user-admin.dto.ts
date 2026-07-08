import { AccountStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsInt()
  creditBalance?: number;
}
