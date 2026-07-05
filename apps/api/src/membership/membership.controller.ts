import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MembershipService } from "./membership.service";

@ApiTags("membership")
@Controller("membership")
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get("plans")
  plans() {
    return this.membership.plans();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("status")
  status(@CurrentUser() user: { id: number }) {
    return this.membership.status(user.id);
  }
}
