import { IsArray, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateFeedbackDto {
  @IsIn(["bug", "experience", "suggestion"])
  type!: string;

  @IsString()
  @MaxLength(500)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  wechat?: string;
}
