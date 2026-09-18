import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { ADAPTER_KINDS } from "../engine/adapters/adapter-metadata";

/** 平台创建/更新共用的请求体；config 深度校验在 AdminEngineService.buildConfig 内做。 */
export class AdminEnginePlatformBodyDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,40}$/i, { message: "平台标识只允许字母、数字和连字符，长度 2-41" })
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  groupName?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(ADAPTER_KINDS)
  adapter?: string;

  /** null 表示清除已保存密钥（class-validator 对 null 跳过校验）。 */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  apiKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  apiKeyEnv?: string;

  @IsOptional()
  @IsBoolean()
  clearApiKey?: boolean;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class AdminEngineDuplicateDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,40}$/i, { message: "平台标识只允许字母、数字和连字符，长度 2-41" })
  id!: string;

  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  groupName?: string;

  @IsOptional()
  @IsBoolean()
  copyApiKey?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  sort?: number;
}

export class AdminEngineMoveDto {
  @IsIn(["up", "down"])
  direction!: "up" | "down";
}

export class AdminEngineDryRunDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;

  @IsOptional()
  @IsIn(["text-to-image", "image-to-image"])
  mode?: "text-to-image" | "image-to-image";
}
