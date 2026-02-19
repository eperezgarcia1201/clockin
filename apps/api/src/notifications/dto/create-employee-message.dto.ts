import { IsString, MaxLength } from 'class-validator';

export class CreateEmployeeMessageDto {
  @IsString()
  employeeId!: string;

  @IsString()
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;
}
