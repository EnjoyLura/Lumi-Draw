import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "./config.service";

@ApiTags("config")
@Controller("config")
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

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
