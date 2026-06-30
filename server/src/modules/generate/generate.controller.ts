import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { GenerateService } from './generate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('generate')
export class GenerateController {
  constructor(private readonly genService: GenerateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: any, @Body() body: any) { return this.genService.create(user.userId, body); }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getStatus(@Param('id') id: string) { return this.genService.getStatus(id); }

  @Post('callback')
  callback(@Body() body: any) { return this.genService.handleCallback(body.taskId || body.task_id, body); }

  @Post('reverse-prompt')
  @UseGuards(JwtAuthGuard)
  reversePrompt(@Body() body: { image_url: string }) { return this.genService.reversePrompt(body.image_url); }
}
