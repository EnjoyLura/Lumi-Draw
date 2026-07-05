import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

export class FeedQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["recommend", "latest"])
  tab: "recommend" | "latest" = "recommend";
}

export class PlazaQueryDto extends PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsIn(["hot", "latest"])
  sort: "hot" | "latest" = "hot";
}

export class SearchQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
