import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decryptProviderApiKey } from "../common/provider-secret";
import { PrismaService } from "../prisma/prisma.service";
import { AdminEngineService } from "./admin-engine.service";

const MASTER_KEY = "test-generation-provider-encryption-key-123456";

function configService() {
  return { getOrThrow: (name: string) => name === "app.generationProviderEncryptionKey" ? MASTER_KEY : "" } as unknown as ConfigService;
}

function serviceWith(prisma: Record<string, unknown>) {
  return new AdminEngineService(
    prisma as unknown as PrismaService,
    configService(),
    {} as never,
    {} as never
  );
}

const CREATE_BODY = {
  id: "test-provider",
  name: "Test Provider",
  groupName: "测试",
  adapter: "async-http",
  apiKey: "sk-admin-secret",
  config: { baseUrl: "https://upstream.example.com/v1/tasks", requestMode: "async" }
};

test("create：明文密钥加密入库，明文不回传", async () => {
  let created: Record<string, unknown> | null = null;
  const service = serviceWith({
    generationProvider: {
      findUnique: async ({ where }: { where: { id: string } }) => created?.id === where.id ? created : null,
      create: async ({ data }: { data: Record<string, unknown> }) => { created = { ...data, createdAt: new Date(), updatedAt: new Date() }; return created; }
    }
  });
  await service.create(CREATE_BODY);
  assert.equal(typeof created!.apiKeyEncrypted, "string");
  assert.notEqual(created!.apiKeyEncrypted, "sk-admin-secret");
  assert.equal(decryptProviderApiKey(String(created!.apiKeyEncrypted), MASTER_KEY), "sk-admin-secret");
  assert.equal("adapter" in created!, false, "单轨化后不再写平面列");
  const config = created!.config as Record<string, unknown>;
  assert.equal(config.adapter, "async-http");
  assert.equal(config.baseUrl, "https://upstream.example.com/v1/tasks");
});

test("update：API Key 留空时保留已存密文", async () => {
  const existing = {
    id: "test-provider",
    name: "Test Provider",
    groupName: "测试",
    enabled: true,
    sort: 10,
    apiKeyEncrypted: "encrypted-payload",
    apiKeyEnv: "",
    adapter: "async-http",
    config: { adapter: "async-http", requestMode: "async", baseUrl: "https://upstream.example.com/v1/tasks" },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const updated: Array<Record<string, unknown>> = [];
  const service = serviceWith({
    generationProvider: {
      findUnique: async ({ where }: { where: { id: string } }) => where.id === "test-provider" ? existing : null,
      update: async ({ data }: { data: Record<string, unknown> }) => { updated.push(data); return existing; }
    }
  });
  await service.update("test-provider", { name: "改名", config: {} });
  assert.equal(updated.length, 1);
  assert.equal("apiKeyEncrypted" in updated[0], false, "留空时不改写密钥列");
});

test("create：既无密钥也无环境变量名时拒绝", async () => {
  const service = serviceWith({
    generationProvider: { findUnique: async () => null }
  });
  await assert.rejects(
    service.create({ ...CREATE_BODY, apiKey: "" }),
    (error: unknown) => error instanceof BadRequestException
  );
});
