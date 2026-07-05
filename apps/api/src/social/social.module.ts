import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [PrismaModule],
  controllers: [SocialController],
  providers: [SocialService]
})
export class SocialModule {}
