import { PunchType } from '@prisma/client';
import { IsEnum, IsISO8601, IsString, IsOptional } from 'class-validator';

export class ManualEmployeePunchDto {
  @IsString()
  employeeId!: string;

  @IsEnum(PunchType)
  type!: PunchType;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
