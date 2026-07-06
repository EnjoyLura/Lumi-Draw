import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminWorkQueryDto } from "./admin.query";
import { AdminService } from "./admin.service";

type Body_ = Record<string, unknown>;

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

  @Get("summary")
  summary() {
    return this.admin.worksSummary();
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.admin.workDetail(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.admin.updateWork(id, b);
  }

  @Post(":id/feature")
  feature(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.admin.featureWork(id, b.featured ?? true);
  }

  @Post(":id/recommend")
  recommend(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.admin.recommendWork(id, b.recommend ?? true);
  }

  @Post(":id/offline")
  offline(@Param("id", ParseIntPipe) id: number) {
    return this.admin.offlineWork(id);
  }

  @Post(":id/restore")
  restore(@Param("id", ParseIntPipe) id: number) {
    return this.admin.restoreWork(id);
  }

  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteWork(id);
  }
}
