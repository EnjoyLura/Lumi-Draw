import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { Checkin, CheckinMilestone, User, Transaction } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Checkin, CheckinMilestone, User, Transaction])],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
