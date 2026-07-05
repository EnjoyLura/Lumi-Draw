import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AdminUserQueryDto } from "./admin.query";
import { AdminService } from "./admin.service";

@ApiTags("admin-users")
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
