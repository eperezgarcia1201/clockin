import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const isoDateRegex =
  /^\d{4}-\d{2}-\d{2}(?:[tT]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?)?$/;

export class AnalyzeLiquorInvoiceDto {
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
  @MaxLength(30000000)
  imageDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30000000)
  imageBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
