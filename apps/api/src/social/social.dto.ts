import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
