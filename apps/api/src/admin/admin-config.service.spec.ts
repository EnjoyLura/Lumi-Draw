import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GenerationProvider } from "@prisma/client";
import { decryptProviderApiKey } from "../generate/provider-secret";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { AdminConfigService } from "./admin-config.service";

const MASTER_KEY = "test-generation-provider-encryption-key-123456";

function service() {
  const config = { get: (name: string) => name === "app.generationProviderEncryptionKey" ? MASTER_KEY : undefined } as ConfigService;
  return new AdminConfigService({} as PrismaService, {} as UploadsService, config);
}

function serviceWithPrisma(prisma: unknown) {
  const config = { get: (name: string) => name === "app.generationProviderEncryptionKey" ? MASTER_KEY : undefined } as ConfigService;
  return new AdminConfigService(prisma as PrismaService, {} as UploadsService, config);
}

function normalize(body: Record<string, unknown>, creating: boolean) {
  return (service() as unknown as {
    normalizeGenerationProvider: (value: Record<string, unknown>, isCreating: boolean) => {
      provider: Record<string, unknown>;
      modelIds: string[];
    };
  }).normalizeGenerationProvider(body, creating);
}

test("encrypts a plaintext administrator API key before persistence", () => {
  const result = normalize({
    id: "custom-provider",
    name: "Custom provider",
    adapter: "change2pro",
    apiKey: "sk-admin-secret",
    textToImageEnabled: true,
    imageToImageEnabled: false,
    baseUrl: "https://images.example.com/v1/images/generations"
  }, true);

  assert.notEqual(result.provider.apiKeyEncrypted, "sk-admin-secret");
  assert.equal(decryptProviderApiKey(String(result.provider.apiKeyEncrypted), MASTER_KEY), "sk-admin-secret");
  assert.equal("apiKey" in result.provider, false);
});

test("keeps the existing encrypted key when an edit leaves API Key empty", () => {
  const created = normalize({
    id: "custom-provider",
    name: "Custom provider",
    adapter: "ainb",
    apiKey: "sk-existing-secret",
    baseUrl: "https://images.example.com/v1/images/generations",
    queryEndpoint: "https://images.example.com/v1/tasks/{task_id}"
  }, true);
  const edited = normalize({
    ...created.provider,
    apiKey: "",
    name: "Renamed provider"
  }, false);

  assert.equal(edited.provider.apiKeyEncrypted, created.provider.apiKeyEncrypted);
});

test("stores independent mode endpoints and arbitrary administrator parameters", () => {
  const result = normalize({
    id: "custom-provider",
    name: "Custom provider",
    adapter: "change2pro",
    apiKey: "sk-mode-secret",
    baseUrl: "https://images.example.com/text/generate",
    imageEndpoint: "https://images.example.com/image/edit",
    textToImageEnabled: true,
    imageToImageEnabled: true,
    requestParams: { model: "image2-vip", quality: "high", background: "transparent", vendor_option: "fast" },
    imageRequestParams: { model: "image2-edit-vip", response_format: "url", input_fidelity: "high" }
  }, true);

  assert.equal(result.provider.baseUrl, "https://images.example.com/text/generate");
  assert.equal(result.provider.imageEndpoint, "https://images.example.com/image/edit");
  assert.deepEqual(result.provider.requestParams, { model: "image2-vip", quality: "high", background: "transparent", vendor_option: "fast" });
  assert.deepEqual(result.provider.imageRequestParams, { model: "image2-edit-vip", response_format: "url", input_fidelity: "high" });
});

test("stores a normalized custom provider group", () => {
  const result = normalize({
    id: "grouped-provider",
    name: "Grouped provider",
    groupName: "  Banana 线路  ",
    adapter: "change2pro",
    apiKey: "sk-grouped-secret",
    baseUrl: "https://images.example.com/v1/images/generations"
  }, true);

  assert.equal(result.provider.groupName, "Banana 线路");
});

test("allows an empty image endpoint when image generation is disabled", () => {
  const result = normalize({
    id: "text-only",
    name: "Text only",
    adapter: "kie",
    apiKey: "sk-text-only",
    baseUrl: "https://images.example.com/jobs/create",
    queryEndpoint: "https://images.example.com/jobs/{task_id}",
    imageEndpoint: "",
    textToImageEnabled: true,
    imageToImageEnabled: false
  }, true);

  assert.equal(result.provider.imageEndpoint, "");
  assert.equal(result.provider.imageToImageEnabled, false);
});

test("never exposes encrypted or environment key fields in administrator responses", () => {
  const encrypted = String(normalize({
    id: "safe-view",
    name: "Safe view",
    adapter: "ainb",
    apiKey: "sk-safe-view",
    baseUrl: "https://images.example.com/v1/images/generations",
    queryEndpoint: "https://images.example.com/v1/tasks/{task_id}"
  }, true).provider.apiKeyEncrypted);
  const provider = {
    id: "safe-view",
    name: "Safe view",
    groupName: "Primary",
    adapter: "ainb",
    requestMode: "async",
    baseUrl: "https://images.example.com/v1/images/generations",
    imageEndpoint: "",
    queryEndpoint: "https://images.example.com/v1/tasks/{task_id}",
    statusEnabled: true,
    responseMapping: {},
    textToImageEnabled: true,
    imageToImageEnabled: false,
    apiKeyEnv: "GENERATION_PROVIDER_SAFE_VIEW_API_KEY",
    apiKeyEncrypted: encrypted,
    requestParams: {},
    imageRequestParams: {},
    enabled: true,
    sort: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  } satisfies GenerationProvider;
  const view = (service() as unknown as {
    generationProviderView: (item: GenerationProvider, modelIds: string[]) => Record<string, unknown>;
  }).generationProviderView(provider, ["gpt-image-2"]);

  assert.equal("apiKeyEncrypted" in view, false);
  assert.equal("apiKeyEnv" in view, false);
  assert.equal(view.apiKeyConfigured, true);
  assert.equal(view.apiKeySource, "admin");
});

test("stores asynchronous polling and status response configuration", () => {
  const result = normalize({
    id: "async-provider",
    name: "Async provider",
    adapter: "ainb",
    requestMode: "async",
    apiKey: "sk-async-secret",
    baseUrl: "https://images.example.com/v1/generate",
    queryEndpoint: "https://images.example.com/v1/tasks/{task_id}",
    statusEnabled: true,
    responseMapping: {
      taskIdPath: "job.id",
      statusPath: "job.state",
      progressPath: "job.progress",
      resultUrlPath: "job.outputs[].url",
      errorPath: "job.error",
      successValue: "done",
      failureValue: "failed",
      pendingValue: "running"
    }
  }, true);

  assert.equal(result.provider.requestMode, "async");
  assert.equal(result.provider.queryEndpoint, "https://images.example.com/v1/tasks/{task_id}");
  assert.equal(result.provider.statusEnabled, true);
  assert.deepEqual(result.provider.responseMapping, {
    taskIdPath: "job.id",
    statusPath: "job.state",
    progressPath: "job.progress",
    resultUrlPath: "job.outputs[].url",
    errorPath: "job.error",
    successValue: "done",
    failureValue: "failed",
    pendingValue: "running"
  });
});

test("reports a duplicate provider identifier as a conflict before creating it", async () => {
  const fakePrisma = {
    modelConfig: { findMany: async () => [] },
    generationProvider: { findUnique: async () => ({ id: "existing-provider" }) }
  };
  const configService = serviceWithPrisma(fakePrisma);

  await assert.rejects(
    () => configService.createGenerationProvider({
      id: "existing-provider",
      name: "Existing provider",
      adapter: "change2pro",
      apiKey: "sk-test",
      baseUrl: "https://images.example.com/v1/images/generations"
    }),
    (error: unknown) => error instanceof ConflictException && error.message === "平台标识已存在，请更换一个标识"
  );
});
