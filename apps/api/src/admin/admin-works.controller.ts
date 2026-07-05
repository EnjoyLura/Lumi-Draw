import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminWorkQueryDto } from "./admin.query";
import { AdminService } from "./admin.service";

@ApiTags("admin-works")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin/works")
export class AdminWorksController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list(@Query() query: AdminWorkQueryDto) {
    return this.admin.works(query);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.admin.workDetail(id);
  }
}
