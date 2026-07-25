import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { WechatContentSafetyService } from "./wechat-content-safety.service";

@Controller("content-safety/wechat/callback")
export class ContentSafetyController {
  constructor(private readonly safety: WechatContentSafetyService) {}

  @Get()
  verify(
    @Query("signature") signature: string,
    @Query("timestamp") timestamp: string,
    @Query("nonce") nonce: string,
    @Query("echostr") echo: string,
    @Res() response: Response
  ) {
    if (!this.safety.verifyCallbackSignature(signature, timestamp, nonce)) {
      return response.status(403).send("invalid signature");
    }
    return response.type("text/plain").send(echo || "success");
  }

  @Post()
  async callback(
    @Query("signature") signature: string,
    @Query("timestamp") timestamp: string,
    @Query("nonce") nonce: string,
    @Body() body: unknown,
    @Res() response: Response
  ) {
    if (!this.safety.verifyCallbackSignature(signature, timestamp, nonce)) {
      return response.status(403).send("invalid signature");
    }
    await this.safety.handleMediaCallback(body);
    return response.type("text/plain").send("success");
  }
}
