import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

export class CreateEngineJobDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  clientRequestId!: string;

  @IsIn(["text-to-image", "image-to-image"])
  operation: "text-to-image" | "image-to-image" = "text-to-image";

  @IsString()
  @MinLength(1)
  modelId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @Type(() => Number)
  @IsInt()
  qualityId!: number;

  @Type(() => Number)
  @IsInt()
  ratioId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  styleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gameplayId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  count = 1;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  inputImageUrls?: string[];
}

export class EngineJobListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  status?: string;
}

export class PublishEngineAssetDto {
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

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class EngineReversePromptDto {
  @IsString()
  @MinLength(1)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hint?: string;
}
