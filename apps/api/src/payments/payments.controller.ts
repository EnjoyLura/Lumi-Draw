import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateMembershipOrderDto, CreateRechargeOrderDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";
import type { WechatNotifyHeaders } from "./wechat-pay.client";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("recharge/orders")
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  createRechargeOrder(@CurrentUser() user: { id: number }, @Body() dto: CreateRechargeOrderDto) {
    return this.payments.createRechargeOrder(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("membership/orders")
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
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
  wechatNotify(
    @Body() body: unknown,
    @Headers("wechatpay-timestamp") timestamp: string | undefined,
    @Headers("wechatpay-nonce") nonce: string | undefined,
    @Headers("wechatpay-signature") signature: string | undefined,
    @Headers("wechatpay-serial") serial: string | undefined,
    @Req() req: RawBodyRequest<Request>
  ) {
    const headers: WechatNotifyHeaders = { timestamp, nonce, signature, serial };
    return this.payments.handleWechatNotify(body, headers, req.rawBody?.toString("utf8") ?? "");
  }
}
