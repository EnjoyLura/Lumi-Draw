import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  getMessages(@CurrentUser() user: any, @Query('type') type: string) {
    if (type) return this.notifService.getByType(user.userId, type);
    return this.notifService.getCategories(user.userId);
  }

  @Put('messages/:id/read')
  @UseGuards(JwtAuthGuard)
  markRead(@Param('id') id: string) { return this.notifService.markRead(id); }

  @Get('invite/info')
  @UseGuards(JwtAuthGuard)
  getInviteInfo(@CurrentUser() user: any) { return this.notifService.getInviteInfo(user.userId); }
}
