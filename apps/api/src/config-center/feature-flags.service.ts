import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export const DEFAULT_MEMBERSHIP_CONFIG = { enabled: true };

/**
 * 运营开关：值存在 app_settings，后台改完即时生效，读取失败一律按「开放」处理，
 * 避免配置行损坏时把功能整体关掉。
 */
@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async membershipEnabled() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: "membershipConfig" } });
    if (!row) return DEFAULT_MEMBERSHIP_CONFIG.enabled;
    try {
      return JSON.parse(row.value)?.enabled !== false;
    } catch {
      return DEFAULT_MEMBERSHIP_CONFIG.enabled;
    }
  }
}
