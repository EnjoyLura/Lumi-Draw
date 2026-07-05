import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CheckinService } from "./checkin.service";

@ApiTags("checkin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("checkin")
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Post()
  doCheckin(@CurrentUser() user: { id: number }) {
    return this.checkin.checkin(user.id);
  }

  @Get("status")
  status(@CurrentUser() user: { id: number }) {
    return this.checkin.status(user.id);
  }
}
