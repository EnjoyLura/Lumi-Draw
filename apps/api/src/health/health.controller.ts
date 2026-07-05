import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "lumi-draw-api",
      env: this.config.get<string>("app.nodeEnv"),
      time: new Date().toISOString()
    };
  }
}
