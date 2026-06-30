import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { Generation, User, AiModel, Transaction } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Generation, User, AiModel, Transaction])],
  controllers: [GenerateController],
  providers: [GenerateService],
  exports: [GenerateService],
})
export class GenerateModule {}
