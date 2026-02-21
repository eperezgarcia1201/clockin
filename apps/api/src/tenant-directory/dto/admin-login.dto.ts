import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TenantAdminLoginDto {
  @IsString()
  @MaxLength(200)
  tenant!: string;

  @IsString()
  @MaxLength(120)
  username!: string;

  @IsString()
  @MaxLength(120)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  host?: string;
}
