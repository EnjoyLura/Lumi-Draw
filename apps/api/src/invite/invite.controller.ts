import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InviteService } from "./invite.service";

class BindInviteDto {
  @IsString()
  @MinLength(1)
  code!: string;
}

@ApiTags("invite")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("invite")
export class InviteController {
  constructor(private readonly invite: InviteService) {}

  @Get("summary")
  summary(@CurrentUser() user: { id: number }) {
    return this.invite.summary(user.id);
  }

  @Post("bind")
  bind(@CurrentUser() user: { id: number }, @Body() dto: BindInviteDto) {
    return this.invite.bind(user.id, dto.code);
  }
}
