import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UploadCompleteDto, UploadPolicyDto } from "./uploads.dto";
import { UploadsService } from "./uploads.service";

@ApiTags("uploads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("policy")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  policy(@CurrentUser() user: { id: number }, @Body() dto: UploadPolicyDto) {
    return this.uploads.policy(user.id, dto.scene, dto.filename, dto.contentType, dto.sizeBytes);
  }

  @Post("complete")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  complete(@CurrentUser() user: { id: number }, @Body() dto: UploadCompleteDto) {
    return this.uploads.complete(user.id, dto.ossKey, dto.uploadToken);
  }
}
