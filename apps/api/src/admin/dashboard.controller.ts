import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { DashboardService } from "./dashboard.service";

@ApiTags("admin-dashboard")
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller("admin/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  summary() {
    return this.dashboard.summary();
  }

  @Get("finance-summary")
  financeSummary() {
    return this.dashboard.financeSummary();
  }

  @Get("generation-stats")
  generationStats() {
    return this.dashboard.generationStats();
  }

  @Get("trends")
  trends(@Query("range") range?: string) {
    return this.dashboard.trends(range);
  }

  @Get("detail")
  detail(@Query("metric") metric?: string, @Query("range") range?: string) {
    return this.dashboard.detail(metric, range);
  }
}
