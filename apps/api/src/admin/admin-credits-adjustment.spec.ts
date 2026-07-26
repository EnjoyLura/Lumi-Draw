import assert from "node:assert/strict";
import test from "node:test";
import { AdminService } from "./admin.service";

function createService(options: {
  existingBalance?: number;
  walletBalance?: number;
  walletEnabled?: boolean;
} = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const prisma = {
    user: {
      findUnique: async () => ({ id: 7 })
    },
    creditTransaction: {
      findFirst: async () =>
        options.existingBalance === undefined ? null : { balanceAfter: options.existingBalance }
    }
  };
  const credits = {
    addTransaction: async (...args: unknown[]) => {
      calls.push({ method: "addTransaction", args });
      return { balance: options.walletBalance ?? 100 };
    },
    syncExternalBalance: async (...args: unknown[]) => {
      calls.push({ method: "syncExternalBalance", args });
      return { balance: options.walletBalance ?? 100 };
    }
  };
  const wallet = {
    enabled: options.walletEnabled ?? true,
    present: async (...args: unknown[]) => {
      calls.push({ method: "present", args });
      return { balance: options.walletBalance ?? 100, presentBalance: 20, billNo: String(args[2]) };
    },
    deduct: async (...args: unknown[]) => {
      calls.push({ method: "deduct", args });
      return { balance: options.walletBalance ?? 100, presentBalance: 0, billNo: String(args[2]) };
    }
  };
  const service = new AdminService(
    prisma as never,
    credits as never,
    {} as never,
    {} as never,
    wallet as never
  );
  return { service, calls };
}

test("admin credit gift uses WeChat present and synchronizes the returned balance", async () => {
  const { service, calls } = createService({ walletBalance: 580 });
  const result = await service.adjustCredits(
    7,
    80,
    "活动补偿",
    "request_123456",
    { id: 3, role: "super_admin" }
  );

  assert.equal(result.operation, "gift");
  assert.equal(result.balance, 580);
  assert.deepEqual(calls.map((call) => call.method), ["present", "syncExternalBalance"]);
  assert.deepEqual(calls[0].args.slice(0, 2), [7, 80]);
  assert.deepEqual(calls[1].args.slice(0, 5), [7, "adjust", 80, 580, "后台赠送：活动补偿"]);
});

test("admin credit deduction uses WeChat currency pay and synchronizes the returned balance", async () => {
  const { service, calls } = createService({ walletBalance: 420 });
  const result = await service.adjustCredits(
    7,
    -60,
    "异常积分追回",
    "request_654321",
    { id: 3, role: "finance" }
  );

  assert.equal(result.operation, "deduct");
  assert.equal(result.balance, 420);
  assert.deepEqual(calls.map((call) => call.method), ["deduct", "syncExternalBalance"]);
  assert.deepEqual(calls[0].args.slice(0, 2), [7, 60]);
  assert.deepEqual(calls[1].args.slice(0, 5), [7, "adjust", -60, 420, "后台扣减：异常积分追回"]);
});

test("repeated admin credit request returns the recorded result without mutating WeChat again", async () => {
  const { service, calls } = createService({ existingBalance: 345 });
  const result = await service.adjustCredits(
    7,
    50,
    "客服补偿",
    "request_repeat",
    { id: 3, role: "super_admin" }
  );

  assert.equal(result.balance, 345);
  assert.equal(result.operation, "gift");
  assert.equal(calls.length, 0);
});

test("admin credit adjustment requires an authorized role, integer amount, and reason", async () => {
  const { service } = createService();
  await assert.rejects(
    service.adjustCredits(7, 10, "活动补偿", "request_123456", { id: 2, role: "operator" }),
    /仅超级管理员或财务管理员/
  );
  await assert.rejects(
    service.adjustCredits(7, 1.5, "活动补偿", "request_123456", { id: 3, role: "super_admin" }),
    /非零整数/
  );
  await assert.rejects(
    service.adjustCredits(7, 10, "", "request_123456", { id: 3, role: "super_admin" }),
    /调整原因/
  );
});
