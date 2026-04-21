import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCompanyOrderInPersonDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart!: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsString()
  @MaxLength(120)
  supplierName!: string;

  @IsString()
  @MaxLength(200)
  nameEs!: string;

  @IsString()
  @MaxLength(200)
  nameEn!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasedQuantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}
