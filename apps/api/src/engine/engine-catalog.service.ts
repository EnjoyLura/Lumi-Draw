import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Gameplay, GenerationProvider, Style } from "@prisma/client";
import { decryptProviderApiKey } from "../common/provider-secret";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { readProviderConfig } from "./provider-config";

export const ENGINE_MAX_OUTPUTS = 4;
export const ENGINE_MAX_REFERENCE_IMAGES = 5;

@Injectable()
export class EngineCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly uploads: UploadsService
  ) {}

  /** 服务器驱动的目录：客户端不再硬编码任何模型/分辨率/比例枚举。 */
  async getCatalog() {
    const [models, qualities, ratios, styles, gameplays, providers] = await Promise.all([
      this.prisma.modelConfig.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
      this.prisma.qualityConfig.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
      this.prisma.ratioConfig.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
      this.prisma.style.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
      this.prisma.gameplay.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
      this.prisma.generationProvider.findMany({ where: { enabled: true } })
    ]);

    const qualityViews = qualities.map((quality) => ({
      id: quality.id,
      label: quality.label,
      multiplier: quality.multiplier
    }));
    const ratioViews = ratios.map((ratio) => ({
      id: ratio.id,
      label: ratio.label,
      description: ratio.description
    }));

    const modelViews = models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      badge: model.badge,
      tags: model.tags,
      costCredits: model.costCredits,
      supportsTextToImage: model.supportsTextToImage,
      supportsImageToImage: model.supportsImageToImage,
      maxOutputs: ENGINE_MAX_OUTPUTS,
      qualities: qualityViews.map((quality) => ({
        ...quality,
        costPerImage: Math.ceil(model.costCredits * quality.multiplier)
      })),
      ratios: ratioViews
    }));

    const updatedAts = [
      ...models.map((model) => model.updatedAt),
      ...qualities.map((quality) => quality.updatedAt),
      ...ratios.map((ratio) => ratio.updatedAt),
      ...styles.map((style) => style.updatedAt),
      ...gameplays.map((gameplay) => gameplay.updatedAt)
    ].map((value) => value.getTime());
    const revision = updatedAts.length ? new Date(Math.max(...updatedAts)).toISOString() : new Date(0).toISOString();

    return {
      schemaVersion: 3,
      revision,
      models: modelViews,
      qualities: qualityViews,
      ratios: ratioViews,
      styles: styles.map((style) => this.toStyleView(style)),
      gameplays: gameplays.map((gameplay) => this.toGameplayView(gameplay)),
      limits: {
        maxOutputs: ENGINE_MAX_OUTPUTS,
        maxReferenceImages: ENGINE_MAX_REFERENCE_IMAGES
      },
      reversePrompt: {
        enabled: providers.some((provider) => this.isVisionProvider(provider)),
        costCredits: 2
      }
    };
  }

  private toStyleView(style: Style) {
    return {
      id: style.id,
      name: style.name,
      prompt: style.prompt,
      imageUrl: style.imageUrl ? this.uploads.readUrl(style.imageUrl, "public") : "",
      uses: style.uses
    };
  }

  private toGameplayView(gameplay: Gameplay) {
    return {
      id: gameplay.id,
      name: gameplay.name,
      description: gameplay.description,
      uses: gameplay.uses,
      hot: gameplay.hot,
      imageUrl: gameplay.imageUrl ? this.uploads.readUrl(gameplay.imageUrl, "public") : ""
    };
  }

  private isVisionProvider(provider: GenerationProvider) {
    const config = readProviderConfig(provider);
    if (config.adapter !== "gemini") return false;
    const key = provider.apiKeyEncrypted
      ? decryptProviderApiKey(provider.apiKeyEncrypted, this.config.get<string>("app.generationProviderEncryptionKey") || "")
      : process.env[provider.apiKeyEnv] || "";
    return Boolean(key);
  }
}
