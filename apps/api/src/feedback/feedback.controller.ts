import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateFeedbackDto } from "./feedback.dto";
import { FeedbackService } from "./feedback.service";

@ApiTags("feedback")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(user.id, dto);
  }
}
