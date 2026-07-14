import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class UploadPolicyDto {
  @IsIn(["avatar", "prompt-image", "feedback", "work"])
  scene!: "avatar" | "prompt-image" | "feedback" | "work";

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  filename!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}

export class UploadCompleteDto {
  @IsString()
  @MinLength(1)
  ossKey!: string;

  @IsString()
  @MinLength(1)
  uploadToken!: string;
}
