import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "./config.service";
import { FeatureFlagsService } from "./feature-flags.service";

@ApiTags("config")
@Controller("config")
export class ConfigController {
  constructor(
    private readonly config: ConfigService,
    private readonly flags: FeatureFlagsService
  ) {}

  /** 运营开关。开关要能立刻生效，所以明确禁用缓存。 */
  @Get("features")
  @Header("Cache-Control", "no-store")
  async features() {
    return { membershipEnabled: await this.flags.membershipEnabled() };
  }

  @Get("banners")
  banners() {
    return this.config.getBanners();
  }

  @Get("gameplays")
  gameplays() {
    return this.config.getGameplays();
  }

  @Get("styles")
  styles() {
    return this.config.getStyles();
  }

  @Get("categories")
  categories() {
    return this.config.getCategories();
  }

  @Get("hot-searches")
  hotSearches() {
    return this.config.getHotSearches();
  }

  @Get("models")
  models() {
    return this.config.getModels();
  }

  @Get("qualities")
  qualities() {
    return this.config.getQualities();
  }

  @Get("ratios")
  ratios() {
    return this.config.getRatios();
  }

  @Get("changelog")
  changelog() {
    return this.config.getChangelog();
  }

  @Get("announcements")
  announcements() {
    return this.config.getAnnouncements();
  }

  @Get("agreements/:type")
  agreement(@Param("type") type: string) {
    return this.config.getAgreement(type);
  }
}
