import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UseGuards } from "@nestjs/common";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminEngineService } from "./admin-engine.service";
import {
  AdminEngineDryRunDto,
  AdminEngineDuplicateDto,
  AdminEngineMoveDto,
  AdminEnginePlatformBodyDto
} from "./admin-engine.dto";

@ApiTags("admin-engine")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin/engine")
export class AdminEngineController {
  constructor(private readonly engine: AdminEngineService) {}

  @Get("meta") meta() { return this.engine.meta(); }
  @Get("platforms") list() { return this.engine.list(); }
  @Get("health") health() { return this.engine.health(); }

  @Post("platforms") create(@Body() b: AdminEnginePlatformBodyDto) { return this.engine.create(b as unknown as Record<string, unknown>); }
  @Get("platforms/:id") detail(@Param("id") id: string) { return this.engine.detail(id); }
  @Patch("platforms/:id") update(@Param("id") id: string, @Body() b: AdminEnginePlatformBodyDto) { return this.engine.update(id, b as unknown as Record<string, unknown>); }
  @Delete("platforms/:id") remove(@Param("id") id: string) { return this.engine.remove(id); }
  @Post("platforms/:id/duplicate") duplicate(@Param("id") id: string, @Body() b: AdminEngineDuplicateDto) { return this.engine.duplicate(id, b as unknown as Record<string, unknown>); }
  @Patch("platforms/:id/order") move(@Param("id") id: string, @Body() b: AdminEngineMoveDto) { return this.engine.move(id, b.direction); }
  @Post("platforms/:id/test") test(@Param("id") id: string) { return this.engine.test(id); }

  /** 全链路试运行：真实调用上游并走完 FC 转存/直存 → OSS → CDN，返回试运行任务 ID。 */
  @Post("platforms/:id/dry-run") dryRun(@Param("id") id: string, @Body() b: AdminEngineDryRunDto) { return this.engine.startDryRun(id, { prompt: b.prompt, mode: b.mode }); }
  @Get("dry-runs/:jobId") dryRunStatus(@Param("jobId") jobId: string) { return this.engine.dryRunStatus(jobId); }
}
