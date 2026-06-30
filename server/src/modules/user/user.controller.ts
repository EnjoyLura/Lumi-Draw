import { Controller, Get, Put, Post, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.userService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Body() body: any) {
    return this.userService.updateProfile(user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('credits')
  getCredits(@CurrentUser() user: any) {
    return this.userService.getCredits(user.userId);
  }

  @Get('follows')
  @UseGuards(JwtAuthGuard)
  getFollowList(@CurrentUser() user: any, @Query('type') type: string) {
    return this.userService.getFollowList(user.userId, type || 'following');
  }

  @Post(':userId/follow')
  @UseGuards(JwtAuthGuard)
  follow(@CurrentUser() user: any, @Param('userId') targetId: string) {
    return this.userService.follow(user.userId, targetId);
  }

  @Delete(':userId/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@CurrentUser() user: any, @Param('userId') targetId: string) {
    return this.userService.unfollow(user.userId, targetId);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}
