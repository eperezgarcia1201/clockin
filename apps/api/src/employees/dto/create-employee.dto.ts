import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Matches,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(80)
  fullName!: string;

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
  isAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isTimeAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isReports?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}
