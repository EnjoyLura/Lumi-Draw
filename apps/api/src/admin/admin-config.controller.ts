import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminConfigService } from "./admin-config.service";

@ApiTags("admin-config")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin")
export class AdminConfigController {
  constructor(private readonly config: AdminConfigService) {}

  @Get("banners")
  banners() {
    return this.config.banners();
  }

  @Get("gameplays")
  gameplays() {
    return this.config.gameplays();
  }

  @Get("styles")
  styles() {
    return this.config.styles();
  }

  @Get("categories")
  categories() {
    return this.config.categories();
  }

  @Get("hot-searches")
  hotSearches() {
    return this.config.hotSearches();
  }

  @Get("models")
  models() {
    return this.config.models();
  }

  @Get("qualities")
  qualities() {
    return this.config.qualities();
  }

  @Get("ratios")
  ratios() {
    return this.config.ratios();
  }

  @Get("recharge-tiers")
  rechargeTiers() {
    return this.config.rechargeTiers();
  }

  @Get("member-plans")
  memberPlans() {
    return this.config.memberPlans();
  }

  @Get("versions")
  versions() {
    return this.config.versions();
  }

  @Get("agreements")
  agreements() {
    return this.config.agreements();
  }

  @Get("settings")
  settings() {
    return this.config.settings();
  }

  @Get("review-settings")
  reviewSettings() {
    return this.config.reviewSettings();
  }
}
