import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { MANAGER_FEATURE_KEYS } from "../../tenancy/manager-features";

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsBoolean()
  isManager?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(MANAGER_FEATURE_KEYS, { each: true })
  managerPermissions?: string[];

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isTimeAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isReports?: boolean;

  @IsOptional()
  @IsBoolean()
  isServer?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}
