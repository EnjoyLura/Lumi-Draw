import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "./config.service";

@ApiTags("app")
@Controller("app")
export class AppBootstrapController {
  constructor(private readonly config: ConfigService) {}

  @Get("bootstrap")
  bootstrap() {
    return this.config.getBootstrap();
  }
}
