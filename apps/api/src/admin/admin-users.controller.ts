import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminUserQueryDto } from "./admin.query";
import { AdminService } from "./admin.service";

type Body_ = Record<string, unknown>;

@ApiTags("admin-users")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list(@Query() query: AdminUserQueryDto) {
    return this.admin.users(query);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.admin.userDetail(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.admin.updateUser(id, b);
  }

  @Post(":id/ban")
  ban(@Param("id", ParseIntPipe) id: number) {
    return this.admin.banUser(id);
  }

  @Post(":id/unban")
  unban(@Param("id", ParseIntPipe) id: number) {
    return this.admin.unbanUser(id);
  }

  @Post(":id/credits/adjust")
  adjust(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.admin.adjustCredits(id, b.amount, b.reason);
  }

  @Post(":id/member/gift")
  giftMember(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.admin.giftMember(id, b.planId, b.reason);
  }
}
