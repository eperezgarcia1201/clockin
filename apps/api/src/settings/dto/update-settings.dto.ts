import {
  IsBoolean,
  IsInt,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyLegalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  companyAddressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  companyAddressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  companyCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  companyState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  companyPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  companyCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  companyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  companyTaxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  roundingMinutes?: number;

  @IsOptional()
  @IsBoolean()
  requirePin?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ipRestrictions?: string;

  @IsOptional()
  @IsBoolean()
  reportsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowManualTimeEdits?: boolean;

  @IsOptional()
  @IsBoolean()
  multiLocationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  lateClockInWorkflowEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  lateClockInGraceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  lateClockInReminderIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  lateClockInReminderMax?: number;

  @IsOptional()
  @IsBoolean()
  autoClockInAfterLateReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  autoClockInOnGeofence?: boolean;

  @IsOptional()
  @IsBoolean()
  noBreakAlertsEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  noBreakAlertHours?: number;

  @IsOptional()
  @IsBoolean()
  dailySalesReminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1438)
  dailySalesReminderFirstMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1439)
  dailySalesReminderFinalMinutes?: number;

  @IsOptional()
  @IsBoolean()
  ownerDailyReportEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  ownerDailyReportSendMinutes?: number;
}
