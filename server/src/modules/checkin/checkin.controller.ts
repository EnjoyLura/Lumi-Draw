import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: any) { return this.checkinService.getStatus(user.userId); }

  @Post()
  @UseGuards(JwtAuthGuard)
  doCheckin(@CurrentUser() user: any) { return this.checkinService.doCheckin(user.userId); }

  @Get('milestones')
  getMilestones() { return this.checkinService.getMilestones(); }
}
