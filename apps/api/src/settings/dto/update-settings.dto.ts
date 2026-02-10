import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateSettingsDto {
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
}
