import { IsIn, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class UploadPolicyDto {
  @IsIn(["avatar", "prompt-image", "feedback", "work"])
  scene!: "avatar" | "prompt-image" | "feedback" | "work";

  @IsString()
  @MinLength(1)
  filename!: string;

  @IsString()
  @MinLength(1)
  contentType!: string;

  @IsOptional()
  @IsInt()
  sizeBytes?: number;
}

export class UploadCompleteDto {
  @IsString()
  @MinLength(1)
  ossKey!: string;

  @IsOptional()
  @IsString()
  publicUrl?: string;
}
