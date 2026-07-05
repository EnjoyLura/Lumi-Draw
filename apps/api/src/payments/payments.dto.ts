import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, Min } from "class-validator";

export class CreateRechargeOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;
}

export class CreateMembershipOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId!: number;
}
