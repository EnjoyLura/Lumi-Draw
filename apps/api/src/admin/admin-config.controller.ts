import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminConfigService } from "./admin-config.service";

type Body_ = Record<string, unknown>;
type UploadedImage = { buffer: Buffer; originalname: string; mimetype: string; size: number };

@ApiTags("admin-config")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin")
export class AdminConfigController {
  constructor(private readonly config: AdminConfigService) {}

  // ---------- 读 ----------
  @Get("banners") banners() { return this.config.banners(); }
  @Post("banners/upload-image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  uploadBannerImage(@UploadedFile() file?: UploadedImage) { return this.config.uploadBannerImage(file); }
  @Get("gameplays") gameplays() { return this.config.gameplays(); }
  @Get("styles") styles() { return this.config.styles(); }
  @Get("categories") categories() { return this.config.categories(); }
  @Get("hot-searches") hotSearches() { return this.config.hotSearches(); }
  @Get("models") models() { return this.config.models(); }
  @Get("qualities") qualities() { return this.config.qualities(); }
  @Get("ratios") ratios() { return this.config.ratios(); }
  @Get("recharge-tiers") rechargeTiers() { return this.config.rechargeTiers(); }
  @Get("member-plans") memberPlans() { return this.config.memberPlans(); }
  @Get("versions") versions() { return this.config.versions(); }
  @Get("agreements") agreements() { return this.config.agreements(); }
  @Get("settings") settings() { return this.config.settings(); }
  @Get("review-settings") reviewSettings() { return this.config.reviewSettings(); }

  // ---------- banners ----------
  @Post("banners") createBanner(@Body() b: Body_) { return this.config.createBanner(b); }
  @Patch("banners/:id") updateBanner(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateBanner(id, b); }
  @Delete("banners/:id") deleteBanner(@Param("id", ParseIntPipe) id: number) { return this.config.deleteBanner(id); }

  // ---------- gameplays ----------
  @Post("gameplays") createGameplay(@Body() b: Body_) { return this.config.createGameplay(b); }
  @Patch("gameplays/:id") updateGameplay(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateGameplay(id, b); }
  @Delete("gameplays/:id") deleteGameplay(@Param("id", ParseIntPipe) id: number) { return this.config.deleteGameplay(id); }

  // ---------- styles ----------
  @Post("styles") createStyle(@Body() b: Body_) { return this.config.createStyle(b); }
  @Patch("styles/:id") updateStyle(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateStyle(id, b); }
  @Delete("styles/:id") deleteStyle(@Param("id", ParseIntPipe) id: number) { return this.config.deleteStyle(id); }

  // ---------- categories ----------
  @Post("categories") createCategory(@Body() b: Body_) { return this.config.createCategory(b); }
  @Patch("categories/:id") updateCategory(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateCategory(id, b); }
  @Delete("categories/:id") deleteCategory(@Param("id", ParseIntPipe) id: number) { return this.config.deleteCategory(id); }

  // ---------- hot searches ----------
  @Post("hot-searches") createHotSearch(@Body() b: Body_) { return this.config.createHotSearch(b); }
  @Patch("hot-searches/:id") updateHotSearch(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateHotSearch(id, b); }
  @Delete("hot-searches/:id") deleteHotSearch(@Param("id", ParseIntPipe) id: number) { return this.config.deleteHotSearch(id); }

  // ---------- models (string id) ----------
  @Post("models") createModel(@Body() b: Body_) { return this.config.createModel(b); }
  @Patch("models/:id") updateModel(@Param("id") id: string, @Body() b: Body_) { return this.config.updateModel(id, b); }
  @Delete("models/:id") deleteModel(@Param("id") id: string) { return this.config.deleteModel(id); }

  // ---------- qualities ----------
  @Post("qualities") createQuality(@Body() b: Body_) { return this.config.createQuality(b); }
  @Patch("qualities/:id") updateQuality(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateQuality(id, b); }
  @Delete("qualities/:id") deleteQuality(@Param("id", ParseIntPipe) id: number) { return this.config.deleteQuality(id); }

  // ---------- ratios ----------
  @Post("ratios") createRatio(@Body() b: Body_) { return this.config.createRatio(b); }
  @Patch("ratios/:id") updateRatio(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateRatio(id, b); }
  @Delete("ratios/:id") deleteRatio(@Param("id", ParseIntPipe) id: number) { return this.config.deleteRatio(id); }

  // ---------- recharge tiers ----------
  @Post("recharge-tiers") createRecharge(@Body() b: Body_) { return this.config.createRecharge(b); }
  @Patch("recharge-tiers/:id") updateRecharge(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateRecharge(id, b); }
  @Delete("recharge-tiers/:id") deleteRecharge(@Param("id", ParseIntPipe) id: number) { return this.config.deleteRecharge(id); }

  // ---------- member plans ----------
  @Post("member-plans") createMemberPlan(@Body() b: Body_) { return this.config.createMemberPlan(b); }
  @Patch("member-plans/:id") updateMemberPlan(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateMemberPlan(id, b); }
  @Delete("member-plans/:id") deleteMemberPlan(@Param("id", ParseIntPipe) id: number) { return this.config.deleteMemberPlan(id); }

  // ---------- versions ----------
  @Post("versions") createVersion(@Body() b: Body_) { return this.config.createVersion(b); }
  @Patch("versions/:id") updateVersion(@Param("id", ParseIntPipe) id: number, @Body() b: Body_) { return this.config.updateVersion(id, b); }
  @Delete("versions/:id") deleteVersion(@Param("id", ParseIntPipe) id: number) { return this.config.deleteVersion(id); }

  // ---------- agreements / settings ----------
  @Put("agreements/:type") upsertAgreement(@Param("type") type: string, @Body() b: Body_) { return this.config.upsertAgreement(type, b); }
  @Put("settings") putSettings(@Body() b: Body_) { return this.config.putSettings(b); }
  @Put("review-settings") putReviewSettings(@Body() b: Body_) { return this.config.putReviewSettings(b); }
}
