import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateRechargeOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  wxCode?: string;
}

export class CreateMembershipOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  wxCode?: string;
}
