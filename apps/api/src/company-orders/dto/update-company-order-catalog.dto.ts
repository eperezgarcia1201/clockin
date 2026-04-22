import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CompanyOrderCatalogItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameEs!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameEn!: string;

  @IsOptional()
  @IsIn(['each', 'lb'])
  comparisonUnit?: 'each' | 'lb';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  caseSizeLb?: number;
}

export class CompanyOrderCatalogSupplierDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  supplierName!: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => CompanyOrderCatalogItemDto)
  items!: CompanyOrderCatalogItemDto[];
}

export class UpdateCompanyOrderCatalogDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CompanyOrderCatalogSupplierDto)
  suppliers!: CompanyOrderCatalogSupplierDto[];
}
