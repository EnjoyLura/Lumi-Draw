import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { PrismaModule } from "../prisma/prisma.module";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { KieClient } from "./kie.client";

@Module({
  imports: [AuthModule, CreditsModule, PrismaModule],
  controllers: [GenerateController],
  providers: [GenerateService, KieClient]
})
export class GenerateModule {}
