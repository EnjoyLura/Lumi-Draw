import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('recharge/tiers') getTiers() { return this.paymentService.getRechargeTiers(); }
  @Get('membership/plans') getPlans() { return this.paymentService.getMemberPlans(); }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(@CurrentUser() user: any, @Query('type') type: string) {
    return this.paymentService.getTransactions(user.userId, type || 'all');
  }

  @Post('recharge')
  @UseGuards(JwtAuthGuard)
  recharge(@CurrentUser() user: any, @Body() body: { tier_id: string }) {
    return this.paymentService.recharge(user.userId, body.tier_id);
  }
}
