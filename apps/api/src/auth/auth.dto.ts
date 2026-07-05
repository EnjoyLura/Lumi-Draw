import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class WechatLoginDto {
  @IsString()
  @MinLength(1)
  code!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsIn(["unknown", "male", "female"])
  gender?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^1[3-9]\d{9}$/)
  phone?: string;
}
