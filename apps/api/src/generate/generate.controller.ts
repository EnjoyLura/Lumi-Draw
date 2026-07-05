import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateGenerateJobDto, GenerateJobListQueryDto } from "./generate.dto";
import { GenerateService } from "./generate.service";

@ApiTags("generate")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("generate")
export class GenerateController {
  constructor(private readonly generate: GenerateService) {}

  @Post("jobs")
  createJob(@CurrentUser() user: { id: number }, @Body() dto: CreateGenerateJobDto) {
    return this.generate.createJob(user.id, dto);
  }

  @Get("jobs")
  listJobs(@CurrentUser() user: { id: number }, @Query() query: GenerateJobListQueryDto) {
    return this.generate.listJobs(user.id, query.status, query.page, query.pageSize);
  }

  @Get("jobs/:id")
  getJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.generate.getJob(user.id, id);
  }

  @Post("jobs/:id/cancel")
  cancelJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.generate.cancelJob(user.id, id);
  }

  @Post("jobs/:id/retry")
  retryJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.generate.retryJob(user.id, id);
  }
}
