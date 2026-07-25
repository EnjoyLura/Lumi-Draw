import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

export class FeedQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["recommend", "latest"])
  tab: "recommend" | "latest" = "recommend";
}

export class PlazaQueryDto extends PageQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  featuredOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  categoryIds?: string;

  @IsOptional()
  @IsString()
  modelIds?: string;

  @IsOptional()
  @IsString()
  ratios?: string;

  @IsOptional()
  @IsString()
  qualities?: string;

  @IsOptional()
  @IsIn(["hot", "latest"])
  sort: "hot" | "latest" = "hot";
}

export class SearchQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(["gallery", "mine"])
  scope?: "gallery" | "mine";
}
