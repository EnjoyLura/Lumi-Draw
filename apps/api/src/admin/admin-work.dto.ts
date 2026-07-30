import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class AdminUpdateWorkDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  style?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  likes?: number;

  @IsOptional()
  @IsIn(["draft", "pending", "published", "rejected", "offline"])
  status?: string;
}

export class AdminCreateWorkDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsString()
  @MinLength(1)
  imageUrl!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  prompt!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  ratio!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  quality!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  modelId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  style?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  recommend?: boolean;
}
