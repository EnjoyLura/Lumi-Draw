import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { PrismaModule } from "../prisma/prisma.module";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";

@Module({
  imports: [AuthModule, CreditsModule, PrismaModule],
  controllers: [GenerateController],
  providers: [GenerateService]
})
export class GenerateModule {}
