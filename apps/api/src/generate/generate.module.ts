import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadsModule } from "../uploads/uploads.module";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { KieClient } from "./kie.client";
import { Change2ProClient } from "./change2pro.client";
import { AinbClient } from "./ainb.client";

@Module({
  imports: [AuthModule, CreditsModule, PrismaModule, UploadsModule],
  controllers: [GenerateController],
  providers: [GenerateService, KieClient, Change2ProClient, AinbClient]
})
export class GenerateModule {}
