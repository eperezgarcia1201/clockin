import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterEmployeeDeviceDto {
  @IsString()
  @MaxLength(120)
  employeeId!: string;

  @IsString()
  @MaxLength(400)
  expoPushToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeZone?: string;

  @IsOptional()
  @IsBoolean()
  notifyLateClockInReminders?: boolean;
}
