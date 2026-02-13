import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class TenantFeaturesDto {
  @IsOptional()
  @IsBoolean()
  requirePin?: boolean;

  @IsOptional()
  @IsBoolean()
  reportsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowManualTimeEdits?: boolean;
}

export class CreateTenantAccountDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authOrgId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantFeaturesDto)
  features?: TenantFeaturesDto;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  roundingMinutes?: number;
}
