import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertLiquorCountDto {
  @IsString()
  itemId!: string;

  @IsString()
  officeId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  countDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  barQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  bodegaQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
