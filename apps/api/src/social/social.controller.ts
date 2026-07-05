import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateReportDto } from "./social.dto";
import { FollowListQueryDto, SocialPageQueryDto } from "./social.query";
import { SocialService } from "./social.service";

@ApiTags("social")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("social")
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get("works/:id/state")
  workState(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.workState(user.id, id);
  }

  @Post("works/:id/view")
  viewWork(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.viewWork(user.id, id);
  }

  @Post("works/:id/like")
  toggleLike(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.toggleInteraction(user.id, id, "like");
  }

  @Post("works/:id/favorite")
  toggleFavorite(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.toggleInteraction(user.id, id, "favorite");
  }

  @Post("works/:id/remake")
  recordRemake(@Param("id", ParseIntPipe) id: number) {
    return this.social.recordRemake(id);
  }

  @Post("works/:id/report")
  reportWork(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number, @Body() dto: CreateReportDto) {
    return this.social.reportWork(user.id, id, dto.reason, dto.description);
  }

  @Get("history")
  history(@CurrentUser() user: { id: number }, @Query() query: SocialPageQueryDto) {
    return this.social.history(user.id, query.page, query.pageSize);
  }

  @Delete("history")
  clearHistory(@CurrentUser() user: { id: number }) {
    return this.social.clearHistory(user.id);
  }

  @Get("users/:id/profile")
  profile(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.profile(user.id, id);
  }

  @Get("users/:id/works")
  userWorks(@Param("id", ParseIntPipe) id: number, @Query() query: SocialPageQueryDto) {
    return this.social.userWorks(id, query.page, query.pageSize);
  }

  @Post("users/:id/follow")
  follow(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.follow(user.id, id);
  }

  @Delete("users/:id/follow")
  unfollow(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number) {
    return this.social.unfollow(user.id, id);
  }

  @Get("follows")
  follows(@CurrentUser() user: { id: number }, @Query() query: FollowListQueryDto) {
    return this.social.follows(user.id, query.type, query.page, query.pageSize);
  }
}
