import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { WorkService } from './work.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Get('home')
  getHomeWorks(@Query('tab') tab: string, @Query('page') page: number) {
    return this.workService.getHomeWorks(tab || 'recommend', +(page || 1));
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyWorks(@CurrentUser() user: any) {
    return this.workService.getMyWorks(user.userId);
  }

  @Get('search')
  searchWorks(@Query('keyword') keyword: string) {
    return this.workService.searchWorks(keyword || '');
  }

  @Get(':id')
  getWorkDetail(@Param('id') id: string) {
    return this.workService.getWorkDetail(id);
  }

  @Get()
  getPlazaWorks(@Query() query: any) {
    return this.workService.getPlazaWorks(query);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  likeWork(@CurrentUser() user: any, @Param('id') workId: string) {
    return this.workService.likeWork(user.userId, workId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  favoriteWork(@CurrentUser() user: any, @Param('id') workId: string) {
    return this.workService.favoriteWork(user.userId, workId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  publishWork(@CurrentUser() user: any, @Body() body: any) {
    return this.workService.publishWork(user.userId, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteWork(@CurrentUser() user: any, @Param('id') workId: string) {
    return this.workService.deleteWork(user.userId, workId);
  }
}
