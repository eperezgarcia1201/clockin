import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateCompanyOrderInPersonItemDto {
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
  purchasedWeightLb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  companyUnitPrice?: number;
}

export class UpdateCompanyOrderInPersonDto {
  @IsISO8601()
  weekStart!: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsArray()
  @ArrayMaxSize(4000)
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyOrderInPersonItemDto)
  items!: UpdateCompanyOrderInPersonItemDto[];
}
