import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard') getDashboard() { return this.adminService.getDashboard(); }
  @Get('users') getUsers(@Query() q: any) { return this.adminService.getUsers(q); }
  @Put('users/:id/status') updateUserStatus(@Param('id') id: string, @Body() b: any) { return this.adminService.updateUserStatus(id, b.status); }
  @Get('works') getWorks(@Query() q: any) { return this.adminService.getWorks(q); }
  @Put('works/:id/status') updateWorkStatus(@Param('id') id: string, @Body() b: any) { return this.adminService.updateWorkStatus(id, b.status); }
  @Put('works/:id/featured') toggleFeatured(@Param('id') id: string) { return this.adminService.toggleFeatured(id); }

  @Get('reports') getReports() { return this.adminService.getReports(); }
  @Put('reports/:id') handleReport(@Param('id') id: string, @Body() b: any) { return this.adminService.handleReport(id, b.status); }
  @Get('feedbacks') getFeedbacks() { return this.adminService.getFeedbacks(); }
  @Put('feedbacks/:id') handleFeedback(@Param('id') id: string, @Body() b: any) { return this.adminService.handleFeedback(id, b.status); }

  // Banner CRUD
  @Get('banners') getBanners() { return this.adminService.getBanners(); }
  @Post('banners') createBanner(@Body() b: any) { return this.adminService.createBanner(b); }
  @Put('banners/:id') updateBanner(@Param('id') id: string, @Body() b: any) { return this.adminService.updateBanner(id, b); }
  @Delete('banners/:id') deleteBanner(@Param('id') id: string) { return this.adminService.deleteBanner(id); }

  // Gameplay CRUD
  @Get('gameplays') getGameplays() { return this.adminService.getGameplays(); }
  @Post('gameplays') createGameplay(@Body() b: any) { return this.adminService.createGameplay(b); }
  @Put('gameplays/:id') updateGameplay(@Param('id') id: string, @Body() b: any) { return this.adminService.updateGameplay(id, b); }
  @Delete('gameplays/:id') deleteGameplay(@Param('id') id: string) { return this.adminService.deleteGameplay(id); }

  // Model CRUD
  @Get('models') getModels() { return this.adminService.getModels(); }
  @Post('models') createModel(@Body() b: any) { return this.adminService.createModel(b); }
  @Put('models/:id') updateModel(@Param('id') id: string, @Body() b: any) { return this.adminService.updateModel(id, b); }
  @Delete('models/:id') deleteModel(@Param('id') id: string) { return this.adminService.deleteModel(id); }

  // Style CRUD
  @Get('styles') getStyles() { return this.adminService.getStyles(); }
  @Post('styles') createStyle(@Body() b: any) { return this.adminService.createStyle(b); }
  @Delete('styles/:id') deleteStyle(@Param('id') id: string) { return this.adminService.deleteStyle(id); }

  // HotSearch CRUD
  @Get('hot-searches') getHotSearches() { return this.adminService.getHotSearches(); }
  @Post('hot-searches') createHotSearch(@Body() b: any) { return this.adminService.createHotSearch(b); }
  @Put('hot-searches/:id') updateHotSearch(@Param('id') id: string, @Body() b: any) { return this.adminService.updateHotSearch(id, b); }
  @Delete('hot-searches/:id') deleteHotSearch(@Param('id') id: string) { return this.adminService.deleteHotSearch(id); }

  // Finance config
  @Get('recharge-tiers') getRechargeTiers() { return this.adminService.getRechargeTiers(); }
  @Post('recharge-tiers') createRechargeTier(@Body() b: any) { return this.adminService.createRechargeTier(b); }
  @Put('recharge-tiers/:id') updateRechargeTier(@Param('id') id: string, @Body() b: any) { return this.adminService.updateRechargeTier(id, b); }
  @Get('member-plans') getMemberPlans() { return this.adminService.getMemberPlans(); }
  @Put('member-plans/:id') updateMemberPlan(@Param('id') id: string, @Body() b: any) { return this.adminService.updateMemberPlan(id, b); }
  @Get('checkin-milestones') getCheckinMilestones() { return this.adminService.getCheckinMilestones(); }
  @Put('checkin-milestones/:id') updateCheckinMilestone(@Param('id') id: string, @Body() b: any) { return this.adminService.updateCheckinMilestone(id, b); }
  @Get('transactions') getAllTransactions(@Query() q: any) { return this.adminService.getAllTransactions(q); }

  // Announcements
  @Get('announcements') getAnnouncements() { return this.adminService.getAnnouncements(); }
  @Post('announcements') createAnnouncement(@Body() b: any) { return this.adminService.createAnnouncement(b); }
  @Put('announcements/:id') updateAnnouncement(@Param('id') id: string, @Body() b: any) { return this.adminService.updateAnnouncement(id, b); }
  @Delete('announcements/:id') deleteAnnouncement(@Param('id') id: string) { return this.adminService.deleteAnnouncement(id); }
}
