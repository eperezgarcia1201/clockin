import { IsString, MaxLength } from 'class-validator';

export class CreateOfficeDto {
  @IsString()
  @MaxLength(80)
  name!: string;
}
