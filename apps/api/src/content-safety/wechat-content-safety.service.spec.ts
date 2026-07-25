import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, test } from "node:test";
import { WechatContentSafetyService } from "./wechat-content-safety.service";

const originalNodeEnv = process.env.NODE_ENV;
const originalForceManualReview = process.env.FORCE_MANUAL_REVIEW;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.FORCE_MANUAL_REVIEW = originalForceManualReview;
});

function createService(prisma: Record<string, unknown>, token = "content-safety-token") {
  const notifications = {
    sent: [] as unknown[],
    async createSystemNotifications(...args: unknown[]) { this.sent.push(args); }
  };
  const rewards = {
    awarded: [] as unknown[],
    async awardPublishedWork(...args: unknown[]) { this.awarded.push(args); }
  };
  const config = {
    get(key: string) {
      if (key === "app.wx.contentSecurityToken") return token;
      return "";
    }
  };
  const service = new WechatContentSafetyService(prisma as never, config as never, notifications as never, rewards as never);
  return { service, notifications, rewards };
}

test("verifies the plaintext WeChat callback signature", () => {
  const { service } = createService({});
  const timestamp = "1784910000";
  const nonce = "nonce-1";
  const signature = createHash("sha1")
    .update(["content-safety-token", timestamp, nonce].sort().join(""))
    .digest("hex");

  assert.equal(service.verifyCallbackSignature(signature, timestamp, nonce), true);
  assert.equal(service.verifyCallbackSignature("bad", timestamp, nonce), false);
});

test("maps WeChat callback suggestions with risky taking precedence", () => {
  const { service } = createService({});
  const callbackStatus = (service as unknown as { callbackStatus(payload: unknown): string }).callbackStatus.bind(service);

  assert.equal(callbackStatus({ result: { suggest: "pass" } }), "pass");
  assert.equal(callbackStatus({ result: { suggest: "pass" }, detail: [{ suggest: "review" }] }), "review");
  assert.equal(callbackStatus({ result: { suggest: "pass" }, detail: [{ suggest: "risky" }] }), "risky");
  assert.equal(callbackStatus({ errcode: 1, errmsg: "failed" }), "failed");
});

test("accepts passing text and blocks review or risky text", async () => {
  const prisma = {
    sensitiveWord: { async findMany() { return []; } },
    appSetting: {
      async findMany() { return [{ key: "wxTextSecCheckEnabled", value: "true" }]; }
    },
    user: { async findUnique() { return { openId: "openid-1" }; } }
  };
  const { service } = createService(prisma);
  const internal = service as unknown as { callWechat(): Promise<unknown> };

  internal.callWechat = async () => ({ result: { suggest: "pass" } });
  assert.equal(await service.checkText(1, ["合规内容"]), "pass");

  internal.callWechat = async () => ({ result: { suggest: "review" } });
  await assert.rejects(service.checkText(1, ["待复核内容"]), /进一步审核/);

  internal.callWechat = async () => ({ result: { suggest: "risky" } });
  await assert.rejects(service.checkText(1, ["风险内容"]), /不适合发布/);
});

test("treats a completed callback as idempotent", async () => {
  let updates = 0;
  const prisma = {
    contentModerationTask: {
      async findUnique() { return { id: "task-1", status: "pass" }; },
      async update() { updates += 1; }
    }
  };
  const { service } = createService(prisma);

  await service.handleMediaCallback({ trace_id: "trace-1", result: { suggest: "pass" } });
  assert.equal(updates, 0);
});

test("keeps a work unpublished when media-check dispatch fails", async () => {
  const workUpdates: Array<Record<string, unknown>> = [];
  const taskUpdates: Array<Record<string, unknown>> = [];
  const prisma = {
    appSetting: {
      async findMany() { return [{ key: "wxImageSecCheckEnabled", value: "true" }]; }
    },
    contentModerationTask: {
      async findFirst() { return null; },
      async create() { return { id: "task-1" }; },
      async update(args: Record<string, unknown>) { taskUpdates.push(args); }
    },
    work: {
      async update(args: Record<string, unknown>) { workUpdates.push(args); }
    },
    user: {
      async findUnique() { return { openId: "openid-1" }; }
    }
  };
  const { service, rewards } = createService(prisma);
  (service as unknown as { callWechat(): Promise<never> }).callWechat = async () => {
    throw new Error("network unavailable");
  };

  const status = await service.beginWorkImageReview(1, 9, "https://oss/work.png", "https://signed/work.png");
  assert.equal(status, "failed");
  assert.equal(rewards.awarded.length, 0);
  assert.equal(taskUpdates.some((item) => JSON.stringify(item).includes('"status":"failed"')), true);
  assert.equal(workUpdates.some((item) => JSON.stringify(item).includes('"imageModerationStatus":"failed"')), true);
  assert.equal(workUpdates.some((item) => JSON.stringify(item).includes('"status":"published"')), false);
});

test("publishes only after a passing callback when automatic review is enabled", async () => {
  process.env.NODE_ENV = "development";
  process.env.FORCE_MANUAL_REVIEW = "false";
  let publishedWhere: unknown;
  const settings = [
    { key: "wxTextSecCheckEnabled", value: "true" },
    { key: "wxImageSecCheckEnabled", value: "true" },
    { key: "manualReviewEnabled", value: "false" },
    { key: "autoPublishAfterPass", value: "true" },
    { key: "reviewMode", value: "auto" }
  ];
  const prisma = {
    appSetting: { async findMany() { return settings; } },
    contentModerationTask: {
      async findUnique() {
        return { id: "task-1", status: "pending", targetType: "work", targetId: "9", userId: 1, sourceUrl: "https://oss/work.png" };
      },
      async update() { return undefined; }
    },
    work: {
      async findUnique() {
        return { id: 9, userId: 1, title: "作品", imageModerationTraceId: "trace-1" };
      },
      async update() { return undefined; },
      async updateMany(args: { where: unknown }) {
        publishedWhere = args.where;
        return { count: 1 };
      }
    }
  };
  const { service, rewards } = createService(prisma);

  await service.handleMediaCallback({ trace_id: "trace-1", result: { suggest: "pass", label: 100 } });
  assert.deepEqual(rewards.awarded, [[1, 9]]);
  assert.equal(JSON.stringify(publishedWhere).includes('"textModerationStatus"'), true);
});

test("rejects a risky work and notifies its author", async () => {
  let rejectedData: unknown;
  const prisma = {
    contentModerationTask: {
      async findUnique() {
        return { id: "task-1", status: "pending", targetType: "work", targetId: "9", userId: 1, sourceUrl: "https://oss/work.png" };
      },
      async update() { return undefined; }
    },
    work: {
      async findUnique() {
        return { id: 9, userId: 1, title: "作品", imageModerationTraceId: "trace-1" };
      },
      async updateMany(args: { data: unknown }) {
        rejectedData = args.data;
        return { count: 1 };
      }
    }
  };
  const { service, notifications, rewards } = createService(prisma);

  await service.handleMediaCallback({ trace_id: "trace-1", result: { suggest: "risky", label: 20001 } });
  assert.equal(JSON.stringify(rejectedData).includes('"status":"rejected"'), true);
  assert.equal(notifications.sent.length, 1);
  assert.equal(rewards.awarded.length, 0);
});
