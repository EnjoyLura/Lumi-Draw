import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  User, Work, Generation, Transaction, Feedback, Report, Announcement,
  Banner, Gameplay, AiModel, Style, HotSearch, RechargeTier, MemberPlan, CheckinMilestone,
} from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([
    User, Work, Generation, Transaction, Feedback, Report, Announcement,
    Banner, Gameplay, AiModel, Style, HotSearch, RechargeTier, MemberPlan, CheckinMilestone,
  ])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
