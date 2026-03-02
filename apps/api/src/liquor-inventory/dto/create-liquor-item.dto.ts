import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLiquorItemDto {
  @IsString()
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  upc?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sizeMl?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  unitLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  supplierName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
