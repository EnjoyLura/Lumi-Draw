import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateGenerateJobDto, GenerateJobListQueryDto, PublishGenerateResultDto, ReversePromptDto } from "./generate.dto";
import { GenerateService } from "./generate.service";

@ApiTags("generate")
@Controller("generate")
export class GenerateController {
  constructor(private readonly generate: GenerateService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("jobs")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  createJob(@CurrentUser() user: { id: number }, @Body() dto: CreateGenerateJobDto) {
    return this.generate.createJob(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("jobs")
  listJobs(@CurrentUser() user: { id: number }, @Query() query: GenerateJobListQueryDto) {
    return this.generate.listJobs(user.id, query.status, query.page, query.pageSize);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("jobs/:id")
  getJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.generate.getJob(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("jobs/:id/cancel")
  cancelJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.generate.cancelJob(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("jobs/:id/retry")
  retryJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.generate.retryJob(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("results/:id/publish")
  publishResult(@CurrentUser() user: { id: number }, @Param("id") id: string, @Body() dto: PublishGenerateResultDto) {
    return this.generate.publishResult(user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reverse-prompt")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  reversePrompt(@CurrentUser() user: { id: number }, @Body() dto: ReversePromptDto) {
    return this.generate.reversePrompt(user.id, dto);
  }

  @Post("callback")
  handleCallback(@Body() body: Record<string, unknown>, @Query("secret") secret?: string) {
    return this.generate.handleCallback(body, secret);
  }
}
