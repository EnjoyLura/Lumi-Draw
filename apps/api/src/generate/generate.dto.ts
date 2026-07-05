import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

export class CreateGenerateJobDto {
  @IsIn(["text-to-image", "image-to-image"])
  mode: "text-to-image" | "image-to-image" = "text-to-image";

  @IsString()
  @MinLength(1)
  modelId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  inputImageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gameplayId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string;

  @IsString()
  @MinLength(1)
  ratio!: string;

  @IsString()
  @MinLength(1)
  quality!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  count = 1;
}

export class GenerateJobListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["queued", "running", "succeeded", "partial_failed", "failed", "cancelled"])
  status?: string;
}

export class PublishGenerateResultDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ReversePromptDto {
  @IsString()
  @MinLength(1)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hint?: string;
}
