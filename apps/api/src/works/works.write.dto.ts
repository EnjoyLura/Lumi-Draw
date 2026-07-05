import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

export class CreateWorkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string;

  @IsString()
  @MinLength(1)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  ratio?: string;

  @IsOptional()
  @IsString()
  quality?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateWorkDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  style?: string;
}

export class MyGalleryQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["draft", "pending", "published", "rejected", "offline"])
  status?: string;
}

export class DeleteWorkQueryDto {
  @IsOptional()
  @IsIn(["delete", "offline", "draft"])
  action?: "delete" | "offline" | "draft";
}
