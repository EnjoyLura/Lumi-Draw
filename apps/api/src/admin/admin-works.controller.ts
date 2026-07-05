import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AdminWorkQueryDto } from "./admin.query";
import { AdminService } from "./admin.service";

@ApiTags("admin-works")
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
