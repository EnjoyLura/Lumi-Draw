import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { ModerationService } from "./moderation.service";

type Body_ = Record<string, unknown>;

function toInt(v: string | undefined, def: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

@ApiTags("admin-moderation")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin")
export class ModerationController {
  constructor(private readonly mod: ModerationService) {}

  // 审核
  @Get("reviews")
  reviews(@Query("status") status?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.mod.reviews(status, toInt(page, 1), toInt(pageSize, 20));
  }
  @Post("reviews/:id/approve")
  approve(@Param("id", ParseIntPipe) id: number) {
    return this.mod.approveReview(id);
  }
  @Post("reviews/:id/reject")
  reject(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.mod.rejectReview(id, b.reason);
  }

  // 举报
  @Get("reports")
  reports(@Query("status") status?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.mod.reports(status, toInt(page, 1), toInt(pageSize, 20));
  }
  @Post("reports/:id/resolve")
  resolveReport(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.mod.resolveReport(id, b);
  }

  // 反馈
  @Get("feedback")
  feedback(@Query("status") status?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.mod.feedbackList(status, toInt(page, 1), toInt(pageSize, 20));
  }
  @Get("feedback/:id")
  feedbackDetail(@Param("id", ParseIntPipe) id: number) {
    return this.mod.feedbackDetail(id);
  }
  @Patch("feedback/:id")
  updateFeedback(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.mod.updateFeedback(id, b);
  }
  @Post("feedback/:id/reply")
  replyFeedback(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.mod.replyFeedback(id, b.reply);
  }

  // 公告
  @Get("announcements")
  announcements() {
    return this.mod.announcements();
  }
  @Post("announcements")
  createAnnouncement(@Body() b: Body_) {
    return this.mod.createAnnouncement(b);
  }
  @Patch("announcements/:id")
  updateAnnouncement(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.mod.updateAnnouncement(id, b);
  }
  @Delete("announcements/:id")
  deleteAnnouncement(@Param("id", ParseIntPipe) id: number) {
    return this.mod.deleteAnnouncement(id);
  }

  // 推送
  @Get("pushes")
  pushes() {
    return this.mod.pushes();
  }
  @Post("pushes")
  createPush(@Body() b: Body_) {
    return this.mod.createPush(b);
  }
  @Patch("pushes/:id")
  updatePush(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) {
    return this.mod.updatePush(id, b);
  }
  @Post("pushes/:id/send")
  sendPush(@Param("id", ParseIntPipe) id: number) {
    return this.mod.sendPush(id);
  }
  @Post("pushes/:id/revoke")
  revokePush(@Param("id", ParseIntPipe) id: number) {
    return this.mod.revokePush(id);
  }

  // 敏感词
  @Get("sensitive-words")
  sensitiveWords() {
    return this.mod.sensitiveWords();
  }
  @Post("sensitive-words")
  addSensitiveWords(@Body() b: Body_) {
    return this.mod.addSensitiveWords(b);
  }
  @Delete("sensitive-words/:id")
  deleteSensitiveWord(@Param("id", ParseIntPipe) id: number) {
    return this.mod.deleteSensitiveWord(id);
  }

  // 交易记录
  @Get("transactions")
  transactions(@Query("type") type?: string, @Query("userId") userId?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    const uid = userId ? Number.parseInt(userId, 10) : undefined;
    return this.mod.transactions(type, Number.isFinite(uid) ? uid : undefined, toInt(page, 1), toInt(pageSize, 20));
  }

  // 财务/积分配置
  @Get("checkin-config") getCheckinConfig() { return this.mod.getCheckinConfig(); }
  @Put("checkin-config") putCheckinConfig(@Body() b: Body_) { return this.mod.putCheckinConfig(b); }
  @Get("invite-config") getInviteConfig() { return this.mod.getInviteConfig(); }
  @Put("invite-config") putInviteConfig(@Body() b: Body_) { return this.mod.putInviteConfig(b); }
  @Get("credits/config") getCreditsConfig() { return this.mod.getCreditsConfig(); }
  @Put("credits/config") putCreditsConfig(@Body() b: Body_) { return this.mod.putCreditsConfig(b); }
}
