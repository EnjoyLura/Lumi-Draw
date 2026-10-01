import assert from "node:assert/strict";
import test from "node:test";
import { PaymentsService } from "./payments.service";

type CustomRechargeSpecAccessor = {
  customRechargeSpec(amount: number | undefined): {
    amountFen: number;
    credits: number;
    bonusCredits: number;
    subject: string;
    body: string;
  };
};

function createService(membershipEnabled = true) {
  return new PaymentsService(
    {} as never,
    {} as never,
    { get: () => "test" } as never,
    {} as never,
    { membershipEnabled: async () => membershipEnabled } as never
  ) as unknown as CustomRechargeSpecAccessor & {
    createMembershipOrder(userId: number, dto: { planId: string }): Promise<unknown>;
  };
}

test("membership orders are refused while the membership switch is off", async () => {
  await assert.rejects(() => createService(false).createMembershipOrder(1, { planId: "month" }), /会员功能暂未开放/);
});

test("custom recharge pays 100 credits per yuan and only bonuses amounts above the 6-yuan floor", () => {
  const service = createService();

  assert.throws(() => service.customRechargeSpec(0.99), /充值金额不能低于1元/);
  assert.deepEqual(service.customRechargeSpec(1), {
    amountFen: 100,
    credits: 100,
    bonusCredits: 0,
    subject: "自定义充值 100积分",
    body: "购买100积分，赠送0积分"
  });
  assert.deepEqual(service.customRechargeSpec(1.23), {
    amountFen: 123,
    credits: 123,
    bonusCredits: 0,
    subject: "自定义充值 123积分",
    body: "购买123积分，赠送0积分"
  });
  assert.deepEqual(service.customRechargeSpec(6), {
    amountFen: 600,
    credits: 600,
    bonusCredits: 0,
    subject: "自定义充值 600积分",
    body: "购买600积分，赠送0积分"
  });
  assert.deepEqual(service.customRechargeSpec(10), {
    amountFen: 1000,
    credits: 1000,
    bonusCredits: 50,
    subject: "自定义充值 1050积分",
    body: "购买1000积分，赠送50积分"
  });
});
