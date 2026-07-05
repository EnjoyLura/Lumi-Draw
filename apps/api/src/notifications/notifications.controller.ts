import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("summary")
  summary(@CurrentUser() user: { id: number }) {
    return this.notifications.summary(user.id);
  }

  @Get(":type")
  list(@CurrentUser() user: { id: number }, @Param("type") type: string) {
    return this.notifications.list(user.id, type);
  }

  @Patch(":type/read")
  markRead(@CurrentUser() user: { id: number }, @Param("type") type: string) {
    return this.notifications.markRead(user.id, type);
  }
}
