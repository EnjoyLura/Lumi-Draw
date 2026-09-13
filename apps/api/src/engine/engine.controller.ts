import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CreateEngineJobDto,
  EngineJobListQueryDto,
  EngineReversePromptDto,
  PublishEngineAssetDto
} from "./engine.dto";
import { EngineCatalogService } from "./engine-catalog.service";
import { EngineService } from "./engine.service";

@ApiTags("engine")
@Controller("engine")
export class EngineController {
  constructor(
    private readonly engine: EngineService,
    private readonly catalog: EngineCatalogService
  ) {}

  @Get("catalog")
  getCatalog() {
    return this.catalog.getCatalog();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("jobs")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  createJob(@CurrentUser() user: { id: number }, @Body() dto: CreateEngineJobDto) {
    return this.engine.createJob(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("jobs")
  listJobs(@CurrentUser() user: { id: number }, @Query() query: EngineJobListQueryDto) {
    return this.engine.listJobs(user.id, query.status, query.page, query.pageSize);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("jobs/by-request/:clientRequestId")
  findJobByClientRequest(@CurrentUser() user: { id: number }, @Param("clientRequestId") clientRequestId: string) {
    return this.engine.findJobByClientRequest(user.id, clientRequestId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("jobs/:id")
  getJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.engine.getJob(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("jobs/:id/cancel")
  cancelJob(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.engine.cancelJob(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("jobs/:id/retry-storage")
  retryStorage(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.engine.retryStorage(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("assets/:id/publish")
  publishAsset(@CurrentUser() user: { id: number }, @Param("id") id: string, @Body() dto: PublishEngineAssetDto) {
    return this.engine.publishAsset(user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reverse-prompt")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  reversePrompt(@CurrentUser() user: { id: number }, @Body() dto: EngineReversePromptDto) {
    return this.engine.reversePrompt(user.id, dto);
  }

  @Post("callbacks/kie")
  handleKieCallback(@Body() body: Record<string, unknown>, @Query("secret") secret?: string) {
    return this.engine.handleKieCallback(body, secret);
  }

  @Post("callbacks/transfer")
  completeImageTransfer(@Headers("x-lumi-transfer-token") token: string | undefined, @Body() body: Record<string, unknown>) {
    return this.engine.handleTransferCallback(token, {
      jobId: typeof body.jobId === "string" ? body.jobId : undefined,
      resultId: typeof body.resultId === "string" ? body.resultId : undefined,
      objectKey: typeof body.objectKey === "string" ? body.objectKey : undefined,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
      transferHost: typeof body.transferHost === "string" ? body.transferHost : undefined,
      transferFallbackUsed: typeof body.transferFallbackUsed === "boolean" ? body.transferFallbackUsed : undefined,
      transferTtfbMs: typeof body.transferTtfbMs === "number" ? body.transferTtfbMs : undefined,
      transferDownloadMs: typeof body.transferDownloadMs === "number" ? body.transferDownloadMs : undefined,
      transferUploadMs: typeof body.transferUploadMs === "number" ? body.transferUploadMs : undefined,
      error: typeof body.error === "string" ? body.error : undefined
    });
  }

  @Post("callbacks/generation")
  completeImageGeneration(@Headers("x-lumi-transfer-token") token: string | undefined, @Body() body: Record<string, unknown>) {
    const outputs = Array.isArray(body.outputs) ? body.outputs.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const value = item as Record<string, unknown>;
      return [{
        objectKey: typeof value.objectKey === "string" ? value.objectKey : undefined,
        sizeBytes: typeof value.sizeBytes === "number" ? value.sizeBytes : undefined,
        transferHost: typeof value.transferHost === "string" ? value.transferHost : undefined,
        transferFallbackUsed: typeof value.transferFallbackUsed === "boolean" ? value.transferFallbackUsed : undefined,
        transferTtfbMs: typeof value.transferTtfbMs === "number" ? value.transferTtfbMs : undefined,
        transferDownloadMs: typeof value.transferDownloadMs === "number" ? value.transferDownloadMs : undefined,
        transferUploadMs: typeof value.transferUploadMs === "number" ? value.transferUploadMs : undefined
      }];
    }) : undefined;
    return this.engine.handleGenerationCallback(token, {
      jobId: typeof body.jobId === "string" ? body.jobId : undefined,
      outputs,
      error: typeof body.error === "string" ? body.error : undefined,
      progress: typeof body.progress === "number" ? body.progress : undefined,
      stageText: typeof body.stageText === "string" ? body.stageText : undefined
    });
  }
}
