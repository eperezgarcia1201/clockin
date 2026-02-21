import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AnalyzeBottleScanDto {
  @IsString()
  itemId!: string;

  @IsString()
  officeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  containerKey?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}(?:[tT]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?)?$/)
  measuredAt?: string;

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

