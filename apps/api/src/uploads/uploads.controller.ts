import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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
  policy(@Body() dto: UploadPolicyDto) {
    return this.uploads.policy(dto.scene, dto.filename, dto.contentType);
  }

  @Post("complete")
  complete(@Body() dto: UploadCompleteDto) {
    return this.uploads.complete(dto.ossKey, dto.publicUrl);
  }
}
