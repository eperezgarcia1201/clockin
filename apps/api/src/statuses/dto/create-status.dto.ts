import {
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStatusDto {
  @IsString()
  @MaxLength(50)
  label!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isIn?: boolean;
}
