import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PageQueryDto } from "../common/dto/pagination";
import { CreditsService } from "./credits.service";

class RecordsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["earn", "spend", "all"])
  type: "earn" | "spend" | "all" = "all";
}

@ApiTags("credits")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("credits")
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get("balance")
  balance(@CurrentUser() user: { id: number }) {
    return this.credits.getBalance(user.id);
  }

  @Get("records")
  records(@CurrentUser() user: { id: number }, @Query() query: RecordsQueryDto) {
    return this.credits.getRecords(user.id, query.type, query.page, query.pageSize);
  }
}
