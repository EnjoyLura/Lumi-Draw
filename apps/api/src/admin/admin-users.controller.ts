import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminUserQueryDto } from "./admin.query";
import { AdminService } from "./admin.service";

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
}
