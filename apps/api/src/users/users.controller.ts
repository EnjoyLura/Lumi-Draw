import { Body, Controller, Delete, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UpdateMeDto } from "../auth/auth.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: { id: number }) {
    return this.users.me(user.id);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: { id: number }, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Delete("me")
  cancelAccount(@CurrentUser() user: { id: number }) {
    return this.users.cancelAccount(user.id);
  }
}
