import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tenant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  host?: string;
}
