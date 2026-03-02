import { IsString, MaxLength } from 'class-validator';

export class CreateLiquorKindDto {
  @IsString()
  @MaxLength(80)
  name!: string;
}
