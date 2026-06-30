import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { Banner, Gameplay, AiModel, Style, Tag, HotSearch } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, Gameplay, AiModel, Style, Tag, HotSearch])],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
