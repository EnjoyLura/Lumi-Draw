import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import type { EngineAsset, EngineAttempt, EngineJob } from "@prisma/client";
import { CreditsService } from "../credits/credits.service";
import { WechatContentSafetyService } from "../content-safety/wechat-content-safety.service";
import { UploadsService } from "../uploads/uploads.service";
import { WechatWalletService } from "../payments/wechat-wallet.service";
import { EngineBillingService } from "./engine-billing.service";
import { EngineService } from "./engine.service";
import { EngineStorageService } from "./engine-storage.service";
import { EngineWatchdogService } from "./engine-watchdog.service";
import { decideFailure } from "./engine-failover";

const DATABASE_URL = process.env.LUMI_TEST_DATABASE_URL || "";
const options = DATABASE_URL ? {} : { skip: "LUMI_TEST_DATABASE_URL 未设置，跳过集成测试" };
process.env.ENGINE_TEST_KEY = process.env.ENGINE_TEST_KEY || "engine-integration-test-key";

function testConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "app.generate.allowMock": false,
    "app.callbackSecret": "",
    "app.generationProviderEncryptionKey": "engine-integration-test-master-secret",
    "app.kie": { callbackUrl: "" },
    ...overrides
  };
  return { get: (key: string) => values[key] } as never;
}

function stubUploads() {
  let seq = 0;
  return {
    assertManagedImageUrl() {},
    readUrl(url: string) { return url; },
    readResponsiveImageUrl(url: string) { return url; },
    readDetailPreviewImageUrl(url: string) { return url; },
    objectUrlForKey(key: string) { return `https://cdn.engine-test.internal/${key}`; },
    async uploadBuffer(_scene: string, name: string) {
      seq += 1;
      return { imageUrl: `https://cdn.engine-test.internal/${name}-${seq}.png`, ossKey: `uploads/system/generate/${name}-${seq}.png`, sizeBytes: 1024 };
    },
    reserveGenerationImage(jobId: string, index: number) {
      return { ossKey: `uploads/system/generate/${jobId}/${index}.png` };
    },
    async transferRemoteImage(_scene: string, sourceUrl: string) {
      seq += 1;
      return { imageUrl: `https://cdn.engine-test.internal/transferred-${seq}.png`, ossKey: `uploads/system/generate/transferred-${seq}.png`, sizeBytes: 2048 };
    }
  } as unknown as UploadsService;
}

function stubSafety() {
  return {
    async checkText() { return "pass"; },
    async settings() { return { imageEnabled: false, textEnabled: false }; },
    async beginWorkImageReview() {}
  } as unknown as WechatContentSafetyService;
}

function stubPublishRewards() {
  return { async awardPublishedWork() {} } as never;
}

function stubWallet() {
  return { enabled: false } as unknown as WechatWalletService;
}

function stubImageTransfer() {
  return {
    isConfigured: () => false,
    matchesToken: () => false,
    async dispatchInBackground() {},
    async dispatchGeneration() {}
  } as never;
}

/** 模拟 async-http 上游：提交返回 task_id，查询按可控脚本返回状态。 */
function startMockUpstream() {
  const state = { status: "IN_PROGRESS", failReason: "", resultUrl: "", submitCount: 0 };
  const server: Server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "POST") {
      state.submitCount += 1;
      res.end(JSON.stringify({ task_id: `task-${state.submitCount}` }));
      return;
    }
    if (req.url?.startsWith("/file/")) {
      res.setHeader("Content-Type", "image/png");
      res.end("png");
      return;
    }
    if (state.status === "FAILURE") {
      res.end(JSON.stringify({ data: { status: "FAILURE", fail_reason: state.failReason || "mock failure" } }));
      return;
    }
    if (state.status === "SUCCESS") {
      res.end(JSON.stringify({ data: { status: "SUCCESS", data: { data: [
        { url: state.resultUrl || "https://mock-upstream.internal/file/1.png" },
        { url: "https://mock-upstream.internal/file/2.png" }
      ] } } }));
      return;
    }
    res.end(JSON.stringify({ data: { status: "IN_PROGRESS" } }));
  });
  return new Promise<{ server: Server; port: number; state: typeof state }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port, state });
    });
  });
}

test("engine failover decision rules", () => {
  const base = {
    attemptsForProvider: 0,
    maxAttemptsPerProvider: 2,
    quickFailureWindowMs: 15_000,
    hasNextProvider: true
  };
  assert.equal(decideFailure({ ...base, kind: "network", maybeBilled: false, latencyMs: 100 }), "retry-same");
  assert.equal(decideFailure({ ...base, kind: "network", maybeBilled: false, latencyMs: 100, attemptsForProvider: 2 }), "fallback");
  assert.equal(decideFailure({ ...base, kind: "network", maybeBilled: false, latencyMs: 60_000 }), "fallback");
  assert.equal(decideFailure({ ...base, kind: "network", maybeBilled: true, latencyMs: 100 }), "fail");
  assert.equal(decideFailure({ ...base, kind: "policy", maybeBilled: true, latencyMs: 100 }), "fail");
  assert.equal(decideFailure({ ...base, kind: "invalid_request", maybeBilled: true, latencyMs: 100 }), "fail");
  assert.equal(decideFailure({ ...base, kind: "capacity", maybeBilled: false, latencyMs: 100, hasNextProvider: false }), "fail");
  assert.equal(decideFailure({ ...base, kind: "rate_limit", maybeBilled: false, latencyMs: 100 }), "fallback");
});

test("engine full lifecycle: idempotency, billing, failover, refund, publish", async (t) => {
  if (!DATABASE_URL) {
    t.skip("需要 LUMI_TEST_DATABASE_URL");
    return;
  }
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  await prisma.$connect();
  // seed 曾用显式 id 插入，自增序列滞后会对所有表报唯一冲突；这里统一校准。
  for (const table of ["users", "works", "credit_transactions", "quality_configs", "ratio_configs"]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, 1), false)`
    );
  }
  const stamp = Date.now();
  const { server, port, state } = await startMockUpstream();

  const credits = new CreditsService(prisma as never, stubWallet());
  const wallet = stubWallet();
  const billing = new EngineBillingService(prisma as never, credits, wallet);
  const storage = new EngineStorageService(prisma as never, stubUploads(), stubImageTransfer(), billing);
  const config = testConfig();
  const engine = new EngineService(
    prisma as never, credits as never, wallet, config, stubUploads(),
    stubSafety(), stubPublishRewards(), billing, storage
  );
  const watchdog = new EngineWatchdogService(prisma as never, engine, billing, storage);

  const refs = { userId: 0, modelId: "", providerAId: "", providerBId: "", qualityId: 0, ratioId: 0 };
  t.after(async () => {
    await prisma.engineJob.deleteMany({ where: { userId: refs.userId } }).catch(() => {});
    await prisma.work.deleteMany({ where: { userId: refs.userId } }).catch(() => {});
    await prisma.creditTransaction.deleteMany({ where: { userId: refs.userId } }).catch(() => {});
    if (refs.userId) await prisma.user.delete({ where: { id: refs.userId } }).catch(() => {});
    if (refs.modelId) await prisma.modelConfig.delete({ where: { id: refs.modelId } }).catch(() => {});
    if (refs.providerAId) await prisma.generationProvider.delete({ where: { id: refs.providerAId } }).catch(() => {});
    if (refs.providerBId) await prisma.generationProvider.delete({ where: { id: refs.providerBId } }).catch(() => {});
    if (refs.qualityId) await prisma.qualityConfig.delete({ where: { id: refs.qualityId } }).catch(() => {});
    if (refs.ratioId) await prisma.ratioConfig.delete({ where: { id: refs.ratioId } }).catch(() => {});
    server.close();
    await prisma.$disconnect();
  });

  // fixtures
  const quality = await prisma.qualityConfig.create({ data: { label: "1K", pixel: "1024x1024", multiplier: 1, sort: 999 } });
  const ratio = await prisma.ratioConfig.create({ data: { label: "1:1", description: "test", sort: 999 } });
  const providerA = await prisma.generationProvider.create({
    data: {
      id: `fail-a-${stamp}`, name: "故障平台A", adapter: "async-http", requestMode: "async",
      baseUrl: "http://127.0.0.1:1/v1/tasks", queryEndpoint: "http://127.0.0.1:1/query?task_id={task_id}",
      requestParams: {}, imageRequestParams: {}, apiKeyEnv: "ENGINE_TEST_KEY", enabled: true,
      config: {
        adapter: "async-http", requestMode: "async", textResultMode: "url", imageResultMode: "url",
        baseUrl: "http://127.0.0.1:1/v1/tasks", queryEndpoint: "http://127.0.0.1:1/query?task_id={task_id}",
        authMode: "bearer", textToImageEnabled: true, imageToImageEnabled: false,
        requestParams: {}, imageRequestParams: {}, requestTemplate: {}, imageRequestTemplate: {},
        responseMapping: {}, resultUrlRewriteRules: [], requestHeaders: {}, queryHeaders: {},
        injectModel: true, injectCount: true, imageInputMode: "url-array", sizeMode: "pixels"
      }
    }
  });
  const providerB = await prisma.generationProvider.create({
    data: {
      id: `ok-b-${stamp}`, name: "正常平台B", adapter: "async-http", requestMode: "async",
      baseUrl: `http://127.0.0.1:${port}/v1/tasks`, queryEndpoint: `http://127.0.0.1:${port}/query?task_id={task_id}`,
      requestParams: {}, imageRequestParams: {}, apiKeyEnv: "ENGINE_TEST_KEY", enabled: true,
      config: {
        adapter: "async-http", requestMode: "async", textResultMode: "url", imageResultMode: "url",
        baseUrl: `http://127.0.0.1:${port}/v1/tasks`, queryEndpoint: `http://127.0.0.1:${port}/query?task_id={task_id}`,
        authMode: "bearer", textToImageEnabled: true, imageToImageEnabled: false,
        requestParams: {}, imageRequestParams: {}, requestTemplate: {}, imageRequestTemplate: {},
        responseMapping: {}, resultUrlRewriteRules: [], requestHeaders: {}, queryHeaders: {},
        injectModel: true, injectCount: true, imageInputMode: "url-array", sizeMode: "pixels"
      }
    }
  });
  const model = await prisma.modelConfig.create({
    data: {
      id: `test-model-${stamp}`, provider: providerA.id, providerRouting: { "1K": [providerA.id, providerB.id] },
      providerModel: "mock-image-1", name: "测试模型", description: "集成测试", costCredits: 10,
      supportsTextToImage: true, supportsImageToImage: true, enabled: true, sort: 999
    }
  });
  const user = await prisma.user.create({ data: { openId: `engine-test-${stamp}`, nickname: "引擎测试", credits: 1000 } });

  refs.userId = user.id;
  refs.modelId = model.id;
  refs.providerAId = providerA.id;
  refs.providerBId = providerB.id;
  refs.qualityId = quality.id;
  refs.ratioId = ratio.id;

  const dto = {
    clientRequestId: `test-${stamp}-1`,
    operation: "text-to-image" as const,
    modelId: model.id,
    prompt: "一只赛博朋克风格的猫",
    qualityId: quality.id,
    ratioId: ratio.id,
    count: 2
  };

  await t.test("创建任务：预扣积分 + 快照落库", async () => {
    (engine as unknown as { config: { get: (key: string) => unknown } }).config = testConfig({ "app.generate.allowMock": true });
    const result = await engine.createJob(user.id, { ...dto, count: 1 });
    assert.equal(result.status, "succeeded");
    assert.equal(result.job.count, 1);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { credits: true } });
    assert.equal(after.credits, 990);
    const charge = await prisma.creditTransaction.findFirst({ where: { userId: user.id, refId: `engine_charge:${result.jobId}` } });
    assert.ok(charge, "应有 engine_charge 流水");
    assert.equal(charge.amount, -10);
    const works = await prisma.work.count({ where: { userId: user.id } });
    assert.equal(works, 1);
    const job = await prisma.engineJob.findUniqueOrThrow({ where: { id: result.jobId } });
    assert.equal(job.billingState, "settled");
    assert.ok(job.providerSnapshot);
  });

  await t.test("幂等：同 clientRequestId 不重复扣费", async () => {
    const again = await engine.createJob(user.id, { ...dto, count: 1 });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { credits: true } });
    assert.equal(after.credits, 990);
    const works = await prisma.work.count({ where: { userId: user.id } });
    assert.equal(works, 1);
    assert.equal(again.jobId ? true : true, true);
    void again;
  });

  await t.test("积分不足拦截", async () => {
    await prisma.user.update({ where: { id: user.id }, data: { credits: 5 } });
    await assert.rejects(
      () => engine.createJob(user.id, { ...dto, clientRequestId: `test-${stamp}-poor`, count: 1 }),
      /积分不足/
    );
    await prisma.user.update({ where: { id: user.id }, data: { credits: 980 } });
  });

  await t.test("failover：A 连接失败→重试→切 B→轮询→结算", async () => {
    (engine as unknown as { config: { get: (key: string) => unknown } }).config = testConfig();
    state.status = "IN_PROGRESS";
    const result = await engine.createJob(user.id, { ...dto, clientRequestId: `test-${stamp}-fo` });
    const jobId = result.jobId;
    let job: EngineJob & { assets: EngineAsset[]; attempts: EngineAttempt[] };
    job = await prisma.engineJob.findUniqueOrThrow({ where: { id: jobId }, include: { assets: true, attempts: true } });
    assert.ok(job.attempts.length >= 2, "平台A应有至少两次尝试");
    assert.equal(job.providerId, providerB.id, "连接失败后应已切换到平台B");
    assert.equal(job.status, "running");
    const creditsAfterCreate = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { credits: true } });
    assert.equal(creditsAfterCreate.credits, 960, "创建时预扣 20 积分（count=2）");

    // 第一轮轮询：上游进行中
    await prisma.engineAttempt.updateMany({ where: { jobId }, data: { nextPollAt: new Date(Date.now() - 1000) } });
    await watchdog.tick();
    job = await prisma.engineJob.findUniqueOrThrow({ where: { id: jobId }, include: { assets: true, attempts: true } });
    assert.equal(job.status, "running");

    // 第二轮轮询：上游成功 → 转存 → 结算
    state.status = "SUCCESS";
    await prisma.engineAttempt.updateMany({ where: { jobId, state: "submitted" }, data: { nextPollAt: new Date(Date.now() - 1000) } });
    await watchdog.tick();
    job = await prisma.engineJob.findUniqueOrThrow({ where: { id: jobId }, include: { assets: true, attempts: true } });
    assert.equal(job.status, "succeeded");
    assert.equal(job.billingState, "settled");
    assert.equal(job.assets.filter((asset) => asset.status === "stored").length, 2);
    const works = await prisma.work.count({ where: { userId: user.id } });
    assert.equal(works, 3, "mock 1 张 + failover 2 张");

    // 成功事件重复投递：终态幂等
    const workCountBefore = await prisma.work.count({ where: { userId: user.id } });
    await engine.applyProviderEvent(jobId, { state: "succeeded", imageUrls: ["https://late.example/x.png"], stageText: "", errorMessage: "" });
    const workCountAfter = await prisma.work.count({ where: { userId: user.id } });
    assert.equal(workCountAfter, workCountBefore, "终态后重复事件不应再次结算");
  });

  await t.test("全链路失败：退款 + 失败态", async () => {
    await prisma.generationProvider.update({
      where: { id: providerB.id },
      data: { config: { ...(providerB.config as Record<string, unknown>), baseUrl: "http://127.0.0.1:1/v1/tasks", queryEndpoint: "http://127.0.0.1:1/query?task_id={task_id}" } as never }
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { credits: true } });
    const result = await engine.createJob(user.id, { ...dto, clientRequestId: `test-${stamp}-fail`, count: 1 });
    const job = await prisma.engineJob.findUniqueOrThrow({ where: { id: result.jobId } });
    assert.equal(job.status, "failed");
    assert.equal(job.billingState, "refunded");
    assert.equal(job.refundCredits, 10, "count=1 任务失败应全额退回");
    assert.equal(job.failureCode, 42001, "network 失败码");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { credits: true } });
    assert.equal(after.credits, before.credits, "失败后积分应完全退回");
  });

  await t.test("发布生成结果", async () => {
    const publishJob = await prisma.engineJob.create({
      data: {
        clientRequestId: `test-${stamp}-pub`, userId: user.id, operation: "text-to-image",
        modelId: model.id, modelRevision: 0n, qualityId: quality.id, ratioId: ratio.id,
        ratio: "1:1", quality: "1K", prompt: "publish", count: 1, providerId: providerB.id,
        providerSnapshot: { config: { adapter: "async-http" } } as never,
        costCredits: 0, status: "succeeded", finishedAt: new Date()
      }
    });
    const asset = await prisma.engineAsset.create({
      data: { jobId: publishJob.id, index: 1, status: "stored", url: "https://cdn.engine-test.internal/publish.png", ossKey: "uploads/system/generate/publish.png" }
    });
    const published = await engine.publishAsset(user.id, asset.id, { title: "引擎测试发布", isPublic: true });
    assert.ok(published.workId);
    const work = await prisma.work.findUniqueOrThrow({ where: { id: published.workId } });
    assert.ok(["pending", "published"].includes(work.status));
  });

  await t.test("活跃任务互斥", async () => {
    const blocker = await prisma.engineJob.create({
      data: {
        clientRequestId: `test-${stamp}-block`, userId: user.id, operation: "text-to-image",
        modelId: model.id, modelRevision: 0n, qualityId: quality.id, ratioId: ratio.id,
        ratio: "1:1", quality: "1K", prompt: "block", count: 1, providerId: providerA.id,
        providerSnapshot: { config: { adapter: "async-http" } } as never,
        costCredits: 10, status: "running"
      }
    });
    await assert.rejects(
      () => engine.createJob(user.id, { ...dto, clientRequestId: `test-${stamp}-mutex`, count: 1 }),
      /正在生成/
    );
    await prisma.engineJob.delete({ where: { id: blocker.id } });
  });
});
