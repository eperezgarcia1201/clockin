import { IsBoolean, IsOptional } from 'class-validator';

export class AdminDeviceNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  notifyPunchActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyNoBreakAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyLateClockInReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyScheduleOverrides?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyTipSummaries?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyDailySalesReminders?: boolean;
}
