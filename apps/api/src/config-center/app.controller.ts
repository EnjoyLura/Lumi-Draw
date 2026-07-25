import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "./config.service";

@ApiTags("app")
@Controller("app")
export class AppBootstrapController {
  constructor(private readonly config: ConfigService) {}

  @Get("bootstrap")
  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  bootstrap() {
    return this.config.getBootstrap();
  }
}
