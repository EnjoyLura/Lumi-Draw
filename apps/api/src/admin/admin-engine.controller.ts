import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { UseGuards } from "@nestjs/common";
import { AdminEngineService } from "./admin-engine.service";

type Body_ = Record<string, unknown>;

@ApiTags("admin-engine")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin/engine")
export class AdminEngineController {
  constructor(private readonly engine: AdminEngineService) {}

  @Get("meta") meta() { return this.engine.meta(); }
  @Get("platforms") list() { return this.engine.list(); }
  @Get("health") health() { return this.engine.health(); }

  @Post("platforms") create(@Body() b: Body_) { return this.engine.create(b); }
  @Get("platforms/:id") detail(@Param("id") id: string) { return this.engine.detail(id); }
  @Patch("platforms/:id") update(@Param("id") id: string, @Body() b: Body_) { return this.engine.update(id, b); }
  @Delete("platforms/:id") remove(@Param("id") id: string) { return this.engine.remove(id); }
  @Post("platforms/:id/duplicate") duplicate(@Param("id") id: string, @Body() b: Body_) { return this.engine.duplicate(id, b); }
  @Patch("platforms/:id/order") move(@Param("id") id: string, @Body() b: Body_) { return this.engine.move(id, String(b.direction || "")); }
  @Post("platforms/:id/test") test(@Param("id") id: string) { return this.engine.test(id); }
}
