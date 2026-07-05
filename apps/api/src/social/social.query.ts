import { IsIn, IsOptional } from "class-validator";
import { PageQueryDto } from "../common/dto/pagination";

export class SocialPageQueryDto extends PageQueryDto {}

export class FollowListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["following", "followers"])
  type: "following" | "followers" = "following";
}
