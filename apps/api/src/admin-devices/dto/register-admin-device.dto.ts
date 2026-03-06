import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminDeviceNotificationPreferencesDto } from './admin-device-notification-preferences.dto';

export class RegisterAdminDeviceDto extends AdminDeviceNotificationPreferencesDto {
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
}
