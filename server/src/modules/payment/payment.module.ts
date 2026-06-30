import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RechargeTier, MemberPlan, Transaction, User } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([RechargeTier, MemberPlan, Transaction, User])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
