import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  officeId?: string;
}
