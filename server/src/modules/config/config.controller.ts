import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('banners') getBanners() { return this.configService.getBanners(); }
  @Get('gameplays') getGameplays() { return this.configService.getGameplays(); }
  @Get('models') getModels() { return this.configService.getModels(); }
  @Get('styles') getStyles() { return this.configService.getStyles(); }
  @Get('tags') getTags() { return this.configService.getTags(); }
  @Get('hot-searches') getHotSearches() { return this.configService.getHotSearches(); }
}
