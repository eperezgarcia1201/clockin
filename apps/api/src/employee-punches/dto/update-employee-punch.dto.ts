import { PunchType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeePunchDto {
  @IsOptional()
  @IsEnum(PunchType)
  type?: PunchType;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
