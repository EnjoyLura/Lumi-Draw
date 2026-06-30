import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { Work, Like, Favorite, User } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Work, Like, Favorite, User])],
  controllers: [WorkController],
  providers: [WorkService],
  exports: [WorkService],
})
export class WorkModule {}
