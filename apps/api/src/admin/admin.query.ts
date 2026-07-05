import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === "true" || value === "1" ? true : value === false || value === "false" || value === "0" ? false : undefined;

export class AdminUserQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(["normal", "banned"])
  status?: "normal" | "banned";

  @IsOptional()
  @IsString()
  member?: string;
}

export class AdminWorkQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(["draft", "pending", "published", "rejected", "offline"])
  status?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  recommend?: boolean;
}
