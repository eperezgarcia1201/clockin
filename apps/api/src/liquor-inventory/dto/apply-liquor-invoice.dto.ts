import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const isoDateRegex =
  /^\d{4}-\d{2}-\d{2}(?:[tT]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?)?$/;

export class ApplyLiquorInvoiceRowDto {
  @IsOptional()
  @IsString()
  existingItemId?: string;

  @IsOptional()
  @IsBoolean()
  apply?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  company?: string;

  @IsString()
  @MaxLength(140)
  liquorName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  upc?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  ml?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number;
}

export class ApplyLiquorInvoiceDto {
  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(isoDateRegex)
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  createPurchaseMovements?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApplyLiquorInvoiceRowDto)
  rows!: ApplyLiquorInvoiceRowDto[];
}
