import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateMembershipOrderDto, CreateRechargeOrderDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("recharge/orders")
  createRechargeOrder(@CurrentUser() user: { id: number }, @Body() dto: CreateRechargeOrderDto) {
    return this.payments.createRechargeOrder(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("membership/orders")
  createMembershipOrder(@CurrentUser() user: { id: number }, @Body() dto: CreateMembershipOrderDto) {
    return this.payments.createMembershipOrder(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  getOrder(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.payments.getOrder(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":id/mock-complete")
  mockComplete(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.payments.mockComplete(user.id, id);
  }

  @Post("wechat/notify")
  wechatNotify(@Body() body: unknown) {
    return this.payments.handleWechatNotify(body);
  }
}
